"use client";

import { motion } from "framer-motion";
import { AnimatedStat } from "@/components/ui/RollingNumber";

const ease = [0.22, 1, 0.36, 1] as const;

const STATS = [
  {
    value: 41,
    format: (v: number) => `$${Math.round(v)}M+`,
    label: "Potential savings identified",
  },
  {
    value: 38,
    format: (v: number) => `${Math.round(v)}k`,
    label: "Contracts scanned",
  },
  {
    value: 2,
    format: (v: number) => `${Math.round(v)} min`,
    label: "Average audit time",
  },
  {
    value: 96,
    format: (v: number) => `${Math.round(v)}%`,
    label: "Finding accuracy",
  },
];

/* ------------------------------------------------------------------ */
/*  Rolling-number stat band — the flask.do-style NumberFlow counters. */
/*  Each digit lives in its own mask and rolls to the target value the */
/*  moment the band scrolls into view.                                 */
/* ------------------------------------------------------------------ */

export function StatsBand() {
  return (
    <section className="relative overflow-hidden border-y border-line bg-canvas py-16 lg:py-20">
      <div className="relative mx-auto max-w-6xl px-5 lg:px-8">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease }}
          className="text-center text-[12px] font-medium uppercase tracking-[0.2em] text-muted"
        >
          Vendrz in numbers
        </motion.p>

        <div className="mx-auto mt-10 grid max-w-4xl grid-cols-2 gap-4 lg:grid-cols-4">
          {STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.55, delay: i * 0.08, ease }}
              className="glass-border glass-glow flex flex-col items-center justify-center rounded-2xl px-4 py-7 text-center"
            >
              <AnimatedStat
                value={stat.value}
                format={stat.format}
                className="text-[34px] font-semibold leading-none tracking-tight text-fg sm:text-[40px]"
              />
              <p className="mt-3 text-[10.5px] uppercase tracking-[0.14em] text-muted">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
