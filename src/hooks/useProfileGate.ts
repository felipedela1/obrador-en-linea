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

        // Helper to parse a session directly from localStorage if SDK stalls
        const readLocalSession = (): any | null => {
          try {
            const now = Date.now();
            const tryParse = (raw: string | null) => {
              if (!raw) return null;
              try { return JSON.parse(raw); } catch { return null; }
            };

            // Prefer custom storage key if present
            const custom = tryParse(window.localStorage.getItem("obrador-auth"));
            const sbKey = (() => {
              try {
                for (let i = 0; i < window.localStorage.length; i++) {
                  const k = window.localStorage.key(i) || "";
                  if (/^sb-.*-auth-token$/.test(k)) return k;
                }
              } catch {}
              return null;
            })();
            const sbVal = sbKey ? tryParse(window.localStorage.getItem(sbKey)) : null;

            // Supabase v2 stores { currentSession, expiresAt }
            const pickSession = (obj: any) => obj?.currentSession || obj?.session || obj?.data?.session || null;
            let sess = pickSession(custom) || pickSession(sbVal);
            if (!sess) return null;

            const expiresAtMs = (sess?.expires_at ? sess.expires_at * 1000 : (custom?.expiresAt || sbVal?.expiresAt || 0)) as number;
            const expired = !!expiresAtMs && expiresAtMs < now - 10_000; // 10s clock skew
            debug.log("auth", "gate.localSession.inspect", { hasCustom: !!custom, hasSb: !!sbVal, expired });
            if (expired) return null;
            return sess;
          } catch (e: any) {
            debug.log("auth", "gate.localSession.error", { message: e?.message });
            return null;
          }
        };

        // getSession with graceful fallback and tiny backoff
        let session: any = null;
        for (let attempt = 0; attempt < 2 && !session; attempt++) {
          try {
            const res: any = await withTimeout(supabase.auth.getSession(), 9000, `auth.getSession#a${attempt}`);
            session = res?.data?.session ?? null;
            if (session) break;
          } catch (e: any) {
            debug.log("auth", "gate.getSession.timeout", { attempt, message: e?.message });
          }
          if (!session) {
            try {
              const rf: any = await withTimeout(supabase.auth.refreshSession(), 7000, `auth.refreshSession#a${attempt}`);
              session = rf?.data?.session ?? null;
            } catch (e2: any) {
              debug.log("auth", "gate.refresh.timeout", { attempt, message: e2?.message });
            }
          }
          if (!session && attempt === 0) {
            // Final fallback before giving up: read from localStorage
            const localSess = readLocalSession();
            if (localSess) {
              debug.log("auth", "gate.localSession.used", { source: "attempt0-fallback" });
              session = localSess;
              break;
            }
            await new Promise(r => setTimeout(r, 400));
          }
        }

        if (!session) {
          // One last try: purely from storage
          const localSess = readLocalSession();
          if (localSess) {
            debug.log("auth", "gate.localSession.used", { source: "final" });
            session = localSess;
          }
        }

        const u = session?.user;
        if (!u) { setError("Inicia sesión para continuar"); setAllowed(false); return; }

        // Try to read profile
        const selPromise = supabase
          .from("profiles")
          .select("role,nombre")
          .eq("user_id", u.id)
          .maybeSingle() as unknown as Promise<any>;
        const sel = await withTimeout(selPromise, 8000, "profiles.select") as any;
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
          const ins = await withTimeout(insPromise, 8000, "profiles.insert") as any;
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
        // Distinguish offline vs transient
        const msg = typeof navigator !== 'undefined' && navigator.onLine === false ? "Sin conexión. Revisa tu red." : (e?.message || "Error de red");
        setError(msg); setAllowed(false);
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
