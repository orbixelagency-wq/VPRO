import { Reveal, CornerFrame } from "@/components/telemetry"
import { SectionHeading } from "@/components/SectionHeading"
import { Button } from "@/components/ui/button"
import { ArrowUpRight, Instagram, Facebook, Clock, Star } from "lucide-react"

const PLATAFORMAS = [
  {
    nombre: "Yeasy",
    etiqueta: "Plataforma oficial",
    desc: "Consulta la disponibilidad del equipo en tiempo real y reserva en cualquiera de los tres locales.",
    url: "https://www.yeasy.es/",
    destacado: true,
  },
  {
    nombre: "Fresha — Maó",
    etiqueta: "Local de Mahón",
    desc: "Agenda tu cita en el local de la Avenida de Fort de l'Eau a través de Fresha.",
    url: "https://www.fresha.com/",
  },
  {
    nombre: "Fresha — Villacarlos",
    etiqueta: "Local de Es Castell",
    desc: "Agenda tu cita en el local de la Carretera de Sant Felip a través de Fresha.",
    url: "https://www.fresha.com/",
  },
]

export function Reservas() {
  return (
    <section id="reservas" className="relative border-t border-line py-24 sm:py-32">
      <div className="container">
        <SectionHeading
          channel="Reservas"
          index="04"
          title="Pide tu"
          highlight="cita"
          description="Gestionamos las citas online. Reserva por la plataforma oficial Yeasy o, si lo prefieres, a través de Fresha en Mahón y Villacarlos."
        />

        <div className="mt-14 grid gap-px border border-line bg-line lg:grid-cols-3">
          {PLATAFORMAS.map((p, i) => (
            <Reveal key={p.nombre} delay={i * 100} className="bg-carbon">
              <a
                href={p.url}
                target="_blank"
                rel="noreferrer"
                className="group relative flex h-full flex-col p-8 transition-colors duration-300 hover:bg-graphite-2"
              >
                {p.destacado && (
                  <div className="absolute inset-4 text-ember/25">
                    <CornerFrame />
                  </div>
                )}
                <div className="relative flex items-center justify-between">
                  <span className="font-sans text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-steel">
                    {p.etiqueta}
                  </span>
                  {p.destacado && <Star className="h-4 w-4 fill-ember text-ember" />}
                </div>
                <h3 className="relative mt-5 font-display text-2xl uppercase tracking-[0.02em] text-chalk">
                  {p.nombre}
                </h3>
                <p className="relative mt-3 flex-1 text-sm leading-relaxed text-ash">
                  {p.desc}
                </p>
                <span className="relative mt-7 inline-flex items-center gap-2 font-sans text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-ember transition-colors group-hover:text-gold">
                  Reservar <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </span>
              </a>
            </Reveal>
          ))}
        </div>

        {/* Tira inferior: horario + social */}
        <Reveal delay={120}>
          <div className="mt-px flex flex-col items-start justify-between gap-6 border-x border-b border-line bg-graphite/40 p-8 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center border border-line text-ember">
                <Clock className="h-5 w-5" />
              </span>
              <div>
                <p className="font-sans text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-steel">
                  ¿Sin cita?
                </p>
                <p className="text-sm text-chalk">
                  Pásate por cualquiera de nuestros locales y te atendemos según disponibilidad.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="mr-1 font-sans text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-steel">
                Síguenos
              </span>
              <a
                href="https://www.instagram.com/"
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
                className="grid h-10 w-10 place-items-center border border-line text-ash transition-colors hover:border-ember hover:text-ember"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a
                href="https://www.facebook.com/"
                target="_blank"
                rel="noreferrer"
                aria-label="Facebook"
                className="grid h-10 w-10 place-items-center border border-line text-ash transition-colors hover:border-ember hover:text-ember"
              >
                <Facebook className="h-4 w-4" />
              </a>
            </div>
          </div>
        </Reveal>

        {/* CTA final grande */}
        <Reveal delay={160}>
          <div className="mt-16 flex flex-col items-center gap-6 text-center">
            <h3 className="max-w-2xl font-display text-[clamp(1.8rem,5vw,3.2rem)] uppercase leading-[0.95] text-chalk">
              Tu próxima visita
              <span className="text-brass"> empieza aquí</span>
            </h3>
            <a href="https://www.yeasy.es/" target="_blank" rel="noreferrer">
              <Button size="lg">Reservar en Yeasy</Button>
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
