import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { asset } from "@/lib/asset"
import logoImg from "@/assets/logo.png"

interface BrandImageProps {
  /** URL de imagen: importada del bundle, o ruta "/brand/..." de /public. */
  src?: string
  alt: string
  label?: string
  className?: string
  imgClassName?: string
  /** Activa un parallax vertical sutil ligado al scroll. */
  parallax?: boolean
}

/** Resuelve rutas de /public respetando el base; deja intactas las importadas. */
const resolve = (src?: string) =>
  !src ? undefined : src.startsWith("/brand") ? asset(src) : src

/**
 * Imagen de marca (en blanco y negro). Soporta parallax de scroll. Si la
 * imagen no carga, muestra un placeholder con el logo.
 */
export function BrandImage({
  src,
  alt,
  label,
  className,
  imgClassName,
  parallax = false,
}: BrandImageProps) {
  const [failed, setFailed] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const showImage = src && !failed

  useEffect(() => {
    if (!parallax) return
    const el = imgRef.current
    if (!el) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    let raf = 0
    const update = () => {
      const r = el.getBoundingClientRect()
      const vh = window.innerHeight
      const center = r.top + r.height / 2
      const off = (center - vh / 2) / vh // -0.5..0.5 aprox
      el.style.transform = `scale(1.18) translateY(${off * -6}%)`
    }
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(update)
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)
    update()
    return () => {
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
      cancelAnimationFrame(raf)
    }
  }, [parallax, showImage])

  return (
    <div className={cn("relative h-full w-full overflow-hidden bg-graphite", className)}>
      {showImage ? (
        <img
          ref={imgRef}
          src={resolve(src)}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
          className={cn(
            "bw h-full w-full object-cover",
            parallax ? "will-change-transform" : "transition-transform duration-700",
            imgClassName
          )}
        />
      ) : (
        <div className="grain grid h-full w-full place-items-center bg-[radial-gradient(circle_at_50%_38%,rgba(255,255,255,0.06),transparent_64%)]">
          <div className="flex flex-col items-center gap-3 opacity-60">
            <img src={logoImg} alt="" className="h-16 w-auto opacity-70" />
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
