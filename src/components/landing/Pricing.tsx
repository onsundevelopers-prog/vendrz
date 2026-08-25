"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { useSpotlight } from "@/components/ui/SpotlightCard";

const TIERS = [
  {
    name: "Audit",
    price: "$0",
    cadence: "forever",
    blurb: "One-off vendor spend audit, no account needed.",
    features: [
      "Full spend intelligence report",
      "Savings opportunities & waste detection",
      "Renewal & billing risk summary",
      "Rule-based methodology, never guesses",
    ],
    cta: "Run free audit",
    href: "/audit",
    featured: false,
  },
  {
    name: "Monitor",
    price: "$29",
    cadence: "/mo per org",
    blurb: "Continuous spend, renewal & savings monitoring.",
    features: [
      "Everything in Audit",
      "Renewal & price-increase alerts",
      "Vendor health scores & usage analysis",
      "Action Center with savings tracking",
      "Executive reports",
    ],
    cta: "Start monitoring",
    href: "/auth?mode=signup&next=/dashboard",
    featured: true,
  },
  {
    name: "Team",
    price: "$99",
    cadence: "/mo per org",
    blurb: "Shared oversight for finance & procurement teams.",
    features: [
      "Everything in Monitor",
      "Team seats & roles",
      "Approval workflows on actions",
      "Export & audit trail",
      "Priority support",
    ],
    cta: "Talk to sales",
    href: "/auth?mode=signup&next=/dashboard",
    featured: false,
  },
];

const ease = [0.22, 1, 0.36, 1] as const;

function TierCard({
  tier,
  index,
}: {
  tier: (typeof TIERS)[number];
  index: number;
}) {
  const { ref, onMouseMove } = useSpotlight<HTMLDivElement>();
  return (
    <motion.div
      ref={ref}
      onMouseMove={onMouseMove}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay: index * 0.1, ease }}
      className={`spotlight-card relative flex flex-col rounded-2xl p-7 shadow-glow ${
        tier.featured ? "glass-border glass-glow" : "glass-border glass-glow"
      }`}
    >
      <div className="spotlight-glow" aria-hidden="true" />
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
            The audit is free. Monitoring pays for itself.
          </h2>
          <p className="mt-5 text-pretty text-[16px] font-normal leading-[1.5] tracking-[-0.01em] text-muted">
            Every plan includes unlimited audits. No credit card required to see
            your first result - ever.
          </p>
        </motion.div>

        <div className="mx-auto mt-16 grid max-w-5xl gap-4 lg:grid-cols-3">
          {TIERS.map((tier, i) => (
            <TierCard key={tier.name} tier={tier} index={i} />
          ))}
        </div>

        <p className="mt-10 text-center text-[12px] tracking-tight text-muted">
          All prices in USD · cancel anytime · first audit free, no account required
        </p>
      </div>
    </section>
  );
}
