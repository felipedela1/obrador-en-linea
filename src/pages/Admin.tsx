import Navbar from "@/components/layout/Navbar";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ProductRow, ProductCategory } from "@/types/models";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { HeroButton } from "@/components/ui/hero-button";
import { useToast } from "@/components/ui/use-toast";
import { Upload, Plus, RefreshCw, Edit, Trash2, ImageIcon, Check, Loader2, AlertCircle } from "lucide-react";

// Simple perf log (dev only)
const logPerf = (label: string, info: Record<string, any>) => {
  if (!import.meta.env.DEV) return;
  const ts = new Date().toISOString();
  // eslint-disable-next-line no-console
  console.log(`[PERF][${ts}] ${label}`, info);
};

interface EditState {
  mode: "create" | "edit";
  product: Partial<ProductRow> | null;
  open: boolean;
}

const emptyProduct: Partial<ProductRow> = {
  nombre: "",
  slug: "",
  descripcion: "",
  precio: 0,
  categoria: "PANES" as ProductCategory,
  etiquetas: [],
  activo: true,
  destacado: false,
  imagen_url: null,
};

const Admin = () => {
  const { toast } = useToast();
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [edit, setEdit] = useState<EditState>({ mode: "create", product: emptyProduct, open: false });
  const [uploading, setUploading] = useState(false);
  const [filter, setFilter] = useState<string>("");
  // Nuevo: control de auto-slug
  const [slugAuto, setSlugAuto] = useState(true);
  // Estado de stock diario
  const [stockMap, setStockMap] = useState<Record<string, { value: number; original: number; saving: boolean; updated?: boolean; error?: string }>>({});
  const [stockLoading, setStockLoading] = useState(false);
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  // Helper para slug
  const slugify = (v: string) => v
    .toLowerCase()
    .normalize("NFD").replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  // Fetch stock diario para hoy
  const fetchStock = async () => {
    setStockLoading(true);
    const t0s = performance.now();
    // Intentar obtener ambos campos, pero manejar el error si cantidad_inicial no existe aún
    const { data, error } = await supabase
      .from("daily_stock")
      .select("product_id,cantidad_disponible")
      .eq("fecha", today);
    const t1s = performance.now();
    logPerf("admin.stock.fetch", { duration_ms: +(t1s - t0s).toFixed(1), count: data?.length || 0, hadError: !!error });
    if (error) {
      toast({ title: "Error cargando stock", description: error.message, variant: "destructive" });
      setStockLoading(false);
      return;
    }
    const map: Record<string, { value: number; original: number; saving: boolean }> = {};
    data?.forEach(r => {
      map[r.product_id] = { value: r.cantidad_disponible, original: r.cantidad_disponible, saving: false };
    });
    setStockMap(map);
    setStockLoading(false);
  };

  // Commit / upsert de stock (refactor: recibe valor para evitar leer estado potencialmente obsoleto, evita llamada si no cambió)
  const commitStock = async (productId: string, currentValue?: number) => {
    setStockMap(m => {
      const entry = m[productId] || { value: 0, original: 0, saving: false };
      const val = currentValue ?? entry.value;
      return { ...m, [productId]: { ...entry, value: val, saving: true, error: undefined, updated: false } };
    });
    // Usar snapshot tras el set (pero derivamos lo necesario de currentValue)
    const entrySnapshot = stockMap[productId];
    const value = currentValue ?? entrySnapshot?.value ?? 0;
    // Evitar llamada si no hubo cambios
    if (entrySnapshot && entrySnapshot.original === value) {
      setStockMap(m => ({
        ...m,
        [productId]: { ...m[productId], saving: false, updated: false }
      }));
      return;
    }
    const t0u = performance.now();
    // Intentar actualizar ambos campos, pero tener fallback si cantidad_inicial no existe
    let upsertData: any = { 
      product_id: productId, 
      fecha: today, 
      cantidad_disponible: value
    };
    
    // Intentar incluir cantidad_inicial solo si la columna existe
    try {
      upsertData.cantidad_inicial = value;
    } catch (e) {
      // Si falla, continuar solo con cantidad_disponible
      console.warn("cantidad_inicial column might not exist yet");
    }
    
    const { error, data } = await supabase
      .from("daily_stock")
      .upsert(upsertData, { onConflict: "product_id,fecha" })
      .select("product_id,cantidad_disponible")
      .single();
    const t1u = performance.now();
    logPerf("admin.stock.upsert", { productId, value, duration_ms: +(t1u - t0u).toFixed(1), hadError: !!error });
    if (error) {
      toast({ title: "Error guardando stock", description: error.message, variant: "destructive" });
      setStockMap(m => ({
        ...m,
        [productId]: { ...(m[productId] || { value, original: 0 }), saving: false, error: error.message }
      }));
      return;
    }
    const saved = data?.cantidad_disponible ?? value;
    setStockMap(m => ({
      ...m,
      [productId]: { value: saved, original: saved, saving: false, updated: true }
    }));
    setTimeout(() => setStockMap(m => {
      const e2 = m[productId];
      if (!e2) return m;
      return { ...m, [productId]: { ...e2, updated: false } };
    }), 1500);
  };

  const fetchProducts = async () => {
    setLoading(true);
    const t0 = performance.now();
    const { data, error } = await supabase.from("products").select("*").order("updated_at", { ascending: false });
    const t1 = performance.now();
    logPerf("admin.products.fetch", { duration_ms: +(t1 - t0).toFixed(1), count: data?.length || 0, hadError: !!error });
    if (error) {
      toast({ title: "Error cargando productos", description: error.message, variant: "destructive" });
    } else if (data) setProducts(data);
    setLoading(false);
  };

  useEffect(() => { fetchProducts(); }, []);
  // Cuando cambie el listado de productos (primera carga o refresh) cargamos stock
  useEffect(() => { if (products.length) fetchStock(); }, [products.length]);

  const openCreate = () => setEdit({ mode: "create", product: { ...emptyProduct }, open: true });
  const openEdit = (p: ProductRow) => setEdit({ mode: "edit", product: { ...p }, open: true });
  const closeDialog = () => setEdit(e => ({ ...e, open: false }));

  const saveProduct = async () => {
    if (!edit.product) return;
    const p = edit.product;
    if (!p.nombre || !p.slug) {
      toast({ title: "Faltan campos", description: "Nombre y slug son obligatorios", variant: "destructive" });
      return;
    }
    const payload: any = { nombre: p.nombre, slug: p.slug, descripcion: p.descripcion, precio: p.precio, categoria: p.categoria, etiquetas: p.etiquetas, activo: p.activo, destacado: p.destacado, imagen_url: p.imagen_url };
    const t0 = performance.now();
    let error;
    let data;
    if (edit.mode === "create") {
      const res = await supabase.from("products").insert(payload).select("id").single();
      error = res.error;
      data = res.data;
      logPerf("admin.products.insert", { payload, error, data });
    } else if (p.id) {
      const res = await supabase.from("products").update(payload).eq("id", p.id).select("id").single();
      error = res.error;
      data = res.data;
      logPerf("admin.products.update", { payload, error, data });
    }
    const t1 = performance.now();
    logPerf("admin.products.save", { mode: edit.mode, duration_ms: +(t1 - t0).toFixed(1), hadError: !!error });
    if (error) {
      toast({ title: "Error guardando", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Producto guardado" });
    closeDialog();
    fetchProducts();
  };

  const deleteProduct = async (p: ProductRow) => {
    if (!confirm(`Eliminar producto "${p.nombre}"?`)) return;
    const t0 = performance.now();
    const { error } = await supabase.from("products").delete().eq("id", p.id);
    const t1 = performance.now();
    logPerf("admin.products.delete", { id: p.id, duration_ms: +(t1 - t0).toFixed(1), hadError: !!error });
    if (error) {
      toast({ title: "Error eliminando", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Producto eliminado" });
    fetchProducts();
  };

  // Simulación de subida: se copia el archivo a /public manualmente fuera del runtime.
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      // Aquí normalmente subirías a supabase storage. Como pides guardar en /public, asumimos que el dev moverá el archivo.
      const sanitized = file.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
      const relativePath = `/${sanitized}`; // Referencia que el dev deberá colocar en public/
      setEdit(ed => ({ ...ed, product: { ...ed.product!, imagen_url: relativePath } }));
      toast({ title: "Imagen asignada", description: `Recuerda colocar ${sanitized} en public/` });
    } finally {
      setUploading(false);
    }
  };

  const filtered = products.filter(p => p.nombre.toLowerCase().includes(filter.toLowerCase()) || p.slug.toLowerCase().includes(filter.toLowerCase()));

  // Actualizar slug automáticamente mientras slugAuto esté activo y estemos creando
  useEffect(() => {
    if (edit.mode === "create" && slugAuto && edit.product?.nombre) {
      setEdit(e => ({ ...e, product: { ...e.product!, slug: slugify(e.product!.nombre || "") } }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edit.product?.nombre, edit.mode, slugAuto]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 pt-20 pb-10 container mx-auto px-4">
        {/* Header / acciones */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-bold">Panel de administración</h1>
            <p className="text-sm text-muted-foreground">Gestiona el catálogo de productos.</p>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <Input placeholder="Buscar..." value={filter} onChange={e => setFilter(e.target.value)} className="sm:w-56" />
            <div className="flex flex-col sm:flex-row gap-3 sm:ml-auto w-full sm:w-auto">
              <Button variant="outline" onClick={fetchProducts} disabled={loading} className="w-full sm:w-auto justify-center">
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" style={{ animationPlayState: loading ? 'running' : 'paused' }} />
                Refrescar
              </Button>
              <HeroButton variant="hero" onClick={openCreate} className="w-full sm:w-auto justify-center">
                <Plus className="w-4 h-4 mr-2" /> Nuevo
              </HeroButton>
            </div>
          </div>
        </div>

        {/* Floating Action Button en móvil */}
        <div className="md:hidden fixed bottom-20 right-4 z-40">
          <HeroButton variant="hero" className="rounded-full shadow-lg px-4 py-2" onClick={openCreate} aria-label="Nuevo producto">
            <Plus className="w-4 h-4" />
          </HeroButton>
        </div>

        {/* Tabs y listados */}
        <Tabs defaultValue="list" className="space-y-6">
          <TabsList>
            <TabsTrigger value="list">Listado</TabsTrigger>
            <TabsTrigger value="destacados">Destacados ({products.filter(p => p.destacado).length})</TabsTrigger>
            <TabsTrigger value="inactivos">Inactivos ({products.filter(p => !p.activo).length})</TabsTrigger>
          </TabsList>
          <TabsContent value="list" className="space-y-4">
            {stockLoading && (
              <div className="text-xs text-muted-foreground">Cargando stock diario...</div>
            )}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map(p => (
                <Card key={p.id} className="relative group overflow-hidden border-border/40 bg-card/60 backdrop-blur-sm">
                  <div className="aspect-video bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center overflow-hidden">
                    {p.imagen_url ? (
                      <img src={p.imagen_url} alt={p.nombre} className="object-cover w-full h-full" />
                    ) : (
                      <ImageIcon className="w-10 h-10 text-muted-foreground/40" />
                    )}
                  </div>
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-base font-semibold flex items-center justify-between gap-2">
                      <span className="truncate" title={p.nombre}>{p.nombre}</span>
                      <span className="text-primary font-bold">{p.precio.toFixed(2)}€</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-2 space-y-2">
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="secondary" className="text-[10px]">{p.categoria}</Badge>
                      {p.destacado && <Badge variant="default" className="text-[10px] bg-primary/90">Destacado</Badge>}
                      {!p.activo && <Badge variant="destructive" className="text-[10px]">Inactivo</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2.0rem]">{p.descripcion}</p>
                    {/* Stock diario */}
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        className="h-8 w-24 text-xs"
                        placeholder="Stock"
                        value={stockMap[p.id]?.value ?? ""}
                        onChange={e => {
                          const raw = e.target.value;
                          const num = Math.max(0, raw === "" ? 0 : parseInt(raw, 10) || 0);
                          setStockMap(m => ({
                            ...m,
                            [p.id]: { ...(m[p.id] || { original: 0, saving: false }), value: num }
                          }));
                        }}
                        onBlur={() => commitStock(p.id, stockMap[p.id]?.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.currentTarget.blur();
                          }
                        }}
                      />
                      {stockMap[p.id]?.saving && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                      {!stockMap[p.id]?.saving && stockMap[p.id]?.error && <AlertCircle data-error={stockMap[p.id]?.error} className="w-4 h-4 text-destructive" />}
                      {!stockMap[p.id]?.saving && !stockMap[p.id]?.error && stockMap[p.id]?.updated && <Check className="w-4 h-4 text-green-500" />}
                      {!stockMap[p.id] && !stockLoading && (
                        <span className="text-[10px] text-muted-foreground">—</span>
                      )}
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(p)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => deleteProduct(p)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="destacados">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.filter(p => p.destacado).map(p => (
                <Card key={p.id} className="border-border/40 bg-card/60 backdrop-blur-sm">
                  <CardHeader className="p-4 pb-2 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-sm font-medium"><span>{p.nombre}</span><span className="text-primary font-bold">{p.precio.toFixed(2)}€</span></div>
                    <div className="flex gap-1 flex-wrap">
                      <Badge variant="secondary" className="text-[10px]">{p.categoria}</Badge>
                      {!p.activo && <Badge variant="destructive" className="text-[10px]">Inactivo</Badge>}
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-2 text-xs text-muted-foreground line-clamp-3 min-h-[3.2rem]">{p.descripcion}</CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="inactivos">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.filter(p => !p.activo).map(p => (
                <Card key={p.id} className="border-border/40 bg-card/60 backdrop-blur-sm">
                  <CardHeader className="p-4 pb-2 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-sm font-medium"><span>{p.nombre}</span><span className="text-primary font-bold">{p.precio.toFixed(2)}€</span></div>
                    <div className="flex gap-1 flex-wrap">
                      <Badge variant="secondary" className="text-[10px]">{p.categoria}</Badge>
                      {p.destacado && <Badge variant="default" className="text-[10px] bg-primary/90">Destacado</Badge>}
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-2 text-xs text-muted-foreground line-clamp-3 min-h-[3.2rem]">{p.descripcion}</CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Dialog de edición / creación */}
        <Dialog open={edit.open} onOpenChange={o => setEdit(e => ({ ...e, open: o }))}>
          <DialogContent className="max-w-2xl w-full sm:rounded-lg">
            <DialogHeader>
              <DialogTitle className="pr-8 flex flex-col gap-1">
                {edit.mode === "create" ? "Nuevo producto" : `Editar: ${edit.product?.nombre}`}
                <span className="text-xs font-normal text-muted-foreground">Rellena la información y guarda.</span>
              </DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-2 max-h-[70vh] overflow-y-auto pr-1 md:pr-2">
              {/* Columna izquierda */}
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input value={edit.product?.nombre || ""} onChange={e => setEdit(ed => ({ ...ed, product: { ...ed.product!, nombre: e.target.value } }))} placeholder="Ej: Baguette de masa madre" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Slug</Label>
                    <button type="button" onClick={() => setSlugAuto(v => !v)} className="text-[10px] px-2 py-0.5 rounded border border-border/50 hover:bg-muted/40">
                      {slugAuto ? "Auto" : "Manual"}
                    </button>
                  </div>
                  <Input value={edit.product?.slug || ""} disabled={slugAuto} onChange={e => setEdit(ed => ({ ...ed, product: { ...ed.product!, slug: e.target.value } }))} placeholder="baguette-masa-madre" />
                  {slugAuto && <p className="text-[10px] text-muted-foreground">Se genera automáticamente a partir del nombre.</p>}
                </div>
                <div className="space-y-2">
                  <Label>Descripción</Label>
                  <Textarea value={edit.product?.descripcion || ""} onChange={e => setEdit(ed => ({ ...ed, product: { ...ed.product!, descripcion: e.target.value } }))} placeholder="Breve descripción del producto" className="min-h-[110px]" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Precio (€)</Label>
                    <Input type="number" step="0.01" inputMode="decimal" value={edit.product?.precio ?? 0} onChange={e => setEdit(ed => ({ ...ed, product: { ...ed.product!, precio: parseFloat(e.target.value) || 0 } }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Categoría</Label>
                    <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={edit.product?.categoria} onChange={e => setEdit(ed => ({ ...ed, product: { ...ed.product!, categoria: e.target.value as ProductCategory } }))}>
                      <option value="PANES">Panes</option>
                      <option value="BOLLERIA">Bollería</option>
                      <option value="TARTAS">Tartas</option>
                      <option value="ESPECIALES">Especiales</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Etiquetas (separadas por coma)</Label>
                  <Input value={(edit.product?.etiquetas || []).join(",")} onChange={e => setEdit(ed => ({ ...ed, product: { ...ed.product!, etiquetas: e.target.value.split(",").map(t => t.trim()).filter(Boolean) } }))} placeholder="artesano, integral, ecológico" />
                </div>
              </div>

              {/* Columna derecha */}
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label>Imagen (ruta en /public)</Label>
                  <Input type="text" placeholder="/mi-imagen.jpg" value={edit.product?.imagen_url || ""} onChange={e => setEdit(ed => ({ ...ed, product: { ...ed.product!, imagen_url: e.target.value } }))} />
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <Upload className="w-3 h-3" /> Copia el archivo a /public y referencia aquí.
                  </div>
                  <div className="space-y-2 mt-3">
                    <Label className="text-xs">O seleccionar archivo (simulado)</Label>
                    <Input type="file" accept="image/*" onChange={handleImageSelect} disabled={uploading} />
                  </div>
                  {edit.product?.imagen_url && (
                    <div className="mt-3 rounded-md overflow-hidden border border-border/40 bg-muted/20">
                      <div className="aspect-video w-full bg-muted/40 flex items-center justify-center overflow-hidden">
                        <img src={edit.product.imagen_url} alt="Vista previa" className="object-cover w-full h-full" />
                      </div>
                      <div className="text-[10px] p-2 break-all text-center text-muted-foreground">{edit.product.imagen_url}</div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2">
                    <Label htmlFor="activo" className="text-xs">Activo</Label>
                    <Switch id="activo" checked={!!edit.product?.activo} onCheckedChange={v => setEdit(ed => ({ ...ed, product: { ...ed.product!, activo: v } }))} />
                  </div>
                  <div className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2">
                    <Label htmlFor="destacado" className="text-xs">Destacado</Label>
                    <Switch id="destacado" checked={!!edit.product?.destacado} onCheckedChange={v => setEdit(ed => ({ ...ed, product: { ...ed.product!, destacado: v } }))} />
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2 opacity-50">
                  <Label htmlFor="reservable" className="text-xs">Reservable</Label>
                  <Switch id="reservable" disabled />
                </div>

                <div className="pt-2 flex flex-col sm:flex-row justify-end gap-2">
                  <Button variant="outline" className="w-full sm:w-auto" onClick={closeDialog}>Cancelar</Button>
                  <HeroButton variant="secondary" className="w-full sm:w-auto" onClick={saveProduct}>
                    {edit.mode === "create" ? "Crear" : "Guardar"}
                  </HeroButton>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default Admin;
