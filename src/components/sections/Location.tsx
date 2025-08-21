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
    <section className="relative py-32 overflow-hidden">
      {/* Fondo decorativo y esferas de luz */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/4 animate-float-slow">
          <MapPin className="w-16 h-16 text-blue-500 opacity-10" />
        </div>
        <div className="absolute bottom-1/4 right-1/4 animate-float-medium">
          <Clock className="w-12 h-12 text-blue-400 opacity-10" />
        </div>
        <div className="absolute top-20 left-10 w-60 h-60 bg-blue-500/10 rounded-full opacity-40 blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-indigo-500/10 rounded-full opacity-30 blur-3xl animate-pulse-medium" />
        <div className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 w-[40rem] h-[40rem] bg-sky-500/5 rounded-full blur-3xl animate-pulse-fast" />
      </div>
      <div className="relative container mx-auto px-6">
        {/* Header premium */}
        <div className="text-center mb-24">
          <div className="inline-flex items-center gap-2 px-6 py-2 premium-glass gradient-border rounded-full text-sm font-medium text-slate-800 mb-8">
            <MapPin className="w-4 h-4 text-blue-600" />
            <span className="tracking-wider">VISÍTANOS</span>
          </div>
          <h2 className="text-5xl md:text-6xl lg:text-8xl font-bold mb-6 leading-tight">
            <span className="shimmer-title">Ubicación & Horarios</span>
          </h2>
          <div className="h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent max-w-48 mx-auto mb-8" />
          <p className="text-xl md:text-2xl text-black max-w-4xl mx-auto leading-relaxed">
            Te esperamos en el corazón de Madrid, donde el aroma del pan recién horneado llena las calles desde primera hora de la mañana.
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Info principal con glass effect */}
          <div className="space-y-8">
            {/* Dirección */}
            <Card className="premium-glass border-0 overflow-hidden">
              <CardContent className="p-8 flex items-start gap-6">
                <div className="w-16 h-16 bg-blue-500/10 rounded-xl flex items-center justify-center">
                  <MapPin className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-800 mb-2">Obrador Encinas</h3>
                  <p className="text-slate-700 mb-2">Calle del Pan, 15<br />28012 Madrid, España</p>
                  <a href="https://maps.google.com/?q=Calle+del+Pan+15+Madrid" target="_blank" rel="noopener noreferrer" className="text-blue-600 font-semibold hover:underline text-sm">Ver en Google Maps →</a>
                </div>
              </CardContent>
            </Card>
            {/* Horarios */}
            <Card className="premium-glass border-0 overflow-hidden">
              <CardContent className="p-8">
                <div className="flex items-center gap-3 mb-6">
                  <Clock className="w-6 h-6 text-blue-600" />
                  <h3 className="text-2xl font-bold text-slate-800">Horarios de apertura</h3>
                </div>
                <div className="space-y-3">
                  {schedules.map((schedule, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-white/30 rounded-lg">
                      <span className="font-medium text-slate-800">{schedule.day}</span>
                      <span className={`font-semibold ${schedule.special ? 'text-blue-600' : 'text-slate-800'}`}>{schedule.hours}</span>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-slate-500 mt-4">* Los domingos abrimos una hora más tarde para que nuestro equipo pueda descansar</p>
              </CardContent>
            </Card>
            {/* Contacto */}
            <Card className="premium-glass border-0 overflow-hidden">
              <CardContent className="p-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="flex items-center gap-3">
                  <Phone className="w-6 h-6 text-blue-600" />
                  <div>
                    <div className="font-medium text-slate-800">Teléfono</div>
                    <div className="text-sm text-slate-600">915 123 456</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-6 h-6 text-blue-600" />
                  <div>
                    <div className="font-medium text-slate-800">Email</div>
                    <div className="text-sm text-slate-600">hola@obradorencinas.com</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            {/* Cómo llegar */}
            <Card className="premium-glass border-0 overflow-hidden">
              <CardContent className="p-8">
                <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Train className="w-5 h-5 text-blue-600" />Cómo llegar
                </h3>
                <div className="space-y-3">
                  {transportOptions.map((option, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-white/20 rounded-lg">
                      <div className="text-blue-600">{option.icon}</div>
                      <div>
                        <div className="font-medium text-slate-800 text-sm">{option.title}</div>
                        <div className="text-xs text-slate-600">{option.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          {/* Mapa y contexto visual premium */}
          <div className="relative">
            <Card className="premium-glass-dark h-full min-h-[600px] overflow-hidden border-0 shadow-glow-blue flex items-center justify-center">
              <div className="relative w-full h-full flex flex-col items-center justify-center p-12">
                <MapPin className="w-20 h-20 text-blue-500 mb-6 animate-bounce-soft" />
                <h3 className="text-3xl font-bold shimmer-title mb-2">Nos encontrarás aquí</h3>
                <p className="text-lg text-black-100 mb-6 text-center max-w-md">
                  En el histórico barrio de La Latina, rodeado de tabernas tradicionales y el mercado de La Cebada.
                </p>
                <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 text-sm text-slate-700 max-w-xs mx-auto">
                  <p className="mb-2">🚇 Metro: Tirso de Molina (L1)</p>
                  <p className="mb-2">🚌 Autobús: Líneas 17, 18, 23, 35</p>
                  <p>🚗 Parking: Plaza de Santa Ana</p>
                </div>
                {/* Elementos decorativos */}
                <div className="absolute bottom-12 left-12 w-2 h-2 bg-blue-400/60 rounded-full animate-pulse delay-500"></div>
                <div className="absolute top-1/2 left-8 w-1 h-1 bg-blue-300/40 rounded-full animate-pulse delay-1000"></div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Location