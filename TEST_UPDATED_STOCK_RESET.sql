-- Script de prueba para verificar el funcionamiento del reset de stock con lógica actualizada
-- Este script debe ser ejecutado en el SQL Editor de Supabase Dashboard

-- PASO 1: Preparar datos de prueba
-- Limpiar datos existentes para la prueba
DELETE FROM public.daily_stock WHERE fecha >= CURRENT_DATE - INTERVAL '5 days';

-- Simular escenario: Producto con stock de hace 3 días, luego cambios hoy
INSERT INTO public.daily_stock (product_id, fecha, cantidad_disponible) VALUES
-- Datos de hace 3 días
(1, CURRENT_DATE - INTERVAL '3 days', 25),
(2, CURRENT_DATE - INTERVAL '3 days', 12),
-- Datos de hace 2 días (solo algunos productos)
(1, CURRENT_DATE - INTERVAL '2 days', 20),
-- Cambios realizados hoy (que serán eliminados por el reset)
(1, CURRENT_DATE, 5),
(2, CURRENT_DATE, 3);

-- PASO 2: Verificar estado inicial
SELECT 'ESTADO INICIAL' AS descripcion;
SELECT 
  p.nombre,
  p.categoria,
  ds.fecha,
  ds.cantidad_disponible,
  ds.created_at
FROM public.daily_stock ds
JOIN public.products p ON ds.product_id = p.id
WHERE ds.fecha >= CURRENT_DATE - INTERVAL '5 days'
ORDER BY p.nombre, ds.fecha DESC;

-- PASO 3: Ejecutar el reset de stock
SELECT 'EJECUTANDO RESET DE STOCK' AS descripcion;
SELECT public.reset_daily_stock();

-- PASO 4: Verificar resultado después del reset
SELECT 'RESULTADO DESPUÉS DEL RESET' AS descripcion;
SELECT 
  p.nombre,
  p.categoria,
  ds.fecha,
  ds.cantidad_disponible,
  ds.created_at,
  CASE 
    WHEN ds.fecha = CURRENT_DATE THEN 'NUEVO (creado por reset)'
    ELSE 'ANTERIOR (no modificado)'
  END AS estado
FROM public.daily_stock ds
JOIN public.products p ON ds.product_id = p.id
WHERE ds.fecha >= CURRENT_DATE - INTERVAL '5 days'
ORDER BY p.nombre, ds.fecha DESC;

-- PASO 5: Verificar que se tomó el stock más reciente
SELECT 'VERIFICACIÓN DE LÓGICA' AS descripcion;
WITH stock_mas_reciente AS (
  SELECT 
    product_id,
    cantidad_disponible,
    fecha,
    ROW_NUMBER() OVER (PARTITION BY product_id ORDER BY fecha DESC, created_at DESC) as rn
  FROM public.daily_stock 
  WHERE fecha < CURRENT_DATE
),
stock_hoy AS (
  SELECT product_id, cantidad_disponible as cantidad_hoy
  FROM public.daily_stock 
  WHERE fecha = CURRENT_DATE
)
SELECT 
  p.nombre,
  smr.fecha as fecha_stock_origen,
  smr.cantidad_disponible as cantidad_origen,
  sh.cantidad_hoy,
  CASE 
    WHEN smr.cantidad_disponible = sh.cantidad_hoy THEN '✓ CORRECTO'
    ELSE '✗ ERROR'
  END as verificacion
FROM stock_mas_reciente smr
JOIN stock_hoy sh ON smr.product_id = sh.product_id
JOIN public.products p ON smr.product_id = p.id
WHERE smr.rn = 1
ORDER BY p.nombre;

-- PASO 6: Prueba del reset manual
SELECT 'PRUEBA DE RESET MANUAL' AS descripcion;
-- Nota: Esta función requiere permisos de admin, puede fallar si no tienes el rol correcto
-- SELECT public.manual_stock_reset(CURRENT_DATE);

-- PASO 7: Información sobre próximo reset
SELECT 'INFORMACIÓN DE PRÓXIMO RESET' AS descripcion;
SELECT public.get_next_stock_reset_info();

-- PASO 8: Limpiar datos de prueba (opcional)
-- Descomenta las siguientes líneas si quieres limpiar los datos de prueba
-- DELETE FROM public.daily_stock WHERE fecha >= CURRENT_DATE - INTERVAL '5 days';
-- SELECT 'Datos de prueba limpiados' AS resultado;

SELECT 'PRUEBA COMPLETADA' AS resultado;
