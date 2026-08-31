"use client";

import { motion } from "framer-motion";

const PAINS = [
  {
    num: "01",
    title: "Silent auto-renewal",
    body: "Miss the window and inaction is commitment - most agreements roll into another full term by default.",
  },
  {
    num: "02",
    title: "Notice windows buried in fine print",
    body: "Cancel-by dates sit 30–90 days before renewal, inside a clause you signed years ago and never re-read.",
  },
  {
    num: "03",
    title: "Escalations that compound",
    body: "A 5% annual increase sounds small. Uncapped, it stacks every year on a larger base - quietly.",
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
          <p className="text-[11px] font-[510] uppercase tracking-[0.16em] text-faint">
            The problem
          </p>
          <h2 className="mt-4 max-w-xl text-balance text-4xl font-[510] leading-[1.05] tracking-[-0.022em] text-fg sm:text-5xl">
            Vendor contracts are designed to be forgotten.
          </h2>
          <p className="mt-5 max-w-md text-pretty text-[15px] font-normal leading-[1.5] tracking-[-0.011em] text-faint">
            Renewals renew themselves. Cancel-by dates hide in section 7.1.
            Escalations compound quietly. By the time anyone looks, you&apos;ve
            already agreed to next year&apos;s price.
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
    </section>
  );
}
