"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { PLAN_MAP, type Plan } from "@/lib/displayMode";

/* ------------------------------------------------------------------ */
/*  Pricing - Airtable-style plan cards.                              */
/*                                                                     */
/*  Four tiers: Free / Team ($20, most popular) / Business ($999 then  */
/*  $1/yr) / Enterprise (custom). Each card shows the plan's own       */
/*  features ("Everything in X, plus:"), with the featured card       */
/*  highlighted.                                                       */
/* ------------------------------------------------------------------ */

const CARDS: {
  id: Plan;
  /** Header line above the feature list, e.g. "Everything in Free, plus:" */
  group: string;
  cta: string;
  href: string;
  featured: boolean;
  /** Subtext shown under the button. */
  buttonNote?: string;
}[] = [
  {
    id: "free",
    group: "Free includes:",
    cta: "Try for free",
    href: "/audit",
    featured: false,
  },
  {
    id: "team",
    group: "Everything in Free, plus:",
    cta: "Start with Team",
    href: signupHref("team"),
    featured: true,
    buttonNote: "or purchase now",
  },
  {
    id: "business",
    group: "Everything in Team, plus:",
    cta: "Get started",
    href: signupHref("business"),
    featured: false,
    buttonNote: "or contact sales",
  },
  {
    id: "enterprise",
    group: "Everything in Business, plus:",
    cta: "Contact Sales",
    href: "mailto:sales@noma.app?subject=Enterprise%20plan",
    featured: false,
  },
];

/**
 * Sign-up link that lands the user on the dashboard with the upgrade
 * screen pre-opened for the chosen plan, so the next step is payment
 * (not a bare redirect to the dashboard).
 */
function signupHref(plan: Plan): string {
  return `/auth?mode=signup&next=${encodeURIComponent(`/dashboard?upgrade=${plan}`)}`;
}

const ease = [0.22, 1, 0.36, 1] as const;

function Check() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
      className="mt-[3px] shrink-0 text-zinc-300"
    >
      <path d="M2.5 6.2 5 8.5l4.5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TierCard({
  card,
  index,
}: {
  card: (typeof CARDS)[number];
  index: number;
}) {
  const plan = PLAN_MAP[card.id];
  const isCustom = card.id === "enterprise";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay: index * 0.1, ease }}
      whileHover={{ y: -4 }}
      className={`border-sheen relative flex flex-col rounded-xl border bg-surface transition-colors ${
        card.featured
          ? "mt-4 border-white/30 shadow-2xl shadow-black/50"
          : "border-line shadow-lg shadow-black/20 hover:border-line-strong"
      }`}
    >
      {/* Most popular banner - protrudes above the card, like the reference */}
      {card.featured && (
        <div className="absolute inset-x-0 -top-4 z-10 flex items-center justify-center">
          <span className="rounded-full bg-white px-4 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-black shadow-md shadow-black/40">
            Most popular
          </span>
        </div>
      )}

      <div className="flex flex-1 flex-col p-6">
        {/* plan name + description */}
        <p className="text-[16px] font-semibold tracking-tight text-fg">{plan.name}</p>
        <p className="mt-1 text-[12.5px] leading-relaxed text-muted">{plan.blurb}</p>

        {/* price */}
        <div className="mt-5 flex items-baseline gap-1.5">
          {isCustom ? (
            <span className="flex items-center gap-2 text-fg">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-zinc-400" aria-hidden="true">
                <path d="M4 21V9m5 12V5m5 16v-8m5 8V3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              <span className="text-[26px] font-semibold tracking-[-0.03em]">Custom</span>
            </span>
          ) : (
            <span className="text-[34px] font-semibold tracking-[-0.04em] text-fg">{plan.price}</span>
          )}
          <span className="text-[12.5px] text-muted">{plan.cadence}</span>
        </div>

        {/* action */}
        <div className="mt-5">
          <Button
            href={card.href}
            variant={card.featured ? "primary" : "outline"}
            className="w-full rounded-full"
          >
            {card.cta}
          </Button>
          {card.buttonNote && (
            <p className="mt-1.5 text-center text-[11.5px] text-muted">{card.buttonNote}</p>
          )}
        </div>

        {/* features */}
        <div className="mt-7 flex-1">
          <p className="text-[12px] font-semibold text-fg">{card.group}</p>
          <ul className="mt-3 space-y-2.5">
            {plan.features.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-[13px] leading-snug text-muted">
                <Check />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </motion.div>
  );
}

export function Pricing() {
  return (
    <section id="pricing" className="bg-canvas py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease }}
          className="mx-auto max-w-2xl text-center"
        >
          <p className="text-[12px] font-medium uppercase tracking-[0.2em] text-muted">
            Pricing
          </p>
          <h2 className="mt-4 text-balance text-4xl font-semibold leading-[1.05] tracking-[-0.03em] text-fg sm:text-5xl">
            A plan for every organization&apos;s needs
          </h2>
          <p className="mt-5 text-pretty text-[16px] font-normal leading-[1.5] tracking-[-0.01em] text-muted">
            Every plan includes unlimited reviews. No credit card required to see
            your first result - ever.
          </p>
        </motion.div>

        <div className="mx-auto mt-16 grid max-w-6xl items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {CARDS.map((card, i) => (
            <TierCard key={card.id} card={card} index={i} />
          ))}
        </div>

        <p className="mt-10 text-center text-[12px] tracking-tight text-muted">
          All prices in USD · Team is billed monthly, cancel anytime · Business is $999 upfront
          then $1/yr · Enterprise is custom-priced
        </p>
        <p className="mt-2 text-center text-[12px] tracking-tight text-muted">
          Free includes the Simple workspace, the Savings page, and 5 AI messages per month.
        </p>
      </div>
    </section>
  );
}
