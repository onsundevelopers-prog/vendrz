"use client";

import { motion } from "framer-motion";

const QUOTES = [
  {
    initials: "RK",
    quote:
      "We found a renewal we'd have signed blind. Vendrz flagged it in the time it took to finish a coffee.",
    title: "R. Kaur — Head of Procurement",
  },
  {
    initials: "DT",
    quote:
      "Every finding links straight to the clause. That paper trail is the whole reason finance trusts it.",
    title: "D. Tran — Controller",
  },
  {
    initials: "ML",
    quote:
      "First result in under a minute, no account, no sales call. That alone won us over.",
    title: "M. Lopez — Ops Lead",
  },
];

const ease = [0.22, 1, 0.36, 1] as const;

export function Testimonials() {
  return (
    <section className="bg-surface py-24 lg:py-28">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease }}
          className="text-[12px] font-medium uppercase tracking-[0.2em] text-muted"
        >
          Loved by finance teams
        </motion.p>

        <div className="mt-10 grid gap-8 md:grid-cols-3">
          {QUOTES.map((q, i) => (
            <motion.figure
              key={q.initials}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.55, delay: i * 0.08, ease }}
            >
              <div className="flex size-8 items-center justify-center rounded-full bg-white/10 text-[11px] font-medium text-fg">
                {q.initials}
              </div>
              <blockquote className="mt-4 text-[15.5px] font-normal leading-[1.55] tracking-[-0.01em] text-fg">
                “{q.quote}”
              </blockquote>
              <figcaption className="mt-3 text-[11.5px] tracking-tight text-muted">
                {q.title}
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}
