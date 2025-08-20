# Sistema de Reset Automático de Stock Diario

Este documento explica cómo configurar y usar el sistema automático de reset de stock que se ejecuta todos los días a las 6:00 AM.

## 🏗️ Componentes del Sistema

### 1. **Función de Base de Datos** (`reset_daily_stock()`)
- **Ubicación**: `supabase/migrations/20250820120000_daily_stock_reset.sql`
- **Función**: Copia el stock del día anterior al día actual
- **Fallback**: Si no hay stock del día anterior, crea stock por defecto según categoría

### 2. **Edge Function** (`daily-stock-reset`)
- **Ubicación**: `supabase/functions/daily-stock-reset/index.ts`
- **Función**: API endpoint que ejecuta el reset de stock
- **Acceso**: Puede ser llamada via HTTP POST/GET

### 3. **GitHub Action** (`daily-stock-reset.yml`)
- **Ubicación**: `.github/workflows/daily-stock-reset.yml`
- **Función**: Ejecuta automáticamente el reset todos los días a las 6:00 AM UTC
- **Backup**: Permite ejecución manual desde GitHub Actions UI

## 🚀 Configuración Inicial

### Paso 1: Desplegar Edge Function
```bash
# Desde la raíz del proyecto
npx supabase functions deploy daily-stock-reset
```

### Paso 2: Configurar Secrets en GitHub
Ve a tu repositorio → Settings → Secrets and Variables → Actions y añade:

- `SUPABASE_URL`: Tu URL de Supabase
- `SUPABASE_ANON_KEY`: Tu clave anon/public de Supabase

### Paso 3: Verificar Migración
Asegúrate de que la migración se ha aplicado:
```bash
npx supabase db push
```

## ⏰ Configuración de Horario

### Cambiar Hora de Ejecución
Edita el archivo `.github/workflows/daily-stock-reset.yml`:

```yaml
schedule:
  # Para las 5:00 AM UTC (6:00 AM España en invierno)
  - cron: '0 5 * * *'
  
  # Para las 4:00 AM UTC (6:00 AM España en verano)  
  - cron: '0 4 * * *'
```

### Zonas Horarias Comunes
- **España (UTC+1/+2)**: `'0 5 * * *'` (invierno) / `'0 4 * * *'` (verano)
- **México (UTC-6)**: `'0 12 * * *'`
- **Argentina (UTC-3)**: `'0 9 * * *'`

## 🔧 Funciones Disponibles

### 1. Reset Automático
```sql
SELECT public.reset_daily_stock();
```

### 2. Reset Manual (Solo Admins)
```sql
SELECT public.manual_stock_reset('2025-08-20');
```

### 3. Ver Próximo Reset
```sql
SELECT * FROM public.get_next_stock_reset_info();
```

## 🌐 Endpoint HTTP

### URL de la Edge Function
```
POST https://[tu-proyecto].supabase.co/functions/v1/daily-stock-reset
```

### Headers Requeridos
```
Authorization: Bearer [tu-anon-key]
Content-Type: application/json
```

### Ejemplo de Respuesta Exitosa
```json
{
  "success": true,
  "message": "Stock diario restablecido correctamente",
  "timestamp": "2025-08-20T06:00:00.000Z",
  "next_reset": {
    "next_reset_date": "2025-08-21",
    "next_reset_time": "06:00:00",
    "hours_until_reset": 24.0
  }
}
```

## 🧪 Testing

### Test Manual desde GitHub Actions
1. Ve a tu repositorio en GitHub
2. Actions → Daily Stock Reset
3. Click en "Run workflow"
4. Click en "Run workflow" (botón verde)

### Test desde Terminal
```bash
curl -X POST \
  -H "Authorization: Bearer tu-anon-key" \
  -H "Content-Type: application/json" \
  "https://tu-proyecto.supabase.co/functions/v1/daily-stock-reset"
```

### Test desde Supabase Dashboard
```sql
-- Ver stock actual
SELECT * FROM daily_stock WHERE fecha = CURRENT_DATE;

-- Ejecutar reset manual
SELECT public.manual_stock_reset();

-- Verificar resultado
SELECT * FROM daily_stock WHERE fecha = CURRENT_DATE;
```

## 📊 Monitoreo

### Ver Logs de GitHub Actions
1. Repositorio → Actions
2. Click en el workflow "Daily Stock Reset"
3. Click en la ejecución más reciente
4. Ver logs detallados

### Ver Logs de Edge Function
1. Supabase Dashboard → Edge Functions
2. Click en "daily-stock-reset"
3. Ver logs y métricas

### Verificar Ejecución en Base de Datos
```sql
-- Ver productos con stock para hoy
SELECT 
  p.nombre,
  ds.cantidad_disponible,
  ds.fecha
FROM daily_stock ds
JOIN products p ON ds.product_id = p.id
WHERE ds.fecha = CURRENT_DATE
ORDER BY p.categoria, p.nombre;
```

## 🚨 Troubleshooting

### El reset no se ejecutó
1. Verificar GitHub Actions no ha fallado
2. Revisar logs de Edge Function
3. Ejecutar reset manual si es necesario

### Cambiar stock por defecto
Edita la migración `20250820120000_daily_stock_reset.sql`:
```sql
CASE 
  WHEN p.categoria = 'PANES' THEN 25      -- Era 20
  WHEN p.categoria = 'BOLLERIA' THEN 20   -- Era 15
  WHEN p.categoria = 'TARTAS' THEN 5      -- Era 3
  WHEN p.categoria = 'ESPECIALES' THEN 8  -- Era 5
  ELSE 12                                 -- Era 10
END
```

### Reset manual de emergencia
```sql
-- Como admin, desde Supabase SQL Editor
SELECT public.manual_stock_reset(CURRENT_DATE);
```

## 📋 Checklist de Configuración

- [ ] Migración aplicada (`reset_daily_stock` function existe)
- [ ] Edge Function desplegada
- [ ] Secrets de GitHub configurados
- [ ] GitHub Action habilitado
- [ ] Horario configurado correctamente
- [ ] Test manual ejecutado exitosamente
- [ ] Monitoreo configurado

## 🔄 Flujo Diario Automatizado

1. **6:00 AM**: GitHub Action se ejecuta automáticamente
2. **6:01 AM**: Llama a la Edge Function de Supabase
3. **6:02 AM**: Edge Function ejecuta `reset_daily_stock()`
4. **6:03 AM**: Base de datos copia stock del día anterior
5. **6:04 AM**: Sistema listo para el nuevo día

Este sistema garantiza que cada día tengas stock fresco basado en las cantidades del día anterior, mantiendo la continuidad del negocio sin intervención manual.
