import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { SITE, FAQS } from "@/lib/site";
import { JsonLd } from "@/components/seo/JsonLd";
import "./globals.css";

/* ------------------------------------------------------------------ */
/*  Clerk is intentionally NOT here. Public pages (/, /pricing,         */
/*  /privacy, /terms, ...) must not ship clerk-js or the @clerk/nextjs  */
/*  client runtime. Routes that consume auth wrap themselves in         */
/*  <ClerkScope> from their own layout (auth, dashboard, upload,        */
/*  results, audit).                                                    */
/* ------------------------------------------------------------------ */

// Inter Variable - the full 100-900 axis, so the Linear weights (400 / 510 /
// 590) exist alongside the classic ones. OpenType features (cv01 / ss03 / zero)
// are enabled globally on body in globals.css.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

// Berkeley Mono stand-in for code-adjacent metadata (kbd hints, mono labels).
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} - ${SITE.tagline}`,
    template: `%s · ${SITE.name}`,
  },
  description: SITE.description,
  keywords: SITE.keywords,
  alternates: {
    canonical: "/",
  },
  // Googlebot and every crawler are explicitly allowed to index and follow.
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    url: SITE.url,
    siteName: SITE.name,
    title: `${SITE.name} - ${SITE.tagline}`,
    description: SITE.description,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} - ${SITE.tagline}`,
    description: SITE.description,
  },
};

/* ------------------------------------------------------------------ */
/*  Structured data (JSON-LD) - plain-language facts about the product  */
/*  that Googlebot can read without any JavaScript.                    */
/* ------------------------------------------------------------------ */

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE.name,
  url: SITE.url,
  slogan: SITE.tagline,
  description: SITE.description,
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE.name,
  url: SITE.url,
  description: SITE.description,
  publisher: { "@type": "Organization", name: SITE.name },
};

const softwareJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: SITE.name,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  url: SITE.url,
  description: SITE.description,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${geistMono.variable} antialiased`}>
      <body>
        <JsonLd data={organizationJsonLd} />
        <JsonLd data={websiteJsonLd} />
        <JsonLd data={softwareJsonLd} />
        <JsonLd data={faqJsonLd} />
        {children}
      </body>
    </html>
  );
}
