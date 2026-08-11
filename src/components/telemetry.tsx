import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react"
import { cn } from "@/lib/utils"

/** Curva de salida fuerte (Emil): arranca rapido, se asienta. */
export const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)"

const prefersReduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches

/** Barra fina de progreso de lectura, anclada arriba. */
export function ScrollProgressBar() {
  const [p, setP] = useState(0)
  useEffect(() => {
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const doc = document.documentElement
        const max = doc.scrollHeight - doc.clientHeight
        setP(max > 0 ? doc.scrollTop / max : 0)
      })
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    onScroll()
    return () => {
      window.removeEventListener("scroll", onScroll)
      cancelAnimationFrame(raf)
    }
  }, [])
  return (
    <div className="fixed inset-x-0 top-0 z-[60] h-[2px] bg-transparent" aria-hidden>
      <div
        className="h-full origin-left bg-ember"
        style={{ transform: `scaleX(${p})`, willChange: "transform" }}
      />
    </div>
  )
}

/** Corchetes de esquina tipo HUD / lineas de campo. Hereda el color via text-*. */
export function CornerFrame({ className }: { className?: string }) {
  return (
    <div className={cn("pointer-events-none absolute inset-0", className)} aria-hidden>
      <span className="corner-tl" />
      <span className="corner-tr" />
      <span className="corner-bl" />
      <span className="corner-br" />
    </div>
  )
}

/** Regla hairline que se "dibuja" (scaleX) al entrar en viewport —
 *  como trazar un eje de medicion. Reemplaza al fade generico. */
export function Rule({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true)
          io.disconnect()
        }
      },
      { threshold: 1 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <div
      ref={ref}
      className={cn(
        "rule origin-left transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
        shown ? "scale-x-100" : "scale-x-0",
        className
      )}
    />
  )
}

/** Observa un elemento una sola vez y devuelve si ya entro en viewport. */
function useInViewOnce<T extends Element>(
  ref: RefObject<T>,
  { threshold = 0.12, margin = "0px 0px -8% 0px" } = {}
) {
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true)
          io.disconnect()
        }
      },
      { threshold, rootMargin: margin }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [ref, threshold, margin])
  return shown
}

interface RevealProps {
  children: ReactNode
  className?: string
  delay?: number
  /** Distancia de deslizamiento inicial en px. */
  y?: number
  /** Anade un desenfoque que se resuelve al entrar (mask de imperfeccion). */
  blur?: boolean
}

/** Fade + slide-up con curva fuerte al entrar en viewport. */
export function Reveal({ children, className, delay = 0, y = 16, blur = false }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const shown = useInViewOnce(ref)

  return (
    <div
      ref={ref}
      style={{
        transitionDelay: `${delay}ms`,
        transitionTimingFunction: EASE_OUT,
        transform: shown ? "translateY(0)" : `translateY(${y}px)`,
        opacity: shown ? 1 : 0,
        filter: blur && !shown ? "blur(10px)" : "blur(0px)",
      }}
      className={cn(
        "transition-[transform,opacity,filter] duration-[720ms] will-change-transform",
        className
      )}
    >
      {children}
    </div>
  )
}

type ClipDir = "up" | "down" | "left" | "right"
const CLIP_HIDDEN: Record<ClipDir, string> = {
  up: "inset(0 0 100% 0)",
  down: "inset(100% 0 0 0)",
  left: "inset(0 100% 0 0)",
  right: "inset(0 0 0 100%)",
}

/** Revelado con cortina (clip-path) al entrar en viewport. Ideal para media. */
export function ClipReveal({
  children,
  className,
  direction = "up",
  delay = 0,
  duration = 900,
}: {
  children: ReactNode
  className?: string
  direction?: ClipDir
  delay?: number
  duration?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const shown = useInViewOnce(ref, { threshold: 0.2 })
  return (
    <div
      ref={ref}
      style={{
        clipPath: shown ? "inset(0 0 0 0)" : CLIP_HIDDEN[direction],
        transition: `clip-path ${duration}ms ${EASE_OUT} ${delay}ms`,
      }}
      className={className}
    >
      {children}
    </div>
  )
}

/**
 * Progreso de un elemento a traves del viewport: 0 justo cuando su borde
 * superior asoma por abajo, 1 cuando su borde inferior sale por arriba.
 * Solo recalcula mientras el elemento es visible.
 */
export function useScrollProgress<T extends Element>(ref: RefObject<T>) {
  const [p, setP] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el || prefersReduced()) return
    let raf = 0
    let inView = false
    const measure = () => {
      const r = el.getBoundingClientRect()
      const vh = window.innerHeight || 1
      const total = r.height + vh
      setP(Math.max(0, Math.min(1, (vh - r.top) / total)))
    }
    const onScroll = () => {
      if (!inView) return
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(measure)
    }
    const io = new IntersectionObserver(
      ([e]) => {
        inView = e.isIntersecting
        if (inView) onScroll()
      },
      { threshold: 0 }
    )
    io.observe(el)
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll, { passive: true })
    measure()
    return () => {
      io.disconnect()
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
      cancelAnimationFrame(raf)
    }
  }, [ref])
  return p
}

/**
 * Desplazamiento parallax vinculado al scroll. Mide un contenedor NO
 * transformado y traslada un hijo interno para evitar bucles de feedback.
 */
export function Parallax({
  children,
  speed = 40,
  className,
  innerClassName,
}: {
  children: ReactNode
  /** px totales de recorrido (positivo = el contenido "frena" respecto al scroll). */
  speed?: number
  className?: string
  innerClassName?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const p = useScrollProgress(ref)
  const y = (0.5 - p) * speed
  return (
    <div ref={ref} className={className}>
      <div
        className={innerClassName}
        style={{ transform: `translate3d(0, ${y}px, 0)`, willChange: "transform" }}
      >
        {children}
      </div>
    </div>
  )
}

interface CountUpProps {
  to: number
  decimals?: number
  suffix?: string
  prefix?: string
  className?: string
  duration?: number
}

/** Cuenta un numero (datum) al entrar en viewport. */
export function CountUp({
  to,
  decimals = 0,
  suffix = "",
  prefix = "",
  className,
  duration = 1200,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const [val, setVal] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return
        io.disconnect()
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
        if (reduce) {
          setVal(to)
          return
        }
        const start = performance.now()
        const tick = (now: number) => {
          const p = Math.min((now - start) / duration, 1)
          const eased = 1 - Math.pow(1 - p, 3)
          setVal(to * eased)
          if (p < 1) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      },
      { threshold: 0.4 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [to, duration])

  return (
    <span ref={ref} className={cn("datum", className)}>
      {prefix}
      {val.toFixed(decimals)}
      {suffix}
    </span>
  )
}
