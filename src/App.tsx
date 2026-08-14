import { useEffect, useState } from "react"
import { Navbar } from "@/components/Navbar"
import { Hero } from "@/components/Hero"
import { Filosofia } from "@/components/sections/Filosofia"
import { Servicios } from "@/components/sections/Servicios"
import { Experiencia } from "@/components/sections/Experiencia"
import { Locales } from "@/components/sections/Locales"
import { Reservas } from "@/components/sections/Reservas"
import { PhotoBand } from "@/components/sections/PhotoBand"
import { Footer } from "@/components/sections/Footer"
import { BookingProvider, useBooking } from "@/components/booking/BookingProvider"
import { ChatWidget } from "@/components/chat/ChatWidget"
import { Central } from "@/components/central/Central"
import { useSmoothScroll } from "@/lib/useSmoothScroll"
import bandInterior from "@/assets/local-interior.jpg"
import bandWorking from "@/assets/local-working.jpg"
import bandPlants from "@/assets/local-plants.jpg"
import bandStorefront from "@/assets/local-storefront.jpg"

const scrollTo = (id: string) =>
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })

function Site() {
  const { openBooking } = useBooking()
  useSmoothScroll()
  return (
    <div className="relative min-h-screen bg-carbon text-chalk">
      <Navbar onReservar={() => openBooking()} />

      <Hero onReservar={() => openBooking()} onServicios={() => scrollTo("servicios")} />

      <main className="relative z-10 bg-carbon">
        <PhotoBand
          img={bandPlants}
          eyebrow="Bienvenido"
          word="El espacio"
          caption="Ambiente actual, pared vegetal y buena energía en pleno centro."
        />
        <Filosofia />
        <PhotoBand
          img={bandInterior}
          eyebrow="La casa"
          word="El ritual"
          caption="Un lugar para desconectar mientras te cuidas."
        />
        <Servicios />
        <PhotoBand
          img={bandWorking}
          eyebrow="El oficio"
          word="Cada detalle"
          caption="Manos expertas, herramientas cuidadas y tiempo para ti."
        />
        <Experiencia />
        <PhotoBand
          img={bandStorefront}
          eyebrow="Menorca"
          word="Cerca de ti"
          caption="Tres locales en la isla: Es Castell, Mahón y Ciutadella."
        />
        <Locales />
        <Reservas />
      </main>

      <Footer />
      <ChatWidget />
    </div>
  )
}

export default function App() {
  const [hash, setHash] = useState(
    typeof window !== "undefined" ? window.location.hash : ""
  )

  useEffect(() => {
    const onHash = () => setHash(window.location.hash)
    window.addEventListener("hashchange", onHash)
    return () => window.removeEventListener("hashchange", onHash)
  }, [])

  if (hash === "#central") return <Central />

  return (
    <BookingProvider>
      <Site />
    </BookingProvider>
  )
}
