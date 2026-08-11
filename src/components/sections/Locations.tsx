import { MapPin, Phone, Clock } from "lucide-react"
import { LOCATIONS, type Location } from "@/lib/content"
import { useReveal } from "@/lib/useReveal"

/** Estado de apertura calculado en la zona horaria del local (Europe/Madrid). */
function useOpenStatus(loc: Location) {
  const parts = new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date())

  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0")
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0")
  // día de la semana 0=Dom … 6=Sáb
  const day = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Europe/Madrid" })
  ).getDay()

  const now = hour * 60 + minute
  const today = loc.weekly[day]
  const open = !!today && now >= today.open && now < today.close
  return { open }
}

export function Locations() {
  const head = useReveal<HTMLDivElement>()
  return (
    <section id="locales" className="paper">
      <div className="mx-auto max-w-[1280px] px-6 py-24 md:py-32">
        <div ref={head} className="reveal">
          <p className="eyebrow eyebrow--bone mb-6">Horarios & ubicación</p>
          <h2 className="max-w-[14ch] text-[clamp(2.1rem,5vw,3.6rem)] text-ink">
            Dos casas, el mismo buen rollo
          </h2>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          {LOCATIONS.map((loc, i) => (
            <LocationCard key={loc.city} loc={loc} delay={i * 110} />
          ))}
        </div>
      </div>
    </section>
  )
}

function LocationCard({ loc, delay }: { loc: Location; delay: number }) {
  const ref = useReveal<HTMLDivElement>(delay)
  const { open } = useOpenStatus(loc)
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    loc.mapsQuery
  )}`

  return (
    <article
      ref={ref}
      className="reveal relative flex flex-col overflow-hidden rounded-sm border border-[rgba(20,16,14,0.18)] bg-ink text-bone"
    >
      <div className="barberpole absolute left-0 top-0 h-full w-[6px]" aria-hidden />

      <div className="flex items-start justify-between gap-4 p-7 pl-9">
        <h3 className="font-slab text-3xl uppercase tracking-wide text-bone">
          {loc.city}
        </h3>
        <span
          className={
            "inline-flex items-center gap-2 rounded-full border px-3 py-1 font-cond text-[0.72rem] font-700 uppercase tracking-[0.14em] " +
            (open
              ? "border-neon/40 text-neon"
              : "border-line text-bone-dim")
          }
        >
          <span
            className={
              "h-2 w-2 rounded-full " + (open ? "bg-neon" : "bg-bone-dim")
            }
          />
          {open ? "Abierto ahora" : "Cerrado ahora"}
        </span>
      </div>

      <div className="grid gap-6 px-7 pb-7 pl-9 sm:grid-cols-2">
        <div>
          <p className="mb-3 inline-flex items-center gap-2 font-cond text-[0.75rem] uppercase tracking-[0.14em] text-neon">
            <MapPin size={14} /> Dónde
          </p>
          <address className="not-italic font-sans leading-relaxed text-bone-dim">
            {loc.address.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </address>
          <a
            href={loc.phoneHref}
            className="mt-4 inline-flex items-center gap-2 font-cond text-lg font-700 tracking-wide text-bone transition-colors hover:text-neon"
          >
            <Phone size={16} className="text-neon" />
            {loc.phone}
          </a>
        </div>

        <div>
          <p className="mb-3 inline-flex items-center gap-2 font-cond text-[0.75rem] uppercase tracking-[0.14em] text-neon">
            <Clock size={14} /> Horario
          </p>
          <ul className="space-y-2">
            {loc.hours.map((h) => (
              <li key={h.days} className="flex justify-between gap-3 text-sm">
                <span className="text-bone-dim">{h.days}</span>
                <span className="font-cond font-600 text-bone">{h.time}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-auto flex items-center justify-between border-t border-line px-7 py-4 pl-9 font-cond text-sm font-700 uppercase tracking-[0.14em] text-bone transition-colors hover:bg-ink-2 hover:text-neon"
      >
        Cómo llegar
        <span aria-hidden>→</span>
      </a>
    </article>
  )
}
