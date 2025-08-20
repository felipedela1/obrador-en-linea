import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Quote, ChefHat, Award, Users } from "lucide-react"

const Chef = () => {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Image */}
          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden shadow-warm">
              <img 
                src="/chef-luis.jpg" 
                alt="Luis Encinas - Maestro panadero" 
                className="w-full h-[600px] object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-6">
                <div className="text-white">
                  <h3 className="text-2xl font-bold mb-2">Luis Encinas</h3>
                  <p className="text-gray-200">Maestro Panadero</p>
                </div>
              </div>
            </div>
            
            {/* Floating stats */}
            <Card className="absolute -bottom-6 -right-6 bg-card/95 backdrop-blur-sm border-0 shadow-glow">
              <CardContent className="p-6">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-primary mb-1">25+</div>
                    <div className="text-xs text-muted-foreground">Años de experiencia</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-primary mb-1">50+</div>
                    <div className="text-xs text-muted-foreground">Recetas creadas</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Content */}
          <div className="space-y-8">
            <div>
              <Badge variant="secondary" className="mb-4 text-sm font-medium">
                El Chef
              </Badge>
              <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
                Luis Encinas
                <span className="block text-xl text-primary mt-2 font-normal">
                  Maestro panadero con pasión por las fermentaciones lentas
                </span>
              </h2>
            </div>

            {/* Quote */}
            <Card className="bg-primary/5 border-l-4 border-l-primary border-y-0 border-r-0 rounded-l-none">
              <CardContent className="p-6">
                <Quote className="w-8 h-8 text-primary mb-4" />
                <p className="text-lg text-foreground italic leading-relaxed mb-4">
                  "El pan no es solo alimento, es cultura, tradición y conexión con nuestras raíces. 
                  Cada hogaza cuenta una historia de tiempo, paciencia y respeto por los ingredientes."
                </p>
                <div className="text-sm text-muted-foreground">
                  — Luis Encinas, Maestro Panadero
                </div>
              </CardContent>
            </Card>

            {/* Bio */}
            <div className="space-y-4 text-muted-foreground">
              <p>
                Luis comenzó su carrera a los 16 años como aprendiz junto a su padre Antonio. 
                Tras formarse en las mejores panaderías de Francia y perfeccionar las técnicas 
                de fermentación lenta, regresó a Madrid para revolucionar el arte del pan artesanal.
              </p>
              <p>
                Su filosofía se basa en el respeto absoluto por los tiempos naturales del pan, 
                el uso de harinas ecológicas y la innovación constante dentro de la tradición. 
                Cada receta es el resultado de años de experimentación y perfeccionamiento.
              </p>
            </div>

            {/* Achievements */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-4 bg-accent/50 rounded-lg">
                <ChefHat className="w-6 h-6 text-primary" />
                <div className="text-sm">
                  <div className="font-semibold">Formación</div>
                  <div className="text-muted-foreground">École de Boulangerie, París</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-accent/50 rounded-lg">
                <Award className="w-6 h-6 text-primary" />
                <div className="text-sm">
                  <div className="font-semibold">Reconocimiento</div>
                  <div className="text-muted-foreground">Mejor Pan de Madrid 2019</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-accent/50 rounded-lg">
                <Users className="w-6 h-6 text-primary" />
                <div className="text-sm">
                  <div className="font-semibold">Mentorías</div>
                  <div className="text-muted-foreground">15 panaderos formados</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Chef