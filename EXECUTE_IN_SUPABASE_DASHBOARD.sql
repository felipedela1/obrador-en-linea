-- Script para crear las funciones de reset de stock diario
-- Ejecutar este script en Supabase Dashboard > SQL Editor

-- 1. Función principal de reset de stock
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

-- 2. Función para obtener información del próximo reset
CREATE OR REPLACE FUNCTION public.get_next_stock_reset_info()
RETURNS TABLE(
  next_reset_date DATE,
  next_reset_time TIME,
  hours_until_reset NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  tomorrow_6am TIMESTAMP WITH TIME ZONE;
  now_ts TIMESTAMP WITH TIME ZONE;
BEGIN
  now_ts := NOW();
  
  -- Si son menos de las 6 AM, el próximo reset es hoy a las 6 AM
  -- Si son más de las 6 AM, el próximo reset es mañana a las 6 AM
  IF EXTRACT(HOUR FROM now_ts) < 6 THEN
    tomorrow_6am := DATE_TRUNC('day', now_ts) + INTERVAL '6 hours';
  ELSE
    tomorrow_6am := DATE_TRUNC('day', now_ts) + INTERVAL '1 day' + INTERVAL '6 hours';
  END IF;
  
  RETURN QUERY SELECT
    tomorrow_6am::DATE as next_reset_date,
    tomorrow_6am::TIME as next_reset_time,
    ROUND(EXTRACT(EPOCH FROM (tomorrow_6am - now_ts)) / 3600, 2) as hours_until_reset;
END;
$$;

-- 3. Función para reset manual (solo para admins)
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

-- 4. Verificar que las funciones se crearon correctamente
SELECT 
  routine_name, 
  routine_type,
  routine_definition IS NOT NULL as has_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('reset_daily_stock', 'get_next_stock_reset_info', 'manual_stock_reset')
ORDER BY routine_name;

-- 5. Script de prueba (opcional - ejecutar después de crear las funciones)
/*
-- Ver productos activos
SELECT id, nombre, categoria, activo FROM products WHERE activo = true LIMIT 5;

-- Ver stock actual (si existe)
SELECT 
  p.nombre,
  ds.fecha,
  ds.cantidad_disponible
FROM daily_stock ds
JOIN products p ON ds.product_id = p.id
WHERE ds.fecha >= CURRENT_DATE - INTERVAL '2 days'
ORDER BY ds.fecha DESC, p.nombre;

-- Probar la función de reset (como admin)
SELECT public.manual_stock_reset();

-- Ver el resultado después del reset
SELECT 
  p.nombre,
  p.categoria,
  ds.cantidad_disponible,
  ds.fecha
FROM daily_stock ds
JOIN products p ON ds.product_id = p.id
WHERE ds.fecha = CURRENT_DATE
ORDER BY p.categoria, p.nombre;
*/
