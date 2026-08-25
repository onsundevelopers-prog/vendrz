"use client";

import { motion } from "framer-motion";
import type { AlertSeverity, ActionStatus } from "@/lib/types";
import { AnimatedStat } from "./RollingNumber";

const ease = [0.22, 1, 0.36, 1] as const;

export function Panel({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease }}
      className={`rounded-2xl border border-line bg-surface ${className}`}
    >
      {children}
    </motion.div>
  );
}

export function SectionHeader({
  title,
  subtitle,
  action,
  className = "",
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-end justify-between gap-3 ${className}`}>
      <div>
        <h2 className="text-xl font-semibold leading-[1.05] tracking-[-0.035em] text-fg">{title}</h2>
        {subtitle && (
          <p className="mt-1 text-[12.5px] tracking-tight text-muted">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  valueFormat,
  icon,
  accent = "text-fg",
  sub,
  delay = 0,
  animate = true,
}: {
  label: string;
  value: number;
  valueFormat?: (v: number) => string;
  icon?: React.ReactNode;
  accent?: string;
  sub?: string;
  delay?: number;
  animate?: boolean;
}) {
  return (
    <Panel delay={delay} className="p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted">
          {label}
        </span>
        {icon && <span className={accent}>{icon}</span>}
      </div>
      <p className={`mt-2.5 text-[26px] font-semibold leading-none tracking-tight ${accent}`}>
        {animate ? (
          <AnimatedStat value={value} format={valueFormat ?? ((v) => Math.round(v).toLocaleString("en-US"))} />
        ) : (
          (valueFormat ? valueFormat(value) : Math.round(value).toLocaleString("en-US"))
        )}
      </p>
      {sub && <p className="mt-1.5 text-[11.5px] tracking-tight text-muted">{sub}</p>}
    </Panel>
  );
}

export function SeverityBadge({ severity }: { severity: AlertSeverity }) {
  const styles: Record<AlertSeverity, string> = {
    critical: "border-red-500/30 bg-red-500/10 text-red-400",
    high: "border-orange-500/30 bg-orange-500/10 text-orange-400",
    medium: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    low: "border-white/10 bg-white/[0.05] text-muted",
  };
  const dots: Record<AlertSeverity, string> = {
    critical: "bg-red-400",
    high: "bg-orange-400",
    medium: "bg-amber-400",
    low: "bg-zinc-500",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.06em] ${styles[severity]}`}>
      <span className={`size-1.5 rounded-full ${dots[severity]}`} />
      {severity}
    </span>
  );
}

export function ActionStatusBadge({ status }: { status: ActionStatus }) {
  const styles: Record<ActionStatus, string> = {
    open: "border-white/15 bg-white/[0.06] text-fg",
    in_review: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    actioned: "border-blue-500/30 bg-blue-500/10 text-blue-400",
    dismissed: "border-white/10 bg-white/[0.03] text-zinc-500",
    savings_confirmed: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  };
  const labels: Record<ActionStatus, string> = {
    open: "Open",
    in_review: "In review",
    actioned: "Actioned",
    dismissed: "Dismissed",
    savings_confirmed: "Savings confirmed",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium tracking-tight ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

export function HealthScore({
  score,
  size = "md",
}: {
  score: number;
  size?: "sm" | "md" | "lg";
}) {
  const color =
    score >= 80 ? "text-emerald-400" : score >= 60 ? "text-fg" : score >= 40 ? "text-amber-400" : "text-red-400";
  const bar =
    score >= 80 ? "#34d399" : score >= 60 ? "#e4e4e7" : score >= 40 ? "#fbbf24" : "#f87171";
  const text = size === "lg" ? "text-3xl" : size === "sm" ? "text-lg" : "text-2xl";
  return (
    <div className="inline-flex items-center gap-3">
      <span className={`font-semibold tracking-tight ${text} ${color}`}>{score}</span>
      <span className="text-[10px] uppercase tracking-[0.12em] text-muted">/100</span>
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/[0.08]">
        <div className="h-full rounded-full" style={{ width: `${score}%`, background: bar }} />
      </div>
    </div>
  );
}
