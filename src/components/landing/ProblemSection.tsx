"use client";

import { motion } from "framer-motion";

const PAINS = [
  {
    num: "01",
    title: "Auto-renewals",
    body: "A missed cancellation window can lock a company into another year of a tool it barely uses.",
  },
  {
    num: "02",
    title: "Price increases",
    body: "A 5% annual escalation quietly compounds into much larger spending year after year.",
  },
  {
    num: "03",
    title: "Unused software",
    body: "Companies keep paying for seats, tools, and services nobody actually needs.",
  },
  {
    num: "04",
    title: "Duplicate spending",
    body: "Different teams can unknowingly pay multiple vendors for overlapping functionality.",
  },
];

const ease = [0.22, 1, 0.36, 1] as const;

export function ProblemSection() {
  return (
    <section className="bg-surface py-24 lg:py-32">
      <div className="mx-auto grid max-w-7xl gap-14 px-5 lg:grid-cols-[1fr_1.15fr] lg:gap-20 lg:px-8">
        {/* left - editorial header */}
        <motion.div
          initial={false}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease }}
          className="lg:sticky lg:top-28 lg:self-start"
        >
          <p className="text-[12px] font-[510] tracking-[-0.01em] text-faint">
            The problem
          </p>
          <h2 className="mt-4 max-w-xl text-balance text-4xl font-[510] leading-[1.05] tracking-[-0.022em] text-fg sm:text-5xl">
            The money leaks nobody notices.
          </h2>
          <p className="mt-5 max-w-md text-pretty text-[15px] font-normal leading-[1.5] tracking-[-0.011em] text-faint">
            The biggest waste isn&apos;t always a giant expense. It&apos;s the
            small costs that keep repeating because nobody is watching.
          </p>
        </motion.div>

        {/* right - numbered pains, hairline-separated */}
        <div className="divide-rule-light">
          {PAINS.map((pain, i) => (
            <motion.div
              key={pain.num}
              initial={false}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.55, delay: i * 0.08, ease }}
              className="grid gap-4 py-8 first:pt-0 sm:grid-cols-[64px_1fr] sm:gap-8"
            >
              <span className="font-mono text-[13px] tracking-[-0.013em] text-ash">{pain.num}</span>
              <div>
                <h3 className="text-[15.5px] font-[510] tracking-[-0.014em] text-fg">
                  {pain.title}
                </h3>
                <p className="mt-2 max-w-md text-[14px] font-normal leading-[1.65] tracking-[-0.011em] text-faint">
                  {pain.body}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <motion.p
        initial={false}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.7, delay: 0.1, ease }}
        className="mx-auto mt-16 max-w-2xl px-5 text-center text-pretty text-[15px] font-normal leading-relaxed tracking-[-0.01em] text-fg lg:px-8"
      >
        n4ma finds these leaks before they become another invoice.
      </motion.p>
    </section>
  );
}
