import { useState, useEffect } from "react"
import Navbar from "@/components/layout/Navbar"
import Footer from "@/components/sections/Footer"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { HeroButton } from "@/components/ui/hero-button"
import { useToast } from "@/components/ui/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { Loader2, Mail, Sparkles, AlertCircle } from "lucide-react"

const APP_URL = import.meta.env.VITE_APP_URL || window.location.origin

const ResetPasswordRequest = () => {
  const { toast } = useToast()
  const [email, setEmail] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || sending) return
    setSending(true)
    setError(null)
    setSuccess(false)
    try {
      console.log("[ResetPassword] Enviando email de recuperación a:", email)
      console.log("[ResetPassword] URL de redirección:", `${APP_URL}/update-password`)
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${APP_URL}/update-password` })
      if (error) throw error
      toast({ title: "Correo enviado", description: "Revisa tu bandeja y sigue el enlace." })
      setSuccess(true)
      setEmail("")
    } catch (err: any) {
      console.error("[ResetPassword] Error:", err)
      setError(err.message || "No se pudo enviar")
      toast({ title: "Error", description: err.message || "No se pudo enviar", variant: "destructive" })
    } finally { setSending(false) }
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
      <main className="flex-1 pt-0 pb-24 px-6 flex flex-col">
        {/* HERO HEADER */}
        <section className="relative max-w-5xl mx-auto text-center mb-12 md:mb-16" style={{ opacity: 0, animation: mounted ? 'fade-in 0.9s ease forwards' : undefined }}>
          <div className="inline-flex items-center gap-2 px-6 py-2 premium-glass gradient-border rounded-full text-sm font-medium text-slate-800 mb-8">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span className="tracking-wider">RECUPERACIÓN</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6"><span className="shimmer-title">Recuperar acceso</span></h1>
          <p className="text-base md:text-lg max-w-2xl mx-auto text-black/80 font-light leading-relaxed">
            Introduce tu email y te enviaremos un enlace temporal para restablecer tu contraseña.
          </p>
          <div className="h-[2px] w-56 mx-auto mt-10 bg-gradient-to-r from-transparent via-blue-400 to-transparent" />
        </section>
        {/* FORM */}
        <section className="relative max-w-md w-full mx-auto" style={{ opacity: 0, animation: mounted ? 'fade-in 0.9s ease forwards 0.15s' : undefined }}>
          <Card className="premium-glass gradient-border border-0 relative overflow-hidden hover-float focus-within:shadow-glow-blue transition-shadow" aria-labelledby="reset-title" aria-describedby={error ? 'reset-error' : 'reset-desc'}>
            <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.4),transparent_60%)]" />
            <CardHeader className="relative space-y-2 pb-4">
              <CardTitle id="reset-title" className="text-2xl font-bold text-slate-900"><span className="shimmer-title">Restablecer contraseña</span></CardTitle>
              <CardDescription id="reset-desc" className="text-slate-700">Recibirás un enlace temporal</CardDescription>
            </CardHeader>
            <CardContent className="relative pt-0 pb-6">
              <form onSubmit={submit} className="space-y-6" aria-busy={sending} noValidate>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                    <Mail className="w-4 h-4 text-blue-600" aria-hidden="true" /> Email
                  </Label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      required
                      placeholder="tu@correo.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      autoComplete="email"
                      aria-required="true"
                      aria-invalid={!!error}
                      className="pl-10 bg-white/70 focus:bg-white transition-colors placeholder:text-slate-500"
                    />
                    <Mail className="w-4 h-4 text-blue-600 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-80" aria-hidden="true" />
                  </div>
                </div>
                {error && (
                  <div id="reset-error" role="alert" aria-live="assertive" className="text-xs font-medium text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2 flex items-start gap-2 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 mt-0.5" aria-hidden="true" />
                    <span>{error}</span>
                  </div>
                )}
                {success && (
                  <div role="status" aria-live="polite" className="text-xs font-medium text-emerald-700 bg-emerald-500/10 border border-emerald-500/30 rounded-md px-3 py-2 flex items-start gap-2 animate-in fade-in">
                    <Mail className="w-4 h-4 mt-0.5" aria-hidden="true" />
                    <span>Correo enviado. Revisa tu bandeja.</span>
                  </div>
                )}
                <HeroButton type="submit" variant="confirm" disabled={sending || !email} aria-disabled={sending || !email} className="w-full justify-center h-12 text-base tracking-wide">
                  {sending && <Loader2 className="w-5 h-5 mr-2 animate-spin" aria-hidden="true" />} Enviar enlace
                </HeroButton>
                <p className="text-[11px] text-slate-600 leading-relaxed">Si no recibes el correo en unos minutos, revisa tu carpeta de spam o solicita uno nuevo.</p>
              </form>
            </CardContent>
          </Card>
        </section>
      </main>
      <Footer />
    </div>
  )
}

export default ResetPasswordRequest