import path from "path"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

/**
 * Build para incrustar la web dentro de un tema de Shopify.
 * Genera un único `orbixel.js` (IIFE, script clásico → sin CORS desde el
 * CDN de Shopify) y un `orbixel.css`. Las fuentes quedan como archivos
 * con hash (un post-proceso las incrusta como data URIs en el CSS).
 * Salida en dist-shopify/.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  build: {
    outDir: "dist-shopify",
    cssCodeSplit: false,
    assetsInlineLimit: 0,
    rollupOptions: {
      input: path.resolve(__dirname, "src/main.tsx"),
      output: {
        format: "iife",
        inlineDynamicImports: true,
        entryFileNames: "orbixel.js",
        assetFileNames: (info) => {
          const name = info.name || ""
          if (name.endsWith(".css")) return "orbixel.css"
          return "fonts/[name]-[hash][extname]"
        },
      },
    },
  },
})
