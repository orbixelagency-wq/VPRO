import { Reveal } from "@/components/telemetry"
import { SectionHeading } from "@/components/SectionHeading"

const CAPS = [
  {
    code: "TEC",
    title: "Técnica individual",
    desc: "Control, conducción, golpeo y finalización trabajados uno a uno según tu posición y tus carencias reales.",
  },
  {
    code: "FÍS",
    title: "Preparación física",
    desc: "Fuerza, velocidad y prevención de lesiones con base científica (VBT), con foco en el tren inferior del futbolista.",
  },
  {
    code: "MEN",
    title: "Presión y decisión",
    desc: "Gestión emocional y toma de decisiones para rendir cuando el partido aprieta y el marcador pesa.",
  },
  {
    code: "DAT",
    title: "Seguimiento con datos",
    desc: "Medimos cada sesión y registramos el progreso. El plan se ajusta sobre evidencia, no sobre intuición.",
  },
]

export function Programa() {
  return (
    <section id="programa" className="relative border-t border-line py-24 sm:py-32">
      <div className="container">
        <SectionHeading
          channel="Programa"
          index="CAP · 04"
          title="Lo que el equipo"
          highlight="no personaliza"
          description="Un programa completo que cubre lo que el entrenamiento colectivo no llega a individualizar."
        />

        <div className="mt-14 border-t border-line">
          {CAPS.map((c, i) => (
            <Reveal key={c.code} delay={i * 70}>
              <div className="group grid grid-cols-[auto_1fr] items-start gap-6 border-b border-line py-8 transition-colors hover:bg-graphite/40 sm:grid-cols-[7rem_1fr_auto] sm:gap-10">
                <span className="font-mono text-sm font-bold tracking-[0.2em] text-ember">
                  {c.code}
                </span>
                <div>
                  <h3 className="font-display text-2xl font-bold uppercase tracking-tight text-chalk sm:text-3xl">
                    {c.title}
                  </h3>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ash">{c.desc}</p>
                </div>
                <span className="hidden self-center font-mono text-steel transition-colors group-hover:text-ember sm:block">
                  →
                </span>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
