import { useEffect, useRef, useState } from "react"
import { BrandImage } from "@/components/BrandImage"
import { Button } from "@/components/ui/button"
import { CornerFrame } from "@/components/telemetry"
import { asset } from "@/lib/asset"
import { cn } from "@/lib/utils"

/**
 * HERO — "Secuencia de salida / analisis en directo"
 * ---------------------------------------------------
 * Un unico valor de progreso de scroll (0..1) sobre un tramo sticky dirige
 * varios actos coreografiados:
 *   0.00–0.22  Cold open: se ensambla la marca; el video se revela con cortina.
 *   0.10–0.66  Scrubbing: la linea de tiempo del video sigue al scroll.
 *   0.20–0.80  Titular que muta por actos + escala de medicion + HUD.
 *   0.60–0.80  Crossfade a fotografia de rendimiento.
 *   0.82–1.00  Cierre: todo se funde a carbon y entrega el testigo al Manifiesto.
 *
 * Coherente con la identidad "performance telemetry": timecode, coordenadas,
 * corchetes de encuadre y datos en Space Mono. Cero imagenes de stock.
 */

const clamp01 = (n: number) => Math.max(0, Math.min(1, n))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/** Opacidad de banda con desvanecido en los bordes. */
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

interface Act {
  code: string
  eyebrow: string
  title: string
  text: string
  start: number
  end: number
  big?: boolean
  cta?: boolean
}

const ACTS: Act[] = [
  {
    code: "EST",
    eyebrow: "Girona · Olot",
    title: "V PRO",
    text: "Centro de tecnificación y alto rendimiento de fútbol.",
    start: 0.0,
    end: 0.2,
    big: true,
  },
  {
    code: "01",
    eyebrow: "Análisis",
    title: "Cada gesto, medido",
    text: "Perfeccionamos la técnica jugador a jugador con análisis biomecánico del movimiento.",
    start: 0.3,
    end: 0.5,
  },
  {
    code: "02",
    eyebrow: "Rendimiento",
    title: "Rendir bajo presión",
    text: "Físico integral y resistencia táctica para competir al máximo nivel.",
    start: 0.58,
    end: 0.78,
    cta: true,
  },
]

const TICKER = [
  "Tecnificación",
  "Alto rendimiento",
  "Biomecánica",
  "Físico integral",
  "Girona",
  "Olot",
]

const VIDEO_PHASE = 0.66

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

  // Progreso de scroll del tramo sticky
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

  // Scrubbing suave del video
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
        const next = cur + (targetTimeRef.current - cur) * 0.16
        currentTimeRef.current = next
        const gap = Math.abs(next - v.currentTime)
        if (!v.seeking && gap > 0.012) {
          try {
            if (gap > 0.25 && typeof v.fastSeek === "function") {
              v.fastSeek(next)
            } else {
              v.currentTime = next
            }
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

  const p = progress
  const videoTime = clamp01(p / VIDEO_PHASE) * duration

  // Cortina de revelado del video (de rendija a pantalla completa)
  const revealT = clamp01((p - 0.04) / 0.18)
  const inset = lerp(46, 0, revealT)
  const videoClip = `inset(${inset}% 0% ${inset}% 0%)`

  // Crossfade video -> foto -> cierre
  const photo = clamp01((p - 0.6) / 0.16)
  const outro = clamp01((p - 0.82) / 0.16)
  const videoOpacity = (1 - photo) * (1 - outro)
  const photoOpacity = photo * (1 - outro)

  const activeAct = ACTS.reduce(
    (acc, a, i) => (band(p, a.start, a.end) > 0.5 ? i : acc),
    0
  )

  return (
    <section ref={wrapperRef} id="inicio" className="relative" style={{ height: "520vh" }}>
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-carbon">
        {/* ── Capa de video (revelado + scrub) ── */}
        <div
          className="absolute inset-0"
          style={{ opacity: videoOpacity, clipPath: videoClip }}
        >
          <video
            ref={videoRef}
            src={asset("/media/vpro-hero.mp4")}
            muted
            playsInline
            preload="auto"
            disablePictureInPicture
            className="h-full w-full object-cover"
            style={{ transform: `scale(${1.06 + p * 0.06})` }}
          />
        </div>

        {/* ── Fotografia de rendimiento (crossfade) ── */}
        <div className="absolute inset-0" style={{ opacity: photoOpacity }}>
          <BrandImage
            src="/brand/hero-2.jpg"
            alt="Rendimiento físico"
            label="Rendimiento · Olot"
            imgClassName="scale-105"
          />
        </div>

        {/* ── Gradientes institucionales ── */}
        <div className="absolute inset-0 bg-gradient-to-t from-carbon via-carbon/55 to-carbon/25" />
        <div className="absolute inset-0 bg-gradient-to-r from-carbon/85 via-transparent to-transparent" />
        {/* Cierre a carbon (handoff) */}
        <div className="absolute inset-0 bg-carbon" style={{ opacity: outro }} />

        {/* ── Crosshair de encuadre ── */}
        <div className="pointer-events-none absolute inset-0" aria-hidden style={{ opacity: 1 - outro }}>
          <div className="b-crossy absolute left-1/2 top-0 h-full w-px origin-center bg-white/[0.05]" />
          <div className="b-crossx absolute left-0 top-1/2 h-px w-full origin-center bg-white/[0.05]" />
        </div>

        {/* ── HUD de telemetria ── */}
        <div
          className="pointer-events-none absolute inset-0 z-20 text-steel"
          style={{ opacity: (1 - outro) * clamp01(revealT + 0.15) }}
        >
          <div className="b-frame absolute inset-5 text-white/25 sm:inset-8" style={{ animationDelay: "150ms" }}>
            <CornerFrame />
          </div>
          <div
            className="b-up absolute left-8 top-8 flex items-center gap-2 font-mono text-[0.65rem] uppercase tracking-[0.2em] sm:left-11 sm:top-11"
            style={{ animationDelay: "300ms" }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-ember animate-blink" />
            <span className="text-chalk/80">REC</span>
            <span>· Análisis en directo</span>
          </div>
          <div
            className="b-up absolute right-8 top-8 font-mono text-[0.65rem] tracking-[0.15em] sm:right-11 sm:top-11"
            style={{ animationDelay: "360ms" }}
          >
            <span className="text-chalk/80">{fmt(videoTime)}</span>
            <span className="text-steel/60"> / {fmt(duration)}</span>
          </div>

          {/* Escala de medicion vertical que "se llena" con el scroll */}
          <div
            className="b-in absolute right-8 top-1/2 hidden -translate-y-1/2 flex-col items-end gap-2 sm:flex sm:right-11"
            style={{ animationDelay: "500ms" }}
          >
            {Array.from({ length: 11 }).map((_, i) => {
              const on = p > i / 11
              return (
                <span
                  key={i}
                  className="block h-px transition-colors duration-300"
                  style={{
                    width: i % 2 === 0 ? 16 : 8,
                    background: on ? "#FF5A1F" : "rgba(255,255,255,0.2)",
                  }}
                />
              )
            })}
          </div>

          <div
            className="b-up absolute bottom-8 left-8 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-steel sm:bottom-11 sm:left-11"
            style={{ animationDelay: "420ms" }}
          >
            LAT 41.98 · LON 2.82&nbsp;&nbsp;|&nbsp;&nbsp;FR {Math.round(videoTime * 25)}
          </div>
        </div>

        {/* ── Contenido corporativo (crossfade por acto) ── */}
        <div className="absolute inset-0 z-10" style={{ opacity: 1 - outro }}>
          <div className="container flex h-full flex-col justify-center">
            {ACTS.map((a, i) => {
              const op = band(p, a.start, a.end)
              return (
                <div
                  key={i}
                  className="absolute left-0 right-0 px-6"
                  style={{
                    opacity: op,
                    transform: `translateY(${(1 - op) * 26}px)`,
                    filter: op < 0.9 ? `blur(${(1 - op) * 8}px)` : "none",
                    pointerEvents: op > 0.6 ? "auto" : "none",
                  }}
                >
                  <div className="mx-auto w-full max-w-6xl">
                    <span className="channel text-ember">
                      <span className="text-steel">
                        {a.code}
                        {" · "}
                        {a.eyebrow}
                      </span>
                    </span>
                    <h1
                      className={cn(
                        "mt-4 font-display font-extrabold uppercase leading-[0.86] text-chalk",
                        a.big
                          ? "text-[clamp(4.5rem,17vw,15rem)] tracking-[-0.02em]"
                          : "text-[clamp(2.6rem,8vw,6rem)] tracking-[-0.01em]"
                      )}
                    >
                      {a.title}
                    </h1>
                    <p className="mt-5 max-w-lg text-base leading-relaxed text-ash sm:text-lg">
                      {a.text}
                    </p>
                    {a.cta && (
                      <div className="mt-8 flex items-center gap-4">
                        <Button size="lg" onClick={onContacto}>
                          Solicitar análisis
                        </Button>
                        <span className="hidden font-mono text-[0.6rem] uppercase tracking-[0.2em] text-steel sm:block">
                          Respuesta 24–48h
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Ticker vinculado al scroll ── */}
        <div
          className="pointer-events-none absolute bottom-16 left-0 z-10 w-full overflow-hidden sm:bottom-20"
          style={{ opacity: (1 - outro) * clamp01((p - 0.02) / 0.1) }}
          aria-hidden
        >
          <div
            className="flex w-max gap-8 whitespace-nowrap font-display text-xl font-bold uppercase tracking-tight text-chalk/10 sm:text-2xl"
            style={{ transform: `translateX(${-p * 55}%)` }}
          >
            {[...TICKER, ...TICKER, ...TICKER].map((w, i) => (
              <span key={i} className="flex items-center gap-8">
                {w}
                <span className="text-ember/40">/</span>
              </span>
            ))}
          </div>
        </div>

        {/* ── Cierre / handoff al Manifiesto: sello de marca ── */}
        <div
          className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-5"
          style={{ opacity: outro, pointerEvents: "none" }}
        >
          <span
            className="grid h-16 w-16 place-items-center rounded-[4px] bg-ember font-display text-3xl font-extrabold text-carbon"
            style={{ transform: `scale(${lerp(0.9, 1, outro)})` }}
          >
            V
          </span>
          <div className="flex flex-col items-center leading-none">
            <span className="font-display text-2xl font-extrabold uppercase tracking-tight text-chalk">
              V PRO
            </span>
            <span className="mt-1.5 font-mono text-[0.6rem] uppercase tracking-[0.3em] text-steel">
              Total Training
            </span>
          </div>
          <span className="mt-2 font-mono text-[0.62rem] uppercase tracking-[0.24em] text-steel">
            ↓ Manifiesto
          </span>
        </div>

        {/* ── Barra de progreso + contador de acto ── */}
        <div className="absolute bottom-0 left-0 z-20 h-[2px] w-full bg-white/10">
          <div className="h-full bg-ember" style={{ width: `${p * 100}%` }} />
        </div>
        <div
          className="b-in absolute bottom-5 left-1/2 z-20 -translate-x-1/2 font-mono text-[0.6rem] tracking-[0.3em] text-steel sm:bottom-6"
          style={{ animationDelay: "560ms", opacity: 1 - outro }}
        >
          {String(activeAct + 1).padStart(2, "0")} / {String(ACTS.length).padStart(2, "0")}
          <span className="ml-3 text-steel/60">scroll</span>
        </div>
      </div>
    </section>
  )
}

export default VideoHero
