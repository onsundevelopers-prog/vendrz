"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";

const ease = [0.22, 1, 0.36, 1] as const;

/* ------------------------------------------------------------------ */
/*  Linear-style headline - words roll up out of their masks onto a     */
/*  510-weight, tightly-tracked display line.                           */
/* ------------------------------------------------------------------ */

function StaggeredWords({ text, delay = 0 }: { text: string; delay?: number }) {
  const words = text.split(" ");
  return (
    <>
      {words.map((word, i) => (
        <span key={`${word}-${i}`} className="inline-block overflow-hidden align-bottom">
          <motion.span
            className="inline-block"
            initial={false}
            animate={{ y: "0%", opacity: 1 }}
            transition={{ duration: 0.75, delay: delay + i * 0.055, ease }}
          >
            {word}
            {i < words.length - 1 ? "\u00A0" : ""}
          </motion.span>
        </span>
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Product screenshot frame - the app's real UI language (hairline     */
/*  table, chips, tabular figures) shown inside a carbon card.          */
/* ------------------------------------------------------------------ */

const MOCK_ROWS = [
  { vendor: "Acme Analytics", spend: "$84,200", renews: "Jan 12", state: "Renewal window open", tone: "chip-green" },
  { vendor: "Northwind Cloud", spend: "$43,500", renews: "Feb 3", state: "Auto-renews", tone: "chip-red" },
  { vendor: "Corvid Legal", spend: "$28,900", renews: "Mar 17", state: "5% escalation", tone: "chip-amber" },
];

function ProductFrame() {
  return (
    <div className="border border-line bg-surface p-2 sm:p-2.5">
      {/* toolbar */}
      <div className="flex items-center gap-2 border-b border-line px-2.5 pb-2 pt-1">
        <span className="size-2 rounded-full bg-faint/40" />
        <span className="text-[11px] font-[510] tracking-[-0.01em] text-muted">
          Contract register
        </span>
        <span className="ml-auto rounded px-1.5 py-0.5 text-[10px] font-[510] tracking-[0.08em] text-faint">
          12 contracts
        </span>
      </div>
      {/* table head */}
      <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-6 border-b border-line px-2.5 py-1.5 text-[10px] font-[510] uppercase tracking-[0.09em] text-faint">
        <span>Vendor</span>
        <span>Annual spend</span>
        <span>Renews</span>
        <span className="text-right">Status</span>
      </div>
      {/* rows */}
      {MOCK_ROWS.map((row) => (
        <div
          key={row.vendor}
          className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-6 border-b border-line/60 px-2.5 py-2 last:border-0"
        >
          <span className="truncate text-[12.5px] text-fg">{row.vendor}</span>
          <span className="text-[12.5px] tabular-nums text-muted">{row.spend}</span>
          <span className="text-[12.5px] tabular-nums text-muted">{row.renews}</span>
          <span className={`chip justify-self-end ${row.tone}`}>{row.state}</span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-canvas">
      <div className="absolute inset-x-0 top-0 h-px bg-line" />

      {/* atmospheric floor - a quiet light wash that grounds the product UI */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-[560px] bg-[linear-gradient(180deg,rgba(8,9,10,0)_10%,rgba(208,214,224,0.07)_100%)]"
      />

      <div className="relative mx-auto flex w-full max-w-[1200px] flex-col px-5 pb-20 pt-32 sm:pb-24 lg:px-8 lg:pt-36">
        <div className="max-w-3xl">
          <motion.p
            initial={false}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="text-[11px] font-[510] uppercase tracking-[0.16em] text-faint"
          >
            Vendor spend intelligence
          </motion.p>

          <motion.h1
            initial={false}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="mt-5 max-w-2xl text-balance text-[44px] font-[510] leading-[1.02] tracking-[-0.022em] text-fg sm:text-[56px] lg:text-[64px]"
          >
            <StaggeredWords text="Know where your money's going." />
            <span className="relative mt-1 inline-block text-bone/90">
              <StaggeredWords text="Find where you can save." delay={0.32} />
            </span>
          </motion.h1>

          <motion.p
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.55, ease }}
            className="mt-6 max-w-xl text-pretty text-[16px] font-normal leading-[1.5] tracking-[-0.011em] text-faint"
          >
            n4ma turns your contracts, invoices and transactions into spend
            analysis: renewals, waste, billing anomalies, and the savings hiding
            inside them.
          </motion.p>

          <motion.div
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.68, ease }}
            className="mt-9 flex flex-col items-start gap-4 sm:flex-row sm:items-center"
          >
            <Button href="/audit" size="lg" className="w-full sm:w-auto">
              Run your free review
            </Button>
            <a
              href="#how-it-works"
              className="group inline-flex items-center gap-1.5 px-1 py-2 text-[13.5px] font-normal text-muted transition-colors hover:text-fg"
            >
              See how it works
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                aria-hidden="true"
                className="transition-transform duration-200 group-hover:translate-x-0.5"
              >
                <path d="M2 6h7M6.5 3 9 6l-2.5 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </motion.div>

          <motion.p
            initial={false}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.82 }}
            className="mt-5 text-[11.5px] font-normal tracking-[-0.01em] text-ash"
          >
            Read-only · no signup · first review in under two minutes
          </motion.p>
        </div>

        {/* product frame */}
        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5, ease }}
          viewport={{ once: true }}
          className="mt-14 sm:mt-16"
        >
          <div className="mx-auto max-w-[860px] rounded-xl border border-line bg-surface shadow-[inset_0_0_0_1px_rgba(35,37,42,0.6),0_24px_64px_rgba(0,0,0,0.45)]">
            <ProductFrame />
          </div>
        </motion.div>
      </div>
    </section>
  );
}