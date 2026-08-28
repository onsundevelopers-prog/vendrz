"use client";

import { motion } from "framer-motion";

const ITEMS: { label: string; body: string }[] = [
  {
    label: "Risk score",
    body: "Deterministic rules, not model vibes - every point attributable to a clause.",
  },
  {
    label: "Evidence citations",
    body: "Each finding opens the exact section and page it came from.",
  },
  {
    label: "Savings range",
    body: "Rule-derived estimates with a full paper trail and disclaimer.",
  },
  {
    label: "Renewal alerts",
    body: "Tracks renewal windows and alerts you before deadlines slip.",
  },
];

const ease = [0.22, 1, 0.36, 1] as const;

function CapabilityCard({
  item,
  index,
}: {
  item: { label: string; body: string };
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, delay: index * 0.08, ease }}
      whileHover={{ y: -4 }}
      className="flex aspect-square flex-col items-center justify-center rounded-lg border border-line bg-surface p-5 text-center transition-colors duration-200 hover:border-white/15"
    >
      <span className="text-[11px] font-medium tracking-[0.14em] text-zinc-500">
        {String(index + 1).padStart(2, "0")}
      </span>
      <p className="mt-3 text-[15px] font-semibold tracking-[-0.01em] text-fg">{item.label}</p>
      <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted/60">{item.body}</p>
    </motion.div>
  );
}

export function Capabilities() {
  return (
    <section id="capabilities" className="bg-canvas py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease }}
          className="mx-auto max-w-2xl text-center"
        >
          <p className="text-[12px] font-medium uppercase tracking-[0.2em] text-muted">
            Capabilities
          </p>
          <h2 className="mt-4 text-balance text-4xl font-semibold leading-[1.05] tracking-[-0.03em] text-fg sm:text-5xl">
            Trust the clause, not the claim.
          </h2>
          <p className="mt-5 text-pretty text-[16px] font-normal leading-[1.5] tracking-[-0.01em] text-muted">
            Finance leaders don&apos;t need more AI confidence. They need receipts -
            every feature is built to be verified.
          </p>
        </motion.div>

        {/* square feature grid */}
        <div className="mt-14 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {ITEMS.map((item, i) => (
            <CapabilityCard key={item.label} item={item} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
