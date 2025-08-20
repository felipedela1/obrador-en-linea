import { useEffect, useState, useCallback } from "react"
import { supabase } from "@/integrations/supabase/client"
import Navbar from "@/components/layout/Navbar"
import Footer from "@/components/sections/Footer"
import { useToast } from "@/components/ui/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { HeroButton } from "@/components/ui/hero-button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Loader2, RefreshCw, Calendar, Clock, Package, Check, XCircle, AlertCircle } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale/es"

interface ReservationItem {
  id: string
  product_id: string
  cantidad: number
  precio_unitario: number
  subtotal: number
  products?: {
    nombre: string
    imagen_url: string | null
  }
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
    if (!user) {
      setReservas([])
      setLoading(false)
      return
    }
    const { data, error } = await supabase
      .from("reservations")
      .select(`
        id,codigo,estado,fecha_recogida,franja_horaria,notas,total,created_at,
        reservation_items (
          id, product_id, cantidad, precio_unitario, subtotal,
          products ( nombre, imagen_url )
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    const t1 = performance.now()
    if (error) {
      // eslint-disable-next-line no-console
      console.log("[PERF][mis-reservas.fetch]", { dur_ms: +(t1 - t0).toFixed(1), hadError: true })
      toast({ title: "Error cargando reservas", description: error.message, variant: "destructive" })
      setReservas([])
      setLoading(false)
      return
    }
    // eslint-disable-next-line no-console
    console.log("[PERF][mis-reservas.fetch]", { dur_ms: +(t1 - t0).toFixed(1), count: data?.length || 0 })
    setReservas((data as Reservation[]) || [])
    setLoading(false)
  }, [toast])

  useEffect(() => { load() }, [load])

  const refresh = async () => {
    if (refreshing) return
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const cancelReservation = async (id: string) => {
    setCancellingId(id)
    try {
      const r = reservas.find(r => r.id === id)
      if (!r) return
      if (r.estado !== "PENDIENTE") {
        toast({ title: "No se puede cancelar", description: "Solo reservas pendientes", variant: "destructive" })
        setCancellingId(null)
        return
      }
      const { error } = await supabase
        .from("reservations")
        .update({ estado: "CANCELADO" })
        .eq("id", id)
        .eq("estado", "PENDIENTE")
      if (error) throw error
      setReservas(rs => rs.map(x => x.id === id ? { ...x, estado: "CANCELADA" } : x))
      toast({ title: "Reserva cancelada" })
    } catch (e: any) {
      toast({ title: "Error cancelando", description: e.message, variant: "destructive" })
    } finally {
      setCancellingId(null)
    }
  }

  const filtered = reservas.filter(r => {
    if (filterEstado === "activas") {
      return ["PENDIENTE", "PREPARADO"].includes(r.estado)
    }
    if (filterEstado === "historico") {
      return ["ENTREGADO", "CANCELADA"].includes(r.estado)
    }
    return true
  })

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 pt-20 pb-24 container mx-auto px-4">
        <div className="mb-10 text-center">
          <Badge variant="secondary" className="mb-4">Tus reservas</Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Mis reservas</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Consulta el estado de tus pedidos para recogida y su detalle de productos.
          </p>
        </div>

        <Card className="mb-8 bg-card/60 backdrop-blur-sm border-border/40">
          <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle className="text-lg">Listado</CardTitle>
            <div className="flex flex-wrap gap-2">
              <HeroButton variant={filterEstado === "activas" ? "hero" : "secondary"} onClick={() => setFilterEstado("activas")}>
                Activas
              </HeroButton>
              <HeroButton variant={filterEstado === "historico" ? "hero" : "secondary"} onClick={() => setFilterEstado("historico")}>
                Histórico
              </HeroButton>
              <HeroButton variant={filterEstado === "todas" ? "hero" : "secondary"} onClick={() => setFilterEstado("todas")}>
                Todas
              </HeroButton>
              <HeroButton variant="secondary" onClick={refresh} disabled={refreshing}>
                {refreshing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <RefreshCw className="w-4 h-4 mr-2" />
                Refrescar
              </HeroButton>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <div className="flex items-center gap-3 py-8 justify-center text-muted-foreground text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Cargando reservas...
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                No hay reservas para este filtro.
              </div>
            ) : (
              <div className="space-y-6">
                {filtered.map(res => {
                  const info = estadoInfo[res.estado] || { label: res.estado, variant: "outline" }
                  return (
                    <Card key={res.id} className="border-border/40 bg-background/40">
                      <CardHeader className="pb-3">
                        <div className="flex flex-wrap items-start gap-3 justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h2 className="font-semibold text-lg">Reserva {res.codigo}</h2>
                              <Badge variant={info.variant as any} className="text-[10px]">
                                {info.label}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {res.fecha_recogida ? format(new Date(res.fecha_recogida), "dd MMM yyyy", { locale: es }) : "—"}
                              </span>
                              {res.franja_horaria && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {res.franja_horaria}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Package className="w-3 h-3" />
                                {res.reservation_items.length} productos
                              </span>
                              <span className="flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                Total {res.total.toFixed(2)}€
                              </span>
                            </div>
                          </div>
                          {res.estado === "PENDIENTE" && (
                            <HeroButton
                              variant="hero"
                              disabled={cancellingId === res.id}
                              onClick={() => cancelReservation(res.id)}
                              className="h-9"
                            >
                              {cancellingId === res.id && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                              Cancelar
                            </HeroButton>
                          )}
                        </div>
                        {res.notas && (
                          <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {res.notas}
                          </div>
                        )}
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="divide-y divide-border/40">
                          {res.reservation_items.map(it => (
                            <div key={it.id} className="py-3 flex items-center gap-4">
                              <div className="w-12 h-12 rounded-md bg-muted overflow-hidden flex items-center justify-center">
                                {it.products?.imagen_url ? (
                                  <img
                                    src={it.products.imagen_url}
                                    alt={it.products.nombre}
                                    className="object-cover w-full h-full"
                                  />
                                ) : (
                                  <span className="text-xl opacity-40">🥖</span>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">{it.products?.nombre || "Producto"}</div>
                                <div className="text-[11px] text-muted-foreground">
                                  {it.cantidad} x {it.precio_unitario.toFixed(2)}€ = {it.subtotal.toFixed(2)}€
                                </div>
                              </div>
                              {res.estado === "PENDIENTE" && (
                                <Badge variant="outline" className="text-[10px]">
                                  Pendiente
                                </Badge>
                              )}
                              {res.estado === "CANCELADA" && (
                                <Badge variant="destructive" className="text-[10px]">
                                  Cancelado
                                </Badge>
                              )}
                              {res.estado === "PREPARADO" && (
                                <Badge variant="secondary" className="text-[10px]">
                                  Preparado
                                </Badge>
                              )}
                              {res.estado === "ENTREGADO" && (
                                <Badge variant="outline" className="text-[10px]">
                                  Entregado
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  )
}

export default MisReservas