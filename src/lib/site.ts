/* ------------------------------------------------------------------ */
/*  Site identity + SEO content.                                       */
/*                                                                     */
/*  Single source of truth for the tagline, description, keyword       */
/*  strategy, and FAQ copy - shared by the metadata in layout.tsx,     */
/*  the JSON-LD structured data, and the visible FAQ component so      */
/*  Googlebot and human visitors always see the same plain-language    */
/*  story.                                                             */
/* ------------------------------------------------------------------ */

export const SITE = {
  name: "n4ma",
  /** Canonical site URL - override with NEXT_PUBLIC_SITE_URL when the live
      domain differs from n4ma.app (used by robots.txt, sitemap.xml, and
      canonical/OpenGraph tags). */
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "https://n4ma.app").replace(/\/+$/, ""),
  /** The main tagline - AI for finding hidden fees in everyday tools. */
  tagline: "AI that finds hidden fees in everyday tools",
  /** Human-readable, jargon-free description (shown to Google + readers). */
  description:
    "n4ma uses AI to find hidden fees and wasted spending in the everyday tools your business already pays for - software subscriptions, auto-renewing contracts, and invoices. Upload a contract and get a free review in minutes: renewal deadlines, price increases, and savings you can act on. No signup required.",
  /**
   * Keyword strategy (short-tail head terms, long-tail phrases,
   * informational and transactional queries).
   */
  keywords: [
    // Head / short-tail - broad, high-volume terms
    "vendor spend analysis",
    "contract review",
    "spend analysis tool",
    "contract analysis",
    // Long-tail - specific phrases that convert
    "how to find hidden fees in contracts",
    "software subscription audit tool",
    "auto-renewal contract tracker",
    "vendor spend analysis for small business",
    "find hidden fees in SaaS contracts",
    // Informational - what people want to learn
    "what is vendor spend analysis",
    "how to stop automatic renewals",
    "how to cancel a contract before it renews",
    // Transactional - ready to take action
    "free contract review",
    "upload contract for analysis",
    "sign up for vendor spend analysis",
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
  /** Numeric price in USD; null for custom-priced plans. */
  price: string | null;
  /** Human cadence label, e.g. "/month", "then $1/yr", "forever". */
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
    blurb: "For individuals just getting started with n4ma.",
    features: [
      "What needs attention, at a glance",
      "Upcoming renewals, risks & savings",
      "Savings page with every opportunity",
      "5 AI messages per month",
    ],
  },
  {
    id: "team",
    name: "Team",
    price: "20",
    cadence: "/month",
    blurb: "For teams building a shared view of every contract and vendor.",
    features: [
      "Gmail integration - read vendor correspondence",
      "Renewal & cancellation-deadline alerts",
      "Price-increase detection & risk scoring",
      "Business workspace - dense tables, filters, schema view",
      "Complete activity log & Business dashboard",
      "Unlimited AI messages",
      "Export to CSV / PDF",
    ],
  },
  {
    id: "business",
    name: "Business",
    price: "999",
    cadence: "then $1/yr",
    blurb: "For companies that need advanced features and administration. $999 upfront, then $1 per year to keep it.",
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
    blurb: "For organizations building scalable, flexible workflows with powerful governance.",
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
    q: "Do I really not need an account to get results?",
    a: "Correct. Upload a PDF or DOCX and you get the full analysis - risk score, findings with evidence, and a savings range - with no name, email, or signup. We only ask you to create an account if you want us to keep monitoring that contract.",
  },
  {
    q: "What is vendor spend analysis?",
    a: "Vendor spend analysis is the process of reviewing everything your business pays outside vendors - software subscriptions, contracts, invoices, and renewals - to find where money is being wasted. Instead of reading each agreement by hand, n4ma's AI reads the documents for you, extracts the important terms like renewal dates, automatic renewal clauses, and price increases, and points out where you can save.",
  },
  {
    q: "How do I find hidden fees in my contracts?",
    a: "Hidden fees usually hide in plain sight: annual price escalation clauses that raise your bill every year, automatic renewal terms that commit you to another full term if you miss the cancellation window, and unused seats or duplicate tools you keep paying for. n4ma reads your contracts and invoices and flags each of these with the exact sentence from the document as evidence, so you can see what you're actually being charged and why.",
  },
  {
    q: "How do I stop a contract from auto-renewing?",
    a: "To stop an automatic renewal you usually have to give written notice before a deadline that sits 30 to 90 days before the renewal date - and that deadline is often buried deep in the agreement. n4ma finds your renewal date and your cancellation deadline automatically, tells you exactly when you must act, and can even draft the cancellation email for you to review and send yourself.",
  },
  {
    q: "Where do the savings numbers come from?",
    a: "The savings figures are computed by clear rules applied to terms actually extracted from your document - escalation rates, auto-renewal status, and annual value - combined with conservative market benchmarks. The AI never makes up the final dollar figure, every estimate is shown as a range, and each one explains how it was calculated.",
  },
  {
    q: "How much can I actually save?",
    a: "Most companies find something worth acting on: uncapped price escalations, subscriptions they forgot they had, or renewal windows they nearly missed. Typical findings range from a few percent to more than ten percent of the reviewed spend. You'll see a low and high estimate for every opportunity, based on the terms in your own documents - nothing is guaranteed until you negotiate it.",
  },
  {
    q: "What kinds of documents can I upload?",
    a: "PDF and DOCX files, up to 25 MB each. That covers most master service agreements, software subscription terms, invoices, and order forms. You can upload one file or a whole batch, and each one is analyzed separately with its own report.",
  },
  {
    q: "Is my contract shared or used to train models?",
    a: "Never. Your documents are encrypted in transit and at rest, are never shared or sold, and are never used to train AI models. Analyses expire after 14 days unless you create an account and claim them.",
  },
  {
    q: "What happens to my scan if I don't sign up?",
    a: "Your anonymous session and its results are retained for 14 days, then deleted. If you create an account before then, the exact analysis is transferred to your account so nothing is lost.",
  },
  {
    q: "What does the Gmail integration actually do?",
    a: "It's optional and read-only. Connect it from the workspace (never during signup) and n4ma proposes contract-related emails and attachments for you to review. Nothing is imported until you explicitly select it, and you can disconnect anytime.",
  },
];
