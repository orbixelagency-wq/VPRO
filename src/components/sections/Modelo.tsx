import { Reveal } from "@/components/Reveal"
import { ScanLine, Rocket, ArrowRight } from "lucide-react"

export function Modelo() {
  return (
    <section id="modelo" className="border-t border-line py-24 sm:py-28">
      <div className="container">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="eyebrow justify-center">Modelo de negocio</p>
          <h2 className="mt-5 text-3xl sm:text-[2.6rem] sm:leading-[1.05]">
            Análisis y aplicación,{" "}
            <span className="text-mute">en un mismo proceso.</span>
          </h2>
          <p className="mt-5 text-lg text-mute">
            No somos solo consultores ni solo desarrolladores. Primero
            auditamos tu negocio y después implementamos la IA que necesita —
            dos fases conectadas, vendidas como un único servicio.
          </p>
        </Reveal>

        <div className="relative mt-14 grid gap-5 lg:grid-cols-2">
          {/* Conector entre fases (desktop) */}
          <div className="absolute left-1/2 top-1/2 z-10 hidden -translate-x-1/2 -translate-y-1/2 lg:block">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface text-orbit shadow-soft">
              <ArrowRight className="h-4 w-4" />
            </div>
          </div>

          <Reveal delay={60}>
            <Phase
              n="01"
              icon={<ScanLine className="h-5 w-5" />}
              tag="Fase 1 — Auditoría"
              title="Escaneamos el negocio"
              body="Detectamos tus puntos débiles y las oportunidades donde la IA aporta valor: procesos manuales, atención al cliente, ventas, marketing, presencia web."
              points={[
                "Diagnóstico de puntos débiles y necesidades no cubiertas",
                "Aplicable a ecommerce, servicios y negocios locales",
                "Es un servicio de pago en sí mismo — aporta valor sin implementación",
              ]}
            />
          </Reveal>

          <Reveal delay={140}>
            <Phase
              n="02"
              icon={<Rocket className="h-5 w-5" />}
              tag="Fase 2 — Aplicación de IA"
              title="Implementamos la solución"
              body="Materializamos las recomendaciones de la auditoría con soluciones concretas y a medida, según el sector y las necesidades detectadas."
              points={[
                "Automatizaciones que ahorran tiempo y mejoran la operativa",
                "Páginas web e integraciones de IA a medida",
                "Se despliega justo donde la auditoría encontró la oportunidad",
              ]}
              accent
            />
          </Reveal>
        </div>
      </div>
    </section>
  )
}

function Phase({
  n,
  icon,
  tag,
  title,
  body,
  points,
  accent = false,
}: {
  n: string
  icon: React.ReactNode
  tag: string
  title: string
  body: string
  points: string[]
  accent?: boolean
}) {
  return (
    <div className="card h-full p-7 sm:p-9">
      <div className="flex items-center justify-between">
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${
            accent ? "bg-orbit text-white" : "bg-orbit-soft text-orbit"
          }`}
        >
          {icon}
        </span>
        <span className="datum text-4xl font-bold text-line">{n}</span>
      </div>
      <p className="datum mt-6 text-[0.7rem] uppercase tracking-[0.18em] text-orbit">
        {tag}
      </p>
      <h3 className="mt-2 text-2xl">{title}</h3>
      <p className="mt-3 text-mute">{body}</p>
      <ul className="mt-6 space-y-3 border-t border-line pt-6">
        {points.map((p) => (
          <li key={p} className="flex gap-3 text-sm text-ink">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-orbit" />
            {p}
          </li>
        ))}
      </ul>
    </div>
  )
}
