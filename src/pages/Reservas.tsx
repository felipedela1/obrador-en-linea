import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/sections/Footer";
import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { HeroButton } from "@/components/ui/hero-button";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar as CalendarIcon, Loader2, Minus, Plus, RefreshCw, ShoppingCart, Sparkles, Search, Filter, AlertCircle } from "lucide-react";
import VanillaTilt from 'vanilla-tilt';
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

// Tipos
interface AvailableProduct { product_id: string; nombre: string; slug: string; precio: number; categoria: string; imagen_url: string | null; cantidad_disponible: number; reservado: number; }
interface CartItem { product_id: string; nombre: string; precio: number; qty: number; restante: number; }
interface TiltElement extends HTMLElement { vanillaTilt?: { destroy: () => void } }

// Skeleton de carga premium
const ProductSkeleton = ({ index }: { index: number }) => (
  <Card className="relative overflow-hidden border-0 premium-glass animate-pulse" style={{ animationDelay: `${index * 120}ms` }}>
    <div className="relative aspect-[4/3] w-full bg-white/10 flex items-center justify-center">
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400/30 to-indigo-400/30" />
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
);

const Reservas = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0,10));
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<AvailableProduct[]>([]);
  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [filter, setFilter] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const tiltRefs = useRef<(TiltElement | null)[]>([]);

  const fetchAvailable = useCallback(async () => {
    setLoading(true);
    const { data: stockData, error: stockError } = await supabase
      .from("daily_stock")
      .select("product_id,cantidad_disponible,fecha")
      .eq("fecha", fecha);
    if (stockError) { toast({ title: "Error stock", description: stockError.message, variant: "destructive" }); setLoading(false); return; }

    const productIds = stockData.map(s => s.product_id);
    if (productIds.length === 0) { setProducts([]); setLoading(false); return; }

    const { data: prodData, error: prodErr } = await supabase
      .from("products")
      .select("id,nombre,slug,precio,categoria,imagen_url,activo")
      .in("id", productIds)
      .eq("activo", true);
    if (prodErr) { toast({ title: "Error productos", description: prodErr.message, variant: "destructive" }); setLoading(false); return; }

    const { data: resItems, error: resErr } = await supabase
      .from("reservation_items")
      .select("product_id,cantidad,reservation_id,reservations!inner(fecha_recogida)")
      .eq("reservations.fecha_recogida", fecha);
    if (resErr) { toast({ title: "Error reservas", description: resErr.message, variant: "destructive" }); setLoading(false); return; }

    const reservedMap: Record<string, number> = {};
    resItems?.forEach(it => { reservedMap[it.product_id] = (reservedMap[it.product_id] || 0) + it.cantidad; });

    const merged: AvailableProduct[] = stockData.map(s => {
      const p = prodData.find(pr => pr.id === s.product_id);
      const reservado = reservedMap[s.product_id] || 0;
      return { product_id: s.product_id, nombre: p?.nombre || "(eliminado)", slug: p?.slug || "", precio: p?.precio || 0, categoria: p?.categoria || "", imagen_url: p?.imagen_url || null, cantidad_disponible: s.cantidad_disponible, reservado };
    }).filter(p => !!p.slug && p.cantidad_disponible > 0);

    setProducts(merged.sort((a,b) => a.nombre.localeCompare(b.nombre)));
    setLoading(false);
  }, [fecha, toast]);

  useEffect(() => { fetchAvailable(); }, [fetchAvailable]);

  // Tilt
  useEffect(() => {
    const t = setTimeout(() => {
      tiltRefs.current.forEach(el => { if (el) VanillaTilt.init(el, { max: 6, speed: 600, glare: true, "max-glare": 0.15, gyroscope: false }); });
    }, 120);
    return () => { clearTimeout(t); tiltRefs.current.forEach(el => el?.vanillaTilt?.destroy()); };
  }, [products]);

  // Cart helpers
  const inc = (p: AvailableProduct) => setCart(c => {
    const cur = c[p.product_id];
    const currentInCart = cur?.qty || 0;
    const maxCanAdd = Math.max(0, p.cantidad_disponible - currentInCart);
    if (maxCanAdd <= 0) return c;
    const nextQty = currentInCart + 1;
    return { ...c, [p.product_id]: { product_id: p.product_id, nombre: p.nombre, precio: p.precio, qty: nextQty, restante: p.cantidad_disponible } };
  });
  const dec = (p: AvailableProduct) => setCart(c => {
    const cur = c[p.product_id];
    if (!cur) return c;
    const nextQty = Math.max(cur.qty - 1, 0);
    const { [p.product_id]: _omit, ...rest } = c;
    return nextQty === 0 ? rest : { ...c, [p.product_id]: { ...cur, qty: nextQty } };
  });

  const total = Object.values(cart).reduce((acc, it) => acc + it.qty * it.precio, 0);

  const submit = async () => {
    if (Object.keys(cart).length === 0) return;
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast({ title: "No autenticado", description: "Inicia sesión", variant: "destructive" }); setSubmitting(false); return; }
      const { data: resData, error: resErr } = await supabase
        .from("reservations")
        .insert({ user_id: user.id, fecha_recogida: fecha, franja_horaria: "08:00", estado: "PENDIENTE", codigo: `TMP-${Date.now()}`, total })
        .select("id")
        .single();
      if (resErr || !resData) throw resErr || new Error("Sin reserva");
      const itemsPayload = Object.values(cart).map(it => ({ reservation_id: resData.id, product_id: it.product_id, cantidad: it.qty, precio_unitario: it.precio, subtotal: +(it.qty * it.precio).toFixed(2) }));
      if (itemsPayload.length) { const { error: itemsErr } = await supabase.from("reservation_items").insert(itemsPayload); if (itemsErr) throw itemsErr; }
      const stockUpdates = Object.values(cart).map(async item => {
        const { data: currentStock, error: fetchErr } = await supabase
          .from("daily_stock")
          .select("cantidad_disponible")
          .eq("product_id", item.product_id)
          .eq("fecha", fecha)
          .single();
        if (fetchErr || !currentStock) throw new Error(`Error obteniendo stock actual de ${item.nombre}`);
        const newStock = Math.max(0, currentStock.cantidad_disponible - item.qty);
        const { error: stockErr } = await supabase
          .from("daily_stock")
          .update({ cantidad_disponible: newStock })
          .eq("product_id", item.product_id)
          .eq("fecha", fecha);
        if (stockErr) throw new Error(`Error actualizando stock de ${item.nombre}`);
      });
      await Promise.all(stockUpdates);
      toast({ title: "Reserva creada", description: `Total ${total.toFixed(2)}€` });
      setCart({});
      fetchAvailable();
    } catch (e: any) {
      toast({ title: "Error reserva", description: e.message, variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  const filtered = products.filter(p => p.nombre.toLowerCase().includes(filter.toLowerCase()));
  const cartCount = Object.values(cart).reduce((acc, it) => acc + it.qty, 0);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-0 pb-16"> {/* Quitar espacio arriba, menos padding abajo */}
        {/* Header */}
        <section className="relative overflow-hidden py-6 md:py-10"> {/* menos padding vertical */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-10 -left-10 w-72 h-72 bg-blue-400/20 blur-3xl rounded-full animate-pulse-slow" />
            <div className="absolute top-1/2 -right-10 w-96 h-96 bg-indigo-500/10 blur-3xl rounded-full animate-pulse-medium" />
            <div className="absolute bottom-0 left-1/3 w-[40rem] h-[40rem] bg-sky-400/5 blur-[120px] rounded-full animate-pulse-fast" />
          </div>
          <div className="relative container mx-auto px-4 sm:px-6 text-center max-w-2xl" style={{opacity:0, animation:'fade-in 0.8s ease forwards'}}>
            <div className="inline-flex items-center gap-2 px-3 py-1 premium-glass gradient-border rounded-full text-xs font-medium text-slate-800 mb-3">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span className="tracking-wider">GESTIONA TU RESERVA</span>
            </div>
            <h1 className="text-2xl md:text-4xl font-bold mb-2 leading-tight"><span className="shimmer-title">Reservas</span></h1>
            <p className="text-sm md:text-lg text-black/90 max-w-xl mx-auto leading-relaxed font-light">Selecciona y confirma tus piezas artesanales para recoger en la fecha elegida.</p>
            <div className="h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent max-w-32 mx-auto mt-3" />
          </div>
        </section>

        {/* Filtros */}
        <section className="relative py-2"> {/* menos padding, quitar -mt-10 */}
          <div className="container mx-auto px-4 sm:px-6">
            <div className="premium-glass rounded-2xl p-4 md:p-6 gradient-border space-y-4">
              <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch md:items-end justify-between w-full">
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-600 w-4 h-4" />
                    <Input placeholder="Buscar productos..." className="pl-12 w-full bg-white/60 backdrop-blur placeholder:text-slate-500 focus-visible:ring-blue-500 text-sm" value={filter} onChange={e => setFilter(e.target.value)} aria-label="Buscar productos" />
                  </div>
                  <div className="relative flex-1 min-w-[140px]">
                    <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-600 w-4 h-4" />
                    <Input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className="pl-12 w-full bg-white/60 backdrop-blur text-sm" aria-label="Fecha de recogida" />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 items-center justify-end w-full md:w-auto mt-2 md:mt-0">
                  <Badge variant="secondary" className="bg-white/50 text-slate-800 px-3 py-1 rounded-full text-xs"><Filter className="w-3 h-3 mr-1 text-blue-600" /> {filtered.length}/{products.length} visibles</Badge>
                  <Badge variant="secondary" className="bg-white/40 text-slate-700 rounded-full text-xs">{loading ? 'Cargando stock...' : 'Stock actualizado'}</Badge>
                  <HeroButton variant="secondary" onClick={fetchAvailable} disabled={loading} className="flex items-center h-9 text-xs px-4">{loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />} Actualizar</HeroButton>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Tabs */}
        <section className="relative pt-6">
          <div className="container mx-auto px-4 sm:px-6" style={{opacity:0, animation:'fade-in 0.8s ease forwards 0.25s'}}>
            <Tabs defaultValue="grid" className="space-y-8">
              <TabsList className="premium-glass gradient-border">
                <TabsTrigger value="grid">Productos ({filtered.length})</TabsTrigger>
                <TabsTrigger value="carrito">Carrito ({cartCount})</TabsTrigger>
              </TabsList>
              <TabsContent value="grid" className="space-y-6">
                {loading && products.length === 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">{Array.from({ length: 8 }).map((_, i) => <ProductSkeleton key={i} index={i} />)}</div>
                ) : filtered.length === 0 ? (
                  <div className="premium-glass rounded-2xl p-12 text-center max-w-3xl mx-auto">
                    <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-2xl"><Search className="w-7 h-7" /></div>
                    <h3 className="text-3xl font-bold mb-4"><span className="shimmer-title">Sin productos</span></h3>
                    <p className="text-white/80 mb-6">No hay stock disponible para la fecha seleccionada o tu búsqueda no coincide.</p>
                    <HeroButton variant="secondary" onClick={() => { setFilter(''); fetchAvailable(); }}>Reiniciar</HeroButton>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {filtered.map((p, idx) => {
                      const inCart = cart[p.product_id]?.qty || 0;
                      const stockDisponible = Math.max(0, p.cantidad_disponible - inCart);
                      const maxPuedeAgregar = Math.max(0, p.cantidad_disponible - inCart);
                      return (
                        <Card key={p.product_id} ref={el => tiltRefs.current[idx] = el} className="group overflow-hidden border-0 premium-glass hover-float relative" style={{opacity:0, animation:`fade-in 0.7s ease forwards ${idx * 0.06}s`}}>
                          <div className="relative overflow-hidden aspect-[4/3]">
                            {p.imagen_url ? <img src={p.imagen_url} alt={p.nombre} className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700" /> : <div className="w-full h-full bg-white/10 flex items-center justify-center text-4xl">🥖</div>}
                            <div className="absolute top-4 left-4 flex flex-col gap-2">
                              <Badge className="premium-glass-dark border-0 text-white px-3 py-1 text-xs">{p.categoria}</Badge>
                              {inCart > 0 && <Badge className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0 text-[10px] shadow">En carrito: {inCart}</Badge>}
                            </div>
                          </div>
                          <CardContent className="p-5 flex flex-col h-full space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <h3 className="text-lg font-semibold text-slate-800 leading-tight truncate" title={p.nombre}>{p.nombre}</h3>
                              <div className="text-xl font-bold shimmer-title whitespace-nowrap leading-none">{p.precio.toFixed(2)}€</div>
                            </div>
                            <div className="flex flex-wrap gap-1.5 text-[10px]">
                              <Badge variant="secondary" className="bg-white/50 text-slate-700">Stock: {p.cantidad_disponible}</Badge>
                              <Badge variant="secondary" className="bg-white/40 text-slate-700">Reservado: {p.reservado}</Badge>
                              <Badge variant="secondary" className={`text-white ${stockDisponible > 0 ? 'bg-blue-600' : 'bg-slate-400'}`}>{stockDisponible > 0 ? `Disponible: ${stockDisponible}` : 'Sin stock'}</Badge>
                            </div>
                            <div className="mt-auto flex items-center gap-2">
                              <HeroButton variant="hero" disabled={inCart===0} onClick={() => dec(p)} className="h-9 w-9 p-0"><Minus className="w-4 h-4" /></HeroButton>
                              <Input type="number" min={0} max={maxPuedeAgregar} value={inCart} onChange={e => { let v = parseInt(e.target.value, 10) || 0; v = Math.min(Math.max(v,0), maxPuedeAgregar); setCart(c => v === 0 ? (() => { const { [p.product_id]: _removed, ...rest } = c; return rest; })() : { ...c, [p.product_id]: { product_id: p.product_id, nombre: p.nombre, precio: p.precio, qty: v, restante: p.cantidad_disponible } }); }} className="h-9 w-16 text-center text-xs bg-white/70 backdrop-blur font-semibold" />
                              <HeroButton variant="secondary" disabled={stockDisponible<=0} onClick={() => inc(p)} className="h-9 w-9 p-0"><Plus className="w-4 h-4" /></HeroButton>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
              <TabsContent value="carrito" className="space-y-6">
                {cartCount === 0 ? (
                  <div className="premium-glass rounded-2xl p-12 text-center max-w-xl mx-auto">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xl"><ShoppingCart className="w-6 h-6" /></div>
                    <h3 className="text-2xl font-bold mb-3"><span className="shimmer-title">Carrito vacío</span></h3>
                    <p className="text-white/80 mb-6 text-sm">Agrega productos desde la pestaña Productos. El stock se ajusta automáticamente.</p>
                    <HeroButton variant="secondary" asChild><a href="#" onClick={(e) => { e.preventDefault(); document.querySelector('[data-value="grid"]')?.dispatchEvent(new Event('click')); }}>Explorar productos</a></HeroButton>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.values(cart).map((it, idx) => {
                      const currentProduct = products.find(p => p.product_id === it.product_id);
                      const maxStock = currentProduct?.cantidad_disponible || it.restante;
                      return (
                        <Card key={it.product_id} className="premium-glass border-0 p-0 overflow-hidden hover-float" style={{opacity:0, animation:`fade-in 0.6s ease forwards ${idx * 0.05}s`}}>
                          <CardContent className="p-4 flex items-center gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold text-slate-800 truncate" title={it.nombre}>{it.nombre}</div>
                              <div className="text-[11px] text-slate-600">x {it.qty} = {(it.qty * it.precio).toFixed(2)}€</div>
                            </div>
                            <div className="flex items-center gap-1">
                              <HeroButton variant="hero" disabled={it.qty===0} onClick={() => { if (currentProduct) dec(currentProduct); }} className="h-8 w-8 p-0"><Minus className="w-4 h-4" /></HeroButton>
                              <Input type="number" min={0} max={Math.max(0, maxStock - it.qty)} value={it.qty} onChange={e => { let v = parseInt(e.target.value, 10) || 0; v = Math.min(Math.max(v,0), maxStock); setCart(c => v === 0 ? (() => { const { [it.product_id]: _removed, ...rest } = c; return rest; })() : { ...c, [it.product_id]: { ...it, qty: v } }); }} className="h-8 w-16 text-center text-xs bg-white/70 backdrop-blur font-semibold" />
                              <HeroButton variant="secondary" disabled={it.qty >= maxStock} onClick={() => { if (currentProduct) inc(currentProduct); }} className="h-8 w-8 p-0"><Plus className="w-4 h-4" /></HeroButton>
                            </div>
                            <div className="w-20 text-right text-xs font-bold text-slate-800">{(it.qty * it.precio).toFixed(2)}€</div>
                          </CardContent>
                        </Card>
                      );
                    })}
                    <div className="premium-glass rounded-xl p-5 flex items-center justify-between">
                      <div className="text-sm font-semibold text-slate-700">Total</div>
                      <div className="text-xl font-bold shimmer-title">{total.toFixed(2)}€</div>
                    </div>
                    <div className="flex flex-col sm:flex-row justify-end gap-3 w-full">
                      <HeroButton variant="confirm" disabled={submitting} onClick={submit} className="min-w-[180px] h-12 text-base">
                        {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <ShoppingCart className="w-5 h-5 mr-2" />} Confirmar reserva
                      </HeroButton>
                      <HeroButton variant="confirm" onClick={() => navigate("/misreservas") } className="min-w-[180px] h-12 text-base bg-emerald-600 hover:bg-emerald-700">
                        Mis Reservas
                      </HeroButton>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Reservas;
