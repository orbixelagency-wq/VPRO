import { Reveal } from "@/components/Reveal"
import {
  SearchCheck,
  Workflow,
  MonitorSmartphone,
  BrainCircuit,
  ArrowUpRight,
} from "lucide-react"

const SERVICES = [
  {
    icon: SearchCheck,
    title: "Auditorías de negocio",
    body: "Analizamos tu negocio para detectar carencias y oportunidades de mejora con IA. Aplicable a cualquier sector, con foco especial en ecommerce.",
    items: ["Auditoría para ecommerce", "Servicios y negocios locales", "Detección de puntos débiles"],
  },
  {
    icon: Workflow,
    title: "Automatizaciones",
    body: "Implementamos automatizaciones que ahorran tiempo y mejoran la atención y la operativa del día a día.",
    items: ["WhatsApp: atención, ventas y seguimiento", "Automatizaciones a medida"],
    featured: true,
  },
  {
    icon: MonitorSmartphone,
    title: "Páginas web",
    body: "Diseño e implementación de páginas web como parte de la solución digital, alineadas con lo detectado en la auditoría.",
    items: ["Web a medida", "Orientada a conversión"],
  },
  {
    icon: BrainCircuit,
    title: "Implementación de IA",
    body: "Cualquier solución de inteligencia artificial que pueda aplicarse a tu negocio, más allá de los servicios anteriores.",
    items: ["Soluciones a medida", "Según sector y necesidades"],
  },
]

export function Servicios() {
  return (
    <section id="servicios" className="bg-surface/60 py-24 sm:py-28">
      <div className="container">
        <Reveal className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-xl">
            <p className="eyebrow">Servicios</p>
            <h2 className="mt-5 text-3xl sm:text-[2.6rem] sm:leading-[1.05]">
              Lo que implementamos{" "}
              <span className="text-mute">tras el diagnóstico.</span>
            </h2>
          </div>
          <p className="max-w-sm text-mute md:text-right">
            Cobertura amplia de soluciones de IA: automatizaciones, WhatsApp,
            web e implementación a medida.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map((s, i) => (
            <Reveal key={s.title} delay={i * 80} className="h-full">
              <ServiceCard {...s} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function ServiceCard({
  icon: Icon,
  title,
  body,
  items,
  featured = false,
}: {
  icon: typeof SearchCheck
  title: string
  body: string
  items: string[]
  featured?: boolean
}) {
  return (
    <div
      className={`group flex h-full flex-col rounded-card border p-6 transition-all duration-300 hover:-translate-y-1 ${
        featured
          ? "border-transparent bg-void text-paper shadow-float"
          : "border-line bg-surface hover:shadow-float"
      }`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${
            featured ? "bg-orbit text-white" : "bg-orbit-soft text-orbit"
          }`}
        >
          <Icon className="h-5 w-5" />
        </span>
        <ArrowUpRight
          className={`h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${
            featured ? "text-paper/60" : "text-mute"
          }`}
        />
      </div>

      <h3 className={`mt-6 text-xl ${featured ? "text-paper" : "text-ink"}`}>
        {title}
      </h3>
      <p className={`mt-2 text-sm ${featured ? "text-paper/70" : "text-mute"}`}>
        {body}
      </p>

      <ul
        className={`mt-5 space-y-2 border-t pt-5 ${
          featured ? "border-line-dark" : "border-line"
        }`}
      >
        {items.map((it) => (
          <li
            key={it}
            className={`datum flex items-start gap-2 text-[0.72rem] uppercase tracking-[0.08em] ${
              featured ? "text-paper/70" : "text-mute"
            }`}
          >
            <span
              className={`mt-1.5 h-1 w-1 shrink-0 rounded-full ${
                featured ? "bg-orbit" : "bg-orbit"
              }`}
            />
            {it}
          </li>
        ))}
      </ul>
    </div>
  )
}
