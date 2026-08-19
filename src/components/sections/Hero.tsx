import { Button } from "@/components/ui/button"
import { OrbitScanner } from "@/components/OrbitScanner"
import { RotatingWord } from "@/components/RotatingWord"
import { scrollToId } from "@/lib/scrollFX"
import { ArrowUpRight, MessageCircle, Check } from "lucide-react"

const scrollTo = scrollToId

export function Hero() {
  return (
    <section
      id="inicio"
      className="dotgrid relative overflow-hidden pb-16 pt-28 sm:pt-32"
    >
      {/* Halo azul suave detrás del hero */}
      <div
        data-parallax="24"
        className="pointer-events-none absolute left-1/2 top-24 -z-0 h-[520px] w-[820px] max-w-[95vw] -translate-x-1/2 rounded-full opacity-70 blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, rgba(47,91,255,0.14), rgba(47,91,255,0))",
        }}
      />

      <div className="container relative z-10">
        {/* Texto */}
        <div className="mx-auto max-w-3xl text-center">
          <p className="b-rise eyebrow justify-center" style={{ animationDelay: "0ms" }}>
            Agencia de inteligencia artificial
          </p>

          <h1
            className="b-rise mt-6 text-[2.6rem] leading-[1.02] sm:text-6xl lg:text-[4.6rem]"
            style={{ animationDelay: "80ms" }}
          >
            Escaneamos tu negocio.
            <span className="mt-1 block text-mute">
              Lo potenciamos con{" "}
              <RotatingWord
                words={["IA", "ventas", "WhatsApp", "datos", "automatización"]}
              />
              <span className="sr-only">IA y automatización.</span>
            </span>
          </h1>

          <p
            className="b-rise mx-auto mt-6 max-w-xl text-lg text-mute"
            style={{ animationDelay: "160ms" }}
          >
            Detectamos dónde pierdes tiempo, ventas y eficiencia — y desplegamos
            las soluciones de IA que lo resuelven. Análisis y aplicación en un
            único proceso.
          </p>

          <div
            className="b-rise mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
            style={{ animationDelay: "240ms" }}
          >
            <Button size="lg" onClick={() => scrollTo("#contacto")}>
              Solicita tu auditoría
              <ArrowUpRight />
            </Button>
            <Button size="lg" variant="outline" onClick={() => scrollTo("#servicios")}>
              Ver servicios
            </Button>
          </div>

          <p
            className="b-rise datum mt-6 text-xs uppercase tracking-[0.16em] text-mute"
            style={{ animationDelay: "320ms" }}
          >
            La auditoría ya aporta valor por sí sola · sin compromiso
          </p>
        </div>

        {/* Escenario: escáner + tarjetas flotantes */}
        <div className="relative mx-auto mt-14 max-w-5xl">
          {/* Tarjetas flotantes (solo desktop, alrededor del escáner) */}
          <FloatingCard className="left-0 top-6 hidden lg:flex" delay="0.2s" parallax={-22}>
            <ReportCard />
          </FloatingCard>

          <FloatingCard className="bottom-4 left-2 hidden lg:flex" delay="0.5s" parallax={14}>
            <WhatsAppCard />
          </FloatingCard>

          <FloatingCard className="right-0 top-16 hidden lg:flex" delay="0.35s" parallax={-12}>
            <IntegrationsCard />
          </FloatingCard>

          <div className="relative z-10 py-6" data-parallax="8">
            <OrbitScanner />
          </div>

          {/* Versión móvil de las tarjetas (apiladas) */}
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:hidden">
            <div className="card shadow-soft">
              <ReportCard />
            </div>
            <div className="card shadow-soft">
              <IntegrationsCard />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function FloatingCard({
  children,
  className = "",
  delay = "0s",
  parallax = 0,
}: {
  children: React.ReactNode
  className?: string
  delay?: string
  parallax?: number
}) {
  return (
    <div
      className={`card absolute z-20 items-start shadow-float ${className}`}
      data-parallax={parallax}
      style={{ animation: `rise 0.9s cubic-bezier(0.16,1,0.3,1) both`, animationDelay: delay }}
    >
      {children}
    </div>
  )
}

function ReportCard() {
  return (
    <div className="w-60 p-4">
      <div className="flex items-center justify-between">
        <span className="datum text-[0.6rem] uppercase tracking-[0.16em] text-mute">
          Informe de auditoría
        </span>
        <span className="h-2 w-2 rounded-full bg-orbit" />
      </div>
      <p className="mt-3 font-display text-2xl text-ink">3 puntos débiles</p>
      <p className="text-xs text-mute">detectados en tu operativa</p>
      <div className="mt-3 space-y-2">
        <Bar label="Atención" pct="72%" />
        <Bar label="Ventas" pct="54%" />
      </div>
    </div>
  )
}

function Bar({ label, pct }: { label: string; pct: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[0.68rem] text-mute">{label}</span>
        <span className="datum text-[0.68rem] text-ink">{pct}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-paper">
        <div className="h-full rounded-full bg-orbit" style={{ width: pct }} />
      </div>
    </div>
  )
}

function WhatsAppCard() {
  return (
    <div className="w-56 p-4">
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orbit-soft text-orbit">
          <MessageCircle className="h-3.5 w-3.5" />
        </span>
        <span className="datum text-[0.6rem] uppercase tracking-[0.16em] text-mute">
          WhatsApp · auto
        </span>
      </div>
      <div className="mt-3 space-y-1.5">
        <p className="w-fit rounded-2xl rounded-tl-sm bg-paper px-3 py-1.5 text-xs text-ink">
          Hola, ¿tenéis cita hoy?
        </p>
        <p className="ml-auto w-fit rounded-2xl rounded-tr-sm bg-orbit px-3 py-1.5 text-xs text-white">
          Sí, te reservo a las 18:00 ✓
        </p>
      </div>
      <p className="mt-2 text-[0.68rem] text-mute">Respuesta automática · 24/7</p>
    </div>
  )
}

function IntegrationsCard() {
  const rows = ["WhatsApp", "Web a medida", "Automatizaciones"]
  return (
    <div className="w-56 p-4">
      <span className="datum text-[0.6rem] uppercase tracking-[0.16em] text-mute">
        Se implementa en
      </span>
      <ul className="mt-3 space-y-2">
        {rows.map((r) => (
          <li key={r} className="flex items-center gap-2 text-sm text-ink">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orbit-soft text-orbit">
              <Check className="h-3 w-3" />
            </span>
            {r}
          </li>
        ))}
      </ul>
    </div>
  )
}
