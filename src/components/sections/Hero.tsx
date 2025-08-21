import { Button } from "@/components/ui/button"
import { HeroButton } from "@/components/ui/hero-button"
import { Clock, MapPin, ChevronDown, Sparkles, Wheat } from "lucide-react"
import { useEffect, useState, useRef } from "react"

const Hero = () => {
  const [isLoaded, setIsLoaded] = useState(false)
  const parallaxRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    // Activar las animaciones después de que el componente se monte
    const timer = setTimeout(() => setIsLoaded(true), 100)
    
    // Efecto parallax sutil en scroll
    const handleScroll = () => {
      if (parallaxRef.current) {
        const scrollY = window.scrollY
        const yValue = scrollY * 0.5 // Ajusta la intensidad del parallax
        parallaxRef.current.style.transform = `translateY(${yValue}px)`
      }
    }
    
    window.addEventListener('scroll', handleScroll, { passive: true })
    
    return () => {
      clearTimeout(timer)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])
  
  // Función para scroll suave a la siguiente sección
  const scrollToNextSection = () => {
    const nextSection = document.querySelector('section:nth-of-type(2)')
    if (nextSection) {
      nextSection.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Partículas flotantes y elementos decorativos */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-1/4 left-[10%] animate-float-slow opacity-70">
          <Wheat className="w-16 h-16 text-white/10" />
        </div>
        <div className="absolute top-1/3 right-[15%] animate-float-medium opacity-70">
          <Wheat className="w-12 h-12 text-white/10" />
        </div>
        <div className="absolute bottom-1/3 left-[20%] animate-float-fast opacity-70">
          <Wheat className="w-10 h-10 text-white/10" />
        </div>
      </div>
      
      {/* Background con efecto parallax */}
      <div 
        ref={parallaxRef}
        className="absolute inset-0 z-0"
      >
        <img 
          src="/hero-obrador.jpg" 
          alt="Obrador Encinas - Panadería artesanal" 
          className="w-full h-full object-cover scale-110 opacity-50 saturate-75"
        />
        {/* Capa para deslavar la imagen y hacerla más translúcida */}
        <div className="absolute inset-0 bg-white/25 backdrop-blur-[2px] mix-blend-overlay pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-800/80 to-slate-900/70" />
        
        {/* Capas de luz dinámica */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-blue-500/10 to-transparent opacity-60"></div>
          <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-blue-900/30 to-transparent"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[60rem] h-[30rem] rounded-full blur-3xl bg-blue-600/5 animate-pulse-slow"></div>
        </div>
      </div>
      
      {/* Content with staggered animations */}
      <div className="relative z-10 container mx-auto px-4 py-20 md:py-0">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-center">
          <div className="lg:col-span-3 space-y-8 text-center lg:text-left">
            {/* Badge premium */}
            <div 
              className="inline-block premium-glass gradient-border px-6 py-3 rounded-full mb-2"
              style={{
                opacity: 0,
                transform: 'translateY(20px)',
                animation: isLoaded ? 'fade-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards' : 'none',
              }}
            >
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Sparkles className="w-4 h-4 text-blue-400" />
                <span className="tracking-wider">PANADERÍA ARTESANAL</span>
              </div>
            </div>
            
            {/* Heading with shimmer effect */}
            <div>
              <h1 
                className="text-5xl md:text-7xl font-bold mb-4 leading-tight"
                style={{
                  opacity: 0,
                  transform: 'translateY(20px)',
                  animation: isLoaded ? 'fade-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards 0.2s' : 'none',
                }}
              >
                <span className="shimmer-title text-blue-50/90">Pan y bollería artesanos,</span>
                <div className="mt-2">
                  <span className="shimmer-title text-blue-50/90">cada mañana</span>
                </div>
              </h1>
              
              <p 
                className="text-xl md:text-2xl text-blue-50/90 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-light"
                style={{
                  opacity: 0,
                  transform: 'translateY(20px)',
                  animation: isLoaded ? 'fade-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards 0.4s' : 'none',
                }}
              >
                En el Obrador Encinas horneamos con pasión desde el amanecer. 
                Fermentaciones lentas, ingredientes naturales, sabor auténtico.
              </p>
            </div>
            
            {/* CTA Buttons */}
            <div 
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
              style={{
                opacity: 0,
                transform: 'translateY(20px)',
                animation: isLoaded ? 'fade-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards 0.6s' : 'none',
              }}
            >
              {/* Botón de Reservar con enlace correcto */}
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-full px-8 py-7 text-lg shadow-glow-blue hover-float"
                asChild
              >
                <a href="/reservas">
                  Reserva tu pedido
                  <Clock className="ml-2 group-hover:rotate-12 transition-transform" />
                </a>
              </Button>
              
              {/* Botón de Ver catálogo con contraste mejorado y enlace correcto */}
              <Button
                variant="outline"
                size="lg"
                className="border-2 border-blue-400/50 text-white bg-slate-900/50 hover:bg-blue-900/50 rounded-full px-8 py-7 text-lg hover-float"
                asChild
              >
                <a href="/productos">
                  Ver catálogo
                </a>
              </Button>
            </div>
          </div>
          
          {/* Info card - only visible on desktop */}
          <div 
            className="lg:col-span-2 hidden lg:block"
            style={{
              opacity: 0,
              transform: 'translateY(20px)',
              animation: isLoaded ? 'fade-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards 0.8s' : 'none',
            }}
          >
            <div className="premium-glass-dark border border-white/10 rounded-2xl p-8 shadow-xl hover-float-slow">
              <div className="flex items-center justify-between mb-8">
                <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-xl">
                  <Wheat className="text-white w-8 h-8" />
                </div>
                <div className="parallax-highlight">
                  <div className="text-sm font-semibold text-blue-300">Desde</div>
                  <div className="text-4xl font-bold shimmer-title text-white">1987</div>
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="text-lg font-bold text-white">Visítanos</div>
                  {/* Tarjeta con contraste mejorado */}
                  <div className="bg-slate-800/80 backdrop-blur-lg rounded-xl p-4 flex items-start gap-4 border border-white/10">
                    <div className="w-10 h-10 rounded-full bg-blue-900/60 flex items-center justify-center shrink-0">
                      <Clock className="w-5 h-5 text-blue-300" />
                    </div>
                    <div>
                      <div className="text-white font-medium mb-1">Horario</div>
                      <div className="text-sm text-blue-200">Lunes - Sábado</div>
                      <div className="text-sm text-blue-100 font-semibold">7:00 - 14:00</div>
                    </div>
                  </div>
                  {/* Tarjeta con contraste mejorado */}
                  <div className="bg-slate-800/80 backdrop-blur-lg rounded-xl p-4 flex items-start gap-4 border border-white/10">
                    <div className="w-10 h-10 rounded-full bg-blue-900/60 flex items-center justify-center shrink-0">
                      <MapPin className="w-5 h-5 text-blue-300" />
                    </div>
                    <div>
                      <div className="text-white font-medium mb-1">Ubicación</div>
                      <div className="text-sm text-blue-200">Calle del Pan, 15</div>
                      <div className="text-sm text-blue-100 font-semibold">Madrid, España</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Mobile info section */}
        <div 
          className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-4 lg:hidden"
          style={{
            opacity: 0,
            transform: 'translateY(20px)',
            animation: isLoaded ? 'fade-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards 0.8s' : 'none',
          }}
        >
          {/* Tarjeta móvil con contraste mejorado */}
          <div className="bg-slate-800/80 backdrop-blur-lg rounded-xl p-4 flex items-center gap-4 border border-white/10">
            <div className="w-12 h-12 rounded-full bg-blue-900/60 flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6 text-blue-300" />
            </div>
            <div>
              <div className="text-blue-200 text-sm">Horario de apertura</div>
              <div className="text-white font-semibold">Lun-Sáb: 7:00 - 14:00</div>
            </div>
          </div>
          
          {/* Tarjeta móvil con contraste mejorado */}
          <div className="bg-slate-800/80 backdrop-blur-lg rounded-xl p-4 flex items-center gap-4 border border-white/10">
            <div className="w-12 h-12 rounded-full bg-blue-900/60 flex items-center justify-center shrink-0">
              <MapPin className="w-6 h-6 text-blue-300" />
            </div>
            <div>
              <div className="text-blue-200 text-sm">Nuestra ubicación</div>
              <div className="text-white font-semibold">Calle del Pan, 15 - Madrid</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Scroll indicator mejorado */}
      <div 
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 cursor-pointer z-20"
        onClick={scrollToNextSection}
        style={{
          opacity: 0,
          animation: isLoaded ? 'fade-in 0.8s ease forwards 1.2s' : 'none',
        }}
      >
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs font-medium text-blue-200 tracking-wider">DESCUBRIR</span>
          <div className="w-10 h-10 premium-glass rounded-full flex items-center justify-center animate-bounce-soft">
            <ChevronDown className="w-5 h-5 text-blue-300" />
          </div>
        </div>
      </div>
    </section>
  )
}

export default Hero