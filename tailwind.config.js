/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: { "2xl": "1240px" },
    },
    extend: {
      colors: {
        // Orbixel — minimalista + tecnológico (orbit + pixel)
        void: "#0B0D12", // negro casi puro (banda oscura / tinta)
        ink: "#12141A", // texto principal
        mute: "#737884", // texto secundario
        paper: "#F5F6F8", // fondo de página
        surface: "#FFFFFF", // tarjetas
        orbit: {
          DEFAULT: "#2F5BFF", // azul eléctrico (acento)
          soft: "#EAEFFF", // wash azul muy claro
          ink: "#1E3AAE", // azul profundo
        },
        line: "rgba(11,13,18,0.09)", // hairline sobre claro
        "line-dark": "rgba(245,246,248,0.12)", // hairline sobre oscuro
      },
      fontFamily: {
        display: ['"Space Grotesk"', "Inter", "sans-serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ['"Space Mono"', "ui-monospace", "monospace"],
      },
      borderRadius: {
        card: "20px",
      },
      boxShadow: {
        float: "0 24px 60px -28px rgba(15,23,42,0.28), 0 4px 14px -6px rgba(15,23,42,0.10)",
        soft: "0 12px 34px -18px rgba(15,23,42,0.22)",
      },
      keyframes: {
        "orbit-spin": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        "orbit-spin-rev": {
          from: { transform: "rotate(360deg)" },
          to: { transform: "rotate(0deg)" },
        },
        sweep: {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        pulse: {
          "0%": { opacity: "0.9", transform: "scale(1)" },
          "70%": { opacity: "0", transform: "scale(2.4)" },
          "100%": { opacity: "0", transform: "scale(2.4)" },
        },
        rise: {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "none" },
        },
        blink: {
          "0%,100%": { opacity: "1" },
          "50%": { opacity: "0.25" },
        },
      },
      animation: {
        "orbit-spin": "orbit-spin 22s linear infinite",
        "orbit-spin-rev": "orbit-spin-rev 34s linear infinite",
        sweep: "sweep 6s linear infinite",
        blink: "blink 1.5s steps(1) infinite",
      },
    },
  },
  plugins: [],
}
