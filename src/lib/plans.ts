/* ===========================================================
   Planes del "trabajador de IA" de Orbixel + pasarela de pago.

   PAGO REAL (sin backend): usamos Stripe Payment Links. Cada plan
   tiene un enlace de pago por periodo (mensual / anual). Para
   activarlos, crea los Payment Links en tu panel de Stripe
   (Productos → precio recurrente → "Payment link") y pega las URLs
   aquí abajo, o defínelas como variables de entorno en el build:

     VITE_PAY_ASISTENTE_MENSUAL, VITE_PAY_ASISTENTE_ANUAL,
     VITE_PAY_OPERATIVO_MENSUAL, VITE_PAY_OPERATIVO_ANUAL,
     VITE_PAY_UNLIMITED_MENSUAL, VITE_PAY_UNLIMITED_ANUAL

   Mientras un enlace esté vacío, el botón del plan lleva al
   formulario de contacto con el plan preseleccionado.
   =========================================================== */

export type Billing = "mensual" | "anual"

export interface Plan {
  id: "asistente" | "operativo" | "unlimited"
  name: string
  role: string
  tagline: string
  /** Precio mensual base (EUR). El anual aplica ~2 meses gratis. */
  monthly: number
  featured?: boolean
  cta: string
  features: string[]
  /** Lo que suma respecto al plan anterior (encabeza la lista). */
  inherits?: string
  links: Record<Billing, string>
}

const env = import.meta.env as Record<string, string | undefined>

export const PLANS: Plan[] = [
  {
    id: "asistente",
    name: "Asistente",
    role: "Tu primer empleado de IA",
    tagline: "Atiende y responde por ti, 24/7.",
    monthly: 49,
    cta: "Contratar Asistente",
    features: [
      "Atención al cliente por WhatsApp (1 canal)",
      "Respuestas automáticas 24/7",
      "Hasta 500 conversaciones / mes",
      "Base de conocimiento de tu negocio",
      "Informe de actividad mensual",
    ],
    links: {
      mensual: env.VITE_PAY_ASISTENTE_MENSUAL ?? "",
      anual: env.VITE_PAY_ASISTENTE_ANUAL ?? "",
    },
  },
  {
    id: "operativo",
    name: "Operativo",
    role: "El empleado que ya vende",
    tagline: "Atiende, cualifica y hace seguimiento.",
    monthly: 149,
    featured: true,
    cta: "Contratar Operativo",
    inherits: "Todo lo del Asistente, y además:",
    features: [
      "Multicanal: WhatsApp, web y email",
      "Hasta 3.000 conversaciones / mes",
      "Seguimiento y recordatorios automáticos",
      "Cualificación de leads y agenda de citas",
      "Integración con tu CRM y calendario",
      "Panel de analíticas en tiempo real",
      "Soporte prioritario",
    ],
    links: {
      mensual: env.VITE_PAY_OPERATIVO_MENSUAL ?? "",
      anual: env.VITE_PAY_OPERATIVO_ANUAL ?? "",
    },
  },
  {
    id: "unlimited",
    name: "Unlimited",
    role: "Un equipo de IA completo",
    tagline: "Sin límites, con acciones proactivas.",
    monthly: 349,
    cta: "Contratar Unlimited",
    inherits: "Todo lo del Operativo, y además:",
    features: [
      "Conversaciones y canales ilimitados",
      "Acciones proactivas: ventas y upselling",
      "Automatizaciones e integraciones a medida",
      "Entrenamiento personalizado del modelo",
      "Gestor de cuenta dedicado",
      "SLA y soporte 24/7",
    ],
    links: {
      mensual: env.VITE_PAY_UNLIMITED_MENSUAL ?? "",
      anual: env.VITE_PAY_UNLIMITED_ANUAL ?? "",
    },
  },
]

/** Precio a mostrar según periodo (el anual ≈ 2 meses gratis). */
export function priceFor(plan: Plan, billing: Billing): number {
  if (billing === "anual") return Math.round((plan.monthly * 10) / 12)
  return plan.monthly
}

/** Enlace de checkout de Stripe si está configurado. */
export function checkoutUrl(plan: Plan, billing: Billing): string {
  return plan.links[billing] || ""
}
