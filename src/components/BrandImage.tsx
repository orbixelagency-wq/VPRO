import { useState } from "react"
import { cn } from "@/lib/utils"
import { asset } from "@/lib/asset"

interface BrandImageProps {
  /** Ruta a la foto oficial en /public/brand (ej. "/brand/local-mahon.jpg").
   *  Mientras el archivo no exista, se muestra un placeholder de marca. */
  src?: string
  alt: string
  label?: string
  className?: string
  imgClassName?: string
}

/**
 * Muestra una imagen oficial de la marca. Mientras el archivo no exista,
 * renderiza un placeholder cinematográfico (onyx + monograma) para no
 * depender de imágenes de stock.
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
        <div className="grain grid h-full w-full place-items-center bg-[radial-gradient(circle_at_50%_38%,rgba(200,155,75,0.12),transparent_64%)]">
          <div className="flex flex-col items-center gap-3">
            <span className="grid h-14 w-14 place-items-center rounded-full border border-ember/70 font-display text-2xl text-ember">
              O
            </span>
            {label && (
              <span className="px-4 text-center font-sans text-[0.62rem] font-semibold uppercase tracking-[0.26em] text-steel">
                {label}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
