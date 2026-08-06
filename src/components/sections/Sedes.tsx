import { Reveal } from "@/components/Reveal"
import { SectionHeading } from "@/components/SectionHeading"
import { BrandImage } from "@/components/BrandImage"
import { MapPin } from "lucide-react"

interface Sede {
  ciudad: string
  enfoque: string
  descripcion: string
  puntos: string[]
  img: string
}

const SEDES: Sede[] = [
  {
    ciudad: "Girona",
    enfoque: "Tecnica individualizada y biomecanica",
    descripcion:
      "Sede orientada al perfeccionamiento tecnico jugador a jugador y al analisis biomecanico del gesto deportivo.",
    puntos: ["Analisis biomecanico", "Tecnica individual", "Correccion del gesto"],
    img: "/brand/sede-girona.jpg",
  },
  {
    ciudad: "Olot",
    enfoque: "Rendimiento fisico integral y resistencia tactica",
    descripcion:
      "Sede centrada en el desarrollo fisico completo del futbolista y en la resistencia tactica bajo carga de competicion.",
    puntos: ["Preparacion fisica", "Resistencia tactica", "Fuerza y velocidad"],
    img: "/brand/sede-olot.jpg",
  },
]

export function Sedes() {
  return (
    <section id="sedes" className="relative border-t border-white/5 bg-ink-soft py-24 sm:py-32">
      <div className="container">
        <SectionHeading
          eyebrow="Sedes oficiales"
          title="Dos centros, un"
          highlight="estandar"
          description="Tecnificacion de alto rendimiento en dos sedes oficiales de Cataluna, cada una con un enfoque especializado."
        />

        <div className="mt-16 grid gap-6 lg:grid-cols-2">
          {SEDES.map((s, i) => (
            <Reveal key={s.ciudad} delay={i * 120}>
              <article className="group overflow-hidden rounded-[6px] border border-white/8 bg-ink-card">
                <div className="relative aspect-[16/10] overflow-hidden">
                  <BrandImage
                    src={s.img}
                    alt={`Sede de ${s.ciudad}`}
                    label={`Sede ${s.ciudad}`}
                    imgClassName="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink-card via-transparent to-transparent" />
                  <div className="absolute left-5 top-5 flex items-center gap-2 border border-flame/40 bg-ink/70 px-3 py-1.5 backdrop-blur">
                    <MapPin className="h-3.5 w-3.5 text-flame" />
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white">
                      {s.ciudad}
                    </span>
                  </div>
                </div>

                <div className="p-7">
                  <h3 className="font-display text-xl font-bold uppercase tracking-tight text-white">
                    {s.enfoque}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {s.descripcion}
                  </p>
                  <ul className="mt-5 flex flex-wrap gap-2">
                    {s.puntos.map((p) => (
                      <li
                        key={p}
                        className="border border-white/10 bg-ink px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-white/70"
                      >
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
