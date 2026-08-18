import { lazy, Suspense, useState } from "react"
import { Reveal } from "@/components/Reveal"
import { Button } from "@/components/ui/button"
import { OrbitMark } from "@/components/Logo"
import { scrollToId } from "@/lib/scrollFX"
import { PLANS, priceFor, type Billing, type Plan } from "@/lib/plans"
import { Check, ArrowUpRight, ShieldCheck, Sparkles } from "lucide-react"

const CheckoutModal = lazy(() =>
  import("@/components/checkout/CheckoutModal").then((m) => ({
    default: m.CheckoutModal,
  }))
)

export function Planes() {
  const [billing, setBilling] = useState<Billing>("mensual")
  const [checkout, setCheckout] = useState<{ plan: Plan; billing: Billing } | null>(
    null
  )

  const onChoose = (plan: Plan) => setCheckout({ plan, billing })

  return (
    <section id="planes" className="border-t border-line py-24 sm:py-28">
      <div className="container">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="eyebrow justify-center">Trabajador de IA</p>
          <h2 className="mt-5 text-3xl sm:text-[2.6rem] sm:leading-[1.05]">
            Contrata un empleado de IA.{" "}
            <span className="text-mute">Elige su nivel.</span>
          </h2>
          <p className="mt-5 text-lg text-mute">
            Trabaja 24/7, no se cansa y crece contigo. Empieza pequeño y sube de
            plan cuando lo necesites — sin permanencia.
          </p>
        </Reveal>

        {/* Toggle de facturación */}
        <Reveal className="mt-9 flex items-center justify-center">
          <BillingToggle billing={billing} onChange={setBilling} />
        </Reveal>

        {/* Tarjetas */}
        <div className="mt-12 grid items-stretch gap-6 lg:grid-cols-3">
          {PLANS.map((plan, i) => (
            <Reveal key={plan.id} delay={i * 90} className="h-full">
              <PlanCard plan={plan} billing={billing} onChoose={onChoose} />
            </Reveal>
          ))}
        </div>

        {/* Garantías + enterprise */}
        <Reveal className="mt-10 flex flex-col items-center gap-4 text-center">
          <p className="datum flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[0.68rem] uppercase tracking-[0.14em] text-mute">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-orbit" /> Pago seguro con Stripe
            </span>
            <span aria-hidden>·</span>
            <span>Cancela cuando quieras</span>
            <span aria-hidden>·</span>
            <span>IVA no incluido</span>
          </p>
          <p className="text-sm text-mute">
            ¿Necesitas algo a medida o un volumen mayor?{" "}
            <button
              onClick={() => scrollToId("#contacto")}
              className="font-medium text-orbit underline-offset-4 hover:underline"
            >
              Hablemos de un plan enterprise
            </button>
            .
          </p>
        </Reveal>
      </div>

      {checkout && (
        <Suspense fallback={null}>
          <CheckoutModal
            plan={checkout.plan}
            billing={checkout.billing}
            onClose={() => setCheckout(null)}
          />
        </Suspense>
      )}
    </section>
  )
}

function BillingToggle({
  billing,
  onChange,
}: {
  billing: Billing
  onChange: (b: Billing) => void
}) {
  const opts: Billing[] = ["mensual", "anual"]
  return (
    <div className="relative inline-flex items-center rounded-full border border-line bg-surface p-1 shadow-soft">
      {/* Pastilla deslizante */}
      <span
        className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full bg-ink transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{
          transform:
            billing === "anual" ? "translateX(calc(100% + 8px))" : "translateX(0)",
        }}
        aria-hidden
      />
      {opts.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={`relative z-10 flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium capitalize transition-colors duration-200 ${
            billing === o ? "text-paper" : "text-mute hover:text-ink"
          }`}
        >
          {o}
          {o === "anual" && (
            <span
              className={`datum rounded-full px-1.5 py-0.5 text-[0.6rem] tracking-[0.1em] ${
                billing === "anual"
                  ? "bg-orbit text-white"
                  : "bg-orbit-soft text-orbit"
              }`}
            >
              -17%
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

function PlanCard({
  plan,
  billing,
  onChoose,
}: {
  plan: Plan
  billing: Billing
  onChoose: (p: Plan) => void
}) {
  const price = priceFor(plan, billing)
  const featured = plan.featured

  return (
    <div
      className={`relative flex h-full flex-col rounded-[22px] p-7 transition-all duration-300 sm:p-8 ${
        featured
          ? "border-2 border-orbit bg-surface shadow-float lg:-my-2 lg:py-10"
          : "border border-line bg-surface hover:-translate-y-1 hover:shadow-float"
      }`}
    >
      {featured && (
        <span className="datum absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-orbit px-3 py-1 text-[0.6rem] font-bold uppercase tracking-[0.16em] text-white shadow-[0_8px_20px_-8px_rgba(47,91,255,0.8)]">
          <Sparkles className="mr-1 inline h-3 w-3" /> Más popular
        </span>
      )}

      {/* Identidad del "empleado" */}
      <div className="flex items-center gap-3">
        <span
          className={`relative flex h-11 w-11 items-center justify-center rounded-xl ${
            featured ? "bg-orbit text-white" : "bg-orbit-soft text-orbit"
          }`}
        >
          <OrbitMark className={featured ? "h-6 w-6 text-white" : "h-6 w-6 text-orbit"} />
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-surface" />
        </span>
        <div>
          <p className="font-display text-lg leading-none text-ink">{plan.name}</p>
          <p className="datum mt-1 text-[0.62rem] uppercase tracking-[0.12em] text-mute">
            {plan.role}
          </p>
        </div>
      </div>

      <p className="mt-5 text-sm text-mute">{plan.tagline}</p>

      {/* Precio */}
      <div className="mt-5 flex items-end gap-1.5">
        <span className="mb-1 font-display text-xl text-mute">€</span>
        <span key={`${plan.id}-${billing}`} className="price-anim font-display text-5xl leading-none text-ink">
          {price}
        </span>
        <span className="mb-1.5 text-sm text-mute">/mes</span>
      </div>
      <p className="datum mt-2 h-4 text-[0.62rem] uppercase tracking-[0.12em] text-mute">
        {billing === "anual" ? "Facturado anualmente" : "Facturación mensual"}
      </p>

      <Button
        variant={featured ? "default" : "outline"}
        size="lg"
        className="mt-6 w-full"
        onClick={() => onChoose(plan)}
      >
        {plan.cta}
        <ArrowUpRight />
      </Button>

      {/* Herramientas incluidas */}
      <div className="mt-7 border-t border-line pt-6">
        {plan.inherits && (
          <p className="mb-3 text-xs font-medium text-ink">{plan.inherits}</p>
        )}
        <ul className="space-y-3">
          {plan.features.map((f) => (
            <li key={f} className="flex items-start gap-2.5 text-sm text-ink/90">
              <span
                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                  featured ? "bg-orbit text-white" : "bg-orbit-soft text-orbit"
                }`}
              >
                <Check className="h-2.5 w-2.5" strokeWidth={3} />
              </span>
              {f}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
