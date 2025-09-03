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

  const retryAuth = () => {
    setAuthWarning(null);
    setAuthLoading(true);
    setAuthReload(c => c + 1);
  };

  // Deducción simple de perfil sin llamadas a DB
  const deriveProfile = (u: SupaUser | null) => {
    if (!u) {
      setProfileRole(null);
      setProfileName(null);
      setEmailVerified(null);
      return;
    }
    const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL || 'admin@obradorencinas.com').toLowerCase();
    const email = (u.email || '').toLowerCase();
    const role: UserRole = email === ADMIN_EMAIL ? 'admin' : 'customer';
    setProfileRole(role);
    setProfileName(u.user_metadata?.nombre || u.user_metadata?.name || (u.email?.split('@')[0] ?? 'Usuario'));
    setEmailVerified(!!u.email_confirmed_at);
  };

  // Auto-login mínimo y directo (sin signup ni perfiles)
  const autoLogin = async (): Promise<Session | null> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'felipedelacruzgoon@gmail.com',
        password: 'Qwertyu'
      });
      if (error) {
        setAuthWarning(`Auto-login falló: ${error.message}`);
        return null;
      }
      return data.session ?? null;
    } catch (e: any) {
      setAuthWarning(`Error en auto-login: ${e?.message || String(e)}`);
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      setAuthLoading(true);
      setAuthWarning(null);

      const { data: { session: s0 }, error: getErr } = await supabase.auth.getSession();
      if (!mounted) return;

      if (getErr) {
        setAuthWarning(`Error obteniendo sesión: ${getErr.message}`);
      }

      let s = s0;
      if (!s) {
        s = await autoLogin();
      }

      if (!mounted) return;

      if (s) {
        setSession(s);
        deriveProfile(s.user);
      } else {
        setSession(null);
        deriveProfile(null);
      }
      setAuthLoading(false);
    })();

    // Mantener suscripción por si el SDK actualiza tokens, pero no dependemos de ella para iniciar
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      deriveProfile(newSession?.user ?? null);
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
      try {
        Object.keys(localStorage).forEach(k => {
          if (k === 'obrador-auth' || (k.startsWith('sb-') && k.includes('-auth-token'))) {
            localStorage.removeItem(k);
          }
        });
      } catch {}
      setSession(null);
      deriveProfile(null);
      setIsSigningOut(false);
    }
  };

  // Placeholders para compatibilidad con la UI (no usados en auto-login de pruebas)
  const resendVerification = async () => { return; };

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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
