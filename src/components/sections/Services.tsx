import { SERVICE_GROUPS } from "@/lib/content"
import { Scissors } from "@/components/Brand"
import { useReveal } from "@/lib/useReveal"

const scrollTo = (id: string) =>
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })

export function Services() {
  const head = useReveal<HTMLDivElement>()
  return (
    <section id="servicios" className="relative bg-ink">
      <div className="mx-auto max-w-[1280px] px-6 py-24 md:py-32">
        <div
          ref={head}
          className="reveal flex flex-col gap-6 md:flex-row md:items-end md:justify-between"
        >
          <div>
            <p className="eyebrow mb-6">La carta</p>
            <h2 className="text-[clamp(2.1rem,5vw,3.6rem)] text-bone">
              Nuestros servicios
            </h2>
          </div>
          <p className="max-w-sm font-sans text-bone-dim">
            De la máquina a la navaja. Cada servicio, con su técnica y su tiempo.
            Pregunta por nuestros{" "}
            <span className="text-bone">packs semanales y quincenales</span> de
            barba y cabello.
          </p>
        </div>

        {/* Tres "tickets" de flash */}
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {SERVICE_GROUPS.map((g, i) => (
            <Ticket key={g.key} group={g} delay={i * 90} />
          ))}
        </div>

        <div className="mt-12 flex flex-col items-start gap-4 border-t border-line pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-cond text-sm uppercase tracking-[0.12em] text-bone-dim">
            Tarifas y packs disponibles en tienda — te asesoramos sin
            compromiso.
          </p>
          <button className="btn btn-neon" onClick={() => scrollTo("contacto")}>
            Pedir cita
          </button>
        </div>
      </div>
    </section>
  )
}

function Ticket({
  group,
  delay,
}: {
  group: (typeof SERVICE_GROUPS)[number]
  delay: number
}) {
  const ref = useReveal<HTMLDivElement>(delay)
  return (
    <div
      ref={ref}
      className="reveal group relative overflow-hidden rounded-sm border border-line bg-ink-2 transition-colors duration-300 hover:border-neon/50"
    >
      {/* cabecera del ticket */}
      <div className="flex items-center justify-between border-b border-dashed border-line px-6 py-5">
        <div>
          <h3 className="font-slab text-xl text-bone">{group.title}</h3>
          <p className="mt-1 font-cond text-[0.78rem] uppercase tracking-[0.12em] text-bone-dim">
            {group.caption}
          </p>
        </div>
        <Scissors className="w-6 text-neon transition-transform duration-300 group-hover:rotate-[18deg]" />
      </div>

      <ul className="divide-y divide-line">
        {group.items.map((s) => (
          <li
            key={s.name}
            className="flex items-baseline justify-between gap-3 px-6 py-3.5"
          >
            <span className="font-sans font-600 text-bone">{s.name}</span>
            <span className="mx-2 h-px flex-1 translate-y-[-2px] bg-line" />
            <span className="text-right font-script text-lg leading-none text-neon">
              {s.alias ?? ""}
              {s.note ? (
                <span className="ml-2 font-cond text-[0.7rem] uppercase tracking-wide text-bone-dim">
                  {s.note}
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
