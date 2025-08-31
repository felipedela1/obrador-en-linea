import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu, User as UserIcon, Clock, LogOut, AlertCircle, Wheat, Crown, ChevronRight } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/components/ui/use-toast"
import { useLocation, Link } from "react-router-dom"

const Navbar = () => {
  const {
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
  } = useAuth()
  
  const [isOpen, setIsOpen] = useState(false)
  const { toast } = useToast()
  const location = useLocation()
  const isRecoveryRoute = location.pathname === "/update-password"
  const isLoggedAndNotRecovery = isLogged && !isRecoveryRoute

  // Estado para detectar scroll y la posición
  const [scrolled, setScrolled] = useState(false)
  const lastScrollY = useRef(0)
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | null>(null)
  
  // Nuevo estado para detectar si necesitamos fondo oscuro
  const [needsDarkBg, setNeedsDarkBg] = useState(false)

  // Detectar rutas que necesitan fondo oscuro
  useEffect(() => {
    const darkBackgroundRoutes = ["/", "/inicio", "/home"]
    setNeedsDarkBg(darkBackgroundRoutes.includes(location.pathname))
  }, [location.pathname])

  // Mejorar el comportamiento de scroll para mayor fluidez
  useEffect(() => {
    // Añadir comportamiento de scroll suave al documento
    document.documentElement.style.scrollBehavior = 'smooth';
    
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      
      // Determinar si hemos scrolleado suficiente para cambiar la apariencia
      if (currentScrollY > 20) {
        setScrolled(true)
        
        // Determinar dirección de scroll para animaciones
        if (currentScrollY > lastScrollY.current) {
          setScrollDirection('down')
        } else {
          setScrollDirection('up')
        }
      } else {
        setScrolled(false)
        setScrollDirection(null)
      }
      
      lastScrollY.current = currentScrollY
    }
    
    // Usar passive true para mejor rendimiento
    window.addEventListener('scroll', handleScroll, { passive: true })
    
    return () => {
      window.removeEventListener('scroll', handleScroll)
      document.documentElement.style.scrollBehavior = '';
    }
  }, [])

  const handleSignOut = async () => {
    if (isSigningOut) return
    
    try {
      await signOut()
      toast({ title: "Sesión cerrada" })
      // Forzar recarga para limpiar estado y asegurar que el usuario ve la página de inicio
      window.location.replace("/") 
    } catch (e: any) {
      toast({
        title: "Error al cerrar sesión",
        description: e.message || "Inténtalo de nuevo",
        variant: "destructive"
      })
    }
  }

  const handleResendVerification = async () => {
    if (!user?.email || resending || emailVerified) return
    
    try {
      await resendVerification()
      toast({ title: "Correo reenviado" })
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "No se pudo reenviar", variant: "destructive" })
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

  const NavLinks = ({ mobile = false, onClose = () => {} }: { mobile?: boolean; onClose?: () => void }) => {
    // Mostrar spinner SOLO si hay sesión iniciada y todavía estamos cargando datos de perfil/autenticación
    if (authLoading && isLogged) {
      return (
        <div className={mobile ? "flex flex-col space-y-4" : "hidden md:flex items-center justify-center flex-1"}>
          {mobile ? (
            // Para móvil: texto elegante con icono
            <div className="text-center py-6 flex flex-col items-center space-y-2" aria-live="polite">
              <div className="w-10 h-10 premium-glass rounded-full flex items-center justify-center">
                <Wheat className="w-5 h-5 text-blue-600 animate-pulse" />
              </div>
              <span className="text-sm text-slate-600 font-medium">Preparando menú artesanal...</span>
            </div>
          ) : (
            // Para desktop: barra de carga premium con gradiente
            <div className="relative w-56 h-8 premium-glass rounded-full overflow-hidden shadow-soft" aria-live="polite">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400/50 to-transparent animate-[loading-wave_2.5s_ease-in-out_infinite] w-1/2 h-full" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex items-center space-x-2">
                  <Wheat className="w-4 h-4 text-blue-600 animate-pulse" />
                  <span className="text-xs text-slate-700 font-semibold tracking-wide">Cargando Obrador Artesanal</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )
    }

    // Si no hay sesión (visitante) o ya terminó de cargar, mostramos los enlaces directamente
    return (
      <div className={mobile ? "flex flex-col space-y-2" : "hidden md:flex items-center space-x-10"}>
        {navLinks.map((l, index) => (
          <Link
            key={l.href}
            to={l.href}
            onClick={onClose}
            className={`group relative transition-all duration-300 ${
              mobile 
                ? "premium-glass hover-float py-3 px-4 rounded-xl flex items-center justify-between" 
                : "font-medium text-slate-800 hover:text-blue-600 text-sm tracking-wide"
            }`}
            style={mobile ? {} : { animationDelay: `${index * 0.1}s`, opacity: 0, animation: 'fade-in 0.6s ease forwards' }}
          >
            <span>{l.label}</span>
            
            {mobile && <ChevronRight className="w-4 h-4 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />}
            
            {!mobile && (
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-300 group-hover:w-full rounded-full" />
            )}
          </Link>
        ))}
      </div>
    )
  }

  return (
    <>
      {/* Este div proporciona un espacio para el navbar fixed */}
      <div className={`h-20 ${isLogged && emailVerified === false ? 'md:h-32' : ''}`} />
      
      {/* Navbar con opacidad moderada ajustada */}
      <nav 
        className={`fixed top-0 w-full z-50 transition-all ${
          scrollDirection === 'down' ? 'transform -translate-y-full' : 'transform translate-y-0'
        } ${
          scrolled 
            ? 'duration-500 backdrop-blur-xl bg-white/80 dark:bg-slate-900/75 shadow-xl border-b border-white/30 dark:border-slate-700/40' 
            : 'duration-700 backdrop-blur-md bg-white/55 dark:bg-slate-900/55 shadow-md border-b border-white/20 dark:border-slate-700/30'
        }`}
      >
        {/* Overlay de gradiente sutil */}
        <div className="pointer-events-none absolute inset-0 opacity-60 mix-blend-overlay">
          <div className="w-full h-full bg-gradient-to-r from-blue-200/30 via-transparent to-indigo-200/30 dark:from-blue-900/20 dark:via-transparent dark:to-indigo-900/20" />
        </div>
        <div className="container mx-auto px-4 sm:px-6 relative">
          {/* Banner de verificación mejorado */}
          {isLogged && emailVerified === false && (
            <div 
              className="flex items-center gap-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl px-4 py-3 mt-3 mb-3 text-sm font-medium shadow-xl border border-white/10"
              style={{
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)'
              }}
              aria-live="polite"
            >
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 shrink-0 animate-pulse" />
              </div>
              <span className="flex-1">Tu cuenta está casi lista. Verifica tu correo para acceder a todas las funciones.</span>
              <Button
                variant="secondary"
                size="sm"
                className="h-8 px-4 bg-white/20 hover:bg-white/30 text-white border-white/30 font-medium transition-all duration-300"
                onClick={handleResendVerification}
                disabled={resending || isSigningOut}
              >
                {resending ? "Enviando..." : resent ? "✓ Enviado" : "Reenviar"}
              </Button>
            </div>
          )}
          
          <div className="flex items-center justify-between h-20">
            {/* Logo con efecto premium */}
            <Link to="/" className="flex items-center space-x-4 group">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-xl hover-float transition-all duration-500">
                  <Wheat className="text-white w-6 h-6 animate-float-slow" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-full flex items-center justify-center animate-pulse-slow">
                  <Crown className="w-2.5 h-2.5 text-white" />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-xl leading-none tracking-tight text-slate-800 mb-2">Obrador</span>
                <span className="shimmer-title text-sm font-semibold leading-none tracking-widest">D'LUI</span>
              </div>
            </Link>

            {/* Desktop navigation */}
            <div className="hidden md:flex items-center justify-center flex-1">
              <NavLinks />
            </div>

            {/* Right side */}
            <div className="hidden md:flex items-center space-x-6">

              {/* Estado de autenticación con control de timeout y reintento */}
              {isLogged && authLoading ? (
                <div className="premium-glass relative w-40 h-10 rounded-full overflow-hidden shadow-xl" aria-live="polite">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400/50 to-transparent animate-[loading-wave_2.5s_ease-in-out_infinite] w-1/2 h-full" style={{ animationDelay: '0.7s' }} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex items-center space-x-2">
                      <UserIcon className="w-4 h-4 text-blue-600 animate-pulse" />
                      <span className="text-xs text-slate-700 font-medium">Verificando sesión...</span>
                    </div>
                  </div>
                </div>
              ) : authWarning ? (
                <div className="flex items-center gap-2 premium-glass px-3 py-2 rounded-full shadow-xl text-xs text-slate-700" role="alert" aria-live="assertive">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  <span className="max-w-[12rem] truncate">{authWarning}</span>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-blue-600 hover:text-blue-700" onClick={retryAuth}>
                    Reintentar
                  </Button>
                </div>
              ) : isLogged ? (
                <div 
                  className="flex items-center space-x-3"
                  style={{ opacity: 0, animation: 'fade-in 0.6s ease forwards', animationDelay: '0.4s' }}
                >
                  <div className="flex items-center space-x-3 px-4 py-2 rounded-full premium-glass shadow-xl">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
                        <UserIcon className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-sm font-medium text-slate-800 max-w-32 truncate">
                        {displayName}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleSignOut}
                      className="h-8 w-8 hover:bg-red-500/10 hover:text-red-500 transition-all duration-300"
                      title="Cerrar sesión"
                      disabled={isSigningOut}
                      aria-busy={isSigningOut}
                    >
                      <LogOut className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <Button 
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium px-6 py-2 h-10 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105" 
                  asChild
                >
                  <Link to="/login">
                    <UserIcon className="w-4 h-4 mr-2" />
                    Acceder al Obrador
                  </Link>
                </Button>
              )}
            </div>

            {/* Mobile menu */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
                >
                  <Menu className="w-5 h-5" />
                  <span className="sr-only">Abrir menú</span>
                </Button>
              </SheetTrigger>
              <SheetContent 
                side="right" 
                className="w-80 border-l-0 bg-gradient-to-br from-slate-50 to-white"
                style={{
                  backdropFilter: 'blur(24px)',
                  WebkitBackdropFilter: 'blur(24px)'
                }}
              >
                <div className="flex flex-col h-full">
                  {/* Logo en mobile mejorado */}
                  <div className="flex items-center space-x-4 mb-8">
                    <div className="relative">
                      <div className="w-12 h-12 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-xl">
                        <Wheat className="text-white w-6 h-6" />
                      </div>
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-full flex items-center justify-center">
                        <Crown className="w-2.5 h-2.5 text-white" />
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-xl leading-none tracking-tight text-slate-800">Obrador</span>
                      <span className="shimmer-title text-sm font-semibold leading-none tracking-widest">A R T E S A N A L</span>
                    </div>
                  </div>

                  {/* Banner de verificación móvil */}
                  {isLogged && emailVerified === false && (
                    <div className="mb-6 p-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-medium shadow-xl">
                      <div className="flex items-center gap-3 mb-3">
                        <AlertCircle className="w-5 h-5 animate-pulse" />
                        <span className="font-semibold">Verificación pendiente</span>
                      </div>
                      <p className="text-white/90 mb-3 text-sm">Revisa tu correo para activar todas las funciones de tu cuenta.</p>
                      <Button 
                        size="sm" 
                        variant="secondary"
                        onClick={handleResendVerification} 
                        disabled={resending || isSigningOut} 
                        className="w-full bg-white/20 hover:bg-white/30 text-white border-white/30 font-medium"
                      >
                        {resending ? "Enviando..." : resent ? "✓ Enviado" : "Reenviar verificación"}
                      </Button>
                    </div>
                  )}

                  {/* Navigation links móvil */}
                  <div className="space-y-2 mb-8">
                    <NavLinks mobile onClose={() => setIsOpen(false)} />
                  </div>

                  {/* User section móvil mejorada */}
                  <div className="mt-auto space-y-4">
                    {authLoading ? (
                      <div className="text-center py-8 flex flex-col items-center space-y-3" aria-live="polite">
                        <div className="w-12 h-12 premium-glass rounded-full flex items-center justify-center">
                          <UserIcon className="w-6 h-6 text-blue-600 animate-pulse" />
                        </div>
                        <span className="text-sm text-slate-600 font-medium">Verificando identidad...</span>
                      </div>
                    ) : isLogged ? (
                      <div className="space-y-4">
                        <div className="flex items-center space-x-3 premium-glass p-4 rounded-xl shadow-xl">
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
                            <UserIcon className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-slate-800 leading-none">{displayName}</p>
                            <p className="text-xs text-slate-600 mt-1">
                              {profileRole === "admin" ? "Maestro Panadero" : "Cliente Artesanal"}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          className="w-full h-12 text-red-500 border-red-200 hover:bg-red-50 font-medium transition-all duration-300"
                          onClick={() => { handleSignOut(); setIsOpen(false) }}
                          disabled={isSigningOut}
                        >
                          <LogOut className="w-4 h-4 mr-2" />
                          {isSigningOut ? "Cerrando sesión..." : "Cerrar sesión"}
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Button
                          className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium shadow-xl hover:shadow-2xl transition-all duration-300"
                          asChild
                          onClick={() => setIsOpen(false)}
                        >
                          <Link to="/login">
                            <UserIcon className="w-4 h-4 mr-2" />
                            Acceder al Obrador
                          </Link>
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>
    </>
  )
}

export default Navbar