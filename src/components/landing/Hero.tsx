"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Magnetic } from "@/components/ui/Magnetic";

const ease = [0.22, 1, 0.36, 1] as const;

/* ------------------------------------------------------------------ */
/*  flask.do-style headline — words roll up out of their masks with a  */
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
            initial={{ y: "115%", opacity: 0 }}
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
      <div className="bg-grid-dark absolute inset-0 opacity-60" />
      <div className="bg-dot-matrix absolute inset-0" />
      <div className="absolute inset-x-0 top-0 h-px bg-line" />

      {/* ambient glow behind the headline */}
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-[420px] w-[min(86vw,720px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-tr from-emerald-500/[0.07] via-zinc-500/[0.03] to-transparent blur-3xl animate-aurora" />

      <div className="relative mx-auto flex w-full max-w-7xl flex-col items-center px-5 pb-24 pt-32 sm:pb-28 lg:px-8 lg:pt-36">
        <div className="flex max-w-3xl flex-col items-center text-center">
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="max-w-2xl text-balance text-5xl font-semibold leading-[1.05] tracking-[-0.03em] text-fg sm:text-6xl"
          >
            <StaggeredWords text="Know where your money's going." />
            <span className="relative mt-2 inline-block">
              <span className="bg-gradient-to-r from-fg via-zinc-400 to-fg bg-[length:200%_auto] bg-clip-text text-transparent animate-shimmer">
                <StaggeredWords text="Find where you can save." delay={0.32} />
              </span>
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.55, ease }}
            className="mt-6 max-w-xl text-pretty text-lg font-normal leading-[1.5] tracking-[-0.01em] text-muted"
          >
            Vendor Watchtower turns your financial transactions, invoices, and contracts
            into spend intelligence — renewals, waste, billing anomalies, and the savings
            hiding inside them.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.68, ease }}
            className="mt-9 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row"
          >
            <Magnetic>
              <Button href="/audit" size="lg" className="w-full px-7 sm:w-auto">
                Run your free vendor spend audit
              </Button>
            </Magnetic>
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.82 }}
            className="mt-5 text-[13px] tracking-tight text-muted/70"
          >
            Read-only · we cannot move money or modify your accounts
          </motion.p>
        </div>

        {/* trust strip line */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.1 }}
          className="mt-16 flex flex-wrap items-center justify-center gap-x-7 gap-y-2 text-[13px] tracking-tight text-muted/60"
        >
          <span>Renewal warnings</span>
          <span className="size-1 rounded-full bg-white/20" aria-hidden="true" />
          <span>Waste detection</span>
          <span className="size-1 rounded-full bg-white/20" aria-hidden="true" />
          <span>Spend intelligence</span>
          <span className="size-1 rounded-full bg-white/20" aria-hidden="true" />
          <span>Savings tracking</span>
        </motion.div>
      </div>
    </section>
  );
}
