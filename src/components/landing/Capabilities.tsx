"use client";

import { motion } from "framer-motion";
import { EASE, STAGGER_MS } from "./motion";

const ease = EASE;

/* ------------------------------------------------------------------ */
/*  Core differentiator: every finding cites its source, and the       */
/*  risk/savings logic is inspectable.                                  */
/* ------------------------------------------------------------------ */

const ITEMS: { label: string; body: string }[] = [
  {
    label: "Evidence",
    body: "Open any finding and read the sentence it came from - the clause, document page, or invoice line - before you act on it.",
  },
  {
    label: "Risk",
    body: "Renewal and pricing checks run on deterministic rules, not model judgment, so the same contract always gets the same answer.",
  },
  {
    label: "Savings",
    body: "Savings estimates are computed by a published formula from the terms in your document, with the calculation shown next to each figure.",
  },
  {
    label: "Action",
    body: "n4ma explains what should happen next - renew, renegotiate, or cancel - and by when.",
  },
];

function CapabilityCard({
  item,
  index,
}: {
  item: { label: string; body: string };
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, delay: index * (STAGGER_MS / 1000), ease }}
      whileHover={{ y: -4 }}
      className="glass-glow flex aspect-square flex-col items-center justify-center rounded-md border border-line bg-surface p-5 text-center"
    >
      <span className="font-mono text-[11px] tracking-[-0.013em] text-ash">
        {String(index + 1).padStart(2, "0")}
      </span>
      <p className="mt-3 text-[14px] font-[510] tracking-[-0.012em] text-fg">{item.label}</p>
      <p className="mt-1.5 text-[11.5px] font-normal leading-relaxed tracking-[-0.01em] text-faint">{item.body}</p>
    </motion.div>
  );
}

export function Capabilities() {
  return (
    <section id="product" className="bg-canvas py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease }}
          className="mx-auto max-w-2xl text-center"
        >
          <p className="text-[12px] font-[510] tracking-[-0.01em] text-faint">
            Why n4ma
          </p>
          <h2 className="mt-4 text-balance text-4xl font-[510] leading-[1.05] tracking-[-0.022em] text-fg sm:text-5xl">
            Check every finding yourself.
          </h2>
          <p className="mt-5 text-pretty text-[16px] font-normal leading-[1.5] tracking-[-0.011em] text-faint">
            The model that reads your document is a starting point, not the
            verdict. Each finding cites the clause, page, or invoice line it
            came from, and the numbers behind it are computed by rules you
            can inspect - so nothing rests on trusting the model.
          </p>
        </motion.div>

        {/* square feature grid */}
        <div className="mt-14 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {ITEMS.map((item, i) => (
            <CapabilityCard key={item.label} item={item} index={i} />
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.6, ease }}
          className="mx-auto mt-14 max-w-xl px-5 text-center font-mono text-[12px] uppercase tracking-[0.16em] text-ash lg:px-8"
        >
          The reading is assisted. The evidence is not.
        </motion.p>
      </div>
    </section>
  );
}
