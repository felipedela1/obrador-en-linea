import { useEffect, useState, useCallback } from "react"
import { supabase } from "@/integrations/supabase/client"
import Navbar from "@/components/layout/Navbar"
import Footer from "@/components/sections/Footer"
import { useToast } from "@/components/ui/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { HeroButton } from "@/components/ui/hero-button"
import { Button } from "@/components/ui/button"
import { Loader2, RefreshCw, Calendar, Clock, Package, Check, AlertCircle, Sparkles, ShoppingCart } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale/es"

interface ReservationItem {
  id: string
  product_id: string
  cantidad: number
  precio_unitario: number
  subtotal: number
  products?: { nombre: string; imagen_url: string | null }
}

interface Reservation {
  id: string
  codigo: string
  estado: string
  fecha_recogida: string
  franja_horaria: string | null
  notas: string | null
  total: number
  created_at: string
  reservation_items: ReservationItem[]
}

const estadoInfo: Record<string, { label: string; variant: string }> = {
  PENDIENTE: { label: "Pendiente", variant: "secondary" },
  PREPARADO: { label: "Preparado", variant: "outline" },
  ENTREGADO: { label: "Entregado", variant: "outline" },
  CANCELADA: { label: "Cancelada", variant: "destructive" }
}

// Skeleton premium para la carga de reservas
const ReservationSkeleton = ({ index }: { index: number }) => (
  <Card className="premium-glass border-0 overflow-hidden animate-pulse" style={{ animationDelay: `${index * 80}ms` }}>
    <CardHeader className="pb-2">
      <div className="h-4 w-40 bg-white/30 rounded mb-3" />
      <div className="flex gap-2">
        <div className="h-4 w-24 bg-white/20 rounded" />
        <div className="h-4 w-20 bg-white/20 rounded" />
        <div className="h-4 w-16 bg-white/20 rounded" />
      </div>
    </CardHeader>
    <CardContent className="pt-0">
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-md bg-white/10" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-1/2 bg-white/20 rounded" />
              <div className="h-2.5 w-1/3 bg-white/10 rounded" />
            </div>
            <div className="h-4 w-14 bg-white/20 rounded" />
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
)

const MisReservas = () => {
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [reservas, setReservas] = useState<Reservation[]>([])
  const [filterEstado, setFilterEstado] = useState<"todas" | "activas" | "historico">("activas")
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const t0 = performance.now()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setReservas([]); setLoading(false); return }
    const { data, error } = await supabase
      .from("reservations")
      .select(`
        id,codigo,estado,fecha_recogida,franja_horaria,notas,total,created_at,
        reservation_items ( id, product_id, cantidad, precio_unitario, subtotal, products ( nombre, imagen_url ) )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
    const t1 = performance.now()
    if (error) {
      console.log("[PERF][mis-reservas.fetch]", { dur_ms: +(t1 - t0).toFixed(1), hadError: true })
      toast({ title: "Error cargando reservas", description: error.message, variant: "destructive" })
      setReservas([])
      setLoading(false)
      return
    }
    console.log("[PERF][mis-reservas.fetch]", { dur_ms: +(t1 - t0).toFixed(1), count: data?.length || 0 })
    setReservas((data as Reservation[]) || [])
    setLoading(false)
  }, [toast])

  useEffect(() => { load() }, [load])

  const refresh = async () => { if (refreshing) return; setRefreshing(true); await load(); setRefreshing(false) }

  const cancelReservation = async (id: string) => {
    setCancellingId(id)
    try {
      const r = reservas.find(r => r.id === id)
      if (!r) return
      if (r.estado !== "PENDIENTE") { toast({ title: "No se puede cancelar", description: "Solo reservas pendientes", variant: "destructive" }); setCancellingId(null); return }
      const { error } = await supabase.from("reservations").update({ estado: "CANCELADO" }).eq("id", id).eq("estado", "PENDIENTE")
      if (error) throw error
      setReservas(rs => rs.map(x => x.id === id ? { ...x, estado: "CANCELADA" } : x))
      toast({ title: "Reserva cancelada" })
    } catch (e: any) { toast({ title: "Error cancelando", description: e.message, variant: "destructive" }) } finally { setCancellingId(null) }
  }

  const filtered = reservas.filter(r => {
    if (filterEstado === "activas") return ["PENDIENTE", "PREPARADO"].includes(r.estado)
    if (filterEstado === "historico") return ["ENTREGADO", "CANCELADA"].includes(r.estado)
    return true
  })

  const totalReservas = reservas.length
  const activas = reservas.filter(r => ["PENDIENTE", "PREPARADO"].includes(r.estado)).length

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-24 pb-28">
        {/* HERO HEADER */}
        <section className="relative overflow-hidden py-20 md:py-28">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-10 -left-10 w-72 h-72 bg-blue-400/20 blur-3xl rounded-full animate-pulse-slow" />
            <div className="absolute top-1/2 -right-10 w-96 h-96 bg-indigo-500/10 blur-3xl rounded-full animate-pulse-medium" />
            <div className="absolute bottom-0 left-1/3 w-[40rem] h-[40rem] bg-sky-400/5 blur-[120px] rounded-full animate-pulse-fast" />
          </div>
          <div className="relative container mx-auto px-6 text-center max-w-5xl" style={{ opacity: 0, animation: 'fade-in 0.8s ease forwards' }}>
            <div className="inline-flex items-center gap-2 px-6 py-2 premium-glass gradient-border rounded-full text-sm font-medium text-slate-800 mb-8">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span className="tracking-wider">TUS RESERVAS</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight"><span className="shimmer-title">Mis reservas</span></h1>
            <p className="text-xl md:text-2xl text-black/90 max-w-3xl mx-auto leading-relaxed font-light">Gestiona y revisa el estado de tus pedidos confirmados y pendientes.</p>
            <div className="h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent max-w-64 mx-auto mt-8" />
          </div>
        </section>

        {/* CONTROLES / RESUMEN */}
        <section className="relative -mt-10 pb-8">
          <div className="container mx-auto px-6">
            <div className="premium-glass rounded-2xl p-6 md:p-8 gradient-border space-y-6" style={{ opacity: 0, animation: 'fade-in 0.8s ease forwards 0.15s' }}>
              <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-end justify-between">
                <div className="space-y-4 w-full lg:w-auto">
                  <div className="flex flex-wrap gap-3">
                    <Badge variant="secondary" className="bg-white/50 text-slate-800 rounded-full px-4 py-1">Total: {totalReservas}</Badge>
                    <Badge variant="secondary" className="bg-white/40 text-slate-700 rounded-full">Activas: {activas}</Badge>
                    <Badge variant="secondary" className="bg-white/40 text-slate-700 rounded-full">Histórico: {totalReservas - activas}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <HeroButton variant={filterEstado === 'activas' ? 'hero' : 'secondary'} onClick={() => setFilterEstado('activas')} className="h-10">Activas</HeroButton>
                    <HeroButton variant={filterEstado === 'historico' ? 'hero' : 'secondary'} onClick={() => setFilterEstado('historico')} className="h-10">Histórico</HeroButton>
                    <HeroButton variant={filterEstado === 'todas' ? 'hero' : 'secondary'} onClick={() => setFilterEstado('todas')} className="h-10">Todas</HeroButton>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <HeroButton variant="secondary" onClick={refresh} disabled={refreshing} className="flex items-center h-10">
                    {refreshing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />} Refrescar
                  </HeroButton>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* LISTADO */}
        <section className="relative pt-4">
          <div className="container mx-auto px-6" style={{ opacity: 0, animation: 'fade-in 0.8s ease forwards 0.25s' }}>
            {loading ? (
              <div className="space-y-6">
                {Array.from({ length: 3 }).map((_, i) => <ReservationSkeleton key={i} index={i} />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="premium-glass rounded-2xl p-12 text-center max-w-xl mx-auto">
                <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-2xl"><Calendar className="w-7 h-7" /></div>
                <h3 className="text-3xl font-bold mb-4"><span className="shimmer-title">Sin reservas</span></h3>
                <p className="text-black/80 mb-6">Aún no tienes reservas en este estado. Crea una o ajusta el filtro.</p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <HeroButton variant="secondary" asChild><a href="/productos">Ver catálogo</a></HeroButton>
                  <HeroButton variant="hero" asChild><a href="/reservas">Nueva reserva</a></HeroButton>
                </div>
              </div>
            ) : (
              <div className="space-y-10">
                {filtered.map((res, idx) => {
                  const info = estadoInfo[res.estado] || { label: res.estado, variant: "outline" }
                  return (
                    <Card key={res.id} className="premium-glass border-0 overflow-hidden hover-float relative" style={{ opacity: 0, animation: `fade-in 0.7s ease forwards ${idx * 0.05}s` }}>
                      <CardHeader className="pb-4">
                        <div className="flex flex-wrap items-start gap-4 justify-between">
                          <div className="space-y-2 min-w-[220px]">
                            <div className="flex items-center gap-3 flex-wrap">
                              <h2 className="font-semibold text-xl leading-tight shimmer-title">Reserva {res.codigo}</h2>
                              <Badge variant={info.variant as any} className="text-[10px] tracking-wide">
                                {info.label}
                              </Badge>
                              <Badge variant="secondary" className="bg-white/40 text-slate-700 text-[10px]">{res.reservation_items.length} productos</Badge>
                              <Badge variant="secondary" className="bg-white/50 text-slate-800 text-[10px]">Total {res.total.toFixed(2)}€</Badge>
                            </div>
                            <div className="flex flex-wrap gap-4 text-[11px] text-slate-600">
                              <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-blue-600" />{res.fecha_recogida ? format(new Date(res.fecha_recogida), "dd MMM yyyy", { locale: es }) : "—"}</span>
                              {res.franja_horaria && <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-blue-600" />{res.franja_horaria}</span>}
                              <span className="flex items-center gap-1"><Check className="w-3 h-3 text-blue-600" />Creada {format(new Date(res.created_at), "dd/MM HH:mm", { locale: es })}</span>
                            </div>
                            {res.notas && (
                              <div className="mt-1 text-xs text-slate-600 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3 text-blue-600" />{res.notas}
                              </div>
                            )}
                          </div>
                          {res.estado === "PENDIENTE" && (
                            <HeroButton variant="hero" disabled={cancellingId === res.id} onClick={() => cancelReservation(res.id)} className="h-10">
                              {cancellingId === res.id && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Cancelar
                            </HeroButton>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="divide-y divide-white/20">
                          {res.reservation_items.map((it, i) => (
                            <div key={it.id} className="py-4 flex items-center gap-4" style={{ animation: 'fade-in 0.5s ease forwards', opacity: 0, animationDelay: `${0.2 + i * 0.05}s` }}>
                              <div className="w-14 h-14 rounded-xl bg-white/10 overflow-hidden flex items-center justify-center premium-glass-dark">
                                {it.products?.imagen_url ? (
                                  <img src={it.products.imagen_url} alt={it.products.nombre} className="object-cover w-full h-full" />
                                ) : (
                                  <span className="text-2xl">🥖</span>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold text-slate-800 truncate" title={it.products?.nombre}>{it.products?.nombre || "Producto"}</div>
                                <div className="text-[11px] text-slate-600 font-medium mt-0.5">{it.cantidad} x {it.precio_unitario.toFixed(2)}€ = {it.subtotal.toFixed(2)}€</div>
                              </div>
                              <div className="text-right">
                                <Badge variant="secondary" className="bg-white/50 text-slate-700 text-[10px]">{(it.subtotal).toFixed(2)}€</Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="relative py-24">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 right-10 w-72 h-72 bg-blue-400/10 blur-3xl rounded-full animate-pulse-slow" />
            <div className="absolute bottom-0 left-10 w-96 h-96 bg-indigo-500/10 blur-3xl rounded-full animate-pulse-medium" />
          </div>
          <div className="container mx-auto px-6">
            <Card className="premium-glass rounded-3xl border-0 overflow-hidden text-center gradient-border p-0" style={{ opacity: 0, animation: 'fade-in 0.9s ease forwards 0.35s' }}>
              <CardContent className="relative z-10 p-12 md:p-20">
                <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight"><span className="shimmer-title">¿Quieres hacer otra reserva?</span></h2>
                <p className="text-lg md:text-xl text-black/85 max-w-3xl mx-auto mb-10 font-light">Explora el catálogo diario o gestiona nuevas piezas artesanales antes de que se agoten.</p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-xl mx-auto">
                  <HeroButton variant="secondary" asChild><a href="/productos">Ver catálogo</a></HeroButton>
                  <HeroButton variant="confirm" asChild><a href="/reservas">Reservar ahora</a></HeroButton>
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

export default MisReservas