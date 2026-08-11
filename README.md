# Scoundrels Barbers — Web

Sitio web de **Scoundrels Barbers**, barbería con locales en **Girona** y **Figueres**.
Presenta la marca, los servicios, los dos locales con horarios y un formulario de contacto.

## Stack

- **Vite** + **React 18** + **TypeScript**
- **Tailwind CSS** para el sistema de diseño
- **lucide-react** para iconografía
- Sin backend: el formulario de contacto abre el correo del cliente (`mailto:`)

## Diseño

- **Paleta:** tinta cálida (`#14100E`), papel de flash (`#ECE3D0`), neón rojo (`#F5361F`), rosa (`#C22A1C`) y latón (`#C9A24B`).
- **Tipografías (Google Fonts):** `Alfa Slab One` (display), `Yellowtail` (rótulo script), `Barlow` / `Barlow Condensed` (texto y etiquetas).
- **Detalle de firma:** el rótulo "Scoundrels" del hero se enciende como un neón al cargar la página — "encendimos las luces".
- Reveal al hacer scroll, poste de barbero animado y badge de **abierto / cerrado en vivo** por local (zona horaria Europe/Madrid).

## Estructura

```
src/
  App.tsx                 layout general
  index.css               sistema de diseño (tokens, neón, reveal)
  lib/
    content.ts            datos del negocio (servicios, locales, contacto)
    useReveal.ts          hook de reveal al hacer scroll
  components/
    Navbar.tsx  Brand.tsx
    sections/  Hero · About · Services · Locations · Contact · Footer
```

Para actualizar servicios, horarios o teléfonos, edita **`src/lib/content.ts`**.

## Desarrollo

```bash
npm install
npm run dev       # servidor de desarrollo
npm run build     # build de producción a /dist
npm run preview   # sirve el build
```
