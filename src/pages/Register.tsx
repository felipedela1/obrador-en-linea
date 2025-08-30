import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/sections/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { HeroButton } from "@/components/ui/hero-button";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, Lock, Mail, User, Sparkles, Loader2, AlertCircle, ShieldCheck, Phone, MapPin } from "lucide-react";

const Register = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Validaciones
  const validLength = password.length >= 7;
  const hasUpper = /[A-Z]/.test(password);
  const validPassword = validLength && hasUpper;

  const emailOk = /^\S+@\S+\.\S+$/.test(email);
  // Acepta +34, espacios y 9 dígitos (ES). Rechaza letras.
  const phoneSanitized = phone.replace(/[^\d+]/g, "");
  const phoneOk = /^(\+?\d{1,3})?\d{9,12}$/.test(phoneSanitized);
  const addressOk = address.trim().length >= 5;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setSuccess(false);

    if (!emailOk) { setError("Email no válido"); return; }
    if (!validPassword) { setError("La contraseña no cumple los requisitos"); return; }
    if (!phoneOk) { setError("Teléfono no válido"); return; }
    if (!addressOk) { setError("Dirección demasiado corta"); return; }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nombre: name,
            telefono: phoneSanitized,
            direccion_entrega: address.trim()
          },
          emailRedirectTo: window.location.origin + "/auth-confirm"
        }
      });
      if (error) throw error;
      try { localStorage.setItem("pendingVerifyEmail", email); } catch {}
      setSuccess(true);
      setTimeout(() => navigate("/check-email"), 900);
    } catch (err: any) {
      setError(err.message || "Error creando cuenta");
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
      <main className="flex-1 pt-0 pb-24 px-6 flex flex-col">
        {/* HERO HEADER */}
        <section className="relative max-w-5xl mx-auto text-center mb-12 md:mb-16" style={{ opacity: 0, animation: mounted ? 'fade-in 0.9s ease forwards' : undefined }}>
          <div className="inline-flex items-center gap-2 px-6 py-2 premium-glass gradient-border rounded-full text-sm font-medium text-slate-800 mb-8">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span className="tracking-wider">CREA TU ESPACIO</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6"><span className="shimmer-title">Crear cuenta</span></h1>
          <p className="text-base md:text-lg max-w-2xl mx-auto text-black/80 font-light leading-relaxed">
            Regístrate para acceder a reservas y gestionar tus elecciones artesanales premium.
          </p>
          <div className="h-[2px] w-56 mx-auto mt-10 bg-gradient-to-r from-transparent via-blue-400 to-transparent" />
        </section>
        {/* FORM SECTION */}
        <section className="relative max-w-md w-full mx-auto" style={{ opacity: 0, animation: mounted ? 'fade-in 0.9s ease forwards 0.15s' : undefined }}>
          <Card className="premium-glass gradient-border border-0 relative overflow-hidden hover-float focus-within:shadow-glow-blue transition-shadow" aria-labelledby="register-title" aria-describedby={error ? 'register-error' : 'register-desc'}>
            <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_70%_30%,rgba(255,255,255,0.45),transparent_65%)]" />
            <CardHeader className="relative space-y-2 pb-4">
              <CardTitle id="register-title" className="text-2xl font-bold text-slate-900"><span className="shimmer-title">Datos básicos</span></CardTitle>
              <CardDescription id="register-desc" className="text-slate-700">Completa los campos para continuar</CardDescription>
            </CardHeader>
            <CardContent className="relative pt-0 pb-6">
              <form onSubmit={handleSubmit} className="space-y-6" aria-busy={loading} noValidate>
                {/* Nombre */}
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-600" aria-hidden="true" /> Nombre
                  </label>
                  <div className="relative group">
                    <Input
                      id="name"
                      placeholder="Tu nombre"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      required
                      aria-required="true"
                      className="pl-10 bg-white/70 focus:bg-white transition-colors placeholder:text-slate-500"
                    />
                    <User className="w-4 h-4 text-blue-600 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-80" aria-hidden="true" />
                  </div>
                </div>

                {/* Email */}
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
                      className="pl-10 bg-white/70 focus:bg-white transition-colors placeholder:text-slate-500"
                    />
                    <Mail className="w-4 h-4 text-blue-600 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-80" aria-hidden="true" />
                  </div>
                  {!emailOk && email.length > 0 && (
                    <p className="text-[10px] text-destructive font-medium">Introduce un email válido.</p>
                  )}
                </div>

                {/* Teléfono */}
                <div className="space-y-2">
                  <label htmlFor="phone" className="text-sm font-medium flex items-center gap-2">
                    <Phone className="w-4 h-4 text-blue-600" aria-hidden="true" /> Teléfono
                  </label>
                  <div className="relative group">
                    <Input
                      id="phone"
                      inputMode="tel"
                      placeholder="+34 612 345 678"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      required
                      aria-required="true"
                      aria-invalid={!!phone && !phoneOk}
                      className="pl-10 bg-white/70 focus:bg-white transition-colors placeholder:text-slate-500"
                    />
                    <Phone className="w-4 h-4 text-blue-600 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-80" aria-hidden="true" />
                  </div>
                  {!phoneOk && phone.length > 0 && (
                    <p className="text-[10px] text-destructive font-medium">Teléfono no válido (usa prefijo y 9 dígitos).</p>
                  )}
                </div>

                {/* Dirección de entrega */}
                <div className="space-y-2">
                  <label htmlFor="address" className="text-sm font-medium flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-blue-600" aria-hidden="true" /> Dirección de entrega
                  </label>
                  <div className="relative group">
                    <Input
                      id="address"
                      placeholder="Calle, número, piso, CP, ciudad"
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                      required
                      aria-required="true"
                      aria-invalid={!!address && !addressOk}
                      className="pl-10 bg-white/70 focus:bg-white transition-colors placeholder:text-slate-500"
                    />
                    <MapPin className="w-4 h-4 text-blue-600 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-80" aria-hidden="true" />
                  </div>
                  {!addressOk && address.length > 0 && (
                    <p className="text-[10px] text-destructive font-medium">Añade una dirección más descriptiva.</p>
                  )}
                </div>

                {/* Password + requisitos */}
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium flex items-center gap-2">
                    <Lock className="w-4 h-4 text-blue-600" aria-hidden="true" /> Contraseña
                  </label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="********"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      aria-required="true"
                      aria-invalid={!!password && !validPassword}
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
                  <ul className="text-[10px] font-medium space-y-1 mt-1" aria-live="polite">
                    <li className={validLength ? 'text-emerald-600 flex items-center gap-1' : 'text-slate-500 flex items-center gap-1'}>
                      <ShieldCheck className="w-3 h-3" /> Mínimo 7 caracteres
                    </li>
                    <li className={hasUpper ? 'text-emerald-600 flex items-center gap-1' : 'text-slate-500 flex items-center gap-1'}>
                      <ShieldCheck className="w-3 h-3" /> Al menos 1 mayúscula
                    </li>
                  </ul>
                  {!validPassword && password.length > 0 && (
                    <p className="text-[10px] text-destructive font-medium">La contraseña no cumple los requisitos.</p>
                  )}
                </div>

                {error && (
                  <div id="register-error" role="alert" aria-live="assertive" className="text-xs font-medium text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2 flex items-start gap-2 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 mt-0.5" aria-hidden="true" />
                    <span>{error}</span>
                  </div>
                )}
                {success && (
                  <div role="status" aria-live="polite" className="text-xs font-medium text-emerald-700 bg-emerald-500/10 border border-emerald-500/30 rounded-md px-3 py-2 flex items-start gap-2 animate-in fade-in">
                    <ShieldCheck className="w-4 h-4 mt-0.5" aria-hidden="true" />
                    <span>Cuenta creada. Revisa tu correo para confirmar.</span>
                  </div>
                )}
                <HeroButton
                  type="submit"
                  variant="confirm"
                  disabled={loading || !validPassword || !emailOk || !phoneOk || !addressOk}
                  aria-disabled={loading || !validPassword || !emailOk || !phoneOk || !addressOk}
                  className="w-full justify-center h-12 text-base tracking-wide"
                >
                  {loading && <Loader2 className="w-5 h-5 mr-2 animate-spin" aria-hidden="true" />} {loading ? "Creando..." : "Crear cuenta"}
                </HeroButton>
                <div className="text-center text-xs text-slate-600">
                  ¿Ya tienes cuenta? {" "}
                  <Link to="/login" className="text-blue-700 hover:underline hover:text-blue-800 font-medium">Inicia sesión</Link>
                </div>
              </form>
            </CardContent>
          </Card>
          <div className="mt-10 text-center text-xs text-slate-600 max-w-sm mx-auto" style={{ opacity: 0, animation: mounted ? 'fade-in 0.9s ease forwards 0.4s' : undefined }}>
            <p className="leading-relaxed">
              Tras registrarte recibirás un correo para confirmar tu cuenta y activar todas las funciones premium.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Register;
