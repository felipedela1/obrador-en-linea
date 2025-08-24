import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

// Utilidad segura para limpiar cualquier rastro de sesión local de Supabase
const clearLocalSupabaseAuth = () => {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith("sb-") && k.includes("-auth-token"))
      .forEach((k) => localStorage.removeItem(k));
    localStorage.removeItem("obrador-auth");
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

export function useAuthIntegrity() {
  const checking = useRef(false);
  const lastCheck = useRef<number>(0);

  // Valida el estado real de la sesión contra Supabase y repara estados corruptos
  const validateSession = async (reason: string) => {
    if (checking.current) return;
    const now = Date.now();
    // Evita rafagas de validaciones excesivas
    if (now - lastCheck.current < 3000) return; // Aumentado de 1500 a 3000ms
    checking.current = true;

    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.warn("[AUTH] getSession error:", error.message);
        // Solo forzar limpieza en errores graves, no en timeouts
        if (error.message?.includes('timeout') || error.message?.includes('network')) {
          return; // No hacer nada en errores de red
        }
        await hardSignOutAndReset();
        return;
      }

      const session = data.session;
      const hasLocalToken = Object.keys(localStorage).some(
        (k) => k.startsWith("sb-") && k.includes("-auth-token")
      ) || localStorage.getItem("obrador-auth");

      // Si no hay sesión válida pero hay restos locales => limpiar
      if (!session && hasLocalToken) {
        console.log("[AUTH] Cleaning orphaned tokens");
        clearLocalSupabaseAuth();
        // No forzar redirect automáticamente, dejar que el usuario navegue
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
