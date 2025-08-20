import { useState } from "react"
import Navbar from "@/components/layout/Navbar"
import Footer from "@/components/sections/Footer"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { HeroButton } from "@/components/ui/hero-button"
import { useToast } from "@/components/ui/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { Loader2, Mail } from "lucide-react"

const APP_URL = import.meta.env.VITE_APP_URL || window.location.origin

const ResetPasswordRequest = () => {
  const { toast } = useToast()
  const [email, setEmail] = useState("")
  const [sending, setSending] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setSending(true)
    try {
      console.log("[ResetPassword] Enviando email de recuperación a:", email)
      console.log("[ResetPassword] URL de redirección:", `${APP_URL}/update-password`)
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${APP_URL}/update-password`
      })
      if (error) throw error
      toast({
        title: "Correo enviado",
        description: "Revisa tu bandeja y sigue el enlace."
      })
      setEmail("") // Limpiar el campo después del envío exitoso
    } catch (err: any) {
      console.error("[ResetPassword] Error:", err)
      toast({
        title: "Error",
        description: err.message || "No se pudo enviar",
        variant: "destructive"
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-24 pb-24 container mx-auto px-4 max-w-md">
        <Card className="bg-card/60 backdrop-blur-sm border-border/40">
          <CardHeader>
            <CardTitle className="text-lg">Recuperar contraseña</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  placeholder="tu@correo.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
              <HeroButton type="submit" disabled={sending || !email}>
                {sending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Enviar enlace
              </HeroButton>
              <p className="text-xs text-muted-foreground">
                Te enviaremos un enlace temporal para establecer una nueva contraseña.
              </p>
            </form>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  )
}

export default ResetPasswordRequest