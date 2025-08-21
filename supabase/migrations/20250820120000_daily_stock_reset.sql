-- Migración corregida para reset automático de stock diario

-- Función corregida: buscar ANTES de eliminar
CREATE OR REPLACE FUNCTION public.reset_daily_stock()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  today_date DATE;
  product_record RECORD;
  latest_quantity INTEGER;
  affected_rows INTEGER := 0;
BEGIN
  today_date := CURRENT_DATE;
  
  RAISE LOG 'Iniciando reset de stock diario para fecha: %', today_date;
  
  -- PRIMERO: Para cada producto activo, buscar su stock más reciente
  FOR product_record IN 
    SELECT id, nombre, categoria FROM public.products WHERE activo = true
  LOOP
    -- Buscar la cantidad más reciente ANTES de eliminar nada
    SELECT cantidad_disponible INTO latest_quantity
    FROM public.daily_stock 
    WHERE product_id = product_record.id 
    ORDER BY fecha DESC, created_at DESC
    LIMIT 1;
    
    -- Si no encuentra nada, usar valores por defecto
    IF latest_quantity IS NULL THEN
      latest_quantity := CASE 
        WHEN product_record.categoria = 'PANES' THEN 20
        WHEN product_record.categoria = 'BOLLERIA' THEN 15
        WHEN product_record.categoria = 'TARTAS' THEN 3
        WHEN product_record.categoria = 'ESPECIALES' THEN 5
        ELSE 10
      END;
    END IF;
    
    -- Eliminar solo el registro de HOY para este producto (si existe)
    DELETE FROM public.daily_stock 
    WHERE product_id = product_record.id AND fecha = today_date;
    
    -- Insertar el nuevo registro
    INSERT INTO public.daily_stock (product_id, fecha, cantidad_disponible)
    VALUES (product_record.id, today_date, latest_quantity);
    
    affected_rows := affected_rows + 1;
    
    RAISE LOG 'Producto: % -> Cantidad: %', product_record.nombre, latest_quantity;
  END LOOP;
  
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
  
  -- Eliminar stock existente para la fecha objetivo
  DELETE FROM public.daily_stock WHERE fecha = target_date;
  
  -- Para cada producto activo, copiar su stock más reciente
  INSERT INTO public.daily_stock (product_id, fecha, cantidad_disponible)
  SELECT DISTINCT ON (p.id)
    p.id,
    target_date,
    COALESCE(ds.cantidad_disponible, 
      CASE 
        WHEN p.categoria = 'PANES' THEN 20
        WHEN p.categoria = 'BOLLERIA' THEN 15
        WHEN p.categoria = 'TARTAS' THEN 3
        WHEN p.categoria = 'ESPECIALES' THEN 5
        ELSE 10
      END
    )
  FROM public.products p
  LEFT JOIN public.daily_stock ds ON p.id = ds.product_id
  WHERE p.activo = true
    AND (ds.fecha IS NULL OR ds.fecha < target_date)
  ORDER BY p.id, ds.fecha DESC, ds.created_at DESC;
  
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  
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
