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
        <Filosofia />
        <Servicios />
        <Experiencia />
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
