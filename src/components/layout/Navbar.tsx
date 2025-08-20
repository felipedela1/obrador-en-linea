import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu, User as UserIcon, Clock, LogOut, AlertCircle } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import type { UserRole } from "@/types/models"
import { useToast } from "@/components/ui/use-toast"
import type { Session, User as SupaUser } from "@supabase/supabase-js"
import { useLocation } from "react-router-dom"

// Lightweight perf logging helper (only logs in dev)
const logPerf = (label: string, info: Record<string, any>) => {
  if (!import.meta.env.DEV) return
  const ts = new Date().toISOString()
  // eslint-disable-next-line no-console
  console.log(`[PERF][${ts}] ${label}`, info)
}

const Navbar = () => {
  const [session, setSession] = useState<Session | null>(null)
  const [profileRole, setProfileRole] = useState<UserRole | null>(null)
  const [profileName, setProfileName] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const { toast } = useToast()
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null)
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)
  const location = useLocation()
  const isRecoveryRoute = location.pathname === "/update-password"
  const user = session?.user || null
  const isLogged = !!user && !isRecoveryRoute
  const displayName =
    isLogged
      ? (profileName ||
         user.user_metadata?.nombre ||
         user.user_metadata?.name ||
         user.email ||
         null)
      : null

  useEffect(() => {
    let mounted = true
    const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL || "admin@obradorencinas.com").toLowerCase()

    const upsertProfileIfNeeded = async (u: SupaUser) => {
      const t0 = performance.now()
      const { data, error } = await supabase
        .from("profiles")
        .select("id,role,nombre")
        .eq("user_id", u.id)
        .maybeSingle()
      const t1 = performance.now()
      logPerf("profiles.select maybeSingle", {
        duration_ms: +(t1 - t0).toFixed(1),
        user_id: u.id,
        hadError: !!error,
        found: !!data
      })

      if (!mounted) return

      if (error) {
        logPerf("profiles.select error", { message: error.message })
        setProfileRole(null)
        setProfileName(null)
        return
      }

      if (!data) {
        const inferredRole: UserRole =
          u.email && u.email.toLowerCase() === ADMIN_EMAIL ? "admin" : "customer"

        const t2 = performance.now()
        const { data: inserted, error: insertErr } = await supabase
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
          .single()
        const t3 = performance.now()
        logPerf("profiles.insert single", {
          duration_ms: +(t3 - t2).toFixed(1),
          user_id: u.id,
          hadError: !!insertErr,
          assignedRole: inferredRole
        })

        if (!mounted) return
        if (insertErr || !inserted) {
          if (insertErr) logPerf("profiles.insert error", { message: insertErr.message })
          setProfileRole(null)
          setProfileName(null)
          return
        }
        setProfileRole(inserted.role as UserRole)
        setProfileName(inserted.nombre)
        return
      }

      setProfileRole((data.role as UserRole) || null)
      setProfileName(data.nombre || null)
    }

    const init = async () => {
      setAuthLoading(true)
      const t0 = performance.now()
      const { data: { session } } = await supabase.auth.getSession()
      const t1 = performance.now()
      logPerf("auth.getSession", { duration_ms: +(t1 - t0).toFixed(1), hasSession: !!session })
      if (!mounted) return
      setSession(session)
      if (session?.user) {
        setEmailVerified(!!session.user.email_confirmed_at)
        await upsertProfileIfNeeded(session.user)
      } else {
        setProfileRole(null)
        setProfileName(null)
        setEmailVerified(null)
      }
      setAuthLoading(false)
    }

    init()

    const { data: listener } = supabase.auth.onAuthStateChange(async (evt, newSession) => {
      logPerf("auth.onAuthStateChange", { event: evt, hasSession: !!newSession })
      if (!mounted) return
      setSession(newSession)
      if (newSession?.user) {
        setEmailVerified(!!newSession.user.email_confirmed_at)
        await upsertProfileIfNeeded(newSession.user)
      } else {
        setProfileRole(null)
        setProfileName(null)
        setEmailVerified(null)
      }
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const handleSignOut = async () => {
    if (isSigningOut) return
    setIsSigningOut(true)
    const t0 = performance.now()
    try {
      const { error } = await supabase.auth.signOut({ scope: "global" }) // revoca todos los refresh tokens
      const t1 = performance.now()
      logPerf("auth.signOut", { duration_ms: +(t1 - t0).toFixed(1), hadError: !!error })
      if (error) throw error

      Object.keys(localStorage)
        .filter(k => k.startsWith("sb-") && k.includes("-auth-token"))
        .forEach(k => localStorage.removeItem(k))

      setSession(null)
      setProfileRole(null)
      setProfileName(null)
      setEmailVerified(null)
      toast({ title: "Sesión cerrada" })
      window.location.replace("/")
    } catch (e: any) {
      logPerf("auth.signOut exception", { message: e.message })
      toast({
        title: "Error al cerrar sesión",
        description: e.message || "Inténtalo de nuevo",
        variant: "destructive"
      })
    } finally {
      setIsSigningOut(false)
    }
  }

  const resendVerification = async () => {
    if (!user?.email || resending || emailVerified) return
    setResending(true)
    setResent(false)
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: user.email,
        options: { emailRedirectTo: window.location.origin + "/auth-confirm" }
      })
      if (error) throw error
      setResent(true)
      toast({ title: "Correo reenviado" })
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "No se pudo reenviar", variant: "destructive" })
    } finally {
      setResending(false)
    }
  }

  const navLinks = [
    { label: "Inicio", href: "/" },
    { label: "Productos", href: "/productos" },
    ...(isLogged && (profileRole === "customer" || profileRole === "admin") ? [
      { label: "Reservas", href: "/reservas" },
      { label: "Mis reservas", href: "/misreservas" }
    ] : []),
    ...(profileRole === "admin" ? [{ label: "Admin", href: "/admin" }] : [])
  ]

  const NavLinks = ({ mobile = false, onClose = () => {} }: { mobile?: boolean; onClose?: () => void }) => (
    <div className={mobile ? "flex flex-col space-y-4" : "hidden md:flex items-center space-x-8"}>
      {navLinks.map(l => (
        <a
          key={l.href}
          href={l.href}
          onClick={onClose}
          className={`text-sm font-medium transition-colors hover:text-primary ${mobile ? "text-foreground py-2" : "text-foreground/80"}`}
        >
          {l.label}
        </a>
      ))}
    </div>
  )

  return (
    <nav className="fixed top-0 w-full z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-4">
        {isLogged && emailVerified === false && (
          <div className="flex items-center gap-3 bg-amber-50 text-amber-800 border border-amber-200 rounded-md px-3 py-1 mt-2 mb-2 text-xs animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Correo no verificado. Revisa tu bandeja o reenvía.</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-amber-800 hover:text-amber-900"
              onClick={resendVerification}
              disabled={resending}
            >
              {resending ? "Enviando..." : resent ? "Enviado" : "Reenviar"}
            </Button>
          </div>
        )}
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <a href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-hero rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">OE</span>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-foreground text-lg leading-none">Obrador</span>
              <span className="text-primary text-xs leading-none">Encinas</span>
            </div>
          </a>

          {/* Desktop nav */}
          <NavLinks />

          {/* Right side */}
          <div className="hidden md:flex items-center space-x-4">
            <div className="flex items-center text-xs text-muted-foreground mr-4">
              <Clock className="w-4 h-4 mr-1" />
              <span>Abierto hasta 14:00</span>
            </div>

            {authLoading ? (
              <div className="w-24 h-4 bg-muted rounded" />
            ) : isLogged ? (
              <div className="flex items-center space-x-2">
                <span className="flex items-center text-sm font-medium text-foreground/90">
                  <UserIcon className="w-4 h-4 mr-1" /> {displayName}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSignOut}
                  className="h-8 w-8"
                  title="Cerrar sesión"
                  disabled={isSigningOut}
                  aria-busy={isSigningOut}
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Button variant="ghost" size="sm" className="text-foreground/80" asChild>
                <a href="/login">
                  <UserIcon className="w-4 h-4 mr-2" />
                  Acceder
                </a>
              </Button>
            )}
          </div>

          {/* Mobile */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="sm">
                <Menu className="w-5 h-5" />
                <span className="sr-only">Abrir menú</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80">
              <div className="flex flex-col h-full">
                <div className="flex items-center space-x-2 mb-8">
                  <div className="w-8 h-8 bg-gradient-hero rounded-lg flex items-center justify-center">
                    <span className="text-primary-foreground font-bold text-sm">OE</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-foreground text-lg leading-none">Obrador</span>
                    <span className="text-primary text-xs leading-none">Encinas</span>
                  </div>
                </div>

                <NavLinks mobile onClose={() => setIsOpen(false)} />

                {isLogged && emailVerified === false && (
                  <div className="mt-6 p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-800 text-xs flex flex-col gap-2">
                    <div className="flex items-center gap-2 font-medium"><AlertCircle className="w-4 h-4" /> Correo no verificado</div>
                    <Button size="sm" variant="outline" onClick={resendVerification} disabled={resending} className="h-7 text-amber-800 border-amber-300">
                      {resending ? "Enviando..." : resent ? "Enviado" : "Reenviar enlace"}
                    </Button>
                  </div>
                )}

                <div className="mt-auto space-y-3">
                  {authLoading ? (
                    <div className="w-full h-8 bg-muted rounded" />
                  ) : isLogged ? (
                    <div className="space-y-3">
                      <div className="flex items-center text-sm font-medium text-foreground/90">
                        <UserIcon className="w-4 h-4 mr-2" /> {displayName}
                      </div>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => { handleSignOut(); setIsOpen(false) }}
                        disabled={isSigningOut}
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        {isSigningOut ? "Cerrando..." : "Cerrar sesión"}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full"
                      asChild
                      onClick={() => setIsOpen(false)}
                    >
                      <a href="/login">
                        <UserIcon className="w-4 h-4 mr-2" />
                        Iniciar sesión
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  )
}

export default Navbar