"use client";

import { motion } from "framer-motion";
import { PIPELINE_STAGES, generateAnalysis } from "@/lib/pipeline";
import { ResultsPreview } from "@/components/results/ResultsPreview";

const DEMO_RESULT = generateAnalysis("Master_Subscription_Agreement_2025.pdf", "pdf");

const ease = [0.22, 1, 0.36, 1] as const;

export function ProductDemo() {
  return (
    <section id="product" className="relative overflow-hidden bg-canvas">
      {/* fine grid + hairline edges */}
      <div className="bg-grid-dark absolute inset-0 opacity-50" />
      <div className="absolute inset-x-0 top-0 h-px bg-line" />

      <div className="relative mx-auto max-w-7xl px-5 py-24 lg:px-8 lg:py-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease }}
          className="mx-auto max-w-2xl text-center"
        >
          <p className="text-[12px] font-medium uppercase tracking-[0.2em] text-muted">
            The scanner
          </p>
          <h2 className="mt-4 text-balance text-4xl font-semibold leading-[1.05] tracking-[-0.03em] text-fg sm:text-5xl">
            One upload. Dates, risks &amp; savings - with receipts.
          </h2>
          <p className="mt-5 text-pretty text-[16px] font-normal leading-[1.5] tracking-[-0.01em] text-muted">
            Every scan runs the same staged pipeline: extraction, clause
            segmentation, validation, then rule-based risk scoring. Nothing is
            generated on vibes - every number traces back to a clause.
          </p>
        </motion.div>

        {/* the full, interactive results UI */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, delay: 0.1, ease }}
          className="mt-14 w-full"
        >
          <ResultsPreview result={DEMO_RESULT} />
        </motion.div>

        {/* pipeline - the real stages, as mono trace */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.8, delay: 0.25 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5"
        >
          {PIPELINE_STAGES.map((stage, i) => (
            <span key={stage.id} className="flex items-center gap-2">
              <span
                className={`text-[11px] tracking-tight ${
                  i === PIPELINE_STAGES.length - 1 ? "text-fg" : "text-muted/70"
                }`}
              >
                {stage.label}
              </span>
              {i < PIPELINE_STAGES.length - 1 ? (
                <span className="text-zinc-700">→</span>
              ) : null}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
