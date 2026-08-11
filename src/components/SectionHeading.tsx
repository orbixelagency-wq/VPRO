import { Reveal, Rule } from "@/components/telemetry"
import { cn } from "@/lib/utils"

interface Props {
  channel: string
  index?: string
  title: string
  highlight?: string
  description?: string
  className?: string
}

/** Cabecera de seccion: regla + etiqueta de canal (mono) + titulo Saira. */
export function SectionHeading({
  channel,
  index,
  title,
  highlight,
  description,
  className,
}: Props) {
  return (
    <div className={cn("max-w-3xl", className)}>
      <Reveal>
        <div className="flex items-center justify-between">
          <span className="channel">{channel}</span>
          {index && <span className="font-mono text-[0.7rem] text-steel">{index}</span>}
        </div>
        <Rule className="mt-4" />
      </Reveal>
      <Reveal delay={80} y={22} blur>
        <h2 className="mt-6 font-display text-[clamp(2.2rem,5.5vw,4.25rem)] font-extrabold uppercase leading-[0.92] tracking-[-0.01em] text-chalk">
          {title}
          {highlight && <span className="text-ember"> {highlight}</span>}
        </h2>
      </Reveal>
      {description && (
        <Reveal delay={150}>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-ash">{description}</p>
        </Reveal>
      )}
    </div>
  )
}
