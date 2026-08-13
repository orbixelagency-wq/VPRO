import { useEffect, useRef } from "react"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

interface ScrollSceneProps {
  /** Palabra gigante de la transición (ej. "OFICIO"). */
  word: string
  /** Etiqueta superior pequeña. */
  eyebrow?: string
  /** Subtítulo opcional bajo la palabra. */
  subtitle?: string
  /** Renderiza la palabra en contorno (outline) en lugar de sólida. */
  outline?: boolean
  /** id de ancla opcional. */
  id?: string
}

/**
 * Escena de transición "vídeo-scrolling" entre secciones.
 *
 * Fija la escena a pantalla completa y, con el scroll, hace scrub de un
 * barrido horizontal de la palabra gigante (entra, se asienta y sale) más una
 * línea que se dibuja. Da continuidad cinematográfica en blanco y negro entre
 * cada bloque de la web. Se degrada a un bloque estático con "movimiento
 * reducido".
 */
export function ScrollScene({
  word,
  eyebrow,
  subtitle,
  outline = false,
  id,
}: ScrollSceneProps) {
  const rootRef = useRef<HTMLElement>(null)
  const wordRef = useRef<HTMLHeadingElement>(null)
  const lineRef = useRef<HTMLSpanElement>(null)
  const subRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduce || !rootRef.current) return

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: rootRef.current,
          start: "top top",
          end: "+=150%",
          pin: true,
          scrub: 1,
        },
      })

      tl.fromTo(
        wordRef.current,
        { xPercent: -10, opacity: 0, filter: "blur(6px)" },
        { xPercent: 0, opacity: 1, filter: "blur(0px)", duration: 0.4, ease: "power2.out" }
      )
        .to(wordRef.current, { xPercent: 0, duration: 0.2 })
        .to(wordRef.current, {
          xPercent: 12,
          opacity: 0,
          filter: "blur(6px)",
          duration: 0.4,
          ease: "power2.in",
        })

      if (lineRef.current) {
        tl.fromTo(
          lineRef.current,
          { scaleX: 0, opacity: 0.2 },
          { scaleX: 1, opacity: 0.6, duration: 1, ease: "none" },
          0
        )
      }
      if (subRef.current) {
        tl.fromTo(
          subRef.current,
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.35 },
          0.15
        ).to(subRef.current, { opacity: 0, duration: 0.3 }, 0.7)
      }
    }, rootRef)

    return () => ctx.revert()
  }, [])

  return (
    <section ref={rootRef} id={id} className="ss-root" aria-label={word}>
      <div className="ss-inner">
        <span ref={lineRef} className="ss-line" />
        <div>
          {eyebrow && <span className="ss-eyebrow">{eyebrow}</span>}
          <h2 ref={wordRef} className={outline ? "ss-word ss-outline" : "ss-word"}>
            {word}
          </h2>
          {subtitle && (
            <p ref={subRef} className="ss-sub">
              {subtitle}
            </p>
          )}
        </div>
        <div className="ss-vignette" />
      </div>
    </section>
  )
}
