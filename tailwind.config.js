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
        // Oblivion — barbería premium: negro + blanco + azul eléctrico
        carbon: "#08090C", // fondo (negro frío)
        graphite: {
          DEFAULT: "#0F1116", // paneles
          2: "#161A22", // paneles elevados
        },
        chalk: "#F4F6FA", // texto blanco frío
        ash: "#9AA3B2", // texto atenuado (gris azulado)
        steel: "#6B7486", // etiquetas / meta (gris acero)
        ember: {
          DEFAULT: "#2E6BFF", // acento principal (azul eléctrico)
          2: "#5B8CFF", // hover / brillo
        },
        gold: "#8FB6FF", // realce claro (azul cielo)
        line: "rgba(244,246,250,0.10)",
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
