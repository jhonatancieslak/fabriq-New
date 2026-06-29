// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
import { Navbar } from './_components/Navbar'
import { Hero } from './_components/Hero'
import { Problem } from './_components/Problem'
import { Solution } from './_components/Solution'
import { Features } from './_components/Features'
import { SocialProof } from './_components/SocialProof'
import { Pricing } from './_components/Pricing'
import { FinalCta } from './_components/FinalCta'
import { Footer } from './_components/Footer'

export default function LandingPage() {
  return (
    <main className="bg-[#07080A]">
      <Navbar />
      <Hero />
      <Problem />
      <Solution />
      <Features />
      <SocialProof />
      <Pricing />
      <FinalCta />
      <Footer />
    </main>
  )
}
