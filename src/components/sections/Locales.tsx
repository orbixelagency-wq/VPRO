import { Reveal, CornerFrame } from "@/components/telemetry"
import { SectionHeading } from "@/components/SectionHeading"
import { BrandImage } from "@/components/BrandImage"
import { useBooking } from "@/components/booking/BookingProvider"
import { MapPin, ArrowUpRight } from "lucide-react"

const mapUrl = (q: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`

const LOCALES = [
  {
    id: "es-castell",
    ciudad: "Es Castell",
    zona: "Villacarlos",
    direccion: "Carretera de Sant Felip, 1",
    nota: "El origen. Barbería y arreglo de barba con vapor de ozono.",
    img: "/brand/local-escastell.jpg",
    maps: "Oblivion Barbers Carretera de Sant Felip 1, Es Castell, Menorca",
  },
  {
    id: "mahon",
    ciudad: "Mahón",
    zona: "Maó",
    direccion: "Avenida de Fort de l'Eau, 167",
    nota: "En plena avenida, con toda la carta de servicios de la casa.",
    img: "/brand/local-mahon.jpg",
    maps: "Oblivion Barbers Avinguda del Fort de l'Eau 167, Maó, Menorca",
  },
  {
    id: "ciutadella",
    ciudad: "Ciutadella",
    zona: "Apertura reciente",
    direccion: "Carrer d'Eivissa, 25",
    nota: "Nuestro local más nuevo, al oeste de la isla.",
    img: "/brand/local-ciutadella.jpg",
    maps: "Oblivion Barbers Carrer d'Eivissa 25, Ciutadella de Menorca",
    nuevo: true,
  },
]

export function Locales() {
  const { openBooking } = useBooking()
  return (
    <section id="locales" className="relative border-t border-line bg-graphite/30 py-24 sm:py-32">
      <div className="container">
        <SectionHeading
          channel="Locales"
          index="03"
          title="Tres barberías,"
          highlight="una isla"
          description="Nos encontrarás en tres puntos clave de Menorca. Elige el que mejor te venga y reserva tu cita."
        />

        <div className="mt-14 grid gap-px border border-line bg-line lg:grid-cols-3">
          {LOCALES.map((l, i) => (
            <Reveal key={l.ciudad} delay={i * 110} className="bg-carbon">
              <article className="group flex h-full flex-col">
                <div className="relative aspect-[4/3] overflow-hidden">
                  <BrandImage
                    src={l.img}
                    alt={`Local de Oblivion en ${l.ciudad}`}
                    label={`Local ${l.ciudad}`}
                    imgClassName="transition-transform duration-700 group-hover:scale-[1.04]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-carbon via-carbon/10 to-transparent" />
                  <div className="absolute inset-4 text-white/20">
                    <CornerFrame />
                  </div>
                  {l.nuevo && (
                    <span className="absolute right-4 top-4 bg-ember px-2.5 py-1 font-sans text-[0.58rem] font-bold uppercase tracking-[0.16em] text-carbon">
                      Nuevo
                    </span>
                  )}
                  <div className="absolute bottom-4 left-5">
                    <span className="font-sans text-[0.6rem] font-semibold uppercase tracking-[0.24em] text-ember">
                      {l.zona}
                    </span>
                    <h3 className="font-display text-3xl uppercase leading-none text-chalk">
                      {l.ciudad}
                    </h3>
                  </div>
                </div>

                <div className="flex flex-1 flex-col p-7">
                  <a
                    href={mapUrl(l.maps)}
                    target="_blank"
                    rel="noreferrer"
                    className="group/dir flex items-start gap-3 text-chalk transition-colors hover:text-ember"
                  >
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ember" />
                    <span className="text-sm font-medium">
                      {l.direccion}
                      <span className="ml-1 inline-block translate-y-px opacity-0 transition-opacity group-hover/dir:opacity-100">
                        <ArrowUpRight className="inline h-3.5 w-3.5" />
                      </span>
                    </span>
                  </a>
                  <p className="mt-4 text-sm leading-relaxed text-ash">{l.nota}</p>
                  <button
                    onClick={() => openBooking({ localId: l.id })}
                    className="mt-6 inline-flex items-center gap-2 font-sans text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-ember transition-colors hover:text-gold"
                  >
                    Reservar aquí <ArrowUpRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
