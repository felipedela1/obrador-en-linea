import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verificar que sea una request POST o GET
    if (!['POST', 'GET'].includes(req.method)) {
      return new Response(
        JSON.stringify({ error: 'Método no permitido' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Crear cliente de Supabase con service role key para permisos de admin
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    console.log('[Daily Stock Reset] Iniciando proceso automático...')

    // Ejecutar la función de reset de stock
    const { data, error } = await supabase.rpc('reset_daily_stock')

    if (error) {
      console.error('[Daily Stock Reset] Error:', error)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: error.message,
          timestamp: new Date().toISOString()
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('[Daily Stock Reset] Proceso completado exitosamente')

    // Obtener información sobre el próximo reset
    const { data: nextResetInfo } = await supabase.rpc('get_next_stock_reset_info')

    const response = {
      success: true,
      message: 'Stock diario restablecido correctamente',
      timestamp: new Date().toISOString(),
      next_reset: nextResetInfo?.[0] || null
    }

    return new Response(
      JSON.stringify(response),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('[Daily Stock Reset] Error inesperado:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Error interno del servidor',
        details: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
