-- Script completo para aplicar los cambios de cantidad_inicial
-- Ejecutar este script en Supabase Dashboard > SQL Editor

-- PASO 1: Añadir la nueva columna cantidad_inicial
ALTER TABLE public.daily_stock 
ADD COLUMN IF NOT EXISTS cantidad_inicial INTEGER;

-- PASO 2: Actualizar registros existentes: copiar cantidad_disponible a cantidad_inicial
UPDATE public.daily_stock 
SET cantidad_inicial = cantidad_disponible 
WHERE cantidad_inicial IS NULL;

-- PASO 3: Hacer que el campo sea NOT NULL después de actualizar los datos existentes
ALTER TABLE public.daily_stock 
ALTER COLUMN cantidad_inicial SET NOT NULL;

-- PASO 4: Añadir comentarios para documentar los campos
COMMENT ON COLUMN public.daily_stock.cantidad_inicial IS 'Stock inicial del día, se usa para la automatización de reset diario';
COMMENT ON COLUMN public.daily_stock.cantidad_disponible IS 'Stock disponible actual, se reduce con las reservas';

-- PASO 5: Actualizar la función de reset para usar cantidad_inicial
CREATE OR REPLACE FUNCTION public.reset_daily_stock()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  today_date DATE;
  temp_stock RECORD;
  affected_rows INTEGER := 0;
BEGIN
  today_date := CURRENT_DATE;
  
  RAISE LOG 'Iniciando reset para: %', today_date;
  
  -- PASO 1: Crear tabla temporal con los stocks iniciales actuales
  CREATE TEMP TABLE temp_current_stock AS
  SELECT DISTINCT ON (p.id)
    p.id as product_id,
    p.nombre,
    p.categoria,
    COALESCE(ds.cantidad_inicial, 0) as cantidad
  FROM products p
  LEFT JOIN daily_stock ds ON p.id = ds.product_id
  WHERE p.activo = true
  ORDER BY p.id, ds.fecha DESC, ds.created_at DESC;
  
  -- PASO 2: Eliminar stock de hoy
  DELETE FROM public.daily_stock WHERE fecha = today_date;
  
  -- PASO 3: Insertar desde la tabla temporal
  FOR temp_stock IN 
    SELECT * FROM temp_current_stock
  LOOP
    INSERT INTO public.daily_stock (product_id, fecha, cantidad_disponible, cantidad_inicial)
    VALUES (temp_stock.product_id, today_date, temp_stock.cantidad, temp_stock.cantidad);
    
    affected_rows := affected_rows + 1;
    
    RAISE LOG 'Producto: % -> Cantidad inicial y disponible: %', temp_stock.nombre, temp_stock.cantidad;
  END LOOP;
  
  -- PASO 4: Limpiar tabla temporal
  DROP TABLE temp_current_stock;
  
  RAISE LOG 'Reset completado. Productos: %', affected_rows;
END;
$$;

-- PASO 6: Actualizar la función manual también
CREATE OR REPLACE FUNCTION public.manual_stock_reset(target_date DATE DEFAULT CURRENT_DATE)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role TEXT;
  result JSON;
  affected_rows INTEGER := 0;
  product_record RECORD;
BEGIN
  -- Verificar que el usuario sea admin
  SELECT role INTO user_role 
  FROM public.profiles 
  WHERE user_id = auth.uid();
  
  IF user_role != 'admin' THEN
    RAISE EXCEPTION 'Acceso denegado. Solo administradores pueden ejecutar reset manual.';
  END IF;
  
  -- Eliminar stock existente para la fecha objetivo
  DELETE FROM public.daily_stock WHERE fecha = target_date;
  
  -- Para cada producto activo, crear un nuevo registro
  FOR product_record IN 
    SELECT id, nombre, categoria FROM public.products WHERE activo = true
  LOOP
    DECLARE
      previous_quantity INTEGER;
      default_quantity INTEGER;
      last_stock_date DATE;
    BEGIN
      -- Obtener la cantidad inicial más reciente disponible para este producto (anterior a la fecha objetivo)
      SELECT cantidad_inicial, fecha INTO previous_quantity, last_stock_date
      FROM public.daily_stock 
      WHERE product_id = product_record.id 
        AND fecha < target_date
      ORDER BY fecha DESC, created_at DESC
      LIMIT 1;
      
      -- Si no hay stock previo, usar valores por defecto
      IF previous_quantity IS NULL THEN
        default_quantity := CASE 
          WHEN product_record.categoria = 'PANES' THEN 0
          WHEN product_record.categoria = 'BOLLERIA' THEN 0
          WHEN product_record.categoria = 'TARTAS' THEN 0
          WHEN product_record.categoria = 'ESPECIALES' THEN 0
          ELSE 0
        END;
        previous_quantity := default_quantity;
      END IF;
      
      -- Crear el nuevo registro
      INSERT INTO public.daily_stock (product_id, fecha, cantidad_disponible, cantidad_inicial)
      VALUES (product_record.id, target_date, previous_quantity, previous_quantity);
      
      affected_rows := affected_rows + 1;
    END;
  END LOOP;
  
  result := json_build_object(
    'success', true,
    'date', target_date,
    'products_updated', affected_rows,
    'timestamp', NOW()
  );
  
  RETURN result;
END;
$$;

-- PASO 7: Verificar que todo se aplicó correctamente
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'daily_stock' 
  AND column_name IN ('cantidad_disponible', 'cantidad_inicial')
ORDER BY column_name;

SELECT 'Cambios aplicados correctamente' as resultado;
