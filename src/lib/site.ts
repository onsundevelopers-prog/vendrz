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
  name: "n4ma",
  /** Canonical site URL - override with NEXT_PUBLIC_SITE_URL when the live
      domain differs from n4ma.app (used by robots.txt, sitemap.xml, and
      canonical/OpenGraph tags). */
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "https://n4ma.app").replace(/\/+$/, ""),
  /** The main tagline - the AI financial watchdog for business software. */
  tagline: "The AI financial watchdog for business software",
  /** Human-readable, jargon-free description (shown to Google + readers). */
  description:
    "n4ma watches what your business pays for software, subscriptions, and vendors - and finds where the money is quietly leaking. Hidden fees, auto-renewals, price increases, unused licenses, and duplicate tools are flagged with the exact clause, invoice, or source as evidence, and the potential savings are quantified. Upload a contract for a free review in under two minutes. No signup required.",
  /**
   * Keyword strategy (short-tail head terms, long-tail phrases,
   * informational and transactional queries).
   */
  keywords: [
    // Head / short-tail - broad, high-volume terms
    "software spend analysis",
    "SaaS spend management",
    "subscription cost optimization",
    "contract renewal tracking",
    "contract intelligence software",
    "AI financial watchdog",
    // Long-tail - specific phrases that convert
    "how to find hidden fees in contracts",
    "software subscription audit tool",
    "auto-renewal contract tracker",
    "how to find duplicate software subscriptions",
    "find hidden fees in SaaS contracts",
    // Informational - what people want to learn
    "what is software spend analysis",
    "how to stop automatic renewals",
    "how to cancel a contract before it renews",
    // Transactional - ready to take action
    "free contract review",
    "upload contract for analysis",
    "find wasted software spending",
  ].join(", "),
};

/* ------------------------------------------------------------------ */
/*  Pricing plans - mirrored from the client PLAN_MAP so server        */
/*  components can emit OfferCatalog structured data without importing  */
/*  a "use client" module. Keep in sync with src/lib/displayMode.tsx.  */
/* ------------------------------------------------------------------ */

export interface PricingPlan {
  id: "free" | "team" | "business" | "enterprise";
  name: string;
  /** Numeric price; null for custom-priced plans. */
  price: string | null;
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
    cadence: "forever",
    blurb: "Try Team Plus free for 30 days - no credit card.",
    features: [
      "30-day Team Plus trial on signup",
      "Manual contract upload & analysis",
      "What needs attention, at a glance",
      "5 AI messages per month",
      "1 evaluation import from Google Drive or Slack",
    ],
  },
  {
    id: "team",
    name: "Team Plus",
    price: "250",
    cadence: "CAD · one-time",
    blurb: "Every finding, forever - one payment, no subscription.",
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
    id: "business",
    name: "Business",
    price: null,
    cadence: "contact sales",
    blurb: "Continuously monitor spending and identify opportunities to reduce costs.",
    features: [
      "Team members, roles & permissions",
      "Advanced automations",
      "Priority AI processing",
      "Dedicated support",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise Scale",
    price: null,
    cadence: "pricing",
    blurb: "Build n4ma into your organization's financial and procurement workflows.",
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
    q: "What can n4ma find?",
    a: "Hidden fees, auto-renewals, cancellation windows, price increases, unused seats, duplicate tools, billing anomalies, and other potential spending leaks in the software, subscriptions, contracts, and invoices your business already pays for. n4ma reads the source documents and flags each pattern with the exact clause, invoice, or message as evidence, so you can verify every finding yourself.",
  },
  {
    q: "Do I really not need an account to get results?",
    a: "Correct. Upload a PDF, DOCX, TXT, or CSV and you get the full analysis - risk score, findings with evidence, and a savings range - with no name, email, or signup. We only ask you to create an account if you want us to keep monitoring that contract or connect Gmail, Google Drive, or Slack.",
  },
  {
    q: "How does n4ma calculate savings?",
    a: "Every estimate is computed by clear rules applied to terms actually extracted from your document - escalation rates, auto-renewal status, and annual value - combined with conservative market benchmarks. The AI never makes up the final dollar figure. Every figure is labeled as an estimate, shown as a range where useful, and accompanied by the methodology used to calculate it. Nothing is guaranteed until you negotiate it.",
  },
  {
    q: "How do I stop a contract from auto-renewing?",
    a: "To stop an automatic renewal you usually have to give written notice before a deadline that sits 30 to 90 days before the renewal date - and that deadline is often buried deep in the agreement. n4ma finds your renewal date and your cancellation deadline automatically, tells you exactly when you must act, and can draft the cancellation email for you to review and send yourself.",
  },
  {
    q: "Does n4ma replace my finance team?",
    a: "No. n4ma identifies opportunities and provides the evidence behind them - it does not make financial decisions. Your team reviews the findings, decides what to act on, and stays in control of every renewal, purchase, and negotiation.",
  },
  {
    q: "Can N4MA cancel subscriptions for me?",
    a: "Not on its own - n4ma never moves money and never sends anything without you. What it does is identify the exact action required: which subscription is renewing, the deadline to cancel, and the terms that lock you in. It can draft the cancellation notice for you to review. You remain responsible for sending and approving it, which keeps you in control.",
  },
  {
    q: "What sources can n4ma watch?",
    a: "Manual uploads of contracts, invoices, and order forms (PDF, DOCX, TXT, or CSV), plus read-only connections to Gmail, Google Drive, and Slack from your workspace. Each connection only proposes content for you to review - nothing is imported until you explicitly select it, and you can disconnect any source at any time.",
  },
  {
    q: "Is my data used to train AI?",
    a: "Never. Your documents are encrypted in transit and at rest, are never shared or sold, and are never used to train AI models. Anonymous scans expire after 14 days unless you create an account and claim them.",
  },
  {
    q: "What kinds of documents can I upload?",
    a: "PDF, DOCX, TXT, and CSV files, up to 25 MB each. That covers most master service agreements, software subscription terms, invoices, and order forms. You can upload one file or a whole batch, and each one is analyzed separately with its own report.",
  },
];
