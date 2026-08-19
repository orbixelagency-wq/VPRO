/* ===========================================================
   Planes del "trabajador de IA" de Orbixel + checkout Shopify.

   El pago se procesa en el checkout seguro de Shopify (orbixel.es).
   Cada plan/periodo apunta a una variante real del catálogo; el
   botón lleva al checkout de esa variante. No hay claves ni secretos
   en el frontend: sólo el dominio (público) y los IDs de variante.
   =========================================================== */

export type Billing = "mensual" | "anual"

export interface Plan {
  id: "asistente" | "operativo" | "unlimited"
  name: string
  role: string
  tagline: string
  /** Precio mensual base (EUR). El anual muestra ~2 meses gratis. */
  monthly: number
  featured?: boolean
  cta: string
  features: string[]
  /** Lo que suma respecto al plan anterior (encabeza la lista). */
  inherits?: string
  /** IDs numéricos de variante de Shopify por periodo. */
  variants: Record<Billing, string>
}

/** Dominio de la tienda Shopify (checkout). */
export const SHOPIFY_DOMAIN = "orbixel.es"

/** Cuenta de cliente nativa de Shopify. /account redirige al portal
 *  correcto (nuevas cuentas de cliente: acceso por email + código). */
export const ACCOUNT_URLS = {
  login: `https://${SHOPIFY_DOMAIN}/account`,
  register: `https://${SHOPIFY_DOMAIN}/account`,
  account: `https://${SHOPIFY_DOMAIN}/account`,
}

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
    variants: { mensual: "54613899018577", anual: "54613899051345" },
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
    variants: { mensual: "54613902983505", anual: "54613903016273" },
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
    variants: { mensual: "54613904949585", anual: "54613904982353" },
  },
]

/** Precio a mostrar según periodo (el anual ≈ 2 meses gratis). */
export function priceFor(plan: Plan, billing: Billing): number {
  if (billing === "anual") return Math.round((plan.monthly * 10) / 12)
  return plan.monthly
}

/** URL de checkout de Shopify para la variante del plan/periodo. */
export function checkoutUrl(plan: Plan, billing: Billing): string {
  const variant = plan.variants[billing]
  return `https://${SHOPIFY_DOMAIN}/cart/${variant}:1`
}
