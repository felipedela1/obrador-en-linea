import Navbar from "@/components/layout/Navbar";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { HeroButton } from "@/components/ui/hero-button";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar as CalendarIcon, Loader2, Minus, Plus, RefreshCw, ShoppingCart } from "lucide-react";
import { format } from "date-fns";

interface AvailableProduct {
  product_id: string;
  nombre: string;
  slug: string;
  precio: number;
  categoria: string;
  imagen_url: string | null;
  cantidad_disponible: number;
  reservado: number;
  restante: number;
}

interface CartItem { product_id: string; nombre: string; precio: number; qty: number; restante: number; }

const Reservas = () => {
  const { toast } = useToast();
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0,10));
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<AvailableProduct[]>([]);
  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [filter, setFilter] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchAvailable = useCallback(async () => {
    setLoading(true);
    // RPC plan fallback: if function not created, approximate with two queries
    const { data: stockData, error: stockError } = await supabase
      .from("daily_stock")
      .select("product_id,cantidad_disponible,fecha")
      .eq("fecha", fecha);
    if (stockError) {
      toast({ title: "Error stock", description: stockError.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    const productIds = stockData.map(s => s.product_id);
    if (productIds.length === 0) {
      setProducts([]);
      setLoading(false);
      return;
    }
    const { data: prodData, error: prodError } = await supabase
      .from("products")
      .select("id,nombre,slug,precio,categoria,imagen_url,activo")
      .in("id", productIds)
      .eq("activo", true);
    if (prodError) {
      toast({ title: "Error productos", description: prodError.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    // reservas agregadas
    const { data: resItems, error: resError } = await supabase
      .from("reservation_items")
      .select("product_id,cantidad,reservation_id,reservations!inner(fecha_recogida)")
      .eq("reservations.fecha_recogida", fecha);
    if (resError) {
      toast({ title: "Error reservas", description: resError.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    const reservedMap: Record<string, number> = {};
    resItems?.forEach(it => {
      reservedMap[it.product_id] = (reservedMap[it.product_id] || 0) + it.cantidad;
    });
    const merged: AvailableProduct[] = stockData.map(s => {
      const p = prodData.find(pr => pr.id === s.product_id);
      const reservado = reservedMap[s.product_id] || 0;
      return {
        product_id: s.product_id,
        nombre: p?.nombre || "(eliminado)",
        slug: p?.slug || "",
        precio: p?.precio || 0,
        categoria: p?.categoria || "",
        imagen_url: p?.imagen_url || null,
        cantidad_disponible: s.cantidad_disponible,
        reservado,
        restante: Math.max(s.cantidad_disponible - reservado, 0)
      };
    }).filter(p => !!p.slug && p.restante > 0);
    setProducts(merged.sort((a,b) => a.nombre.localeCompare(b.nombre)));
    setLoading(false);
  }, [fecha, toast]);

  useEffect(() => { fetchAvailable(); }, [fetchAvailable]);

  const inc = (p: AvailableProduct) => setCart(c => {
    const cur = c[p.product_id];
    const nextQty = Math.min((cur?.qty || 0) + 1, p.restante);
    return { ...c, [p.product_id]: { product_id: p.product_id, nombre: p.nombre, precio: p.precio, qty: nextQty, restante: p.restante } };
  });
  const dec = (p: AvailableProduct) => setCart(c => {
    const cur = c[p.product_id];
    if (!cur) return c;
    const nextQty = Math.max(cur.qty - 1, 0);
    const { [p.product_id]: omit, ...rest } = c;
    return nextQty === 0 ? rest : { ...c, [p.product_id]: { ...cur, qty: nextQty } };
  });

  const total = Object.values(cart).reduce((acc, it) => acc + it.qty * it.precio, 0);

  const submit = async () => {
    if (Object.keys(cart).length === 0) return;
    setSubmitting(true);
    // Simple naive create reservation (sin RPC transaccional aún)
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast({ title: "No autenticado", description: "Inicia sesión", variant: "destructive" }); setSubmitting(false); return; }
      // crear reserva
      const { data: resData, error: resErr } = await supabase
        .from("reservations")
        .insert({ user_id: user.id, fecha_recogida: fecha, franja_horaria: "08:00", estado: "PENDIENTE", codigo: `TMP-${Date.now()}`, total })
        .select("id")
        .single();
      if (resErr || !resData) throw resErr || new Error("Sin reserva");
      const itemsPayload = Object.values(cart).map(it => ({
        reservation_id: resData.id,
        product_id: it.product_id,
        cantidad: it.qty,
        precio_unitario: it.precio,
        subtotal: +(it.qty * it.precio).toFixed(2)
      }));
      if (itemsPayload.length) {
        const { error: itemsErr } = await supabase.from("reservation_items").insert(itemsPayload);
        if (itemsErr) throw itemsErr;
      }
      toast({ title: "Reserva creada", description: `Total ${total.toFixed(2)}€` });
      setCart({});
      fetchAvailable();
    } catch (e: any) {
      toast({ title: "Error reserva", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = products.filter(p => p.nombre.toLowerCase().includes(filter.toLowerCase()));
  const cartCount = Object.values(cart).reduce((acc, it) => acc + it.qty, 0);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 pt-20 pb-24 container mx-auto px-4">
        <div className="mb-8 flex flex-col md:flex-row md:items-end gap-4">
          <div className="flex-1 space-y-2">
            <h1 className="text-3xl font-bold">Reservas</h1>
            <p className="text-sm text-muted-foreground">Selecciona los productos disponibles para la fecha.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className="w-auto" />
            <Input placeholder="Buscar..." value={filter} onChange={e => setFilter(e.target.value)} className="w-44" />
            <HeroButton variant="secondary" onClick={fetchAvailable} disabled={loading} className="flex items-center">
              <RefreshCw className="w-4 h-4 mr-2" /> Actualizar
            </HeroButton>
            <HeroButton variant="hero" disabled={submitting || cartCount===0} onClick={submit} className="flex items-center">
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShoppingCart className="w-4 h-4 mr-2" />}
              Confirmar ({cartCount})
            </HeroButton>
          </div>
        </div>

        <Tabs defaultValue="grid" className="space-y-6">
          <TabsList>
            <TabsTrigger value="grid">Productos ({filtered.length})</TabsTrigger>
            <TabsTrigger value="carrito">Carrito ({cartCount})</TabsTrigger>
          </TabsList>
          <TabsContent value="grid" className="space-y-4">
            {loading ? (
              <div className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Cargando...</div>
            ) : filtered.length === 0 ? (
              <div className="text-sm text-muted-foreground">Sin productos disponibles.</div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filtered.map(p => {
                  const inCart = cart[p.product_id]?.qty || 0;
                  const restante = p.restante - inCart; // mostrar restante post selección
                  return (
                    <Card key={p.product_id} className="group overflow-hidden border-border/40 bg-card/60 backdrop-blur-sm">
                      <div className="aspect-video bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center overflow-hidden">
                        {p.imagen_url ? (
                          <img src={p.imagen_url} alt={p.nombre} className="object-cover w-full h-full" />
                        ) : (
                          <div className="text-4xl">🥖</div>
                        )}
                      </div>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-sm font-semibold truncate" title={p.nombre}>{p.nombre}</h3>
                          <span className="text-primary font-bold text-sm">{p.precio.toFixed(2)}€</span>
                        </div>
                        <div className="flex flex-wrap gap-1 text-[10px]">
                          <Badge variant="secondary">{p.categoria}</Badge>
                          <Badge variant="outline" className="border-primary/30 text-primary">Disp: {p.cantidad_disponible}</Badge>
                          <Badge variant="outline" className="border-amber-500/30 text-amber-600">Res: {p.reservado}</Badge>
                          <Badge variant="outline" className="border-emerald-500/30 text-emerald-600">Rest: {p.restante}</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <HeroButton variant="hero" disabled={inCart===0} onClick={() => dec(p)} className="h-8 w-8 p-0"><Minus className="w-4 h-4" /></HeroButton>
                          <Input type="number" min={0} max={p.restante} value={inCart} onChange={e => {
                            let v = parseInt(e.target.value, 10) || 0;
                            v = Math.min(Math.max(v,0), p.restante);
                            setCart(c => v === 0 ? ( () => { const { [p.product_id]:_, ...rest } = c; return rest; })() : { ...c, [p.product_id]: { product_id: p.product_id, nombre: p.nombre, precio: p.precio, qty: v, restante: p.restante } });
                          }} className="h-8 w-16 text-center text-xs" />
                          <HeroButton variant="secondary" disabled={restante<=0} onClick={() => inc(p)} className="h-8 w-8 p-0"><Plus className="w-4 h-4" /></HeroButton>
                          <div className="text-[11px] text-muted-foreground ml-auto">Quedan {restante}</div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
          <TabsContent value="carrito" className="space-y-4">
            {cartCount === 0 ? (
              <div className="text-sm text-muted-foreground">Carrito vacío.</div>
            ) : (
              <div className="space-y-4">
                {Object.values(cart).map(it => (
                  <div key={it.product_id} className="flex items-center gap-3 p-3 rounded-md border border-border/40 bg-card/50">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{it.nombre}</div>
                      <div className="text-[11px] text-muted-foreground">x {it.qty} = {(it.qty * it.precio).toFixed(2)}€</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <HeroButton variant="hero" disabled={it.qty===0} onClick={() => dec({ product_id: it.product_id, nombre: it.nombre, slug: '', precio: it.precio, categoria: '', imagen_url: null, cantidad_disponible: 0, reservado: 0, restante: it.restante })} className="h-8 w-8 p-0"><Minus className="w-4 h-4" /></HeroButton>
                      <Input type="number" min={0} max={it.restante} value={it.qty} onChange={e => {
                        let v = parseInt(e.target.value, 10) || 0;
                        v = Math.min(Math.max(v,0), it.restante);
                        setCart(c => v === 0 ? ( () => { const { [it.product_id]:_, ...rest } = c; return rest; })() : { ...c, [it.product_id]: { ...it, qty: v } });
                      }} className="h-8 w-16 text-center text-xs" />
                      <HeroButton variant="secondary" disabled={it.qty>=it.restante} onClick={() => inc({ product_id: it.product_id, nombre: it.nombre, slug: '', precio: it.precio, categoria: '', imagen_url: null, cantidad_disponible: 0, reservado: 0, restante: it.restante })} className="h-8 w-8 p-0"><Plus className="w-4 h-4" /></HeroButton>
                    </div>
                    <div className="w-16 text-right text-xs font-medium">{(it.qty * it.precio).toFixed(2)}€</div>
                  </div>
                ))}
                <div className="flex items-center justify-between p-4 rounded-md border border-border/50 bg-muted/30">
                  <div className="text-sm font-semibold">Total</div>
                  <div className="text-base font-bold text-primary">{total.toFixed(2)}€</div>
                </div>
                <div className="flex justify-end">
                  <HeroButton variant="hero" disabled={submitting} onClick={submit} className="min-w-[180px]">
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ShoppingCart className="w-4 h-4 mr-2" />}
                    Confirmar reserva
                  </HeroButton>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Reservas;
