import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useRef } from "react";
import Index from "./pages/Index";
import Productos from "./pages/Productos";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Register from "./pages/Register";
import CheckEmail from "./pages/CheckEmail";
import AuthConfirm from "./pages/AuthConfirm";
import Admin from "./pages/Admin";
import Reservas from "./pages/Reservas";
import MisReservas from "./pages/MisReservas";
import ResetPasswordRequest from "./pages/ResetPasswordRequest";
import UpdatePassword from "./pages/UpdatePassword";
import { supabase } from "@/integrations/supabase/client";
import { useAuthIntegrity } from "@/hooks/useAuthIntegrity";
import { checkEnvironment } from "@/lib/utils";

// NUEVO: Componente para restaurar scroll al top en cada cambio de ruta
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    // Evitar comportamiento inesperado en navegaciones con hash ancla
    if (window.location.hash && window.location.hash.length > 1) return;
    // Scroll inmediato para que el usuario vea siempre el inicio de la página nueva
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

const queryClient = new QueryClient();

function App() {
  // Verificar configuración de entorno al iniciar
  useEffect(() => {
    checkEnvironment();
  }, []);

  // Activar vigilancia de integridad de sesión a nivel de app
  useAuthIntegrity();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <ScrollToTop />
          <AppInner />
          <Sonner />
          <Toaster />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

const AppInner = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const recoveryRouted = useRef(false);

  // Fallback: solo redirige a update-password si realmente viene un hash recovery completo
  useEffect(() => {
    if (recoveryRouted.current) return;
    const hash = window.location.hash;
    // Debe contener type=recovery y access_token & refresh_token
    if (/type=recovery/.test(hash) && /access_token=/.test(hash) && /refresh_token=/.test(hash)) {
      recoveryRouted.current = true;
      navigate("/update-password", { replace: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listener oficial: SOLO actuar ante PASSWORD_RECOVERY
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" && !recoveryRouted.current) {
        recoveryRouted.current = true;
        navigate("/update-password", { replace: true });
      }
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/productos" element={<Productos />} />
      <Route path="/reservas" element={<Reservas />} />
      <Route path="/misreservas" element={<MisReservas />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/check-email" element={<CheckEmail />} />
      <Route path="/auth-confirm" element={<AuthConfirm />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/reset-password" element={<ResetPasswordRequest />} />
      <Route path="/update-password" element={<UpdatePassword />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default App;
