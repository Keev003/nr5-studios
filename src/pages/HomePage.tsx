import { About } from '@/components/home/About'
import { ArtistsSection } from '@/components/home/ArtistsSection'
import { Contact } from '@/components/home/Contact'
import { Gallery } from '@/components/home/Gallery'
import { Hero } from '@/components/home/Hero'
import { HowItWorks } from '@/components/home/HowItWorks'

export default function HomePage() {
  return (
    <>
      <Hero />
      <About />
      <ArtistsSection />
      <Gallery />
      <HowItWorks />
      <Contact />
    </>
  )
}
