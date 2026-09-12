"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";

import { EASE } from "./motion";

const ease = EASE;

export function CtaSection() {
  return (
    <section className="relative overflow-hidden border-t border-line bg-canvas py-24 lg:py-32">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7, ease }}
        className="relative mx-auto max-w-2xl px-5 text-center"
      >
        <h2 className="max-w-xl text-balance text-4xl font-[510] leading-[1.05] tracking-[-0.022em] text-fg sm:text-5xl">
          Your business is leaking money. N4MA finds it.
        </h2>
        <p className="mt-5 text-pretty text-[16px] font-normal leading-[1.5] tracking-[-0.011em] text-faint">
          Upload a contract or connect a read-only source, and get
          evidence-backed findings with the annual impact calculated from your
          own terms. Start with a free 30-day Team Plus trial.
        </p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button href="/auth?mode=signup" size="lg" className="w-full px-8 sm:w-auto shadow-[inset_0_1px_1px_rgba(0,0,0,0.1),inset_0_0_0_1px_rgba(0,0,0,0.08)]">
            Try N4MA Free
          </Button>
        </div>
        <p className="mt-5 text-[12px] font-normal tracking-[-0.01em] text-ash">
          30-day free trial · No credit card · Read-only connections
        </p>
      </motion.div>
    </section>
  );
}
