import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Leaf, Star, Clock, Sparkles, ShoppingCart, Eye, Wheat } from "lucide-react"
import { useEffect, useState, useRef } from "react"
import { supabase } from "@/integrations/supabase/client"
import type { ProductRow } from "@/types/models"
import { default as VanillaTilt } from 'vanilla-tilt'

// Extender la interfaz HTMLElement para TypeScript
interface TiltElement extends HTMLElement {
  vanillaTilt?: {
    destroy: () => void;
  }
}

// Skeleton premium con animación
const ProductSkeleton = ({ index }: { index: number }) => (
  <Card 
    className="group overflow-hidden border-0 premium-glass animate-pulse"
    style={{ animationDelay: `${index * 150}ms` }}
  >
    <div className="relative">
      <div className="w-full aspect-[4/3] bg-white/10 flex items-center justify-center">
        <Wheat className="w-16 h-16 text-blue-400/30" />
      </div>
      <div className="absolute top-4 left-4">
        <div className="w-20 h-6 premium-glass-dark rounded-full"></div>
      </div>
    </div>
    <CardContent className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="w-32 h-6 bg-white/30 rounded"></div>
        <div className="w-16 h-7 bg-white/20 rounded"></div>
      </div>
      <div className="space-y-2 mb-6">
        <div className="w-full h-4 bg-white/20 rounded"></div>
        <div className="w-3/4 h-4 bg-white/20 rounded"></div>
      </div>
      <div className="w-full h-12 bg-blue-500/20 rounded-xl"></div>
    </CardContent>
  </Card>
)

const FeaturedProducts = () => {
  const [products, setProducts] = useState<ProductRow[]>([])
  const [loading, setLoading] = useState(true)
  const [isVisible, setIsVisible] = useState(false)
  const tiltRefs = useRef<(TiltElement | null)[]>([])

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100)
    
    const fetchProducts = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("activo", true)
        .eq("destacado", true)
        .order("nombre", { ascending: true })
        .limit(3)
      
      if (!error && data) setProducts(data)
      setLoading(false)

      // Inicializamos tilt después de cargar los productos
      setTimeout(() => {
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
      }, 100)
    }

    fetchProducts()
    
    return () => {
      clearTimeout(timer)
      // Limpiar efecto tilt
      tiltRefs.current.forEach(element => {
        if (element && element.vanillaTilt) {
          element.vanillaTilt.destroy()
        }
      })
    }
  }, [])

  return (
    <section className="relative py-32 overflow-hidden">
      {/* Elementos flotantes y decorativos */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Elementos flotantes */}
        <div className="absolute top-1/5 right-1/4 animate-float-slow">
          <Wheat className="w-12 h-12 text-white opacity-5" />
        </div>
        <div className="absolute bottom-1/5 left-1/3 animate-float-medium">
          <Leaf className="w-10 h-10 text-white opacity-5" />
        </div>
        
        {/* Esferas de luz dinámicas */}
        <div className="absolute top-20 right-10 w-60 h-60 bg-blue-500/10 rounded-full opacity-40 blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-20 left-10 w-80 h-80 bg-indigo-500/10 rounded-full opacity-30 blur-3xl animate-pulse-medium" />
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
            <span className="tracking-wider">SELECCIÓN DEL DÍA</span>
          </div>
          
          <h2 className="text-5xl md:text-6xl lg:text-8xl font-bold mb-6 leading-tight">
            <span className="shimmer-title">Nuestras Creaciones</span>
          </h2>
          
          <div className="h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent max-w-48 mx-auto mb-8" />
          
          <p className="text-xl md:text-2xl text-black max-w-4xl mx-auto leading-relaxed font-light">
            Una muestra de nuestras piezas más emblemáticas, elaboradas diariamente 
            con devoción y los mejores ingredientes.
          </p>
        </div>

        {/* Grid de Productos con efectos visuales premium */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-24">
          {loading ? (
            // Skeleton loader con el nuevo estilo
            Array.from({ length: 3 }).map((_, index) => (
              <ProductSkeleton key={index} index={index} />
            ))
          ) : (
            // Productos con efecto tilt y animaciones
            products.map((product, index) => (
              <div 
                key={product.id}
                className="opacity-0"
                style={{
                  animation: isVisible ? `fade-in 0.6s ease forwards ${index * 0.2}s` : 'none'
                }}
              >
                <Card 
                  className="group overflow-hidden border-0 premium-glass hover-float h-full"
                  ref={el => tiltRefs.current[index] = el}
                >
                  <div className="relative overflow-hidden">
                    <div className="relative aspect-[4/3] overflow-hidden">
                      {product.imagen_url ? (
                        <img 
                          src={product.imagen_url} 
                          alt={product.nombre}
                          className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                        />
                      ) : (
                        <div className="w-full h-full bg-white/10 flex items-center justify-center parallax-highlight">
                          <Wheat className="w-16 h-16 text-blue-500/40" />
                        </div>
                      )}
                    </div>
                    <div className="absolute top-4 left-4">
                      <Badge className="premium-glass-dark border-0 text-white px-3 py-1">
                        <span className="flex items-center">
                          <Star className="w-3 h-3 text-blue-400 mr-1" /> 
                          {product.categoria}
                        </span>
                      </Badge>
                    </div>
                  </div>
                  
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-start justify-between">
                      <h3 className="text-xl font-bold text-slate-800 leading-tight">
                        {product.nombre}
                      </h3>
                      <div className="text-2xl font-bold shimmer-title">
                        {product.precio.toFixed(2)}€
                      </div>
                    </div>
                    
                    <p className="text-slate-700 text-sm leading-relaxed line-clamp-3">
                      {product.descripcion}
                    </p>
                    
                    <div className="flex items-center gap-2 text-xs text-slate-600 pt-4 border-t border-white/20">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <span>Disponible mañana desde las 8:00</span>
                    </div>
                    
                    <Button 
                      variant="secondary" 
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white transition-all duration-300"
                      asChild
                      disabled={!product.activo}
                    >
                      {product.activo ? (
                        <a href={`/reservas?producto=${product.id}`} aria-label={`Reservar ${product.nombre}`} className="flex items-center justify-center">
                          <ShoppingCart className="w-4 h-4 mr-2" />
                          Reservar ahora
                        </a>
                      ) : (
                        <span className="flex items-center justify-center opacity-80">
                          <ShoppingCart className="w-4 h-4 mr-2" />
                          Próximamente
                        </span>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            ))
          )}
        </div>

        {/* CTA Section mejorada */}
        <div 
          className="text-center opacity-0"
          style={{animation: isVisible ? 'fade-in 0.8s ease forwards 0.6s' : 'none'}}
        >
          <Card 
            className="premium-glass rounded-2xl border-0 overflow-hidden"
            ref={el => tiltRefs.current[products.length] = el}
          >
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
              <div className="absolute -top-10 -right-10 w-60 h-60 bg-blue-300 rounded-full opacity-10 blur-3xl animate-float-slow"></div>
              <div className="absolute -bottom-20 -left-10 w-80 h-80 bg-indigo-300 rounded-full opacity-10 blur-3xl animate-float-medium"></div>
            </div>
            
            <CardContent className="relative z-10 p-12">
              <h3 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
                <span className="shimmer-title">Explore el Catálogo Completo</span>
              </h3>
              <p className="text-lg text-slate-700 mb-8 max-w-2xl mx-auto">
                Descubra nuestra colección completa de creaciones artesanales, 
                cada una con su propia historia y carácter único.
              </p>
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-6 text-lg hover-float"
                asChild
              >
                <a href="/productos" aria-label="Ver todos los productos" className="flex items-center justify-center">
                  <Eye className="w-5 h-5 mr-2" />
                  Ver todos los productos
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}

export default FeaturedProducts