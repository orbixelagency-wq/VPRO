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
        // Performance-lab palette (derivada del logo: negro + fuego)
        carbon: "#0A0A0C",
        graphite: {
          DEFAULT: "#14161A",
          2: "#1C1F25",
        },
        chalk: "#F2F3F5",
        ash: "#9BA1AB",
        steel: "#6E7B8C", // etiquetas de medicion (frio)
        ember: {
          DEFAULT: "#FF5A1F", // energia / esfuerzo (calido)
          2: "#FF7A45",
        },
        gold: "#F5B301", // acento raro (el balon)
        line: "rgba(242,243,245,0.10)",
        // semanticos para shadcn
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        border: "hsl(var(--border))",
        ring: "hsl(var(--ring))",
      },
      fontFamily: {
        display: ['"Saira Condensed"', "Inter", "sans-serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ['"Space Mono"', "ui-monospace", "monospace"],
      },
      letterSpacing: {
        widest2: "0.32em",
      },
      keyframes: {
        "draw-x": {
          from: { transform: "scaleX(0)" },
          to: { transform: "scaleX(1)" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.2" },
        },
      },
      animation: {
        blink: "blink 1.4s steps(1) infinite",
      },
    },
  },
  plugins: [],
}
