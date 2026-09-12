"use client";

import { motion } from "framer-motion";
import { EASE, STAGGER_MS } from "./motion";

const ease = EASE;

const PAINS = [
  {
    num: "01",
    title: "Renewals slip through unnoticed",
    body: "Auto-renewal clauses buried on page 9 of a contract quietly renew at full price - or worse, at an escalated rate - because nobody tracked the notice deadline.",
  },
  {
    num: "02",
    title: "The terms live in scattered documents",
    body: "The contract is in Drive, the invoice is in an email thread, the renewal notice is in Slack. No single place shows what you agreed to, what you pay, or when the window to act closes.",
  },
  {
    num: "03",
    title: "Nobody verifies the bill",
    body: "Invoices arrive with fees, seat counts, and price bumps that may not match what you signed. Checking every line against the contract by hand never happens - so overbilling just gets paid.",
  },
  {
    num: "04",
    title: "Decisions get made without evidence",
    body: "Renew or cancel is decided from memory and gut feel. Without the clause, the invoice line, and the calculated annual impact in front of you, you either overpay or cut something you needed.",
  },
];

export function ProblemSection() {
  return (
    <section className="bg-surface py-24 lg:py-32">
      <div className="mx-auto grid max-w-7xl gap-14 px-5 lg:grid-cols-[1fr_1.15fr] lg:gap-20 lg:px-8">
        {/* left - editorial header */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease }}
          className="lg:sticky lg:top-28 lg:self-start"
        >
          <p className="text-[12px] font-[510] tracking-[-0.01em] text-faint">
            The problem
          </p>
          <h2 className="mt-4 max-w-xl text-balance text-4xl font-[510] leading-[1.05] tracking-[-0.022em] text-fg sm:text-5xl">
            Software spending, leaking quietly
          </h2>
          <p className="mt-5 max-w-md text-pretty text-[15px] font-normal leading-[1.5] tracking-[-0.011em] text-faint">
            Most companies lose money to their own software contracts: renewals
            nobody tracked, escalations nobody noticed, fees nobody verified.
            N4MA reads the source documents and finds the leaks.
          </p>
        </motion.div>

        {/* right - numbered pains, hairline-separated */}
        <div className="divide-rule-light">
          {PAINS.map((pain, i) => (
            <motion.div
              key={pain.num}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.55, delay: i * (STAGGER_MS / 1000), ease }}
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
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.7, delay: 0.1, ease }}
        className="mx-auto mt-16 max-w-2xl px-5 text-center text-pretty text-[15px] font-normal leading-relaxed tracking-[-0.01em] text-fg lg:px-8"
      >
        Each leak is recurring, not one-off: the same missed deadline and
        unverified invoice charge you again next year. N4MA finds them from the
        documents you already have.
      </motion.p>
    </section>
  );
}
