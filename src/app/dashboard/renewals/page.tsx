"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { getDemoAudit } from "@/lib/store";
import { Panel, SectionHeader, SeverityBadge, StatCard } from "@/components/ui/primitives";
import { money, formatDate, pct } from "@/lib/format";
import type { AlertSeverity, VendorProfile } from "@/lib/types";

export default function RenewalsPage() {
  const audit = getDemoAudit();
  const [filter, setFilter] = useState<AlertSeverity | "all">("all");

  const atRisk = useMemo(() => {
    let list = audit.vendors.filter((v) => v.risk);
    if (filter !== "all") list = list.filter((v) => v.risk?.level === filter);
    return [...list].sort((a, b) => (a.risk?.daysToRenewal ?? 999) - (b.risk?.daysToRenewal ?? 999));
  }, [audit.vendors, filter]);

  const counts = {
    all: audit.vendors.filter((v) => v.risk).length,
    critical: audit.vendors.filter((v) => v.risk?.level === "critical").length,
    high: audit.vendors.filter((v) => v.risk?.level === "high").length,
    medium: audit.vendors.filter((v) => v.risk?.level === "medium").length,
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Renewals"
        subtitle="Contracts that will cost you more if you do nothing"
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Renewal risks" value={counts.all} accent="text-amber-400" sub="within 90 days or window closed" />
        <StatCard label="Critical" value={counts.critical} accent="text-red-400" sub="deadline missed or < 30 days" delay={0.05} />
        <StatCard label="High exposure" value={audit.vendors.filter((v) => v.risk).reduce((a, v) => a + (v.risk?.potentialRenewalCost ?? 0), 0)} valueFormat={money} accent="text-fg" sub="annualized renewal cost" delay={0.1} />
      </div>

      {/* filter */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => setFilter("all")}
          className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
            filter === "all" ? "bg-white text-black" : "border border-line bg-surface text-muted hover:border-white/25 hover:text-fg"
          }`}
        >
          All <span className="ml-1 text-[11px] opacity-60">{counts.all}</span>
        </button>
        {(["critical", "high", "medium"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
              filter === s ? "bg-white text-black" : "border border-line bg-surface text-muted hover:border-white/25 hover:text-fg"
            }`}
          >
            {s} <span className="ml-1 text-[11px] opacity-60">{counts[s]}</span>
          </button>
        ))}
      </div>

      {/* table */}
      <Panel delay={0.1} className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left">
            <thead>
              <tr className="border-b border-line">
                <th className="px-5 py-3.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted">Vendor</th>
                <th className="px-5 py-3.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted">Risk</th>
                <th className="px-5 py-3.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted">Renewal</th>
                <th className="px-5 py-3.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted">Cancel by</th>
                <th className="px-5 py-3.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted">Annual spend</th>
                <th className="px-5 py-3.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted">Expected increase</th>
                <th className="px-5 py-3.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted">Renewal cost</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {atRisk.map((v) => (
                <RenewalRow key={v.id} v={v} />
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function RenewalRow({ v }: { v: VendorProfile }) {
  return (
    <tr className="group transition-colors hover:bg-white/[0.03]">
      <td className="px-5 py-3.5">
        <Link href={`/dashboard/vendors/${v.id}`} className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-white/[0.06] text-[10.5px] font-semibold text-fg">
            {v.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="text-[13.5px] font-medium text-fg group-hover:text-emerald-300">{v.name}</p>
            <p className="text-[10.5px] tracking-tight text-muted">{v.category}</p>
          </div>
        </Link>
      </td>
      <td className="px-5 py-3.5">
        <SeverityBadge severity={v.risk?.level ?? "low"} />
      </td>
      <td className="px-5 py-3.5">
        <p className="text-[13px] font-medium text-fg">{formatDate(v.renewalDate)}</p>
        <p className={`text-[11px] tracking-tight ${(v.risk?.daysToRenewal ?? 999) < 30 ? "text-red-400" : "text-amber-400"}`}>
          in {v.risk?.daysToRenewal} days{v.autoRenew ? " · auto-renews" : ""}
        </p>
      </td>
      <td className="px-5 py-3.5">
        {v.cancellationDeadline ? (
          <>
            <p className="text-[13px] text-fg">{formatDate(v.cancellationDeadline)}</p>
            <p className={`text-[11px] tracking-tight ${(v.risk?.daysToDeadline ?? 0) < 0 ? "text-red-400" : "text-muted"}`}>
              {(v.risk?.daysToDeadline ?? 0) < 0 ? "window closed" : `${v.risk?.daysToDeadline} days`}
            </p>
          </>
        ) : (
          <span className="text-[12px] text-muted">—</span>
        )}
      </td>
      <td className="px-5 py-3.5 text-[13px] font-medium text-fg">{money(v.annualSpend)}</td>
      <td className="px-5 py-3.5">
        {v.risk && v.risk.expectedIncreasePct > 0 ? (
          <span className="text-[13px] font-medium text-orange-400">
            {pct(v.risk.expectedIncreasePct)}
          </span>
        ) : (
          <span className="text-[12px] text-muted/60">—</span>
        )}
      </td>
      <td className="px-5 py-3.5">
        <p className="text-[13px] font-semibold text-fg">{money(v.risk?.potentialRenewalCost ?? v.annualSpend)}</p>
        <p className="text-[10.5px] tracking-tight text-muted">annualized</p>
      </td>
      <td className="px-5 py-3.5 text-right">
        <Link
          href={`/dashboard/vendors/${v.id}`}
          className="text-[12px] tracking-tight text-emerald-400 hover:text-emerald-300"
        >
          Review →
        </Link>
      </td>
    </tr>
  );
}
