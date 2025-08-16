import Navbar from "@/components/layout/Navbar"
import Hero from "@/components/sections/Hero"
import About from "@/components/sections/About"
import Chef from "@/components/sections/Chef"
import FeaturedProducts from "@/components/sections/FeaturedProducts"
import Location from "@/components/sections/Location"
import Footer from "@/components/sections/Footer"

const Index = () => {
  return (
    <div className="min-h-screen">
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
