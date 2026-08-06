import { Reveal } from "@/components/Reveal"
import { SectionHeading } from "@/components/SectionHeading"
import { Dumbbell, Crosshair, Brain, TrendingUp } from "lucide-react"

const OFFERS = [
  {
    icon: Crosshair,
    title: "Mejora tecnica individual",
    text: "Control, conduccion, golpeo y finalizacion trabajados uno a uno segun tu posicion y tus carencias reales.",
  },
  {
    icon: Dumbbell,
    title: "Preparacion fisica especializada",
    text: "Fuerza, velocidad y prevencion de lesiones con base cientifica (VBT) enfocadas al tren inferior del futbolista.",
  },
  {
    icon: Brain,
    title: "Confianza y presion",
    text: "Gestion emocional y toma de decisiones para rendir cuando el partido aprieta y el marcador pesa.",
  },
  {
    icon: TrendingUp,
    title: "Garantia de mejora",
    text: "Seguimiento medible sesion a sesion. Si trabajas, mejoras: registramos cada progreso con datos.",
  },
]

export function Offerings() {
  return (
    <section id="ofrecemos" className="relative py-24 sm:py-32">
      <div className="container relative">
        <SectionHeading
          eyebrow="Que ofrecemos"
          title="Rendimiento sin"
          highlight="atajos"
          description="Un programa completo que cubre lo que el entrenamiento de equipo no puede llegar a personalizar."
        />

        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {OFFERS.map((o, i) => (
            <Reveal key={o.title} delay={i * 90}>
              <article className="group flex h-full flex-col rounded-[6px] border border-white/8 bg-ink-card p-6 transition-colors duration-300 hover:border-flame/40">
                <span className="mb-5 grid h-12 w-12 place-items-center rounded-[5px] border border-flame/30 text-flame">
                  <o.icon className="h-6 w-6" />
                </span>
                <h3 className="text-lg font-bold text-white">{o.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{o.text}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
