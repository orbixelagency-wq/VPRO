import { useState } from "react"
import { cn } from "@/lib/utils"
import { asset } from "@/lib/asset"

interface BrandImageProps {
  /** Ruta a la foto OFICIAL de marca en /public/brand (ej. "/brand/giro-1.jpg").
   *  Si no existe todavia, se muestra un placeholder de marca (nunca stock). */
  src?: string
  alt: string
  label?: string
  className?: string
  imgClassName?: string
}

/**
 * Muestra una imagen oficial de la marca. Mientras el archivo no exista,
 * renderiza un placeholder cinematografico (negro + monograma V) para
 * cumplir la regla estricta de "cero imagenes de stock".
 */
export function BrandImage({ src, alt, label, className, imgClassName }: BrandImageProps) {
  const [failed, setFailed] = useState(false)
  const showImage = src && !failed

  return (
    <div className={cn("relative h-full w-full overflow-hidden bg-graphite", className)}>
      {showImage ? (
        <img
          src={asset(src)}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
          className={cn(
            "h-full w-full object-cover transition-transform duration-700",
            imgClassName
          )}
        />
      ) : (
        <div className="relative grid h-full w-full place-items-center bg-carbon">
          {/* Marca de agua tipografica: el propio nombre, muy tenue */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 grid place-items-center overflow-hidden font-display text-[26vw] font-extrabold uppercase leading-none tracking-tighter text-chalk/[0.035] md:text-[12vw]"
          >
            V PRO
          </span>
          {/* Marco fino de encuadre */}
          <span aria-hidden className="pointer-events-none absolute inset-4 border border-line" />
          <div className="relative flex flex-col items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-[3px] bg-ember font-display text-xl font-extrabold text-carbon">
              V
            </span>
            {label && (
              <span className="px-4 text-center font-mono text-[0.62rem] uppercase tracking-[0.24em] text-steel">
                {label}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
