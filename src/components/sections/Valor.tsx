import { Reveal } from "@/components/Reveal"
import { Layers, Store, TrendingUp, Boxes } from "lucide-react"

const VALUE = [
  {
    icon: Layers,
    title: "Enfoque integral",
    body: "No vendemos solo un diagnóstico ni solo una implementación, sino ambas cosas conectadas.",
  },
  {
    icon: Store,
    title: "Para cualquier negocio",
    body: "Aplicable a todo tipo de negocio, con un foco especial en ecommerce.",
  },
  {
    icon: TrendingUp,
    title: "La auditoría ya rinde",
    body: "El análisis genera valor por sí solo, y abre la puerta a la fase de implementación.",
  },
  {
    icon: Boxes,
    title: "Cobertura amplia de IA",
    body: "Automatizaciones, WhatsApp, web e implementación de IA a medida bajo un mismo techo.",
  },
]

export function Valor() {
  return (
    <section id="valor" className="bg-void text-paper">
      <div className="dotgrid-dark">
        <div className="container py-24 sm:py-28">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
            <Reveal>
              <p className="eyebrow text-paper/60">Propuesta de valor</p>
              <h2 className="mt-5 text-3xl text-paper sm:text-[2.7rem] sm:leading-[1.05]">
                La auditoría abre la puerta.{" "}
                <span className="text-paper/50">La IA la cruza.</span>
              </h2>
              <p className="mt-5 max-w-md text-paper/60">
                Conectamos el diagnóstico con la ejecución para que cada
                solución caiga exactamente donde tu negocio la necesita.
              </p>

              <div className="mt-9 flex flex-wrap gap-x-10 gap-y-6">
                <Stat n="2" unit="fases" label="Análisis + aplicación" />
                <Stat n="1" unit="proceso" label="Vendidas como un servicio" />
                <Stat n="∞" unit="sectores" label="Foco en ecommerce" />
              </div>
            </Reveal>

            <div className="grid gap-px overflow-hidden rounded-card border border-line-dark bg-line-dark sm:grid-cols-2">
              {VALUE.map((v, i) => (
                <Reveal key={v.title} delay={i * 70} className="bg-void">
                  <div className="h-full p-7">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] text-orbit ring-1 ring-line-dark">
                      <v.icon className="h-5 w-5" />
                    </span>
                    <h3 className="mt-5 text-lg text-paper">{v.title}</h3>
                    <p className="mt-2 text-sm text-paper/55">{v.body}</p>
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

function Stat({ n, unit, label }: { n: string; unit: string; label: string }) {
  return (
    <div>
      <p className="font-display text-4xl text-paper">
        {n}
        <span className="ml-1.5 text-base font-normal text-orbit">{unit}</span>
      </p>
      <p className="datum mt-1 text-[0.68rem] uppercase tracking-[0.14em] text-paper/45">
        {label}
      </p>
    </div>
  )
}
