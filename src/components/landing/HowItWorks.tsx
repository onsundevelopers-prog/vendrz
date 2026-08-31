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
          <p className="text-[12px] font-medium tracking-[0.2em] text-muted">
            How it works
          </p>
          <h2 className="mt-4 text-balance text-4xl font-semibold leading-[1.05] tracking-[-0.03em] text-fg sm:text-5xl">
            From data to savings in one pass
          </h2>
          <p className="mt-5 text-pretty text-[16px] font-normal leading-[1.5] tracking-[-0.01em] text-muted">
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
              className="border-sheen card-faded rounded-lg p-5"
            >
              <span className="text-[13px] font-medium text-zinc-500">
                {step.num}
              </span>
              <h3 className="mt-3 text-[17px] font-semibold tracking-[-0.015em] text-fg">
                {step.title}
              </h3>
              <p className="mt-2 text-[14px] font-normal leading-[1.7] tracking-[-0.01em] text-muted">
                {step.body}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
