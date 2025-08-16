import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { MapPin, Phone, Mail, Clock, Instagram, Facebook, Twitter } from "lucide-react"

const Footer = () => {
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
    <footer className="bg-foreground text-background">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="space-y-6">
            <div>
              <h3 className="text-2xl font-bold mb-2">Obrador Encinas</h3>
              <p className="text-background/80 text-sm leading-relaxed">
                Pan y bollería artesanos desde 1987. Tradición, calidad y pasión 
                en cada hogaza que sale de nuestros hornos.
              </p>
            </div>
            
            <div className="flex gap-4">
              {socialLinks.map((social, index) => (
                <a 
                  key={index}
                  href={social.href}
                  className="p-2 bg-background/10 hover:bg-primary hover:text-primary-foreground rounded-lg transition-colors"
                  aria-label={social.label}
                >
                  {social.icon}
                </a>
              ))}
            </div>
            
            <Badge variant="secondary" className="bg-primary text-primary-foreground">
              Abierto desde las 7:00
            </Badge>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold mb-6">Enlaces rápidos</h4>
            <ul className="space-y-3">
              {quickLinks.map((link, index) => (
                <li key={index}>
                  <a 
                    href={link.href}
                    className="text-background/80 hover:text-primary transition-colors text-sm"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-lg font-semibold mb-6">Contacto</h4>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <div className="text-sm text-background/80">
                  <div>Calle del Pan, 15</div>
                  <div>28012 Madrid, España</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-primary flex-shrink-0" />
                <div className="text-sm text-background/80">915 123 456</div>
              </div>
              
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-primary flex-shrink-0" />
                <div className="text-sm text-background/80">hola@obradorencinas.com</div>
              </div>
              
              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <div className="text-sm text-background/80">
                  <div>Lun-Sáb: 7:00 - 14:00</div>
                  <div>Dom: 8:00 - 13:00</div>
                </div>
              </div>
            </div>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="text-lg font-semibold mb-6">Newsletter</h4>
            <p className="text-sm text-background/80 mb-4">
              Recibe nuestras novedades, promociones especiales y los secretos 
              del pan artesanal directamente en tu email.
            </p>
            <div className="space-y-3">
              <input 
                type="email" 
                placeholder="tu@email.com"
                className="w-full px-3 py-2 rounded-lg bg-background/10 border border-background/20 text-background placeholder:text-background/60 focus:outline-none focus:border-primary text-sm"
              />
              <button className="w-full bg-primary hover:bg-primary-glow text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                Suscribirse
              </button>
            </div>
          </div>
        </div>

        <Separator className="bg-background/20 mb-8" />

        {/* Bottom */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-sm text-background/60">
            © 2024 Obrador Encinas. Todos los derechos reservados.
          </div>
          
          <div className="flex flex-wrap gap-6">
            {legalLinks.map((link, index) => (
              <a 
                key={index}
                href={link.href}
                className="text-sm text-background/60 hover:text-primary transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer