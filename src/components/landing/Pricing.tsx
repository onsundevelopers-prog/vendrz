"use client";

import { motion } from "framer-motion";
import { EASE } from "./motion";
import { TierCard, CARDS } from "./JoinWaitlistCard";

const ease = EASE;

export function Pricing() {
  return (
    <section id="pricing" className="bg-canvas py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease }}
          className="mx-auto max-w-2xl text-center"
        >
          <p className="text-[12px] font-[510] tracking-[-0.01em] text-faint">
            Pricing
          </p>
          <h2 className="mt-4 text-balance text-4xl font-[510] leading-[1.05] tracking-[-0.022em] text-fg sm:text-5xl">
            30 days free, then simple pricing
          </h2>
          <p className="mt-5 text-pretty text-[16px] font-normal leading-[1.5] tracking-[-0.011em] text-faint">
            Every new account gets 30 days of N4MA free, without a credit card.
            After that, the Team Plus upgrade is $250 CAD one-time via e-transfer.
            Business and Enterprise are available for larger organizations.
          </p>
        </motion.div>

        <div className="mx-auto mt-16 grid max-w-6xl items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {CARDS.map((card, i) => (
            <TierCard key={card.id} card={card} index={i} />
          ))}
        </div>

        <p className="mt-10 text-center text-[12px] tracking-tight text-muted">
          The $250/month Pro tier is not available for purchase or free trial.
          It unlocks by joining the Discord, Skool group, newsletter, or referring
          a friend — we&apos;ll email you when your path is verified.
        </p>
        <p className="mt-2 text-center text-[12px] tracking-tight text-muted">
          After the 30-day trial, access returns to Free. Your contract reviews
          stay in your workspace, and you can upgrade whenever you want.
        </p>
        <p className="mt-2 text-center text-[12px] tracking-tight text-muted">
          All metrics above are illustrative, not customer results or promises.
        </p>
      </div>
    </section>
  );
}
