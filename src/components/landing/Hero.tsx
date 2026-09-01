"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";

const ease = [0.22, 1, 0.36, 1] as const;

/* ------------------------------------------------------------------ */
/*  Headline                                                            */
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
            className="text-[12px] font-[510] tracking-[-0.01em] text-faint"
          >
            AI that finds hidden fees in everyday tools
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
            n4ma reads your contracts, invoices, and subscriptions and points out
            where you&apos;re overpaying - hidden fees, automatic renewals, and price
            increases you didn&apos;t notice. Upload a document and see what&apos;s costing
            you, in plain English.
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
      </div>
    </section>
  );
}