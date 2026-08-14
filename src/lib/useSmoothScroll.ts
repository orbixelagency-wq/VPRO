import { useEffect } from "react"
import Lenis from "lenis"

/**
 * Scroll suave con inercia (estilo Porsche / Luminous) mediante Lenis.
 * Respeta prefers-reduced-motion. Mantiene el scroll nativo (position: sticky
 * y los cálculos por scroll siguen funcionando), solo suaviza la rueda/táctil.
 */
export function useSmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.6,
    })

    let raf = 0
    const loop = (time: number) => {
      lenis.raf(time)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    // Enlaces internos (#) via Lenis para un desplazamiento suave y coherente.
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement)?.closest?.(
        'a[href^="#"]'
      ) as HTMLAnchorElement | null
      if (!a) return
      const id = a.getAttribute("href")
      if (id && id.length > 1 && document.querySelector(id)) {
        e.preventDefault()
        lenis.scrollTo(id, { offset: -64 })
      }
    }
    document.addEventListener("click", onClick)

    return () => {
      document.removeEventListener("click", onClick)
      cancelAnimationFrame(raf)
      lenis.destroy()
    }
  }, [])
}
