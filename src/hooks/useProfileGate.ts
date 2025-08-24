import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { UserRole } from "@/types/models";

// Timeout helper robusto para Netlify
const withTimeout = async <T,>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
  let timeoutId: number;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(new Error(`Timeout: ${label} after ${ms}ms`));
    }, ms);
  });
  
  try {
    const result = await Promise.race([promise, timeoutPromise]);
    return result as T;
  } finally {
    clearTimeout(timeoutId!);
  }
};

export function useProfileGate() {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<{ role: UserRole; nombre: string } | null>(null);
  const [reload, setReload] = useState(0);

  const retry = useCallback(() => { 
    setReload(c => c + 1); 
  }, []);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      setLoading(true); 
      setAllowed(false); 
      setError(null); 
      setProfile(null);

      try {
        // Verificar conectividad
        if (typeof navigator !== "undefined" && navigator.onLine === false) {
          setError("Sin conexión. Revisa tu red."); 
          setAllowed(false); 
          return;
        }

        // Intentar obtener sesión con timeout robusto y fallback
        let session = null;
        
        // Función helper para leer localStorage
        const getStoredSession = () => {
          try {
            // Debug: mostrar qué keys hay en localStorage
            const allKeys = Object.keys(localStorage);
            const authKeys = allKeys.filter(k => k.includes("auth") || k.includes("sb-"));
            console.log("[PROFILE_GATE] localStorage keys:", authKeys);
            
            const customKey = localStorage.getItem("obrador-auth");
            const sbKey = Object.keys(localStorage)
              .find(k => k.startsWith("sb-") && k.includes("-auth-token"));
            const stored = customKey || (sbKey ? localStorage.getItem(sbKey) : null);
            
            console.log("[PROFILE_GATE] Found stored data:", {
              hasCustomKey: !!customKey,
              hasSbKey: !!sbKey,
              sbKeyName: sbKey,
              hasStoredData: !!stored
            });
            
            if (stored) {
              const parsed = JSON.parse(stored);
              console.log("[PROFILE_GATE] Parsed data structure:", Object.keys(parsed));
              const sess = parsed?.currentSession || parsed?.session || parsed;
              if (sess?.user && sess?.access_token) {
                console.log("[PROFILE_GATE] Found valid session in localStorage");
                return sess;
              } else {
                console.log("[PROFILE_GATE] Invalid session structure:", { hasUser: !!sess?.user, hasToken: !!sess?.access_token });
              }
            }
          } catch (e) {
            console.warn("[PROFILE_GATE] localStorage read failed:", e);
          }
          return null;
        };

        // Intentar getSession con fallback inmediato si falla
        try {
          const res = await withTimeout(
            supabase.auth.getSession(), 
            10000, // 10 segundos para Netlify
            "auth.getSession"
          );
          session = res?.data?.session ?? null;
          console.log("[PROFILE_GATE] getSession succeeded:", !!session);
        } catch (e: any) {
          console.warn("[PROFILE_GATE] getSession timeout, trying refresh:", e.message);
          
          // Primer fallback: refreshSession
          try {
            const refreshRes = await withTimeout(
              supabase.auth.refreshSession(), 
              8000,
              "auth.refreshSession"
            );
            session = refreshRes?.data?.session ?? null;
            console.log("[PROFILE_GATE] refresh succeeded:", !!session);
          } catch (e2: any) {
            console.warn("[PROFILE_GATE] refresh also failed:", e2.message);
          }
        }

        // Si ambos fallan, usar localStorage como último recurso
        if (!session) {
          console.log("[PROFILE_GATE] Attempting localStorage fallback...");
          session = getStoredSession();
        }

        const user = session?.user;
        if (!user) { 
          setError("Inicia sesión para continuar"); 
          setAllowed(false); 
          return; 
        }

        // Intentar leer perfil con timeout robusto
        try {
          const profileRes = await withTimeout(
            supabase
              .from("profiles")
              .select("role,nombre")
              .eq("user_id", user.id)
              .maybeSingle() as unknown as Promise<any>,
            8000,
            "profiles.select"
          );

          const data = profileRes?.data as { role: UserRole; nombre: string } | null;
          const err = profileRes?.error;

          if (err) { 
            setError("No se pudo conectar a la base de datos"); 
            setAllowed(false); 
            return; 
          }

          if (!data) {
            // Crear perfil mínimo si no existe
            const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL || "admin@obradorencinas.com").toLowerCase();
            const inferredRole: UserRole = user.email && user.email.toLowerCase() === ADMIN_EMAIL ? "admin" : "customer";
            
            try {
              const insertRes = await withTimeout(
                supabase
                  .from("profiles")
                  .insert({
                    user_id: user.id,
                    nombre: user.user_metadata?.nombre || user.user_metadata?.name || (user.email?.split("@")[0] ?? "Usuario"),
                    role: inferredRole
                  })
                  .select("role,nombre")
                  .single() as unknown as Promise<any>,
                8000,
                "profiles.insert"
              );

              const inserted = insertRes?.data as { role: UserRole; nombre: string } | null;
              const insErr = insertRes?.error;

              if (insErr || !inserted) { 
                setError("No se pudo crear perfil"); 
                setAllowed(false); 
                return; 
              }

              if (!mounted) return;
              setProfile(inserted); 
              setAllowed(true); 
              setError(null); 
              return;
            } catch (insertError: any) {
              console.error("[PROFILE_GATE] Profile insert failed:", insertError);
              setError("Error creando perfil");
              setAllowed(false);
              return;
            }
          }

          if (!mounted) return;
          setProfile(data); 
          setAllowed(true); 
          setError(null);

        } catch (profileError: any) {
          console.error("[PROFILE_GATE] Profile query failed:", profileError);
          setError("Error conectando con la base de datos");
          setAllowed(false);
        }

      } catch (e: any) {
        console.error("[PROFILE_GATE] General error:", e);
        const msg = typeof navigator !== 'undefined' && navigator.onLine === false 
          ? "Sin conexión. Revisa tu red." 
          : "Error de conexión";
        setError(msg); 
        setAllowed(false);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    run();

    // Suscribirse a cambios de auth
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("[PROFILE_GATE] Auth state changed:", event, !!session);
      if (mounted) {
        run();
      }
    });

    return () => { 
      mounted = false; 
      sub.subscription.unsubscribe(); 
    };
  }, [reload]);

  return { loading, allowed, error, retry, profile } as const;
}
