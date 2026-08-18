import { useSmoothScroll } from "@/lib/scrollFX"
import { Navbar } from "@/components/Navbar"
import { Hero } from "@/components/sections/Hero"
import { Modelo } from "@/components/sections/Modelo"
import { Servicios } from "@/components/sections/Servicios"
import { Valor } from "@/components/sections/Valor"
import { Planes } from "@/components/sections/Planes"
import { Proceso } from "@/components/sections/Proceso"
import { Contacto } from "@/components/sections/Contacto"
import { Footer } from "@/components/sections/Footer"

export default function App() {
  useSmoothScroll()
  return (
    <div className="relative min-h-screen bg-paper text-ink">
      <Navbar />
      <main>
        <Hero />
        <Modelo />
        <Servicios />
        <Valor />
        <Planes />
        <Proceso />
        <Contacto />
      </main>
      <Footer />
    </div>
  )
}
