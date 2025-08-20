// Tipos de dominio derivados de los tipos generados de Supabase
// Fuente: src/integrations/supabase/types.ts

import type { Database, Tables, Enums } from "@/integrations/supabase/types";

// Enums (alias más cortos)
export type ProductCategory = Enums<"product_category">; // "PANES" | "BOLLERIA" | "TARTAS" | "ESPECIALES"
export type ReservationStatus = Enums<"reservation_status">; // "PENDIENTE" | "PREPARADO" | "RETIRADO" | "CANCELADO"
export type UserRole = Enums<"user_role">; // "guest" | "customer" | "admin"

// Filas base (Rows)
export type ProductRow = Tables<"products">;
export type DailyStockRow = Tables<"daily_stock">;
export type ReservationRow = Tables<"reservations">;
export type ReservationItemRow = Tables<"reservation_items">;
export type ProfileRow = Tables<"profiles">;

// Tipos de inserción (para formularios / mutaciones)
export type InsertProduct = Database["public"]["Tables"]["products"]["Insert"];
export type UpdateProduct = Database["public"]["Tables"]["products"]["Update"];
export type InsertReservation = Database["public"]["Tables"]["reservations"]["Insert"] & {
  items: Array<Pick<ReservationItemRow, "product_id" | "cantidad" | "precio_unitario">>;
};

// Modelo de dominio enriquecido
export interface Product extends ProductRow {
  stockDisponible?: number; // calculado para una fecha
  stockReservado?: number;  // calculado para una fecha
  stockRestante?: number;   // calculado para una fecha
}

export interface ReservationItem extends ReservationItemRow {
  product?: Pick<ProductRow, "id" | "nombre" | "slug" | "precio" | "categoria" | "imagen_url">;
}

export interface Reservation extends ReservationRow {
  items?: ReservationItem[];
  totalCalculado?: number; // Recalculado en cliente para validación
}

// Estructuras auxiliares
export type StockMap = Record<string, { disponible: number; reservado: number; restante: number }>; // product_id -> stock

// DTO para creación de reserva desde UI
export interface CreateReservationDTO {
  date: string; // YYYY-MM-DD
  timeslot: string; // ej: "08:00-08:30" o "09:00"
  notes?: string;
  items: Array<{
    productId: string;
    qty: number;
  }>;
}

// Helpers de dominio
export function computeReservationTotals(items: Array<Pick<ReservationItemRow, "cantidad" | "precio_unitario">>): number {
  return items.reduce((acc, it) => acc + it.cantidad * it.precio_unitario, 0);
}

export function toReservationItemsPayload(items: ReservationItem[]): InsertReservation["items"] {
  return items.map(it => ({
    product_id: it.product_id!,
    cantidad: it.cantidad!,
    precio_unitario: it.precio_unitario!,
  }));
}

export function canReserveQuantity(params: {
  currentReserved: number; // suma existente reservada para ese producto y fecha
  requested: number;       // nueva cantidad solicitada
  available: number;       // cantidad_disponible (daily_stock)
}): boolean {
  const { currentReserved, requested, available } = params;
  return currentReserved + requested <= available;
}

export function remainingStock(available: number, reserved: number): number {
  return Math.max(available - reserved, 0);
}

export function isProductActiveAndReservable(product: ProductRow, stock?: { disponible: number; restante: number }): boolean {
  if (!product.activo) return false;
  if (!stock) return false; // si no hay registro de stock para la fecha -> no reservable
  return stock.restante > 0;
}

export function formatMoneyEUR(value: number): string {
  return (value / 100).toLocaleString("es-ES", { style: "currency", currency: "EUR" });
}

// Nota: formatMoneyEUR asume que guardas precio en céntimos. Si guardas en euros con decimales,
// ajusta a: value.toLocaleString("es-ES", { style: "currency", currency: "EUR" })
