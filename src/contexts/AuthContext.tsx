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

  // Función de auto-login para pruebas
  const autoLogin = async () => {
    try {
      console.log('[AUTO-LOGIN] Intentando login con felipedelacruzgoon@gmail.com');
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'felipedelacruzgoon@gmail.com',
        password: 'Qwertyu'
      });
      if (error) {
        console.log('[AUTO-LOGIN] Login falló:', error.message);
        // Si el error indica que el usuario no existe o credenciales inválidas, intentar registro
        if (error.message.includes('Invalid login credentials') || error.message.includes('Email not confirmed') || error.message.includes('User not found')) {
          console.log('[AUTO-LOGIN] Intentando registro...');
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: 'felipedelacruzgoon@gmail.com',
            password: 'Qwertyu',
            options: {
              data: {
                nombre: 'Felipe'
              }
            }
          });
          if (signUpError) {
            console.log('[AUTO-LOGIN] Registro falló:', signUpError.message);
            return false;
          }
          console.log('[AUTO-LOGIN] Registro exitoso, esperando confirmación...');
          // Después del registro, intentar login nuevamente
          await delay(2000); // Esperar un poco para que se procese
          const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
            email: 'felipedelacruzgoon@gmail.com',
            password: 'Qwertyu'
          });
          if (loginError) {
            console.log('[AUTO-LOGIN] Login después de registro falló:', loginError.message);
            return false;
          }
          console.log('[AUTO-LOGIN] Login exitoso después de registro');
          return true;
        }
        return false;
      }
      console.log('[AUTO-LOGIN] Login exitoso para Felipe');
      return true;
    } catch (err) {
      console.log('[AUTO-LOGIN] Error en auto-login:', err);
      return false;
    }
  };

  // Utilidades de timeout no bloqueantes
  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
  const withTimeout = async <T,>(p: Promise<T>, ms: number): Promise<T | 'timeout'> => {
    return await Promise.race([p, delay(ms).then(() => 'timeout' as const)]);
  };

  // Evitar relecturas del mismo perfil en ráfaga
  const [lastProfileUid, setLastProfileUid] = useState<string | null>(null);

  type ProfileRow = { id: string; role: UserRole; nombre: string; email?: string | null; telefono?: string | null; direccion_entrega?: string | null };

  const upsertProfileIfNeeded = async (u: SupaUser) => {
    const metaTel = (u.user_metadata as any)?.telefono as string | undefined;
    const metaDir = (u.user_metadata as any)?.direccion_entrega as string | undefined;
    const userEmail = u.email ?? null;

    const selRes = await supabase
      .from("profiles")
      .select("id,role,nombre,email,telefono,direccion_entrega")
      .eq("user_id", u.id)
      .maybeSingle();

    const data = (selRes as any)?.data as ProfileRow | null;
    const err = (selRes as any)?.error as { message?: string } | null;

    if (err) {
      setProfileRole(null);
      setProfileName(u.user_metadata?.nombre || u.user_metadata?.name || (userEmail?.split("@")[0] ?? 'Usuario'));
      return;
    }

    if (data) {
      const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL || "admin@obradorencinas.com").toLowerCase();
      const inferredRole: UserRole = (userEmail && userEmail.toLowerCase() === ADMIN_EMAIL) ? "admin" : "customer";
      
      const needsUpdate =
        (userEmail && data.email !== userEmail) ||
        (!!metaTel && !data.telefono) ||
        (!!metaDir && !data.direccion_entrega) ||
        (data.role !== inferredRole);

      if (needsUpdate) {
        await supabase
          .from("profiles")
          .update({
            email: userEmail ?? data.email ?? null,
            telefono: data.telefono || metaTel || null,
            direccion_entrega: data.direccion_entrega || metaDir || null,
            role: inferredRole,
          })
          .eq("user_id", u.id);
      }

      setProfileRole((data.role as UserRole) || inferredRole);
      setProfileName(data.nombre || null);
      return;
    }

    // Crear perfil mínimo con teléfono/dirección si existen en metadata
    const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL || "admin@obradorencinas.com").toLowerCase();
    const inferredRole: UserRole = (userEmail && userEmail.toLowerCase() === ADMIN_EMAIL) ? "admin" : "customer";

    const insRes = await supabase
      .from("profiles")
      .insert({
        user_id: u.id,
        nombre: u.user_metadata?.nombre || u.user_metadata?.name || (userEmail?.split("@")[0] ?? "Usuario"),
        role: inferredRole,
        email: userEmail,
        telefono: metaTel || null,
        direccion_entrega: metaDir || null,
      })
      .select("role,nombre")
      .single();

    const inserted = (insRes as any)?.data as { role: UserRole; nombre: string } | null;
    if (inserted) {
      setProfileRole(inserted.role);
      setProfileName(inserted.nombre);
    } else {
      setProfileRole(null);
      setProfileName(u.user_metadata?.nombre || u.user_metadata?.name || (userEmail?.split("@")[0] ?? "Usuario"));
    }
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      setAuthLoading(true);
      setAuthWarning(null);

      // 1) Sesión del SDK (sb-*)
      const { data: { session: s0 } } = await supabase.auth.getSession();
      let s = s0;

      // 2) Migración puntual desde 'obrador-auth'
      if (!s) {
        try {
          const raw = localStorage.getItem('obrador-auth');
          if (raw) {
            const parsed = JSON.parse(raw);
            const ss = parsed?.currentSession ?? parsed?.session ?? parsed;
            const access_token: string | undefined = ss?.access_token;
            const refresh_token: string | undefined = ss?.refresh_token;
            const expires_at: number | undefined = ss?.expires_at;

            if (access_token && refresh_token && (!expires_at || expires_at * 1000 > Date.now())) {
              const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
              if (!error) s = data.session ?? null;
            }
            // limpiar clave antigua siempre para evitar divergencias
            try { localStorage.removeItem('obrador-auth'); } catch {}
          }
        } catch {}
      }

      if (!mounted) return;

      if (s) {
        setSession(s);
        setEmailVerified(!!s.user.email_confirmed_at);
        // No bloquear la UI esperando perfil: dar como máximo 2.5s
        await withTimeout(upsertProfileIfNeeded(s.user) as unknown as Promise<any>, 2500);
        if (!mounted) return;
        setAuthLoading(false);
      } else {
        // Intentar auto-login siempre si no hay sesión
        console.log('[INIT] No hay sesión activa, intentando auto-login...');
        const autoLoginSuccess = await autoLogin();
        if (!autoLoginSuccess) {
          console.log('[INIT] Auto-login falló, permaneciendo sin sesión');
          setSession(null);
          setProfileRole(null);
          setProfileName(null);
          setEmailVerified(null);
          setAuthLoading(false);
        }
        // Si el auto-login fue exitoso, el onAuthStateChange se encargará de actualizar la sesión
      }
    };

    init();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_evt, newSession) => {
      if (!mounted) return;
      if (newSession) {
        setSession(newSession);
        setEmailVerified(!!newSession.user.email_confirmed_at);
        await withTimeout(upsertProfileIfNeeded(newSession.user) as unknown as Promise<any>, 2500);
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
