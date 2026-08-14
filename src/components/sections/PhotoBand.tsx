import { useEffect, useRef, useState } from "react"
import { BrandImage } from "@/components/BrandImage"
import { CornerFrame } from "@/components/telemetry"

interface PhotoBandProps {
  img: string
  eyebrow?: string
  word: string
  caption?: string
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n))
const smooth = (a: number, b: number, x: number) => clamp01((x - a) / (b - a))

/**
 * Banda cinematográfica FIJADA con scrub: al entrar, la sección se fija a
 * pantalla completa; con el scroll la foto (blanco y negro) se acerca y la
 * palabra gigante se revela y desvanece, y una línea se dibuja. Transición al
 * nivel del hero. Se degrada a un bloque estático con "movimiento reducido".
 */
export function PhotoBand({ img, eyebrow, word, caption }: PhotoBandProps) {
  const wrapRef = useRef<HTMLElement>(null)
  const photoRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLDivElement>(null)
  const lineRef = useRef<HTMLSpanElement>(null)
  const [reduced, setReduced] = useState(false)

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
      if (photoRef.current) {
        photoRef.current.style.transform = `scale(${1.05 + p * 0.22}) translateY(${(p - 0.5) * 6}%)`
      }
      if (textRef.current) {
        const appear = smooth(0.08, 0.32, p)
        const leave = smooth(0.68, 0.96, p)
        textRef.current.style.opacity = String(appear * (1 - leave))
        textRef.current.style.transform = `translateY(${(1 - appear) * 40 - leave * 40}px)`
      }
      if (lineRef.current) lineRef.current.style.transform = `scaleX(${0.15 + p * 0.85})`
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
      style={{ height: reduced ? "70vh" : "155vh" }}
    >
      <div className="sticky top-0 h-[100svh] w-full overflow-hidden">
        <div ref={photoRef} className="absolute inset-0" style={{ willChange: "transform" }}>
          <BrandImage src={img} alt={word} imgClassName="opacity-70" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-carbon via-carbon/45 to-carbon/70" />
        <div className="pointer-events-none absolute inset-6 text-white/15 sm:inset-10">
          <CornerFrame />
        </div>
        <span
          ref={lineRef}
          className="absolute left-0 top-1/2 z-10 h-px w-full origin-left bg-white/25"
          style={{ transform: "scaleX(0.15)" }}
        />

        <div className="relative z-20 flex h-full items-center justify-center px-6 text-center">
          <div ref={textRef} style={{ willChange: "opacity, transform" }}>
            {eyebrow && <span className="channel justify-center">{eyebrow}</span>}
            <h2 className="mt-4 font-display text-[clamp(2.6rem,12vw,10rem)] uppercase leading-[0.9] text-chalk">
              {word}
            </h2>
            {caption && (
              <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-ash sm:text-base">
                {caption}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
