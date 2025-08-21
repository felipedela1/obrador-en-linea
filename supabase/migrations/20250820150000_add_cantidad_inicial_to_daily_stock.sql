-- Migración para añadir campo cantidad_inicial a daily_stock
-- Fecha: 2025-08-20 15:00:00
-- Descripción: Añade campo cantidad_inicial para controlar el stock inicial del día

-- Añadir la nueva columna
ALTER TABLE public.daily_stock 
ADD COLUMN cantidad_inicial INTEGER;

-- Actualizar registros existentes: copiar cantidad_disponible a cantidad_inicial
UPDATE public.daily_stock 
SET cantidad_inicial = cantidad_disponible 
WHERE cantidad_inicial IS NULL;

-- Hacer que el campo sea NOT NULL después de actualizar los datos existentes
ALTER TABLE public.daily_stock 
ALTER COLUMN cantidad_inicial SET NOT NULL;

-- Añadir comentario para documentar el campo
COMMENT ON COLUMN public.daily_stock.cantidad_inicial IS 'Stock inicial del día, se usa para la automatización de reset diario';
COMMENT ON COLUMN public.daily_stock.cantidad_disponible IS 'Stock disponible actual, se reduce con las reservas';
