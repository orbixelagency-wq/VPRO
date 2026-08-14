import { useEffect, useRef, useState } from "react"
import { BrandImage } from "@/components/BrandImage"
import { CornerFrame } from "@/components/telemetry"

interface PhotoBandProps {
  img: string
  /** Segunda foto opcional: se funde sobre la primera durante el scroll. */
  img2?: string
  eyebrow?: string
  word: string
  caption?: string
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n))
const smooth = (a: number, b: number, x: number) => clamp01((x - a) / (b - a))

/**
 * Secuencia cinematográfica FIJADA (larga) con scrub — "modo vídeo":
 * la sección se fija a pantalla completa durante un buen tramo de scroll y,
 * a medida que avanzas, la foto del local (B/N) hace zoom continuo (Ken Burns)
 * y se funde con una segunda, la palabra gigante se revela letra a letra, se
 * mantiene y se desvanece, y una línea se dibuja. Degrada con reduced-motion.
 */
export function PhotoBand({ img, img2, eyebrow, word, caption }: PhotoBandProps) {
  const wrapRef = useRef<HTMLElement>(null)
  const photo1Ref = useRef<HTMLDivElement>(null)
  const photo2Ref = useRef<HTMLDivElement>(null)
  const wordRef = useRef<HTMLHeadingElement>(null)
  const capRef = useRef<HTMLParagraphElement>(null)
  const eyeRef = useRef<HTMLSpanElement>(null)
  const lineRef = useRef<HTMLSpanElement>(null)
  const fillRef = useRef<HTMLSpanElement>(null)
  const [reduced, setReduced] = useState(false)

  const chars = [...word]

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    setReduced(mq.matches)
    if (mq.matches) return
    const wrap = wrapRef.current
    if (!wrap) return
    let raf = 0

    const update = () => {
      const total = wrap.offsetHeight - window.innerHeight
      const p = clamp01(-wrap.getBoundingClientRect().top / (total || 1))
      const leave = smooth(0.84, 0.98, p)

      // Foto: zoom continuo + parallax; fundido a la segunda.
      if (photo1Ref.current) {
        photo1Ref.current.style.transform = `scale(${1.05 + p * 0.4}) translateY(${(p - 0.5) * 9}%)`
      }
      if (photo2Ref.current) {
        photo2Ref.current.style.opacity = String(smooth(0.35, 0.85, p))
        photo2Ref.current.style.transform = `scale(${1.15 + p * 0.4}) translateY(${(p - 0.5) * 9}%)`
      }

      // Eyebrow.
      if (eyeRef.current) {
        eyeRef.current.style.opacity = String(smooth(0.06, 0.18, p) * (1 - leave))
      }

      // Palabra letra a letra.
      if (wordRef.current) {
        const spans = wordRef.current.children
        const n = spans.length || 1
        for (let i = 0; i < spans.length; i++) {
          const start = 0.14 + (i / n) * 0.34
          const l = smooth(start, start + 0.12, p) * (1 - leave)
          const el = spans[i] as HTMLElement
          el.style.opacity = String(l)
          el.style.transform = `translateY(${(1 - l) * 60}px)`
        }
      }

      // Caption.
      if (capRef.current) {
        capRef.current.style.opacity = String(smooth(0.55, 0.72, p) * (1 - leave))
        capRef.current.style.transform = `translateY(${(1 - smooth(0.55, 0.72, p)) * 24}px)`
      }

      if (lineRef.current) lineRef.current.style.transform = `scaleX(${0.1 + p * 0.9})`
      if (fillRef.current) fillRef.current.style.width = `${p * 100}%`
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
  }, [])

  return (
    <section
      ref={wrapRef}
      className="relative border-y border-line bg-carbon"
      style={{ height: reduced ? "70vh" : "320vh" }}
    >
      <div className="sticky top-0 h-[100svh] w-full overflow-hidden">
        {/* Foto 1 */}
        <div ref={photo1Ref} className="absolute inset-0" style={{ willChange: "transform" }}>
          <BrandImage src={img} alt={word} imgClassName="opacity-75" />
        </div>
        {/* Foto 2 (fundido) */}
        {img2 && (
          <div
            ref={photo2Ref}
            className="absolute inset-0"
            style={{ opacity: 0, willChange: "opacity, transform" }}
          >
            <BrandImage src={img2} alt={word} imgClassName="opacity-75" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-carbon via-carbon/45 to-carbon/70" />
        <div className="pointer-events-none absolute inset-6 text-white/15 sm:inset-10">
          <CornerFrame />
        </div>
        <span
          ref={lineRef}
          className="absolute left-0 top-1/2 z-10 h-px w-full origin-left bg-white/25"
          style={{ transform: "scaleX(0.1)" }}
        />

        <div className="relative z-20 flex h-full items-center justify-center px-6 text-center">
          <div>
            {eyebrow && (
              <span ref={eyeRef} className="channel justify-center" style={{ opacity: 0 }}>
                {eyebrow}
              </span>
            )}
            <h2
              ref={wordRef}
              className="mt-4 flex justify-center font-display text-[clamp(2.6rem,13vw,11rem)] uppercase leading-[0.9] text-chalk"
              aria-label={word}
            >
              {chars.map((c, i) => (
                <span
                  key={i}
                  className="inline-block"
                  style={{ opacity: 0, willChange: "opacity, transform" }}
                >
                  {c === " " ? " " : c}
                </span>
              ))}
            </h2>
            {caption && (
              <p
                ref={capRef}
                className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-ash sm:text-base"
                style={{ opacity: 0 }}
              >
                {caption}
              </p>
            )}
          </div>
        </div>

        {/* Progreso de la escena */}
        <div className="absolute bottom-6 left-1/2 z-20 h-px w-32 -translate-x-1/2 bg-white/15">
          <span ref={fillRef} className="absolute inset-y-0 left-0 bg-white" style={{ width: "0%" }} />
        </div>
      </div>
    </section>
  )
}
