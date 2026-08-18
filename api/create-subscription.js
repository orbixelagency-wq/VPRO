/**
 * Orbixel — creación de suscripción para el checkout embebido.
 *
 * Esta función serverless NO puede vivir en GitHub Pages (que sólo sirve
 * ficheros estáticos). Despliégala en Vercel, Netlify o Cloudflare Workers
 * y apunta VITE_CHECKOUT_ENDPOINT (en el build del frontend) a su URL.
 *
 * Requiere estas variables de entorno en el servidor:
 *   STRIPE_SECRET_KEY            sk_live_… (o sk_test_…)
 *   PRICE_ASISTENTE_MENSUAL      price_…   (id de precio recurrente de Stripe)
 *   PRICE_ASISTENTE_ANUAL        price_…
 *   PRICE_OPERATIVO_MENSUAL      price_…
 *   PRICE_OPERATIVO_ANUAL        price_…
 *   PRICE_UNLIMITED_MENSUAL      price_…
 *   PRICE_UNLIMITED_ANUAL        price_…
 *   ALLOWED_ORIGIN               https://orbixelagency-wq.github.io (para CORS)
 *
 * Instala la dependencia en el proyecto de la función:  npm i stripe
 *
 * Formato compatible con Vercel (export default handler(req, res)).
 * Para Cloudflare Workers / Netlify, adapta la firma pero conserva la lógica.
 */
const Stripe = require("stripe")

const PRICE_MAP = {
  asistente: {
    mensual: process.env.PRICE_ASISTENTE_MENSUAL,
    anual: process.env.PRICE_ASISTENTE_ANUAL,
  },
  operativo: {
    mensual: process.env.PRICE_OPERATIVO_MENSUAL,
    anual: process.env.PRICE_OPERATIVO_ANUAL,
  },
  unlimited: {
    mensual: process.env.PRICE_UNLIMITED_MENSUAL,
    anual: process.env.PRICE_UNLIMITED_ANUAL,
  },
}

module.exports = async function handler(req, res) {
  // CORS
  const origin = process.env.ALLOWED_ORIGIN || "*"
  res.setHeader("Access-Control-Allow-Origin", origin)
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")
  if (req.method === "OPTIONS") return res.status(204).end()
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" })

  try {
    const stripe = Stripe(process.env.STRIPE_SECRET_KEY)
    const { planId, billing, email } = req.body || {}
    const price = PRICE_MAP[planId] && PRICE_MAP[planId][billing]
    if (!price) return res.status(400).json({ error: "Plan o periodo no válido" })

    // Cliente (mínimo). En producción, reutiliza el cliente por email.
    const customer = await stripe.customers.create(
      email ? { email } : undefined
    )

    // Suscripción incompleta: devuelve el PaymentIntent para confirmar
    // el pago con el Payment Element en el frontend.
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price }],
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      expand: ["latest_invoice.payment_intent"],
    })

    const clientSecret =
      subscription.latest_invoice.payment_intent.client_secret

    return res.status(200).json({
      clientSecret,
      subscriptionId: subscription.id,
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: "No se pudo crear la suscripción" })
  }
}
