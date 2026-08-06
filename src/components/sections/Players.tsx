import { Reveal } from "@/components/Reveal"
import { SectionHeading } from "@/components/SectionHeading"
import { BrandImage } from "@/components/BrandImage"

interface Player {
  name: string
  role: string
  /** Foto OFICIAL en /public/brand. Placeholder de marca hasta que exista. */
  img: string
}

const PLAYERS: Player[] = [
  { name: "Krishna Rawal", role: "Extremo", img: "/brand/player-krishna.jpg" },
  { name: "Saibo", role: "Mediocentro", img: "/brand/player-saibo.jpg" },
  { name: "Pol Cufi", role: "Delantero", img: "/brand/player-polcufi.jpg" },
  { name: "Isaac Bruno", role: "Central", img: "/brand/player-isaacbruno.jpg" },
  { name: "Kiran Dopico", role: "Lateral", img: "/brand/player-kirandopico.jpg" },
]

export function Players() {
  return (
    <section id="jugadores" className="relative py-24 sm:py-32">
      <div className="container">
        <SectionHeading
          eyebrow="Jugadores destacados"
          title="Talento que ha pasado por"
          highlight="V Pro"
          description="Futbolistas que han confiado en nuestro trabajo para dar el salto."
        />

        <div className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {PLAYERS.map((p, i) => (
            <Reveal key={p.name} delay={i * 80}>
              <div className="group relative aspect-[3/4] overflow-hidden rounded-[6px] border border-white/8">
                <BrandImage
                  src={p.img}
                  alt={p.name}
                  label={p.name}
                  imgClassName="grayscale group-hover:scale-105 group-hover:grayscale-0"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-volt">
                    {p.role}
                  </p>
                  <p className="font-display text-lg font-bold text-white">{p.name}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
