"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { CountUp } from "@/lib/motion";

/* ------------------------------------------------------------------ */
/*  Workstation panels & compact metric blocks                         */
/*  Animations follow the Apple language: panels reveal on a soft      */
/*  ease as they enter, KPI numbers count up from 0, no glow.         */
/* ------------------------------------------------------------------ */

const EASE = [0.22, 1, 0.36, 1] as const;

export function Panel({
  title,
  sub,
  right,
  children,
  className = "",
  bodyClass = "",
}: {
  title: React.ReactNode;
  sub?: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClass?: string;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, ease: EASE }}
      className={`panel-surface border-sheen flex min-h-0 flex-col ${className}`}
    >
      <header className="panel-header">
        <div className="min-w-0">
          <span className="panel-title">{title}</span>
          {sub && <span className="ml-2 text-[11px] text-muted">{sub}</span>}
        </div>
        {right && <div className="flex shrink-0 items-center gap-1.5">{right}</div>}
      </header>
      <div className={`min-h-0 flex-1 ${bodyClass}`}>{children}</div>
    </motion.section>
  );
}

/** Compact financial data block: small label, large value, small metadata. */
export function KpiBlock({
  label,
  value,
  sub,
  accent = "text-fg",
  count,
  countFormat,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  accent?: string;
  /** When provided, render `value` as a count-up from 0 (Apple-style). */
  count?: number;
  countFormat?: (v: number) => string;
}) {
  return (
    <div className="min-w-0 px-4 py-3">
      <p className="truncate text-[10px] font-semibold tracking-[0.1em] text-muted">
        {label}
      </p>
      <p className={`mt-1.5 truncate text-[19px] font-semibold leading-none tracking-tight ${accent}`}>
        {typeof count === "number" ? (
          <CountUp target={count} format={countFormat} />
        ) : (
          value
        )}
      </p>
      {sub && <p className="mt-1.5 truncate text-[10.5px] tracking-tight text-muted/70">{sub}</p>}
    </div>
  );
}

/** KPI strip - one bordered row of dividers, not floating cards. */
export function KpiStrip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex shrink-0 divide-x divide-line overflow-x-auto border-b border-line bg-surface">
      {children}
    </div>
  );
}

export function PanelEmpty({
  title = "Nothing here",
  body,
}: {
  title?: string;
  body?: string;
}) {
  return (
    <div className="flex h-full min-h-[120px] flex-col items-center justify-center px-6 text-center">
      <p className="text-[12.5px] font-medium text-zinc-400">{title}</p>
      {body && <p className="mt-1 max-w-xs text-[11.5px] leading-relaxed text-zinc-600">{body}</p>}
    </div>
  );
}

/** Section label inside inspectors / dense panels. */
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-4 pb-1 pt-3 text-[10px] font-semibold tracking-[0.12em] text-muted/60">
      {children}
    </p>
  );
}

/** Honest full-workspace empty state shown when there is no real data yet. */
export function WorkspaceEmpty({
  title = "No data available",
  body,
}: {
  title?: string;
  body?: string;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <p className="text-[15px] font-medium text-fg">{title}</p>
      {body && <p className="mt-2 max-w-sm text-[12.5px] leading-relaxed text-muted">{body}</p>}
      <div className="mt-5 flex items-center gap-2">
        <Link
          href="/upload"
          className="flex h-8 items-center rounded-md bg-white px-3.5 text-[12.5px] font-medium text-black transition-opacity hover:opacity-90"
        >
          Upload a contract
        </Link>
        <Link
          href="/audit"
          className="flex h-8 items-center rounded-md border border-line px-3.5 text-[12.5px] font-medium text-muted transition-colors hover:bg-white/[0.05] hover:text-fg"
        >
          Run a review
        </Link>
      </div>
    </div>
  );
}
