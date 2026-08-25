"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { getDemoAudit } from "@/lib/store";
import { Panel, SectionHeader, SeverityBadge, StatCard } from "@/components/ui/primitives";
import { money, timeAgo } from "@/lib/format";
import type { AlertRecord, AlertSeverity } from "@/lib/types";

export default function AlertsPage() {
  const audit = getDemoAudit();
  const [filter, setFilter] = useState<AlertSeverity | "all">("all");
  const [readFilter, setReadFilter] = useState<"all" | "unread">("all");

  const alerts = useMemo(() => {
    let list = audit.alerts;
    if (filter !== "all") list = list.filter((a) => a.severity === filter);
    if (readFilter === "unread") list = list.filter((a) => !a.read);
    return list;
  }, [audit.alerts, filter, readFilter]);

  const counts: Record<string, number> = {
    all: audit.alerts.length,
    critical: audit.alerts.filter((a) => a.severity === "critical").length,
    high: audit.alerts.filter((a) => a.severity === "high").length,
    medium: audit.alerts.filter((a) => a.severity === "medium").length,
    low: audit.alerts.filter((a) => a.severity === "low").length,
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Alerts"
        subtitle="What's about to cost you more - and what already did"
      />

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Total alerts" value={counts.all} sub="last 30 days" />
        <StatCard label="Critical" value={counts.critical} accent="text-red-400" sub="act now" delay={0.05} />
        <StatCard label="High" value={counts.high} accent="text-orange-400" sub="needs attention" delay={0.1} />
        <StatCard label="Unread" value={audit.alerts.filter((a) => !a.read).length} accent="text-amber-400" sub="since last visit" delay={0.15} />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {(["all", "critical", "high", "medium", "low"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
              filter === s ? "bg-white text-black" : "border border-line bg-surface text-muted hover:border-white/25 hover:text-fg"
            }`}
          >
            {s === "all" ? "All" : s}
            <span className="ml-1.5 text-[11px] opacity-60">{counts[s]}</span>
          </button>
        ))}
        <span className="mx-2 h-5 w-px bg-line" />
        <button
          onClick={() => setReadFilter(readFilter === "unread" ? "all" : "unread")}
          className={`rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors ${
            readFilter === "unread" ? "bg-white/[0.12] text-fg" : "text-muted hover:text-fg"
          }`}
        >
          {readFilter === "unread" ? "Unread only" : "Show unread"}
        </button>
      </div>

      <div className="space-y-2.5">
        {alerts.map((a, i) => (
          <AlertRow key={a.id} a={a} index={i} />
        ))}
        {alerts.length === 0 && (
          <Panel className="p-10 text-center">
            <p className="text-[13px] tracking-tight text-muted">No alerts match this filter.</p>
          </Panel>
        )}
      </div>
    </div>
  );
}

function AlertRow({ a, index }: { a: AlertRecord; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: Math.min(0.12, index * 0.025), ease: [0.22, 1, 0.36, 1] }}
    >
      <Panel className={`flex items-start gap-3.5 p-4 ${a.read ? "opacity-70" : ""}`}>
        <SeverityBadge severity={a.severity} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[14px] font-semibold tracking-[-0.01em] text-fg">{a.title}</p>
            {!a.read && <span className="size-1.5 rounded-full bg-emerald-400" />}
          </div>
          <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{a.detail}</p>
          {a.vendorId && (
            <Link
              href={`/dashboard/vendors/${a.vendorId}`}
              className="mt-1.5 inline-block text-[11.5px] tracking-tight text-emerald-400 hover:text-emerald-300"
            >
              View {a.vendorName} →
            </Link>
          )}
        </div>
        <div className="shrink-0 text-right">
          {a.amount !== undefined && a.amount !== 0 && (
            <p className="text-[13px] font-semibold text-amber-400">{money(a.amount)}</p>
          )}
          <p className="mt-0.5 text-[10.5px] tracking-tight text-muted">{timeAgo(a.createdAt)}</p>
          <p className="text-[10px] uppercase tracking-wide text-muted/60">{a.type.replace(/_/g, " ")}</p>
        </div>
      </Panel>
    </motion.div>
  );
}
