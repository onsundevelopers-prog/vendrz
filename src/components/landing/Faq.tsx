"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const FAQS = [
  {
    q: "Do I really not need an account to get results?",
    a: "Correct. Upload a PDF or DOCX and you get the full analysis - risk score, findings with evidence, and a savings range - with no name, email, or signup. We only ask you to create an account if you want us to keep monitoring that contract.",
  },
  {
    q: "Where do the savings numbers come from?",
    a: "Deterministic rules applied to terms extracted from your document - escalation rates, auto-renewal status, annual value - combined with conservative market benchmarks. The LLM never outputs the final dollar figure, and every estimate carries a not-guaranteed disclaimer with its full methodology.",
  },
  {
    q: "Is my contract shared or used to train models?",
    a: "Never. Your documents are encrypted in transit and at rest, are never shared or sold, and are never used to train models. Analyses expire after 14 days unless you create an account and claim them.",
  },
  {
    q: "What happens to my scan if I don't sign up?",
    a: "Your anonymous session and its results are retained for 14 days, then deleted. If you create an account before then, the exact analysis is transferred to your account so nothing is lost.",
  },
  {
    q: "What does the Gmail integration actually do?",
    a: "It's optional and read-only. Connect it from the workspace (never during signup) and Noma proposes contract-related emails and attachments for you to review. Nothing is imported until you explicitly select it, and you can disconnect anytime.",
  },
];

const ease = [0.22, 1, 0.36, 1] as const;

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="bg-surface py-24 lg:py-32">
      <div className="mx-auto max-w-3xl px-5 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease }}
          className="text-center"
        >
          <p className="text-[12px] font-medium uppercase tracking-[0.2em] text-muted">
            FAQ
          </p>
          <h2 className="mt-4 text-balance text-4xl font-semibold leading-[1.05] tracking-[-0.03em] text-fg sm:text-5xl">
            Questions, answered
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
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
                  <span className="text-[15.5px] font-medium tracking-[-0.01em] text-fg">
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
                        className="max-w-2xl pb-6 text-[14.5px] font-normal leading-[1.7] tracking-[-0.01em] text-muted"
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
