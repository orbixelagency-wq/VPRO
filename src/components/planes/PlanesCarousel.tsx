import { useEffect, useRef, useState, type ReactNode } from "react"
import {
  motion,
  useMotionValue,
  useTransform,
  animate,
  type PanInfo,
  type MotionValue,
} from "framer-motion"
import { PlanCard } from "./PlanCard"
import { type Billing, type Plan } from "@/lib/plans"
import { ChevronLeft, ChevronRight } from "lucide-react"

const GAP = 24
const SPRING = { type: "spring" as const, stiffness: 260, damping: 34 }

/**
 * Carrusel de planes con transición lateral: arrastra, usa las flechas o los
 * puntos para pasar de un plan a otro. La tarjeta central se muestra a tamaño
 * completo y las vecinas se ven parcialmente, atenuadas y a menor escala.
 */
export function PlanesCarousel({
  plans,
  billing,
  onChoose,
}: {
  plans: Plan[]
  billing: Billing
  onChoose: (p: Plan) => void
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const cardRef = useRef<HTMLDivElement | null>(null)
  const [layout, setLayout] = useState({ containerW: 0, cardW: 0 })
  const featuredIndex = Math.max(0, plans.findIndex((p) => p.featured))
  const [index, setIndex] = useState(featuredIndex)
  const x = useMotionValue(0)

  const step = layout.cardW + GAP
  const centerOffset = layout.containerW > 0 ? (layout.containerW - layout.cardW) / 2 : 0
  const targetX = (i: number) => centerOffset - i * step

  useEffect(() => {
    const measure = () => {
      const cw = containerRef.current?.getBoundingClientRect().width || 0
      const kw = cardRef.current?.getBoundingClientRect().width || 0
      setLayout((prev) =>
        prev.containerW === cw && prev.cardW === kw ? prev : { containerW: cw, cardW: kw }
      )
    }
    measure()
    const ro = new ResizeObserver(measure)
    if (containerRef.current) ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (layout.containerW === 0) return
    const controls = animate(x, targetX(index), SPRING)
    return controls.stop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, layout.containerW, layout.cardW])

  const goTo = (i: number) => setIndex(Math.max(0, Math.min(plans.length - 1, i)))

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (step <= 0) return
    const projected = x.get() + info.velocity.x * 0.08
    const i = Math.max(
      0,
      Math.min(plans.length - 1, Math.round((centerOffset - projected) / step))
    )
    setIndex(i)
    animate(x, targetX(i), SPRING)
  }

  return (
    <div>
      <div ref={containerRef} className="relative overflow-hidden px-1 py-8">
        <motion.div
          className="flex cursor-grab active:cursor-grabbing"
          style={{ x, gap: GAP }}
          drag="x"
          dragConstraints={{ left: targetX(plans.length - 1), right: targetX(0) }}
          dragElastic={0.12}
          onDragEnd={onDragEnd}
        >
          {plans.map((plan, i) => (
            <CarouselItem
              key={plan.id}
              x={x}
              i={i}
              step={step}
              centerOffset={centerOffset}
              innerRef={i === 0 ? cardRef : undefined}
            >
              <PlanCard plan={plan} billing={billing} onChoose={onChoose} flat />
            </CarouselItem>
          ))}
        </motion.div>
      </div>

      {/* Controles */}
      <div className="mt-8 flex items-center justify-center gap-5">
        <ArrowButton
          dir="prev"
          onClick={() => goTo(index - 1)}
          disabled={index === 0}
        />
        <div className="flex items-center gap-2">
          {plans.map((p, i) => (
            <button
              key={p.id}
              onClick={() => goTo(i)}
              aria-label={`Ver plan ${p.name}`}
              aria-current={index === i}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === i ? "w-6 bg-orbit" : "w-2 bg-line hover:bg-mute/50"
              }`}
            />
          ))}
        </div>
        <ArrowButton
          dir="next"
          onClick={() => goTo(index + 1)}
          disabled={index === plans.length - 1}
        />
      </div>
    </div>
  )
}

function CarouselItem({
  x,
  i,
  step,
  centerOffset,
  innerRef,
  children,
}: {
  x: MotionValue<number>
  i: number
  step: number
  centerOffset: number
  innerRef?: React.Ref<HTMLDivElement>
  children: ReactNode
}) {
  const distance = useTransform(x, (v) =>
    step > 0 ? Math.abs((centerOffset - v) / step - i) : 0
  )
  const scale = useTransform(distance, (d) => 1 - Math.min(d, 1) * 0.08)
  const opacity = useTransform(distance, (d) => 1 - Math.min(d, 1.3) * 0.45)
  const zIndex = useTransform(distance, (d) => Math.round(100 - d * 10))

  return (
    <motion.div
      ref={innerRef}
      style={{ scale, opacity, zIndex }}
      className="w-[290px] shrink-0 sm:w-[340px] lg:w-[364px]"
    >
      {children}
    </motion.div>
  )
}

function ArrowButton({
  dir,
  onClick,
  disabled,
}: {
  dir: "prev" | "next"
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === "prev" ? "Plan anterior" : "Plan siguiente"}
      className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface text-ink shadow-soft transition-all duration-200 hover:border-ink/30 hover:shadow-float disabled:cursor-not-allowed disabled:opacity-35 disabled:shadow-none"
    >
      {dir === "prev" ? (
        <ChevronLeft className="h-5 w-5" />
      ) : (
        <ChevronRight className="h-5 w-5" />
      )}
    </button>
  )
}
