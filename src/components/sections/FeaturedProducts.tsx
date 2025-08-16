import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { HeroButton } from "@/components/ui/hero-button"
import { Leaf, Star, Clock } from "lucide-react"
import croissantsImage from "@/assets/croissants.jpg"
import sourdoughImage from "@/assets/sourdough.jpg"
import cheesecakeImage from "@/assets/cheesecake.jpg"

const FeaturedProducts = () => {
  const products = [
    {
      name: "Croissants Artesanales",
      category: "Bollería",
      price: "2,50",
      image: croissantsImage,
      description: "Laminado perfecto con mantequilla francesa, fermentación de 12 horas",
      tags: ["Recién horneado", "Mantequilla premium"],
      rating: 4.9,
      available: true
    },
    {
      name: "Pan de Masa Madre",
      category: "Panes",
      price: "4,80",
      image: sourdoughImage,
      description: "Fermentación natural de 24 horas, corteza crujiente, miga alveolada",
      tags: ["Masa madre", "Ecológico"],
      rating: 5.0,
      available: true
    },
    {
      name: "Tarta de Queso Artesana",
      category: "Tartas",
      price: "18,00",
      image: cheesecakeImage,
      description: "Queso cremoso, base de galleta casera, frutos rojos de temporada",
      tags: ["Hecho a medida", "Frutos rojos"],
      rating: 4.8,
      available: false
    }
  ]

  return (
    <section className="py-20 bg-gradient-warm">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4 text-sm font-medium">
            Productos destacados
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Lo mejor de cada día
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Selección especial de nuestros productos más queridos, elaborados cada mañana 
            con ingredientes frescos y técnicas tradicionales.
          </p>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {products.map((product, index) => (
            <Card key={index} className="group overflow-hidden border-0 bg-card/60 backdrop-blur-sm hover:shadow-glow transition-all duration-500">
              <div className="relative overflow-hidden">
                <img 
                  src={product.image} 
                  alt={product.name}
                  className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute top-4 left-4">
                  <Badge variant="secondary" className="bg-white/90 text-foreground">
                    {product.category}
                  </Badge>
                </div>
                <div className="absolute top-4 right-4">
                  <div className="flex items-center gap-1 bg-white/90 px-2 py-1 rounded-full text-sm">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">{product.rating}</span>
                  </div>
                </div>
                {!product.available && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <Badge variant="destructive" className="text-sm">
                      Próximamente
                    </Badge>
                  </div>
                )}
              </div>
              
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                    {product.name}
                  </h3>
                  <div className="text-2xl font-bold text-primary">
                    {product.price}€
                  </div>
                </div>
                
                <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
                  {product.description}
                </p>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  {product.tags.map((tag, tagIndex) => (
                    <div key={tagIndex} className="flex items-center gap-1 text-xs text-primary bg-primary/10 px-2 py-1 rounded-full">
                      <Leaf className="w-3 h-3" />
                      {tag}
                    </div>
                  ))}
                </div>
                
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                  <Clock className="w-4 h-4" />
                  <span>Disponible mañana desde las 8:00</span>
                </div>
                
                <HeroButton 
                  variant="secondary" 
                  className="w-full"
                  disabled={!product.available}
                >
                  {product.available ? "Reservar" : "Próximamente"}
                </HeroButton>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center">
          <HeroButton variant="hero" className="mb-4">
            Ver catálogo completo
          </HeroButton>
          <p className="text-sm text-muted-foreground">
            Más de 30 productos artesanales te esperan
          </p>
        </div>
      </div>
    </section>
  )
}

export default FeaturedProducts