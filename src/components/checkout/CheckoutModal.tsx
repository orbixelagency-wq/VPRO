import { useEffect, useState } from "react"
import { loadStripe, type Stripe } from "@stripe/stripe-js"
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js"
import {
  priceFor,
  STRIPE_PK,
  CHECKOUT_ENDPOINT,
  PAYMENTS_LIVE,
  type Plan,
  type Billing,
} from "@/lib/plans"
import { Button } from "@/components/ui/button"
import { OrbitMark } from "@/components/Logo"
import { X, Check, ShieldCheck, Loader2, Lock } from "lucide-react"

let stripePromise: Promise<Stripe | null> | null = null
const getStripe = () => {
  if (!stripePromise && STRIPE_PK) stripePromise = loadStripe(STRIPE_PK)
  return stripePromise
}

type Status = "loading" | "ready" | "error"

export function CheckoutModal({
  plan,
  billing,
  onClose,
}: {
  plan: Plan
  billing: Billing
  onClose: () => void
}) {
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [status, setStatus] = useState<Status>(PAYMENTS_LIVE ? "loading" : "ready")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

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

  // Modo real: pide el client_secret a la función serverless.
  useEffect(() => {
    if (!PAYMENTS_LIVE) return
    let cancel = false
    ;(async () => {
      try {
        const res = await fetch(CHECKOUT_ENDPOINT as string, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planId: plan.id, billing }),
        })
        if (!res.ok) throw new Error("No se pudo iniciar el pago")
        const data = await res.json()
        if (cancel) return
        setClientSecret(data.clientSecret)
        setStatus("ready")
      } catch (e) {
        if (cancel) return
        setErrorMsg((e as Error).message)
        setStatus("error")
      }
    })()
    return () => {
      cancel = true
    }
  }, [plan.id, billing])

  const price = priceFor(plan, billing)

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`Contratar plan ${plan.name}`}
    >
      {/* Backdrop */}
      <div
        className="ck-backdrop absolute inset-0 bg-void/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
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
                Total {billing === "anual" ? "/ mes · anual" : "/ mes"}
              </span>
              <span className="font-display text-3xl text-paper">€{price}</span>
            </div>
            <p className="datum mt-2 text-[0.6rem] uppercase tracking-[0.14em] text-paper/40">
              {billing === "anual"
                ? "Facturación anual · IVA no incluido"
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
            <span className="font-display text-xl text-ink">€{price}/mes</span>
          </div>

          {PAYMENTS_LIVE ? (
            status === "loading" ? (
              <Loading />
            ) : status === "error" ? (
              <ErrorState message={errorMsg} onRetry={onClose} />
            ) : (
              <Elements
                stripe={getStripe()}
                options={{ clientSecret: clientSecret!, appearance: stripeAppearance }}
              >
                <StripeForm price={price} onDone={onClose} />
              </Elements>
            )
          ) : (
            <DemoForm plan={plan} price={price} />
          )}
        </section>
      </div>
    </div>
  )
}

/* ---------- Estados auxiliares ---------- */

function Loading() {
  return (
    <div className="flex flex-1 items-center justify-center py-16 text-mute">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span className="ml-2 text-sm">Preparando el pago seguro…</span>
    </div>
  )
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string | null
  onRetry: () => void
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-14 text-center">
      <p className="text-sm text-ink">{message || "Ha ocurrido un error."}</p>
      <p className="mt-1 text-xs text-mute">
        Inténtalo de nuevo o escríbenos a orbixel.agency@gmail.com
      </p>
      <Button variant="outline" className="mt-5" onClick={onRetry}>
        Cerrar
      </Button>
    </div>
  )
}

function SuccessState({ demo }: { demo?: boolean }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-orbit text-white">
        <Check className="h-7 w-7" strokeWidth={3} />
      </span>
      <h4 className="mt-5 font-display text-2xl text-ink">
        {demo ? "Pago de prueba completado" : "¡Bienvenido a bordo!"}
      </h4>
      <p className="mt-2 max-w-xs text-sm text-mute">
        {demo
          ? "Esto es una simulación. Cuando conectes tu cuenta de Stripe, el cobro será real."
          : "Tu empleado de IA se está activando. Te enviamos los siguientes pasos por email."}
      </p>
    </div>
  )
}

/* ---------- Formulario real (Stripe) ---------- */

function StripeForm({ price, onDone }: { price: number; onDone: () => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const [processing, setProcessing] = useState(false)
  const [succeeded, setSucceeded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return
    setProcessing(true)
    setError(null)
    const { error } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    })
    if (error) {
      setError(error.message || "No se pudo procesar el pago.")
      setProcessing(false)
    } else {
      setSucceeded(true)
    }
  }

  if (succeeded) return <SuccessState />

  return (
    <form onSubmit={onSubmit} className="flex flex-1 flex-col">
      <PaymentElement options={{ layout: "tabs" }} />
      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      <Button type="submit" size="lg" className="mt-6 w-full" disabled={processing}>
        {processing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Procesando…
          </>
        ) : (
          <>Pagar €{price} / mes</>
        )}
      </Button>
      <SecureFooter onCancel={onDone} />
    </form>
  )
}

/* ---------- Formulario demo (sin cobro) ---------- */

function DemoForm({ plan, price }: { plan: Plan; price: number }) {
  const [processing, setProcessing] = useState(false)
  const [succeeded, setSucceeded] = useState(false)

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setProcessing(true)
    setTimeout(() => setSucceeded(true), 1500)
  }

  if (succeeded) return <SuccessState demo />

  return (
    <form onSubmit={onSubmit} className="flex flex-1 flex-col">
      <div className="mb-4 flex items-start gap-2 rounded-xl border border-orbit/20 bg-orbit-soft px-3.5 py-2.5 text-[0.78rem] text-orbit-ink">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-orbit" />
        <span>
          <strong>Modo demostración.</strong> El cobro aún no está activo — esto
          es una simulación con tarjeta de prueba, no se cargará nada.
        </span>
      </div>

      <div className="space-y-3">
        <DemoField label="Email" defaultValue="cliente@empresa.com" />
        <DemoField label="Titular de la tarjeta" defaultValue="Nombre Apellido" />
        <DemoField label="Número de tarjeta" defaultValue="4242 4242 4242 4242" mono />
        <div className="grid grid-cols-2 gap-3">
          <DemoField label="Caducidad" defaultValue="12 / 30" mono />
          <DemoField label="CVC" defaultValue="123" mono />
        </div>
      </div>

      <Button type="submit" size="lg" className="mt-6 w-full" disabled={processing}>
        {processing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Procesando…
          </>
        ) : (
          <>Pagar €{price} / mes · {plan.name}</>
        )}
      </Button>
      <SecureFooter />
    </form>
  )
}

function DemoField({
  label,
  defaultValue,
  mono,
}: {
  label: string
  defaultValue: string
  mono?: boolean
}) {
  return (
    <label className="block">
      <span className="datum mb-1 block text-[0.62rem] uppercase tracking-[0.14em] text-mute">
        {label}
      </span>
      <input
        defaultValue={defaultValue}
        className={`field ${mono ? "datum" : ""}`}
        aria-label={label}
      />
    </label>
  )
}

function SecureFooter({ onCancel }: { onCancel?: () => void }) {
  return (
    <div className="mt-4 flex items-center justify-center gap-2 text-[0.68rem] text-mute">
      <ShieldCheck className="h-3.5 w-3.5 text-orbit" />
      <span>Protegido con cifrado de extremo a extremo · Stripe</span>
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="ml-1 underline underline-offset-2 hover:text-ink"
        >
          Cancelar
        </button>
      )}
    </div>
  )
}

const stripeAppearance = {
  theme: "flat" as const,
  variables: {
    colorPrimary: "#2F5BFF",
    colorText: "#12141A",
    colorBackground: "#ffffff",
    fontFamily: "Inter, system-ui, sans-serif",
    borderRadius: "12px",
  },
}
