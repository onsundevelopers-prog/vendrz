"use client";

import { motion } from "framer-motion";

const STEPS = [
  {
    num: "01",
    title: "Connect your data",
    body: "Financial feeds, invoices, and contracts - read-only. No passwords to vendors, no manual list to build. We match every transaction to a vendor automatically.",
  },
  {
    num: "02",
    title: "n4ma analyzes spend",
    body: "Transactions are normalized, vendors matched, and spend is computed across categories, trends, renewals, usage, and billing anomalies - by rules, not guesses.",
  },
  {
    num: "03",
    title: "See waste, risks & savings",
    body: "Unused seats, duplicate tools, price increases, and renewal traps - each opportunity quantified and tied to the evidence behind it.",
  },
];

const ease = [0.22, 1, 0.36, 1] as const;

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="relative overflow-hidden bg-canvas py-24 lg:py-32"
    >
      <div className="relative mx-auto max-w-7xl px-5 lg:px-8">
        <motion.div
          initial={false}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease }}
          className="mx-auto max-w-2xl text-center"
        >
          <p className="text-[11px] font-[510] uppercase tracking-[0.16em] text-faint">
            How it works
          </p>
          <h2 className="mt-4 text-balance text-4xl font-[510] leading-[1.05] tracking-[-0.022em] text-fg sm:text-5xl">
            From data to savings in one pass
          </h2>
          <p className="mt-5 text-pretty text-[16px] font-normal leading-[1.5] tracking-[-0.011em] text-faint">
            No forms to fill, no account to make. The full review runs
            automatically and finishes in under two minutes.
          </p>
        </motion.div>

        <div className="mx-auto mt-14 grid max-w-5xl gap-4 lg:grid-cols-3">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.num}
              initial={false}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.55, delay: i * 0.08, ease }}
              className="rounded-md border border-line bg-surface p-5"
            >
              <span className="font-mono text-[12px] tracking-[-0.013em] text-ash">
                {step.num}
              </span>
              <h3 className="mt-3 text-[15px] font-[510] tracking-[-0.014em] text-fg">
                {step.title}
              </h3>
              <p className="mt-2 text-[13.5px] font-normal leading-[1.65] tracking-[-0.011em] text-faint">
                {step.body}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
