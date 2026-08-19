import { Button } from "@/components/ui/button"
import { OrbitMark } from "@/components/Logo"
import { priceFor, type Billing, type Plan } from "@/lib/plans"
import { Check, ArrowUpRight, Sparkles } from "lucide-react"

/** Tarjeta de plan. `flat` desactiva el realce por margen (útil en carrusel). */
export function PlanCard({
  plan,
  billing,
  onChoose,
  flat = false,
}: {
  plan: Plan
  billing: Billing
  onChoose: (p: Plan) => void
  flat?: boolean
}) {
  const price = priceFor(plan, billing)
  const featured = plan.featured

  return (
    <div
      className={`relative flex h-full flex-col rounded-[22px] p-7 transition-shadow duration-300 sm:p-8 ${
        featured
          ? `border-2 border-orbit bg-surface shadow-float ${flat ? "" : "lg:-my-2 lg:py-10"}`
          : "border border-line bg-surface"
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
        <span
          key={`${plan.id}-${billing}`}
          className="price-anim font-display text-5xl leading-none text-ink"
        >
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
