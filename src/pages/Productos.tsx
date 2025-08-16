import Navbar from "@/components/layout/Navbar"
import Footer from "@/components/sections/Footer"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { HeroButton } from "@/components/ui/hero-button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Filter, Star, Leaf } from "lucide-react"

const Productos = () => {
  // Mock data - en el futuro vendrá de la API
  const products = [
    {
      id: 1,
      name: "Croissant Tradicional",
      category: "bolleria",
      price: 2.50,
      image: "/placeholder.svg",
      description: "Laminado perfecto con mantequilla francesa",
      tags: ["Recién horneado"],
      rating: 4.9,
      available: true
    },
    {
      id: 2,
      name: "Pan de Masa Madre",
      category: "panes",
      price: 4.80,
      image: "/placeholder.svg",
      description: "Fermentación natural de 24 horas",
      tags: ["Masa madre", "Ecológico"],
      rating: 5.0,
      available: true
    },
    {
      id: 3,
      name: "Baguette Francesa",
      category: "panes",
      price: 3.20,
      image: "/placeholder.svg",
      description: "Corteza crujiente, miga alveolada",
      tags: ["Tradicional"],
      rating: 4.8,
      available: true
    },
    {
      id: 4,
      name: "Tarta de Queso",
      category: "tartas",
      price: 18.00,
      image: "/placeholder.svg",
      description: "Queso cremoso con frutos rojos",
      tags: ["Hecho a medida"],
      rating: 4.7,
      available: false
    }
  ]

  const categories = [
    { value: "all", label: "Todos los productos" },
    { value: "panes", label: "Panes" },
    { value: "bolleria", label: "Bollería" },
    { value: "tartas", label: "Tartas" },
    { value: "especiales", label: "Especiales" }
  ]

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <main className="pt-16">
        {/* Header */}
        <section className="py-20 bg-gradient-warm">
          <div className="container mx-auto px-4 text-center">
            <Badge variant="secondary" className="mb-4 text-sm font-medium">
              Catálogo completo
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
              Nuestros productos
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Descubre toda nuestra selección de panes, bollería y dulces artesanales. 
              Cada producto es elaborado diariamente con ingredientes naturales y técnicas tradicionales.
            </p>
          </div>
        </section>

        {/* Filters */}
        <section className="py-12 bg-background border-b">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input 
                    placeholder="Buscar productos..." 
                    className="pl-10 w-full sm:w-80"
                  />
                </div>
                
                <Select defaultValue="all">
                  <SelectTrigger className="w-full sm:w-48">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="text-sm text-muted-foreground">
                Mostrando {products.length} productos
              </div>
            </div>
          </div>
        </section>

        {/* Products Grid */}
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
                <Card key={product.id} className="group overflow-hidden border-0 bg-card/60 backdrop-blur-sm hover:shadow-glow transition-all duration-500">
                  <div className="relative overflow-hidden">
                    <div className="w-full h-48 bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                      <div className="text-6xl opacity-20">🥖</div>
                    </div>
                    <div className="absolute top-4 left-4">
                      <Badge variant="secondary" className="bg-white/90 text-foreground text-xs">
                        {categories.find(c => c.value === product.category)?.label}
                      </Badge>
                    </div>
                    <div className="absolute top-4 right-4">
                      <div className="flex items-center gap-1 bg-white/90 px-2 py-1 rounded-full text-xs">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium">{product.rating}</span>
                      </div>
                    </div>
                    {!product.available && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <Badge variant="destructive" className="text-xs">
                          Agotado
                        </Badge>
                      </div>
                    )}
                  </div>
                  
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">
                        {product.name}
                      </h3>
                      <div className="text-lg font-bold text-primary">
                        {product.price.toFixed(2)}€
                      </div>
                    </div>
                    
                    <p className="text-muted-foreground text-sm mb-3 leading-relaxed">
                      {product.description}
                    </p>
                    
                    <div className="flex flex-wrap gap-1 mb-4">
                      {product.tags.map((tag, tagIndex) => (
                        <div key={tagIndex} className="flex items-center gap-1 text-xs text-primary bg-primary/10 px-2 py-1 rounded-full">
                          <Leaf className="w-2 h-2" />
                          {tag}
                        </div>
                      ))}
                    </div>
                    
                    <HeroButton 
                      variant="secondary" 
                      className="w-full text-sm py-2"
                      disabled={!product.available}
                    >
                      {product.available ? "Reservar" : "Agotado"}
                    </HeroButton>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-gradient-warm">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              ¿No encuentras lo que buscas?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
              Trabajamos por encargo para eventos especiales, celebraciones y necesidades específicas. 
              Contacta con nosotros para crear algo único.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <HeroButton variant="hero">
                Contactar para encargos
              </HeroButton>
              <HeroButton variant="secondary">
                Ver nuestras especialidades
              </HeroButton>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  )
}

export default Productos