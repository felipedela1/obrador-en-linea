import { useEffect, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const CheckEmail = () => {
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("pendingVerifyEmail");
      if (stored) setPendingEmail(stored);
    } catch {/* ignore */}
  }, []);

  const resend = async () => {
    if (!pendingEmail) return;
    setResending(true);
    setError(null);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: pendingEmail,
        options: {
          emailRedirectTo: window.location.origin + "/auth-confirm"
        }
      });
      if (error) throw error;
      setResent(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4 pt-20 pb-10">
        <div className="max-w-md text-center space-y-6">
          <h1 className="text-3xl font-bold">Revisa tu correo</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {pendingEmail ? (
              <>Hemos enviado un enlace de confirmación a <span className="font-medium text-foreground">{pendingEmail}</span>. Haz clic en el enlace para activar tu cuenta y continuar. Si no lo encuentras revisa spam.</>
            ) : (
              <>Te hemos enviado un email de confirmación. Haz clic en el enlace para activar tu cuenta y continuar. Si no lo encuentras revisa la carpeta de spam.</>
            )}
          </p>
          {pendingEmail && (
            <div className="space-y-3">
              <div className="text-xs text-muted-foreground">¿No llegó el correo?</div>
              <Button size="sm" variant="outline" disabled={resending || resent} onClick={resend} className="mx-auto">
                {resending ? "Reenviando..." : resent ? "Enviado" : "Reenviar enlace"}
              </Button>
              {error && <div className="text-[11px] text-destructive">{error}</div>}
              {resent && !error && <div className="text-[11px] text-emerald-600">Se ha reenviado el correo.</div>}
            </div>
          )}
          <p className="text-xs text-muted-foreground">Una vez confirmada, serás redirigido de vuelta a la aplicación.</p>
          <a href="/" className="text-primary text-sm hover:underline">Volver al inicio</a>
        </div>
      </main>
    </div>
  );
};

export default CheckEmail;
