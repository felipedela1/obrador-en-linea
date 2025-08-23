import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const heroButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-lg font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        hero: "bg-gradient-hero text-primary-foreground shadow-warm hover:shadow-glow hover:scale-105 px-8 py-4",
        secondary: "bg-card/80 border border-border text-foreground hover:bg-accent hover:text-accent-foreground px-6 py-3",
        confirm: "px-8 py-4 bg-gradient-to-r from-blue-800 via-indigo-800 to-blue-900 text-white shadow-lg shadow-blue-900/30 hover:from-blue-700 hover:via-indigo-700 hover:to-blue-800 hover:shadow-blue-800/40 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900 active:scale-[0.98]",
      },
    },
    defaultVariants: {
      variant: "hero",
    },
  }
)

export interface HeroButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof heroButtonVariants> {
  asChild?: boolean
}

const HeroButton = React.forwardRef<HTMLButtonElement, HeroButtonProps>(
  ({ className, variant, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(heroButtonVariants({ variant, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
HeroButton.displayName = "HeroButton"

export { HeroButton, heroButtonVariants }