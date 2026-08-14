import { Reveal } from "@/components/telemetry"
import { SectionHeading } from "@/components/SectionHeading"
import { ArrowUpRight } from "lucide-react"
import { useBooking } from "@/components/booking/BookingProvider"

const SERVICIOS = [
  {
    nombre: "Corte de tendencia",
    desc: "Corte a medida, lavado y peinado con asesoramiento de estilo.",
    dur: "30 min",
    precio: "18 €",
  },
  {
    nombre: "Barba con vapor de ozono",
    desc: "Arreglo y perfilado con toalla caliente y vapor de ozono.",
    dur: "30 min",
    precio: "16 €",
  },
  {
    nombre: "Afeitado a navaja",
    desc: "Afeitado tradicional apurado con navaja, aceites y bálsamo.",
    dur: "30 min",
    precio: "17 €",
  },
  {
    nombre: "Estética masculina",
    desc: "Tratamientos faciales, cejas y detalles de cuidado del hombre.",
    dur: "45 min",
    precio: "25 €",
  },
  {
    nombre: "Corte júnior",
    desc: "Cortes para los más pequeños con la misma atención al detalle.",
    dur: "30 min",
    precio: "14 €",
  },
  {
    nombre: "Ritual completo",
    desc: "Corte + barba + tratamiento. La experiencia Oblivion al completo.",
    dur: "75 min",
    precio: "39 €",
  },
]

export function Servicios() {
  const { openBooking } = useBooking()
  return (
    <section id="servicios" className="relative border-t border-line py-24 sm:py-32">
      <div className="container">
        <SectionHeading
          channel="Servicios"
          index="01"
          title="Lo que hacemos,"
          highlight="con oficio"
          description="Barbería completa y cuidado masculino. Reserva online y elige tu servicio; el equipo te asesora en cada local."
        />

        <div className="mt-14 border-t border-line">
          {SERVICIOS.map((s, i) => (
            <Reveal key={s.nombre} delay={i * 60}>
              <button
                onClick={() => openBooking()}
                className="group grid w-full grid-cols-[auto_1fr_auto] items-center gap-4 border-b border-line py-6 text-left transition-colors hover:bg-graphite/40 sm:gap-8 sm:py-7"
              >
                <span className="datum font-display text-lg text-steel transition-colors group-hover:text-chalk sm:text-xl">
                  0{i + 1}
                </span>
                <span className="min-w-0">
                  <span className="flex items-baseline gap-3">
                    <span className="truncate font-display text-2xl uppercase tracking-[0.01em] text-chalk transition-transform duration-300 group-hover:translate-x-1 sm:text-3xl">
                      {s.nombre}
                    </span>
                    <ArrowUpRight className="h-4 w-4 shrink-0 -translate-x-1 text-ash opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100" />
                  </span>
                  <span className="mt-1.5 block max-w-xl text-sm leading-relaxed text-ash">
                    {s.desc}
                  </span>
                </span>
                <span className="text-right">
                  <span className="block font-display text-xl text-chalk sm:text-2xl">
                    {s.precio}
                  </span>
                  <span className="mt-0.5 block font-sans text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-steel">
                    {s.dur}
                  </span>
                </span>
              </button>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
