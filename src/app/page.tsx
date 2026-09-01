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
import { JsonLd } from "@/components/seo/JsonLd";
import { SITE, PRICING_PLANS } from "@/lib/site";

/* Pricing lives in the #pricing section on this page, so the
   OfferCatalog structured data is scoped to the home page only. */
const pricingJsonLd = {
  "@context": "https://schema.org",
  "@type": "OfferCatalog",
  name: "n4ma Pricing",
  url: `${SITE.url}/#pricing`,
  description:
    "Plans for every organization: Free, Team, Business, and Enterprise. Every plan includes unlimited reviews; no credit card required to see your first result.",
  itemListElement: PRICING_PLANS.map((plan) => ({
    "@type": "Offer",
    name: plan.name,
    description: plan.blurb,
    url: `${SITE.url}/#pricing`,
    ...(plan.price !== null
      ? { price: plan.price, priceCurrency: "USD" }
      : {}),
    ...(plan.id !== "enterprise"
      ? { priceValidUntil: new Date(new Date().getFullYear() + 1, 11, 31).toISOString().slice(0, 10) }
      : {}),
  })),
};

export default function Home() {
  return (
    <main className="bg-canvas">
      <JsonLd data={pricingJsonLd} />
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
