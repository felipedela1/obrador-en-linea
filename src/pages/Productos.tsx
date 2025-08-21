import Navbar from "@/components/layout/Navbar"
import Footer from "@/components/sections/Footer"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { HeroButton } from "@/components/ui/hero-button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Filter, Star, Leaf, Sparkles, Loader2, Package, Wheat } from "lucide-react"
import { useEffect, useState, useCallback, useRef } from "react"
import { supabase } from "@/integrations/supabase/client"
import type { ProductRow } from "@/types/models"
import { default as VanillaTilt } from 'vanilla-tilt'

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
  activo?: boolean
}

// Extender HTMLElement para tilt
interface TiltElement extends HTMLElement { vanillaTilt?: { destroy: () => void } }

const ProductSkeleton = ({ index }: { index: number }) => (
  <Card 
    className="relative overflow-hidden border-0 premium-glass animate-pulse"
    style={{ animationDelay: `${index * 120}ms` }}
  >
    <div className="relative aspect-[4/3] w-full bg-white/10 flex items-center justify-center">
      <Wheat className="w-12 h-12 text-blue-400/30" />
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/0" />
    </div>
    <CardContent className="p-5 space-y-4">
      <div className="h-5 w-2/3 bg-white/30 rounded" />
      <div className="h-4 w-full bg-white/20 rounded" />
      <div className="h-4 w-5/6 bg-white/20 rounded" />
      <div className="flex gap-2 pt-2">
        <div className="h-6 w-16 bg-white/20 rounded-full" />
        <div className="h-6 w-20 bg-white/20 rounded-full" />
      </div>
      <div className="h-10 w-full bg-blue-500/20 rounded-xl mt-2" />
    </CardContent>
  </Card>
)

const Productos = () => {
  const [loading, setLoading] = useState(false)
  const [products, setProducts] = useState<ProductWithStock[]>([])
  const [filter, setFilter] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const tiltRefs = useRef<(TiltElement | null)[]>([])
  const headerRef = useRef<HTMLDivElement | null>(null)

  const load = useCallback(async () => {
    console.log("[Productos] Iniciando carga de productos...")
    setLoading(true)
    const today = new Date().toISOString().slice(0,10)

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
      etiquetas: (p as any).etiquetas || [],
      activo: (p as any).activo
    }))

    const filtered = merged.filter(m => m.stock > 0)
    setProducts(filtered.sort((a,b) => a.nombre.localeCompare(b.nombre)))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Inicializar tilt al montar y cuando cambie la lista
  useEffect(() => {
    const timer = setTimeout(() => {
      tiltRefs.current.forEach(el => {
        if (el) {
          VanillaTilt.init(el, { max: 6, speed: 600, glare: true, "max-glare": 0.15, gyroscope: false })
        }
      })
    }, 150)
    return () => {
      clearTimeout(timer)
      tiltRefs.current.forEach(el => { if (el?.vanillaTilt) el.vanillaTilt.destroy() })
    }
  }, [products])

  const categories = [
    { value: "all", label: "Todos" },
    { value: "PANES", label: "Panes" },
    { value: "BOLLERIA", label: "Bollería" },
    { value: "TARTAS", label: "Tartas" },
    { value: "ESPECIALES", label: "Especiales" }
  ]

  const filteredProducts = products.filter(p => {
    const matchesText = p.nombre.toLowerCase().includes(filter.toLowerCase()) || p.categoria.toLowerCase().includes(filter.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || p.categoria === categoryFilter
    return matchesText && matchesCategory
  })

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-24 pb-24">
        {/* Header Premium */}
        <section className="relative overflow-hidden py-24">
          {/* Esferas y decoración */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute -top-10 -left-10 w-72 h-72 bg-blue-400/20 blur-3xl rounded-full animate-pulse-slow" />
              <div className="absolute top-1/2 -right-10 w-96 h-96 bg-indigo-500/10 blur-3xl rounded-full animate-pulse-medium" />
              <div className="absolute bottom-0 left-1/3 w-[40rem] h-[40rem] bg-sky-400/5 blur-[120px] rounded-full animate-pulse-fast" />
            </div>
            <div className="relative container mx-auto px-6 text-center max-w-5xl" ref={headerRef} style={{opacity:0, animation:'fade-in 0.8s ease forwards'}}> 
              <div className="inline-flex items-center gap-2 px-6 py-2 premium-glass gradient-border rounded-full text-sm font-medium text-slate-800 mb-8">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span className="tracking-wider">CATÁLOGO COMPLETO</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
                <span className="shimmer-title">Nuestros Productos</span>
              </h1>
              <p className="text-xl md:text-2xl text-black/90 max-w-3xl mx-auto leading-relaxed font-light">
                Selección diaria artesanal con ingredientes naturales y técnica de alta panadería. Reserva antes de que se agoten.
              </p>
            </div>
        </section>

        {/* Filtros */}
        <section className="relative py-10">
          <div className="container mx-auto px-6">
            <div className="premium-glass rounded-2xl p-6 md:p-8 gradient-border">
              <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
                <div className="flex flex-col md:flex-row gap-4 w-full lg:w-auto">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-600 w-4 h-4" />
                    <Input 
                      placeholder="Buscar productos..." 
                      className="pl-12 w-full md:w-80 bg-white/60 backdrop-blur placeholder:text-slate-500 focus-visible:ring-blue-500"
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                      aria-label="Buscar productos"
                    />
                  </div>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-full md:w-52 bg-white/60 backdrop-blur">
                      <Filter className="w-4 h-4 mr-2 text-blue-600" />
                      <SelectValue placeholder="Categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(c => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-wrap gap-3 items-center text-sm">
                  <Badge variant="secondary" className="bg-white/50 text-slate-800 px-3 py-1 rounded-full">
                    <Package className="w-3 h-3 mr-1 text-blue-600" /> {loading ? 'Cargando…' : `${filteredProducts.length}/${products.length}`} visibles
                  </Badge>
                  <Badge variant="secondary" className="bg-white/40 text-slate-700 rounded-full">
                    Stock diario activo
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Grid de productos */}
        <section className="relative py-8">
          <div className="container mx-auto px-6">
            {loading && products.length === 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {Array.from({ length: 8 }).map((_, i) => <ProductSkeleton key={i} index={i} />)}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="premium-glass rounded-2xl p-12 text-center max-w-3xl mx-auto">
                <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-2xl">
                  <Search className="w-7 h-7" />
                </div>
                <h3 className="text-3xl font-bold mb-4"><span className="shimmer-title">Sin coincidencias</span></h3>
                <p className="text-white/80 mb-6">Ajusta los filtros o busca otro término. Muchos productos se agotan rápido cada mañana.</p>
                <HeroButton variant="secondary" onClick={() => { setFilter(''); setCategoryFilter('all')}}>
                  Reiniciar filtros
                </HeroButton>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {filteredProducts.map((product, idx) => (
                  <Card
                    key={product.id}
                    ref={el => tiltRefs.current[idx] = el}
                    className="group overflow-hidden border-0 premium-glass hover-float relative"
                    style={{opacity:0, animation:`fade-in 0.7s ease forwards ${idx * 0.06}s`}}
                  >
                    {/* Imagen */}
                    <div className="relative overflow-hidden aspect-[4/3]">
                      {product.imagen_url ? (
                        <img 
                          src={product.imagen_url} 
                          alt={product.nombre} 
                          className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700" 
                        />
                      ) : (
                        <div className="w-full h-full bg-white/10 flex items-center justify-center">
                          <Wheat className="w-12 h-12 text-blue-500/40" />
                        </div>
                      )}
                      <div className="absolute top-4 left-4 flex flex-col gap-2">
                        <Badge className="premium-glass-dark border-0 text-white px-3 py-1 text-xs">
                          {categories.find(c => c.value === product.categoria)?.label || product.categoria}
                        </Badge>
                        {product.destacado && (
                          <Badge className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white border-0 text-[10px] shadow-md">
                            ★ Destacado
                          </Badge>
                        )}
                      </div>
                    </div>

                    <CardContent className="p-5 flex flex-col h-full space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-lg font-semibold text-slate-800 leading-tight">
                          {product.nombre}
                        </h3>
                        <div className="text-xl font-bold shimmer-title whitespace-nowrap leading-none">
                          {product.precio.toFixed(2)}€
                        </div>
                      </div>
                      <p className="text-slate-700 text-sm leading-relaxed line-clamp-3">
                        {product.descripcion}
                      </p>
                      <div className="mt-auto space-y-3">
                        <div className="flex flex-wrap gap-1.5">
                          <Badge variant="secondary" className="bg-white/50 text-slate-700 text-[10px] tracking-wide">Stock: {product.stock}</Badge>
                          {product.etiquetas?.slice(0,3).map((tag,i) => (
                            <span key={i} className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-blue-500/10 text-blue-700 font-medium">
                              <Leaf className="w-3 h-3" />{tag}
                            </span>
                          ))}
                        </div>
                        <HeroButton 
                          variant="secondary"
                          className="w-full text-sm py-2"
                          disabled={product.stock <= 0}
                          asChild
                        >
                          <a href="/reservas" aria-disabled={product.stock <= 0} aria-label={`Reservar ${product.nombre}`}>
                            {product.stock > 0 ? "Reservar" : "Sin stock hoy"}
                          </a>
                        </HeroButton>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* CTA Final */}
        <section className="relative py-28">
          <div className="container mx-auto px-6">
            <Card className="premium-glass rounded-3xl border-0 overflow-hidden text-center gradient-border p-0">
              <CardContent className="relative z-10 p-12 md:p-20">
                <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight"><span className="shimmer-title">¿Buscas algo especial?</span></h2>
                <p className="text-lg md:text-xl text-black/85 max-w-3xl mx-auto mb-10 font-light">
                  Elaboramos piezas únicas para eventos, celebraciones y degustaciones privadas. Cuéntanos tu idea y la haremos realidad.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-xl mx-auto">
                  <HeroButton variant="hero" asChild>
                    <a href="/reservas#encargos">Contactar para encargos</a>
                  </HeroButton>
                  <HeroButton variant="secondary" asChild>
                    <a href="/reservas">Ver disponibilidad</a>
                  </HeroButton>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

export default Productos