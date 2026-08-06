import { useEffect, useRef, useState } from "react"
import { BrandImage } from "@/components/BrandImage"
import { Button } from "@/components/ui/button"
import { asset } from "@/lib/asset"
import { cn } from "@/lib/utils"

/**
 * Hero cinematico "scroll-driven": la linea de tiempo del video esta
 * vinculada a la posicion de scroll (scrubbing). Al bajar, el video avanza
 * fotograma a fotograma y se funde con fotografias de rendimiento mientras
 * se revela informacion corporativa con parallax.
 */

// opacidad 0..1 con bordes suavizados (fade in/out)
const band = (p: number, start: number, end: number, fade = 0.06) => {
  if (p <= start - fade || p >= end + fade) return 0
  if (p < start) return (p - (start - fade)) / fade
  if (p > end) return Math.max(0, 1 - (p - end) / fade)
  return 1
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n))

interface Stage {
  index: string
  eyebrow: string
  title: string
  text: string
  start: number
  end: number
  big?: boolean
  cta?: boolean
}

const STAGES: Stage[] = [
  {
    index: "",
    eyebrow: "Girona · Olot",
    title: "V PRO",
    text: "Total Training — Tecnificacion y alto rendimiento de futbol.",
    start: 0,
    end: 0.26,
    big: true,
  },
  {
    index: "01",
    eyebrow: "Tecnificacion",
    title: "Tecnica individualizada",
    text: "Analisis biomecanico y perfeccionamiento del gesto, jugador a jugador.",
    start: 0.36,
    end: 0.6,
  },
  {
    index: "02",
    eyebrow: "Rendimiento",
    title: "Fisico y tactica",
    text: "Rendimiento fisico integral y resistencia tactica para competir al maximo nivel.",
    start: 0.68,
    end: 1.05,
    cta: true,
  },
]

// El video ocupa el primer tramo del scroll; el resto revela las fotos.
const VIDEO_PHASE = 0.72

interface VideoHeroProps {
  onContacto?: () => void
}

export function VideoHero({ onContacto }: VideoHeroProps) {
  const wrapperRef = useRef<HTMLElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const targetTimeRef = useRef(0)
  const currentTimeRef = useRef(0)
  const durationRef = useRef(0)
  const rafRef = useRef(0)
  const [progress, setProgress] = useState(0)

  // Scroll -> progreso + tiempo objetivo del video
  useEffect(() => {
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const el = wrapperRef.current
        if (!el) return
        const total = el.offsetHeight - window.innerHeight
        const scrolled = Math.min(Math.max(-el.getBoundingClientRect().top, 0), total)
        const p = total > 0 ? scrolled / total : 0
        setProgress(p)
        const videoP = clamp01(p / VIDEO_PHASE)
        targetTimeRef.current = videoP * (durationRef.current || 0)
      })
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    onScroll()
    return () => {
      window.removeEventListener("scroll", onScroll)
      cancelAnimationFrame(raf)
    }
  }, [])

  // Bucle rAF: suaviza (lerp) el currentTime del video hacia el objetivo.
  // Solo corre mientras el hero es visible (IntersectionObserver).
  useEffect(() => {
    const v = videoRef.current
    const el = wrapperRef.current
    if (!v || !el) return

    const onMeta = () => {
      durationRef.current = v.duration || 0
      // Prime del decodificador para que el scrubbing pinte frames
      v.play().then(() => v.pause()).catch(() => {})
      try {
        v.currentTime = 0.001
      } catch {
        /* noop */
      }
    }
    v.addEventListener("loadedmetadata", onMeta)
    if (v.readyState >= 1) onMeta()

    let active = true
    const tick = () => {
      if (active && durationRef.current) {
        const cur = currentTimeRef.current
        const next = cur + (targetTimeRef.current - cur) * 0.14
        currentTimeRef.current = next
        if (Math.abs(next - v.currentTime) > 0.03) {
          try {
            v.currentTime = next
          } catch {
            /* seek en curso */
          }
        }
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        active = entry.isIntersecting
      },
      { threshold: 0 }
    )
    io.observe(el)
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      v.removeEventListener("loadedmetadata", onMeta)
      io.disconnect()
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  const photoA = clamp01((progress - 0.58) / 0.16) // se funde con foto 1
  const photoB = clamp01((progress - 0.78) / 0.16) // se funde con foto 2
  const videoOpacity = 1 - Math.max(photoA, photoB)

  return (
    <section ref={wrapperRef} id="inicio" className="relative" style={{ height: "420vh" }}>
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-ink">
        {/* Capa video (scrubbing) */}
        <div className="absolute inset-0" style={{ opacity: videoOpacity }}>
          <video
            ref={videoRef}
            src={asset("/media/vpro-hero.mp4")}
            muted
            playsInline
            preload="auto"
            className="h-full w-full object-cover"
            style={{ transform: `scale(${1.05 + progress * 0.05})` }}
          />
        </div>

        {/* Fusion con fotografias de rendimiento */}
        <div className="absolute inset-0" style={{ opacity: photoA * (1 - photoB) }}>
          <BrandImage src="/brand/hero-1.jpg" alt="Rendimiento" label="Tecnificacion" />
        </div>
        <div className="absolute inset-0" style={{ opacity: photoB }}>
          <BrandImage src="/brand/hero-2.jpg" alt="Rendimiento" label="Fisico y tactica" />
        </div>

        {/* Gradientes institucionales */}
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/55 to-ink/25" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink/75 via-transparent to-transparent" />

        {/* Texto corporativo por etapa (parallax + fade) */}
        <div className="absolute inset-0">
          <div className="container flex h-full flex-col justify-center">
            {STAGES.map((s, i) => {
              const op = band(progress, s.start, s.end)
              return (
                <div
                  key={i}
                  className="absolute left-0 right-0 px-6"
                  style={{
                    opacity: op,
                    transform: `translateY(${(1 - op) * 30}px)`,
                    pointerEvents: op > 0.6 ? "auto" : "none",
                  }}
                >
                  <div className="mx-auto w-full max-w-6xl">
                    <div className="flex items-center gap-3">
                      {s.index && (
                        <span className="font-mono text-sm font-semibold text-flame">
                          {s.index}
                        </span>
                      )}
                      <span className="h-px w-10 bg-flame/60" />
                      <span className="text-xs font-semibold uppercase tracking-[0.34em] text-white/70">
                        {s.eyebrow}
                      </span>
                    </div>

                    <h1
                      className={cn(
                        "mt-5 font-display font-extrabold uppercase text-white",
                        s.big
                          ? "text-6xl leading-[0.9] tracking-tight sm:text-8xl"
                          : "text-4xl leading-[0.95] tracking-tight sm:text-6xl"
                      )}
                    >
                      {s.title}
                    </h1>

                    <p className="mt-5 max-w-xl text-base leading-relaxed text-white/80 sm:text-lg">
                      {s.text}
                    </p>

                    {s.cta && (
                      <div className="mt-8">
                        <Button onClick={onContacto}>Contacto corporativo</Button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Barra de progreso cinematica */}
        <div className="absolute bottom-0 left-0 h-[3px] w-full bg-white/8">
          <div
            className="h-full bg-flame"
            style={{ width: `${progress * 100}%`, transition: "width 80ms linear" }}
          />
        </div>

        {/* Hint de scroll (se desvanece al empezar) */}
        <div
          className="absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2"
          style={{ opacity: clamp01(1 - progress * 6) }}
        >
          <span className="text-[10px] font-semibold uppercase tracking-[0.35em] text-white/50">
            Scroll
          </span>
          <span className="h-8 w-px bg-gradient-to-b from-flame to-transparent" />
        </div>

        {/* Marco fino corporativo */}
        <div className="pointer-events-none absolute inset-6 border border-white/8 sm:inset-10" />
      </div>
    </section>
  )
}

export default VideoHero
