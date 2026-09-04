"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { PLAN_MAP, salesMailto, type Plan } from "@/lib/displayMode";

/* ------------------------------------------------------------------ */
/*  Pricing - Airtable-style plan cards.                              */
/*                                                                     */
/*  Four tiers: Free (30-day Team Plus trial included) / Team Plus     */
/*  ($250 CAD one-time, most popular) / Business (sales) /             */
/*  Enterprise (sales). Each card shows the plan's own features        */
/*  ("Everything in X, plus:"), with the featured card highlighted.    */
/*                                                                     */
/*  There is no payment processor: Team Plus is a one-time $250 CAD    */
/*  e-transfer arranged by email after the free trial.                 */
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
    group: "Free includes:", // note: cadence === "forever"
    cta: "Start your free trial",
    href: "/audit",
    featured: false,
    buttonNote: "30 days of Team Plus — no credit card",
  },
  {
    id: "team",
    group: "Everything in Free, plus:",
    cta: "Start with Team Plus",
    href: "/auth?mode=login&next=%2Fdashboard",
    featured: true,
    buttonNote: "or email to purchase now",
  },
  {
    id: "business",
    group: "Everything in Team Plus, plus:",
    cta: "Contact us",
    href: salesMailto("business"),
    featured: false,
    buttonNote: "custom pricing · sales-led",
  },
  {
    id: "enterprise",
    group: "Everything in Business, plus:",
    cta: "Contact us",
    href: salesMailto("enterprise"),
    featured: false,
    buttonNote: "custom pricing · sales-led",
  },
];

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
  const isCustom = card.id === "business" || card.id === "enterprise";

  return (
    <motion.div
      initial={false}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay: index * 0.1, ease }}
      whileHover={{ y: -4 }}
      className={`relative flex flex-col rounded-xl border bg-surface transition-colors ${
        card.featured
          ? "mt-4 border-line-strong shadow-[0_24px_64px_rgba(0,0,0,0.4)]"
          : "border-line hover:border-line-strong"
      }`}
    >
      {/* Most popular banner - protrudes above the card, like the reference */}
      {card.featured && (
        <div className="absolute inset-x-0 -top-4 z-10 flex items-center justify-center">
          <span className="rounded-full bg-white px-4 py-1 text-[10.5px] font-[510] tracking-[-0.01em] text-black shadow-sm shadow-black/40">
            Most popular
          </span>
        </div>
      )}

      <div className="flex flex-1 flex-col p-6">
        {/* plan name + description */}
        <p className="text-[15px] font-[510] tracking-[-0.014em] text-fg">{plan.name}</p>
        <p className="mt-1 text-[12.5px] leading-relaxed text-muted">{plan.blurb}</p>

        {/* price */}
        <div className="mt-5 flex items-baseline gap-1.5">
          {isCustom ? (
            <span className="flex items-center text-fg">
              <span className="text-[24px] font-[510] tracking-[-0.022em]">Custom</span>
            </span>
          ) : (
            <span className="text-[32px] font-[510] tracking-[-0.03em] text-fg">{plan.price}</span>
          )}
          <span className="text-[12.5px] text-muted">{plan.cadence}</span>
        </div>

        {/* action */}
        <div className="mt-5">
          <Button
            href={card.href}
            variant={card.featured ? "primary" : "outline"}
            className="w-full"
          >
            {card.cta}
          </Button>
          {card.buttonNote && (
            <p className="mt-1.5 text-center text-[11.5px] text-muted">{card.buttonNote}</p>
          )}
        </div>

        {/* features */}
        <div className="mt-7 flex-1">
          <p className="text-[12px] font-[510] tracking-[-0.01em] text-fg">{card.group}</p>
          <ul className="mt-3 space-y-2.5">
            {plan.features.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-[13px] font-normal leading-snug tracking-[-0.01em] text-faint">
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
          initial={false}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease }}
          className="mx-auto max-w-2xl text-center"
        >
          <p className="text-[12px] font-[510] tracking-[-0.01em] text-faint">
            Pricing
          </p>
          <h2 className="mt-4 text-balance text-4xl font-[510] leading-[1.05] tracking-[-0.022em] text-fg sm:text-5xl">
            Start free. Scale when the leaks do.
          </h2>
          <p className="mt-5 text-pretty text-[16px] font-normal leading-[1.5] tracking-[-0.011em] text-faint">
            Every new account gets 30 days of Team Plus free - no credit card.
            After that, Team Plus is a one-time $250 CAD payment, arranged by
            email. No subscription, no automatic charges.
          </p>
        </motion.div>

        <div className="mx-auto mt-16 grid max-w-6xl items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {CARDS.map((card, i) => (
            <TierCard key={card.id} card={card} index={i} />
          ))}
        </div>

        <p className="mt-10 text-center text-[12px] tracking-tight text-muted">
          Team Plus is a one-time $250 CAD payment via e-transfer (arranged by email) · Business
          and Enterprise are sales-led · nothing is ever charged automatically
        </p>
        <p className="mt-2 text-center text-[12px] tracking-tight text-muted">
          Every new account starts with a free 30-day Team Plus trial · manual upload &amp;
          analysis stay free afterwards.
        </p>
      </div>
    </section>
  );
}
