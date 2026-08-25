"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { getDemoAudit } from "@/lib/store";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Inspector, DetailRow } from "@/components/ui/Inspector";
import {
  AmountCell,
  AutoRenewChip,
  PageHeader,
  RiskChip,
  StatusChip,
  VendorCell,
} from "@/components/dashboard/shared";
import { money, formatDateShort, pct, daysUntil } from "@/lib/format";
import type { VendorProfile } from "@/lib/types";

export default function VendorsPage() {
  const router = useRouter();
  const audit = getDemoAudit();
  const [selected, setSelected] = useState<VendorProfile | null>(null);

  const columns: Column<VendorProfile>[] = useMemo(
    () => [
      {
        id: "vendor",
        label: "Vendor",
        width: 190,
        sortable: true,
        sortValue: (v) => v.name,
        filterValue: (v) => `${v.name} ${v.category} ${v.owner} ${v.description}`,
        render: (v) => <VendorCell name={v.name} sub={v.description} href={`/dashboard/vendors/${v.id}`} />,
      },
      {
        id: "category",
        label: "Category",
        width: 120,
        sortable: true,
        sortValue: (v) => v.category,
        render: (v) => <span className="chip chip-neutral">{v.category}</span>,
      },
      {
        id: "status",
        label: "Status",
        width: 110,
        sortable: true,
        sortValue: (v) => v.contractStatus,
        filterValue: (v) => v.contractStatus,
        render: (v) => <StatusChip status={v.contractStatus} />,
      },
      {
        id: "value",
        label: "Annual spend",
        width: 120,
        align: "right",
        sortable: true,
        sortValue: (v) => v.annualSpend,
        render: (v) => (
          <div className="text-right">
            <AmountCell value={v.annualSpend} />
            <span className="ml-1.5 text-[10.5px] text-muted">{pct(v.spendTrendPct)}</span>
          </div>
        ),
      },
      {
        id: "renewal",
        label: "Renewal",
        width: 110,
        sortable: true,
        sortValue: (v) => v.renewalDate ?? "9999",
        render: (v) => {
          if (!v.renewalDate) return <span className="text-[11.5px] text-muted/60">Rolling</span>;
          const d = daysUntil(v.renewalDate);
          return (
            <span className={`text-[12.5px] font-medium ${d <= 30 ? "text-red-400" : "text-fg"}`}>
              {formatDateShort(v.renewalDate)} <span className="text-[10px] text-muted">{d}d</span>
            </span>
          );
        },
      },
      {
        id: "util",
        label: "Utilization",
        width: 100,
        align: "right",
        sortable: true,
        sortValue: (v) => v.utilizationPct,
        render: (v) =>
          v.usage ? (
            <span className={`text-[12.5px] font-medium tabular-nums ${v.utilizationPct < 40 ? "text-red-400" : "text-fg"}`}>
              {v.utilizationPct.toFixed(0)}%
            </span>
          ) : (
            <span className="text-[11px] text-muted/50">usage-based</span>
          ),
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
        id: "savings",
        label: "Savings",
        width: 110,
        align: "right",
        sortable: true,
        sortValue: (v) => v.potentialSavings,
        render: (v) =>
          v.potentialSavings > 0 ? (
            <AmountCell value={v.potentialSavings} />
          ) : (
            <span className="text-[11.5px] text-muted/60">-</span>
          ),
      },
      {
        id: "owner",
        label: "Owner",
        width: 130,
        sortable: true,
        sortValue: (v) => v.owner,
        render: (v) => (
          <span className="flex items-center gap-2">
            <span className="flex size-5 items-center justify-center rounded-full bg-white/[0.07] text-[9px] font-semibold text-fg/80">
              {v.owner.split(" ").map((p) => p[0]).slice(0, 2).join("")}
            </span>
            <span className="text-[12px] text-fg/85">{v.owner}</span>
          </span>
        ),
      },
      {
        id: "reviewed",
        label: "Reviewed",
        width: 100,
        sortable: true,
        sortValue: (v) => v.lastReviewed,
        render: (v) => <span className="text-[12px] text-muted">{formatDateShort(v.lastReviewed)}</span>,
      },
    ],
    []
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Vendors"
        sub={`${audit.vendorCount} vendors · ${money(audit.totalAnnualSpend)}/yr · ${money(audit.potentialSavings)}/yr identified savings`}
        actions={
          <Link href="/dashboard/agent" className="toolbar-btn !h-8">
            <Sparkles size={14} /> Ask the agent
          </Link>
        }
      />

      <DataTable
        storageKey="vendors"
        columns={columns}
        rows={audit.vendors}
        rowKey={(v) => v.id}
        selectable
        onRowClick={setSelected}
        defaultSort={{ id: "value", dir: "desc" }}
        searchKeys={(v) => [v.name, v.category, v.description, v.owner]}
        searchPlaceholder="Search vendors…"
        rowActions={(v) => [
          { label: "Open vendor profile", onSelect: () => router.push(`/dashboard/vendors/${v.id}`) },
          { label: "Ask the agent", onSelect: () => router.push(`/dashboard/agent?vendor=${encodeURIComponent(v.name)}`) },
        ]}
        bulkActions={[
          {
            label: "Ask agent about selected",
            onSelect: (keys) => {
              const names = audit.vendors.filter((v) => keys.has(v.id)).map((v) => v.name).slice(0, 5);
              router.push(`/dashboard/agent?vendor=${encodeURIComponent(names.join(", "))}`);
            },
          },
        ]}
      />

      <Inspector
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected?.name ?? ""}
        sub={selected?.category ?? ""}
        footer={
          selected && (
            <div className="flex gap-2">
              <Link
                href={`/dashboard/vendors/${selected.id}`}
                className="toolbar-btn primary flex-1 justify-center"
              >
                Full vendor profile
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
                <StatusChip status={selected.contractStatus} />
                <RiskChip level={selected.risk?.level} />
              </div>
              <p className="mt-2 text-[12.5px] leading-relaxed text-muted">{selected.description}</p>
            </div>
            <DetailRow label="Annual spend">
              <span className="font-semibold">{money(selected.annualSpend)}</span>
              <span className="ml-1.5 text-[11px] text-muted">{pct(selected.spendTrendPct)} YoY</span>
            </DetailRow>
            <DetailRow label="Renewal">{selected.renewalDate ? formatDateShort(selected.renewalDate) : "Rolling"}</DetailRow>
            <DetailRow label="Cancel by">{selected.cancellationDeadline ? formatDateShort(selected.cancellationDeadline) : "-"}</DetailRow>
            <DetailRow label="Auto-renew"><AutoRenewChip on={selected.autoRenew} /></DetailRow>
            <DetailRow label="Escalation">{selected.priceEscalationRate ? pct(selected.priceEscalationRate) : "None"}</DetailRow>
            <DetailRow label="Owner">{selected.owner}</DetailRow>
            <DetailRow label="Last reviewed">{formatDateShort(selected.lastReviewed)}</DetailRow>

            {selected.usage && (
              <>
                <p className="px-4 pb-1 pt-4 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted">
                  Usage
                </p>
                <DetailRow label="Seats">
                  {selected.usage.activeUsers}/{selected.usage.seatsPurchased} active
                </DetailRow>
                <DetailRow label="Utilization">
                  <span className={selected.utilizationPct < 40 ? "text-red-400" : "text-fg"}>
                    {selected.utilizationPct.toFixed(0)}%
                  </span>
                </DetailRow>
                <DetailRow label="Unused seat cost">
                  <span className="text-red-400/90">{money(selected.usage.unusedSeatCost)}/yr</span>
                </DetailRow>
              </>
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
                      {pct(a.variancePct)} variance · {money(a.impact)}/yr impact
                    </p>
                  </div>
                ))}
              </>
            )}

            {selected.potentialSavings > 0 && (
              <>
                <p className="px-4 pb-1 pt-4 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-fg">
                  Potential savings
                </p>
                <p className="px-4 py-2 text-[20px] font-semibold tracking-tight text-fg">
                  {money(selected.potentialSavings)}
                  <span className="ml-1 text-[11px] font-normal text-muted">/yr</span>
                </p>
              </>
            )}
          </div>
        )}
      </Inspector>
    </div>
  );
}
