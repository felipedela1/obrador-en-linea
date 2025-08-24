import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu, User as UserIcon, Clock, LogOut, AlertCircle, Wheat, Crown, ChevronRight, Bug } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/components/ui/use-toast"
import { useLocation } from "react-router-dom"

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false)
  const { toast } = useToast()
  const location = useLocation()
  const isRecoveryRoute = location.pathname === "/update-password"
  
  // Usar el contexto de autenticación en lugar de estado local
  const {
    session,
    user,
    profileRole,
    profileName,
    emailVerified,
    authLoading,
    authWarning,
    isLogged: contextIsLogged,
    displayName,
    retryAuth,
    signOut,
    resendVerification,
    resending,
    resent,
    isSigningOut
  } = useAuth()

  const isLogged = contextIsLogged && !isRecoveryRoute

  // Estado para detectar scroll y la posición
  const [scrolled, setScrolled] = useState(false)
  const lastScrollY = useRef(0)
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | null>(null)
  
  // Nuevo estado para detectar si necesitamos fondo oscuro
  const [needsDarkBg, setNeedsDarkBg] = useState(false)

  // Manejador de signOut usando el contexto
  const handleSignOut = async () => {
    try {
      await signOut()
      toast({
        title: "Sesión cerrada",
        description: "Has cerrado sesión correctamente",
      })
    } catch (error) {
      console.error("[NAVBAR] Sign out error:", error)
      toast({
        title: "Error",
        description: "Error al cerrar sesión",
        variant: "destructive",
      })
    }
  }

  // Manejador de reenvío de verificación usando el contexto
  const handleResendVerification = async () => {
    try {
      await resendVerification()
      toast({
        title: "Email reenviado",
        description: "Se ha reenviado el email de verificación",
      })
    } catch (error) {
      console.error("[NAVBAR] Resend verification error:", error)
      toast({
        title: "Error",
        description: "Error al reenviar el email de verificación",
        variant: "destructive",
      })
    }
  }

  // Detectar scroll para efectos de navbar
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      const direction = currentScrollY > lastScrollY.current ? 'down' : 'up'
      
      setScrollDirection(direction)
      setScrolled(currentScrollY > 50)
      lastScrollY.current = currentScrollY
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Detectar si necesitamos fondo oscuro basado en la ruta
  useEffect(() => {
    const darkRoutes = ["/", "/productos", "/chef", "/location"]
    setNeedsDarkBg(darkRoutes.includes(location.pathname))
  }, [location.pathname])

  const navbarClasses = `
    fixed top-0 left-0 right-0 z-50 transition-all duration-300
    ${scrolled 
      ? "bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-200" 
      : needsDarkBg 
        ? "bg-transparent" 
        : "bg-white/90 backdrop-blur-sm"
    }
    ${scrollDirection === 'down' && scrolled ? "transform -translate-y-2" : "transform translate-y-0"}
  `.trim()

  const linkClasses = (isActive: boolean) => `
    px-4 py-2 rounded-lg font-medium transition-all duration-300 relative
    ${isActive 
      ? "text-blue-600 bg-blue-50" 
      : scrolled || !needsDarkBg
        ? "text-gray-700 hover:text-blue-600 hover:bg-blue-50" 
        : "text-white hover:text-blue-200 hover:bg-white/10"
    }
  `.trim()

  const buttonClasses = `
    font-medium transition-all duration-300 shadow-lg hover:shadow-xl
    ${scrolled || !needsDarkBg
      ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white" 
      : "bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 border border-white/30"
    }
  `.trim()

  return (
    <>
      <nav className={navbarClasses}>
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <a 
              href="/" 
              className={`flex items-center space-x-2 font-bold text-xl transition-colors duration-300 ${
                scrolled || !needsDarkBg ? "text-gray-900" : "text-white"
              }`}
            >
              <Wheat className="h-6 w-6" />
              <span>Obrador</span>
            </a>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-2">
              <a href="/" className={linkClasses(location.pathname === "/")}>
                Inicio
              </a>
              <a href="/productos" className={linkClasses(location.pathname === "/productos")}>
                Productos
              </a>
              <a href="/chef" className={linkClasses(location.pathname === "/chef")}>
                Chef
              </a>
              <a href="/location" className={linkClasses(location.pathname === "/location")}>
                Ubicación
              </a>
              
              {/* Debug Link - Desktop */}
              <a href="/debug" className={linkClasses(location.pathname === "/debug")}>
                <Bug className="w-4 h-4 mr-1" />
                Debug
              </a>
            </div>

            {/* Desktop Auth Section */}
            <div className="hidden md:flex items-center space-x-3">
              {authLoading ? (
                <div className={`flex items-center px-4 py-2 ${
                  scrolled || !needsDarkBg ? "text-gray-600" : "text-white/80"
                }`}>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-2"></div>
                  <span className="text-sm">Cargando...</span>
                </div>
              ) : authWarning ? (
                <div className="flex items-center space-x-2">
                  <div className="flex items-center px-3 py-2 rounded-lg bg-yellow-50 border border-yellow-200">
                    <AlertCircle className="w-4 h-4 text-yellow-600 mr-2" />
                    <span className="text-sm text-yellow-800">{authWarning}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={retryAuth}
                    className="text-yellow-600 border-yellow-300 hover:bg-yellow-50"
                  >
                    Reintentar
                  </Button>
                </div>
              ) : isLogged ? (
                <div className="flex items-center space-x-3">
                  {emailVerified === false && (
                    <div className="flex items-center space-x-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <Clock className="w-4 h-4 text-yellow-600" />
                      <span className="text-sm text-yellow-800">Email pendiente</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleResendVerification}
                        disabled={resending}
                        className="text-yellow-600 hover:bg-yellow-100 h-6 px-2"
                      >
                        {resending ? "Enviando..." : resent ? "Enviado" : "Reenviar"}
                      </Button>
                    </div>
                  )}
                  
                  <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
                    scrolled || !needsDarkBg 
                      ? "bg-gray-50 border border-gray-200" 
                      : "bg-white/10 backdrop-blur-sm border border-white/20"
                  }`}>
                    <div className="flex items-center space-x-2">
                      <UserIcon className={`w-4 h-4 ${
                        scrolled || !needsDarkBg ? "text-gray-600" : "text-white"
                      }`} />
                      {profileRole === "admin" && (
                        <Crown className={`w-4 h-4 ${
                          scrolled || !needsDarkBg ? "text-yellow-600" : "text-yellow-300"
                        }`} />
                      )}
                      <span className={`text-sm font-medium ${
                        scrolled || !needsDarkBg ? "text-gray-900" : "text-white"
                      }`}>
                        {displayName}
                      </span>
                    </div>
                  </div>

                  {/* Enlaces de usuario logueado */}
                  <a href="/reservas" className={linkClasses(location.pathname === "/reservas")}>
                    Reservas
                  </a>
                  <a href="/mis-reservas" className={linkClasses(location.pathname === "/mis-reservas")}>
                    Mis Reservas
                  </a>
                  {profileRole === "admin" && (
                    <a href="/admin" className={linkClasses(location.pathname === "/admin")}>
                      <Crown className="w-4 h-4 mr-1" />
                      Admin
                    </a>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSignOut}
                    disabled={isSigningOut}
                    className={`${
                      scrolled || !needsDarkBg
                        ? "text-red-600 border-red-200 hover:bg-red-50"
                        : "text-white border-white/30 hover:bg-white/10"
                    }`}
                  >
                    <LogOut className="w-4 h-4 mr-1" />
                    {isSigningOut ? "Saliendo..." : "Salir"}
                  </Button>
                </div>
              ) : (
                <Button className={buttonClasses} asChild>
                  <a href="/login">
                    <UserIcon className="w-4 h-4 mr-2" />
                    Acceder al Obrador
                  </a>
                </Button>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className={`${
                      scrolled || !needsDarkBg 
                        ? "text-gray-900 hover:bg-gray-100" 
                        : "text-white hover:bg-white/10"
                    }`}
                  >
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-80 bg-white">
                  <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="flex items-center space-x-2 pb-6 border-b border-gray-200">
                      <Wheat className="h-6 w-6 text-blue-600" />
                      <span className="font-bold text-xl text-gray-900">Obrador</span>
                    </div>

                    {/* Navigation Links */}
                    <div className="flex-1 py-6">
                      <div className="space-y-2">
                        <a 
                          href="/" 
                          className="flex items-center justify-between w-full px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg font-medium transition-all duration-300"
                          onClick={() => setIsOpen(false)}
                        >
                          <span>Inicio</span>
                          <ChevronRight className="w-4 h-4" />
                        </a>
                        <a 
                          href="/productos" 
                          className="flex items-center justify-between w-full px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg font-medium transition-all duration-300"
                          onClick={() => setIsOpen(false)}
                        >
                          <span>Productos</span>
                          <ChevronRight className="w-4 h-4" />
                        </a>
                        <a 
                          href="/chef" 
                          className="flex items-center justify-between w-full px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg font-medium transition-all duration-300"
                          onClick={() => setIsOpen(false)}
                        >
                          <span>Chef</span>
                          <ChevronRight className="w-4 h-4" />
                        </a>
                        <a 
                          href="/location" 
                          className="flex items-center justify-between w-full px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg font-medium transition-all duration-300"
                          onClick={() => setIsOpen(false)}
                        >
                          <span>Ubicación</span>
                          <ChevronRight className="w-4 h-4" />
                        </a>

                        {/* User sections when logged in */}
                        {isLogged && (
                          <>
                            <div className="border-t border-gray-200 my-4"></div>
                            <a 
                              href="/reservas" 
                              className="flex items-center justify-between w-full px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg font-medium transition-all duration-300"
                              onClick={() => setIsOpen(false)}
                            >
                              <span>Reservas</span>
                              <ChevronRight className="w-4 h-4" />
                            </a>
                            <a 
                              href="/mis-reservas" 
                              className="flex items-center justify-between w-full px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg font-medium transition-all duration-300"
                              onClick={() => setIsOpen(false)}
                            >
                              <span>Mis Reservas</span>
                              <ChevronRight className="w-4 h-4" />
                            </a>
                            {profileRole === "admin" && (
                              <a 
                                href="/admin" 
                                className="flex items-center justify-between w-full px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg font-medium transition-all duration-300"
                                onClick={() => setIsOpen(false)}
                              >
                                <div className="flex items-center">
                                  <Crown className="w-4 h-4 mr-2 text-yellow-600" />
                                  <span>Admin</span>
                                </div>
                                <ChevronRight className="w-4 h-4" />
                              </a>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Auth Section */}
                    <div className="border-t border-gray-200 pt-6">
                      {authLoading ? (
                        <div className="flex items-center justify-center py-4">
                          <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent mr-3"></div>
                          <span className="text-gray-600">Cargando sesión...</span>
                        </div>
                      ) : authWarning ? (
                        <div className="space-y-3">
                          <div className="flex items-center p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
                            <span className="text-sm text-yellow-800">{authWarning}</span>
                          </div>
                          <Button
                            variant="outline"
                            className="w-full text-yellow-600 border-yellow-300 hover:bg-yellow-50"
                            onClick={() => { retryAuth(); setIsOpen(false) }}
                          >
                            Reintentar conexión
                          </Button>
                        </div>
                      ) : isLogged ? (
                        <div className="space-y-4">
                          {emailVerified === false && (
                            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <Clock className="w-4 h-4 text-yellow-600 mr-2" />
                                  <span className="text-sm text-yellow-800">Email pendiente de verificación</span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={handleResendVerification}
                                  disabled={resending}
                                  className="text-yellow-600 hover:bg-yellow-100"
                                >
                                  {resending ? "..." : resent ? "✓" : "Reenviar"}
                                </Button>
                              </div>
                            </div>
                          )}
                          
                          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <UserIcon className="w-5 h-5 text-blue-600" />
                                {profileRole === "admin" && (
                                  <Crown className="w-4 h-4 text-yellow-600" />
                                )}
                                <div>
                                  <p className="font-medium text-blue-900">
                                    {displayName}
                                  </p>
                                  <p className="text-xs text-blue-600">
                                    {profileRole === "admin" ? "Administrador" : "Cliente"}
                                  </p>
                                </div>
                              </div>
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
                          
                          {/* Debug Link - Mobile */}
                          <Button
                            variant="ghost"
                            className="w-full h-10 text-yellow-600 hover:bg-yellow-50 font-medium transition-all duration-300 mt-2"
                            asChild
                            onClick={() => setIsOpen(false)}
                          >
                            <a href="/debug">
                              <Bug className="w-4 h-4 mr-2" />
                              Debug Tools
                            </a>
                          </Button>
                        </div>
                      ) : (
                        <>
                          <Button
                            className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium shadow-xl hover:shadow-2xl transition-all duration-300"
                            asChild
                            onClick={() => setIsOpen(false)}
                          >
                            <a href="/login">
                              <UserIcon className="w-4 h-4 mr-2" />
                              Acceder al Obrador
                            </a>
                          </Button>
                          
                          {/* Debug Link - Mobile (Not logged in) */}
                          <Button
                            variant="ghost"
                            className="w-full h-10 text-yellow-600 hover:bg-yellow-50 font-medium transition-all duration-300 mt-2"
                            asChild
                            onClick={() => setIsOpen(false)}
                          >
                            <a href="/debug">
                              <Bug className="w-4 h-4 mr-2" />
                              Debug Tools
                            </a>
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </nav>
    </>
  )
}

export default Navbar
