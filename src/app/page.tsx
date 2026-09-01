import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { TrustStrip } from "@/components/landing/TrustStrip";
import { ProblemSection } from "@/components/landing/ProblemSection";
import { Capabilities } from "@/components/landing/Capabilities";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Pricing } from "@/components/landing/Pricing";
import { Faq } from "@/components/landing/Faq";
import { LearnMore } from "@/components/landing/LearnMore";
import { CtaSection } from "@/components/landing/CtaSection";
import { Footer } from "@/components/landing/Footer";

export default function Home() {
  return (
    <main className="bg-canvas">
      <Navbar />
      <Hero />
      <TrustStrip />
      <ProblemSection />
      <Capabilities />
      <HowItWorks />
      <Pricing />
      <Faq />
      <LearnMore />
      <CtaSection />
      <Footer />
    </main>
  );
}
