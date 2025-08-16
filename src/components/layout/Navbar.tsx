import { useState } from "react"
import { Button } from "@/components/ui/button"
import { HeroButton } from "@/components/ui/hero-button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu, ShoppingBag, User, Clock } from "lucide-react"

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false)

  const navLinks = [
    { label: "Inicio", href: "/" },
    { label: "Productos", href: "/productos" },
    { label: "Sobre nosotros", href: "#about" },
    { label: "El Chef", href: "#chef" },
    { label: "Ubicación", href: "#location" }
  ]

  const NavLinks = ({ mobile = false, onClose = () => {} }) => (
    <div className={`${mobile ? 'flex flex-col space-y-4' : 'hidden md:flex items-center space-x-8'}`}>
      {navLinks.map((link, index) => (
        <a
          key={index}
          href={link.href}
          onClick={onClose}
          className={`text-sm font-medium transition-colors hover:text-primary ${
            mobile ? 'text-foreground py-2' : 'text-foreground/80'
          }`}
        >
          {link.label}
        </a>
      ))}
    </div>
  )

  return (
    <nav className="fixed top-0 w-full z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <a href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-hero rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">OE</span>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-foreground text-lg leading-none">Obrador</span>
              <span className="text-primary text-xs leading-none">Encinas</span>
            </div>
          </a>

          {/* Desktop Navigation */}
          <NavLinks />

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center space-x-4">
            <div className="flex items-center text-xs text-muted-foreground mr-4">
              <Clock className="w-4 h-4 mr-1" />
              <span>Abierto hasta 14:00</span>
            </div>
            
            <Button variant="ghost" size="sm" className="text-foreground/80">
              <User className="w-4 h-4 mr-2" />
              Acceder
            </Button>
            
            <HeroButton variant="hero" className="px-6 py-2 text-sm">
              <ShoppingBag className="w-4 h-4 mr-2" />
              Reservar
            </HeroButton>
          </div>

          {/* Mobile Menu */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="sm">
                <Menu className="w-5 h-5" />
                <span className="sr-only">Abrir menú</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80">
              <div className="flex flex-col h-full">
                {/* Mobile Logo */}
                <div className="flex items-center space-x-2 mb-8">
                  <div className="w-8 h-8 bg-gradient-hero rounded-lg flex items-center justify-center">
                    <span className="text-primary-foreground font-bold text-sm">OE</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-foreground text-lg leading-none">Obrador</span>
                    <span className="text-primary text-xs leading-none">Encinas</span>
                  </div>
                </div>

                {/* Mobile Navigation */}
                <NavLinks mobile onClose={() => setIsOpen(false)} />

                {/* Mobile Status */}
                <div className="mt-8 p-4 bg-primary/10 rounded-lg">
                  <div className="flex items-center text-sm text-primary mb-2">
                    <Clock className="w-4 h-4 mr-2" />
                    <span>Abierto hasta las 14:00</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Pan recién horneado cada mañana desde las 7:00
                  </p>
                </div>

                {/* Mobile Actions */}
                <div className="mt-auto space-y-3">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setIsOpen(false)}
                  >
                    <User className="w-4 h-4 mr-2" />
                    Iniciar sesión
                  </Button>
                  
                  <HeroButton 
                    variant="hero" 
                    className="w-full"
                    onClick={() => setIsOpen(false)}
                  >
                    <ShoppingBag className="w-4 h-4 mr-2" />
                    Hacer reserva
                  </HeroButton>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  )
}

export default Navbar