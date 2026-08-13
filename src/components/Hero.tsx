import { Button } from "@/components/ui/button"
import { BrandImage } from "@/components/BrandImage"
import { Phone, Mail, Clock, CalendarDays, Instagram, Facebook } from "lucide-react"

interface HeroProps {
  onReservar?: () => void
  onServicios?: () => void
}

/**
 * Hero fotográfico de Oblivion, en la línea de las barberías premium de
 * referencia: gran imagen de fondo, titular editorial, CTA de reserva y una
 * barra inferior con contacto y horario. Estética carbón + cobre/oro.
 *
 * La imagen se toma de /public/brand/hero.jpg; mientras no exista, se muestra
 * un placeholder de marca cálido (la web funciona igual).
 */
export function Hero({ onReservar, onServicios }: HeroProps) {
  return (
    <section id="inicio" className="relative min-h-[100svh] overflow-hidden bg-carbon">
      {/* Imagen de fondo */}
      <div className="absolute inset-0">
        <BrandImage
          src="/brand/hero.jpg"
          alt="Barbero de Oblivion trabajando con un cliente"
          imgClassName="kenburns"
          className="bg-carbon"
        />
      </div>

      {/* Veladuras cinematográficas */}
      <div className="absolute inset-0 bg-gradient-to-r from-carbon via-carbon/70 to-carbon/20" />
      <div className="absolute inset-0 bg-gradient-to-t from-carbon via-carbon/40 to-carbon/50" />
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_15%_40%,rgba(198,133,47,0.16),transparent_55%)]" />

      {/* Contenido */}
      <div className="container relative z-10 flex min-h-[100svh] flex-col justify-center pb-40 pt-28">
        <div className="max-w-2xl">
          <p className="b-up channel" style={{ animationDelay: "120ms" }}>
            Barbería &amp; cuidado masculino — Menorca
          </p>

          <h1
            className="b-up mt-6 font-display uppercase leading-[0.86] text-chalk"
            style={{ animationDelay: "220ms" }}
          >
            <span className="block text-[clamp(2.8rem,8vw,6.5rem)]">Más que</span>
            <span className="block text-[clamp(2.8rem,8vw,6.5rem)]">un corte,</span>
            <span className="mt-2 block font-serif text-[clamp(1.8rem,5vw,3.6rem)] normal-case italic text-brass">
              un ritual.
            </span>
          </h1>

          <p
            className="b-up mt-6 max-w-lg text-base leading-relaxed text-ash sm:text-lg"
            style={{ animationDelay: "320ms" }}
          >
            Cortes de tendencia, arreglo de barba con vapor de ozono y estética
            masculina. Ambiente actual, bebida de cortesía y tres locales en la isla.
          </p>

          <div
            className="b-up mt-9 flex flex-col gap-3 sm:flex-row sm:items-center"
            style={{ animationDelay: "420ms" }}
          >
            <Button size="lg" onClick={onReservar}>
              <CalendarDays className="h-4 w-4" /> Reservar cita
            </Button>
            <Button size="lg" variant="outline" onClick={onServicios}>
              Ver servicios
            </Button>
          </div>

          <div
            className="b-in mt-8 flex items-center gap-3"
            style={{ animationDelay: "560ms" }}
          >
            <a
              href="https://www.instagram.com/"
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram"
              className="grid h-10 w-10 place-items-center border border-line text-ash transition-colors hover:border-ember hover:text-ember"
            >
              <Instagram className="h-4 w-4" />
            </a>
            <a
              href="https://www.facebook.com/"
              target="_blank"
              rel="noreferrer"
              aria-label="Facebook"
              className="grid h-10 w-10 place-items-center border border-line text-ash transition-colors hover:border-ember hover:text-ember"
            >
              <Facebook className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>

      {/* Barra inferior: contacto + horario + agendar */}
      <div className="absolute inset-x-0 bottom-0 z-10 border-t border-line bg-carbon/70 backdrop-blur-md">
        <div className="container grid grid-cols-1 items-stretch gap-px sm:grid-cols-2 lg:grid-cols-4">
          <InfoItem icon={Phone} label="Reservas" value="+34 971 00 00 00" />
          <InfoItem icon={Mail} label="Email" value="hola@oblivionbarbers.es" />
          <InfoItem icon={Clock} label="Horario" value="L–V 9–20 · S 9–14" />
          <button
            onClick={onReservar}
            className="group flex items-center justify-center gap-2 bg-ember px-6 py-5 font-sans text-xs font-semibold uppercase tracking-[0.2em] text-carbon transition-colors hover:bg-ember-2"
          >
            <CalendarDays className="h-4 w-4" /> Agendar
          </button>
        </div>
      </div>
    </section>
  )
}

function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-3 px-2 py-5 sm:px-4">
      <span className="grid h-9 w-9 shrink-0 place-items-center border border-line text-ember">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className="font-sans text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-steel">
          {label}
        </p>
        <p className="text-sm text-chalk">{value}</p>
      </div>
    </div>
  )
}

export default Hero
