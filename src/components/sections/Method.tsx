import { Reveal } from "@/components/telemetry"
import { SectionHeading } from "@/components/SectionHeading"

const STEPS = [
  {
    n: "01",
    title: "Análisis inicial",
    desc: "Evaluamos estado técnico, condición física, historial de lesiones y objetivos del jugador.",
  },
  {
    n: "02",
    title: "Programa a medida",
    desc: "Diseñamos rutinas y progresiones personalizadas, adaptadas a tu calendario de competición.",
  },
  {
    n: "03",
    title: "Campo y seguimiento",
    desc: "Entrenamiento en campo/pista y acompañamiento continuo, ajustando la carga sesión a sesión.",
  },
]

export function Method() {
  return (
    <section id="metodo" className="relative border-t border-line py-24 sm:py-32">
      <div className="container">
        <SectionHeading
          channel="Método"
          index="SEQ · 03"
          title="Tres fases,"
          highlight="un proceso"
          description="Un sistema probado durante más de diez años con jugadores de Girona y Olot."
        />

        <div className="mt-16 grid gap-px border border-line bg-line md:grid-cols-3">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 120}>
              <div className="group flex h-full flex-col bg-carbon p-8 transition-colors hover:bg-graphite">
                <div className="flex items-center justify-between">
                  <span className="font-display text-6xl font-extrabold leading-none text-graphite-2 transition-colors group-hover:text-ember">
                    {s.n}
                  </span>
                  <span className="datum text-[0.6rem] uppercase tracking-[0.16em] text-steel">
                    Fase {s.n}
                  </span>
                </div>
                <h3 className="mt-8 font-display text-2xl font-bold uppercase tracking-tight text-chalk">
                  {s.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-ash">{s.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
