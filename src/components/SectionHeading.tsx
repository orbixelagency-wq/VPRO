import { Reveal } from "@/components/Reveal"
import { cn } from "@/lib/utils"

interface Props {
  eyebrow: string
  title: string
  highlight?: string
  description?: string
  className?: string
}

export function SectionHeading({ eyebrow, title, highlight, description, className }: Props) {
  return (
    <div className={cn("mx-auto max-w-2xl text-center", className)}>
      <Reveal>
        <span className="inline-flex items-center gap-2.5 text-xs font-semibold uppercase tracking-[0.28em] text-flame">
          <span className="h-px w-6 bg-flame/60" />
          {eyebrow}
        </span>
      </Reveal>
      <Reveal delay={80}>
        <h2 className="mt-5 font-display text-4xl font-extrabold uppercase leading-tight tracking-tight text-white sm:text-5xl">
          {title} {highlight && <span className="text-gradient">{highlight}</span>}
        </h2>
      </Reveal>
      {description && (
        <Reveal delay={160}>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">{description}</p>
        </Reveal>
      )}
    </div>
  )
}
