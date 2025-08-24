import { useEffect, useState } from "react"
import Navbar from "@/components/layout/Navbar"
import Footer from "@/components/sections/Footer"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input" 
import { Label } from "@/components/ui/label"
import { HeroButton } from "@/components/ui/hero-button"
import { useToast } from "@/components/ui/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { Loader2, ShieldCheck, Eye, EyeOff, Lock, Sparkles, AlertCircle } from "lucide-react"

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
  const [showPw1, setShowPw1] = useState(false)
  const [showPw2, setShowPw2] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  // 1. Validar tokens
  useEffect(() => {
    const frag = window.location.hash
    console.log("[UpdatePassword] Fragment recibido:", frag)
    if (!frag || !frag.includes("access_token=")) {
      toast({ title: "Enlace inválido", description: "El enlace de recuperación no es válido. Solicita uno nuevo.", variant: "destructive" })
      setTimeout(() => window.location.replace("/"), 2000)
      return
    }
    const { access_token, refresh_token, type } = extractTokens(frag)
    console.log("[UpdatePassword] Tokens extraídos:", { hasAccess: !!access_token, hasRefresh: !!refresh_token, type })
    if (type !== "recovery" || !access_token || !refresh_token) {
      toast({ title: "Enlace inválido", description: "El enlace no es válido o ha expirado.", variant: "destructive" })
      setTimeout(() => window.location.replace("/"), 2000)
      return
    }
    setAccessToken(access_token)
    setRefreshToken(refresh_token)
    try {
      const keysToRemove = Object.keys(localStorage).filter(k => k.startsWith("sb-") && k.includes("-auth-token"))
      keysToRemove.forEach(k => localStorage.removeItem(k))
    } catch (e) { console.error("[UpdatePassword] Error limpiando localStorage", e) }
    setSessionReady(true)
  }, [toast])

  useEffect(() => {
    const { errors, checks } = policyChecks(pw1)
    setPwErrors(errors)
    setPwChecks(checks)
  }, [pw1])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!accessToken || !refreshToken) { toast({ title: "Token inválido", description: "Repite el proceso", variant: "destructive" }); return }
    if (pwErrors.length) { toast({ title: "Contraseña inválida", description: pwErrors[0], variant: "destructive" }); return }
    if (pw1 !== pw2) { toast({ title: "No coinciden", description: "Repite la misma contraseña", variant: "destructive" }); return }
    setUpdating(true)
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://upkjxuvwttqwemsoafcq.supabase.co"
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ""
      const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}`, 'apikey': supabaseAnonKey },
        body: JSON.stringify({ password: pw1 })
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        if (response.status === 403) throw new Error("El enlace ha expirado. Solicita uno nuevo.")
        if (response.status === 422) throw new Error("La contraseña no cumple requisitos de seguridad.")
        throw new Error(errorData.error_description || errorData.message || `Error ${response.status}`)
      }
      await response.json().catch(() => ({}))
      toast({ title: "Contraseña actualizada", description: "Inicia sesión con la nueva contraseña." })
      try {
        await supabase.auth.signOut({ scope: "global" })
        Object.keys(localStorage).filter(k => k.startsWith("sb-") && k.includes("-auth-token")).forEach(k => localStorage.removeItem(k))
      } catch (signOutError) { console.error("[UpdatePassword] Error signOut post-cambio", signOutError) }
      setTimeout(() => { window.location.replace("/login") }, 1400)
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "No se pudo actualizar la contraseña", variant: "destructive" })
    } finally { setUpdating(false) }
  }

  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden">
      <Navbar />
      {/* BACKGROUND DECORATIONS */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-20 w-[32rem] h-[32rem] bg-blue-400/25 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute top-1/3 -right-24 w-[40rem] h-[40rem] bg-indigo-500/15 rounded-full blur-[140px] animate-pulse-medium" />
        <div className="absolute bottom-[-12rem] left-1/4 w-[50rem] h-[50rem] bg-sky-300/10 rounded-full blur-[150px] animate-pulse-fast" />
      </div>
      <main className="flex-1 pt-24 pb-24 px-6 flex flex-col">
        {/* HERO HEADER */}
        <section className="relative max-w-5xl mx-auto text-center mb-12 md:mb-16" style={{ opacity: 0, animation: mounted ? 'fade-in 0.9s ease forwards' : undefined }}>
          <div className="inline-flex items-center gap-2 px-6 py-2 premium-glass gradient-border rounded-full text-sm font-medium text-slate-800 mb-8">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span className="tracking-wider">SEGURIDAD</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6"><span className="shimmer-title">Nueva contraseña</span></h1>
          <p className="text-base md:text-lg max-w-2xl mx-auto text-black/80 font-light leading-relaxed">
            Introduce y confirma tu nueva contraseña para recuperar acceso seguro a tu cuenta.
          </p>
          <div className="h-[2px] w-56 mx-auto mt-10 bg-gradient-to-r from-transparent via-blue-400 to-transparent" />
        </section>
        {/* FORM */}
        <section className="relative max-w-md w-full mx-auto" style={{ opacity: 0, animation: mounted ? 'fade-in 0.9s ease forwards 0.15s' : undefined }}>
          <Card className="premium-glass gradient-border border-0 relative overflow-hidden hover-float focus-within:shadow-glow-blue transition-shadow" aria-labelledby="update-title" aria-describedby={!sessionReady ? 'update-preparing' : 'update-desc'}>
            <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_70%_30%,rgba(255,255,255,0.45),transparent_65%)]" />
            <CardHeader className="relative space-y-2 pb-4">
              <CardTitle id="update-title" className="text-2xl font-bold text-slate-900"><span className="shimmer-title">Establecer contraseña</span></CardTitle>
              <CardDescription id="update-desc" className="text-slate-700">Cumple los requisitos de seguridad</CardDescription>
            </CardHeader>
            <CardContent className="relative pt-0 pb-6">
              {!sessionReady ? (
                <div id="update-preparing" className="flex items-center gap-2 text-sm text-slate-600 py-4" role="status" aria-live="polite">
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Preparando formulario...
                </div>
              ) : (
                <form onSubmit={submit} className="space-y-6" aria-busy={updating} noValidate>
                  <div className="space-y-2">
                    <Label htmlFor="pw1" className="text-sm font-medium flex items-center gap-2">
                      <Lock className="w-4 h-4 text-blue-600" aria-hidden="true" /> Nueva contraseña
                    </Label>
                    <div className="relative">
                      <Input id="pw1" type={showPw1 ? "text" : "password"} required value={pw1} onChange={e => setPw1(e.target.value)} minLength={7} autoComplete="new-password" aria-required="true" aria-invalid={!!pw1 && pwErrors.length > 0} className="pr-12 bg-white/70 focus:bg-white transition-colors placeholder:text-slate-500" />
                      <button type="button" aria-label={showPw1 ? "Ocultar contraseña" : "Mostrar contraseña"} onClick={() => setShowPw1(s => !s)} className="absolute inset-y-0 right-0 px-3 flex items-center text-slate-600 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-r-md">
                        {showPw1 ? <EyeOff className="w-5 h-5" aria-hidden="true" /> : <Eye className="w-5 h-5" aria-hidden="true" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pw2" className="text-sm font-medium flex items-center gap-2">
                      <Lock className="w-4 h-4 text-blue-600" aria-hidden="true" /> Repite contraseña
                    </Label>
                    <div className="relative">
                      <Input id="pw2" type={showPw2 ? "text" : "password"} required value={pw2} onChange={e => setPw2(e.target.value)} minLength={7} autoComplete="new-password" aria-required="true" aria-invalid={!!pw2 && (pw1 !== pw2)} className="pr-12 bg-white/70 focus:bg-white transition-colors placeholder:text-slate-500" />
                      <button type="button" aria-label={showPw2 ? "Ocultar contraseña" : "Mostrar contraseña"} onClick={() => setShowPw2(s => !s)} className="absolute inset-y-0 right-0 px-3 flex items-center text-slate-600 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-r-md">
                        {showPw2 ? <EyeOff className="w-5 h-5" aria-hidden="true" /> : <Eye className="w-5 h-5" aria-hidden="true" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2 text-xs" aria-live="polite">
                    <div className="font-medium">Requisitos:</div>
                    <ul className="space-y-1">
                      {pwChecks.map(c => (
                        <li key={c.msg} className={`flex items-center gap-2 ${c.ok ? "text-emerald-600" : "text-slate-600"}`}>
                          <ShieldCheck className={`w-3 h-3 ${c.ok ? "text-emerald-600" : "text-slate-400"}`} aria-hidden="true" /> {c.msg}
                        </li>
                      ))}
                    </ul>
                    {pw1 && pwErrors.length === 0 && <div className="text-emerald-600 font-medium flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Contraseña válida</div>}
                    {pw1 && pw2 && pw1 !== pw2 && <div className="text-destructive font-medium flex items-center gap-1 text-[11px]"><AlertCircle className="w-3 h-3" /> No coinciden</div>}
                  </div>
                  <HeroButton type="submit" variant="confirm" disabled={updating || pwErrors.length > 0 || pw1 !== pw2 || !sessionReady} aria-disabled={updating || pwErrors.length > 0 || pw1 !== pw2 || !sessionReady} className="w-full justify-center h-12 text-base tracking-wide">
                    {updating && <Loader2 className="w-5 h-5 mr-2 animate-spin" aria-hidden="true" />} Guardar
                  </HeroButton>
                  <p className="text-[11px] text-slate-600 leading-relaxed">El enlace es temporal. Si caduca, solicita otro proceso de recuperación.</p>
                </form>
              )}
            </CardContent>
          </Card>
        </section>
      </main>
      <Footer />
    </div>
  )
}

export default UpdatePassword