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
        // Oblivion — barbería premium: carbón cálido + cobre/oro
        carbon: "#100C08", // fondo (negro cálido)
        graphite: {
          DEFAULT: "#1A130D", // paneles
          2: "#241A11", // paneles elevados
        },
        chalk: "#F4EEE3", // texto crema
        ash: "#B2A896", // texto atenuado
        steel: "#8B7F6A", // etiquetas / meta
        ember: {
          DEFAULT: "#C6852F", // acento principal (cobre/ámbar)
          2: "#E0A24A", // hover / brillo
        },
        gold: "#E7C481", // realce claro (oro)
        line: "rgba(244,238,227,0.10)",
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
