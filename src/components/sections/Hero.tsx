import { HeroButton } from "@/components/ui/hero-button"
import { Clock, MapPin } from "lucide-react"
import heroImage from "@/assets/hero-obrador.jpg"

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img 
          src={heroImage} 
          alt="Obrador Encinas - Panadería artesanal" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-transparent" />
      </div>
      
      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 text-center max-w-4xl">
        <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
          Pan y bollería artesanos,
          <span className="text-primary-glow block mt-2">cada mañana</span>
        </h1>
        
        <p className="text-xl md:text-2xl text-gray-200 mb-8 max-w-2xl mx-auto leading-relaxed">
          En el Obrador Encinas horneamos con pasión desde el amanecer. 
          Fermentaciones lentas, ingredientes naturales, sabor auténtico.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
          <HeroButton variant="hero" className="group">
            Reserva tu pedido
            <Clock className="ml-2 group-hover:rotate-12 transition-transform" />
          </HeroButton>
          
          <HeroButton variant="secondary">
            Ver catálogo
          </HeroButton>
        </div>
        
        {/* Opening Hours */}
        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center text-gray-300">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary-glow" />
            <span className="text-sm font-medium">Lun-Sáb: 7:00 - 14:00</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary-glow" />
            <span className="text-sm font-medium">Calle del Pan, 15 - Madrid</span>
          </div>
        </div>
      </div>
      
      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center">
          <div className="w-1 h-3 bg-white/70 rounded-full mt-2"></div>
        </div>
      </div>
    </section>
  )
}

export default Hero