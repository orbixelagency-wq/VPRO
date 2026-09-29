import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { viteSingleFile } from "vite-plugin-singlefile"

// `npm run build:single` genera un único index.html autocontenido (para
// compartirlo o abrirlo sin servidor). El build normal es una PWA estándar.
export default defineConfig(({ mode }) => ({
  base: "./",
  plugins: [react(), ...(mode === "single" ? [viteSingleFile()] : [])],
  build: { outDir: mode === "single" ? "dist-single" : "dist" },
  server: { port: 5175, host: true },
}))
