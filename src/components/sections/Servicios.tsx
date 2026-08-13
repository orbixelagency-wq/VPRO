import { Reveal } from "@/components/telemetry"
import { SectionHeading } from "@/components/SectionHeading"
import { Scissors, Wind, Droplets, Sparkles, Baby, Waves } from "lucide-react"

const SERVICIOS = [
  {
    icon: Scissors,
    nombre: "Corte de tendencia",
    desc: "Corte a medida, lavado y peinado. Asesoramiento de estilo según tu rostro y tu día a día.",
    tag: "El clásico",
  },
  {
    icon: Wind,
    nombre: "Barba con vapor de ozono",
    desc: "Arreglo y perfilado de barba con toalla caliente y vapor de ozono para una piel más limpia y cuidada.",
    tag: "Especialidad",
  },
  {
    icon: Droplets,
    nombre: "Afeitado a navaja",
    desc: "Afeitado tradicional apurado con navaja, aceites y bálsamo. El ritual de siempre, bien hecho.",
    tag: "Tradición",
  },
  {
    icon: Sparkles,
    nombre: "Estética masculina",
    desc: "Tratamientos faciales, cejas y detalles de estética pensados para el cuidado del hombre.",
    tag: "Care",
  },
  {
    icon: Baby,
    nombre: "Corte júnior",
    desc: "Cortes para los más pequeños en un ambiente relajado, con la misma atención al detalle.",
    tag: "Familia",
  },
  {
    icon: Waves,
    nombre: "Ritual completo",
    desc: "Corte + barba + tratamiento en una sola sesión. La experiencia Oblivion al completo.",
    tag: "Pack",
  },
]

export function Servicios() {
  return (
    <section id="servicios" className="relative border-t border-line bg-graphite/30 py-24 sm:py-32">
      <div className="container">
        <SectionHeading
          channel="Servicios"
          index="01"
          title="Lo que hacemos,"
          highlight="con oficio"
          description="Barbería completa y cuidado masculino. Consulta precios y disponibilidad al reservar; el equipo te asesora en cada local."
        />

        <div className="mt-14 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {SERVICIOS.map((s, i) => (
            <Reveal key={s.nombre} delay={(i % 3) * 90} className="bg-carbon">
              <article className="group relative h-full p-8 transition-colors duration-300 hover:bg-graphite-2">
                <div className="flex items-start justify-between">
                  <span className="grid h-12 w-12 place-items-center border border-line text-ember transition-colors duration-300 group-hover:border-ember/60">
                    <s.icon className="h-5 w-5" />
                  </span>
                  <span className="font-sans text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-steel">
                    {s.tag}
                  </span>
                </div>
                <h3 className="mt-6 font-display text-xl uppercase tracking-[0.02em] text-chalk">
                  {s.nombre}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-ash">{s.desc}</p>
                <span className="mt-6 block h-px w-0 bg-ember transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:w-full" />
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
