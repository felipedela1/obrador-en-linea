import Navbar from "@/components/layout/Navbar"
import Footer from "@/components/sections/Footer"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { HeroButton } from "@/components/ui/hero-button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Filter, Star, Leaf } from "lucide-react"
import { useEffect, useState, useCallback } from "react"
import { supabase } from "@/integrations/supabase/client"
import type { ProductRow } from "@/types/models"

interface ProductWithStock {
  id: string
  nombre: string
  slug: string
  precio: number
  categoria: string
  imagen_url: string | null
  descripcion: string | null
  destacado: boolean
  stock: number
  etiquetas: string[]
}

const Productos = () => {
  const [loading, setLoading] = useState(false)
  const [products, setProducts] = useState<ProductWithStock[]>([])
  const [filter, setFilter] = useState("")

  const load = useCallback(async () => {
    console.log("[Productos] Iniciando carga de productos...")
    setLoading(true)
    
    const today = new Date().toISOString().slice(0,10)

    // 1. Daily stock de hoy
    const { data: stockRows, error: stockErr } = await supabase
      .from("daily_stock")
      .select("product_id,cantidad_disponible,fecha")
      .eq("fecha", today)

    if (stockErr) {
      console.error("[Productos] Error en daily_stock:", stockErr)
      setProducts([])
      setLoading(false)
      return
    }

    if (!stockRows || stockRows.length === 0) {
      console.log("[Productos] No hay stock para hoy")
      setProducts([])
      setLoading(false)
      return
    }

    const ids = stockRows.map(r => r.product_id)
    const stockMap: Record<string, number> = {}
    stockRows.forEach(r => { stockMap[r.product_id] = r.cantidad_disponible })

    // 2. Productos activos que tengan fila en daily_stock
    const { data: prodRows, error: prodErr } = await supabase
      .from("products")
      .select("id,nombre,slug,precio,categoria,imagen_url,descripcion,destacado,activo,etiquetas")
      .in("id", ids)
      .eq("activo", true)

    if (prodErr) {
      console.error("[Productos] Error en products:", prodErr)
      setProducts([])
      setLoading(false)
      return
    }

    const merged: ProductWithStock[] = (prodRows || []).map(p => ({
      id: p.id,
      nombre: p.nombre,
      slug: p.slug,
      precio: p.precio,
      categoria: p.categoria,
      imagen_url: p.imagen_url,
      descripcion: p.descripcion,
      destacado: p.destacado,
      stock: stockMap[p.id] ?? 0,
      etiquetas: (p as any).etiquetas || []
    }))
    
    const filtered = merged.filter(m => m.stock > 0)
    console.log("[Productos] Productos cargados:", filtered.length)
    setProducts(filtered.sort((a,b) => a.nombre.localeCompare(b.nombre)))
    setLoading(false)
  }, [])

  useEffect(() => { 
    load() 
  }, [load])

  const visible = products.filter(p =>
    p.nombre.toLowerCase().includes(filter.toLowerCase()) ||
    p.categoria.toLowerCase().includes(filter.toLowerCase())
  )

  const categories = [
    { value: "all", label: "Todos los productos" },
    { value: "PANES", label: "Panes" },
    { value: "BOLLERIA", label: "Bollería" },
    { value: "TARTAS", label: "Tartas" },
    { value: "ESPECIALES", label: "Especiales" }
  ]

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-16">
        {/* Header */}
        <section className="py-20 bg-gradient-warm">
          <div className="container mx-auto px-4 text-center">
            <Badge variant="secondary" className="mb-4 text-sm font-medium">
              Catálogo completo
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
              Nuestros productos
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Descubre toda nuestra selección de panes, bollería y dulces artesanales. 
              Cada producto es elaborado diariamente con ingredientes naturales y técnicas tradicionales.
            </p>
          </div>
        </section>

        {/* Filters */}
        <section className="py-12 bg-background border-b">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input 
                    placeholder="Buscar productos..." 
                    className="pl-10 w-full sm:w-80"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  />
                </div>
                
                <Select defaultValue="all">
                  <SelectTrigger className="w-full sm:w-48">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="text-sm text-muted-foreground">
                {loading ? "Cargando productos..." : `Mostrando ${products.length} productos`}
              </div>
            </div>
          </div>
        </section>

        {/* Products Grid */}
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
                <Card key={product.id} className="group overflow-hidden border-0 bg-card/60 backdrop-blur-sm hover:shadow-glow transition-all duration-500">
                  <div className="relative overflow-hidden">
                    {product.imagen_url ? (
                      <img src={product.imagen_url} alt={product.nombre} className="w-full h-48 object-cover" />
                    ) : (
                      <div className="w-full h-48 bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                        <div className="text-6xl opacity-20">🥖</div>
                      </div>
                    )}
                    <div className="absolute top-4 left-4">
                      <Badge variant="secondary" className="bg-white/90 text-foreground text-xs">
                        {categories.find(c => c.value === product.categoria)?.label}
                      </Badge>
                    </div>
                    {/* Aquí podrías mostrar rating si lo tienes en la tabla */}
                  </div>
                  
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">
                        {product.nombre}
                      </h3>
                      <div className="text-lg font-bold text-primary">
                        {product.precio.toFixed(2)}€
                      </div>
                    </div>
                    
                    <p className="text-muted-foreground text-sm mb-3 leading-relaxed">
                      {product.descripcion}
                    </p>
                    
                    <div className="flex flex-wrap gap-1 mb-4">
                      {product.etiquetas?.map((tag, tagIndex) => (
                        <div key={tagIndex} className="flex items-center gap-1 text-xs text-primary bg-primary/10 px-2 py-1 rounded-full">
                          <Leaf className="w-2 h-2" />
                          {tag}
                        </div>
                      ))}

                    </div>
                    
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="secondary" className="text-[10px]">{product.categoria}</Badge>
                      <Badge variant={product.stock > 0 ? "outline" : "destructive"} className="text-[10px]">
                        Stock: {product.stock}
                      </Badge>
                      {product.destacado && <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-600">Destacado</Badge>}
                    </div>
                    
                    <HeroButton 
                      variant="secondary" 
                      className="w-full text-sm py-2 mt-3"
                      disabled={product.stock <= 0}
                      asChild
                    >
                      <a href="/reservas" aria-disabled={product.stock <= 0}>
                        {product.stock > 0 ? "Reservar" : "Sin stock hoy"}
                      </a>
                    </HeroButton>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-gradient-warm">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              ¿No encuentras lo que buscas?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
              Trabajamos por encargo para eventos especiales, celebraciones y necesidades específicas. 
              Contacta con nosotros para crear algo único.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <HeroButton variant="hero">
                Contactar para encargos
              </HeroButton>
              <HeroButton variant="secondary">
                Ver nuestras especialidades
              </HeroButton>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  )
}

export default Productos