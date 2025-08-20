import { useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import { supabase } from "@/integrations/supabase/client";

// Perf logging helper
const logPerf = (label: string, info: Record<string, any>) => {
  if (!import.meta.env.DEV) return;
  const ts = new Date().toISOString();
  // eslint-disable-next-line no-console
  console.log(`[PERF][${ts}] ${label}`, info);
};

// Util para parsear el fragment #a=1&b=2
function parseHashParams(hash: string): Record<string, string> {
  const out: Record<string, string> = {};
  hash.replace(/^#/, "").split("&").forEach(pair => {
    const [k, v] = pair.split("=");
    if (k) out[decodeURIComponent(k)] = decodeURIComponent(v || "");
  });
  return out;
}

const AuthConfirm = () => {
  useEffect(() => {
    let cancelled = false;

    const handleSession = async (attempt = 1) => {
      if (cancelled) return;
      try {
        const hash = window.location.hash;
        const hasTokens = /access_token=|refresh_token=/.test(hash);

        if (hasTokens) {
          const params = parseHashParams(hash);
          const { access_token, refresh_token, token_type, expires_in, expires_at, type } = params as any;
          logPerf("auth.hash.detected", { hasTokens, type });

            // Supabase JS v2 no expone setSession públicamente con tokens arbitrarios, así que usamos auth.exchangeCodeForSession si existiera un code param
          if (params.code && typeof (supabase.auth as any).exchangeCodeForSession === "function") {
            const t0 = performance.now();
            const { data, error } = await (supabase.auth as any).exchangeCodeForSession(params.code);
            const t1 = performance.now();
            logPerf("auth.exchangeCodeForSession", { duration_ms: +(t1 - t0).toFixed(1), hadError: !!error });
            if (!error && data?.session) {
              history.replaceState(null, document.title, window.location.pathname);
              window.location.replace("/");
              return;
            }
          } else if (access_token && refresh_token) {
            // Intentar setSession si está disponible (algunas versiones lo permiten)
            if (typeof (supabase.auth as any).setSession === "function") {
              const t0 = performance.now();
              const { data, error } = await (supabase.auth as any).setSession({ access_token, refresh_token });
              const t1 = performance.now();
              logPerf("auth.setSession", { duration_ms: +(t1 - t0).toFixed(1), hadError: !!error, user_id: data?.user?.id });
              if (!error && data?.session) {
                history.replaceState(null, document.title, window.location.pathname);
                window.location.replace("/");
                return;
              }
            } else {
              logPerf("auth.setSession.unavailable", {});
            }
          }
        }

        const t2 = performance.now();
        const { data: { session }, error: getErr } = await supabase.auth.getSession();
        const t3 = performance.now();
        logPerf("auth.getSession.fallback", { duration_ms: +(t3 - t2).toFixed(1), hasSession: !!session, hadError: !!getErr, attempt });
        if (getErr) logPerf("auth.getSession.error", { message: getErr.message });
        if (session) {
          window.location.replace("/");
          return;
        }

        // 3. Reintentar unas pocas veces porque Supabase puede tardar en persistir la sesión
        if (attempt < 5) {
          setTimeout(() => handleSession(attempt + 1), 600 * attempt); // backoff incremental
        } else {
          logPerf("auth.confirm.maxAttemptsReached", {});
        }
      } catch (e: any) {
        logPerf("auth.confirm.exception", { message: e?.message });
      }
    };

    handleSession();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4 pt-20 pb-10">
        <div className="max-w-md text-center space-y-6">
          <h1 className="text-3xl font-bold">Confirmando cuenta...</h1>
          <p className="text-sm text-muted-foreground">Un momento mientras validamos tu sesión.</p>
        </div>
      </main>
    </div>
  );
};

export default AuthConfirm;
