import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
    // Rutas relativas para que la demo funcione en subrutas (GitHub Pages)
    base: "./",
    plugins: [react()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    server: { port: 5174, host: true },
});
