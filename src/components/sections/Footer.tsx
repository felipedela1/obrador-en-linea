import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { MapPin, Phone, Mail, Clock, Instagram, Facebook, Twitter, Wheat } from "lucide-react"

const Footer = () => {
  const year = new Date().getFullYear()
  const socialLinks = [
    { icon: <Instagram className="w-5 h-5" />, label: "Instagram", href: "#" },
    { icon: <Facebook className="w-5 h-5" />, label: "Facebook", href: "#" },
    { icon: <Twitter className="w-5 h-5" />, label: "Twitter", href: "#" }
  ]

  const quickLinks = [
    { label: "Catálogo", href: "/productos" },
    { label: "Reservas", href: "/reservas" },
    { label: "Sobre nosotros", href: "#about" },
    { label: "El Chef", href: "#chef" }
  ]

  const legalLinks = [
    { label: "Política de Privacidad", href: "/privacidad" },
    { label: "Términos y Condiciones", href: "/terminos" },
    { label: "RGPD", href: "/rgpd" },
    { label: "Cookies", href: "/cookies" }
  ]

  return (
    <footer
      className="relative mt-32 text-slate-200 overflow-hidden"
      aria-labelledby="footer-heading"
    >
      {/* Fondo oscuro diferenciado con capas y brillo sutil */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_25%,rgba(59,130,246,0.25),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_70%,rgba(79,70,229,0.22),transparent_60%)]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />
        {/* Partículas suaves */}
        <div className="pointer-events-none select-none opacity-[0.18] mix-blend-screen">
          {Array.from({ length: 18 }).map((_, i) => (
            <span
              key={i}
              className="absolute w-1 h-1 rounded-full bg-blue-400 animate-pulse"
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                animationDelay: `${(i * 0.7).toFixed(2)}s`,
                animationDuration: `${6 + (i % 5)}s`
              }}
            />
          ))}
        </div>
      </div>

      {/* Ola superior para transición con el contenido claro */}
      <div className="absolute -top-20 left-0 w-full h-20 pointer-events-none" aria-hidden="true">
        <svg className="w-full h-full" viewBox="0 0 1440 80" preserveAspectRatio="none">
          <path
            d="M0 80V0c120 0 240 40 360 40s240-40 360-40 240 40 360 40 240-40 360-40v80H0Z"
            className="fill-slate-900"
          />
        </svg>
      </div>

      <div className="relative container mx-auto px-6 py-28">
        {/* Brand + claim */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-16 mb-20">
          {/* Columna Brand */}
          <div className="space-y-8">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-xl shadow-blue-800/40 hover:scale-105 transition-transform">
                  <Wheat className="w-7 h-7 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 flex items-center justify-center shadow-lg">
                  <span className="text-[10px] font-bold text-white">★</span>
                </div>
              </div>
              <div className="leading-tight">
                <h3 className="text-2xl font-bold tracking-tight">Obrador d'Luis</h3>
                <p className="shimmer-title text-[11px] tracking-[0.45em] font-semibold mt-1">A R T E S A N A L</p>
              </div>
            </div>
            <p className="text-sm/6 text-slate-300 max-w-xs">
              Pan y bollería artesanos desde 1995. Tradición vasca, calidad y devoción
              diaria en cada fermentación lenta y cada horneado.
            </p>
            <div className="flex gap-3">
              {socialLinks.map((social, i) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="group relative w-11 h-11 rounded-xl premium-glass-dark flex items-center justify-center border border-white/10 hover:border-blue-400/50 transition-colors overflow-hidden"
                >
                  <span className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="absolute -inset-px opacity-0 group-hover:opacity-30 bg-[radial-gradient(circle_at_30%_20%,rgba(96,165,250,0.45),transparent_60%)] transition-opacity" />
                  <span className="text-slate-300 group-hover:text-white transition-colors">
                    {social.icon}
                  </span>
                </a>
              ))}
            </div>
            <Badge variant="secondary" className="premium-glass-dark border-0 px-4 py-1.5 text-[11px] tracking-wide font-medium">
              Abierto desde las 6:30
            </Badge>
          </div>

          {/* Enlaces rápidos */}
            <div className="space-y-6">
              <h4 className="text-lg font-semibold text-white/90 relative inline-block">
                <span className="relative z-10">Enlaces rápidos</span>
                <span className="absolute -bottom-1 left-0 w-10 h-px bg-gradient-to-r from-blue-400 to-indigo-500" />
              </h4>
              <ul className="space-y-3 text-sm">
                {quickLinks.map((link, i) => (
                  <li key={link.href} style={{ animation: `fade-in 0.6s ease forwards`, animationDelay: `${i * 0.07}s`, opacity: 0 }}>
                    <a
                      href={link.href}
                      className="group inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-500 group-hover:bg-blue-500 transition-colors" />
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

          {/* Contacto */}
          <div className="space-y-6">
            <h4 className="text-lg font-semibold text-white/90 relative inline-block">
              <span className="relative z-10">Contacto</span>
              <span className="absolute -bottom-1 left-0 w-10 h-px bg-gradient-to-r from-blue-400 to-indigo-500" />
            </h4>
            <div className="space-y-5 text-sm">
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-blue-400 mt-0.5" />
                <div className="text-slate-300">
                  <div>Calle Mayor, 25</div>
                  <div>20140 Andoain, Gipuzkoa</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-blue-400" />
                <div className="text-slate-300">943 123 456</div>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-blue-400" />
                <div className="text-slate-300">info@obradordluis.com</div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-blue-400 mt-0.5" />
                <div className="text-slate-300">
                  <div>Lun-Sáb: 6:30 - 14:00</div>
                  <div>Dom: 7:30 - 13:30</div>
                </div>
              </div>
            </div>
          </div>

          {/* Newsletter */}
          <div className="space-y-6">
            <h4 className="text-lg font-semibold text-white/90 relative inline-block">
              <span className="relative z-10">Newsletter</span>
              <span className="absolute -bottom-1 left-0 w-10 h-px bg-gradient-to-r from-blue-400 to-indigo-500" />
            </h4>
            <p className="text-sm text-slate-400 leading-relaxed">
              Recibe novedades, promociones y descubre el arte del pan artesano vasco.
            </p>
            <form
              className="space-y-3"
              onSubmit={(e) => { e.preventDefault(); /* manejar submit */ }}
              aria-label="Formulario de suscripción a newsletter"
            >
              <div className="relative group">
                <input
                  type="email"
                  required
                  placeholder="tu@email.com"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-100 placeholder:text-slate-500 text-sm focus:outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/30 transition"
                  aria-label="Correo electrónico"
                />
                <div className="pointer-events-none absolute inset-0 rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity bg-gradient-to-r from-blue-500/10 to-indigo-500/10" />
              </div>
              <button
                type="submit"
                className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-medium tracking-wide shadow-lg shadow-blue-900/40 transition-all hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60"
              >
                Suscribirse
              </button>
              <p className="text-[11px] text-slate-500 leading-snug">
                Aceptas nuestra política de privacidad. Cancelación 1 click.
              </p>
            </form>
          </div>
        </div>

        <Separator className="bg-white/10 mb-10" />

        {/* Bottom */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>© {year} Obrador d'Luis.</span>
            <span className="text-slate-500">Todos los derechos reservados.</span>
          </div>
          <div className="flex flex-wrap gap-6">
            {legalLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="relative group hover:text-slate-200 transition-colors"
              >
                <span>{link.label}</span>
                <span className="absolute -bottom-1 left-0 w-0 h-px bg-gradient-to-r from-blue-400 to-indigo-500 group-hover:w-full transition-all duration-300" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer