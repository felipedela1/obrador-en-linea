-- Migración actualizada para reset automático de stock diario
-- Fecha: 2025-08-20 14:00:00
-- Descripción: Función que resetea el stock diario copiando las cantidades más recientes disponibles

-- 1. Función principal para reset automático de stock
CREATE OR REPLACE FUNCTION public.reset_daily_stock()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  today_date DATE := CURRENT_DATE;
  affected_rows INTEGER := 0;
  product_record RECORD;
BEGIN
  
  -- Log del inicio del proceso
  RAISE LOG 'Iniciando reset de stock diario para fecha: %', today_date;
  
  -- Eliminar stock existente para hoy (si existe)
  DELETE FROM public.daily_stock WHERE fecha = today_date;
  RAISE LOG 'Stock existente para hoy eliminado';
  
  -- Para cada producto activo, crear un nuevo registro de daily_stock
  FOR product_record IN 
    SELECT id, nombre, categoria FROM public.products WHERE activo = true
  LOOP
    -- Buscar la cantidad más reciente para este producto (independientemente de la fecha)
    DECLARE
      previous_quantity INTEGER;
      default_quantity INTEGER;
      last_stock_date DATE;
    BEGIN
      -- Obtener la cantidad más reciente disponible para este producto
      SELECT cantidad_disponible, fecha INTO previous_quantity, last_stock_date
      FROM public.daily_stock 
      WHERE product_id = product_record.id 
        AND fecha < today_date  -- Solo registros anteriores a hoy
      ORDER BY fecha DESC, created_at DESC  -- Ordenar por fecha y hora de creación
      LIMIT 1;
      
      -- Si no hay stock previo, usar valores por defecto
      IF previous_quantity IS NULL THEN
        default_quantity := CASE 
          WHEN product_record.categoria = 'PANES' THEN 20
          WHEN product_record.categoria = 'BOLLERIA' THEN 15
          WHEN product_record.categoria = 'TARTAS' THEN 3
          WHEN product_record.categoria = 'ESPECIALES' THEN 5
          ELSE 10
        END;
        
        RAISE LOG 'Producto % (%) no tenía stock previo, usando valor por defecto: %', 
          product_record.nombre, product_record.categoria, default_quantity;
        
        previous_quantity := default_quantity;
      ELSE
        RAISE LOG 'Producto % (%) copiando cantidad más reciente (del %): %', 
          product_record.nombre, product_record.categoria, last_stock_date, previous_quantity;
      END IF;
      
      -- Crear el nuevo registro de daily_stock para hoy
      INSERT INTO public.daily_stock (product_id, fecha, cantidad_disponible)
      VALUES (product_record.id, today_date, previous_quantity);
      
      affected_rows := affected_rows + 1;
    END;
  END LOOP;
  
  RAISE LOG 'Reset de stock completado. Productos actualizados: %', affected_rows;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error en reset_daily_stock: % %', SQLERRM, SQLSTATE;
    RAISE;
END;
$$;

-- 2. Función para obtener información sobre el próximo reset
CREATE OR REPLACE FUNCTION public.get_next_stock_reset_info()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  next_reset_time TIMESTAMP;
  result JSON;
BEGIN
  -- El próximo reset será mañana a las 6:00 AM
  next_reset_time := (CURRENT_DATE + INTERVAL '1 day' + INTERVAL '6 hours');
  
  result := json_build_object(
    'next_reset', next_reset_time,
    'current_time', NOW(),
    'hours_until_reset', EXTRACT(EPOCH FROM (next_reset_time - NOW())) / 3600
  );
  
  RETURN result;
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
      -- Obtener la cantidad más reciente disponible para este producto (anterior a la fecha objetivo)
      SELECT cantidad_disponible, fecha INTO previous_quantity, last_stock_date
      FROM public.daily_stock 
      WHERE product_id = product_record.id 
        AND fecha < target_date
      ORDER BY fecha DESC, created_at DESC
      LIMIT 1;
      
      -- Si no hay stock previo, usar valores por defecto
      IF previous_quantity IS NULL THEN
        default_quantity := CASE 
          WHEN product_record.categoria = 'PANES' THEN 20
          WHEN product_record.categoria = 'BOLLERIA' THEN 15
          WHEN product_record.categoria = 'TARTAS' THEN 3
          WHEN product_record.categoria = 'ESPECIALES' THEN 5
          ELSE 10
        END;
        previous_quantity := default_quantity;
      END IF;
      
      -- Crear el nuevo registro
      INSERT INTO public.daily_stock (product_id, fecha, cantidad_disponible)
      VALUES (product_record.id, target_date, previous_quantity);
      
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
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_name = 'reset_daily_stock'
  ) THEN
    RAISE EXCEPTION 'Error: La función reset_daily_stock no se creó correctamente';
  END IF;
  
  RAISE LOG 'Funciones de reset de stock creadas exitosamente';
END $$;
