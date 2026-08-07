import { Reveal, CornerFrame } from "@/components/telemetry"
import { SectionHeading } from "@/components/SectionHeading"
import { BrandImage } from "@/components/BrandImage"

const PLAYERS = [
  { name: "Krishna Rawal", pos: "Extremo", code: "EXT", img: "/brand/player-krishna.jpg" },
  { name: "Saibo", pos: "Mediocentro", code: "MC", img: "/brand/player-saibo.jpg" },
  { name: "Pol Cufí", pos: "Delantero", code: "DEL", img: "/brand/player-polcufi.jpg" },
  { name: "Isaac Bruno", pos: "Central", code: "DC", img: "/brand/player-isaacbruno.jpg" },
  { name: "Kiran Dopico", pos: "Lateral", code: "LAT", img: "/brand/player-kirandopico.jpg" },
]

export function Talento() {
  return (
    <section id="talento" className="relative border-t border-line py-24 sm:py-32">
      <div className="container">
        <SectionHeading
          channel="Talento"
          index="ROSTER · 05"
          title="Jugadores que han pasado"
          highlight="por V Pro"
          description="Futbolistas que confiaron en el trabajo individual para dar el salto."
        />

        <div className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {PLAYERS.map((p, i) => (
            <Reveal key={p.name} delay={i * 70}>
              <div className="group relative aspect-[3/4] overflow-hidden border border-line">
                <BrandImage
                  src={p.img}
                  alt={p.name}
                  label={p.name}
                  imgClassName="grayscale transition-all duration-500 group-hover:scale-[1.04] group-hover:grayscale-0"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-carbon via-carbon/25 to-transparent" />
                <div className="absolute inset-3 text-ember opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <CornerFrame />
                </div>
                <div className="absolute left-0 top-0 m-3 flex items-center gap-2">
                  <span className="datum text-[0.58rem] text-steel">
                    #{String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <span className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-ember">
                    {p.code} · {p.pos}
                  </span>
                  <p className="mt-1 font-display text-lg font-bold uppercase leading-tight tracking-tight text-chalk">
                    {p.name}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
