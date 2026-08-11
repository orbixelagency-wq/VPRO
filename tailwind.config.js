/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: { "2xl": "1280px" },
    },
    extend: {
      colors: {
        // Scoundrels — tinta cálida + papel de flash + neón rojo
        ink: {
          DEFAULT: "#14100E", // negro cálido dominante (interior del local)
          2: "#1E1813", // paneles elevados
          3: "#2A211B", // bordes cálidos / madera
        },
        bone: {
          DEFAULT: "#ECE3D0", // papel de "flash" de tatuaje
          2: "#DED2B8",
          dim: "#B7AC93", // texto apagado sobre tinta
        },
        neon: {
          DEFAULT: "#F5361F", // el rótulo de neón (acento único y fuerte)
          2: "#FF6A4D",
        },
        rose: "#C22A1C", // rojo rosa profundo del logo
        brass: "#C9A24B", // latón / bombilla Edison (acento raro)
        line: "rgba(236,227,208,0.12)",
        // semánticos shadcn
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        border: "hsl(var(--border))",
        ring: "hsl(var(--ring))",
      },
      fontFamily: {
        slab: ['"Alfa Slab One"', "Georgia", "serif"],
        script: ['"Yellowtail"', "cursive"],
        sans: ['"Barlow"', "system-ui", "sans-serif"],
        cond: ['"Barlow Condensed"', '"Barlow"', "sans-serif"],
      },
      letterSpacing: {
        ticket: "0.26em",
      },
      keyframes: {
        "pole-scroll": {
          from: { backgroundPosition: "0 0" },
          to: { backgroundPosition: "0 -56px" },
        },
      },
      animation: {
        pole: "pole-scroll 1.1s linear infinite",
      },
    },
  },
  plugins: [],
}
