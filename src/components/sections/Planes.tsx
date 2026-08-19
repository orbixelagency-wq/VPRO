import { useState } from "react"
import { Reveal } from "@/components/Reveal"
import { CheckoutModal } from "@/components/checkout/CheckoutModal"
import { PlanesCarousel } from "@/components/planes/PlanesCarousel"
import { scrollToId } from "@/lib/scrollFX"
import { PLANS, type Billing, type Plan } from "@/lib/plans"
import { ShieldCheck } from "lucide-react"

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

        {/* Carrusel de planes (arrastra o usa las flechas) */}
        <Reveal className="mt-10">
          <PlanesCarousel plans={PLANS} billing={billing} onChoose={onChoose} />
        </Reveal>

        {/* Garantías + enterprise */}
        <Reveal className="mt-10 flex flex-col items-center gap-4 text-center">
          <p className="datum flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[0.68rem] uppercase tracking-[0.14em] text-mute">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-orbit" /> Pago seguro con Shopify
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
        <CheckoutModal
          plan={checkout.plan}
          billing={checkout.billing}
          onClose={() => setCheckout(null)}
        />
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
