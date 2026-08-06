import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[5px] text-xs font-semibold uppercase tracking-[0.14em] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-flame focus-visible:ring-offset-2 focus-visible:ring-offset-ink disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // CTA principal: naranja corporativo, hover plano (mas oscuro)
        default: "bg-flame text-ink hover:bg-flame-bright",
        // Secundario dorado
        gold: "bg-volt text-ink hover:bg-volt/90",
        // Contorno sobrio
        outline:
          "border border-white/25 bg-transparent text-white hover:border-flame hover:text-flame",
        ghost: "text-white/80 hover:text-flame",
      },
      size: {
        default: "h-11 px-6",
        sm: "h-9 px-4",
        lg: "h-12 px-8 text-sm",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
