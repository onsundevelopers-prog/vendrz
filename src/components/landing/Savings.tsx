"use client";

import { motion } from "framer-motion";

/* ------------------------------------------------------------------ */
/*  Savings - the quantified financial outcome.                        */
/*                                                                     */
/*  The ledger below is an ILLUSTRATIVE example of what a single       */
/*  review can surface. It is never presented as a real customer       */
/*  result; real findings are always computed from the user's own      */
/*  documents and labeled as estimates.                                */
/* ------------------------------------------------------------------ */

const ROWS = [
  { label: "Unused licenses", value: "$7,200" },
  { label: "Upcoming renewal", value: "$4,800" },
  { label: "Duplicate software", value: "$3,600" },
  { label: "Contractual price increases", value: "$2,820" },
];

const ease = [0.22, 1, 0.36, 1] as const;

export function Savings() {
  return (
    <section id="savings" className="border-t border-line bg-surface py-24 lg:py-32">
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 lg:grid-cols-[1fr_1.05fr] lg:gap-20 lg:px-8">
        {/* left - editorial header */}
        <motion.div
          initial={false}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease }}
        >
          <p className="text-[12px] font-[510] tracking-[-0.01em] text-faint">
            What you get
          </p>
          <h2 className="mt-4 max-w-xl text-balance text-4xl font-[510] leading-[1.05] tracking-[-0.022em] text-fg sm:text-5xl">
            See the money before it leaves.
          </h2>
          <p className="mt-5 max-w-md text-pretty text-[15px] font-normal leading-[1.5] tracking-[-0.011em] text-faint">
            Every opportunity is quantified against the terms actually written
            in your contracts and invoices&mdash;renewal dates, escalation rates,
            and what you&apos;re paying today&mdash;so you can see the size of the
            leak and decide what&apos;s worth fixing.
          </p>
          <div className="mt-8 space-y-4">
            {[
              ["What to fix", "Every leak, ranked by size and urgency."],
              ["Why it matters", "The renewal, escalation, or clause behind it."],
              ["What it could save", "A transparent estimate - never a guess."],
            ].map(([title, body]) => (
              <div key={title} className="grid grid-cols-[110px_1fr] gap-4">
                <p className="text-[12px] font-[510] uppercase tracking-[0.12em] text-ash">
                  {title}
                </p>
                <p className="text-[13.5px] font-normal leading-relaxed tracking-[-0.011em] text-faint">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* right - illustrative savings ledger */}
        <motion.div
          initial={false}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7, delay: 0.1, ease }}
          className="rounded-xl border border-line bg-canvas p-6 sm:p-8"
        >
          <div className="flex items-center justify-between gap-4">
            <p className="text-[13px] font-[510] tracking-[-0.01em] text-fg">
              Potential annual savings
            </p>
            <span className="rounded-full border border-line px-2.5 py-0.5 text-[10.5px] font-normal tracking-[-0.01em] text-muted">
              Illustrative example
            </span>
          </div>

          <p className="mt-6 text-[44px] font-[510] leading-none tracking-[-0.03em] text-fg sm:text-[56px]">
            $18,420
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
              Estimated annual total
            </span>
            <span className="font-mono text-[15px] font-[510] tracking-[-0.01em] text-fg">
              $18,420
            </span>
          </div>

          <p className="mt-6 text-[11.5px] font-normal leading-relaxed tracking-[-0.01em] text-ash">
            Example from a sample review, for illustration only. Your estimates
            are computed from the terms in your own documents and always labeled
            as estimates&mdash;never as guaranteed savings.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
