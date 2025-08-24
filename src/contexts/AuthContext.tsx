import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session, User as SupaUser } from '@supabase/supabase-js';
import type { UserRole } from '@/types/models';

const log = (...args: any[]) => { if (import.meta.env.DEV) console.log('[AUTH]', ...args); };

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
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};

interface AuthProviderProps { children: ReactNode; }

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

  const user = session?.user || null;
  const isLogged = !!user;
  const displayName = isLogged
    ? (profileName ||
       user.user_metadata?.nombre ||
       user.user_metadata?.name ||
       user.email ||
       null)
    : null;

  const retryAuth = () => { setAuthWarning(null); setAuthLoading(true); setAuthReload(c => c + 1); };

  const migrateLegacyStorage = async (): Promise<Session | null> => {
    try {
      const raw = localStorage.getItem('obrador-auth');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const s = parsed?.currentSession ?? parsed?.session ?? parsed;
      const access_token: string | undefined = s?.access_token;
      const refresh_token: string | undefined = s?.refresh_token;
      const expires_at: number | undefined = s?.expires_at;

      if (!access_token || !refresh_token) {
        localStorage.removeItem('obrador-auth');
        return null;
      }
      if (expires_at && expires_at * 1000 < Date.now()) {
        localStorage.removeItem('obrador-auth');
        return null;
      }

      // Migrar a la clave por defecto del SDK
      const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
      if (error) {
        localStorage.removeItem('obrador-auth');
        return null;
      }
      // Limpia la antigua para evitar divergencias
      localStorage.removeItem('obrador-auth');
      return data.session ?? null;
    } catch {
      localStorage.removeItem('obrador-auth');
      return null;
    }
  };

  type ProfileRow = { id: string; role: UserRole; nombre: string };

  const upsertProfileIfNeeded = async (u: SupaUser) => {
    // 1) Intentar leer
    const selRes = await supabase
      .from("profiles")
      .select("id,role,nombre")
      .eq("user_id", u.id)
      .maybeSingle();

    const data = (selRes as any)?.data as ProfileRow | null;
    const err = (selRes as any)?.error as { message?: string } | null;

    if (err) {
      // No bloquear UX: dejar nombre de usuario básico y role null
      setProfileRole(null);
      setProfileName(u.user_metadata?.nombre || u.user_metadata?.name || (u.email?.split("@")[0] ?? 'Usuario'));
      return;
    }

    if (data) {
      setProfileRole((data.role as UserRole) || null);
      setProfileName(data.nombre || null);
      return;
    }

    // 2) No existe → inferir y crear mínimo
    const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL || "admin@obradorencinas.com").toLowerCase();
    const inferredRole: UserRole = (u.email && u.email.toLowerCase() === ADMIN_EMAIL) ? "admin" : "customer";

    const insRes = await supabase
      .from("profiles")
      .insert({
        user_id: u.id,
        nombre: u.user_metadata?.nombre || u.user_metadata?.name || (u.email?.split("@")[0] ?? "Usuario"),
        role: inferredRole
      })
      .select("role,nombre")
      .single();

    const inserted = (insRes as any)?.data as { role: UserRole; nombre: string } | null;
    if (inserted) {
      setProfileRole(inserted.role);
      setProfileName(inserted.nombre);
    } else {
      // No bloquear si insert falla
      setProfileRole(null);
      setProfileName(u.user_metadata?.nombre || u.user_metadata?.name || (u.email?.split("@")[0] ?? "Usuario"));
    }
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      setAuthLoading(true);
      setAuthWarning(null);

      // 1) Sesión actual (SDK lee la clave por defecto sb-*)
      const { data: { session: s0 } } = await supabase.auth.getSession();
      let s = s0;

      // 2) Migrar desde 'obrador-auth' si no hay sesión
      if (!s) {
        s = await migrateLegacyStorage();
      }

      if (!mounted) return;

      if (s) {
        setSession(s);
        setEmailVerified(!!s.user.email_confirmed_at);
        await upsertProfileIfNeeded(s.user);
        if (!mounted) return;
        setAuthLoading(false);
      } else {
        setSession(null);
        setProfileRole(null);
        setProfileName(null);
        setEmailVerified(null);
        setAuthLoading(false);
      }
    };

    init();

    const { data: sub } = supabase.auth.onAuthStateChange(async (evt, newSession) => {
      if (!mounted) return;
      log('state', evt, { hasSession: !!newSession });

      if (newSession) {
        setSession(newSession);
        setEmailVerified(!!newSession.user.email_confirmed_at);
        await upsertProfileIfNeeded(newSession.user);
        if (!mounted) return;
        setAuthLoading(false);
      } else {
        setSession(null);
        setProfileRole(null);
        setProfileName(null);
        setEmailVerified(null);
        setAuthLoading(false);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [authReload]);

  const signOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      await supabase.auth.signOut({ scope: 'global' });
    } finally {
      // Limpiar ambos tipos de claves por si quedan restos
      try {
        Object.keys(localStorage).forEach(k => {
          if (k === 'obrador-auth' || (k.startsWith('sb-') && k.includes('-auth-token'))) {
            localStorage.removeItem(k);
          }
        });
      } catch {}
      setSession(null);
      setProfileRole(null);
      setProfileName(null);
      setEmailVerified(null);
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
        options: { emailRedirectTo: `${window.location.origin}/auth-confirm` }
      });
      if (error) throw error;
      setResent(true);
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
    retryAuth: () => setAuthReload(c => c + 1),
    signOut,
    resendVerification,
    resending,
    resent,
    isSigningOut
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
