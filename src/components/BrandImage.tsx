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
    <div className={cn("relative h-full w-full overflow-hidden bg-ink-card", className)}>
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
        <div className="grid h-full w-full place-items-center bg-[radial-gradient(circle_at_50%_30%,rgba(249,115,22,0.14),transparent_60%)]">
          <div className="flex flex-col items-center gap-3 opacity-70">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-volt to-flame font-display text-2xl font-black text-ink">
              V
            </span>
            {label && (
              <span className="px-4 text-center text-xs font-semibold uppercase tracking-[0.2em] text-white/40">
                {label}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
