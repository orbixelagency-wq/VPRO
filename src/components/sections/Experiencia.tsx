import { Reveal, CountUp, CornerFrame } from "@/components/telemetry"
import { SectionHeading } from "@/components/SectionHeading"
import { BrandImage } from "@/components/BrandImage"
import { Coffee, Wind, Clock } from "lucide-react"

const PASOS = [
  {
    icon: Coffee,
    titulo: "Te recibimos",
    desc: "Llegas, eliges tu bebida de cortesía y te acomodas. Sin prisas, sin sala de espera fría.",
  },
  {
    icon: Wind,
    titulo: "El ritual",
    desc: "Corte y barba trabajados con detalle. Toalla caliente y vapor de ozono para la piel.",
  },
  {
    icon: Clock,
    titulo: "Sales renovado",
    desc: "Peinado final, consejo de mantenimiento y tu próxima cita reservada si quieres.",
  },
]

export function Experiencia() {
  return (
    <section id="experiencia" className="relative border-t border-line py-24 sm:py-32">
      <div className="container">
        <SectionHeading
          channel="Experiencia"
          index="02"
          title="El ambiente"
          highlight="Oblivion"
          description="No vendemos solo un corte: cuidamos el rato. Ambiente actual, atención cercana y pequeños detalles que marcan la diferencia."
        />

        <div className="mt-14 grid gap-px border border-line bg-line lg:grid-cols-[1.15fr_0.85fr]">
          {/* Pasos */}
          <div className="grid gap-px bg-line sm:grid-cols-3 lg:grid-cols-1">
            {PASOS.map((p, i) => (
              <Reveal key={p.titulo} delay={i * 90} className="bg-carbon">
                <div className="flex h-full items-start gap-5 p-8">
                  <span className="datum font-display text-2xl text-ember/50">
                    0{i + 1}
                  </span>
                  <div>
                    <div className="flex items-center gap-3">
                      <p.icon className="h-4 w-4 text-ember" />
                      <h3 className="font-display text-lg uppercase tracking-[0.02em] text-chalk">
                        {p.titulo}
                      </h3>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-ash">{p.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          {/* Imagen atmósfera */}
          <Reveal delay={120} className="bg-carbon">
            <div className="relative h-full min-h-[280px]">
              <BrandImage
                src="/brand/ambiente.jpg"
                alt="Ambiente del local Oblivion"
                label="Ambiente · Oblivion"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-carbon/80 via-transparent to-transparent" />
              <div className="absolute inset-4 text-white/20">
                <CornerFrame />
              </div>
              <p className="absolute bottom-6 left-6 max-w-[220px] font-serif text-lg italic leading-snug text-chalk">
                Un espacio para desconectar mientras te cuidas.
              </p>
            </div>
          </Reveal>
        </div>

        {/* Cifras */}
        <div className="mt-px grid gap-px border-x border-b border-line bg-line sm:grid-cols-3">
          {[
            { to: 3, suffix: "", label: "Locales en Menorca" },
            { to: 100, suffix: "%", label: "Cita previa online" },
            { to: 6, suffix: "", label: "Servicios de barbería y estética" },
          ].map((c, i) => (
            <Reveal key={c.label} delay={i * 90} className="bg-carbon">
              <div className="p-8">
                <p className="font-display text-5xl text-brass">
                  <CountUp to={c.to} suffix={c.suffix} />
                </p>
                <p className="mt-2 text-sm text-ash">{c.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
