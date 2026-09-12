/* ------------------------------------------------------------------ */
/*  Site identity + SEO content.                                       */
/*                                                                     */
/*  Single source of truth for the tagline, description, keyword       */
/*  strategy, and FAQ copy - shared by the metadata in layout.tsx,     */
/*  the JSON-LD structured data, and the visible FAQ component so      */
/*  Googlebot and human visitors always see the same plain-language    */
/*  story.                                                             */
/* ------------------------------------------------------------------ */

/**
 * Where purchase / sales enquiries go (the manual e-transfer flow).
 * Override with NEXT_PUBLIC_SUPPORT_EMAIL; defaults to the founder's
 * address - never an invented one.
 */
export const SUPPORT_EMAIL =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || "onsundevelopers@gmail.com";

export const SITE = {
  name: "N4MA",
  /** Canonical site URL - override with NEXT_PUBLIC_SITE_URL when the live
      domain differs from n4ma.online (used by robots.txt, sitemap.xml, and
      canonical/OpenGraph tags). */
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "https://n4ma.online").replace(/\/+$/, ""),
  /** The main tagline. */
  tagline: "The AI financial watchdog for business software",
  /** Human-readable, jargon-free description (shown to Google + readers). */
  description:
    "N4MA reads the contracts, invoices, and subscriptions behind your business software spending and finds the leaks - auto-renewals, cancellation deadlines, price increases, hidden fees, unused licenses, and duplicate tools. Every finding is backed by evidence from your own documents, with the financial impact calculated from your terms.",
  /**
   * Keyword strategy (short-tail head terms, long-tail phrases,
   * informational and transactional queries).
   */
  keywords: [
    // Head / short-tail - broad, high-volume terms
    "software spend management",
    "contract review software",
    "SaaS subscription audit",
    "vendor contract analysis",
    "software cost optimization",
    // Long-tail - specific phrases that convert
    "find hidden fees in contracts",
    "track contract renewal deadlines",
    "auto-renewal contract alerts",
    "unused software license audit",
    "duplicate software subscriptions",
    // Informational - what people want to learn
    "how to audit software spending",
    "contract renewal tracking for business",
    "AI contract analysis with evidence",
    // Transactional - ready to take action
    "free contract review tool",
    "software spending leak detector",
    "contract risk review service",
  ].join(", "),
};

/* ------------------------------------------------------------------ */
/*  Pricing plans - mirrored from the client PLAN_MAP so server        */
/*  components can emit OfferCatalog structured data without importing  */
/*  a "use client" module. Keep in sync with src/lib/displayMode.tsx    */
/*  and src/components/landing/JoinWaitlistCard.tsx.                    */
/* ------------------------------------------------------------------ */

export interface PricingPlan {
  id: "free" | "pro" | "team" | "enterprise";
  name: string;
  /** Numeric price; null for custom-priced plans. */
  price: string | null;
  /** ISO 4217 currency for the price, or null when unpriced. */
  currency: "USD" | "CAD" | null;
  /** Human cadence label, e.g. "CAD · one-time", "forever". */
  cadence: string;
  blurb: string;
  features: string[];
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: "free",
    name: "Free",
    price: "0",
    currency: "USD",
    cadence: "forever",
    blurb: "Start free - every new account gets a 30-day Team Plus trial.",
    features: [
      "30-day Team Plus trial on signup",
      "Unlimited contract uploads",
      "AI contract analysis with source evidence",
      "Export findings as PDF",
      "Up to 3 team members",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "250",
    currency: "USD",
    cadence: "USD / month",
    blurb: "Everything in Free, plus priority support and unlimited contract reviews.",
    features: [
      "Unlimited contract uploads",
      "Unlimited AI review sessions",
      "Team collaboration with shared findings",
      "Reference document uploads",
      "Google Drive and Gmail support",
      "Export to PDF, CSV, and markdown",
      "Priority support",
    ],
  },
  {
    id: "team",
    name: "Team Plus",
    price: "250",
    currency: "CAD",
    cadence: "CAD · one-time",
    blurb: "One payment, every finding forever - no subscription.",
    features: [
      "Connect Gmail, Google Drive & Slack - import vendor documents",
      "Renewal & cancellation-deadline alerts",
      "Price-increase detection & risk scoring",
      "Business workspace - dense tables, filters, schema view",
      "Complete activity log & Business dashboard",
      "Unlimited AI messages",
      "Export to CSV / PDF",
      "One-time $250 CAD via e-transfer - never auto-charged",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise Scale",
    price: null,
    currency: null,
    cadence: "custom pricing",
    blurb: "Build N4MA into your organization's financial and procurement workflows.",
    features: [
      "Custom onboarding & migration",
      "Dedicated success manager",
      "Custom contracts & SLA",
      "Advanced governance & audit",
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  FAQ - plain-language Q&A, also emitted as FAQPage structured data. */
/* ------------------------------------------------------------------ */

export interface FaqItem {
  q: string;
  a: string;
}

export const FAQS: FaqItem[] = [
  {
    q: "What does N4MA actually do?",
    a: "N4MA reads the documents behind your company's software spending - contracts, invoices, subscription terms, and renewal notices - and identifies potential spending leaks: auto-renewals, cancellation deadlines, price increases, annual escalation clauses, hidden fees, unused licenses, duplicate tools, and billing anomalies. Every finding is backed by evidence from your own documents.",
  },
  {
    q: "What documents and sources does N4MA support?",
    a: "You can upload PDF, DOCX, TXT, MD, and CSV files directly, or connect Gmail, Google Drive, or Slack with read-only access so N4MA can surface vendor emails, renewal notices, agreements, order forms, and related documents. Nothing in your connected accounts is ever changed.",
  },
  {
    q: "Do I need an account to try N4MA?",
    a: "No. The free vendor review on the audit page runs without an account and takes about two minutes: upload a contract or invoice and get evidence-backed findings. Creating an account keeps your reviews, adds deadline alerts, and unlocks the Gmail, Drive, and Slack imports.",
  },
  {
    q: "What kinds of spending leaks does N4MA find?",
    a: "Auto-renewals you forgot about, cancellation windows that are about to close, annual escalation clauses, hidden fees, licenses for people who left, duplicate tools doing the same job, and billing anomalies that don't match your terms.",
  },
  {
    q: "How does N4MA prove a finding?",
    a: "Every finding cites its source: the exact contract clause, the document page, the invoice line, or the message it came from. You can open the evidence and verify it yourself before acting - the AI reads the document, the evidence makes the case.",
  },
  {
    q: "Are the savings estimates real numbers?",
    a: "They are calculations from your own terms and spending - for example, an escalation percentage applied to what you actually pay - not generic benchmarks. Every estimate is labeled as an estimate, and N4MA never presents fabricated customer results.",
  },
  {
    q: "Does N4MA cancel subscriptions or change my accounts?",
    a: "No. N4MA is read-only. It identifies the action required - renew, renegotiate, or cancel - and helps you draft it, but you approve and send everything. It never contacts vendors or modifies anything on your behalf.",
  },
  {
    q: "Is my data used to train AI?",
    a: "No. Your documents and findings are encrypted in transit and at rest and are never used to train AI models. See the privacy policy for the current data-handling terms.",
  },
  {
    q: "What happens after the 30-day trial?",
    a: "Every new account starts with a 30-day Team Plus trial - no credit card. After it ends, the Free tier keeps manual uploads and a limited number of AI messages. Team Plus is a one-time $250 CAD payment arranged by email via e-transfer - never a subscription, and nothing is ever auto-charged.",
  },
  {
    q: "Who is N4MA for?",
    a: "Any business that buys software: founders and finance leads tracking SaaS renewals, operations teams managing vendor contracts, and procurement or IT teams that need evidence-backed numbers before a renewal decision.",
  },
];
