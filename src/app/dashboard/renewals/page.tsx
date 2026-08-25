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
import type { VendorProfile } from "@/lib/types";

type View =
  | "all"
  | "critical"
  | "high"
  | "medium"
  | "attention"
  | "high-value"
  | "missed"
  | "renewed";

const VIEWS: { id: View; label: string; match: (v: VendorProfile) => boolean }[] = [
  { id: "all", label: "All renewals", match: () => true },
  { id: "attention", label: "Requires attention", match: (v) => v.risk != null && (v.risk.daysToDeadline <= 14 || v.risk.daysToDeadline < 0) },
  { id: "critical", label: "Critical", match: (v) => v.risk?.level === "critical" },
  { id: "high", label: "High", match: (v) => v.risk?.level === "high" },
  { id: "medium", label: "Medium", match: (v) => v.risk?.level === "medium" },
  { id: "high-value", label: "High value", match: (v) => v.annualSpend >= 20000 },
  { id: "missed", label: "Missed deadline", match: (v) => v.risk != null && v.risk.daysToDeadline < 0 },
  { id: "renewed", label: "Manual renewal", match: (v) => v.renewalDate != null && !v.autoRenew },
];

export default function RenewalsPage() {
  const router = useRouter();
  const audit = getDemoAudit();
  const [view, setView] = useState<View>("all");
  const [selected, setSelected] = useState<VendorProfile | null>(null);

  const atRisk = useMemo(
    () => audit.vendors.filter((v) => v.risk != null || (v.renewalDate != null && !v.autoRenew)),
    [audit.vendors]
  );

  const rows = useMemo(() => {
    const active = VIEWS.find((v) => v.id === view)!;
    return [...atRisk]
      .filter(active.match)
      .sort((a, b) => (a.risk?.daysToRenewal ?? 999) - (b.risk?.daysToRenewal ?? 999));
  }, [atRisk, view]);

  const timeline = useMemo(
    () =>
      audit.vendors
        .filter((v) => v.renewalDate && daysUntil(v.renewalDate) >= 0)
        .sort((a, b) => daysUntil(a.renewalDate) - daysUntil(b.renewalDate))
        .slice(0, 8),
    [audit.vendors]
  );

  const missed = atRisk.filter((v) => v.risk && v.risk.daysToDeadline < 0).length;
  const windows = atRisk.filter((v) => v.risk && v.risk.daysToDeadline >= 0 && v.risk.daysToDeadline <= 30).length;
  const highValue = atRisk.filter((v) => v.annualSpend >= 20000).length;
  const exposure = atRisk.reduce((a, v) => a + (v.risk?.potentialRenewalCost ?? 0), 0);

  const columns: Column<VendorProfile>[] = useMemo(
    () => [
      {
        id: "vendor",
        label: "Vendor",
        width: 180,
        sortable: true,
        sortValue: (v) => v.name,
        filterValue: (v) => v.name,
        render: (v) => <VendorCell name={v.name} sub={v.category} href={`/dashboard/vendors/${v.id}`} />,
      },
      {
        id: "risk",
        label: "Risk",
        width: 100,
        sortable: true,
        sortValue: (v) => v.risk?.level ?? "zzz",
        render: (v) => <RiskChip level={v.risk?.level} />,
      },
      {
        id: "renewal",
        label: "Renewal date",
        width: 130,
        sortable: true,
        sortValue: (v) => v.renewalDate ?? "9999",
        render: (v) => {
          if (!v.renewalDate) return <span className="text-[11.5px] text-muted/60">Rolling</span>;
          const d = daysUntil(v.renewalDate);
          return (
            <div>
              <span className={`text-[12.5px] font-medium ${d <= 30 ? "text-red-400" : d <= 60 ? "text-amber-400" : "text-fg"}`}>
                {formatDateShort(v.renewalDate)}
              </span>
              <span className="ml-1.5 text-[10.5px] text-muted">{d >= 0 ? `in ${d}d` : `${Math.abs(d)}d past`}</span>
            </div>
          );
        },
      },
      {
        id: "cancel",
        label: "Cancel by",
        width: 120,
        sortable: true,
        sortValue: (v) => v.cancellationDeadline ?? "9999",
        render: (v) => {
          if (!v.cancellationDeadline) return <span className="text-[11.5px] text-muted/60">-</span>;
          const d = daysUntil(v.cancellationDeadline);
          return (
            <span className={`text-[12.5px] font-medium ${d < 0 ? "text-red-400" : d <= 14 ? "text-amber-400" : "text-fg/85"}`}>
              {formatDateShort(v.cancellationDeadline)}
              <span className="ml-1.5 text-[10.5px] text-muted">
                {d < 0 ? "missed" : `${d}d`}
              </span>
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
        id: "increase",
        label: "Expected increase",
        width: 120,
        align: "right",
        sortable: true,
        sortValue: (v) => v.risk?.expectedIncreasePct ?? 0,
        render: (v) =>
          v.risk && v.risk.expectedIncreasePct > 0 ? (
            <span className="text-[12.5px] font-medium text-orange-400">{pct(v.risk.expectedIncreasePct)}</span>
          ) : (
            <span className="text-[11.5px] text-muted/60">-</span>
          ),
      },
      {
        id: "cost",
        label: "Renewal cost",
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
        title="Renewals"
        sub="Contracts that will cost you more if you do nothing"
        actions={
          <Link href="/dashboard/agent" className="toolbar-btn !h-8">
            <Sparkles size={14} /> Draft a renewal notice
          </Link>
        }
      />

      <KpiStrip>
        <Kpi label="Renewal risk" value={atRisk.length} sub="contracts with terms" />
        <Kpi label="Requires attention" value={atRisk.filter((v) => v.risk && (v.risk.daysToDeadline <= 14 || v.risk.daysToDeadline < 0)).length} accent="text-red-400" sub="window closing or closed" />
        <Kpi label="Window open" value={windows} accent="text-amber-400" sub="cancel by date within 30 days" />
        <Kpi label="Missed deadlines" value={missed} accent="text-red-400" sub="auto-renews unless waived" />
        <Kpi label="High value" value={highValue} sub="$20k+ annual" />
        <Kpi label="Exposure at renewal" value={exposure} format={money} accent="text-fg" sub="annualized if all renew" />
      </KpiStrip>

      {/* timeline strip */}
      <div className="panel-surface overflow-hidden">
        <div className="panel-header">
          <span className="panel-title">Next renewals</span>
          <span className="panel-sub">next 8 by date</span>
        </div>
        <div className="flex divide-x divide-line overflow-x-auto">
          {timeline.map((v) => {
            const d = daysUntil(v.renewalDate);
            return (
              <Link
                key={v.id}
                href={`/dashboard/vendors/${v.id}`}
                className="group min-w-[130px] flex-1 px-3 py-3 transition-colors hover:bg-white/[0.03]"
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className={`status-dot ${d <= 30 ? "bg-red-400" : d <= 60 ? "bg-amber-400" : "bg-emerald-400"}`}
                  />
                  <span className="truncate text-[12px] font-medium text-fg group-hover:text-emerald-300">
                    {v.name}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-muted">{formatDateShort(v.renewalDate)}</p>
                <p className={`text-[10.5px] ${d <= 30 ? "text-red-400" : "text-muted"}`}>
                  {d >= 0 ? `${d} days` : `${Math.abs(d)}d past`}
                </p>
                <p className="mt-0.5 text-[10.5px] text-muted/70">{money(v.annualSpend)}/yr</p>
              </Link>
            );
          })}
        </div>
      </div>

      {/* view tabs */}
      <div className="tabs">
        {VIEWS.map((v) => {
          const count = atRisk.filter(v.match).length;
          return (
            <button key={v.id} className={`tab ${view === v.id ? "active" : ""}`} onClick={() => setView(v.id)}>
              {v.label}
              <span className="text-[10.5px] text-muted/60">{count}</span>
            </button>
          );
        })}
      </div>

      <DataTable
        storageKey="renewals"
        columns={columns}
        rows={rows}
        rowKey={(v) => v.id}
        onRowClick={setSelected}
        defaultSort={{ id: "renewal", dir: "asc" }}
        searchKeys={(v) => [v.name, v.category]}
        searchPlaceholder="Search renewals…"
        rowActions={(v) => [
          { label: "Open vendor", onSelect: () => router.push(`/dashboard/vendors/${v.id}`) },
          { label: "Draft renewal reply", onSelect: () => router.push(`/dashboard/agent?vendor=${encodeURIComponent(v.name)}`) },
        ]}
        rowClassName={(v) =>
          v.risk && v.risk.daysToDeadline < 0 ? "opacity-70" : ""
        }
      />

      <Inspector
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.name} · renewal` : ""}
        sub={selected ? `renews ${selected.renewalDate ? formatDateShort(selected.renewalDate) : "-"}` : ""}
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
                <Sparkles size={13} /> Draft reply
              </Link>
            </div>
          )
        }
      >
        {selected && selected.risk && (
          <div className="py-1">
            <div className="px-4 py-3">
              <RiskChip level={selected.risk.level} />
            </div>
            <DetailRow label="Renews in">{selected.risk.daysToRenewal} days</DetailRow>
            <DetailRow label="Renewal date">{selected.renewalDate ? formatDateShort(selected.renewalDate) : "-"}</DetailRow>
            <DetailRow label="Cancellation deadline">
              {selected.cancellationDeadline ? formatDateShort(selected.cancellationDeadline) : "-"}
            </DetailRow>
            <DetailRow label="Window status">
              {selected.risk.daysToDeadline < 0 ? (
                <span className="text-red-400">closed {Math.abs(selected.risk.daysToDeadline)}d ago</span>
              ) : (
                <span className={selected.risk.daysToDeadline <= 14 ? "text-amber-400" : "text-emerald-400"}>
                  {selected.risk.daysToDeadline} days left
                </span>
              )}
            </DetailRow>
            <DetailRow label="Notice period">{selected.risk.noticePeriodDays} days</DetailRow>
            <DetailRow label="Auto-renew"><AutoRenewChip on={selected.autoRenew} /></DetailRow>
            <DetailRow label="Expected increase">
              {selected.risk.expectedIncreasePct > 0 ? pct(selected.risk.expectedIncreasePct) : "None"}
            </DetailRow>
            <DetailRow label="Renewal cost">{money(selected.risk.potentialRenewalCost)}/yr</DetailRow>
            <DetailRow label="Current spend">{money(selected.annualSpend)}/yr</DetailRow>

            <div className="border-t border-line px-4 py-3.5">
              <p className="text-[12px] leading-relaxed text-muted">
                {selected.risk.daysToDeadline < 0
                  ? "The cancellation window has closed. The contract renews automatically unless the vendor grants an exception - contact them directly."
                  : `You must act by ${selected.cancellationDeadline ? formatDateShort(selected.cancellationDeadline) : "-"} to avoid automatic renewal. A competitive quote before then is your strongest lever.`}
              </p>
            </div>
          </div>
        )}
      </Inspector>
    </div>
  );
}
