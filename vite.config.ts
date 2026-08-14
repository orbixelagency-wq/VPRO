import path from "path"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig({
  // Rutas relativas para que la demo funcione en subrutas (GitHub Pages)
  base: "./",
  // Incrusta assets pequeños/medianos (p. ej. la silla del hero) como data URI
  // para que la portada funcione también como archivo único.
  build: { assetsInlineLimit: 600 * 1024 },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: { port: 5174, host: true },
})
