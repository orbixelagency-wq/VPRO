import { Reveal, ClipReveal, CornerFrame } from "@/components/telemetry"
import { SectionHeading } from "@/components/SectionHeading"
import { BrandImage } from "@/components/BrandImage"
import { cn } from "@/lib/utils"

/**
 * ONCE INICIAL — el "starting XI" de V Pro sobre un campo.
 * Formacion 4-3-3 (ataque hacia la derecha). Cada jugador lleva su badge de
 * puntuacion. En >=md se dibuja el campo con las fichas posicionadas; en movil
 * se apila por lineas para mantener legibilidad.
 *
 * NOTA: las puntuaciones (rating) y las plazas "POR CONFIRMAR" son provisionales
 * hasta recibir el once completo (11) con fotos y notas reales.
 */

interface Player {
  name?: string
  pos: string // etiqueta larga
  code: string // codigo corto (POR/DC/LAT/MC/EXT/DEL)
  rating?: number
  img?: string
  x: number // % en el campo (0 izq = porteria propia)
  y: number // % en el campo (0 arriba)
  line: "por" | "def" | "med" | "del"
}

const XI: Player[] = [
  { pos: "Portero", code: "POR", x: 7, y: 50, line: "por" },
  { name: "Kiran Dopico", pos: "Lateral", code: "LAT", rating: 78, img: "/brand/player-kirandopico.jpg", x: 24, y: 16, line: "def" },
  { name: "Isaac Bruno", pos: "Central", code: "DC", rating: 79, img: "/brand/player-isaacbruno.jpg", x: 24, y: 39, line: "def" },
  { pos: "Central", code: "DC", x: 24, y: 62, line: "def" },
  { pos: "Lateral", code: "LAT", x: 24, y: 84, line: "def" },
  { name: "Saibo", pos: "Mediocentro", code: "MC", rating: 80, img: "/brand/player-saibo.jpg", x: 49, y: 30, line: "med" },
  { pos: "Mediocentro", code: "MC", x: 49, y: 55, line: "med" },
  { pos: "Interior", code: "MC", x: 49, y: 80, line: "med" },
  { name: "Krishna Rawal", pos: "Extremo", code: "EXT", rating: 82, img: "/brand/player-krishna.jpg", x: 78, y: 22, line: "del" },
  { name: "Pol Cufí", pos: "Delantero", code: "DEL", rating: 84, img: "/brand/player-polcufi.jpg", x: 78, y: 50, line: "del" },
  { pos: "Extremo", code: "EXT", x: 78, y: 78, line: "del" },
]

const LINES: { key: Player["line"]; label: string }[] = [
  { key: "del", label: "Ataque" },
  { key: "med", label: "Medio" },
  { key: "def", label: "Defensa" },
  { key: "por", label: "Portería" },
]

export function OnceInicial() {
  return (
    <section id="once" className="relative border-t border-line py-24 sm:py-32">
      <div className="container">
        <SectionHeading
          channel="Once inicial"
          index="ROSTER · 05"
          title="El once que ha crecido"
          highlight="con V Pro"
          description="Futbolistas que confiaron en el trabajo individual para dar el salto — alineados como un equipo, con la nota de su proceso."
        />

        {/* CAMPO (desktop) */}
        <ClipReveal direction="up" className="mt-14 hidden md:block">
          <div className="relative aspect-[16/9] w-full overflow-hidden border border-line bg-[#0c0e12]">
            <Pitch />
            {XI.map((p, i) => (
              <div
                key={i}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${p.x}%`, top: `${p.y}%` }}
              >
                <Reveal delay={i * 55} y={10}>
                  <PlayerChip player={p} index={i} />
                </Reveal>
              </div>
            ))}

            {/* Cabecera tipo scoreboard */}
            <div className="pointer-events-none absolute left-5 top-5 flex flex-col gap-1">
              <span className="font-display text-2xl font-extrabold uppercase leading-none text-chalk">
                V PRO · Starting XI
              </span>
              <span className="datum text-[0.6rem] tracking-[0.16em] text-ember">
                4-3-3 · TEMPORADA EN CURSO
              </span>
            </div>
            <div className="absolute inset-4 text-white/15">
              <CornerFrame />
            </div>
          </div>
        </ClipReveal>

        {/* LISTA POR LINEAS (movil) */}
        <div className="mt-12 space-y-10 md:hidden">
          {LINES.map((l) => {
            const players = XI.filter((p) => p.line === l.key)
            return (
              <div key={l.key}>
                <span className="channel">{l.label}</span>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {players.map((p, i) => (
                    <Reveal key={i} delay={i * 50} y={10}>
                      <PlayerChip player={p} index={i} compact />
                    </Reveal>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/** Ficha de jugador: retrato + badge de nota + nombre/posicion. */
function PlayerChip({
  player,
  index,
  compact = false,
}: {
  player: Player
  index: number
  compact?: boolean
}) {
  const pending = !player.name
  return (
    <div
      className={cn(
        "group relative overflow-hidden border bg-carbon transition-transform duration-300",
        pending ? "border-dashed border-line/70" : "border-line hover:-translate-y-1",
        compact ? "aspect-[3/4] w-full" : "aspect-[3/4] w-[15vw] max-w-[120px] min-w-[76px]"
      )}
      style={{ transitionTimingFunction: "cubic-bezier(0.23,1,0.32,1)" }}
    >
      <BrandImage
        src={player.img}
        alt={player.name ?? "Plaza por confirmar"}
        label={player.name ? undefined : player.code}
        imgClassName="grayscale transition-all duration-500 group-hover:grayscale-0 group-hover:scale-[1.05]"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-carbon via-carbon/25 to-transparent" />

      {/* Badge de nota */}
      <div className="absolute right-1.5 top-1.5">
        {player.rating ? (
          <span className="grid h-7 min-w-7 place-items-center rounded-[3px] bg-ember px-1 font-display text-sm font-extrabold leading-none text-carbon">
            {player.rating}
          </span>
        ) : (
          <span className="grid h-7 min-w-7 place-items-center rounded-[3px] border border-line px-1 font-display text-sm font-extrabold leading-none text-steel">
            —
          </span>
        )}
      </div>

      {/* Marco ember en hover */}
      {!pending && (
        <div className="absolute inset-1.5 text-ember opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <CornerFrame />
        </div>
      )}

      {/* Identidad */}
      <div className="absolute inset-x-0 bottom-0 p-2">
        <span className="datum text-[0.5rem] uppercase tracking-[0.18em] text-ember">
          {player.code}
          {!compact && ` · ${player.pos}`}
        </span>
        <p
          className={cn(
            "font-display font-bold uppercase leading-tight tracking-tight",
            pending ? "text-steel" : "text-chalk",
            compact ? "text-[0.7rem]" : "text-xs"
          )}
        >
          {player.name ?? "Por confirmar"}
        </p>
      </div>

      <span className="sr-only">{`Dorsal ${index + 1}`}</span>
    </div>
  )
}

/** Lineas del campo dibujadas con hairlines (ataque hacia la derecha). */
function Pitch() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {/* cesped sutil */}
      <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.012)_0_9%,transparent_9%_18%)]" />
      {/* borde interior */}
      <div className="absolute inset-6 border border-white/10" />
      {/* linea de medio campo */}
      <div className="absolute inset-y-6 left-1/2 w-px -translate-x-1/2 bg-white/10" />
      {/* circulo central */}
      <div className="absolute left-1/2 top-1/2 h-[26%] w-[15%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10" />
      {/* areas */}
      <div className="absolute left-6 top-1/2 h-[46%] w-[13%] -translate-y-1/2 border border-white/10" />
      <div className="absolute right-6 top-1/2 h-[46%] w-[13%] -translate-y-1/2 border border-white/10" />
    </div>
  )
}
