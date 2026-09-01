"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FAQS } from "@/lib/site";

const ease = [0.22, 1, 0.36, 1] as const;

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="bg-surface py-24 lg:py-32">
      <div className="mx-auto max-w-3xl px-5 lg:px-8">
        <motion.div
          initial={false}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease }}
          className="text-center"
        >
          <p className="text-[12px] font-[510] tracking-[-0.01em] text-faint">
            FAQ
          </p>
          <h2 className="mt-4 text-balance text-4xl font-[510] leading-[1.05] tracking-[-0.022em] text-fg sm:text-5xl">
            Questions, answered
          </h2>
        </motion.div>

        <motion.div
          initial={false}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7, delay: 0.1, ease }}
          className="mt-12 divide-rule-light"
        >
          {FAQS.map((faq, i) => {
            const isOpen = open === i;
            return (
              <div key={faq.q}>
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 py-5 text-left"
                >
                  <span className="text-[15px] font-[510] tracking-[-0.014em] text-fg">
                    {faq.q}
                  </span>
                  <span
                    aria-hidden="true"
                    className={`shrink-0 text-[16px] font-normal leading-none text-muted transition-transform duration-200 ${
                      isOpen ? "rotate-45 text-fg" : ""
                    }`}
                  >
                    +
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 350, damping: 25 }}
                    >
                      <motion.p
                        initial={{ opacity: 0, scale: 0.98, y: -6 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 350, damping: 25, delay: 0.04 }}
                        className="max-w-2xl pb-6 text-[14px] font-normal leading-[1.65] tracking-[-0.011em] text-faint"
                      >
                        {faq.a}
                      </motion.p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
