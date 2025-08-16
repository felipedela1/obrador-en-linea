import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { MapPin, Clock, Phone, Mail, Car, Train } from "lucide-react"

const Location = () => {
  const schedules = [
    { day: "Lunes - Viernes", hours: "7:00 - 14:00", special: false },
    { day: "Sábado", hours: "7:00 - 15:00", special: false },
    { day: "Domingo", hours: "8:00 - 13:00", special: true },
  ]

  const transportOptions = [
    {
      icon: <Train className="w-5 h-5" />,
      title: "Metro",
      description: "Línea 1 - Estación Tirso de Molina (3 min a pie)"
    },
    {
      icon: <Car className="w-5 h-5" />,
      title: "Parking",
      description: "Parking público en Plaza de Santa Ana (5 min)"
    }
  ]

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Location Info */}
          <div className="space-y-8">
            <div>
              <Badge variant="secondary" className="mb-4 text-sm font-medium">
                Ubicación y horarios
              </Badge>
              <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
                Ven a visitarnos
              </h2>
              <p className="text-xl text-muted-foreground leading-relaxed">
                Te esperamos en el corazón de Madrid, donde el aroma del pan recién horneado 
                llena las calles desde primera hora de la mañana.
              </p>
            </div>

            {/* Address */}
            <Card className="bg-primary/5 border-l-4 border-l-primary border-y-0 border-r-0 rounded-l-none">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <MapPin className="w-6 h-6 text-primary mt-1" />
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Obrador Encinas
                    </h3>
                    <p className="text-muted-foreground mb-2">
                      Calle del Pan, 15<br />
                      28012 Madrid, España
                    </p>
                    <p className="text-sm text-primary font-medium">
                      Ver en Google Maps →
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Schedule */}
            <div>
              <h3 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
                <Clock className="w-6 h-6 text-primary" />
                Horarios de apertura
              </h3>
              <div className="space-y-3">
                {schedules.map((schedule, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-card/40 rounded-lg">
                    <span className="font-medium text-foreground">{schedule.day}</span>
                    <span className={`font-semibold ${schedule.special ? 'text-primary' : 'text-foreground'}`}>
                      {schedule.hours}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                * Los domingos abrimos una hora más tarde para que nuestro equipo pueda descansar
              </p>
            </div>

            {/* Contact */}
            <div>
              <h3 className="text-2xl font-bold text-foreground mb-6">
                Contacto
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-4 bg-accent/50 rounded-lg">
                  <Phone className="w-5 h-5 text-primary" />
                  <div>
                    <div className="font-medium text-foreground">Teléfono</div>
                    <div className="text-sm text-muted-foreground">915 123 456</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-accent/50 rounded-lg">
                  <Mail className="w-5 h-5 text-primary" />
                  <div>
                    <div className="font-medium text-foreground">Email</div>
                    <div className="text-sm text-muted-foreground">hola@obradorencinas.com</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Transport */}
            <div>
              <h3 className="text-xl font-bold text-foreground mb-4">
                Cómo llegar
              </h3>
              <div className="space-y-3">
                {transportOptions.map((option, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="text-primary">{option.icon}</div>
                    <div>
                      <div className="font-medium text-foreground text-sm">{option.title}</div>
                      <div className="text-xs text-muted-foreground">{option.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Map Placeholder */}
          <div className="relative">
            <Card className="h-full min-h-[600px] overflow-hidden border-0 shadow-warm">
              <div className="relative h-full bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                <div className="text-center p-8">
                  <MapPin className="w-16 h-16 text-primary mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-foreground mb-2">
                    Nos encontrarás aquí
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    En el histórico barrio de La Latina, rodeado de tabernas tradicionales 
                    y el mercado de La Cebada.
                  </p>
                  <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 text-sm text-muted-foreground">
                    <p className="mb-2">🚇 Metro: Tirso de Molina (L1)</p>
                    <p className="mb-2">🚌 Autobús: Líneas 17, 18, 23, 35</p>
                    <p>🚗 Parking: Plaza de Santa Ana</p>
                  </div>
                </div>
                
                {/* Decorative elements */}
                <div className="absolute top-8 right-8 w-3 h-3 bg-primary rounded-full animate-pulse"></div>
                <div className="absolute bottom-12 left-12 w-2 h-2 bg-primary/60 rounded-full animate-pulse delay-500"></div>
                <div className="absolute top-1/2 left-8 w-1 h-1 bg-primary/40 rounded-full animate-pulse delay-1000"></div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Location