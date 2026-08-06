# V PRO Total Training — Web corporativa

Sitio web institucional _one-page_ cinematico para **V PRO Total Training**,
centro de tecnificacion y alto rendimiento de futbol con sedes en **Girona** y **Olot**.

## Caracteristicas

- **Hero con video controlado por scroll** (scroll-driven scrubbing): la linea de
  tiempo del video se vincula al desplazamiento y se funde con fotografias de
  rendimiento mientras se revela informacion corporativa con parallax.
- Estetica corporativa sobria de alta gama (fondo `#0b0f19`, acentos naranja,
  tipografia **Syne** + **Inter**).
- Secciones: Filosofia, Programa, Sedes (Girona / Olot), Metodo, Talento y Contacto.
- 100% enfoque institucional y de contacto directo (sin reservas online).

## Stack

Vite · React 18 · TypeScript · Tailwind CSS · estructura shadcn.

## Desarrollo

```bash
npm install
npm run dev      # http://localhost:5174
npm run build    # build de produccion en /dist
```

## Assets oficiales de marca

Las fotos e imagenes oficiales van en `public/brand/` (ver
`public/brand/README.md` para los nombres de archivo esperados). Mientras no
existan, se muestra un placeholder de marca. El video del hero esta en
`public/media/vpro-hero.mp4`.

## Demo online (GitHub Pages)

El workflow `.github/workflows/deploy.yml` publica automaticamente la demo en
GitHub Pages en cada push a `main`. Para activarlo: **Settings → Pages → Source:
GitHub Actions**.
