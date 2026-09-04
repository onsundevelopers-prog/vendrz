"use client";

import { motion } from "framer-motion";

const STEPS = [
  {
    num: "01",
    title: "Connect",
    body: "Give n4ma access to the documents and sources that contain your business spending - upload contracts and invoices, or connect Gmail, Google Drive, and Slack. Everything is read-only.",
  },
  {
    num: "02",
    title: "Detect",
    body: "n4ma watches for the patterns that waste money: upcoming renewals, cancellation deadlines, price increases, hidden fees, unused seats, duplicate tools, and billing anomalies.",
  },
  {
    num: "03",
    title: "Prove",
    body: "Every important finding is backed by evidence - the exact clause, document, page, or invoice it came from, plus the calculation behind every estimate.",
  },
  {
    num: "04",
    title: "Save",
    body: "See what to fix, why it matters, and how much it could save - a quantified list of spending leaks and the action each one calls for.",
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
          <p className="text-[12px] font-[510] tracking-[-0.01em] text-faint">
            How it works
          </p>
          <h2 className="mt-4 text-balance text-4xl font-[510] leading-[1.05] tracking-[-0.022em] text-fg sm:text-5xl">
            From spending data to savings.
          </h2>
          <p className="mt-5 text-pretty text-[16px] font-normal leading-[1.5] tracking-[-0.011em] text-faint">
            Upload a document or connect a source and the first review finishes
            in under two minutes. No forms to fill, no account required to start.
          </p>
        </motion.div>

        <div className="mx-auto mt-14 grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
