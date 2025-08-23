import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

// Ligero logger de integridad (solo en desarrollo)
const logAuth = (label: string, info: Record<string, any> = {}) => {
  if (!import.meta.env.DEV) return;
  const ts = new Date().toISOString();
  // eslint-disable-next-line no-console
  console.log(`[AUTH-INTEGRITY][${ts}] ${label}`, info);
};

// Utilidad segura para limpiar cualquier rastro de sesión local de Supabase
const clearLocalSupabaseAuth = () => {
  try {
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
      const res = await withTimeout(supabase.auth.getSession(), 6000, "auth.getSession");
      const duration = +(performance.now() - start).toFixed(1);
      const { data, error } = res as any;
      logAuth("getSession", { reason, duration_ms: duration, hasSession: !!data?.session, hadError: !!error });

      if (error) {
        logAuth("getSession.error", { message: error?.message });
        // Error al recuperar sesión: forzar limpieza y redirect
        await hardSignOutAndReset();
        return;
      }

      const session = data?.session as { access_token?: string } | null;
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

      const hasLocalToken = Object.keys(localStorage).some(
        (k) => k.startsWith("sb-") && k.includes("-auth-token")
      );

      // Si no hay sesión válida pero hay restos locales => limpiar
      if (!session && hasLocalToken) {
        logAuth("no session but local tokens present", { reason });
        await hardSignOutAndReset();
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
      if (e.key.startsWith("sb-") && e.key.includes("-auth-token")) {
        validateSession("storage");
      }
    };

    // 3) Revalidar al ganar foco, al volver a estar visible o volver online
    const onFocusOrVisible = () => {
      // Evitar molestar el flujo de recuperación
      const isRecovery = window.location.pathname === "/update-password" || (window.location.hash?.includes("type=recovery"));
      if (isRecovery) return;
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
