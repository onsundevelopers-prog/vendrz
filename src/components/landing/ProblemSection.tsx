"use client";

import { motion } from "framer-motion";
import { EASE, STAGGER_MS } from "./motion";

const ease = EASE;

const PAINS = [
  {
    num: "01",
    title: "Written feedback is slow",
    body: "Typing out detailed video feedback takes forever, and by the time you finish, the context is already lost.",
  },
  {
    num: "02",
    title: "Context gets lost",
    body: "Scattered comments across email, Slack, and spreadsheets make it impossible to track what was said about which scene.",
  },
  {
    num: "03",
    title: "No visual references",
    body: "Without the ability to draw or share references, feedback becomes vague and open to misinterpretation.",
  },
  {
    num: "04",
    title: "Teams stay out of sync",
    body: "Without organized, timestamped feedback, reviewers and creators end up misaligned on what needs to change.",
  },
];

export function ProblemSection() {
  return (
    <section className="bg-surface py-24 lg:py-32">
      <div className="mx-auto grid max-w-7xl gap-14 px-5 lg:grid-cols-[1fr_1.15fr] lg:gap-20 lg:px-8">
        {/* left - editorial header */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease }}
          className="lg:sticky lg:top-28 lg:self-start"
        >
          <p className="text-[12px] font-[510] tracking-[-0.01em] text-faint">
            The problem
          </p>
          <h2 className="mt-4 max-w-xl text-balance text-4xl font-[510] leading-[1.05] tracking-[-0.022em] text-fg sm:text-5xl">
            Video feedback, done wrong
          </h2>
          <p className="mt-5 max-w-md text-pretty text-[15px] font-normal leading-[1.5] tracking-[-0.011em] text-faint">
            Most teams give feedback on videos the hard way: typing long comments,
            losing context, and hoping everyone interprets things the same way.
            Flask fixes this by making feedback fast, visual, and organized.
          </p>
        </motion.div>

        {/* right - numbered pains, hairline-separated */}
        <div className="divide-rule-light">
          {PAINS.map((pain, i) => (
            <motion.div
              key={pain.num}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.55, delay: i * (STAGGER_MS / 1000), ease }}
              className="grid gap-4 py-8 first:pt-0 sm:grid-cols-[64px_1fr] sm:gap-8"
            >
              <span className="font-mono text-[13px] tracking-[-0.013em] text-ash">{pain.num}</span>
              <div>
                <h3 className="text-[15.5px] font-[510] tracking-[-0.014em] text-fg">
                  {pain.title}
                </h3>
                <p className="mt-2 max-w-md text-[14px] font-normal leading-[1.65] tracking-[-0.011em] text-faint">
                  {pain.body}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.7, delay: 0.1, ease }}
        className="mx-auto mt-16 max-w-2xl px-5 text-center text-pretty text-[15px] font-normal leading-relaxed tracking-[-0.01em] text-fg lg:px-8"
      >
        Each pain is a workflow tax, not a one-off annoyance. Flask removes them
        by making video feedback fast, visual, and organized from the first
        comment.
      </motion.p>
    </section>
  );
}
