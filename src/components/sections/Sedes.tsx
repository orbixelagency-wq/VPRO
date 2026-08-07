import { Reveal } from "@/components/telemetry"
import { CornerFrame } from "@/components/telemetry"
import { SectionHeading } from "@/components/SectionHeading"
import { BrandImage } from "@/components/BrandImage"

const SEDES = [
  {
    ciudad: "Girona",
    coord: "41.9794° N · 2.8214° E",
    enfoque: "Técnica individualizada · Biomecánica",
    desc: "Perfeccionamiento técnico jugador a jugador y análisis biomecánico del gesto deportivo.",
    tags: ["Técnica individual", "Biomecánica", "Corrección del gesto"],
    img: "/brand/sede-girona.jpg",
  },
  {
    ciudad: "Olot",
    coord: "42.1817° N · 2.4899° E",
    enfoque: "Rendimiento físico · Resistencia táctica",
    desc: "Desarrollo físico integral del futbolista y resistencia táctica bajo carga de competición.",
    tags: ["Preparación física", "Resistencia táctica", "Fuerza y velocidad"],
    img: "/brand/sede-olot.jpg",
  },
]

export function Sedes() {
  return (
    <section id="sedes" className="relative border-t border-line bg-graphite/30 py-24 sm:py-32">
      <div className="container">
        <SectionHeading
          channel="Sedes"
          index="EST · 02"
          title="Dos centros,"
          highlight="un estándar"
          description="Tecnificación de alto rendimiento en dos sedes oficiales de Cataluña, cada una con un enfoque especializado."
        />

        <div className="mt-14 grid gap-px border border-line bg-line lg:grid-cols-2">
          {SEDES.map((s, i) => (
            <Reveal key={s.ciudad} delay={i * 120}>
              <article className="group h-full bg-carbon">
                <div className="relative aspect-[16/10] overflow-hidden">
                  <BrandImage
                    src={s.img}
                    alt={`Sede de ${s.ciudad}`}
                    label={`Sede ${s.ciudad}`}
                    imgClassName="transition-transform duration-700 group-hover:scale-[1.03]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-carbon via-transparent to-transparent" />
                  <div className="absolute inset-4 text-white/25">
                    <CornerFrame />
                  </div>
                  <div className="absolute left-5 top-5 flex flex-col gap-1">
                    <span className="font-display text-3xl font-extrabold uppercase leading-none text-chalk">
                      {s.ciudad}
                    </span>
                    <span className="datum text-[0.6rem] tracking-[0.12em] text-ember">
                      {s.coord}
                    </span>
                  </div>
                </div>

                <div className="p-7">
                  <h3 className="font-display text-lg font-bold uppercase tracking-tight text-chalk">
                    {s.enfoque}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-ash">{s.desc}</p>
                  <ul className="mt-5 flex flex-wrap gap-2">
                    {s.tags.map((t) => (
                      <li
                        key={t}
                        className="border border-line px-3 py-1.5 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-steel"
                      >
                        {t}
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
