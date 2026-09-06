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
          Give feedback on videos in minutes, without typing comments.
        </h2>
        <p className="mt-5 text-pretty text-[16px] font-normal leading-[1.5] tracking-[-0.011em] text-faint">
          Upload a video, record your feedback, and Flask organizes everything
          automatically. No more scattered comments, lost context, or endless
          back-and-forth. Try it free for 14 days.
        </p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button href="/auth?mode=signup" size="lg" className="w-full px-8 sm:w-auto shadow-[inset_0_1px_1px_rgba(0,0,0,0.1),inset_0_0_0_1px_rgba(0,0,0,0.08)]">
            Try Flask Free
          </Button>
        </div>
        <p className="mt-5 text-[12px] font-normal tracking-[-0.01em] text-ash">
          14-day free trial · No credit card · Works on any video
        </p>
      </motion.div>
    </section>
  );
}
