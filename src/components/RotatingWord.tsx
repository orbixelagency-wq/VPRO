import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

const reduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches

/**
 * Palabra que rota con un muelle vertical (adaptación del efecto de hero
 * animado). El contenedor ajusta su ancho a la palabra activa para que la
 * frase se mantenga compacta. Respeta prefers-reduced-motion.
 */
export function RotatingWord({
  words,
  interval = 2200,
  className,
}: {
  words: string[]
  interval?: number
  className?: string
}) {
  const [index, setIndex] = useState(0)
  const measRefs = useRef<(HTMLSpanElement | null)[]>([])
  const [widths, setWidths] = useState<number[]>([])
  const isReduced = reduced()

  useLayoutEffect(() => {
    setWidths(measRefs.current.map((el) => (el ? el.getBoundingClientRect().width : 0)))
  }, [])

  useEffect(() => {
    const remeasure = () =>
      setWidths(measRefs.current.map((el) => (el ? el.getBoundingClientRect().width : 0)))
    document.fonts?.ready.then(remeasure)
    window.addEventListener("resize", remeasure)
    return () => window.removeEventListener("resize", remeasure)
  }, [])

  useEffect(() => {
    if (isReduced) return
    const t = setTimeout(
      () => setIndex((v) => (v === words.length - 1 ? 0 : v + 1)),
      interval
    )
    return () => clearTimeout(t)
  }, [index, words, interval, isReduced])

  if (isReduced) {
    return <span className={cn("font-semibold text-orbit", className)}>{words[0]}</span>
  }

  const w = widths[index]

  return (
    <motion.span
      className={cn(
        "relative inline-flex overflow-hidden align-bottom",
        className
      )}
      style={{ height: "1.18em" }}
      animate={{ width: w || "auto" }}
      transition={{ type: "spring", stiffness: 140, damping: 20 }}
      aria-hidden
    >
      {/* Capa de medición (oculta, fuera de flujo) */}
      <span className="invisible absolute left-0 top-0 flex flex-col">
        {words.map((word, i) => (
          <span
            key={word}
            ref={(el) => {
              measRefs.current[i] = el
            }}
            className="whitespace-nowrap font-semibold"
          >
            {word}
          </span>
        ))}
      </span>

      {words.map((word, i) => (
        <motion.span
          key={word}
          className="absolute inset-0 flex items-center justify-center whitespace-nowrap font-semibold text-orbit"
          initial={false}
          animate={
            index === i
              ? { y: "0%", opacity: 1 }
              : { y: index > i ? "-140%" : "140%", opacity: 0 }
          }
          transition={{ type: "spring", stiffness: 50 }}
        >
          {word}
        </motion.span>
      ))}
    </motion.span>
  )
}
