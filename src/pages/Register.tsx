import Navbar from "@/components/layout/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const Register = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validPassword = password.length >= 7 && /[A-Z]/.test(password); // mínimo 7 y 1 mayúscula

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { nombre: name },
          // Ruta correcta de confirmación (hash tokens -> AuthConfirm)
          emailRedirectTo: window.location.origin + "/auth-confirm"
        }
      });
      if (error) throw error;
      // Guardar email para página de verificación (resend)
      try { localStorage.setItem("pendingVerifyEmail", email); } catch { /* ignore */ }
      // Redirigir a la pantalla de "revisa tu correo"
      window.location.href = "/check-email";
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4 pt-20 pb-10">
        <div className="w-full max-w-md">
          <h1 className="text-3xl font-bold text-center mb-2">Crear cuenta</h1>
          <p className="text-center text-sm text-muted-foreground mb-8">Regístrate para hacer y gestionar tus reservas.</p>
          <Card className="bg-card/60 backdrop-blur border border-border/50 shadow-sm">
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium">Nombre</label>
                  <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Tu nombre" required />
                </div>
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">Email</label>
                  <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" required />
                </div>
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium">Contraseña</label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="********"
                    required
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Requisitos: mínimo 7 caracteres y al menos 1 mayúscula.
                  </p>
                  {!validPassword && password.length > 0 && (
                    <p className="text-[10px] text-destructive">
                      La contraseña no cumple los requisitos.
                    </p>
                  )}
                </div>
                {error && <div className="text-xs text-destructive">{error}</div>}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading || !validPassword}
                >
                  {loading ? "Creando..." : "Crear cuenta"}
                </Button>
              </form>
              <div className="mt-6 text-center text-xs text-muted-foreground">
                ¿Ya tienes cuenta? <a href="/login" className="text-primary hover:underline">Inicia sesión</a>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Register;
