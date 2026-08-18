# Orbixel — Web corporativa

Sitio web _one-page_ de **Orbixel**, agencia de inteligencia artificial que
**audita** el negocio del cliente para detectar dónde pierde tiempo, ventas y
eficiencia, y después **implementa** las soluciones de IA que lo resuelven
(automatizaciones, WhatsApp, web e integraciones a medida).

## Diseño

Minimalista y tecnológico. Base clara con acento azul órbita y una banda oscura
de contraste.

- **Firma visual:** un _escáner orbital_ — el negocio en el centro y un nodo que
  recorre la órbita mientras un barrido de radar "detecta" los puntos débiles.
  Encarna el nombre (orbit + pixel) y la acción central del servicio.
- **Tipografía:** Space Grotesk (display) · Inter (texto) · Space Mono (datos),
  auto-alojadas con Fontsource (sin dependencia de CDN).
- **Paleta:** `paper #F5F6F8`, `surface #FFFFFF`, `ink #12141A`, `mute #737884`,
  acento `orbit #2F5BFF`, banda oscura `void #0B0D12`.

## Secciones

Hero · Modelo (Fase 1 Auditoría → Fase 2 Aplicación) · Servicios · Propuesta de
valor · Planes (trabajador de IA) · Proceso · Contacto.

## Planes y checkout embebido (Stripe)

La sección **Planes** ofrece un "trabajador de IA" en tres niveles (Asistente,
Operativo, Unlimited) con toggle mensual/anual. Al elegir un plan se abre un
**checkout embebido en la propia web** (Stripe Payment Element, sin salir a otra
página).

Como GitHub Pages sólo sirve ficheros estáticos, el cobro real necesita **una
pequeña función serverless** (la clave secreta de Stripe nunca va en el
frontend). Incluida en `api/create-subscription.js` — despliégala en Vercel,
Netlify o Cloudflare Workers.

Para activar el pago real:

1. Despliega `api/create-subscription.js` y configura en su servidor
   `STRIPE_SECRET_KEY`, los `PRICE_*` (ids de precio recurrente de Stripe) y
   `ALLOWED_ORIGIN`.
2. En el build del frontend define `VITE_STRIPE_PUBLISHABLE_KEY` y
   `VITE_CHECKOUT_ENDPOINT` (ver `.env.example`).

Sin esas variables, el checkout funciona en **modo demo** (simulación con tarjeta
de prueba, claramente etiquetada, sin cobro) para poder mostrar el flujo. Como
alternativa sin backend, `src/lib/plans.ts` también admite **Stripe Payment
Links** por plan (`VITE_PAY_*`).

## Animaciones y scroll

Scroll suave con inercia (**Lenis**) sincronizado con **GSAP ScrollTrigger**:
parallax de las tarjetas del hero, revelados "scrubbed" de los bloques oscuros y
transiciones al entrar en viewport. Todo se desactiva con
`prefers-reduced-motion`.

## Stack

Vite · React 18 · TypeScript · Tailwind CSS · lucide-react.

## Desarrollo

```bash
npm install
npm run dev      # servidor de desarrollo
npm run build    # build de producción en /dist
npm run preview  # sirve el build
```

## Demo online (GitHub Pages)

El workflow `.github/workflows/deploy.yml` publica la demo en GitHub Pages en
cada push a `main`. Para activarlo: **Settings → Pages → Source: GitHub Actions**.
