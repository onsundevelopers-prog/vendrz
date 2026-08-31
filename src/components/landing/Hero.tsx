"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";

const ease = [0.22, 1, 0.36, 1] as const;

/* ------------------------------------------------------------------ */
/*  flask.do-style headline - words roll up out of their masks with a  */
/*  springy ease, then the shimmer sentence follows.                   */
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

      <div className="relative mx-auto flex w-full max-w-7xl flex-col items-center px-5 pb-24 pt-32 sm:pb-28 lg:px-8 lg:pt-36">
        <div className="flex max-w-3xl flex-col items-center text-center">
          <motion.h1
            initial={false}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="max-w-2xl text-balance text-5xl font-semibold leading-[1.05] tracking-[-0.03em] text-fg sm:text-6xl"
          >
            <StaggeredWords text="Know where your money's going." />
            <span className="relative mt-2 inline-block">
              <span className="text-zinc-400">
                <StaggeredWords text="Find where you can save." delay={0.32} />
              </span>
            </span>
          </motion.h1>

          <motion.p
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.55, ease }}
            className="mt-6 max-w-xl text-pretty text-lg font-normal leading-[1.5] tracking-[-0.01em] text-muted"
          >
            n4ma turns your financial transactions, invoices, and contracts
            into spend analysis: renewals, waste, billing anomalies, and the savings
            hiding inside them.
          </motion.p>

          <motion.div
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.68, ease }}
            className="mt-9 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row"
          >
            <Button href="/audit" size="lg" className="w-full px-7 sm:w-auto">
              Run your free vendor spend review
            </Button>
            <Button
              href="#how-it-works"
              size="lg"
              variant="outline"
              className="w-full px-7 sm:w-auto"
            >
              See how it works
            </Button>
          </motion.div>

          <motion.p
            initial={false}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.82 }}
            className="mt-5 text-[13px] tracking-tight text-muted/70"
          >
            Read-only · we cannot move money or modify your accounts
          </motion.p>
        </div>

        {/* trust strip line */}
        <motion.div
          initial={false}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.1 }}
          className="mt-16 flex flex-wrap items-center justify-center gap-x-7 gap-y-2 text-[13px] tracking-tight text-muted/60"
        >
          <span>Renewal warnings</span>
          <span>Waste detection</span>
          <span>Spend analysis</span>
          <span>Savings tracking</span>
        </motion.div>
      </div>
    </section>
  );
}
