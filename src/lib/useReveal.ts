import { useEffect, useRef } from "react"

/**
 * Añade la clase `in` cuando el elemento entra en el viewport, para
 * disparar la animación `.reveal`. Se auto-desconecta tras revelarse.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(
  delay = 0
) {
  const ref = useRef<T>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            el.style.animationDelay = `${delay}ms`
            el.classList.add("in")
            io.unobserve(el)
          }
        })
      },
      { threshold: 0.14, rootMargin: "0px 0px -8% 0px" }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [delay])
  return ref
}
