import { Reveal, CountUp, Parallax } from "@/components/telemetry"

const VALUES = [
  { name: "Humildad", desc: "Escuchar antes de corregir." },
  { name: "Constancia", desc: "El progreso se construye a diario." },
  { name: "Eficiencia", desc: "Cada minuto de sesión cuenta." },
  { name: "Responsabilidad", desc: "Con el jugador y su proceso." },
  { name: "Compromiso", desc: "Acompañamiento real, no puntual." },
  { name: "Seriedad", desc: "Método, no improvisación." },
]

export function Manifesto() {
  return (
    <section id="manifiesto" className="relative overflow-hidden border-t border-line py-24 sm:py-32">
      {/* Marca de agua tipografica con parallax (profundidad) */}
      <Parallax
        speed={120}
        className="pointer-events-none absolute inset-x-0 top-16 select-none"
        innerClassName="text-center"
      >
        <span
          aria-hidden
          className="font-display text-[26vw] font-extrabold uppercase leading-none tracking-tighter text-chalk/[0.025]"
        >
          Total
        </span>
      </Parallax>

      <div className="container relative">
        <Reveal>
          <span className="channel">Manifiesto</span>
        </Reveal>

        {/* Cita como tesis de la seccion */}
        <Reveal delay={80}>
          <h2 className="mt-6 max-w-4xl font-display text-[clamp(2.6rem,7vw,6rem)] font-extrabold uppercase leading-[0.9] tracking-[-0.015em] text-chalk">
            Cada detalle suma.{" "}
            <span className="text-ember">No dejamos ninguno sin trabajar.</span>
          </h2>
        </Reveal>

        {/* Franja de datos / credibilidad */}
        <Reveal delay={140}>
          <div className="mt-14 grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-4">
            <Stat value={<CountUp to={10} suffix="+" />} label="Años de staff" />
            <Stat value={<CountUp to={2} />} label="Sedes activas" />
            <Stat value={<span className="datum">1:1</span>} label="Ratio de trabajo" />
            <Stat value={<span className="datum text-xl">VBT · NSCA</span>} label="Base científica" />
          </div>
        </Reveal>

        {/* Ficha de valores */}
        <div className="mt-16 grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {VALUES.map((v, i) => (
            <Reveal key={v.name} delay={i * 60}>
              <div className="group h-full bg-carbon p-7 transition-colors hover:bg-graphite">
                <div className="flex items-baseline justify-between">
                  <h3 className="font-display text-2xl font-bold uppercase tracking-tight text-chalk">
                    {v.name}
                  </h3>
                  <span className="font-mono text-[0.65rem] text-steel opacity-0 transition-opacity group-hover:opacity-100">
                    ↳
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-ash">{v.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function Stat({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div className="bg-carbon p-6">
      <div className="font-display text-3xl font-extrabold text-ember sm:text-4xl">{value}</div>
      <div className="mt-1 font-mono text-[0.62rem] uppercase tracking-[0.2em] text-steel">
        {label}
      </div>
    </div>
  )
}
