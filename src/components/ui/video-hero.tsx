import { useEffect, useRef, useState } from "react"
import { BrandImage } from "@/components/BrandImage"
import { Button } from "@/components/ui/button"
import { CornerFrame } from "@/components/telemetry"
import { asset } from "@/lib/asset"
import { cn } from "@/lib/utils"

/**
 * Hero-signature: "analisis en directo".
 * La linea de tiempo del video se vincula al scroll (scrubbing) y se enmarca
 * como material de analisis con un HUD de telemetria (timecode, corchetes,
 * coordenadas, ticks). Al bajar, el video se funde con fotos de rendimiento.
 */

const clamp01 = (n: number) => Math.max(0, Math.min(1, n))

const band = (p: number, start: number, end: number, fade = 0.06) => {
  if (p <= start - fade || p >= end + fade) return 0
  if (p < start) return (p - (start - fade)) / fade
  if (p > end) return Math.max(0, 1 - (p - end) / fade)
  return 1
}

const fmt = (t: number) => {
  const ss = Math.floor(t % 60)
  const mmm = Math.floor((t * 1000) % 1000)
  return `00:${String(ss).padStart(2, "0")}:${String(mmm).padStart(3, "0")}`
}

interface Stage {
  code: string
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
    code: "EST",
    eyebrow: "Girona · Olot",
    title: "V PRO",
    text: "Centro de tecnificación y alto rendimiento de fútbol.",
    start: 0,
    end: 0.24,
    big: true,
  },
  {
    code: "01",
    eyebrow: "Análisis",
    title: "Cada gesto, medido",
    text: "Perfeccionamos la técnica jugador a jugador con análisis biomecánico del movimiento.",
    start: 0.34,
    end: 0.58,
  },
  {
    code: "02",
    eyebrow: "Rendimiento",
    title: "Rendir bajo presión",
    text: "Físico integral y resistencia táctica para competir al máximo nivel.",
    start: 0.66,
    end: 1.05,
    cta: true,
  },
]

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
  const [duration, setDuration] = useState(10)

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
        targetTimeRef.current = clamp01(p / VIDEO_PHASE) * (durationRef.current || 0)
      })
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    onScroll()
    return () => {
      window.removeEventListener("scroll", onScroll)
      cancelAnimationFrame(raf)
    }
  }, [])

  useEffect(() => {
    const v = videoRef.current
    if (!v) return

    const onMeta = () => {
      durationRef.current = v.duration || 0
      setDuration(v.duration || 10)
      try {
        v.pause()
        v.currentTime = 0.001
      } catch {
        /* noop */
      }
    }
    v.addEventListener("loadedmetadata", onMeta)
    if (v.readyState >= 1) onMeta()

    let running = true
    const tick = () => {
      if (!running) return
      const d = durationRef.current
      if (d) {
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
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      running = false
      v.removeEventListener("loadedmetadata", onMeta)
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  const videoTime = clamp01(progress / VIDEO_PHASE) * duration
  const photoA = clamp01((progress - 0.56) / 0.16)
  const photoB = clamp01((progress - 0.76) / 0.16)
  const videoOpacity = 1 - Math.max(photoA, photoB)
  const activeStage = STAGES.reduce(
    (acc, s, i) => (band(progress, s.start, s.end) > 0.5 ? i : acc),
    0
  )

  return (
    <section ref={wrapperRef} id="inicio" className="relative" style={{ height: "440vh" }}>
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-carbon">
        {/* Capas de video / foto */}
        <div className="absolute inset-0" style={{ opacity: videoOpacity }}>
          <video
            ref={videoRef}
            src={asset("/media/vpro-hero.mp4")}
            muted
            playsInline
            preload="auto"
            className="h-full w-full object-cover"
            style={{ transform: `scale(${1.04 + progress * 0.05})` }}
          />
        </div>
        <div className="absolute inset-0" style={{ opacity: photoA * (1 - photoB) }}>
          <BrandImage src="/brand/hero-1.jpg" alt="Análisis técnico" label="Análisis · Girona" />
        </div>
        <div className="absolute inset-0" style={{ opacity: photoB }}>
          <BrandImage src="/brand/hero-2.jpg" alt="Rendimiento físico" label="Rendimiento · Olot" />
        </div>

        {/* Oscurecido institucional */}
        <div className="absolute inset-0 bg-gradient-to-t from-carbon via-carbon/55 to-carbon/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-carbon/80 via-transparent to-transparent" />

        {/* Crosshair de encuadre (analisis) */}
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/[0.04]" />
          <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-white/[0.04]" />
        </div>

        {/* HUD */}
        <div className="pointer-events-none absolute inset-0 z-20 text-steel">
          {/* marco */}
          <div className="absolute inset-5 text-white/25 sm:inset-8">
            <CornerFrame />
          </div>
          {/* REC arriba izq */}
          <div className="absolute left-8 top-8 flex items-center gap-2 font-mono text-[0.65rem] uppercase tracking-[0.2em] sm:left-11 sm:top-11">
            <span className="h-1.5 w-1.5 rounded-full bg-ember animate-blink" />
            <span className="text-chalk/80">REC</span>
            <span>· Análisis en directo</span>
          </div>
          {/* timecode arriba der */}
          <div className="absolute right-8 top-8 font-mono text-[0.65rem] tracking-[0.15em] sm:right-11 sm:top-11">
            <span className="text-chalk/80">{fmt(videoTime)}</span>
            <span className="text-steel/60"> / {fmt(duration)}</span>
          </div>
          {/* ticks laterales */}
          <div className="absolute right-8 top-1/2 hidden -translate-y-1/2 flex-col items-end gap-2 sm:flex sm:right-11">
            {Array.from({ length: 9 }).map((_, i) => (
              <span
                key={i}
                className="block h-px bg-white/20"
                style={{ width: i % 2 === 0 ? 14 : 7 }}
              />
            ))}
          </div>
          {/* readout abajo izq */}
          <div className="absolute bottom-8 left-8 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-steel sm:bottom-11 sm:left-11">
            LAT 41.98 · LON 2.82&nbsp;&nbsp;|&nbsp;&nbsp;FR {Math.round(videoTime * 25)}
          </div>
        </div>

        {/* Contenido corporativo (crossfade por etapa) */}
        <div className="absolute inset-0 z-10">
          <div className="container flex h-full flex-col justify-center">
            {STAGES.map((s, i) => {
              const op = band(progress, s.start, s.end)
              return (
                <div
                  key={i}
                  className="absolute left-0 right-0 px-6"
                  style={{
                    opacity: op,
                    transform: `translateY(${(1 - op) * 26}px)`,
                    pointerEvents: op > 0.6 ? "auto" : "none",
                  }}
                >
                  <div className="mx-auto w-full max-w-6xl">
                    <span className="channel text-ember">
                      <span className="text-steel">
                        {s.code}
                        {" · "}
                        {s.eyebrow}
                      </span>
                    </span>
                    <h1
                      className={cn(
                        "mt-4 font-display font-extrabold uppercase leading-[0.86] text-chalk",
                        s.big
                          ? "text-[clamp(4.5rem,17vw,15rem)] tracking-[-0.02em]"
                          : "text-[clamp(2.6rem,8vw,6rem)] tracking-[-0.01em]"
                      )}
                    >
                      {s.title}
                    </h1>
                    <p className="mt-5 max-w-lg text-base leading-relaxed text-ash sm:text-lg">
                      {s.text}
                    </p>
                    {s.cta && (
                      <div className="mt-8">
                        <Button size="lg" onClick={onContacto}>
                          Solicitar análisis
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Barra de progreso + etapa */}
        <div className="absolute bottom-0 left-0 z-20 h-[2px] w-full bg-white/10">
          <div className="h-full bg-ember" style={{ width: `${progress * 100}%` }} />
        </div>
        <div className="absolute bottom-5 left-1/2 z-20 -translate-x-1/2 font-mono text-[0.6rem] tracking-[0.3em] text-steel sm:bottom-6">
          {String(activeStage + 1).padStart(2, "0")} / {String(STAGES.length).padStart(2, "0")}
          <span className="ml-3 text-steel/60">scroll</span>
        </div>
      </div>
    </section>
  )
}

export default VideoHero
