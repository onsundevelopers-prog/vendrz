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
  name: "Flask",
  /** Canonical site URL - override with NEXT_PUBLIC_SITE_URL when the live
      domain differs from flask.app (used by robots.txt, sitemap.xml, and
      canonical/OpenGraph tags). */
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "https://flask.app").replace(/\/+$/, ""),
  /** The main tagline - video feedback, organized instantly. */
  tagline: "Video feedback, organized instantly",
  /** Human-readable, jargon-free description (shown to Google + readers). */
  description:
    "Flask helps creative teams give feedback on videos in minutes, without typing comments. Talk through complex feedback, draw, share any reference. Flask automatically writes feedback, organizes and timestamps everything.",
  /**
   * Keyword strategy (short-tail head terms, long-tail phrases,
   * informational and transactional queries).
   */
  keywords: [
    // Head / short-tail - broad, high-volume terms
    "video feedback tool",
    "video review software",
    "collaborative video feedback",
    "video annotation tool",
    "voice feedback for video",
    "creative team feedback",
    // Long-tail - specific phrases that convert
    "give feedback on videos",
    "video feedback without typing",
    "timestamped video comments",
    "draw on video frame feedback",
    "organized video review",
    // Informational - what people want to learn
    "how to give video feedback",
    "video review workflow for teams",
    "voice notes on video",
    // Transactional - ready to take action
    "try video feedback tool free",
    "best video feedback software",
    "collaborative video review tool",
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
    blurb: "Try Pro free for 14 days - no credit card.",
    features: [
      "14-day Pro trial on signup",
      "Unlimited video uploads",
      "Voice feedback recording",
      "Visual annotations & drawings",
      "Export feedback as PDF",
      "Up to 3 team members",
    ],
  },
  {
    id: "team",
    name: "Pro",
    price: "29",
    cadence: "USD / seat / month",
    blurb: "Everything for creative teams - unlimited feedback, full collaboration.",
    features: [
      "Unlimited videos and feedback sessions",
      "Unlimited voice notes and annotations",
      "Team collaboration with threaded feedback",
      "Reference image uploads",
      "YouTube and Drive link support",
      "Export to PDF, CSV, and markdown",
      "Custom branding on shared feedback views",
      "Priority support",
    ],
  },
  {
    id: "business",
    name: "Team",
    price: null,
    cadence: "contact sales",
    blurb: "For growing teams that need admin controls and advanced workflows.",
    features: [
      "Everything in Pro",
      "Admin dashboard and user management",
      "Custom feedback templates",
      "Advanced permissions and roles",
      "API access for integrations",
      "Dedicated account manager",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: null,
    cadence: "contact sales",
    blurb: "For large organizations with custom security and compliance needs.",
    features: [
      "Everything in Team",
      "SSO and SCIM provisioning",
      "Custom SLA and compliance reporting",
      "On-premise deployment options",
      "Dedicated success team",
      "Custom training and onboarding",
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
    q: "What kind of videos does Flask support?",
    a: "Flask supports any video format - MP4, MOV, GIF, screen recordings, and YouTube links. There are no file size limits on paid plans and no length limits. Upload directly or share a link and Flask handles the rest.",
  },
  {
    q: "Do I need an account to try Flask?",
    a: "No. You can start a 14-day free trial without a credit card. Create an account when you're ready to keep your feedback sessions and invite your team.",
  },
  {
    q: "How does voice feedback work?",
    a: "Play the video and press the record button to speak your feedback. Flask transcribes your voice note, timestamps it to the exact frame, and organizes it in the feedback thread. You can also draw on the frame, add reference images, or type - whatever communicates your idea best.",
  },
  {
    q: "Can my team collaborate on feedback?",
    a: "Yes. Flask organizes feedback by scene, topic, or reviewer, so everyone sees the same threaded context with timestamps, reactions, and what's been resolved. Creators know exactly what to change and reviewers can see what's been addressed.",
  },
  {
    q: "How is Flask different from written comments?",
    a: "Voice feedback is faster and more natural than typing. You can speak while watching the video, and Flask captures your tone and context. Combined with drawings and reference images, your feedback becomes clearer and more actionable than a text comment thread ever could be.",
  },
  {
    q: "Can Flask replace my existing review tools?",
    a: "Flask is built for video feedback specifically - it's not a general project tool. But for creative teams reviewing video content, Flask replaces scattered comments, email threads, and spreadsheets with one organized place for all feedback.",
  },
  {
    q: "What integrations does Flask support?",
    a: "Flask works with video files you upload directly, screen recordings, YouTube links, and Google Drive. Feedback sessions can be shared via link, and results can be exported for teams that need them in other tools.",
  },
  {
    q: "Is my video content used to train AI?",
    a: "Never. Your videos and feedback are encrypted in transit and at rest, are never shared or sold, and are never used to train AI models. Your content stays in your workspace and you control who sees it.",
  },
  {
    q: "What video formats can I upload?",
    a: "MP4, MOV, AVI, GIF, and screen recordings up to 5GB on paid plans. YouTube links are also supported - paste the URL and Flask loads the video for feedback. Each video gets its own feedback session with its own organized thread.",
  },
  {
    q: "Is there a free trial?",
    a: "Yes. Every new account gets 14 days of Pro free, with no credit card required. After the trial, access returns to Free. You can upgrade anytime to keep your Pro features.",
  },
];
