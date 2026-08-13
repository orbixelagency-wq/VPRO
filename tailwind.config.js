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
        // Oblivion — barbería premium: onyx cálido + latón/oro + crema
        carbon: "#0C0B0A", // fondo (onyx cálido)
        graphite: {
          DEFAULT: "#16130F", // paneles
          2: "#201B14", // paneles elevados
        },
        chalk: "#F5F0E6", // texto crema
        ash: "#ADA492", // texto atenuado (taupe cálido)
        steel: "#8C8065", // etiquetas / meta (latón apagado)
        ember: {
          DEFAULT: "#C89B4B", // acento principal (latón/oro)
          2: "#DDB768", // hover / brillo
        },
        gold: "#E9C978", // realce claro
        line: "rgba(245,240,230,0.10)",
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
