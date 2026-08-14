import { Reveal } from "@/components/telemetry"
import { BrandImage } from "@/components/BrandImage"
import { CornerFrame } from "@/components/telemetry"

interface PhotoBandProps {
  img: string
  eyebrow?: string
  word: string
  caption?: string
}

/**
 * Banda cinematográfica a pantalla completa con una foto del local en blanco y
 * negro y parallax de scroll. Sirve de transición sobria entre secciones.
 */
export function PhotoBand({ img, eyebrow, word, caption }: PhotoBandProps) {
  return (
    <section className="relative h-[80vh] overflow-hidden border-y border-line bg-carbon">
      <div className="absolute inset-0">
        <BrandImage src={img} alt={word} parallax imgClassName="opacity-70" />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-carbon via-carbon/50 to-carbon/70" />
      <div className="pointer-events-none absolute inset-6 text-white/15 sm:inset-10">
        <CornerFrame />
      </div>

      <div className="relative z-10 flex h-full items-center justify-center px-6 text-center">
        <Reveal>
          <div>
            {eyebrow && <span className="channel justify-center">{eyebrow}</span>}
            <h2 className="mt-4 font-display text-[clamp(2.6rem,11vw,9rem)] uppercase leading-[0.9] text-chalk">
              {word}
            </h2>
            {caption && (
              <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-ash sm:text-base">
                {caption}
              </p>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  )
}
