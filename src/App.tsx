import { BookingProvider } from "@/components/Booking"
import { Navbar } from "@/components/Navbar"
import { Hero } from "@/components/sections/Hero"
import { About } from "@/components/sections/About"
import { Services } from "@/components/sections/Services"
import { Locations } from "@/components/sections/Locations"
import { Contact } from "@/components/sections/Contact"
import { Footer } from "@/components/sections/Footer"

export default function App() {
  return (
    <BookingProvider>
      <div className="relative min-h-screen bg-ink text-bone">
        <Navbar />
        <main>
          <Hero />
          <About />
          <Services />
          <Locations />
          <Contact />
        </main>
        <Footer />
      </div>
    </BookingProvider>
  )
}
