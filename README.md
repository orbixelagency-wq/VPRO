# Oblivion Barbers & Care — Web

Sitio web _one-page_ para **Oblivion Barbers & Care**, cadena de barberías y
centros de estética masculina en **Menorca**, con locales en **Es Castell
(Villacarlos)**, **Mahón** y **Ciutadella**.

## Características

- **Hero-póster** con tipografía condensada gigante (Anton) sobre retrato de
  marca velado, en la línea de las referencias de barbería premium.
- Estética oscura de alta gama: onyx cálido + acento latón/oro, con detalle
  editorial en serif (**Cormorant Garamond**) y texto en **Inter**.
- Secciones: Filosofía (concepto _Care_), Servicios, Experiencia, Locales
  (los tres puntos de la isla) y Reservas.
- **Reservas online**: enlaces a la plataforma oficial **Yeasy** y a **Fresha**
  (Mahón / Villacarlos).
- Animaciones de entrada sobrias, accesibles y con soporte de
  `prefers-reduced-motion`.

## Stack

Vite · React 18 · TypeScript · Tailwind CSS · estructura shadcn.

## Desarrollo

```bash
npm install
npm run dev      # http://localhost:5174
npm run build    # build de producción en /dist
```

## Assets oficiales de marca

Las fotos e imágenes oficiales van en `public/brand/` (ver
`public/brand/README.md` para los nombres de archivo esperados). Mientras no
existan, se muestra un placeholder de marca, así que la web funciona sin ellas.

## Enlaces de reserva

Los botones de reserva apuntan a Yeasy y Fresha en
`src/components/sections/Reservas.tsx`. Sustituye las URLs genéricas por los
enlaces directos de cada local cuando estén disponibles.

## Demo online (GitHub Pages)

El workflow `.github/workflows/deploy.yml` publica la demo en GitHub Pages en
cada push a `main`. Para activarlo: **Settings → Pages → Source: GitHub Actions**.
