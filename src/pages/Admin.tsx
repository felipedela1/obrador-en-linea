import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/sections/Footer";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ProductRow, ProductCategory } from "@/types/models";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"; // fixed path
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { HeroButton } from "@/components/ui/hero-button";
import { useToast } from "@/components/ui/use-toast";
import { Upload, Plus, RefreshCw, ImageIcon, Check, Loader2, AlertCircle, Sparkles, Search, Package, XCircle } from "lucide-react";
import { Link } from "react-router-dom"; // <-- nuevo
import { Checkbox } from "@/components/ui/checkbox";
// NUEVO: AlertDialog para confirmaciones bonitas
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Helmet } from 'react-helmet-async';
import { useAuth } from "@/contexts/AuthContext";

// Simple perf log (dev only)
const logPerf = (label: string, info: Record<string, any>) => {
  if (!import.meta.env.DEV) return;
  const ts = new Date().toISOString();
  // eslint-disable-next-line no-console
  console.log(`[PERF][${ts}] ${label}`, info);
};

// Skeleton premium para productos
const ProductSkeleton = ({ index }: { index: number }) => (
  <Card className="relative overflow-hidden border-0 premium-glass animate-pulse" style={{ animationDelay: `${index * 90}ms` }}>
    <div className="relative aspect-video w-full bg-white/10 flex items-center justify-center">
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400/30 to-indigo-400/30" />
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/0" />
    </div>
    <CardContent className="p-4 space-y-3">
      <div className="h-5 w-2/3 bg-white/30 rounded" />
      <div className="h-3 w-full bg-white/20 rounded" />
      <div className="h-3 w-5/6 bg-white/20 rounded" />
      <div className="flex gap-2 pt-1">
        <div className="h-5 w-16 bg-white/20 rounded-full" />
        <div className="h-5 w-20 bg-white/20 rounded-full" />
      </div>
      <div className="h-8 w-full bg-blue-500/20 rounded-xl mt-2" />
    </CardContent>
  </Card>
);

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
  // Verificar autenticación y permisos de admin
  const { isLogged, authLoading, user, profileRole } = useAuth();

  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [edit, setEdit] = useState<EditState>({ mode: "create", product: emptyProduct, open: false });
  const [uploading, setUploading] = useState(false);
  const [filter, setFilter] = useState<string>("");
  const [slugAuto, setSlugAuto] = useState(true);
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

  // Métricas rápidas
  const total = products.length;
  const activos = products.filter(p => p.activo).length;
  const inactivos = products.filter(p => !p.activo).length;
  const destacados = products.filter(p => p.destacado).length;

  // Actualizar slug automáticamente
  useEffect(() => {
    if (edit.mode === "create" && slugAuto && edit.product?.nombre) {
      setEdit(e => ({ ...e, product: { ...e.product!, slug: slugify(e.product!.nombre || "") } }));
    }
  }, [edit.product?.nombre, edit.mode, slugAuto]);

  const filtered = products.filter(p => p.nombre.toLowerCase().includes(filter.toLowerCase()) || p.slug.toLowerCase().includes(filter.toLowerCase()));

  // Controlar Tabs para poder ir al panel de reservas con un botón
  const [activeTab, setActiveTab] = useState<"list" | "destacados" | "inactivos" | "reservas">("list");

  // --- NUEVO: Tipos y estado del panel de reservas (alineado con MisReservas) ---
  // --- NUEVO: estados válidos según BD y type guard ---
  const ESTADOS = ["PENDIENTE","PREPARADO","RETIRADO","CANCELADO"] as const;
  type EstadoExacto = typeof ESTADOS[number];
  const isEstadoExacto = (x: string): x is EstadoExacto => (ESTADOS as readonly string[]).includes(x as any);

  type AdminReserva = {
    id: string;
    user_id: string;
    codigo: string;
    estado: "PENDIENTE" | "PREPARADO" | "RETIRADO" | "CANCELADO" | string;
    fecha_recogida: string | null;
    franja_horaria: string | null;
    notas: string | null;
    total: number;
    created_at: string;
  };
  type ProfileBasic = { user_id: string; nombre: string | null; email?: string | null };

  const [reservas, setReservas] = useState<AdminReserva[]>([]);
  const [reservasLoading, setReservasLoading] = useState(false);
  const [reservasProfiles, setReservasProfiles] = useState<Record<string, ProfileBasic>>({});
  const [reservasError, setReservasError] = useState<string | null>(null);

  // NUEVO: selección y guardado por-reserva
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [savingIds, setSavingIds] = useState<Record<string, boolean>>({});

  const toggleSelected = (id: string, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  };
  const clearSelection = () => setSelectedIds(new Set());

  const canAccept = (r: AdminReserva) => r.estado === "PENDIENTE";
  const canCancel = (r: AdminReserva) => r.estado !== "CANCELADO" && r.estado !== "RETIRADO";

  const updateReservaEstado = async (id: string, next: EstadoExacto) => {
    setSavingIds(m => ({ ...m, [id]: true }));
    const { error } = await supabase.from("reservations").update({ estado: next }).eq("id", id);
    if (error) {
      toast({ title: "Error actualizando reserva", description: error.message, variant: "destructive" });
      setSavingIds(m => ({ ...m, [id]: false }));
      return;
    }
    setReservas(list => list.map(r => (r.id === id ? { ...r, estado: next } : r)));
    setSavingIds(m => ({ ...m, [id]: false }));
    toast({ title: "Reserva actualizada", description: `Estado: ${next}` });
  };

  // NUEVO: estado y handlers para confirmación bonita de acciones por lotes
  const [batchConfirm, setBatchConfirm] = useState<{ open: boolean; type: "accept" | "cancel" | null; eligible: string[]; totalSelected: number }>({ open: false, type: null, eligible: [], totalSelected: 0 });

  const openBatchConfirm = (action: "accept" | "cancel") => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const eligibles = reservas
      .filter(r => ids.includes(r.id))
      .filter(r => (action === "accept" ? canAccept(r) : canCancel(r)));

    if (eligibles.length === 0) {
      toast({ title: "Sin reservas válidas", description: "La selección no tiene reservas en estado compatible.", variant: "destructive" });
      return;
    }

    setBatchConfirm({ open: true, type: action, eligible: eligibles.map(r => r.id), totalSelected: ids.length });
  };

  const batchAction = async (action: "accept" | "cancel", ids: string[]) => {
    if (!ids || ids.length === 0) return;
    const target: EstadoExacto = action === "accept" ? "PREPARADO" : "CANCELADO";

    const eligibles = reservas.filter(r => ids.includes(r.id)).filter(r => action === "accept" ? canAccept(r) : canCancel(r));
    if (eligibles.length === 0) {
      toast({ title: "Sin reservas válidas", description: "La selección no tiene reservas en estado compatible.", variant: "destructive" });
      return;
    }

    // Marcar guardado
    setSavingIds(m => {
      const next = { ...m };
      for (const r of eligibles) next[r.id] = true;
      return next;
    });

    const updates = await Promise.all(eligibles.map(async r => {
      const { error } = await supabase.from("reservations").update({ estado: target }).eq("id", r.id);
      return { id: r.id, error };
    }));

    const hadErrors = updates.some(u => u.error);
    if (hadErrors) {
      const msg = updates.filter(u => u.error).map(u => u.error!.message).slice(0, 3).join(" | ") || "Error parcial";
      toast({ title: "Errores en el lote", description: msg, variant: "destructive" });
    }

    const updatedIds = updates.filter(u => !u.error).map(u => u.id);
    if (updatedIds.length) {
      setReservas(list => list.map(r => (updatedIds.includes(r.id) ? { ...r, estado: target } : r)));
    }

    // Desmarcar guardado y limpiar selección aplicada
    setSavingIds(m => {
      const next = { ...m };
      for (const u of updates) next[u.id] = false;
      return next;
    });
    setSelectedIds(prev => {
      const next = new Set(prev);
      for (const id of updatedIds) next.delete(id);
      return next;
    });

    // Cerrar el diálogo de confirmación
    setBatchConfirm({ open: false, type: null, eligible: [], totalSelected: 0 });

    toast({ title: "Acción por lotes completada", description: `${updatedIds.length} actualizada(s) a ${target}` });
  };

  // filtros
  const [rFrom, setRFrom] = useState<string>("");      // YYYY-MM-DD
  const [rTo, setRTo] = useState<string>("");          // YYYY-MM-DD
  const [rEstado, setREstado] = useState<"todas" | "activas" | "historico" | "PENDIENTE" | "PREPARADO" | "RETIRADO" | "CANCELADO">("todas");
  const [rSearch, setRSearch] = useState<string>("");

  // Mapeo de badges
  const estadoInfo: Record<string, { label: string; className: string }> = {
    PENDIENTE:  { label: "Pendiente",  className: "bg-amber-500/80 text-white border-0" },
    PREPARADO:  { label: "Preparado",  className: "bg-blue-500/80 text-white border-0" },
    RETIRADO:   { label: "Retirado",   className: "bg-emerald-500/80 text-white border-0" },
    CANCELADO:  { label: "Cancelado",  className: "bg-red-500/80 text-white border-0" },
  };

  // Consulta principal con filtros de fecha/estado en servidor
  const fetchReservas = async () => {
    setReservasLoading(true);
    setReservasError(null);

    let q = supabase
      .from("reservations")
      .select("id,user_id,codigo,estado,fecha_recogida,franja_horaria,notas,total,created_at")
      .order("created_at", { ascending: false });

    // Filtros por estado
    if (rEstado === "activas") {
      q = q.in("estado", ["PENDIENTE", "PREPARADO"]);
    } else if (rEstado === "historico") {
      q = q.in("estado", ["RETIRADO", "CANCELADO"]);
    } else if (isEstadoExacto(rEstado)) {
      q = q.eq("estado", rEstado);
    }

    // Filtros de fecha
    if (rFrom) q = q.gte("created_at", `${rFrom}T00:00:00.000Z`);
    if (rTo)   q = q.lte("created_at", `${rTo}T23:59:59.999Z`);

    const { data: resRows, error: resErr } = await q;
    if (resErr) {
      setReservasLoading(false);
      setReservasError(resErr.message);
      toast({ title: "Error cargando reservas", description: resErr.message, variant: "destructive" });
      return;
    }

    const rows = (resRows as AdminReserva[]) || [];
    setReservas(rows);
    setSelectedIds(new Set()); // limpiar selección al recargar

    // Perfiles de los usuarios implicados
    const userIds = Array.from(new Set(rows.map(r => r.user_id))).filter(Boolean);
    if (userIds.length) {
      const { data: profs, error: profErr } = await supabase
        .from("profiles")
        .select("user_id,nombre,email")
        .in("user_id", userIds);
      if (!profErr && profs) {
        const map: Record<string, ProfileBasic> = {};
        for (const p of profs as ProfileBasic[]) map[p.user_id] = p;
        setReservasProfiles(map);
      }
    }

    setReservasLoading(false);
  };

  useEffect(() => { fetchReservas(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);
  // --- FIN NUEVO ---

  // Verificar autenticación y permisos de admin
  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xl">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Iniciando sesión automáticamente...</h2>
            <p className="text-gray-600">Por favor espera mientras te conectamos con tu cuenta.</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!isLogged) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-red-600 to-red-600 flex items-center justify-center text-white shadow-xl">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Acceso denegado</h2>
            <p className="text-gray-600">Debes estar autenticado para acceder al panel de administración.</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (profileRole !== 'admin') {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-red-600 to-red-600 flex items-center justify-center text-white shadow-xl">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Acceso restringido</h2>
            <p className="text-gray-600">Solo los administradores pueden acceder a esta página.</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>Panel de Administración - Obrador d'Luis</title>
        <meta name="description" content="Panel de control para gestión de productos, stock y reservas de la panadería artesanal vasca." />
        <meta name="robots" content="noindex, nofollow" />
        <meta name="author" content="Obrador d'Luis" />
        <meta name="language" content="es-ES" />
      </Helmet>
      <Navbar />
      <main className="flex-1 pt-0 pb-28">
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
              <span className="tracking-wider">PANEL ADMIN</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight"><span className="shimmer-title">Administración</span></h1>
            <p className="text-xl md:text-2xl text-black/90 max-w-3xl mx-auto leading-relaxed font-light">Gestiona catálogo, stock diario y atributos destacados con una experiencia visual consistente.</p>
            <div className="h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent max-w-64 mx-auto mt-8" />
          </div>
        </section>

        {/* CONTROLES / RESUMEN */}
        <section className="relative py-2">
          <div className="container mx-auto px-6">
            <div className="premium-glass rounded-2xl p-6 md:p-8 gradient-border space-y-6" style={{ opacity: 0, animation: 'fade-in 0.8s ease forwards 0.15s' }}>
              <div className="flex flex-col xl:flex-row gap-8 items-start xl:items-end justify-between">
                <div className="w-full xl:w-auto space-y-6">
                  <div className="flex flex-wrap gap-3">
                    <Badge variant="secondary" className="bg-white/50 text-slate-800 rounded-full px-4 py-1">Total: {total}</Badge>
                    <Badge variant="secondary" className="bg-white/40 text-slate-700 rounded-full">Activos: {activos}</Badge>
                    <Badge variant="secondary" className="bg-white/40 text-slate-700 rounded-full">Inactivos: {inactivos}</Badge>
                    <Badge variant="secondary" className="bg-white/40 text-slate-700 rounded-full">Destacados: {destacados}</Badge>
                  </div>
                  <div className="flex flex-col md:flex-row gap-4 w-full">
                    <div className="relative md:w-72">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-600 w-4 h-4" />
                      <Input placeholder="Buscar productos..." aria-label="Buscar productos" value={filter} onChange={e => setFilter(e.target.value)} className="pl-12 bg-white/60 backdrop-blur placeholder:text-slate-500" />
                    </div>
                    <div className="relative md:w-48">
                      <Input type="date" value={today} disabled className="bg-white/50 text-slate-600" aria-label="Fecha (referencia stock)" />
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                  {/* Botón que abre el panel de Reservas dentro de Admin */}
                  <HeroButton
                    variant="secondary"
                    onClick={() => {
                      setActiveTab("reservas");
                      // Llevar la vista hasta el panel
                      setTimeout(() => document.getElementById("admin-tabs")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
                    }}
                    className="flex items-center h-10 bg-amber-500 hover:bg-amber-600 text-white border-0"
                  >
                    <Package className="w-4 h-4 mr-2" />
                    Reservas
                  </HeroButton>

                  <HeroButton variant="secondary" onClick={fetchProducts} disabled={loading} className="flex items-center h-10">
                    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />} Refrescar
                  </HeroButton>

                  {/* + Nuevo con fondo más visible */}
                  <HeroButton
                    variant="hero"
                    onClick={openCreate}
                    className="flex items-center h-10 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Nuevo
                  </HeroButton>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* LISTADO TABS */}
        <section id="admin-tabs" className="relative pt-4">
          <div className="container mx-auto px-6" style={{ opacity: 0, animation: 'fade-in 0.8s ease forwards 0.25s' }}>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-8">
              <TabsList className="premium-glass gradient-border">
                <TabsTrigger value="list">Listado ({filtered.length})</TabsTrigger>
                <TabsTrigger value="destacados">Destacados ({destacados})</TabsTrigger>
                <TabsTrigger value="inactivos">Inactivos ({inactivos})</TabsTrigger>
                {/* Eliminado: <TabsTrigger value="reservas">Reservas</TabsTrigger> */}
              </TabsList>

              <TabsContent value="list" className="space-y-6">
                {loading && products.length === 0 ? (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <ProductSkeleton key={i} index={i} />)}</div>
                ) : filtered.length === 0 ? (
                  <div className="premium-glass rounded-2xl p-12 text-center max-w-3xl mx-auto">
                    <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-2xl"><Package className="w-7 h-7" /></div>
                    <h3 className="text-3xl font-bold mb-4"><span className="shimmer-title">Sin resultados</span></h3>
                    <p className="text-black/80 mb-6">No hay productos que coincidan con la búsqueda actual.</p>
                    <HeroButton variant="secondary" onClick={() => setFilter("")}>Reiniciar filtro</HeroButton>
                  </div>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filtered.map((p, idx) => (
                      <Card key={p.id} className="relative group overflow-hidden border-0 premium-glass hover-float" style={{ opacity: 0, animation: `fade-in 0.7s ease forwards ${idx * 0.05}s` }}>
                        <div className="aspect-video bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center overflow-hidden">
                          {p.imagen_url ? (
                            <img src={p.imagen_url} alt={p.nombre} className="object-cover w-full h-full transform group-hover:scale-105 transition-transform duration-700" />
                          ) : (
                            <ImageIcon className="w-10 h-10 text:white/50" />
                          )}
                          <div className="absolute top-3 left-3 flex flex-col gap-2">
                            <Badge className="premium-glass-dark border-0 text-white px-3 py-1 text-[10px]">{p.categoria}</Badge>
                            {p.destacado && <Badge className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0 text-[10px] shadow">Destacado</Badge>}
                            {!p.activo && <Badge className="bg-red-500/80 text-white border-0 text-[10px] shadow">Inactivo</Badge>}
                          </div>
                        </div>
                        <CardHeader className="p-4 pb-2">
                          <CardTitle className="text-base font-semibold flex items-center justify-between gap-2">
                            <span className="truncate text-slate-800" title={p.nombre}>{p.nombre}</span>
                            <span className="text-lg font-bold shimmer-title whitespace-nowrap">{p.precio.toFixed(2)}€</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-2 space-y-3">
                          <p className="text-xs text-slate-700 line-clamp-2 min-h-[2.0rem]">{p.descripcion}</p>
                          {/* Stock diario */}
                          <div className="flex items:center gap-2">
                            <Input
                              type="number"
                              inputMode="numeric"
                              min={0}
                              className="h-8 w-24 text-xs bg-white/70 backdrop-blur font-semibold"
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
                              onKeyDown={e => { if (e.key === 'Enter') { e.currentTarget.blur(); } }}
                              aria-label={`Stock disponible ${p.nombre}`}
                            />
                            {stockMap[p.id]?.saving && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
                            {!stockMap[p.id]?.saving && stockMap[p.id]?.error && <AlertCircle data-error={stockMap[p.id]?.error} className="w-4 h-4 text-red-500" />}
                            {!stockMap[p.id]?.saving && !stockMap[p.id]?.error && stockMap[p.id]?.updated && <Check className="w-4 h-4 text-green-500" />}
                            {!stockMap[p.id] && !stockLoading && (
                              <span className="text-[10px] text-slate-500">—</span>
                            )}
                          </div>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <HeroButton variant="hero" className="h-8 px-3 text-[11px]" onClick={() => openEdit(p)}>Editar</HeroButton>
                            <HeroButton variant="secondary" className="h-8 px-3 text-[11px]" onClick={() => deleteProduct(p)}>Borrar</HeroButton>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
              <TabsContent value="destacados">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {products.filter(p => p.destacado).map((p, idx) => (
                    <Card key={p.id} className="premium-glass border-0 overflow-hidden hover-float" style={{ opacity: 0, animation: `fade-in 0.6s ease forwards ${idx * 0.05}s` }}>
                      <CardHeader className="p-4 pb-2 flex flex-col gap-2">
                        <div className="flex items-center justify-between text-sm font-medium text-slate-800"><span className="truncate" title={p.nombre}>{p.nombre}</span><span className="shimmer-title font-bold">{p.precio.toFixed(2)}€</span></div>
                        <div className="flex gap-1 flex-wrap">
                          <Badge variant="secondary" className="bg:white/50 text-slate-700 text-[10px]">{p.categoria}</Badge>
                          {!p.activo && <Badge className="bg-red-500/80 text-white text-[10px]">Inactivo</Badge>}
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 pt-2 text-xs text-slate-700 line-clamp-3 min-h-[3.2rem]">{p.descripcion}</CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="inactivos">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {products.filter(p => !p.activo).map((p, idx) => (
                    <Card key={p.id} className="premium-glass border-0 overflow-hidden hover-float" style={{ opacity: 0, animation: `fade-in 0.6s ease forwards ${idx * 0.05}s` }}>
                      <CardHeader className="p-4 pb-2 flex flex-col gap-2">
                        <div className="flex items-center justify-between text-sm font-medium text-slate-800"><span className="truncate" title={p.nombre}>{p.nombre}</span><span className="shimmer-title font-bold">{p.precio.toFixed(2)}€</span></div>
                        <div className="flex gap-1 flex-wrap">
                          <Badge variant="secondary" className="bg-white/50 text-slate-700 text-[10px]">{p.categoria}</Badge>
                          {p.destacado && <Badge className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px]">Destacado</Badge>}
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 pt-2 text-xs text-slate-700 line-clamp-3 min-h-[3.2rem]">{p.descripcion}</CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Panel de Reservas (acceso por botón, sin pestaña visible) */}
              <TabsContent value="reservas" className="space-y-6">
                {/* Filtros */}
                <div className="premium-glass rounded-2xl p-4 flex flex-col lg:flex-row gap-4 lg:items-end">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-600">Desde</label>
                      <Input type="date" value={rFrom} onChange={e => setRFrom(e.target.value)} className="bg-white/70" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-600">Hasta</label>
                      <Input type="date" value={rTo} onChange={e => setRTo(e.target.value)} className="bg-white/70" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-600">Estado</label>
                      <select
                        className="w-full rounded-md border border-input bg-background/70 px-3 py-2 text-sm"
                        value={rEstado}
                        onChange={e => setREstado(e.target.value as any)}
                      >
                        <option value="todas">Todas</option>
                        <option value="activas">Activas (Pendiente/Preparado)</option>
                        <option value="historico">Histórico (Retirado/Cancelado)</option>
                        <option value="PENDIENTE">Pendiente</option>
                        <option value="PREPARADO">Preparado</option>
                        <option value="RETIRADO">Retirado</option>
                        <option value="CANCELADO">Cancelado</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-600">Buscar</label>
                      <Input
                        placeholder="Código, cliente o email..."
                        value={rSearch}
                        onChange={e => setRSearch(e.target.value)}
                        className="bg-white/70"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => { setRFrom(""); setRTo(""); setREstado("todas"); setRSearch(""); }}>Limpiar</Button>
                    <Button onClick={fetchReservas} disabled={reservasLoading}>
                      {reservasLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />} Aplicar
                    </Button>
                  </div>
                </div>

                {/* Resumen */}
                <div className="flex items-center justify-between">
                  <div className="flex gap-2 text-sm text-slate-700">
                    <Badge variant="secondary" className="bg-white/60">Total: {reservas.length}</Badge>
                    <Badge variant="secondary" className="bg-white/60">Activas: {reservas.filter(r => ["PENDIENTE","PREPARADO"].includes(r.estado)).length}</Badge>
                    <Badge variant="secondary" className="bg-white/60">Histórico: {reservas.filter(r => ["RETIRADO","CANCELADO"].includes(r.estado)).length}</Badge>
                  </div>
                  <div className="text-xs text-slate-500">Filtrado en servidor (fecha/estado) y cliente (búsqueda)</div>
                </div>

                {/* NUEVO: barra de acciones por lotes */}
                <div className="premium-glass rounded-xl p-3 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                  <div className="text-sm text-slate-700">Seleccionadas: <span className="font-semibold">{selectedIds.size}</span></div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={() => openBatchConfirm("accept")}
                      disabled={selectedIds.size === 0}
                      className="min-w-[12rem]"
                    >
                      {reservas.some(r => selectedIds.has(r.id) && savingIds[r.id]) ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4 mr-2" />
                      )}
                      Aceptar seleccionadas
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => openBatchConfirm("cancel")}
                      disabled={selectedIds.size === 0}
                      className="min-w-[12rem]"
                    >
                      {reservas.some(r => selectedIds.has(r.id) && savingIds[r.id]) ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <XCircle className="w-4 h-4 mr-2" />
                      )}
                      Cancelar seleccionadas
                    </Button>
                    <Button variant="ghost" onClick={clearSelection}>Limpiar selección</Button>
                  </div>
                </div>

                {/* Lista filtrada por búsqueda */}
                {(() => {
                  const term = rSearch.trim().toLowerCase();
                  const list = term
                    ? reservas.filter(r => {
                        const prof = reservasProfiles[r.user_id];
                        return (
                          r.codigo?.toLowerCase().includes(term) ||
                          prof?.nombre?.toLowerCase().includes(term) ||
                          prof?.email?.toLowerCase().includes(term)
                        );
                      })
                    : reservas;

                  if (reservasLoading && reservas.length === 0) {
                    return (
                      <div className="premium-glass rounded-2xl p-12 text-center">
                        <Loader2 className="w-5 h-5 mx-auto animate-spin text-blue-600" />
                        <p className="mt-3 text-sm text-slate-700">Cargando reservas…</p>
                      </div>
                    );
                  }

                  if (list.length === 0) {
                    return (
                      <div className="premium-glass rounded-2xl p-12 text-center max-w-3xl mx-auto">
                        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-2xl">
                          <Package className="w-7 h-7" />
                        </div>
                        <h3 className="text-3xl font-bold mb-4"><span className="shimmer-title">Sin reservas</span></h3>
                        <p className="text-black/80 mb-2">No hay reservas que coincidan con los filtros.</p>
                      </div>
                    );
                  }

                  return (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {list.map((r, idx) => {
                        const prof = reservasProfiles[r.user_id];
                        const nombre = prof?.nombre || "Usuario";
                        const email = prof?.email || "";
                        const badge = estadoInfo[r.estado] || { label: r.estado, className: "bg-slate-500/80 text-white border-0" };
                        const isSaving = !!savingIds[r.id];
                        return (
                          <Card key={r.id} className="premium-glass border-0 overflow-hidden hover-float" style={{ opacity: 0, animation: `fade-in 0.6s ease forwards ${idx * 0.04}s` }}>
                            <CardHeader className="p-4 pb-2 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={selectedIds.has(r.id)}
                                  onCheckedChange={(c) => toggleSelected(r.id, !!c)}
                                  aria-label="Seleccionar reserva"
                                />
                                <CardTitle className="text-base font-semibold text-slate-800">Reserva {r.codigo || r.id.slice(0, 8)}</CardTitle>
                              </div>
                              <Badge className={badge.className}>{badge.label}</Badge>
                            </CardHeader>
                            <CardContent className="p-4 pt-2 text-sm text-slate-700 space-y-1">
                              <div className="flex justify-between">
                                <span className="text-slate-600">Cliente</span>
                                <span className="font-medium">{nombre}</span>
                              </div>
                              {email && (
                                <div className="flex justify-between">
                                  <span className="text-slate-600">Email</span>
                                  <span className="font-medium">{email}</span>
                                </div>
                              )}
                              <div className="flex justify-between">
                                <span className="text-slate-600">Creada</span>
                                <span className="font-medium">{new Date(r.created_at).toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-600">Recogida</span>
                                <span className="font-medium">{r.fecha_recogida ? new Date(r.fecha_recogida).toLocaleDateString() : "—"}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-600">Total</span>
                                <span className="font-bold shimmer-title">{(r.total || 0).toFixed(2)}€</span>
                              </div>
                            </CardContent>
                            <CardFooter className="p-4 pt-0 flex items-center justify-between">
                              <Button
                                variant="outline"
                                className="h-8"
                                onClick={() => updateReservaEstado(r.id, "CANCELADO")}
                                disabled={!canCancel(r) || isSaving}
                              >
                                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
                                Cancelar
                              </Button>
                              <Button
                                className="h-8"
                                onClick={() => updateReservaEstado(r.id, "PREPARADO")}
                                disabled={!canAccept(r) || isSaving}
                              >
                                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                                Aceptar
                              </Button>
                            </CardFooter>
                          </Card>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* Diálogo de confirmación para acciones por lotes */}
                <AlertDialog open={batchConfirm.open} onOpenChange={(o) => setBatchConfirm(prev => ({ ...prev, open: o }))}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {batchConfirm.type === 'cancel' ? 'Cancelar reservas seleccionadas' : 'Aceptar reservas seleccionadas'}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {batchConfirm.type === 'cancel'
                          ? 'Esta acción cancelará las reservas elegibles seleccionadas. No podrás revertir esta acción.'
                          : 'Se marcarán como PREPARADO las reservas elegibles seleccionadas.'}
                        <br />
                        <span className="block mt-2 text-slate-700">
                          Seleccionadas: <strong>{batchConfirm.totalSelected}</strong> · Elegibles: <strong>{batchConfirm.eligible.length}</strong>
                        </span>
                        {batchConfirm.eligible.length > 0 && (
                          <span className="block mt-2 text-xs text-slate-500">
                            Previsualización: {
                              reservas
                                .filter(r => batchConfirm.eligible.includes(r.id))
                                .slice(0, 5)
                                .map(r => r.codigo || r.id.slice(0, 8))
                                .join(', ')
                            }
                            {reservas.filter(r => batchConfirm.eligible.includes(r.id)).length > 5 ? '…' : ''}
                          </span>
                        )}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Volver</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => batchAction(batchConfirm.type === 'cancel' ? 'cancel' : 'accept', batchConfirm.eligible)}
                        className={batchConfirm.type === 'cancel' ? 'bg-red-600 hover:bg-red-700 text-white' : ''}
                      >
                        {batchConfirm.type === 'cancel' ? 'Confirmar cancelación' : 'Confirmar aceptación'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                {reservasError && (
                  <div className="premium-glass rounded-xl p-4 flex items-center gap-2 text-sm text-red-600">
                    <AlertCircle className="w-4 h-4" />
                    <span>{reservasError}</span>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </section>
      </main>

      {/* Modal de edición/creación de producto */}
      <Dialog open={edit.open} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{edit.mode === "create" ? "Crear producto" : "Editar producto"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre *</Label>
                <Input
                  id="nombre"
                  value={edit.product?.nombre || ""}
                  onChange={e => setEdit(ed => ({ ...ed, product: { ...ed.product!, nombre: e.target.value } }))}
                  placeholder="Nombre del producto"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug *</Label>
                <Input
                  id="slug"
                  value={edit.product?.slug || ""}
                  onChange={e => setEdit(ed => ({ ...ed, product: { ...ed.product!, slug: e.target.value } }))}
                  placeholder="slug-del-producto"
                  disabled={edit.mode === "create" && slugAuto}
                />
                {edit.mode === "create" && (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="slugAuto"
                      checked={slugAuto}
                      onChange={e => setSlugAuto(e.target.checked)}
                    />
                    <Label htmlFor="slugAuto" className="text-xs">Generar automáticamente</Label>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea
                id="descripcion"
                value={edit.product?.descripcion || ""}
                onChange={e => setEdit(ed => ({ ...ed, product: { ...ed.product!, descripcion: e.target.value } }))}
                placeholder="Descripción del producto"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="precio">Precio (€) *</Label>
                <Input
                  id="precio"
                  type="number"
                  step="0.01"
                  min="0"
                  value={edit.product?.precio || ""}
                  onChange={e => setEdit(ed => ({ ...ed, product: { ...ed.product!, precio: parseFloat(e.target.value) || 0 } }))}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="categoria">Categoría</Label>
                <select
                  id="categoria"
                  value={edit.product?.categoria || "PANES"}
                  onChange={e => setEdit(ed => ({ ...ed, product: { ...ed.product!, categoria: e.target.value as ProductCategory } }))}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="PANES">Panes</option>
                  <option value="BOLLERIA">Bollería</option>
                  <option value="TARTAS">Tartas</option>
                  <option value="ESPECIALES">Especiales</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="etiquetas">Etiquetas (separadas por coma)</Label>
              <Input
                id="etiquetas"
                value={edit.product?.etiquetas?.join(", ") || ""}
                onChange={e => setEdit(ed => ({ ...ed, product: { ...ed.product!, etiquetas: e.target.value.split(",").map(s => s.trim()).filter(s => s) } }))}
                placeholder="artesanal, masa madre, tradicional"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="imagen">Imagen</Label>
              <div className="flex gap-2">
                <Input
                  id="imagen"
                  value={edit.product?.imagen_url || ""}
                  onChange={e => setEdit(ed => ({ ...ed, product: { ...ed.product!, imagen_url: e.target.value } }))}
                  placeholder="/imagen.jpg"
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  disabled={uploading}
                  className="hidden"
                  id="file-upload"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById("file-upload")?.click()}
                  disabled={uploading}
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="activo"
                  checked={edit.product?.activo || false}
                  onCheckedChange={checked => setEdit(ed => ({ ...ed, product: { ...ed.product!, activo: checked } }))}
                />
                <Label htmlFor="activo">Activo</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="destacado"
                  checked={edit.product?.destacado || false}
                  onCheckedChange={checked => setEdit(ed => ({ ...ed, product: { ...ed.product!, destacado: checked } }))}
                />
                <Label htmlFor="destacado">Destacado</Label>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={closeDialog}>
              Cancelar
            </Button>
            <Button onClick={saveProduct}>
              {edit.mode === "create" ? "Crear" : "Guardar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default Admin;

