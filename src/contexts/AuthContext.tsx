import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session, User as SupaUser } from '@supabase/supabase-js';
import type { UserRole } from '@/types/models';

// Lightweight perf logging helper (only logs in dev)
const logPerf = (label: string, info: Record<string, any>) => {
  if (!import.meta.env.DEV) return;
  const ts = new Date().toISOString();
  // eslint-disable-next-line no-console
  console.log(`[AUTH_CONTEXT][${ts}] ${label}`, info);
};

// Timeout helper mejorado para Netlify
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

interface AuthContextType {
  session: Session | null;
  user: SupaUser | null;
  profileRole: UserRole | null;
  profileName: string | null;
  emailVerified: boolean | null;
  authLoading: boolean;
  authWarning: string | null;
  isLogged: boolean;
  displayName: string | null;
  retryAuth: () => void;
  signOut: () => Promise<void>;
  resendVerification: () => Promise<void>;
  resending: boolean;
  resent: boolean;
  isSigningOut: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profileRole, setProfileRole] = useState<UserRole | null>(null);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authWarning, setAuthWarning] = useState<string | null>(null);
  const [authReload, setAuthReload] = useState(0);
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);

  const user = session?.user || null;
  const isLogged = !!user;
  const displayName = isLogged
    ? (profileName ||
       user.user_metadata?.nombre ||
       user.user_metadata?.name ||
       user.email ||
       null)
    : null;

  const retryAuth = () => {
    logPerf('auth.retry', { reason: authWarning });
    setAuthWarning(null);
    setAuthLoading(true);
    setAuthReload((c) => c + 1);
  };

  // Función para limpiar localStorage corrupto al inicio
  const cleanCorruptedLocalStorage = () => {
    try {
      const sbKeys = Object.keys(localStorage).filter(k => k.startsWith("sb-") && k.includes("-auth-token"));
      
      for (const key of sbKeys) {
        try {
          const raw = localStorage.getItem(key);
          if (!raw) continue;
          
          const parsed = JSON.parse(raw);
          const s = parsed?.currentSession ?? parsed?.session ?? parsed;
          
          // Verificar estructura básica
          if (!s?.access_token || !s?.refresh_token) {
            console.warn("[AUTH_CONTEXT] Removing corrupted localStorage entry:", key);
            localStorage.removeItem(key);
            continue;
          }
          
          // Verificar expiración
          if (s.expires_at && s.expires_at * 1000 < Date.now()) {
            console.warn("[AUTH_CONTEXT] Removing expired localStorage entry:", key);
            localStorage.removeItem(key);
          }
        } catch (e) {
          console.warn("[AUTH_CONTEXT] Removing unparseable localStorage entry:", key);
          localStorage.removeItem(key);
        }
      }
    } catch (e) {
      console.warn("[AUTH_CONTEXT] Error cleaning localStorage:", e);
    }
  };

  async function tryRecoverSupabaseSessionFromStorage(): Promise<Session | null> {
    try {
      const sbKey = Object.keys(localStorage)
        .find(k => k.startsWith("sb-") && k.includes("-auth-token"));
      if (!sbKey) return null;

      const raw = localStorage.getItem(sbKey);
      if (!raw) return null;

      const parsed = JSON.parse(raw);
      const s = parsed?.currentSession ?? parsed?.session ?? parsed;

      const access_token: string | undefined = s?.access_token;
      const refresh_token: string | undefined = s?.refresh_token;
      const expires_at: number | undefined = s?.expires_at;

      if (!access_token || !refresh_token) {
        console.warn("[AUTH_CONTEXT] Invalid session in localStorage - missing tokens");
        localStorage.removeItem(sbKey);
        return null;
      }

      // Verificar si el token está expirado
      if (expires_at && expires_at * 1000 < Date.now()) {
        console.warn("[AUTH_CONTEXT] Session in localStorage is expired");
        localStorage.removeItem(sbKey);
        return null;
      }

      console.log("[AUTH_CONTEXT] Attempting to restore session from localStorage");
      const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
      
      if (error) {
        console.warn("[AUTH_CONTEXT] setSession from storage failed:", error.message);
        localStorage.removeItem(sbKey);
        return null;
      }
      
      console.log("[AUTH_CONTEXT] Successfully restored session from localStorage");
      return data.session ?? null;
    } catch (e) {
      console.warn("[AUTH_CONTEXT] tryRecoverSupabaseSessionFromStorage error:", e);
      const sbKeys = Object.keys(localStorage).filter(k => k.startsWith("sb-") && k.includes("-auth-token"));
      sbKeys.forEach(k => localStorage.removeItem(k));
      return null;
    }
  }

  // Monitorizar conectividad
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Autenticación principal
  useEffect(() => {
    let mounted = true;
    const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL || "admin@obradorencinas.com").toLowerCase();

    type ProfileRow = { id: string; role: UserRole; nombre: string };

    const upsertProfileIfNeeded = async (u: SupaUser) => {
      const t0 = performance.now();
      const selRes = await supabase
        .from("profiles")
        .select("id,role,nombre")
        .eq("user_id", u.id)
        .maybeSingle();
      const data = (selRes as any)?.data as ProfileRow | null;
      const error = (selRes as any)?.error as { message?: string } | null;
      const t1 = performance.now();
      logPerf("profiles.select maybeSingle", {
        duration_ms: +(t1 - t0).toFixed(1),
        user_id: u.id,
        hadError: !!error,
        found: !!data
      });

      if (!mounted) return;

      if (error) {
        logPerf("profiles.select error", { message: error.message });
        setProfileRole(null);
        setProfileName(null);
        return;
      }

      if (!data) {
        const inferredRole: UserRole =
          u.email && u.email.toLowerCase() === ADMIN_EMAIL ? "admin" : "customer";

        const t2 = performance.now();
        const insRes = await supabase
          .from("profiles")
          .insert({
            user_id: u.id,
            nombre:
              u.user_metadata?.nombre ||
              u.user_metadata?.name ||
              (u.email?.split("@")[0] ?? "Usuario"),
            role: inferredRole
          })
          .select("role,nombre")
          .single();
        const inserted = (insRes as any)?.data as { role: UserRole; nombre: string } | null;
        const insertErr = (insRes as any)?.error as { message?: string } | null;
        const t3 = performance.now();
        logPerf("profiles.insert single", {
          duration_ms: +(t3 - t2).toFixed(1),
          user_id: u.id,
          hadError: !!insertErr,
          assignedRole: inferredRole
        });

        if (!mounted) return;
        if (insertErr || !inserted) {
          if (insertErr) logPerf("profiles.insert error", { message: insertErr.message });
          setProfileRole(null);
          setProfileName(null);
          return;
        }
        setProfileRole(inserted.role as UserRole);
        setProfileName(inserted.nombre);
        return;
      }

      setProfileRole((data.role as UserRole) || null);
      setProfileName(data.nombre || null);
    };

    const init = async () => {
      setAuthLoading(true);
      setAuthWarning(null);
      
      cleanCorruptedLocalStorage();
      
      // Intenta obtener la sesión del cliente Supabase.
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      logPerf("auth.init getSession", { hasSession: !!currentSession });

      // Si no hay sesión activa en el cliente, intenta recuperarla desde localStorage.
      if (!currentSession) {
        logPerf("auth.init", { message: "No active session, attempting recovery from storage." });
        // tryRecover... llama a setSession, lo que disparará onAuthStateChange si tiene éxito.
        await tryRecoverSupabaseSessionFromStorage();
      }
      
      // Si después de todo no hay sesión, onAuthStateChange se disparará con
      // un evento INITIAL_SESSION y newSession=null, lo que pondrá authLoading a false.
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(async (evt, newSession) => {
      logPerf("auth.onAuthStateChange", { event: evt, hasSession: !!newSession });
      if (!mounted) return;

      // Una sesión es válida si tenemos un newSession.
      // Los eventos relevantes son INITIAL_SESSION (carga inicial), SIGNED_IN, y TOKEN_REFRESHED.
      if (newSession) {
        setSession(newSession);
        setEmailVerified(!!newSession.user.email_confirmed_at);
        // Solo buscamos perfil si hay un usuario en la sesión.
        if (newSession.user) {
          await upsertProfileIfNeeded(newSession.user);
        }
        // Una vez que tenemos sesión y perfil, la carga ha terminado.
        setAuthLoading(false);
      } else if (evt === 'SIGNED_OUT' || (evt === 'INITIAL_SESSION' && !newSession)) {
        // Si el evento es SIGNED_OUT, o si en la carga inicial no hay sesión,
        // limpiamos todo y terminamos la carga.
        setSession(null);
        setProfileRole(null);
        setProfileName(null);
        setEmailVerified(null);
        setAuthLoading(false);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [authReload, isOnline]);

  const signOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    logPerf("auth.signOut", { scope: "global" });
    try {
      const { error } = await supabase.auth.signOut({ scope: "global" });
      if (error) throw error;

      // Limpiar estado local inmediatamente
      setSession(null);
      setProfileRole(null);
      setProfileName(null);
      setEmailVerified(null);
      
      // Limpiar cualquier residuo de sesión en localStorage
      Object.keys(localStorage)
        .filter(k => k.startsWith("sb-") && k.includes("-auth-token"))
        .forEach(k => localStorage.removeItem(k));

    } catch (e: any) {
      logPerf("auth.signOut exception", { message: e.message });
      // Re-throw para que el UI pueda manejarlo
      throw e;
    } finally {
      setIsSigningOut(false);
    }
  };

  const resendVerification = async () => {
    if (!user?.email || resending || emailVerified) return;
    setResending(true);
    setResent(false);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth-confirm`
        }
      });
      if (error) throw error;
      setResent(true);
    } catch (e: any) {
      // Re-throw para que el UI pueda manejarlo
      throw e;
    } finally {
      setResending(false);
    }
  };

  const value = {
    session,
    user,
    profileRole,
    profileName,
    emailVerified,
    authLoading,
    authWarning,
    isLogged,
    displayName,
    retryAuth,
    signOut,
    resendVerification,
    resending,
    resent,
    isSigningOut
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
