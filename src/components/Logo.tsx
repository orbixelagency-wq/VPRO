import { useState } from "react"
import { cn } from "@/lib/utils"
import { asset } from "@/lib/asset"

interface LogoProps {
  className?: string
  withText?: boolean
}

/**
 * Logo de V Pro Total Training. Usa /public/brand/logo.png si existe;
 * si no, un isotipo "V" sobre cuadrado fuego como respaldo.
 */
export function Logo({ className, withText = true }: LogoProps) {
  const [failed, setFailed] = useState(false)

  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      {!failed ? (
        <img
          src={asset("/brand/logo.png")}
          alt="V Pro Total Training"
          onError={() => setFailed(true)}
          className="h-9 w-9 object-contain"
        />
      ) : (
        <span className="grid h-9 w-9 place-items-center rounded-[2px] bg-ember font-display text-lg font-extrabold text-carbon">
          V
        </span>
      )}
      {withText && (
        <span className="flex flex-col leading-none">
          <span className="font-display text-base font-extrabold uppercase tracking-tight text-chalk">
            V PRO
          </span>
          <span className="font-mono text-[0.55rem] uppercase tracking-[0.28em] text-steel">
            Total Training
          </span>
        </span>
      )}
    </span>
  )
}
