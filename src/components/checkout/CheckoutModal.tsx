import { useEffect, useState } from "react"
import {
  priceFor,
  checkoutUrl,
  ACCOUNT_URLS,
  type Plan,
  type Billing,
} from "@/lib/plans"
import { Button } from "@/components/ui/button"
import { OrbitMark } from "@/components/Logo"
import { X, Check, ShieldCheck, Lock, ArrowUpRight, Loader2, UserPlus } from "lucide-react"

export function CheckoutModal({
  plan,
  billing,
  onClose,
}: {
  plan: Plan
  billing: Billing
  onClose: () => void
}) {
  const [redirecting, setRedirecting] = useState(false)
  const price = priceFor(plan, billing)
  const total = billing === "anual" ? plan.monthly * 10 : plan.monthly

  // Bloquea el scroll de fondo (y Lenis) mientras el modal está abierto.
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    window.__lenis?.stop()
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = prev
      window.__lenis?.start()
      window.removeEventListener("keydown", onKey)
    }
  }, [onClose])

  const goToCheckout = () => {
    setRedirecting(true)
    window.location.href = checkoutUrl(plan, billing)
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`Contratar plan ${plan.name}`}
    >
      <div
        className="ck-backdrop absolute inset-0 bg-void/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="ck-panel relative z-10 grid max-h-[94vh] w-full max-w-3xl grid-cols-1 overflow-hidden rounded-t-[24px] bg-surface shadow-float sm:rounded-[24px] md:grid-cols-[1fr_1.05fr]">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-paper/80 text-ink transition-colors hover:bg-paper md:text-paper/70 md:hover:text-paper"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Resumen del pedido */}
        <aside className="relative hidden flex-col justify-between bg-void p-8 text-paper md:flex">
          <div className="dotgrid-dark pointer-events-none absolute inset-0 opacity-60" />
          <div className="relative">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.05] ring-1 ring-line-dark">
              <OrbitMark className="h-5 w-5 text-paper" />
            </span>
            <p className="datum mt-6 text-[0.62rem] uppercase tracking-[0.16em] text-orbit">
              Plan {plan.name}
            </p>
            <h3 className="mt-1 font-display text-2xl text-paper">{plan.role}</h3>
            <p className="mt-2 text-sm text-paper/55">{plan.tagline}</p>

            <ul className="mt-6 space-y-2.5">
              {plan.features.slice(0, 4).map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-paper/80">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-orbit text-white">
                    <Check className="h-2.5 w-2.5" strokeWidth={3} />
                  </span>
                  {f}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative mt-8 border-t border-line-dark pt-5">
            <div className="flex items-end justify-between">
              <span className="text-sm text-paper/60">
                {billing === "anual" ? "Hoy · 1 año" : "Hoy · 1 mes"}
              </span>
              <span className="font-display text-3xl text-paper">€{total}</span>
            </div>
            <p className="datum mt-2 text-[0.6rem] uppercase tracking-[0.14em] text-paper/40">
              {billing === "anual"
                ? `Equivale a €${price}/mes · IVA no incluido`
                : "Facturación mensual · IVA no incluido"}
            </p>
          </div>
        </aside>

        {/* Pago */}
        <section className="flex flex-col overflow-y-auto p-6 sm:p-8">
          <header className="mb-5">
            <h3 className="font-display text-xl text-ink">Finalizar contratación</h3>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-mute">
              <Lock className="h-3 w-3" /> Pago cifrado y seguro
            </p>
          </header>

          {/* Resumen compacto (móvil) */}
          <div className="mb-5 flex items-center justify-between rounded-xl border border-line bg-paper px-4 py-3 md:hidden">
            <div>
              <p className="text-sm font-medium text-ink">Plan {plan.name}</p>
              <p className="datum text-[0.6rem] uppercase tracking-[0.12em] text-mute">
                {billing}
              </p>
            </div>
            <span className="font-display text-xl text-ink">€{total}</span>
          </div>

          <div className="flex flex-1 flex-col">
            {/* Desglose */}
            <div className="rounded-xl border border-line bg-paper p-4">
              <Row label={`Plan ${plan.name}`} value={`€${total}`} />
              <Row
                label="Periodo"
                value={billing === "anual" ? "Anual (2 meses gratis)" : "Mensual"}
                muted
              />
              <div className="my-3 h-px bg-line" />
              <Row label="Total a pagar hoy" value={`€${total}`} strong />
            </div>

            <p className="mt-4 text-sm text-mute">
              Te llevamos al <strong className="text-ink">pago seguro de Orbixel</strong>{" "}
              para completar la compra con tarjeta o los métodos de pago
              disponibles en la tienda.
            </p>

            {/* Cuenta de cliente */}
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-line bg-paper px-3.5 py-2.5 text-[0.8rem] text-ink">
              <UserPlus className="mt-0.5 h-4 w-4 shrink-0 text-orbit" />
              <span>
                Crea tu cuenta al pagar para gestionar tu suscripción.{" "}
                <a
                  href={ACCOUNT_URLS.login}
                  className="font-medium text-orbit underline-offset-2 hover:underline"
                >
                  ¿Ya tienes cuenta? Inicia sesión
                </a>
              </span>
            </div>

            <div className="datum mt-3 flex flex-wrap gap-1.5">
              {["Visa", "Mastercard", "Amex", "Apple Pay", "Google Pay"].map((m) => (
                <span
                  key={m}
                  className="rounded-md border border-line bg-surface px-2 py-1 text-[0.62rem] uppercase tracking-[0.08em] text-mute"
                >
                  {m}
                </span>
              ))}
            </div>

            <Button
              size="lg"
              className="mt-6 w-full"
              onClick={goToCheckout}
              disabled={redirecting}
            >
              {redirecting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Redirigiendo…
                </>
              ) : (
                <>
                  Ir al pago seguro · €{total}
                  <ArrowUpRight />
                </>
              )}
            </Button>

            <div className="mt-4 flex items-center justify-center gap-2 text-[0.68rem] text-mute">
              <ShieldCheck className="h-3.5 w-3.5 text-orbit" />
              <span>Pago procesado de forma segura por Shopify</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

function Row({
  label,
  value,
  strong,
  muted,
}: {
  label: string
  value: string
  strong?: boolean
  muted?: boolean
}) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className={`text-sm ${muted ? "text-mute" : "text-ink"}`}>{label}</span>
      <span
        className={`${strong ? "font-display text-lg" : "text-sm"} ${
          muted ? "text-mute" : "text-ink"
        }`}
      >
        {value}
      </span>
    </div>
  )
}
