import { Reveal } from "@/components/Reveal"

const STEPS = [
  {
    n: "01",
    title: "Contacto",
    body: "Nos cuentas tu negocio y qué te gustaría mejorar.",
  },
  {
    n: "02",
    title: "Auditoría",
    body: "Escaneamos tu operativa y detectamos los puntos débiles.",
  },
  {
    n: "03",
    title: "Propuesta",
    body: "Te presentamos las soluciones de IA priorizadas por impacto.",
  },
  {
    n: "04",
    title: "Implementación",
    body: "Desplegamos automatizaciones, web e integraciones a medida.",
  },
]

export function Proceso() {
  return (
    <section id="proceso" className="border-t border-line py-24 sm:py-28">
      <div className="container">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="eyebrow justify-center">Cómo trabajamos</p>
          <h2 className="mt-5 text-3xl sm:text-[2.6rem] sm:leading-[1.05]">
            Del diagnóstico{" "}
            <span className="text-mute">a la solución en marcha.</span>
          </h2>
        </Reveal>

        <div className="relative mt-16">
          {/* Línea base (desktop) */}
          <div className="absolute left-0 right-0 top-6 hidden h-px bg-line lg:block" />
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 80}>
                <div className="relative">
                  <div className="flex items-center gap-4 lg:block">
                    <span className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-line bg-surface">
                      <span className="datum text-sm font-bold text-orbit">{s.n}</span>
                    </span>
                    <h3 className="text-xl lg:mt-6">{s.title}</h3>
                  </div>
                  <p className="mt-3 max-w-xs text-sm text-mute">{s.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
