-- Script de debug para verificar datos de productos y stock
-- Ejecutar este script ANTES del reset para entender el problema

-- 1. Verificar productos activos
SELECT 'PRODUCTOS ACTIVOS' AS seccion;
SELECT id, nombre, categoria, activo 
FROM public.products 
WHERE activo = true 
ORDER BY id
LIMIT 10;

-- 2. Verificar si hay registros en daily_stock
SELECT 'REGISTROS EN DAILY_STOCK' AS seccion;
SELECT COUNT(*) as total_registros FROM public.daily_stock;

-- 3. Verificar stock por producto
SELECT 'STOCK POR PRODUCTO' AS seccion;
SELECT 
  p.id as product_id,
  p.nombre,
  p.categoria,
  p.activo,
  COUNT(ds.id) as registros_stock,
  MAX(ds.fecha) as ultima_fecha,
  MAX(ds.cantidad_disponible) as ultima_cantidad
FROM public.products p
LEFT JOIN public.daily_stock ds ON p.id = ds.product_id
WHERE p.activo = true
GROUP BY p.id, p.nombre, p.categoria, p.activo
ORDER BY p.id
LIMIT 10;

-- 4. Ver los últimos registros de stock
SELECT 'ÚLTIMOS REGISTROS DE STOCK' AS seccion;
SELECT 
  ds.product_id,
  p.nombre,
  ds.fecha,
  ds.cantidad_disponible,
  ds.created_at
FROM public.daily_stock ds
JOIN public.products p ON ds.product_id = p.id
ORDER BY ds.created_at DESC
LIMIT 20;

-- 5. Verificar si hay coincidencias entre products.id y daily_stock.product_id
SELECT 'VERIFICACIÓN DE RELACIONES' AS seccion;
SELECT 
  'Productos activos' as tipo,
  COUNT(*) as cantidad
FROM public.products 
WHERE activo = true

UNION ALL

SELECT 
  'Productos con stock' as tipo,
  COUNT(DISTINCT ds.product_id) as cantidad
FROM public.daily_stock ds
JOIN public.products p ON ds.product_id = p.id
WHERE p.activo = true;

-- 6. Test de la consulta problemática
SELECT 'TEST DE CONSULTA INDIVIDUAL' AS seccion;
-- Cambiar el 1 por un ID de producto que sepas que existe
SELECT 
  product_id,
  cantidad_disponible, 
  fecha,
  created_at
FROM public.daily_stock 
WHERE product_id = 1  -- Cambiar por un ID real
ORDER BY fecha DESC, created_at DESC
LIMIT 5;

-- Función de debug para entender por qué no encuentra stock
CREATE OR REPLACE FUNCTION public.debug_reset_daily_stock()
RETURNS TABLE(
  producto_id UUID,
  producto_nombre TEXT,
  stock_encontrado INTEGER,
  fecha_stock DATE,
  registros_totales BIGINT,
  query_result TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  product_record RECORD;
  debug_count BIGINT;
  debug_quantity INTEGER;
  debug_date DATE;
BEGIN
  FOR product_record IN 
    SELECT id, nombre, categoria FROM public.products WHERE activo = true LIMIT 5
  LOOP
    -- Contar cuántos registros hay para este producto
    SELECT COUNT(*) INTO debug_count
    FROM public.daily_stock 
    WHERE product_id = product_record.id;
    
    -- Intentar obtener el stock más reciente
    SELECT cantidad_disponible, fecha INTO debug_quantity, debug_date
    FROM public.daily_stock 
    WHERE product_id = product_record.id 
    ORDER BY fecha DESC, created_at DESC
    LIMIT 1;
    
    RETURN QUERY SELECT
      product_record.id,
      product_record.nombre,
      COALESCE(debug_quantity, -999),
      debug_date,
      debug_count,
      CASE 
        WHEN debug_count = 0 THEN 'NO_RECORDS'
        WHEN debug_quantity IS NULL THEN 'NULL_QUANTITY'
        ELSE 'FOUND_STOCK'
      END;
  END LOOP;
END;
$$;

-- Función de reset corregida con debug intensivo
CREATE OR REPLACE FUNCTION public.reset_daily_stock()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  today_date DATE;
  affected_rows INTEGER := 0;
  product_record RECORD;
  total_products INTEGER := 0;
BEGIN
  -- Calcular fechas
  today_date := CURRENT_DATE;
  
  -- Contar productos activos
  SELECT COUNT(*) INTO total_products FROM public.products WHERE activo = true;
  
  -- Log del inicio del proceso
  RAISE LOG 'Iniciando reset de stock diario para fecha: %. Productos activos: %', today_date, total_products;
  
  -- Eliminar stock existente para hoy (si existe)
  DELETE FROM public.daily_stock WHERE fecha = today_date;
  RAISE LOG 'Stock existente para hoy eliminado';
  
  -- Para cada producto activo, crear un nuevo registro de daily_stock
  FOR product_record IN 
    SELECT id, nombre, categoria FROM public.products WHERE activo = true
  LOOP
    DECLARE
      previous_quantity INTEGER := NULL;
      last_stock_date DATE := NULL;
      record_count INTEGER := 0;
    BEGIN
      -- Contar registros para este producto
      SELECT COUNT(*) INTO record_count
      FROM public.daily_stock 
      WHERE product_id = product_record.id;
      
      RAISE LOG 'Procesando producto: % (ID: %). Registros de stock existentes: %', 
        product_record.nombre, product_record.id, record_count;
      
      -- Solo buscar si hay registros
      IF record_count > 0 THEN
        -- Obtener la cantidad más reciente disponible para este producto
        SELECT cantidad_disponible, fecha 
        INTO previous_quantity, last_stock_date
        FROM public.daily_stock 
        WHERE product_id = product_record.id 
        ORDER BY fecha DESC, created_at DESC
        LIMIT 1;
        
        RAISE LOG 'Stock encontrado - Producto: %, Cantidad: %, Fecha: %', 
          product_record.nombre, previous_quantity, last_stock_date;
      ELSE
        RAISE LOG 'No hay registros de stock previos para producto: %', product_record.nombre;
      END IF;
      
      -- Si no hay stock previo, usar valor por defecto (0)
      IF previous_quantity IS NULL THEN
        previous_quantity := 0;
        RAISE LOG 'Usando valor por defecto (0) para producto: %', product_record.nombre;
      ELSE
        RAISE LOG 'Copiando cantidad % del % para producto: %', 
          previous_quantity, last_stock_date, product_record.nombre;
      END IF;
      
      -- Crear el nuevo registro para hoy
      INSERT INTO public.daily_stock (product_id, fecha, cantidad_disponible)
      VALUES (product_record.id, today_date, previous_quantity);
      
      RAISE LOG 'Registro creado para %: cantidad = %', product_record.nombre, previous_quantity;
      
      affected_rows := affected_rows + 1;
      
    EXCEPTION
      WHEN OTHERS THEN
        RAISE LOG 'ERROR procesando producto % (%): % %', 
          product_record.nombre, product_record.id, SQLERRM, SQLSTATE;
        -- Continuar con el siguiente producto en lugar de fallar completamente
    END;
  END LOOP;
  
  RAISE LOG 'Reset de stock completado. Productos procesados: % de %', affected_rows, total_products;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'ERROR GENERAL en reset_daily_stock: % %', SQLERRM, SQLSTATE;
    RAISE;
END;
$$;
