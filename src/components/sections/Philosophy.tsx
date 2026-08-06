import { Reveal } from "@/components/Reveal"
import { SectionHeading } from "@/components/SectionHeading"
import { HandHeart, Target, Timer, ShieldCheck, HeartHandshake, Award } from "lucide-react"

const VALUES = [
  { icon: HandHeart, label: "Humildad" },
  { icon: Timer, label: "Constancia" },
  { icon: Target, label: "Eficiencia" },
  { icon: ShieldCheck, label: "Responsabilidad" },
  { icon: HeartHandshake, label: "Compromiso" },
  { icon: Award, label: "Seriedad" },
]

export function Philosophy() {
  return (
    <section id="filosofia" className="relative py-24 sm:py-32">
      <div className="container">
        <SectionHeading
          eyebrow="Filosofia y valores"
          title="Lo que nos"
          highlight="mueve"
          description="Trabajamos con futbolistas que quieren dar un paso mas. Nuestra forma de entender el rendimiento se apoya en seis valores innegociables."
        />

        <div className="mx-auto mt-14 grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-3">
          {VALUES.map((v, i) => (
            <Reveal key={v.label} delay={i * 70}>
              <div className="group flex flex-col items-center gap-3 rounded-[6px] border border-white/8 bg-ink-card p-6 text-center transition-colors duration-300 hover:border-flame/40">
                <span className="grid h-12 w-12 place-items-center rounded-[5px] border border-white/10 text-flame">
                  <v.icon className="h-6 w-6" />
                </span>
                <span className="text-sm font-semibold uppercase tracking-wide text-white/90">
                  {v.label}
                </span>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={120}>
          <blockquote className="mx-auto mt-16 max-w-3xl text-center">
            <p className="font-display text-2xl font-bold leading-snug text-white sm:text-3xl">
              "Cada detalle suma
              <span className="text-gradient"> y no dejamos ninguno sin trabajar</span>"
            </p>
          </blockquote>
        </Reveal>
      </div>
    </section>
  )
}
