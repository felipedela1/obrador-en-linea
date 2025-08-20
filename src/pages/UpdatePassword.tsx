import { useEffect, useState } from "react"
import Navbar from "@/components/layout/Navbar"
import Footer from "@/components/sections/Footer"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input" 
import { Label } from "@/components/ui/label"
import { HeroButton } from "@/components/ui/hero-button"
import { useToast } from "@/components/ui/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { Loader2 } from "lucide-react"

function extractTokens(fragment: string) {
  const params = new URLSearchParams(fragment.replace(/^#/, ""))
  const access_token = params.get("access_token") || ""
  const refresh_token = params.get("refresh_token") || ""
  const type = params.get("type")
  return { access_token, refresh_token, type }
}

const policyChecks = (pwd: string) => {
  const checks = [
    { ok: pwd.length >= 7, msg: "Mínimo 7 caracteres" },
    { ok: /[A-Z]/.test(pwd), msg: "Al menos 1 letra mayúscula" },
  ]
  return { errors: checks.filter(c => !c.ok).map(c => c.msg), checks }
}

const UpdatePassword = () => {
  const { toast } = useToast()
  const [pw1, setPw1] = useState("")
  const [pw2, setPw2] = useState("")
  const [updating, setUpdating] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const [pwErrors, setPwErrors] = useState<string[]>([])
  const [pwChecks, setPwChecks] = useState<{ ok: boolean; msg: string }[]>([])
  const [accessToken, setAccessToken] = useState<string>("")
  const [refreshToken, setRefreshToken] = useState<string>("")

  // 1. Cerrar cualquier sesión activa y validar tokens
  useEffect(() => {
    const frag = window.location.hash
    console.log("[UpdatePassword] Fragment recibido:", frag)
    
    if (!frag || !frag.includes("access_token=")) {
      console.log("[UpdatePassword] No hay tokens en URL, redirigiendo a inicio")
      toast({ 
        title: "Enlace inválido", 
        description: "El enlace de recuperación no es válido. Solicita uno nuevo.", 
        variant: "destructive" 
      })
      setTimeout(() => window.location.replace("/"), 2000)
      return
    }
    
    const { access_token, refresh_token, type } = extractTokens(frag)
    console.log("[UpdatePassword] Tokens extraídos:", { 
      hasAccess: !!access_token, 
      hasRefresh: !!refresh_token, 
      type,
      accessLength: access_token?.length || 0,
      refreshLength: refresh_token?.length || 0
    })
    
    if (type !== "recovery" || !access_token || !refresh_token) {
      console.log("[UpdatePassword] Tokens inválidos, redirigiendo a inicio")
      toast({ 
        title: "Enlace inválido", 
        description: "El enlace de recuperación no es válido o ha expirado. Solicita uno nuevo.", 
        variant: "destructive" 
      })
      setTimeout(() => window.location.replace("/"), 2000)
      return
    }
    
    // Guardar tokens inmediatamente
    setAccessToken(access_token)
    setRefreshToken(refresh_token)
    
    console.log("[UpdatePassword] Tokens guardados, preparando formulario SIN cerrar sesión")
    console.log("[UpdatePassword] Los tokens de recuperación se mantienen válidos")
    
    // NO cerrar sesión para mantener válidos los tokens de recuperación
    // Solo limpiar localStorage de tokens antiguos si existen, pero sin hacer signOut
    try {
      const keysToRemove = Object.keys(localStorage)
        .filter(k => k.startsWith("sb-") && k.includes("-auth-token"))
      
      if (keysToRemove.length > 0) {
        console.log("[UpdatePassword] Limpiando tokens antiguos:", keysToRemove)
        keysToRemove.forEach(k => localStorage.removeItem(k))
      }
    } catch (e) {
      console.error("[UpdatePassword] Error limpiando localStorage:", e)
    }
    
    // Marcar formulario como listo inmediatamente
    setSessionReady(true)
    console.log("[UpdatePassword] Formulario listo para usar")
  }, [toast])

  // 2. Guard secundario (ya cubierto arriba)
  useEffect(() => {
    if (!window.location.hash || !/access_token=/.test(window.location.hash)) return
  }, [])

  // 3. Recalcular checks
  useEffect(() => {
    const { errors, checks } = policyChecks(pw1)
    setPwErrors(errors)
    setPwChecks(checks)
  }, [pw1])

  // 4. Actualizar contraseña usando método alternativo
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log("[UpdatePassword] Iniciando actualización de contraseña")
    
    if (!accessToken || !refreshToken) {
      toast({ title: "Token inválido", description: "Repite el proceso de recuperación", variant: "destructive" })
      return
    }
    if (pwErrors.length) {
      toast({ title: "Contraseña inválida", description: pwErrors[0], variant: "destructive" })
      return
    }
    if (pw1 !== pw2) {
      toast({ title: "No coinciden", description: "Repite la misma contraseña", variant: "destructive" })
      return
    }
    
    setUpdating(true)
    try {
      // Método directo: usar el endpoint de Supabase con configuración correcta
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://upkjxuvwttqwemsoafcq.supabase.co"
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwa2p4dXZ3dHRxd2Vtc29hZmNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzMTE4OTQsImV4cCI6MjA3MDg4Nzg5NH0.5TUcq1_7xR-1Hl-vXVtHcztT1a9riHiB37poCHCGHHg"
      
      console.log("[UpdatePassword] Usando API directo con tokens de recuperación")
      const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'apikey': supabaseAnonKey
        },
        body: JSON.stringify({ password: pw1 })
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error("[UpdatePassword] Error API response:", { status: response.status, errorData })
        
        if (response.status === 403) {
          throw new Error("El enlace de recuperación ha expirado. Solicita uno nuevo.")
        } else if (response.status === 422) {
          throw new Error("La contraseña no cumple los requisitos de seguridad.")
        } else {
          throw new Error(errorData.error_description || errorData.message || `Error ${response.status}: No se pudo actualizar la contraseña`)
        }
      }
      
      const result = await response.json()
      console.log("[UpdatePassword] Contraseña actualizada exitosamente:", result)
      
      toast({ title: "Contraseña actualizada", description: "Inicia sesión con tu nueva contraseña." })
      
      // AHORA sí cerrar la sesión después de cambiar la contraseña exitosamente
      try {
        console.log("[UpdatePassword] Cerrando sesión después del cambio exitoso")
        await supabase.auth.signOut({ scope: "global" })
        
        // Limpiar localStorage de todos los tokens
        Object.keys(localStorage)
          .filter(k => k.startsWith("sb-") && k.includes("-auth-token"))
          .forEach(k => localStorage.removeItem(k))
      } catch (signOutError) {
        console.error("[UpdatePassword] Error cerrando sesión post-cambio:", signOutError)
        // No es crítico si falla, ya cambiamos la contraseña
      }
      
      // Redirigir después de un pequeño delay
      setTimeout(() => {
        window.location.replace("/login")
      }, 1500)
      
    } catch (err: any) {
      console.error("[UpdatePassword] Error:", err)
      toast({ 
        title: "Error", 
        description: err.message || "No se pudo actualizar la contraseña. Solicita un nuevo enlace de recuperación.", 
        variant: "destructive" 
      })
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-24 pb-24 container mx-auto px-4 max-w-md">
        <Card className="bg-card/60 backdrop-blur-sm border-border/40">
          <CardHeader>
            <CardTitle className="text-lg">Establecer nueva contraseña</CardTitle>
          </CardHeader>
          <CardContent>
            {!sessionReady ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 className="w-4 h-4 animate-spin" />
                Preparando formulario...
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pw1">Nueva contraseña</Label>
                  <Input id="pw1" type="password" required value={pw1} onChange={e => setPw1(e.target.value)} minLength={7} autoComplete="new-password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pw2">Repite contraseña</Label>
                  <Input id="pw2" type="password" required value={pw2} onChange={e => setPw2(e.target.value)} minLength={7} autoComplete="new-password" />
                </div>
                <div className="space-y-2 text-xs">
                  <div className="font-medium">Requisitos:</div>
                  <ul className="space-y-1">
                    {pwChecks.map(c => (
                      <li key={c.msg} className={`flex items-center gap-2 ${c.ok ? "text-emerald-600" : "text-muted-foreground"}`}>
                        <span className={`w-2 h-2 rounded-full ${c.ok ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
                        {c.msg}
                      </li>
                    ))}
                  </ul>
                  {pw1 && pwErrors.length === 0 && <div className="text-emerald-600 font-medium">Contraseña válida</div>}
                </div>
                <HeroButton type="submit" disabled={updating || pwErrors.length > 0 || pw1 !== pw2 || !sessionReady}>
                  {updating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Guardar
                </HeroButton>
                <p className="text-xs text-muted-foreground">El enlace es temporal. Si caduca, repite el proceso.</p>
              </form>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  )
}

export default UpdatePassword