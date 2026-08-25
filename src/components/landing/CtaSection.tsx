"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";

const ease = [0.22, 1, 0.36, 1] as const;

export function CtaSection() {
  return (
    <section className="relative overflow-hidden border-t border-line bg-canvas py-24 lg:py-32">
      <div className="bg-grid-dark absolute inset-0 opacity-40" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7, ease }}
        className="relative mx-auto max-w-2xl px-5 text-center"
      >
        <h2 className="max-w-xl text-balance text-4xl font-semibold leading-[1.05] tracking-[-0.035em] text-fg sm:text-5xl">
          Know where your money&apos;s going. Find where you can save.
        </h2>
        <p className="mt-5 text-pretty text-[16px] font-normal leading-[1.5] tracking-[-0.01em] text-muted">
          Run a free vendor spend audit and see the renewals, waste, and savings
          hiding in your spend — before the deadlines pass, not after.
        </p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button
            href="/audit"
            size="lg"
            className="w-full px-8 sm:w-auto"
          >
            Run your free vendor spend audit
          </Button>
        </div>
        <p className="mt-5 text-[12px] tracking-tight text-muted">
          No signup · No credit card · First audit in under two minutes
        </p>
      </motion.div>
    </section>
  );
}
