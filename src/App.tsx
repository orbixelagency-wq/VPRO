import { Navbar } from "@/components/Navbar"
import { Hero } from "@/components/Hero"
import { Filosofia } from "@/components/sections/Filosofia"
import { Servicios } from "@/components/sections/Servicios"
import { Experiencia } from "@/components/sections/Experiencia"
import { Locales } from "@/components/sections/Locales"
import { Reservas } from "@/components/sections/Reservas"
import { Footer } from "@/components/sections/Footer"

const scrollTo = (id: string) =>
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })

export default function App() {
  return (
    <div className="relative min-h-screen bg-carbon text-chalk">
      <Navbar />

      <Hero onReservar={() => scrollTo("reservas")} onLocales={() => scrollTo("locales")} />

      <main className="relative z-10 bg-carbon">
        <Filosofia />
        <Servicios />
        <Experiencia />
        <Locales />
        <Reservas />
      </main>

      <Footer />
    </div>
  )
}
