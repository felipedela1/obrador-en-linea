import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { debug } from "@/lib/debug";

// Ligero logger de integridad (solo en desarrollo)
const logAuth = (label: string, info: Record<string, any> = {}) => {
  // Redirigimos al sistema de debug central
  debug.log("auth", label, info);
};

// Utilidad segura para limpiar cualquier rastro de sesión local de Supabase
const clearLocalSupabaseAuth = () => {
  try {
    // El cliente usa storageKey personalizado: 'obrador-auth'
    localStorage.removeItem('obrador-auth');
    // Además, limpiar posibles claves heredadas por si coexistieron
    Object.keys(localStorage)
      .filter((k) => k.startsWith("sb-") && k.includes("-auth-token"))
      .forEach((k) => localStorage.removeItem(k));
  } catch (e) {
    // noop
  }
};

const hardSignOutAndReset = async () => {
  try {
    await supabase.auth.signOut({ scope: "global" });
  } catch {
    // ignore
  }
  clearLocalSupabaseAuth();
  // Evitar interferir en el flujo de recuperación de contraseña
  if (window.location.pathname !== "/login" && window.location.pathname !== "/update-password") {
    window.location.replace("/login");
  }
};

// Timeout helper para evitar bloqueos por red
const withTimeout = async <T,>(p: Promise<T>, ms = 7000, label = "op"): Promise<T> => {
  let t: number | undefined;
  const timeout = new Promise<never>((_, rej) => {
    t = window.setTimeout(() => rej(new Error(`Timeout ${label} ${ms}ms`)), ms);
  });
  try {
    return (await Promise.race([p, timeout])) as T;
  } finally {
    if (t) clearTimeout(t);
  }
};

// Decodifica de forma segura un JWT para inspeccionar iat/exp
const decodeJwt = (token: string | undefined | null): { iat?: number; exp?: number } => {
  if (!token) return {};
  try {
    const payload = token.split(".")[1];
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(normalized);
    return JSON.parse(json);
  } catch {
    return {};
  }
};

export function useAuthIntegrity() {
  const checking = useRef(false);
  const lastCheck = useRef<number>(0);

  // Valida el estado real de la sesión contra Supabase y repara estados corruptos
  const validateSession = async (reason: string) => {
    if (checking.current) return;
    const now = Date.now();
    // Evita rafagas de validaciones excesivas
    if (now - lastCheck.current < 1500) return;
    checking.current = true;

    try {
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        logAuth("skip getSession offline", { reason });
        return;
      }

      const start = performance.now();
      logAuth("getSession:start", { reason });
      let res: any;
      try {
        res = await withTimeout(supabase.auth.getSession(), 6000, "auth.getSession");
      } catch (e: any) {
        const duration = +(performance.now() - start).toFixed(1);
        logAuth("getSession:timeout", { reason, duration_ms: duration, message: e?.message });
        // No forzar signout por timeout; tratar como estado desconocido y permitir reintentos
        return;
      }
      const duration = +(performance.now() - start).toFixed(1);
      const { data, error } = res as any;
      const session = data?.session as { access_token?: string } | null;
      const hasAccessToken = !!session?.access_token;
      const hasLocalToken = !!localStorage.getItem('obrador-auth') || Object.keys(localStorage).some(
        (k) => k.startsWith("sb-") && k.includes("-auth-token")
      );

      logAuth("getSession:end", { reason, duration_ms: duration, hasSession: !!session, hasAccessToken, hadError: !!error, hasLocalToken });

      if (error) {
        // No forzar limpieza y redirect aquí; puede ser un fallo transitorio de red/navegador
        logAuth("getSession.error", { message: error?.message, name: error?.name, status: (error as any)?.status });
        return;
      }

      if (!hasAccessToken && !error) {
        // Caso típico: "Empty access token" en móviles/webviews/cookies bloqueadas
        logAuth("empty-access-token", { reason, note: "Tratar como no autenticado; revisar storage/cookies" });
      }

      const { iat, exp } = decodeJwt(session?.access_token);
      const nowSec = Math.floor(Date.now() / 1000);
      if (iat && iat - nowSec > 300) {
        // Reloj del dispositivo muy adelantado
        logAuth("device clock ahead", { iat, nowSec });
      }
      if (exp && nowSec > exp + 30) {
        // Token claramente expirado y no se refrescó
        logAuth("token expired without refresh", { exp, nowSec });
      }

      // Si no hay sesión válida pero hay restos locales => limpiar suavemente sin redirigir
      if (!session && hasLocalToken) {
        logAuth("no session but local tokens present", { reason });
        try {
          await supabase.auth.signOut({ scope: 'local' });
        } catch {}
        clearLocalSupabaseAuth();
        return;
      }
    } finally {
      lastCheck.current = Date.now();
      checking.current = false;
    }
  };

  useEffect(() => {
    // 1) Suscripción estándar a cambios de auth
    const { data: sub } = supabase.auth.onAuthStateChange(async (event) => {
      logAuth("authState", { event });
      if (event === "SIGNED_OUT") {
        clearLocalSupabaseAuth();
        if (window.location.pathname !== "/login" && window.location.pathname !== "/update-password") {
          window.location.replace("/login");
        }
      }
      if (event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
        // Revalidar rápidamente al tener cambios silenciosos
        validateSession(event);
      }
    });

    // 2) Cambios en localStorage desde otras pestañas
    const onStorage = (e: StorageEvent) => {
      if (!e.key) return;
      if ((e.key.startsWith("sb-") && e.key.includes("-auth-token")) || e.key === 'obrador-auth') {
        logAuth("storage", { key: e.key, reason: "auth-token changed" });
        validateSession("storage");
      }
    };

    // 3) Revalidar al ganar foco, al volver a estar visible o volver online
    const onFocusOrVisible = () => {
      // Evitar molestar el flujo de recuperación
      const isRecovery = window.location.pathname === "/update-password" || (window.location.hash?.includes("type=recovery"));
      if (isRecovery) return;
      logAuth("rehydrate-trigger", { source: "focus/visible/online" });
      validateSession("focus/visible/online");
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocusOrVisible);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") onFocusOrVisible();
    });
    window.addEventListener("online", onFocusOrVisible);

    return () => {
      sub.subscription.unsubscribe();
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocusOrVisible);
      document.removeEventListener("visibilitychange", onFocusOrVisible as any);
      window.removeEventListener("online", onFocusOrVisible);
    };
  }, []);
}
