"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { PLANS } from "@/lib/displayMode";

const TIERS = PLANS.map((p) => ({
  name: p.name,
  price: p.price,
  cadence: p.cadence === "forever" ? "forever" : p.cadence === "one-time" ? "one-time" : "/mo per org",
  blurb: p.blurb,
  features: p.features,
  cta:
    p.id === "free"
      ? "Run free review"
      : p.id === "team"
        ? "Talk to sales"
        : `Start ${p.name} plan`,
  href:
    p.id === "free" ? "/audit" : "/auth?mode=signup&next=/dashboard",
  featured: p.id === "growth",
}));

const ease = [0.22, 1, 0.36, 1] as const;

function TierCard({
  tier,
  index,
}: {
  tier: (typeof TIERS)[number];
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay: index * 0.1, ease }}
      whileHover={{ y: -4 }}
      className={`border-sheen card-faded relative flex flex-col rounded-lg p-6`}
    >
      <div className="relative flex flex-1 flex-col">
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-semibold text-fg">{tier.name}</p>
          {tier.featured && (
            <span className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted">
              Most popular
            </span>
          )}
        </div>

        <div className="mt-5 flex items-baseline gap-1.5">
          <span className="text-4xl font-semibold tabular-nums tracking-[-0.035em] text-fg">{tier.price}</span>
          <span className="text-[12.5px] text-muted">{tier.cadence}</span>
        </div>

        <p className="mt-2.5 text-[13.5px] font-normal leading-relaxed tracking-[-0.01em] text-muted">
          {tier.blurb}
        </p>

        <ul className="mt-7 flex-1 space-y-3">
          {tier.features.map((f) => (
            <li key={f} className="flex items-start gap-2.5 text-[14px]">
              <span aria-hidden="true" className="mt-[2px] shrink-0 text-zinc-300">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2.5 6.2 5 8.5l4.5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="text-muted">{f}</span>
            </li>
          ))}
        </ul>

        <Button
          href={tier.href}
          variant={tier.featured ? "primary" : "outline"}
          className="mt-8 w-full"
        >
          {tier.cta}
        </Button>
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
            Start free. Upgrade when you need the full workspace.
          </h2>
          <p className="mt-5 text-pretty text-[16px] font-normal leading-[1.5] tracking-[-0.01em] text-muted">
            Every plan includes unlimited reviews. No credit card required to see
            your first result - ever.
          </p>
        </motion.div>

        <div className="mx-auto mt-16 grid max-w-6xl items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TIERS.map((tier, i) => (
            <TierCard key={tier.name} tier={tier} index={i} />
          ))}
        </div>

        <p className="mt-10 text-center text-[12px] tracking-tight text-muted">
          All prices in USD · cancel anytime · Team is a one-time payment, not a subscription
        </p>
        <p className="mt-2 text-center text-[12px] tracking-tight text-muted">
          Free includes the Simple workspace, the Savings page, and 5 AI messages per month.
        </p>
      </div>
    </section>
  );
}