import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { CalendarDays, ArrowRight, MapPin } from "lucide-react"
import b1 from "@/assets/barber-1.jpg"
import b2 from "@/assets/barber-2.jpg"
import b3 from "@/assets/barber-3.jpg"
import b4 from "@/assets/barber-4.jpg"
import b5 from "@/assets/barber-5.jpg"

interface HeroProps {
  onReservar?: () => void
  onServicios?: () => void
}

interface Barber {
  img: string
  name: string
  role: string
  spec: string
}

/* Nombres/roles de ejemplo — edítalos con los reales del equipo. */
const TEAM: Barber[] = [
  { img: b1, name: "Marc", role: "Fundador · Barbero", spec: "Clásico & barba con ozono" },
  { img: b2, name: "Toni", role: "Barbero senior", spec: "Fades & degradados" },
  { img: b3, name: "Biel", role: "Barbero", spec: "Tijera & texturizado" },
  { img: b4, name: "Nacho", role: "Barbero", spec: "Estilo urbano" },
  { img: b5, name: "Àlex", role: "Barbero & barba", spec: "Afeitado a navaja" },
]

const clamp01 = (n: number) => Math.max(0, Math.min(1, n))
const smooth = (a: number, b: number, x: number) => clamp01((x - a) / (b - a))

/**
 * Hero con transición de scroll en tres actos:
 *  1) FOCO: un haz de luz revela la marca; al bajar, se despeja de golpe.
 *  2) EQUIPO: aparece una inscripción a la izquierda y la dirección a la
 *     derecha; las fotos de los barberos pasan en horizontal con su info.
 *  3) Continúa el scroll normal hacia las siguientes secciones.
 *
 * Degradación con prefers-reduced-motion: intro estático + equipo en fila
 * desplazable, sin fijado.
 */
export function Hero({ onReservar, onServicios }: HeroProps) {
  const wrapRef = useRef<HTMLElement>(null)
  const stickyRef = useRef<HTMLDivElement>(null)
  const introRef = useRef<HTMLDivElement>(null)
  const teamRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const leftRef = useRef<HTMLDivElement>(null)
  const rightRef = useRef<HTMLDivElement>(null)
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
      const p = clamp01(-wrap.getBoundingClientRect().top / (total || 1))

      // Acto 1 — foco/intro: visible y luego se despeja "de golpe".
      const introOut = smooth(0.12, 0.24, p)
      if (introRef.current) {
        introRef.current.style.opacity = String(1 - introOut)
        introRef.current.style.transform = `translateY(${-introOut * 40}px) scale(${1 + introOut * 0.06})`
        introRef.current.style.filter = `blur(${introOut * 6}px)`
      }

      // Acto 2 — equipo: aparece.
      const teamIn = smooth(0.2, 0.3, p)
      if (teamRef.current) {
        teamRef.current.style.opacity = String(teamIn)
        teamRef.current.style.pointerEvents = teamIn > 0.5 ? "auto" : "none"
      }
      if (leftRef.current) {
        leftRef.current.style.opacity = String(smooth(0.26, 0.34, p))
        leftRef.current.style.transform = `translateX(${(1 - smooth(0.26, 0.36, p)) * -30}px)`
      }
      if (rightRef.current) {
        rightRef.current.style.opacity = String(smooth(0.3, 0.4, p))
        rightRef.current.style.transform = `translateX(${(1 - smooth(0.3, 0.4, p)) * 30}px)`
      }

      // Paso horizontal de las fotos.
      if (trackRef.current && stickyRef.current) {
        const localP = smooth(0.3, 0.96, p)
        const max = trackRef.current.scrollWidth - stickyRef.current.clientWidth + 40
        trackRef.current.style.transform = `translateX(${-localP * Math.max(0, max)}px)`
      }
      if (fillRef.current) fillRef.current.style.width = `${smooth(0.3, 0.96, p) * 100}%`
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

  // ---- Versión "movimiento reducido": estática y accesible ----
  if (reduced) {
    return (
      <section id="inicio" className="relative bg-carbon">
        <div className="grid min-h-[100svh] place-items-center px-6 text-center">
          <div>
            <p className="channel justify-center">Barbería &amp; cuidado masculino — Menorca</p>
            <h1 className="mt-5 font-display text-[clamp(3rem,12vw,9rem)] uppercase leading-[0.85] text-chalk">
              Oblivion
            </h1>
            <p className="accent-serif mt-1 text-[clamp(1.4rem,4vw,2.6rem)] text-brass">
              Barbers &amp; Care
            </p>
            <div className="mt-8 flex justify-center gap-3">
              <Button size="lg" onClick={onReservar}>
                <CalendarDays className="h-4 w-4" /> Reservar cita
              </Button>
              <Button size="lg" variant="outline" onClick={onServicios}>
                Ver servicios
              </Button>
            </div>
          </div>
        </div>
        <div className="container pb-20">
          <p className="channel">El equipo</p>
          <div className="mt-6 flex snap-x gap-5 overflow-x-auto pb-4">
            {TEAM.map((t) => (
              <TeamCard key={t.name} b={t} />
            ))}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section ref={wrapRef} id="inicio" className="relative" style={{ height: "560vh" }}>
      <div
        ref={stickyRef}
        className="sticky top-0 flex h-[100svh] w-full items-center overflow-hidden bg-carbon"
      >
        {/* ===== Acto 1: foco / intro ===== */}
        <div
          ref={introRef}
          className="absolute inset-0 z-20 grid place-items-center px-6 text-center"
          style={{ willChange: "opacity, transform, filter" }}
        >
          {/* Haz de luz */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(58% 46% at 50% 40%, rgba(231,196,129,0.18), rgba(198,133,47,0.06) 40%, transparent 68%)",
            }}
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "conic-gradient(from 180deg at 50% -8%, transparent 42%, rgba(231,196,129,0.12) 50%, transparent 58%)",
            }}
          />
          <div className="grain absolute inset-0 opacity-50" aria-hidden />

          <div className="relative">
            <p className="channel justify-center">Barbería &amp; cuidado masculino — Menorca</p>
            <h1 className="mt-5 font-display text-[clamp(3.4rem,15vw,12rem)] uppercase leading-[0.82] text-chalk">
              Oblivion
            </h1>
            <p className="accent-serif -mt-1 text-[clamp(1.5rem,5vw,3.4rem)] text-brass">
              Barbers &amp; Care
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button size="lg" onClick={onReservar}>
                <CalendarDays className="h-4 w-4" /> Reservar cita
              </Button>
              <Button size="lg" variant="outline" onClick={onServicios}>
                Ver servicios
              </Button>
            </div>
          </div>

          <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 items-center gap-2 font-sans text-[0.6rem] font-semibold uppercase tracking-[0.28em] text-steel">
            Baja para conocer al equipo <ArrowRight className="h-3 w-3 rotate-90" />
          </div>
        </div>

        {/* ===== Acto 2: equipo ===== */}
        <div
          ref={teamRef}
          className="absolute inset-0 z-10"
          style={{ opacity: 0, willChange: "opacity" }}
        >
          {/* Inscripción a la izquierda */}
          <div
            ref={leftRef}
            className="pointer-events-none absolute left-6 top-1/2 z-20 hidden max-w-[220px] -translate-y-1/2 lg:block"
            style={{ willChange: "opacity, transform" }}
          >
            <p className="channel">El equipo</p>
            <h2 className="mt-4 font-display text-3xl uppercase leading-[0.95] text-chalk">
              Manos que dan forma
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-ash">
              Barberos de Oblivion. Oficio, detalle y trato cercano en cada visita.
            </p>
          </div>

          {/* Dirección a la derecha */}
          <div
            ref={rightRef}
            className="pointer-events-none absolute right-6 top-1/2 z-20 hidden max-w-[210px] -translate-y-1/2 text-right lg:block"
            style={{ willChange: "opacity, transform" }}
          >
            <p className="channel justify-end">Dónde estamos</p>
            <ul className="mt-4 space-y-3 text-sm text-ash">
              <li>
                <span className="block font-medium text-chalk">Es Castell</span>
                Ctra. de Sant Felip, 1
              </li>
              <li>
                <span className="block font-medium text-chalk">Mahón</span>
                Av. de Fort de l'Eau, 167
              </li>
              <li>
                <span className="block font-medium text-chalk">Ciutadella</span>
                Carrer d'Eivissa, 25
              </li>
            </ul>
          </div>

          {/* Degradados laterales (enmascaran las fotos tras los textos) */}
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-carbon via-carbon/85 to-transparent sm:w-36 lg:w-[27vw]" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-carbon via-carbon/85 to-transparent sm:w-36 lg:w-[27vw]" />

          {/* Fotos que pasan en horizontal */}
          <div className="absolute inset-0 flex items-center">
            <div
              ref={trackRef}
              className="flex items-center gap-6 px-6 sm:gap-8 lg:pl-[30vw] lg:pr-[27vw]"
              style={{ willChange: "transform" }}
            >
              {TEAM.map((t, i) => (
                <TeamCard key={t.name} b={t} index={i} />
              ))}
            </div>
          </div>

          {/* Progreso horizontal */}
          <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3 font-sans text-[0.58rem] font-semibold uppercase tracking-[0.24em] text-steel">
            <span>Equipo</span>
            <span className="relative block h-px w-28 bg-line">
              <span ref={fillRef} className="absolute inset-y-0 left-0 bg-ember" style={{ width: "0%" }} />
            </span>
            <span>desliza</span>
          </div>
        </div>
      </div>
    </section>
  )
}

function TeamCard({ b, index }: { b: Barber; index?: number }) {
  return (
    <article className="group relative w-[70vw] shrink-0 sm:w-[320px]">
      <div className="relative overflow-hidden border border-line">
        <div className="aspect-[3/4] overflow-hidden bg-graphite">
          <img
            src={b.img}
            alt={`${b.name} — ${b.role}`}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            draggable={false}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-carbon/85 via-transparent to-transparent" />
        </div>
        {typeof index === "number" && (
          <span className="absolute right-3 top-3 font-display text-lg text-chalk/70">
            0{index + 1}
          </span>
        )}
        {/* Info abajo, sobre la foto */}
        <div className="absolute inset-x-0 bottom-0 p-4">
          <h3 className="font-display text-2xl uppercase leading-none text-chalk">{b.name}</h3>
          <p className="mt-1 font-sans text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-ember">
            {b.role}
          </p>
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-ash">
            <MapPin className="h-3 w-3 text-steel" /> {b.spec}
          </p>
        </div>
      </div>
    </article>
  )
}

export default Hero
