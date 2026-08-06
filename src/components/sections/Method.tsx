import { Reveal } from "@/components/Reveal"
import { SectionHeading } from "@/components/SectionHeading"
import { ClipboardList, PencilRuler, Activity } from "lucide-react"

const STEPS = [
  {
    n: "01",
    icon: ClipboardList,
    title: "Analisis inicial",
    text: "Evaluamos el estado del jugador: nivel tecnico, condicion fisica, historial de lesiones y objetivos.",
  },
  {
    n: "02",
    icon: PencilRuler,
    title: "Rutinas personalizadas",
    text: "Creamos un programa a medida con progresiones claras, adaptado a tu calendario de competicion.",
  },
  {
    n: "03",
    icon: Activity,
    title: "Campo y seguimiento",
    text: "Entrenamientos en campo/pista y acompanamiento continuo, ajustando la carga sesion a sesion.",
  },
]

export function Method() {
  return (
    <section id="metodo" className="relative py-24 sm:py-32">
      <div className="container">
        <SectionHeading
          eyebrow="Nuestro metodo de trabajo"
          title="Tres pasos, un"
          highlight="proceso"
          description="Un sistema probado durante mas de 10 anos con jugadores de Girona y Olot."
        />

        <div className="relative mt-16">
          {/* linea conectora */}
          <div className="pointer-events-none absolute left-0 right-0 top-10 hidden h-px bg-gradient-to-r from-transparent via-flame/40 to-transparent md:block" />
          <div className="grid gap-8 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 120}>
                <div className="relative flex flex-col items-center text-center">
                  <div className="relative z-10 grid h-20 w-20 place-items-center rounded-[6px] border border-flame/40 bg-ink-card text-flame">
                    <s.icon className="h-8 w-8" />
                    <span className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-[4px] bg-flame text-xs font-black text-ink">
                      {s.n}
                    </span>
                  </div>
                  <h3 className="mt-6 text-xl font-bold text-white">{s.title}</h3>
                  <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
                    {s.text}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
