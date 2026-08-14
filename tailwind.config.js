/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: { "2xl": "1320px" },
    },
    extend: {
      colors: {
        // Oblivion — barbería minimalista: blanco & negro (negro dominante)
        carbon: "#080808", // fondo (negro)
        graphite: {
          DEFAULT: "#101010", // paneles
          2: "#181818", // paneles elevados
        },
        chalk: "#F2F2F2", // texto blanco
        ash: "#9A9A9A", // texto atenuado (gris)
        steel: "#5F5F5F", // etiquetas / meta (gris medio)
        ember: {
          DEFAULT: "#FFFFFF", // acento (blanco)
          2: "#DCDCDC", // hover (gris claro)
        },
        gold: "#CFCFCF", // realce (gris claro)
        line: "rgba(255,255,255,0.10)",
        // semánticos para shadcn
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        border: "hsl(var(--border))",
        ring: "hsl(var(--ring))",
      },
      fontFamily: {
        display: ['"Anton"', '"Oswald"', "Impact", "sans-serif"],
        serif: ['"Cormorant Garamond"', "Georgia", "serif"],
        sans: ['"Inter"', "system-ui", "sans-serif"],
      },
      letterSpacing: {
        widest2: "0.32em",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
      },
    },
  },
  plugins: [],
}
