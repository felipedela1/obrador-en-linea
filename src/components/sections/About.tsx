import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Wheat, Heart, Clock, Award, Star, Shield, Trophy, ChefHat, Sparkles } from "lucide-react"
import { useEffect, useState, useRef } from "react"

// Nuevo: Agregar esto a tu package.json si no lo tienes: npm install vanilla-tilt
import { default as VanillaTilt } from 'vanilla-tilt'

// Extender la interfaz HTMLElement para TypeScript
interface TiltElement extends HTMLElement {
  vanillaTilt?: {
    destroy: () => void;
  }
}

const About = () => {
  const [isVisible, setIsVisible] = useState(false)
  const tiltRefs = useRef<(TiltElement | null)[]>([])
  
  // Animación de contador para números
  const [counters, setCounters] = useState({
    year: 0,
    creations: 0,
    clients: 0,
    generations: 0
  })
  
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100)
    
    // Inicializar efecto tilt
    tiltRefs.current.forEach(element => {
      if (element) {
        VanillaTilt.init(element, {
          max: 5,
          speed: 400,
          glare: true,
          "max-glare": 0.1,
          gyroscope: false
        })
      }
    })
    
    // Animación de contadores
    let startTime: number | null = null
    const duration = 2000; // 2 segundos para la animación
    
    const animateCounters = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      
      setCounters({
        year: Math.floor(progress * 1987),
        creations: Math.floor(progress * 35),
        clients: Math.floor(progress * 1200),
        generations: Math.floor(progress * 3)
      })
      
      if (progress < 1) {
        requestAnimationFrame(animateCounters)
      }
    }
    
    const counterTimer = setTimeout(() => {
      requestAnimationFrame(animateCounters)
    }, 500)
    
    return () => {
      clearTimeout(timer)
      clearTimeout(counterTimer)
      // Limpiar efecto tilt con tipo correcto
      tiltRefs.current.forEach(element => {
        if (element && element.vanillaTilt) {
          element.vanillaTilt.destroy()
        }
      })
    }
  }, [])

  const values = [
    {
      icon: <Wheat className="w-8 h-8 text-blue-600" />,
      title: "Terroir & Origen",
      description: "Harinas de molinos centenarios seleccionadas por su carácter único y pureza ancestral."
    },
    {
      icon: <Clock className="w-8 h-8 text-blue-600" />,
      title: "Tiempo Contemplativo", 
      description: "Fermentaciones de hasta 72 horas, donde cada momento es un acto de paciencia artesanal."
    },
    {
      icon: <Award className="w-8 h-8 text-blue-600" />,
      title: "Herencia Viva",
      description: "Savoir-faire transmitido a través de tres generaciones de maestros panaderos."
    },
    {
      icon: <Heart className="w-8 h-8 text-blue-600" />,
      title: "Perfección Silenciosa",
      description: "La maestría reside en los detalles imperceptibles que definen la excelencia."
    }
  ]

  const achievements = [
    { 
      number: counters.year, 
      symbol: "",
      label: "Fundación del atelier", 
      icon: <Shield className="w-5 h-5 text-blue-600" />
    },
    { 
      number: counters.creations, 
      symbol: "+",
      label: "Creaciones signature", 
      icon: <Star className="w-5 h-5 text-blue-600" />
    },
    { 
      number: counters.clients, 
      symbol: "+",
      label: "Connoisseurs asiduos", 
      icon: <Heart className="w-5 h-5 text-blue-600" />
    },
    { 
      number: Math.min(3, counters.generations), 
      symbol: "",
      label: "Generaciones de maestría", 
      icon: <Trophy className="w-5 h-5 text-blue-600" />
    }
  ]

  return (
    <section className="relative py-32 overflow-hidden">
      {/* Floating elements - Animated bread icons */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Floating elements scattered around */}
        <div className="absolute top-20 left-1/4 animate-float-slow">
          <Wheat className="w-12 h-12 text-white opacity-5" />
        </div>
        <div className="absolute top-1/3 right-1/4 animate-float-medium">
          <Wheat className="w-10 h-10 text-white opacity-5" />
        </div>
        <div className="absolute bottom-1/4 left-1/3 animate-float-fast">
          <Wheat className="w-8 h-8 text-white opacity-5" />
        </div>
        
        {/* Dynamic light spheres */}
        <div className="absolute top-20 left-10 w-60 h-60 bg-blue-500/10 rounded-full opacity-40 blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-indigo-500/10 rounded-full opacity-30 blur-3xl animate-pulse-medium" />
        <div className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 w-[40rem] h-[40rem] bg-sky-500/5 rounded-full blur-3xl animate-pulse-fast" />
      </div>
      
      <div className="relative container mx-auto px-6">
        {/* Header con diseño premium */}
        <div 
          className="text-center mb-24"
          style={{opacity: 0, animation: isVisible ? 'fade-in 0.8s ease forwards' : 'none'}}
        >
          <div className="inline-flex items-center gap-2 px-6 py-2 premium-glass gradient-border rounded-full text-sm font-medium text-slate-800 mb-8">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span className="tracking-wider">ARTESANÍA CONTEMPORÁNEA</span>
          </div>
          
          <h2 className="text-5xl md:text-6xl lg:text-8xl font-bold mb-6 leading-tight">
            <span className="shimmer-title">Sobre Nosotros</span>
          </h2>
          
          <div className="h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent max-w-48 mx-auto mb-8" />
          
          <p className="text-xl md:text-2xl text-black max-w-4xl mx-auto leading-relaxed font-light">
            En el corazón de Madrid, desde 1987, cultivamos el arte de la panadería de autor 
            con la precisión y elegancia que caracterizan a la alta gastronomía.
          </p>
        </div>

        {/* Grid de valores con efecto tilt y animaciones */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8 mb-24">
          {values.map((value, index) => (
            <div 
              key={index} 
              className="opacity-0"
              style={{
                animation: isVisible ? `fade-in 0.6s ease forwards ${index * 0.2}s` : 'none'
              }}
            >
              <Card 
                className="premium-glass hover-float h-full border-0"
                ref={el => tiltRefs.current[index] = el}
              >
                <CardContent className="p-8 text-center">
                  <div className="parallax-highlight inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/80 mb-6 group-hover:scale-110 transition-transform duration-300">
                    {value.icon}
                  </div>
                  
                  <h3 className="text-2xl font-bold text-slate-800 mb-4 leading-tight">
                    {value.title}
                  </h3>
                  
                  <p className="text-slate-700 leading-relaxed">
                    {value.description}
                  </p>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>

        {/* Sección de historia con diseño premium */}
        <div className="mb-24 opacity-0" style={{animation: isVisible ? 'fade-in 0.8s ease forwards 0.8s' : 'none'}}>
          <Card className="premium-glass border-0 overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
              <div className="absolute -top-10 -left-10 w-40 h-40 bg-blue-200 rounded-full opacity-20 blur-3xl animate-float-slow"></div>
              <div className="absolute -bottom-20 -right-10 w-60 h-60 bg-indigo-300 rounded-full opacity-10 blur-3xl animate-float-medium"></div>
            </div>
            
            <div className="relative z-10 p-12">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div className="space-y-8">
                  <div>
                    <h3 className="text-3xl md:text-4xl font-bold text-slate-800 mb-6 leading-tight">
                      Nuestro Santuario Artesanal
                    </h3>
                    
                    <div className="space-y-6 text-slate-700 leading-relaxed">
                      <p className="text-lg">
                        En nuestro obrador, cada amanecer es una ceremonia. Las primeras luces del día 
                        iluminan manos expertas que moldean masas que han descansado durante la noche, 
                        desarrollando complejidades aromáticas que solo el tiempo puede otorgar.
                      </p>
                      
                      <p>
                        Somos custodios de sabores auténticos, donde la innovación nunca compromete 
                        la tradición. Nuestras <span className="font-semibold text-blue-800">fermentaciones contemplativas</span> de 
                        hasta 72 horas crean texturas y sabores que trascienden lo ordinario.
                      </p>
                      
                      <p>
                        Cada pan que sale de nuestros hornos de piedra lleva consigo décadas de 
                        perfeccionamiento, el <span className="font-semibold text-blue-800">terroir</span> de nuestros ingredientes 
                        selectos y la pasión de quienes comprenden que la panadería es un arte 
                        que se vive, no solo se practica.
                      </p>
                    </div>
                  </div>
                  
                  <div className="premium-glass-dark p-6 rounded-2xl text-white">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-white/10 rounded-full flex justify-center shrink-0">
                        <ChefHat className="w-6 h-6 text-black" />
                      </div>
                      <div>
                        <p className="font-medium mb-1 text-black">Maestro Panadero</p>
                        <p className="text-sm text-slate-300 italic text-black">
                          "Cada pan cuenta una historia de tiempo, paciencia y respeto por los ingredientes."
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Grid de logros con contadores animados */}
                <div className="grid grid-cols-2 gap-6">
                  {achievements.map((achievement, index) => (
                    <Card 
                      key={index} 
                      className="group border-0 premium-glass hover-float p-6"
                    >
                      <div className="relative mb-4">
                        <div className="absolute -top-2 -right-2 w-8 h-8 bg-blue-500/10 rounded-full flex items-center justify-center">
                          {achievement.icon}
                        </div>
                        <div className="flex items-baseline">
                          <div className="text-4xl md:text-5xl font-bold text-slate-900 mb-2">
                            {/* Renderizar numerales romanos para generaciones */}
                            {index === 3 ? 
                              ['I', 'II', 'III'][achievement.number - 1] || '0' : 
                              achievement.number
                            }
                          </div>
                          <div className="text-xl font-bold text-blue-600 ml-1">
                            {achievement.symbol}
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-slate-700 font-medium leading-tight">
                        {achievement.label}
                      </p>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  )
}

export default About