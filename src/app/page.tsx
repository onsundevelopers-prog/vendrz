import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { TrustStrip } from "@/components/landing/TrustStrip";
import { ProductDemo } from "@/components/landing/ProductDemo";
import { ProblemSection } from "@/components/landing/ProblemSection";
import { Capabilities } from "@/components/landing/Capabilities";
import { Testimonials } from "@/components/landing/Testimonials";
import { StatsBand } from "@/components/landing/StatsBand";
import { PortfolioShowcase } from "@/components/landing/PortfolioShowcase";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Pricing } from "@/components/landing/Pricing";
import { Faq } from "@/components/landing/Faq";
import { CtaSection } from "@/components/landing/CtaSection";
import { Footer } from "@/components/landing/Footer";

export default function Home() {
  return (
    <main className="bg-canvas">
      <Navbar />
      <Hero />
      <TrustStrip />
      <ProductDemo />
      <ProblemSection />
      <Capabilities />
      <Testimonials />
      <StatsBand />
      <PortfolioShowcase />
      <HowItWorks />
      <Pricing />
      <Faq />
      <CtaSection />
      <Footer />
    </main>
  );
}
