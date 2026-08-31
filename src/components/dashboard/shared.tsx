"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { AlertSeverity, ContractStatus } from "@/lib/types";
import { money } from "@/lib/format";

/* ------------------------------------------------------------------ */
/*  Shared professional dashboard building blocks.                    */
/* ------------------------------------------------------------------ */

export function PageHeader({
  title,
  sub,
  actions,
}: {
  title: string;
  sub?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="page-header">
      <div className="min-w-0">
        <h1 className="page-title">{title}</h1>
        {sub && <p className="page-sub">{sub}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Kpi({
  label,
  value,
  format,
  accent = "text-fg",
  sub,
}: {
  label: string;
  value: number;
  format?: (n: number) => string;
  accent?: string;
  sub?: string;
}) {
  return (
    <div className="px-4 py-3">
      <p className="text-[10px] font-semibold tracking-[-0.01em] text-muted">{label}</p>
      <p className={`mt-1 text-[20px] font-semibold leading-none tracking-tight ${accent}`}>
        {format ? format(value) : Math.round(value).toLocaleString("en-US")}
      </p>
      {sub && <p className="mt-1 text-[10.5px] tracking-tight text-muted/70">{sub}</p>}
    </div>
  );
}

export function KpiStrip({ children }: { children: React.ReactNode }) {
  return (
    <div className="panel-surface border-sheen flex divide-x divide-line overflow-x-auto">
      {children}
    </div>
  );
}

/* ------------------------------ chips ------------------------------ */

/* Monochrome status language: only destructive states carry red. */
export const STATUS_META: Record<ContractStatus, { label: string; cls: string }> = {
  active: { label: "Active", cls: "chip-neutral" },
  expiring_soon: { label: "Expiring soon", cls: "chip-neutral" },
  at_risk: { label: "At risk", cls: "chip-red" },
};

export const RISK_META: Record<AlertSeverity, { label: string; cls: string }> = {
  low: { label: "Low", cls: "chip-neutral" },
  medium: { label: "Medium", cls: "chip-neutral" },
  high: { label: "High", cls: "chip-neutral" },
  critical: { label: "Critical", cls: "chip-red" },
};

/** Map a numeric risk score (0-100) to a severity for chips. */
export function riskLevel(score: number): AlertSeverity {
  return score >= 80 ? "critical" : score >= 60 ? "high" : score >= 40 ? "medium" : "low";
}

export function StatusChip({ status }: { status: ContractStatus }) {
  const m = STATUS_META[status];
  return <span className={`chip ${m.cls}`}>{m.label}</span>;
}

export function RiskChip({ level }: { level: AlertSeverity | null | undefined }) {
  if (!level) return <span className="text-[11.5px] text-muted/60">None</span>;
  const m = RISK_META[level];
  return <span className={`chip ${m.cls}`}>{m.label}</span>;
}

export function AutoRenewChip({ on }: { on: boolean }) {
  return on ? <span className="chip chip-neutral">Auto-renew</span> : <span className="text-[11.5px] text-muted/60">Manual</span>;
}

export function VendorCell({
  name,
  sub,
  href,
  avatarClass,
}: {
  name: string;
  sub?: string;
  href?: string;
  avatarClass?: string;
}) {
  const inner = (
    <span className="flex items-center gap-2.5">
      <span
        className={`flex size-7 shrink-0 items-center justify-center rounded-md bg-white/[0.06] text-[10px] font-semibold tracking-tight text-fg ${avatarClass ?? ""}`}
      >
        {name.slice(0, 2).toUpperCase()}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[12.5px] font-medium text-fg">{name}</span>
        {sub && <span className="block truncate text-[10.5px] tracking-tight text-muted">{sub}</span>}
      </span>
    </span>
  );
  if (href) {
    return (
      <Link href={href} className="group block hover:text-fg">
        {inner}
      </Link>
    );
  }
  return inner;
}

export function AmountCell({ value, accent = "text-fg", suffix }: { value: number; accent?: string; suffix?: string }) {
  return (
    <span className={`text-[12.5px] font-medium tabular-nums ${accent}`}>
      {money(value)}
      {suffix && <span className="ml-0.5 text-[10px] font-normal text-muted">{suffix}</span>}
    </span>
  );
}

export function ArrowLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-[11.5px] font-medium text-muted hover:text-fg"
    >
      {label}
      <ArrowRight size={11} />
    </Link>
  );
}

export function EmptyState({
  title = "Nothing here yet",
  body,
  action,
}: {
  title?: string;
  body?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="px-6 py-14 text-center">
      <p className="text-[13.5px] font-medium text-fg">{title}</p>
      {body && <p className="mx-auto mt-1 max-w-sm text-[12px] leading-relaxed text-muted">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ---------------------- generic detail rows ---------------------- */

export function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line/60 px-4 py-2.5">
      <span className="shrink-0 text-[10.5px] font-semibold tracking-[-0.01em] text-muted/70">
        {label}
      </span>
      <span className="min-w-0 text-right text-[12.5px] font-medium text-fg">{children}</span>
    </div>
  );
}
