"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { getDemoAudit } from "@/lib/store";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Inspector, DetailRow } from "@/components/ui/Inspector";
import {
  AutoRenewChip,
  Kpi,
  KpiStrip,
  PageHeader,
  RiskChip,
  VendorCell,
} from "@/components/dashboard/shared";
import { money, formatDateShort, pct, daysUntil } from "@/lib/format";
import type { AlertSeverity, VendorProfile } from "@/lib/types";

const LEVELS: (AlertSeverity | "all")[] = ["all", "critical", "high", "medium", "low"];

export default function RisksPage() {
  const router = useRouter();
  const audit = getDemoAudit();
  const [level, setLevel] = useState<AlertSeverity | "all">("all");
  const [selected, setSelected] = useState<VendorProfile | null>(null);

  const risky = useMemo(() => {
    let list = audit.vendors.filter((v) => v.risk || v.healthScore < 70);
    if (level !== "all") list = list.filter((v) => v.risk?.level === level);
    return [...list].sort((a, b) => {
      const rank = (v: VendorProfile) =>
        v.risk ? { critical: 0, high: 1, medium: 2, low: 3 }[v.risk.level] : 4;
      return rank(a) - rank(b) || a.healthScore - b.healthScore;
    });
  }, [audit.vendors, level]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: risky.length, critical: 0, high: 0, medium: 0, low: 0 };
    for (const v of audit.vendors) {
      if (v.risk) c[v.risk.level] += 1;
    }
    return c;
  }, [audit.vendors, risky.length]);

  const exposure = risky.reduce((a, v) => a + (v.risk?.potentialRenewalCost ?? 0), 0);
  const missed = risky.filter((v) => v.risk && v.risk.daysToDeadline < 0).length;
  const criticalExposure = risky
    .filter((v) => v.risk?.level === "critical")
    .reduce((a, v) => a + (v.risk?.potentialRenewalCost ?? 0), 0);

  const columns: Column<VendorProfile>[] = useMemo(
    () => [
      {
        id: "vendor",
        label: "Vendor",
        width: 190,
        sortable: true,
        sortValue: (v) => v.name,
        filterValue: (v) => `${v.name} ${v.category}`,
        render: (v) => <VendorCell name={v.name} sub={v.category} href={`/dashboard/vendors/${v.id}`} />,
      },
      {
        id: "level",
        label: "Risk",
        width: 100,
        sortable: true,
        sortValue: (v) => v.risk?.level ?? "none",
        filterValue: (v) => v.risk?.level ?? "none",
        render: (v) => <RiskChip level={v.risk?.level} />,
      },
      {
        id: "health",
        label: "Health",
        width: 90,
        align: "right",
        sortable: true,
        sortValue: (v) => v.healthScore,
        render: (v) => (
          <span className={`text-[12.5px] font-semibold tabular-nums ${v.healthScore >= 70 ? "text-emerald-400" : v.healthScore >= 50 ? "text-amber-400" : "text-red-400"}`}>
            {v.healthScore}
          </span>
        ),
      },
      {
        id: "renewal",
        label: "Renews in",
        width: 100,
        align: "right",
        sortable: true,
        sortValue: (v) => v.risk?.daysToRenewal ?? 9999,
        render: (v) => {
          if (!v.risk) return <span className="text-[11.5px] text-muted/60">-</span>;
          return (
            <span className={`text-[12.5px] font-medium ${v.risk.daysToRenewal <= 30 ? "text-red-400" : "text-fg"}`}>
              {v.risk.daysToRenewal}d
            </span>
          );
        },
      },
      {
        id: "deadline",
        label: "Cancel by",
        width: 110,
        sortable: true,
        sortValue: (v) => v.cancellationDeadline ?? "9999",
        render: (v) => {
          if (!v.cancellationDeadline) return <span className="text-[11.5px] text-muted/60">-</span>;
          const d = daysUntil(v.cancellationDeadline);
          return (
            <span className={`text-[12px] font-medium ${d < 0 ? "text-red-400" : "text-fg/85"}`}>
              {formatDateShort(v.cancellationDeadline)}
            </span>
          );
        },
      },
      {
        id: "auto",
        label: "Auto-renew",
        width: 100,
        sortable: true,
        sortValue: (v) => Number(v.autoRenew),
        render: (v) => <AutoRenewChip on={v.autoRenew} />,
      },
      {
        id: "spend",
        label: "Annual spend",
        width: 110,
        align: "right",
        sortable: true,
        sortValue: (v) => v.annualSpend,
        render: (v) => <span className="text-[12.5px] font-medium tabular-nums text-fg">{money(v.annualSpend)}</span>,
      },
      {
        id: "exposure",
        label: "Exposure",
        width: 110,
        align: "right",
        sortable: true,
        sortValue: (v) => v.risk?.potentialRenewalCost ?? v.annualSpend,
        render: (v) => (
          <span className="text-[12.5px] font-semibold tabular-nums text-fg">
            {money(v.risk?.potentialRenewalCost ?? v.annualSpend)}
          </span>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Risks"
        sub="Renewal, escalation, and billing risk across your vendor portfolio"
        actions={
          <Link href="/dashboard/agent" className="toolbar-btn !h-8">
            <Sparkles size={14} /> Ask the agent
          </Link>
        }
      />

      <KpiStrip>
        <Kpi label="At risk" value={counts.all} sub="contracts with exposure" />
        <Kpi label="Critical" value={counts.critical} accent="text-red-400" sub="window closed or under 30 days" />
        <Kpi label="Missed deadlines" value={missed} accent="text-red-400" sub="auto-renews unless waived" />
        <Kpi label="Critical exposure" value={criticalExposure} format={money} accent="text-amber-400" sub="annualized if renewed" />
        <Kpi label="Total exposure" value={exposure} format={money} sub="across all risk levels" />
      </KpiStrip>

      <div className="flex items-center gap-1.5">
        {LEVELS.map((l) => (
          <button
            key={l}
            onClick={() => setLevel(l)}
            className={`toolbar-btn ${level === l ? "active" : ""}`}
          >
            {l === "all" ? "All" : l}
            <span className="text-[10.5px] text-muted/70">{counts[l]}</span>
          </button>
        ))}
        <span className="ml-auto text-[11.5px] text-muted">ranked by severity, then health</span>
      </div>

      <DataTable
        storageKey="risks"
        columns={columns}
        rows={risky}
        rowKey={(v) => v.id}
        onRowClick={setSelected}
        defaultSort={{ id: "level", dir: "asc" }}
        searchKeys={(v) => [v.name, v.category]}
        searchPlaceholder="Search risks…"
        rowActions={(v) => [
          { label: "Open vendor", onSelect: () => router.push(`/dashboard/vendors/${v.id}`) },
          { label: "Ask the agent", onSelect: () => router.push(`/dashboard/agent?vendor=${encodeURIComponent(v.name)}`) },
        ]}
      />

      <Inspector
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.name} · risk` : ""}
        sub={selected ? selected.category : ""}
        footer={
          selected && (
            <div className="flex gap-2">
              <Link href={`/dashboard/vendors/${selected.id}`} className="toolbar-btn primary flex-1 justify-center">
                Open vendor
              </Link>
              <Link
                href={`/dashboard/agent?vendor=${encodeURIComponent(selected.name)}`}
                className="toolbar-btn flex-1 justify-center"
              >
                <Sparkles size={13} /> Ask agent
              </Link>
            </div>
          )
        }
      >
        {selected && (
          <div className="py-1">
            <div className="px-4 py-3">
              <div className="flex items-center gap-2">
                <RiskChip level={selected.risk?.level} />
                <span className={`text-[12px] font-semibold ${selected.healthScore >= 70 ? "text-emerald-400" : selected.healthScore >= 50 ? "text-amber-400" : "text-red-400"}`}>
                  health {selected.healthScore}/100
                </span>
              </div>
            </div>

            {selected.risk ? (
              <>
                <p className="px-4 pb-1 pt-3 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-amber-400">
                  Renewal risk
                </p>
                <DetailRow label="Renews in">{selected.risk.daysToRenewal} days</DetailRow>
                <DetailRow label="Cancel by">{selected.cancellationDeadline ? formatDateShort(selected.cancellationDeadline) : "-"}</DetailRow>
                <DetailRow label="Deadline">{selected.risk.daysToDeadline < 0 ? "missed" : `${selected.risk.daysToDeadline} days left`}</DetailRow>
                <DetailRow label="Notice">{selected.risk.noticePeriodDays} days</DetailRow>
                <DetailRow label="Expected increase">{pct(selected.risk.expectedIncreasePct)}</DetailRow>
                <DetailRow label="Renewal cost">{money(selected.risk.potentialRenewalCost)}/yr</DetailRow>
              </>
            ) : (
              <p className="px-4 py-3 text-[12.5px] text-muted">
                No renewal risk flagged. This vendor is scored lower on health for other reasons.
              </p>
            )}

            {selected.billing.anomalies.length > 0 && (
              <>
                <p className="px-4 pb-1 pt-4 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-red-400">
                  Billing anomalies
                </p>
                {selected.billing.anomalies.map((a) => (
                  <div key={a.id} className="border-b border-line/60 px-4 py-2.5">
                    <p className="text-[12.5px] text-fg">{a.detail}</p>
                    <p className="mt-0.5 text-[11px] text-muted">
                      {pct(a.variancePct)} variance · {money(a.impact)}/yr
                    </p>
                  </div>
                ))}
              </>
            )}

            {selected.usage && selected.usage.utilizationPct < 60 && (
              <div className="px-4 py-3">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted">Utilization</p>
                <p className="mt-1 text-[13px] text-fg">
                  {selected.usage.activeUsers}/{selected.usage.seatsPurchased} seats active (
                  {selected.usage.utilizationPct.toFixed(0)}%)
                </p>
                {selected.usage.unusedSeatCost > 0 && (
                  <p className="mt-0.5 text-[11.5px] text-red-400/90">
                    {money(selected.usage.unusedSeatCost)}/yr in unused seats
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </Inspector>
    </div>
  );
}
