"use client";

import { motion } from "framer-motion";
import { EASE, CountUp } from "./motion";

/* ------------------------------------------------------------------ */
/*  Savings - the quantified financial outcome.                        */
/*                                                                     */
/*  The ledger below is an ILLUSTRATIVE example of what a single       */
/*  review can surface. It is never presented as a real customer       */
/*  result; real findings are always computed from the user's own      */
/*  documents and labeled as estimates.                                */
/* ------------------------------------------------------------------ */

const ROWS = [
  { label: "Auto-renewal caught in time", value: "1 renewal" },
  { label: "Price escalation found in contract", value: "6% / year" },
  { label: "Unused seats on one invoice", value: "14 seats" },
  { label: "Duplicate tools doing the same job", value: "2 tools" },
];

const ease = EASE;

export function Savings() {
  return (
    <section id="savings" className="border-t border-line bg-surface py-24 lg:py-32">
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 lg:grid-cols-[1fr_1.05fr] lg:gap-20 lg:px-8">
        {/* left - editorial header */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease }}
        >
          <p className="text-[12px] font-[510] tracking-[-0.01em] text-faint">
            What you get
          </p>
          <h2 className="mt-4 max-w-xl text-balance text-4xl font-[510] leading-[1.05] tracking-[-0.022em] text-fg sm:text-5xl">
            What a single review produces.
          </h2>
          <p className="mt-5 max-w-md text-pretty text-[15px] font-normal leading-[1.5] tracking-[-0.011em] text-faint">
            A ranked list of findings - each with its source evidence and the
            annual impact calculated from your own terms - so the renew,
            renegotiate, or cancel decision takes minutes, not weeks.
          </p>
          <div className="mt-8 space-y-4">
            {[
              ["What's wrong", "The leak, in plain language."],
              ["Why it matters", "The clause and the deadline behind it."],
              ["What it costs", "Annual impact, from your own numbers."],
            ].map(([title, body]) => (
              <div key={title} className="grid grid-cols-[110px_1fr] gap-4">
                <p className="text-[12px] font-[510] uppercase tracking-[0.12em] text-ash">
                  {title.trim()}
                </p>
                <p className="text-[13.5px] font-normal leading-relaxed tracking-[-0.011em] text-faint">
                  {body.trim()}
                </p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* right - illustrative findings ledger */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7, delay: 0.1, ease }}
          className="rounded-xl border border-line bg-canvas p-6 sm:p-8"
        >
          <div className="flex items-center justify-between gap-4">
            <p className="text-[13px] font-[510] tracking-[-0.01em] text-fg">
              Estimated annual impact
            </p>
            <span className="rounded-full border border-line px-2.5 py-0.5 text-[10.5px] font-normal tracking-[-0.01em] text-muted">
              Illustrative example
            </span>
          </div>

          <p className="mt-6 text-[44px] font-[510] leading-none tracking-[-0.03em] text-fg sm:text-[56px]">
            <CountUp to={31} prefix="$" suffix="k" duration={1.6} />
          </p>

          <div className="mt-8 divide-rule-light">
            {ROWS.map((row) => (
              <div
                key={row.label}
                className="flex items-baseline justify-between gap-4 py-3.5 text-[13.5px]"
              >
                <span className="font-normal tracking-[-0.01em] text-faint">
                  {row.label}
                </span>
                <span className="font-mono text-[13px] tracking-[-0.01em] text-fg">
                  {row.value}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-2 flex items-baseline justify-between gap-4 border-t border-line-strong pt-4">
            <span className="text-[13px] font-[510] tracking-[-0.01em] text-fg">
              Recommended actions
            </span>
            <span className="font-mono text-[15px] font-[510] tracking-[-0.01em] text-fg">
              Renegotiate · Cancel
            </span>
          </div>

          <p className="mt-6 text-[11.5px] font-normal leading-relaxed tracking-[-0.01em] text-ash">
            Example from a sample review, for illustration only. Your own
            findings and estimates depend on your documents and spending.
          </p>

          <p className="mt-2 text-center text-[12px] tracking-tight text-muted">
            The figures above are an illustrative example, not a promise.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
