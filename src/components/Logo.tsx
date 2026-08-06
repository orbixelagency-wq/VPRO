import { useState } from "react"
import { cn } from "@/lib/utils"
import { asset } from "@/lib/asset"

interface LogoProps {
  className?: string
  /** Muestra el wordmark "VPRO / TOTAL TRAINING" junto al icono. */
  withText?: boolean
}

/**
 * Logo de V Pro Training. Usa /public/brand/logo.png si existe;
 * si no, muestra un lockup tipografico de marca como respaldo.
 */
export function Logo({ className, withText = true }: LogoProps) {
  const [failed, setFailed] = useState(false)

  if (!failed) {
    return (
      <span className={cn("flex items-center gap-2.5", className)}>
        <img
          src={asset("/brand/logo.png")}
          alt="V Pro Training"
          onError={() => setFailed(true)}
          className="h-10 w-10 rounded-md object-contain"
        />
        {withText && (
          <span className="font-display text-lg font-black tracking-tight text-white">
            VPRO<span className="text-flame"> TOTAL TRAINING</span>
          </span>
        )}
      </span>
    )
  }

  // Respaldo tipografico (hasta que exista logo.png)
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <span className="grid h-10 w-10 place-items-center rounded-md bg-gradient-to-br from-flame-bright via-flame to-volt font-display text-lg font-black text-ink shadow-lg shadow-flame/30">
        V
      </span>
      {withText && (
        <span className="flex flex-col leading-none">
          <span className="font-display text-lg font-black tracking-tight text-white">VPRO</span>
          <span className="text-[0.6rem] font-semibold uppercase tracking-[0.3em] text-flame">
            Total Training
          </span>
        </span>
      )}
    </span>
  )
}
