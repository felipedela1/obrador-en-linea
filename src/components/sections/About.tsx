import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Wheat, Heart, Clock, Award } from "lucide-react"

const About = () => {
  const values = [
    {
      icon: <Wheat className="w-8 h-8 text-primary" />,
      title: "Ingredientes naturales",
      description: "Solo usamos harinas ecológicas, levadura madre y ingredientes de temporada de proveedores locales."
    },
    {
      icon: <Clock className="w-8 h-8 text-primary" />,
      title: "Fermentación lenta",
      description: "Nuestros panes fermentan durante 18-24 horas para desarrollar sabores complejos y texturas únicas."
    },
    {
      icon: <Heart className="w-8 h-8 text-primary" />,
      title: "Tradición familiar",
      description: "Técnicas transmitidas de generación en generación, combinadas con innovación responsable."
    },
    {
      icon: <Award className="w-8 h-8 text-primary" />,
      title: "Horneado diario",
      description: "Cada pieza se hornea en nuestros hornos de piedra desde las 5:00 de la madrugada."
    }
  ]

  return (
    <section className="py-20 bg-gradient-warm">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4 text-sm font-medium">
            Sobre nosotros
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            El Obrador Encinas
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Desde 1987, el Obrador Encinas es sinónimo de excelencia artesanal en el corazón de Madrid. 
            Nuestra filosofía se basa en el respeto por la tradición, la calidad de los ingredientes 
            y la pasión por crear el mejor pan de cada día.
          </p>
        </div>

        {/* Values Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {values.map((value, index) => (
            <Card key={index} className="group hover:shadow-warm transition-all duration-300 border-0 bg-card/60 backdrop-blur-sm">
              <CardContent className="p-6 text-center">
                <div className="mb-4 flex justify-center group-hover:scale-110 transition-transform duration-300">
                  {value.icon}
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-3">
                  {value.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {value.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Story */}
        <div className="bg-card/40 backdrop-blur-sm rounded-2xl p-8 md:p-12 shadow-warm">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="text-2xl font-bold text-foreground mb-4">
                Nuestra historia
              </h3>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  Todo comenzó con la pasión de Antonio Encinas por el pan auténtico. 
                  En 1987, abrió las puertas de este pequeño obrador con una misión clara: 
                  devolver a Madrid el sabor del pan tradicional.
                </p>
                <p>
                  Hoy, dirigido por su hijo Luis Encinas, mantenemos viva esa tradición 
                  mientras exploramos nuevas técnicas y sabores que respetan nuestros valores 
                  fundamentales: calidad, autenticidad y compromiso con la comunidad.
                </p>
                <p>
                  Cada hogaza que sale de nuestros hornos lleva consigo más de tres décadas 
                  de experiencia, amor por el oficio y la garantía de que estás llevando 
                  a tu mesa lo mejor de la panadería artesanal madrileña.
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-primary/10 rounded-xl">
                <div className="text-3xl font-bold text-primary mb-2">37</div>
                <div className="text-sm text-muted-foreground">Años de experiencia</div>
              </div>
              <div className="text-center p-4 bg-primary/10 rounded-xl">
                <div className="text-3xl font-bold text-primary mb-2">15+</div>
                <div className="text-sm text-muted-foreground">Variedades de pan</div>
              </div>
              <div className="text-center p-4 bg-primary/10 rounded-xl">
                <div className="text-3xl font-bold text-primary mb-2">500+</div>
                <div className="text-sm text-muted-foreground">Clientes diarios</div>
              </div>
              <div className="text-center p-4 bg-primary/10 rounded-xl">
                <div className="text-3xl font-bold text-primary mb-2">100%</div>
                <div className="text-sm text-muted-foreground">Artesanal</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default About