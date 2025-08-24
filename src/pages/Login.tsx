import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/sections/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link, useNavigate } from "react-router-dom";
import { HeroButton } from "@/components/ui/hero-button";
import { Eye, EyeOff, Lock, Mail, Sparkles, Loader2, AlertCircle } from "lucide-react";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate("/");
    } catch (e: any) {
      setError(e.message || "Error iniciando sesión");
    } finally {
      setLoading(false);
    }
  };

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
            <span className="tracking-wider">ACCESO SEGURO</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6"><span className="shimmer-title">Inicia Sesión</span></h1>
          <p className="text-base md:text-lg max-w-2xl mx-auto text-black/80 font-light leading-relaxed">
            Ingresa a tu espacio premium para gestionar reservas, productos y experiencias artesanales.
          </p>
          <div className="h-[2px] w-56 mx-auto mt-10 bg-gradient-to-r from-transparent via-blue-400 to-transparent" />
        </section>
        {/* FORM SECTION */}
        <section className="relative max-w-md w-full mx-auto" style={{ opacity: 0, animation: mounted ? 'fade-in 0.9s ease forwards 0.15s' : undefined }}>
          <Card className="premium-glass gradient-border border-0 relative overflow-hidden hover-float focus-within:shadow-glow-blue transition-shadow" aria-labelledby="login-title" aria-describedby={error ? 'login-error' : 'login-desc'}>
            <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.4),transparent_60%)]" />
            <CardHeader className="relative space-y-2 pb-4">
              <CardTitle id="login-title" className="text-2xl font-bold text-slate-900"><span className="shimmer-title">Acceder</span></CardTitle>
              <CardDescription id="login-desc" className="text-slate-700">Introduce tus credenciales para continuar</CardDescription>
            </CardHeader>
            <CardContent className="relative pt-0 pb-6">
              <form onSubmit={handleSubmit} className="space-y-6" aria-busy={loading} noValidate>
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                    <Mail className="w-4 h-4 text-blue-600" aria-hidden="true" /> Email
                  </label>
                  <div className="relative group">
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="tu@email.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      aria-required="true"
                      aria-invalid={!!error}
                      className="pl-10 bg-white/70 focus:bg-white transition-colors placeholder:text-slate-500"
                    />
                    <Mail className="w-4 h-4 text-blue-600 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-80" aria-hidden="true" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium flex items-center gap-2">
                    <Lock className="w-4 h-4 text-blue-600" aria-hidden="true" /> Contraseña
                  </label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="********"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      aria-required="true"
                      aria-invalid={!!error}
                      className="pr-12 bg-white/70 focus:bg-white transition-colors placeholder:text-slate-500"
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                      onClick={() => setShowPassword(s => !s)}
                      className="absolute inset-y-0 right-0 px-3 flex items-center text-slate-600 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-r-md"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" aria-hidden="true" /> : <Eye className="w-5 h-5" aria-hidden="true" />}
                    </button>
                  </div>
                </div>
                {error && (
                  <div id="login-error" role="alert" aria-live="assertive" className="text-xs font-medium text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2 flex items-start gap-2 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 mt-0.5" aria-hidden="true" />
                    <span>{error}</span>
                  </div>
                )}
                <HeroButton
                  type="submit"
                  variant="confirm"
                  disabled={loading}
                  aria-disabled={loading}
                  className="w-full justify-center h-12 text-base tracking-wide"
                >
                  {loading && <Loader2 className="w-5 h-5 mr-2 animate-spin" aria-hidden="true" />} {loading ? "Ingresando..." : "Entrar"}
                </HeroButton>
                <div className="flex flex-col gap-2 text-xs text-slate-600">
                  <Link to="/reset-password" className="text-blue-700 hover:underline hover:text-blue-800 font-medium">
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
                <div className="text-center text-xs text-slate-600">
                  ¿Aún no tienes cuenta? {" "}
                  <Link to="/register" className="text-blue-700 hover:underline hover:text-blue-800 font-medium">Crear cuenta</Link>
                </div>
              </form>
            </CardContent>
          </Card>
          {/* CTA FINAL opcional */}
          <div className="mt-10 text-center text-xs text-slate-600 max-w-sm mx-auto" style={{ opacity: 0, animation: mounted ? 'fade-in 0.9s ease forwards 0.4s' : undefined }}>
            <p className="leading-relaxed">
              La seguridad de tu sesión está protegida con las mejores prácticas. Mantén tus credenciales en privado.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Login;
