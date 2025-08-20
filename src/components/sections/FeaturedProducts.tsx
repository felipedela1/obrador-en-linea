import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { HeroButton } from "@/components/ui/hero-button"
import { Leaf, Star, Clock } from "lucide-react"
import { useEffect, useState } from "react"
import { supabase } from "@/integrations/supabase/client"
import type { ProductRow } from "@/types/models"

// Perf log helper (solo en dev)
const logPerf = (label: string, info: Record<string, any>) => {
  if (!import.meta.env.DEV) return
  const ts = new Date().toISOString()
  // eslint-disable-next-line no-console
  console.log(`[PERF][${ts}] ${label}`, info)
}

const FeaturedProducts = () => {
  const [products, setProducts] = useState<ProductRow[]>([])
  const [loading, setLoading] = useState(true)
  const [slow, setSlow] = useState(false)

  useEffect(() => {
    let cancelled = false
    const slowTimer = setTimeout(() => { if (!cancelled && loading) setSlow(true) }, 1200)

    const fetchProducts = async () => {
      setLoading(true)
      const t0 = performance.now()
      logPerf("products.featured.fetch.start", {})
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("activo", true)
        .eq("destacado", true)
        .order("nombre", { ascending: true })
        .limit(3)
      const t1 = performance.now()
      logPerf("products.featured.fetch.end", {
        duration_ms: +(t1 - t0).toFixed(1),
        hadError: !!error,
        errorMessage: error?.message,
        count: data?.length || 0
      })
      if (!error && data && !cancelled) setProducts(data)
      if (!cancelled) setLoading(false)
    }

    fetchProducts()
    return () => {
      cancelled = true
      clearTimeout(slowTimer)
    }
  }, [])

  return (
    <section className="py-20 bg-gradient-warm">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4 text-sm font-medium">
            Productos destacados
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Lo mejor de cada día
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Selección especial de nuestros productos más queridos, elaborados cada mañana 
            con ingredientes frescos y técnicas tradicionales.
          </p>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {loading ? (
            <div className="col-span-3 text-center text-muted-foreground">Cargando productos{slow && " (tardando más de lo normal)..."}</div>
          ) : products.length === 0 ? (
            <div className="col-span-3 text-center text-muted-foreground">No hay productos destacados</div>
          ) : products.map((product) => (
            <Card key={product.id} className="group overflow-hidden border-0 bg-card/60 backdrop-blur-sm hover:shadow-glow transition-all duration-500">
              <div className="relative overflow-hidden">
                {product.imagen_url ? (
                  <img 
                    src={product.imagen_url} 
                    alt={product.nombre}
                    className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-64 bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                    <div className="text-6xl opacity-20">🥖</div>
                  </div>
                )}
                <div className="absolute top-4 left-4">
                  <Badge variant="secondary" className="bg-white/90 text-foreground">
                    {product.categoria}
                  </Badge>
                </div>
                {/* Aquí podrías mostrar rating si lo tienes en la tabla */}
                {!product.activo && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <Badge variant="destructive" className="text-sm">
                      Próximamente
                    </Badge>
                  </div>
                )}
              </div>
              
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                    {product.nombre}
                  </h3>
                  <div className="text-2xl font-bold text-primary">
                    {product.precio.toFixed(2)}€
                  </div>
                </div>
                
                <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
                  {product.descripcion}
                </p>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  {product.etiquetas?.map((tag, tagIndex) => (
                    <div key={tagIndex} className="flex items-center gap-1 text-xs text-primary bg-primary/10 px-2 py-1 rounded-full">
                      <Leaf className="w-3 h-3" />
                      {tag}
                    </div>
                  ))}
                </div>
                
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                  <Clock className="w-4 h-4" />
                  <span>Disponible mañana desde las 8:00</span>
                </div>
                
                <HeroButton 
                  variant="secondary" 
                  className="w-full"
                  disabled={!product.activo}
                >
                  {product.activo ? "Reservar" : "Próximamente"}
                </HeroButton>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center">
          <a href="/productos">
            <HeroButton variant="hero" className="mb-4">
              Ver catálogo completo
            </HeroButton>
          </a>
          <p className="text-sm text-muted-foreground">
            Más de 30 productos artesanales te esperan
          </p>
        </div>
      </div>
    </section>
  )
}

export default FeaturedProducts