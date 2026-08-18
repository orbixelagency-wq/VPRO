import { useEffect } from "react"
import Lenis from "lenis"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

export const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches

declare global {
  interface Window {
    __lenis?: Lenis
  }
}

/**
 * Scroll suave con inercia (estilo recent.design) sincronizado con GSAP
 * ScrollTrigger. Se desactiva por completo si el usuario pide menos
 * movimiento. Devuelve nada — sólo efectos globales.
 */
export function useSmoothScroll() {
  useEffect(() => {
    if (prefersReducedMotion()) return

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => 1 - Math.pow(1 - t, 3), // easeOutCubic
      smoothWheel: true,
      touchMultiplier: 1.4,
    })
    window.__lenis = lenis

    lenis.on("scroll", ScrollTrigger.update)
    const onTick = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(onTick)
    gsap.ticker.lagSmoothing(0)

    // Parallax por atributo: data-parallax="-14" mueve el elemento
    // -14% en Y a lo largo de su recorrido por el viewport.
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>("[data-parallax]").forEach((el) => {
        const speed = parseFloat(el.dataset.parallax || "0")
        gsap.to(el, {
          yPercent: speed,
          ease: "none",
          scrollTrigger: {
            trigger: el,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        })
      })

      // Revelado cinemático "scrubbed": el bloque entra escalando y
      // fundiéndose a medida que cruza el viewport (data-scrub-in).
      gsap.utils.toArray<HTMLElement>("[data-scrub-in]").forEach((el) => {
        gsap.fromTo(
          el,
          { scale: 0.945, yPercent: 6, autoAlpha: 0.35 },
          {
            scale: 1,
            yPercent: 0,
            autoAlpha: 1,
            ease: "none",
            scrollTrigger: {
              trigger: el,
              start: "top 92%",
              end: "top 48%",
              scrub: true,
            },
          }
        )
      })
    })

    document.fonts?.ready.then(() => ScrollTrigger.refresh())

    return () => {
      ctx.revert()
      gsap.ticker.remove(onTick)
      lenis.destroy()
      window.__lenis = undefined
    }
  }, [])
}

/** Desplazamiento suave a un ancla, usando Lenis si está activo. */
export function scrollToId(id: string) {
  const el = document.querySelector(id) as HTMLElement | null
  if (!el) return
  if (window.__lenis) window.__lenis.scrollTo(el, { offset: -8 })
  else el.scrollIntoView({ behavior: "smooth" })
}

export { gsap, ScrollTrigger }
