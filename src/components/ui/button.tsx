import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[2px] font-sans text-xs font-semibold uppercase tracking-[0.2em] transition-[color,background-color,border-color,transform] duration-200 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // CTA principal: relleno latón/oro, hover más claro
        default: "bg-ember text-carbon hover:bg-ember-2",
        // Contorno hairline
        outline:
          "border border-line bg-transparent text-chalk hover:border-ember hover:text-ember",
        ghost: "text-ash hover:text-ember",
      },
      size: {
        default: "h-11 px-6",
        sm: "h-9 px-4 text-[0.7rem]",
        lg: "h-12 px-8 text-sm",
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
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />
  )
)
Button.displayName = "Button"

export { Button, buttonVariants }
