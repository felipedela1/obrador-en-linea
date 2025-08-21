import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Quote, ChefHat, Award, Users, Star, Sparkles, Utensils } from "lucide-react"
import { useEffect, useState, useRef } from "react"

// Importar vanilla-tilt para efectos 3D
import { default as VanillaTilt } from 'vanilla-tilt'

// Extender la interfaz HTMLElement para TypeScript
interface TiltElement extends HTMLElement {
  vanillaTilt?: {
    destroy: () => void;
  }
}

const Chef = () => {
  const [isVisible, setIsVisible] = useState(false)
  const tiltRefs = useRef<(TiltElement | null)[]>([])
  
  // Animación de contador para números
  const [counters, setCounters] = useState({
    years: 0,
    recipes: 0
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
        years: Math.floor(progress * 25),
        recipes: Math.floor(progress * 50)
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
      // Limpiar efecto tilt
      tiltRefs.current.forEach(element => {
        if (element && element.vanillaTilt) {
          element.vanillaTilt.destroy()
        }
      })
    }
  }, [])

  const achievements = [
    { icon: <Award className="w-5 h-5 text-blue-600" />, title: "Mejor Pan de Madrid", subtitle: "Reconocimiento 2019" },
    { icon: <Users className="w-5 h-5 text-blue-600" />, title: "Mentor de 15+", subtitle: "Nuevos panaderos" },
    { icon: <Sparkles className="w-5 h-5 text-blue-600" />, title: "Formación en París", subtitle: "École de Boulangerie" }
  ]

  return (
    <section className="relative py-32 overflow-hidden">
      {/* Elementos flotantes y esferas de luz */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Elementos flotantes */}
        <div className="absolute top-1/4 right-1/5 animate-float-slow">
          <Utensils className="w-12 h-12 text-white opacity-5" />
        </div>
        <div className="absolute bottom-1/3 left-1/4 animate-float-medium">
          <ChefHat className="w-10 h-10 text-white opacity-5" />
        </div>
        
        {/* Esferas de luz dinámicas */}
        <div className="absolute top-20 right-10 w-60 h-60 bg-blue-500/10 rounded-full opacity-40 blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-20 left-10 w-80 h-80 bg-indigo-500/10 rounded-full opacity-30 blur-3xl animate-pulse-medium" />
        <div className="absolute top-1/2 -translate-y-1/2 right-1/4 w-[30rem] h-[30rem] bg-sky-500/5 rounded-full blur-3xl animate-pulse-fast" />
      </div>
      
      <div className="relative container mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Sección de imagen con efecto tilt */}
          <div 
            className="opacity-0"
            style={{animation: isVisible ? 'fade-in 0.8s ease forwards' : 'none'}}
          >
            <div className="relative">
              <Card 
                className="relative rounded-2xl overflow-hidden premium-glass border-0 hover-float"
                ref={el => tiltRefs.current[0] = el}
              >
                <div className="aspect-[4/5] relative">
                  <img 
                    src="/chef-luis.jpg" 
                    alt="Luis Encinas - Maestro panadero" 
                    className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-slate-900/30 to-transparent"></div>
                  <div className="absolute bottom-0 left-0 right-0 p-8">
                    <div className="text-white">
                      <div className="flex items-center gap-1 mb-2">
                        {[...Array(3)].map((_, i) => (
                          <Star key={i} className="w-4 h-4 text-blue-300 fill-current" />
                        ))}
                      </div>
                      <h3 className="text-3xl font-bold mb-1 text-white shimmer-title">Luis Encinas</h3>
                      <p className="text-slate-200 text-sm font-medium">Maestro Panadero & Chef Artesanal</p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
            
            {/* Tarjeta flotante con contadores animados */}
            <Card 
              className="absolute -bottom-8 -right-8 premium-glass border-0 hover-float transition-all duration-300"
              ref={el => tiltRefs.current[1] = el}
            >
              <CardContent className="p-6">
                <div className="grid grid-cols-2 gap-6 text-center">
                  <div>
                    <div className="text-3xl font-bold text-slate-800 mb-1">
                      {counters.years}<span className="text-blue-600">+</span>
                    </div>
                    <div className="text-xs text-slate-600 font-medium uppercase tracking-wider">Años</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-slate-800 mb-1">
                      {counters.recipes}<span className="text-blue-600">+</span>
                    </div>
                    <div className="text-xs text-slate-600 font-medium uppercase tracking-wider">Recetas</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sección de contenido */}
          <div className="space-y-8">
            {/* Header */}
            <div 
              className="opacity-0" 
              style={{animation: isVisible ? 'fade-in 0.6s ease forwards 0.2s' : 'none'}}
            >
              <div className="inline-flex items-center gap-2 px-6 py-2 premium-glass gradient-border rounded-full text-sm font-medium text-slate-800 mb-6">
                <ChefHat className="w-4 h-4 text-blue-600" />
                <span className="tracking-wider">EL MAESTRO</span>
              </div>
              <h2 className="text-5xl md:text-6xl font-bold mb-4">
            <span className="shimmer-title">Luis Encinas</span>
              </h2>
              <p className="text-xl text-black font-light mb-6">
                Pasión por la fermentación lenta y el sabor auténtico.
              </p>
              <div className="h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent max-w-48"></div>
            </div>

            {/* Cita con efecto premium */}
            <Card 
              className="premium-glass border-0 relative overflow-hidden opacity-0 hover-float"
              style={{animation: isVisible ? 'fade-in 0.6s ease forwards 0.4s' : 'none'}}
              ref={el => tiltRefs.current[2] = el}
            >
              <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-200 rounded-full opacity-20 blur-3xl animate-float-slow"></div>
              </div>
              
              <CardContent className="p-8 relative z-10">
                <div className="relative">
                  <Quote className="w-10 h-10 text-blue-400 mb-4" />
                  <blockquote className="text-lg text-slate-700 italic leading-relaxed mb-6 font-light">
                    "El pan no es solo alimento; es cultura, tradición y conexión. Cada hogaza cuenta una historia de tiempo, paciencia y respeto por los ingredientes."
                  </blockquote>
                  <cite className="text-sm font-semibold text-slate-800 not-italic">
                    — Luis Encinas, Maestro Panadero
                  </cite>
                </div>
              </CardContent>
            </Card>

            {/* Biografía */}
            <div 
              className="space-y-4 text-slate-800 leading-relaxed opacity-0"
              style={{animation: isVisible ? 'fade-in 0.6s ease forwards 0.6s' : 'none'}}
            >
              <p>
                Luis comenzó su viaje a los 16 años, aprendiendo el oficio junto a su padre. Tras formarse en las mejores <span className="font-semibold text-blue-600">boulangeries</span> de <span className="font-semibold text-blue-600">Francia</span> y perfeccionar las técnicas de masa madre, regresó para redefinir el pan artesanal en Madrid.
              </p>
              <p>
                Su filosofía se basa en el respeto absoluto por los tiempos naturales, el uso de harinas ecológicas y la innovación constante dentro de la tradición.
              </p>
            </div>

            {/* Grid de logros */}
            <div 
              className="grid grid-cols-1 sm:grid-cols-3 gap-4 opacity-0"
              style={{animation: isVisible ? 'fade-in 0.6s ease forwards 0.8s' : 'none'}}
            >
              {achievements.map((achievement, index) => (
                <div 
                  key={achievement.title}
                  className="premium-glass hover-float p-4 rounded-xl cursor-default"
                  ref={el => tiltRefs.current[3 + index] = el}
                >
                  <div className="flex items-start gap-4">
                    <div className="parallax-highlight w-10 h-10 bg-white/80 rounded-full flex items-center justify-center shrink-0 transform group-hover:scale-110 transition-transform duration-300">
                      {achievement.icon}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800 text-sm">{achievement.title}</div>
                      <div className="text-xs text-slate-600">{achievement.subtitle}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Chef