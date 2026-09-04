"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";

const ease = [0.22, 1, 0.36, 1] as const;

export function CtaSection() {
  return (
    <section className="relative overflow-hidden border-t border-line bg-canvas py-24 lg:py-32">
      <motion.div
        initial={false}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7, ease }}
        className="relative mx-auto max-w-2xl px-5 text-center"
      >
        <h2 className="max-w-xl text-balance text-4xl font-[510] leading-[1.05] tracking-[-0.022em] text-fg sm:text-5xl">
          Find the leaks before they become next year&apos;s budget.
        </h2>
        <p className="mt-5 text-pretty text-[16px] font-normal leading-[1.5] tracking-[-0.011em] text-faint">
          Run a free review - upload a contract or connect Gmail, Google Drive,
          or Slack - and see the renewals, price increases, and wasted spend
          hiding in what you already pay for.
        </p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button href="/audit" size="lg" className="w-full px-8 sm:w-auto shadow-[inset_0_1px_1px_rgba(0,0,0,0.1),inset_0_0_0_1px_rgba(0,0,0,0.08)]">
            Find my savings
          </Button>
        </div>
        <p className="mt-5 text-[12px] font-normal tracking-[-0.01em] text-ash">
          No signup · No credit card · First review in under two minutes
        </p>
      </motion.div>
    </section>
  );
}
