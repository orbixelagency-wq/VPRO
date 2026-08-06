/**
 * Resuelve rutas de assets de /public respetando el base de Vite.
 * Necesario para que la demo funcione en subrutas (GitHub Pages).
 *   asset("/media/x.mp4")  ->  dev: "/media/x.mp4"  ·  prod: "./media/x.mp4"
 */
export const asset = (p: string) =>
  `${import.meta.env.BASE_URL}${p.replace(/^\/+/, "")}`
