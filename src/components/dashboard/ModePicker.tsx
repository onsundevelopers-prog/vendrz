"use client";

import { motion } from "framer-motion";
import { ArrowRight, LayoutGrid, SlidersHorizontal } from "lucide-react";
import { useDisplayMode, BUSINESS_PRICE, type DashboardMode } from "@/lib/displayMode";
import { useSpotlight } from "@/lib/motion";

/* ------------------------------------------------------------------ */
/*  Plan chooser - shown once, before the Overview, when the user has  */
/*  not picked a plan yet. Two centered buttons on the dark canvas.    */
/*  Choosing Business on a free account opens the upgrade screen       */
/*  (Business is part of the paid plan, not a free toggle).            */
/* ------------------------------------------------------------------ */

const OPTIONS: {
  mode: DashboardMode;
  title: string;
  price: string;
  desc: string;
  points: string[];
  icon: React.ReactNode;
}[] = [
  {
    mode: "simple",
    title: "Simple",
    price: "Free",
    desc: "A clean version for managing contracts, renewals, risks, savings, and AI.",
    points: ["What needs attention", "Upcoming renewals", "Risks and savings", "AI assistant"],
    icon: <LayoutGrid size={16} />,
  },
  {
    mode: "business",
    title: "Business",
    price: BUSINESS_PRICE,
    desc: "The full workspace for companies that need more advanced features.",
    points: ["Every contract term", "Dense editor tables with sorting and filters", "Exposure and escalation", "Complete activity log"],
    icon: <SlidersHorizontal size={16} />,
  },
];

function PlanOption({ mode, title, price, desc, points, icon, onPick }: (typeof OPTIONS)[number] & { onPick: (m: DashboardMode) => void }) {
  const spotRef = useSpotlight<HTMLButtonElement>();
  return (
    <motion.button
      ref={spotRef}
      onClick={() => onPick(mode)}
      whileHover={{ y: -4, scale: 1.015 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: "spring", stiffness: 420, damping: 26 }}
      className="spotlight-card glass-border glass-glow group w-[300px] overflow-hidden rounded-xl border border-line-strong bg-surface p-6 text-left text-fg shadow-lg shadow-black/40 transition-all hover:border-white/25 hover:shadow-2xl hover:shadow-black/60"
    >
      <span className="spotlight-glow" aria-hidden="true" />
      <span className="flex items-center gap-2.5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-hover text-fg">
          {icon}
        </span>
        <span className="text-[17px] font-semibold tracking-tight">{title}</span>
        <ArrowRight
          size={15}
          className="ml-auto -translate-x-1 text-muted opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100"
        />
      </span>
      <span className="mt-1 block text-[11.5px] font-medium tracking-tight text-zinc-400">
        {price}
      </span>
      <span className="mt-3 block text-[13px] leading-relaxed text-muted">{desc}</span>
      <span className="mt-4 block space-y-1.5">
        {points.map((p) => (
          <span key={p} className="flex items-center gap-2 text-[12px] text-muted">
            <span className="size-1 rounded-full bg-zinc-500" aria-hidden="true" />
            {p}
          </span>
        ))}
      </span>
    </motion.button>
  );
}

export function ModePicker() {
  const { setMode } = useDisplayMode();

  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center bg-canvas px-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="text-center"
      >
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.2em] text-muted">
          noma
        </p>
        <h1 className="mt-3 text-[26px] font-semibold tracking-tight text-fg">
          How do you want to use noma?
        </h1>
        <p className="mt-2 text-[13px] text-muted">
          Two ways to work with the same data. You can switch anytime in Settings.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
        className="mt-10 flex flex-col items-stretch gap-4 sm:flex-row sm:gap-5"
      >
        {OPTIONS.map((opt) => (
          <PlanOption key={opt.mode} {...opt} onPick={setMode} />
        ))}
      </motion.div>
    </div>
  );
}
