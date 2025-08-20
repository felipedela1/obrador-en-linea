-- Migración para reset automático de stock diario
-- Fecha: 2025-08-20
-- Descripción: Función que resetea el stock diario a las 6 AM copiando las cantidades del día anterior

-- Función para copiar stock del día anterior al día actual
CREATE OR REPLACE FUNCTION public.reset_daily_stock()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  yesterday_date DATE;
  today_date DATE;
  product_record RECORD;
  affected_rows INTEGER := 0;
BEGIN
  -- Calcular fechas
  today_date := CURRENT_DATE;
  yesterday_date := today_date - INTERVAL '1 day';
  
  -- Log del inicio del proceso
  RAISE LOG 'Iniciando reset de stock diario para fecha: %', today_date;
  
  -- Verificar si ya existe stock para hoy
  IF EXISTS (SELECT 1 FROM public.daily_stock WHERE fecha = today_date) THEN
    RAISE LOG 'Ya existe stock para hoy (%), eliminando registros existentes', today_date;
    DELETE FROM public.daily_stock WHERE fecha = today_date;
  END IF;
  
  -- Copiar stock del día anterior
  INSERT INTO public.daily_stock (product_id, fecha, cantidad_disponible)
  SELECT 
    ds.product_id,
    today_date,
    ds.cantidad_disponible
  FROM public.daily_stock ds
  INNER JOIN public.products p ON ds.product_id = p.id
  WHERE ds.fecha = yesterday_date 
    AND p.activo = true;
  
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  
  -- Si no hay stock del día anterior, crear stock por defecto
  IF affected_rows = 0 THEN
    RAISE LOG 'No hay stock del día anterior (%), creando stock por defecto', yesterday_date;
    
    INSERT INTO public.daily_stock (product_id, fecha, cantidad_disponible)
    SELECT 
      p.id,
      today_date,
      CASE 
        WHEN p.categoria = 'PANES' THEN 20
        WHEN p.categoria = 'BOLLERIA' THEN 15
        WHEN p.categoria = 'TARTAS' THEN 3
        WHEN p.categoria = 'ESPECIALES' THEN 5
        ELSE 10
      END
    FROM public.products p
    WHERE p.activo = true;
    
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
  END IF;
  
  RAISE LOG 'Reset de stock completado. Productos actualizados: %', affected_rows;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error en reset_daily_stock: % %', SQLERRM, SQLSTATE;
    RAISE;
END;
$$;

-- Función para programar el reset automático diario
CREATE OR REPLACE FUNCTION public.schedule_daily_stock_reset()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Esta función será llamada por un cron job o sistema externo
  -- Para Supabase, usaremos Edge Functions o un webhook externo
  PERFORM public.reset_daily_stock();
END;
$$;

-- Función para obtener el próximo reset programado (informativa)
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

-- Función para ejecutar reset manual (solo para admins)
CREATE OR REPLACE FUNCTION public.manual_stock_reset(target_date DATE DEFAULT CURRENT_DATE)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role TEXT;
  result JSON;
  affected_rows INTEGER;
BEGIN
  -- Verificar que el usuario sea admin
  SELECT role INTO user_role 
  FROM public.profiles 
  WHERE user_id = auth.uid();
  
  IF user_role != 'admin' THEN
    RAISE EXCEPTION 'Acceso denegado. Solo administradores pueden ejecutar reset manual.';
  END IF;
  
  -- Ejecutar reset para la fecha especificada
  DELETE FROM public.daily_stock WHERE fecha = target_date;
  
  INSERT INTO public.daily_stock (product_id, fecha, cantidad_disponible)
  SELECT 
    ds.product_id,
    target_date,
    ds.cantidad_disponible
  FROM public.daily_stock ds
  INNER JOIN public.products p ON ds.product_id = p.id
  WHERE ds.fecha = target_date - INTERVAL '1 day' 
    AND p.activo = true;
  
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  
  -- Si no hay stock del día anterior, crear por defecto
  IF affected_rows = 0 THEN
    INSERT INTO public.daily_stock (product_id, fecha, cantidad_disponible)
    SELECT 
      p.id,
      target_date,
      CASE 
        WHEN p.categoria = 'PANES' THEN 20
        WHEN p.categoria = 'BOLLERIA' THEN 15
        WHEN p.categoria = 'TARTAS' THEN 3
        WHEN p.categoria = 'ESPECIALES' THEN 5
        ELSE 10
      END
    FROM public.products p
    WHERE p.activo = true;
    
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
  END IF;
  
  result := json_build_object(
    'success', true,
    'date', target_date,
    'products_updated', affected_rows,
    'timestamp', NOW()
  );
  
  RETURN result;
END;
$$;

-- Comentarios sobre implementación del cron job
COMMENT ON FUNCTION public.reset_daily_stock() IS 
'Función que resetea el stock diario copiando las cantidades del día anterior. 
Debe ser ejecutada diariamente a las 6:00 AM mediante un cron job externo o Supabase Edge Function.';

COMMENT ON FUNCTION public.schedule_daily_stock_reset() IS 
'Función wrapper para ser llamada por sistemas de scheduling externos.';

COMMENT ON FUNCTION public.get_next_stock_reset_info() IS 
'Función informativa que devuelve cuándo será el próximo reset de stock.';

COMMENT ON FUNCTION public.manual_stock_reset(DATE) IS 
'Función para reset manual del stock (solo admins). Útil para testing y correcciones.';
