import { RazorRose } from "@/components/Brand"
import { useReveal } from "@/lib/useReveal"

const STATS = [
  { k: "2018", v: "Encendimos las luces" },
  { k: "2", v: "Locales · Girona & Figueres" },
  { k: "13+", v: "Servicios de barbería" },
]

export function About() {
  const left = useReveal<HTMLDivElement>()
  const right = useReveal<HTMLDivElement>(120)

  return (
    <section id="nosotros" className="paper">
      <div className="mx-auto grid max-w-[1280px] gap-14 px-6 py-24 md:grid-cols-[1.1fr_0.9fr] md:py-32">
        <div ref={left} className="reveal">
          <p className="eyebrow eyebrow--bone mb-6">Sobre nosotros</p>
          <h2 className="max-w-[16ch] text-[clamp(2.1rem,5vw,3.6rem)] text-ink">
            Respetamos el patrimonio de la barbería clásica
          </h2>

          <div className="mt-8 max-w-xl space-y-5 font-sans text-[1.05rem] leading-relaxed text-ink/80">
            <p>
              Scoundrels Barbers se estableció en Girona capital en{" "}
              <span className="font-600 text-ink">2018</span> con una única
              misión: servir al cliente caballero ofreciendo solo las mejores
              técnicas, servicios y productos disponibles.
            </p>
            <p>
              Hoy somos ampliamente reconocidos como la barbería de elección en
              la ciudad, y seguimos fijando los estándares más altos en el
              corte, el peinado y el aseo masculino — siempre con el buen rollo
              que nos caracteriza.
            </p>
          </div>

          <dl className="mt-12 grid grid-cols-3 gap-4 border-t border-[rgba(20,16,14,0.16)] pt-8">
            {STATS.map((s) => (
              <div key={s.k}>
                <dt className="font-slab text-3xl text-rose sm:text-4xl">
                  {s.k}
                </dt>
                <dd className="mt-2 font-cond text-[0.8rem] font-600 uppercase leading-snug tracking-[0.1em] text-ink/70">
                  {s.v}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Marca navaja + rosa, con cita */}
        <div
          ref={right}
          className="reveal relative flex flex-col items-center justify-center"
        >
          <div className="relative flex aspect-square w-full max-w-sm items-center justify-center rounded-sm border border-[rgba(20,16,14,0.18)] bg-ink text-neon">
            <RazorRose className="w-3/5" />
            <span className="absolute left-4 top-4 h-4 w-4 border-l border-t border-neon" />
            <span className="absolute bottom-4 right-4 h-4 w-4 border-b border-r border-neon" />
          </div>
          <blockquote className="mt-8 max-w-xs text-center font-script text-2xl leading-tight text-rose">
            “Buen rollo, actitud y navaja bien afilada.”
          </blockquote>
        </div>
      </div>
    </section>
  )
}
