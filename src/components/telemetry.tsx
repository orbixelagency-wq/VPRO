import { useEffect, useRef, useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"

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

interface RevealProps {
  children: ReactNode
  className?: string
  delay?: number
}

/** Fade + slide-up sobrio al entrar en viewport. */
export function Reveal({ children, className, delay = 0 }: RevealProps) {
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
      { threshold: 0.12 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn(
        "transition-all duration-[650ms] ease-out will-change-transform",
        shown ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0",
        className
      )}
    >
      {children}
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
