import { cn } from "@/lib/utils"
import logoImg from "@/assets/logo.png"

interface LogoProps {
  className?: string
  /** Alto del logo (clase de Tailwind, p. ej. "h-10"). */
  size?: string
  /** withText se mantiene por compatibilidad; el logo ya incluye el texto. */
  withText?: boolean
}

/** Logo oficial de Oblivion Barbers & Care (plateado sobre negro). */
export function Logo({ className, size = "h-11" }: LogoProps) {
  return (
    <img
      src={logoImg}
      alt="Oblivion Barbers & Care"
      className={cn("w-auto object-contain", size, className)}
      draggable={false}
    />
  )
}
