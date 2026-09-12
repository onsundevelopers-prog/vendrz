"use client";

import { motion } from "framer-motion";
import { EASE, STAGGER_MS } from "./motion";

const ease = EASE;

const STEPS = [
  {
    num: "01",
    title: "Connect",
    body: "Upload contracts and invoices (PDF, DOCX, CSV) or connect Gmail, Google Drive, or Slack read-only. N4MA never changes anything in your connected accounts.",
  },
  {
    num: "02",
    title: "Detect",
    body: "Vendors, spending, renewal dates, cancellation deadlines, escalation percentages, fees, and seat counts are extracted - then checked for leaks.",
  },
  {
    num: "03",
    title: "Prove",
    body: "Every finding links to its source: the clause, the document page, the invoice line, or the message. Open the evidence and verify it yourself.",
  },
  {
    num: "04",
    title: "Save",
    body: "A ranked list of findings: what's wrong, why it matters, the estimated annual impact, the deadline, and the recommended next action - renew, renegotiate, or cancel.",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="relative overflow-hidden bg-canvas py-24 lg:py-32"
    >
      <div className="relative mx-auto max-w-7xl px-5 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease }}
          className="mx-auto max-w-2xl text-center"
        >
          <p className="text-[12px] font-[510] tracking-[-0.01em] text-faint">
            How it works
          </p>
          <h2 className="mt-4 text-balance text-4xl font-[510] leading-[1.05] tracking-[-0.022em] text-fg sm:text-5xl">
            Connect. Detect. Prove. Save.
          </h2>
          <p className="mt-5 text-pretty text-[16px] font-normal leading-[1.5] tracking-[-0.011em] text-faint">
            Upload your documents or connect a read-only source, and N4MA does
            the reading. You get evidence-backed findings with the annual
            impact calculated from your own terms.
          </p>
        </motion.div>

        <div className="mx-auto mt-14 grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.55, delay: i * (STAGGER_MS / 1000), ease }}
              className="rounded-md border border-line bg-surface p-5"
            >
              <span className="font-mono text-[12px] tracking-[-0.013em] text-ash">
                {step.num}
              </span>
              <h3 className="mt-3 text-[15px] font-[510] tracking-[-0.014em] text-fg">
                {step.title}
              </h3>
              <p className="mt-2 text-[13.5px] font-normal leading-[1.65] tracking-[-0.011em] text-faint">
                {step.body}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
