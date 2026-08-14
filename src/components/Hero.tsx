import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { asset } from "@/lib/asset"
import { Play, Instagram, Facebook, CalendarDays } from "lucide-react"

interface HeroProps {
  onReservar?: () => void
  onServicios?: () => void
}

/**
 * Hero cinematográfico con transición de silla giratoria dirigida por scroll.
 *
 * La sección se fija a pantalla completa y, al desplazarse, la silla de
 * barbero gira (rotación 3D + escala) mientras el titular se abre en dos,
 * dejándola como protagonista. Estética oscura elegante inspirada en la
 * referencia aportada.
 *
 * La silla se toma de /public/brand/chair.png (idealmente PNG recortado);
 * mientras no exista, se dibuja una silla vectorial de marca.
 */
export function Hero({ onReservar, onServicios }: HeroProps) {
  const wrapRef = useRef<HTMLElement>(null)
  const chairRef = useRef<HTMLDivElement>(null)
  const shadowRef = useRef<HTMLDivElement>(null)
  const leftRef = useRef<HTMLSpanElement>(null)
  const rightRef = useRef<HTMLSpanElement>(null)
  const introRef = useRef<HTMLDivElement>(null)
  const fillRef = useRef<HTMLSpanElement>(null)

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
      const top = wrap.getBoundingClientRect().top
      const p = Math.min(Math.max(-top / (total || 1), 0), 1)

      if (chairRef.current) {
        const rotY = p * 360
        const scale = 0.82 + p * 0.32
        chairRef.current.style.transform = `translate(-50%, -50%) perspective(1300px) rotateY(${rotY}deg) scale(${scale})`
      }
      if (shadowRef.current) {
        const sx = 0.55 + 0.45 * Math.abs(Math.cos(p * Math.PI * 2))
        shadowRef.current.style.transform = `translateX(-50%) scaleX(${sx})`
        shadowRef.current.style.opacity = String(0.5 - p * 0.18)
      }
      if (leftRef.current) {
        leftRef.current.style.transform = `translateX(${-p * 42}vw)`
        leftRef.current.style.opacity = String(Math.max(0, 1 - p * 1.5))
      }
      if (rightRef.current) {
        rightRef.current.style.transform = `translateX(${p * 42}vw)`
        rightRef.current.style.opacity = String(Math.max(0, 1 - p * 1.5))
      }
      if (introRef.current) {
        introRef.current.style.opacity = String(Math.max(0, 1 - p * 1.8))
      }
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
      id="inicio"
      className="relative"
      style={{ height: reduced ? "100svh" : "300vh" }}
    >
      <div className="sticky top-0 h-[100svh] w-full overflow-hidden bg-carbon p-3 sm:p-5">
        {/* Tarjeta del hero (split oscuro tipo referencia) */}
        <div className="relative h-full w-full overflow-hidden rounded-2xl bg-[linear-gradient(90deg,#161310_0%,#161310_50%,#0d0b09_50%,#0d0b09_100%)]">
          <div className="grain absolute inset-0 opacity-60" aria-hidden />
          <div className="absolute inset-0 bg-[radial-gradient(75%_60%_at_50%_42%,rgba(198,133,47,0.14),transparent_60%)]" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-carbon/70" />

          {/* Titular que se abre en dos */}
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
            <div className="flex w-full max-w-6xl items-center justify-between px-6">
              <span
                ref={leftRef}
                className="font-display text-[clamp(2rem,7vw,6.5rem)] uppercase leading-none text-chalk/90"
                style={{ willChange: "transform, opacity" }}
              >
                Más que
              </span>
              <span
                ref={rightRef}
                className="font-display text-[clamp(2rem,7vw,6.5rem)] uppercase leading-none text-chalk/90"
                style={{ willChange: "transform, opacity" }}
              >
                un corte
              </span>
            </div>
          </div>

          {/* Silla giratoria */}
          <div
            ref={chairRef}
            className="absolute left-1/2 top-1/2 z-20 h-[min(62vh,540px)] w-[min(62vh,540px)]"
            style={{
              transform: "translate(-50%, -50%) perspective(1300px) rotateY(0deg) scale(0.82)",
              willChange: "transform",
            }}
          >
            <ChairObject />
          </div>
          {/* Sombra de contacto */}
          <div
            ref={shadowRef}
            className="absolute left-1/2 top-[calc(50%+min(29vh,250px))] z-10 h-6 w-[min(40vh,360px)] -translate-x-1/2 rounded-[50%] bg-black blur-xl"
            style={{ opacity: 0.5 }}
          />

          {/* Eyebrow arriba */}
          <div className="absolute left-6 top-6 z-30 sm:left-9 sm:top-8">
            <span className="channel">Oblivion · Menorca</span>
          </div>

          {/* Intro: subtítulo + CTA (abajo izq) */}
          <div
            ref={introRef}
            className="absolute bottom-8 left-6 z-30 max-w-sm sm:left-9"
            style={{ willChange: "opacity" }}
          >
            <p className="text-sm leading-relaxed text-ash sm:text-base">
              Barbería &amp; cuidado masculino. Cortes de tendencia, barba con vapor
              de ozono y bebida de cortesía.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button size="lg" onClick={onReservar}>
                <CalendarDays className="h-4 w-4" /> Reservar cita
              </Button>
              <Button size="lg" variant="outline" onClick={onServicios}>
                Ver servicios
              </Button>
            </div>
          </div>

          {/* Abajo der: vídeos + social */}
          <div className="absolute bottom-8 right-6 z-30 hidden items-center gap-6 sm:right-9 sm:flex">
            <button className="group inline-flex items-center gap-3 text-ash transition-colors hover:text-chalk">
              <span className="grid h-11 w-11 place-items-center rounded-full border border-line transition-colors group-hover:border-ember">
                <Play className="h-4 w-4 fill-current" />
              </span>
              <span className="font-sans text-[0.7rem] font-semibold uppercase tracking-[0.18em]">
                Ver vídeos
              </span>
            </button>
            <div className="flex items-center gap-2">
              <a
                href="https://www.instagram.com/"
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
                className="grid h-10 w-10 place-items-center border border-line text-ash transition-colors hover:border-ember hover:text-ember"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a
                href="https://www.facebook.com/"
                target="_blank"
                rel="noreferrer"
                aria-label="Facebook"
                className="grid h-10 w-10 place-items-center border border-line text-ash transition-colors hover:border-ember hover:text-ember"
              >
                <Facebook className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Indicador de progreso del giro */}
          {!reduced && (
            <div className="absolute bottom-3 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 font-sans text-[0.58rem] font-semibold uppercase tracking-[0.24em] text-steel">
              <span>Scroll</span>
              <span className="relative block h-px w-24 bg-line">
                <span
                  ref={fillRef}
                  className="absolute inset-y-0 left-0 bg-ember"
                  style={{ width: "0%" }}
                />
              </span>
              <span>gira la silla</span>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

/** Usa la foto /brand/chair.png si existe; si no, dibuja una silla vectorial. */
function ChairObject() {
  const [failed, setFailed] = useState(false)
  if (!failed) {
    return (
      <img
        src={asset("/brand/chair.png")}
        alt="Sillón de barbero Oblivion"
        onError={() => setFailed(true)}
        className="h-full w-full object-contain"
        style={{ filter: "drop-shadow(0 30px 45px rgba(0,0,0,0.6))" }}
      />
    )
  }
  return <ChairArt />
}

/** Silla de barbero vectorial (marcador de marca hasta tener la foto real). */
function ChairArt() {
  return (
    <svg
      viewBox="0 0 260 360"
      className="h-full w-full"
      style={{ filter: "drop-shadow(0 26px 40px rgba(0,0,0,0.55))" }}
      aria-hidden
    >
      <defs>
        <linearGradient id="chBody" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#241a11" />
          <stop offset="0.55" stopColor="#17110b" />
          <stop offset="1" stopColor="#0e0a07" />
        </linearGradient>
        <linearGradient id="chMetal" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#4a4238" />
          <stop offset="0.5" stopColor="#8b7f6a" />
          <stop offset="1" stopColor="#3a332a" />
        </linearGradient>
      </defs>

      {/* Base */}
      <ellipse cx="130" cy="330" rx="82" ry="16" fill="url(#chMetal)" />
      <ellipse cx="130" cy="322" rx="46" ry="12" fill="#241a11" />
      <rect x="118" y="250" width="24" height="74" rx="6" fill="url(#chMetal)" />

      {/* Reposapiés */}
      <rect x="86" y="300" width="88" height="16" rx="8" fill="url(#chMetal)" />

      {/* Apron / mecanismo */}
      <rect x="74" y="224" width="112" height="30" rx="8" fill="url(#chMetal)" />

      {/* Asiento */}
      <rect x="64" y="182" width="132" height="48" rx="20" fill="url(#chBody)" stroke="rgba(231,196,129,0.28)" strokeWidth="1.5" />

      {/* Reposabrazos */}
      <rect x="40" y="164" width="66" height="20" rx="10" transform="rotate(-7 73 174)" fill="url(#chMetal)" />
      <rect x="154" y="164" width="66" height="20" rx="10" transform="rotate(7 187 174)" fill="url(#chMetal)" />

      {/* Respaldo (redondo, capitoné) */}
      <rect x="68" y="30" width="124" height="158" rx="56" fill="url(#chBody)" stroke="rgba(231,196,129,0.3)" strokeWidth="1.5" />
      {/* Reposacabezas */}
      <rect x="104" y="6" width="52" height="34" rx="16" fill="url(#chBody)" stroke="rgba(231,196,129,0.25)" strokeWidth="1.2" />

      {/* Capitoné (botones) */}
      {[
        [130, 66], [104, 86], [156, 86], [118, 112], [142, 112],
        [104, 138], [156, 138], [130, 158],
      ].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="2.6" fill="rgba(231,196,129,0.35)" />
      ))}
    </svg>
  )
}

export default Hero
