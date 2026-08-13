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
        // Oblivion — barbería premium: negro & blanco (monocromo)
        carbon: "#0A0A0A", // fondo (negro)
        graphite: {
          DEFAULT: "#121212", // paneles
          2: "#1A1A1A", // paneles elevados
        },
        chalk: "#F5F5F5", // texto blanco
        ash: "#A3A3A3", // texto atenuado (gris)
        steel: "#6B6B6B", // etiquetas / meta (gris medio)
        ember: {
          DEFAULT: "#FFFFFF", // acento principal (blanco)
          2: "#E5E5E5", // hover (gris muy claro)
        },
        gold: "#D4D4D4", // realce claro (gris claro)
        line: "rgba(245,245,245,0.11)",
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
        "draw-x": {
          from: { transform: "scaleX(0)" },
          to: { transform: "scaleX(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
      },
      animation: {
        shimmer: "shimmer 6s linear infinite",
      },
    },
  },
  plugins: [],
}
