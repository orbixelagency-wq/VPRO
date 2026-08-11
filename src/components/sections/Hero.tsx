import { ArrowDown } from "lucide-react"

const scrollTo = (id: string) =>
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })

export function Hero() {
  return (
    <section
      id="top"
      className="relative flex min-h-[100svh] items-center overflow-hidden bg-ink"
    >
      {/* Atmósfera del local: focos cálidos (bombillas Edison) + viñeta */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 55% at 50% 8%, rgba(245,54,31,0.16), transparent 60%)," +
            "radial-gradient(28% 40% at 18% 22%, rgba(201,162,75,0.14), transparent 65%)," +
            "radial-gradient(24% 36% at 82% 26%, rgba(201,162,75,0.12), transparent 65%)," +
            "radial-gradient(120% 90% at 50% 120%, rgba(0,0,0,0.55), transparent 55%)",
        }}
      />
      {/* Poste de barbero en el borde izquierdo */}
      <div
        aria-hidden
        className="barberpole absolute left-0 top-0 hidden h-full w-[10px] opacity-90 sm:block"
      />

      <div className="relative z-10 mx-auto w-full max-w-[1280px] px-6 py-28">
        <p className="eyebrow mb-7">Girona · Figueres — desde 2018</p>

        <h1 className="leading-[0.82]">
          <span className="neon-ignite block font-script text-[clamp(3.6rem,15vw,11rem)] leading-[0.8]">
            Scoundrels
          </span>
          <span className="mt-3 block font-slab text-[clamp(1.5rem,6.2vw,4.4rem)] uppercase tracking-[0.02em] text-bone">
            Barbers Shop
          </span>
        </h1>

        <p className="mt-8 max-w-xl font-sans text-lg leading-relaxed text-bone-dim">
          No es solo una barbería. Es cuidado masculino con estilo y actitud —
          el sitio donde desconectas de la rutina y encuentras tu{" "}
          <span className="font-600 italic text-bone">#momentoscoundrels</span>.
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <button className="btn btn-neon" onClick={() => scrollTo("contacto")}>
            Reserva tu cita
          </button>
          <button className="btn btn-ghost" onClick={() => scrollTo("servicios")}>
            Ver servicios
          </button>
        </div>

        {/* Sello de aniversario */}
        <div className="mt-14 inline-flex items-center gap-4 border-l-2 border-neon pl-4">
          <span className="font-slab text-4xl leading-none text-brass">6</span>
          <span className="font-cond text-sm font-600 uppercase leading-tight tracking-[0.14em] text-bone-dim">
            años con las luces
            <br />
            encendidas
          </span>
        </div>
      </div>

      {/* Indicador de scroll */}
      <button
        onClick={() => scrollTo("nosotros")}
        aria-label="Bajar"
        className="absolute bottom-6 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-2 text-bone-dim transition-colors hover:text-neon sm:flex"
      >
        <span className="font-cond text-[0.7rem] uppercase tracking-ticket">
          Baja
        </span>
        <ArrowDown size={18} className="animate-bounce" />
      </button>
    </section>
  )
}
