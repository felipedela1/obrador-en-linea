import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { UserRole } from "@/types/models";
import { debug } from "@/lib/debug";

// Small timeout helper
const withTimeout = async <T,>(p: Promise<T>, ms = 7000, label = "op"): Promise<T> => {
  let t: number | undefined;
  const timeout = new Promise<never>((_, rej) => { t = window.setTimeout(() => rej(new Error(`Timeout ${label} after ${ms}ms`)), ms); });
  try { return (await Promise.race([p, timeout])) as T; } finally { if (t) clearTimeout(t); }
};

export function useProfileGate() {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<{ role: UserRole; nombre: string } | null>(null);
  const [reload, setReload] = useState(0);

  const retry = useCallback(() => { setReload(c => c + 1); }, []);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      setLoading(true); setAllowed(false); setError(null); setProfile(null);
      try {
        if (typeof navigator !== "undefined" && navigator.onLine === false) {
          setError("Sin conexión. Revisa tu red."); setAllowed(false); return;
        }
        const { data: { session }, error: getErr } = await withTimeout(supabase.auth.getSession(), 6000, "auth.getSession");
        if (getErr) { setError(getErr.message || "Error de autenticación"); setAllowed(false); return; }
        const u = session?.user;
        if (!u) { setError("Inicia sesión para continuar"); setAllowed(false); return; }

        // Try to read profile
        const selPromise = supabase
          .from("profiles")
          .select("role,nombre")
          .eq("user_id", u.id)
          .maybeSingle() as unknown as Promise<any>;
        const sel = await withTimeout(selPromise, 6000, "profiles.select") as any;
        const data = sel?.data as { role: UserRole; nombre: string } | null;
        const err = sel?.error as { message?: string } | null;
        if (err) { setError("No se pudo conectar a la base de datos"); setAllowed(false); return; }

        if (!data) {
          // Upsert minimal profile (same logic as Navbar)
          const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL || "admin@obradorencinas.com").toLowerCase();
          const inferredRole: UserRole = u.email && u.email.toLowerCase() === ADMIN_EMAIL ? "admin" : "customer";
          const insPromise = supabase
            .from("profiles")
            .insert({
              user_id: u.id,
              nombre: u.user_metadata?.nombre || u.user_metadata?.name || (u.email?.split("@")[0] ?? "Usuario"),
              role: inferredRole
            })
            .select("role,nombre")
            .single() as unknown as Promise<any>;
          const ins = await withTimeout(insPromise, 6000, "profiles.insert") as any;
          const inserted = ins?.data as { role: UserRole; nombre: string } | null;
          const insErr = ins?.error as { message?: string } | null;
          if (insErr || !inserted) { setError("No se pudo crear perfil (DB)"); setAllowed(false); return; }
          if (!mounted) return;
          setProfile(inserted); setAllowed(true); setError(null); return;
        }

        if (!mounted) return;
        setProfile(data); setAllowed(true); setError(null);
      } catch (e: any) {
        debug.log("auth", "profileGate.exception", { message: e?.message });
        setError(e?.message || "Error de red"); setAllowed(false);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    run();
    const { data: sub } = supabase.auth.onAuthStateChange(() => run());
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, [reload]);

  return { loading, allowed, error, retry, profile } as const;
}
