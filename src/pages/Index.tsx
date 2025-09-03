import Navbar from "@/components/layout/Navbar"
import Hero from "@/components/sections/Hero"
import About from "@/components/sections/About"
import Chef from "@/components/sections/Chef"
import FeaturedProducts from "@/components/sections/FeaturedProducts"
import Location from "@/components/sections/Location"
import Footer from "@/components/sections/Footer"
import { Helmet } from 'react-helmet-async'
import { useAuth } from '@/contexts/AuthContext'
import { Loader2 } from 'lucide-react'
import { Button } from "@/components/ui/button"

const Index = () => {
  const { authLoading, authWarning, retryAuth } = useAuth()

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="text-center max-w-md w-full">
            {authWarning ? (
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-gradient-to-br from-amber-500 to-yellow-500 flex items-center justify-center text-white shadow-xl">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
                <h2 className="text-2xl font-bold">Problema de autenticación</h2>
                <p className="text-gray-700 text-sm">{authWarning}</p>
                <div className="flex items-center justify-center gap-3">
                  <Button onClick={retryAuth} className="bg-blue-600 text-white">Reintentar</Button>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xl">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Iniciando sesión automáticamente...</h2>
                <p className="text-gray-600">Por favor espera mientras te conectamos con tu cuenta.</p>
              </div>
            )}
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Helmet>
        <title>Obrador d'Luis - Panadería Artesanal Vasca en Andoain | Inicio</title>
        <meta name="description" content="Bienvenido a Obrador d'Luis, la panadería artesanal vasca en Andoain. Descubre nuestros productos de masa madre y reserva online. ¡Sabor auténtico de Gipuzkoa!" />
        <meta name="keywords" content="panadería Andoain, masa madre vasca, pan artesanal Gipuzkoa, Obrador d'Luis inicio, reserva online panadería" />
        <link rel="canonical" href="https://tu-dominio.com/" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": "Inicio - Obrador d'Luis",
            "description": "Página principal de la panadería artesanal vasca en Andoain"
          })}
        </script>
      </Helmet>
      <Navbar />
      <main>
        <Hero />
        <div id="about">
          <About />
        </div>
        <div id="chef">
          <Chef />
        </div>
        <FeaturedProducts />
        <div id="location">
          <Location />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Index;
