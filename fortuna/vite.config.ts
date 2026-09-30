import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  worker: { format: 'es' },
  // El motor 3D (Three.js + Rapier con su WASM embebido) va en un trozo aparte de ~5 MB que se
  // carga al entrar en la ciudad; la interfaz inicial pesa ~260 KB.
  build: { target: 'es2022', sourcemap: true, chunkSizeWarningLimit: 6000 },
  server: { port: 5173 },
});
