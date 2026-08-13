import { useState } from "react"
import { cn } from "@/lib/utils"
import { asset } from "@/lib/asset"

interface LogoProps {
  className?: string
  withText?: boolean
}

/**
 * Logo de Oblivion Barbers & Care. Usa /public/brand/logo.png si existe;
 * si no, un isotipo "O" de latón sobre fondo onyx como respaldo.
 */
export function Logo({ className, withText = true }: LogoProps) {
  const [failed, setFailed] = useState(false)

  return (
    <span className={cn("flex items-center gap-3", className)}>
      {!failed ? (
        <img
          src={asset("/brand/logo.png")}
          alt="Oblivion Barbers & Care"
          onError={() => setFailed(true)}
          className="h-9 w-9 object-contain"
        />
      ) : (
        <span
          aria-hidden
          className="grid h-9 w-9 place-items-center rounded-full border border-ember/70 font-display text-lg text-ember"
        >
          O
        </span>
      )}
      {withText && (
        <span className="flex flex-col leading-none">
          <span className="font-display text-lg uppercase tracking-[0.06em] text-chalk">
            Oblivion
          </span>
          <span className="mt-1 font-sans text-[0.52rem] font-semibold uppercase tracking-[0.3em] text-steel">
            Barbers &amp; Care
          </span>
        </span>
      )}
    </span>
  )
}
