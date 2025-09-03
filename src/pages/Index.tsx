import Navbar from "@/components/layout/Navbar"
import Hero from "@/components/sections/Hero"
import About from "@/components/sections/About"
import Chef from "@/components/sections/Chef"
import FeaturedProducts from "@/components/sections/FeaturedProducts"
import Location from "@/components/sections/Location"
import Footer from "@/components/sections/Footer"
import { Helmet } from 'react-helmet-async'

const Index = () => {
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
