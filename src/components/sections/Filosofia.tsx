import { Reveal, Rule } from "@/components/telemetry"

/**
 * Filosofía de Oblivion — el concepto "Care". Manifiesto editorial:
 * la barbería como espacio de bienestar masculino, no solo un corte.
 */
export function Filosofia() {
  return (
    <section id="filosofia" className="relative border-t border-line py-24 sm:py-32">
      <div className="container">
        <div className="grid gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          {/* Columna izquierda: etiqueta + declaración */}
          <div>
            <Reveal>
              <span className="channel">La casa</span>
              <Rule className="mt-4 max-w-[220px]" />
            </Reveal>
            <Reveal delay={80}>
              <h2 className="mt-6 font-display text-[clamp(2.2rem,5.5vw,4rem)] uppercase leading-[0.92] text-chalk">
                Más que
                <br />
                un corte
              </h2>
            </Reveal>
            <Reveal delay={140}>
              <p className="mt-6 max-w-sm font-serif text-lg italic leading-relaxed text-ember/90">
                “El cuidado masculino entendido como un ritual, no como un trámite.”
              </p>
            </Reveal>
          </div>

          {/* Columna derecha: cuerpo */}
          <div className="lg:pt-16">
            <Reveal delay={120}>
              <p className="text-lg leading-relaxed text-ash sm:text-xl">
                Oblivion Barbers &amp; Care es una cadena de barberías y centros de estética
                masculina en Menorca. Combinamos el oficio de la barbería clásica con una
                mirada actual del bienestar: cortes de tendencia, arreglos de barba
                tradicionales con vapor de ozono y un ambiente pensado para desconectar.
              </p>
            </Reveal>
            <Reveal delay={220}>
              <p className="mt-6 leading-relaxed text-ash">
                Cada visita incluye una bebida de cortesía y el tiempo justo para que el
                cuidado personal sea, también, un momento para uno mismo. Tres locales
                repartidos por la isla, un mismo estándar de detalle.
              </p>
            </Reveal>

            <div className="mt-10 grid gap-px border border-line bg-line sm:grid-cols-3">
              {[
                { k: "Tradición", v: "Barbería clásica y afeitado a navaja." },
                { k: "Ozono", v: "Vapor de ozono en el arreglo de barba." },
                { k: "Care", v: "Bienestar, ambiente y bebida de cortesía." },
              ].map((c) => (
                <Reveal key={c.k} className="bg-carbon">
                  <div className="h-full p-6">
                    <p className="font-display text-sm uppercase tracking-[0.12em] text-ember">
                      {c.k}
                    </p>
                    <p className="mt-3 text-sm leading-relaxed text-ash">{c.v}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
