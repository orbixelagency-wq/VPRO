import { Button } from "@/components/ui/button"
import { CornerFrame } from "@/components/telemetry"
import { BrandImage } from "@/components/BrandImage"
import { MapPin, Instagram, Facebook } from "lucide-react"

interface HeroProps {
  onReservar?: () => void
  onLocales?: () => void
}

/**
 * Hero-póster de Oblivion. Tipografía condensada gigante (Anton) sobre
 * un retrato de marca velado, con marco de encuadre y detalle editorial
 * en serif. Diseñado para leerse como una portada, no como una landing más.
 */
export function Hero({ onReservar, onLocales }: HeroProps) {
  return (
    <section
      id="inicio"
      className="relative flex min-h-[100svh] items-center overflow-hidden bg-carbon pt-24"
    >
      {/* Retrato de marca velado al fondo */}
      <div className="absolute inset-0">
        <BrandImage
          src="/brand/hero.jpg"
          alt="Barbero de Oblivion durante un arreglo de barba"
          imgClassName="opacity-40"
          className="bg-carbon"
        />
      </div>

      {/* Capas de oscurecido / atmósfera */}
      <div className="absolute inset-0 bg-gradient-to-t from-carbon via-carbon/70 to-carbon/40" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(200,155,75,0.14),transparent_60%)]" />
      <div className="grain absolute inset-0 opacity-60" aria-hidden />

      {/* Marco de encuadre */}
      <div className="b-frame pointer-events-none absolute inset-5 text-white/15 sm:inset-8">
        <CornerFrame />
      </div>

      {/* Etiqueta vertical lateral */}
      <div
        className="pointer-events-none absolute right-8 top-1/2 hidden -translate-y-1/2 rotate-90 font-sans text-[0.6rem] font-semibold uppercase tracking-[0.4em] text-steel lg:block"
        aria-hidden
      >
        Illa de Menorca
      </div>

      {/* Contenido */}
      <div className="container relative z-10 pb-16">
        <div className="mx-auto max-w-6xl">
          <p className="b-up channel" style={{ animationDelay: "120ms" }}>
            Barbería &amp; cuidado masculino — Menorca
          </p>

          <h1
            className="b-up mt-6 font-display uppercase leading-[0.82] text-chalk"
            style={{ animationDelay: "220ms" }}
          >
            <span className="block text-[clamp(3.6rem,17vw,15rem)] tracking-[0.01em]">
              Oblivion
            </span>
            <span className="mt-2 block font-serif text-[clamp(1.4rem,5vw,3.4rem)] font-medium normal-case italic tracking-normal text-brass">
              Barbers &amp; Care
            </span>
          </h1>

          <p
            className="b-up mt-7 max-w-xl text-base leading-relaxed text-ash sm:text-lg"
            style={{ animationDelay: "320ms" }}
          >
            Cortes de tendencia, arreglo de barba con vapor de ozono y un ritual de
            bienestar masculino. Ambiente actual, bebida de cortesía y tres locales
            en la isla.
          </p>

          <div
            className="b-up mt-9 flex flex-col gap-3 sm:flex-row sm:items-center"
            style={{ animationDelay: "420ms" }}
          >
            <Button size="lg" onClick={onReservar}>
              Reservar cita
            </Button>
            <Button size="lg" variant="outline" onClick={onLocales}>
              <MapPin className="h-4 w-4" /> Ver locales
            </Button>
          </div>

          {/* Fila de datos + social */}
          <div
            className="b-in mt-14 flex flex-wrap items-center gap-x-8 gap-y-4 border-t border-line pt-6"
            style={{ animationDelay: "560ms" }}
          >
            {[
              { k: "03", v: "Locales en Menorca" },
              { k: "O₃", v: "Barba con vapor de ozono" },
              { k: "✦", v: "Bebida de cortesía" },
            ].map((d) => (
              <div key={d.v} className="flex items-center gap-3">
                <span className="datum font-display text-xl text-ember">{d.k}</span>
                <span className="max-w-[9rem] text-xs leading-tight text-ash">{d.v}</span>
              </div>
            ))}

            <div className="ml-auto flex items-center gap-3">
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
      </div>

      {/* Indicador de scroll */}
      <div className="pointer-events-none absolute bottom-5 left-1/2 z-10 -translate-x-1/2 font-sans text-[0.6rem] font-semibold uppercase tracking-[0.3em] text-steel">
        Descubre
      </div>
    </section>
  )
}

export default Hero
