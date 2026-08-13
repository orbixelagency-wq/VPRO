import { useEffect, useState } from "react"
import { Navbar } from "@/components/Navbar"
import { Component as OblivionHero } from "@/components/ui/oblivion-hero-scroll"
import { Filosofia } from "@/components/sections/Filosofia"
import { Servicios } from "@/components/sections/Servicios"
import { Experiencia } from "@/components/sections/Experiencia"
import { Locales } from "@/components/sections/Locales"
import { Reservas } from "@/components/sections/Reservas"
import { Footer } from "@/components/sections/Footer"
import { BookingProvider, useBooking } from "@/components/booking/BookingProvider"
import { ChatWidget } from "@/components/chat/ChatWidget"
import { Central } from "@/components/central/Central"
import { ScrollScene } from "@/components/scroll/ScrollScene"

const scrollTo = (id: string) =>
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })

function Site() {
  const { openBooking } = useBooking()
  return (
    <div className="relative min-h-screen bg-carbon text-chalk">
      <Navbar onReservar={() => openBooking()} />

      <OblivionHero
        onReservar={() => openBooking()}
        onLocales={() => scrollTo("locales")}
      />

      <main className="relative z-10 bg-carbon">
        <ScrollScene eyebrow="Oblivion Barbers & Care" word="Más que un corte" />
        <Filosofia />

        <ScrollScene eyebrow="Lo que hacemos" word="Oficio" outline />
        <Servicios />

        <ScrollScene eyebrow="La casa" word="El ritual" subtitle="Vapor de ozono · bebida de cortesía" />
        <Experiencia />

        <ScrollScene eyebrow="Tres locales" word="Menorca" outline />
        <Locales />

        <ScrollScene eyebrow="Pide tu cita" word="Reserva" subtitle="En segundos, sin llamadas" />
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
