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
valor · Proceso · Contacto.

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
