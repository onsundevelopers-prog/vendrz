"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, ScanSearch, Sparkles } from "lucide-react";
import { getContracts, getDemoAudit } from "@/lib/store";
import { useAuthUser } from "@/lib/auth";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Inspector, DetailRow } from "@/components/ui/Inspector";
import {
  AmountCell,
  ArrowLink,
  AutoRenewChip,
  Kpi,
  KpiStrip,
  PageHeader,
  RiskChip,
  StatusChip,
  VendorCell,
} from "@/components/dashboard/shared";
import { money, formatDate, formatDateShort, pct, daysUntil } from "@/lib/format";
import type { ContractRecord, VendorProfile } from "@/lib/types";

export default function ContractsPage() {
  const router = useRouter();
  const audit = getDemoAudit();
  const auth = useAuthUser();
  const uploaded = getContracts(auth.id ?? "").filter((c) => !c.isSample);
  const [selected, setSelected] = useState<VendorProfile | null>(null);

  const withTerms = useMemo(
    () =>
      audit.vendors.filter(
        (v) => v.renewalDate || v.contractStatus !== "active" || v.priceEscalationRate
      ),
    [audit.vendors]
  );

  const columns: Column<VendorProfile>[] = useMemo(
    () => [
      {
        id: "vendor",
        label: "Vendor",
        width: 190,
        sortable: true,
        sortValue: (v) => v.name,
        filterValue: (v) => `${v.name} ${v.category}`,
        render: (v) => <VendorCell name={v.name} sub={v.description} href={`/dashboard/vendors/${v.id}`} />,
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
        label: "Annual value",
        width: 110,
        align: "right",
        sortable: true,
        sortValue: (v) => v.contractValue,
        render: (v) => <AmountCell value={v.contractValue} suffix="/yr" />,
      },
      {
        id: "start",
        label: "Start",
        width: 100,
        sortable: true,
        sortValue: (v) => v.startDate,
        render: (v) => <span className="text-[12px] text-muted">{formatDateShort(v.startDate)}</span>,
      },
      {
        id: "renewal",
        label: "Renewal",
        width: 120,
        sortable: true,
        sortValue: (v) => v.renewalDate ?? "9999",
        filterValue: (v) => v.renewalDate ?? "",
        render: (v) => {
          if (!v.renewalDate) return <span className="text-[11.5px] text-muted/60">Rolling</span>;
          const d = daysUntil(v.renewalDate);
          return (
            <div>
              <span className={`text-[12.5px] font-medium ${d <= 30 ? "text-red-400" : d <= 60 ? "text-amber-400" : "text-fg"}`}>
                {formatDateShort(v.renewalDate)}
              </span>
              <span className="ml-1.5 text-[10px] text-muted">{d}d</span>
            </div>
          );
        },
      },
      {
        id: "cancel",
        label: "Cancel by",
        width: 110,
        sortable: true,
        sortValue: (v) => v.cancellationDeadline ?? "9999",
        render: (v) => {
          if (!v.cancellationDeadline) return <span className="text-[11.5px] text-muted/60">-</span>;
          const d = daysUntil(v.cancellationDeadline);
          return (
            <span className={`text-[12px] font-medium ${d < 0 ? "text-red-400" : d <= 14 ? "text-amber-400" : "text-fg/85"}`}>
              {formatDateShort(v.cancellationDeadline)}
            </span>
          );
        },
      },
      {
        id: "auto",
        label: "Auto-renew",
        width: 110,
        sortable: true,
        sortValue: (v) => Number(v.autoRenew),
        render: (v) => <AutoRenewChip on={v.autoRenew} />,
      },
      {
        id: "escalation",
        label: "Escalation",
        width: 90,
        align: "right",
        sortable: true,
        sortValue: (v) => v.priceEscalationRate ?? 0,
        render: (v) =>
          v.priceEscalationRate ? (
            <span className="text-[12.5px] font-medium text-orange-400">{pct(v.priceEscalationRate)}</span>
          ) : (
            <span className="text-[11.5px] text-muted/60">-</span>
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
        label: "Potential savings",
        width: 130,
        align: "right",
        sortable: true,
        sortValue: (v) => v.potentialSavings,
        render: (v) =>
          v.potentialSavings > 0 ? (
            <AmountCell value={v.potentialSavings} accent="text-emerald-400" />
          ) : (
            <span className="text-[11.5px] text-muted/60">-</span>
          ),
      },
      {
        id: "reviewed",
        label: "Last reviewed",
        width: 110,
        sortable: true,
        sortValue: (v) => v.lastReviewed,
        render: (v) => <span className="text-[12px] text-muted">{formatDateShort(v.lastReviewed)}</span>,
      },
    ],
    []
  );

  const riskCount = withTerms.filter((v) => v.risk).length;
  const urgentCount = withTerms.filter((v) => v.risk && v.risk.daysToRenewal <= 60).length;
  const escCount = withTerms.filter((v) => (v.priceEscalationRate ?? 0) >= 5).length;
  const savings = withTerms.reduce((a, v) => a + v.potentialSavings, 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Contracts"
        sub={`${withTerms.length} contracts with terms · ${money(audit.totalAnnualSpend)}/yr committed`}
        actions={
          <Link
            href="/audit"
            className="toolbar-btn primary !h-8"
          >
            <Plus size={14} /> Scan a contract
          </Link>
        }
      />

      <KpiStrip>
        <Kpi label="Contracts" value={withTerms.length} sub="with renewal terms" />
        <Kpi label="Renewal risk" value={riskCount} accent="text-amber-400" sub="within 90 days or window closed" />
        <Kpi label="Urgent" value={urgentCount} accent="text-red-400" sub="renewal within 60 days" />
        <Kpi label="Escalating 5%+" value={escCount} accent="text-orange-400" sub="annual price increases" />
        <Kpi label="Potential savings" value={savings} format={money} accent="text-emerald-400" sub="estimates, not guaranteed" />
      </KpiStrip>

      <DataTable
        storageKey="contracts"
        columns={columns}
        rows={withTerms}
        rowKey={(v) => v.id}
        selectable
        onRowClick={setSelected}
        defaultSort={{ id: "renewal", dir: "asc" }}
        searchKeys={(v) => [v.name, v.category, v.description, v.owner]}
        searchPlaceholder="Search contracts…"
        toolbar={
          <>
            <span className="px-1 text-[12px] font-medium text-muted">All contracts</span>
            <Link href="/dashboard/agent" className="toolbar-btn">
              <Sparkles size={13} /> Ask the agent
            </Link>
          </>
        }
        rowActions={(v) => [
          { label: "Open vendor", onSelect: () => router.push(`/dashboard/vendors/${v.id}`) },
          { label: "Ask the agent", onSelect: () => router.push(`/dashboard/agent?vendor=${encodeURIComponent(v.name)}`) },
        ]}
        bulkActions={[
          {
            label: "Ask agent about selected",
            onSelect: (keys) => {
              const names = withTerms.filter((v) => keys.has(v.id)).map((v) => v.name).slice(0, 5);
              router.push(`/dashboard/agent?vendor=${encodeURIComponent(names.join(", "))}`);
            },
          },
        ]}
      />

      {/* uploaded contract scans - preserved legacy flow */}
      {uploaded.length > 0 && (
        <div className="panel-surface overflow-hidden">
          <div className="panel-header">
            <span className="panel-title">Your contract scans</span>
            <span className="chip">{uploaded.length}</span>
          </div>
          <div className="divide-y divide-line">
            {uploaded.map((c) => (
              <UploadedRow key={c.id} c={c} />
            ))}
          </div>
        </div>
      )}

      <p className="text-[11px] tracking-tight text-muted/60">
        Terms are extracted from connected agreements and financial records. Upload a PDF contract for
        clause-level analysis with evidence.
      </p>

      <Inspector
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.name} · contract` : ""}
        sub={selected ? selected.category : ""}
        footer={
          selected && (
            <div className="flex gap-2">
              <Link
                href={`/dashboard/vendors/${selected.id}`}
                className="toolbar-btn primary flex-1 justify-center"
              >
                Open vendor profile
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
            <DetailRow label="Annual value">
              <span className="font-semibold">{money(selected.contractValue)}</span>
              <span className="ml-1 text-[11px] text-muted">/yr</span>
            </DetailRow>
            <DetailRow label="Effective date">{formatDate(selected.startDate)}</DetailRow>
            <DetailRow label="Renewal">{selected.renewalDate ? formatDate(selected.renewalDate) : "Rolling"}</DetailRow>
            <DetailRow label="Cancel by">{selected.cancellationDeadline ? formatDate(selected.cancellationDeadline) : "-"}</DetailRow>
            <DetailRow label="Auto-renew">
              <AutoRenewChip on={selected.autoRenew} />
            </DetailRow>
            <DetailRow label="Price escalation">
              {selected.priceEscalationRate ? pct(selected.priceEscalationRate) : "None stated"}
            </DetailRow>
            <DetailRow label="Owner">{selected.owner}</DetailRow>
            <DetailRow label="Last reviewed">{formatDate(selected.lastReviewed)}</DetailRow>

            {selected.risk && (
              <>
                <p className="px-4 pb-1 pt-4 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-amber-400">
                  Renewal risk
                </p>
                <DetailRow label="Renews in">{selected.risk.daysToRenewal} days</DetailRow>
                <DetailRow label="Deadline">{selected.risk.daysToDeadline < 0 ? "missed" : `${selected.risk.daysToDeadline} days left`}</DetailRow>
                <DetailRow label="Expected increase">{pct(selected.risk.expectedIncreasePct)}</DetailRow>
                <DetailRow label="Renewal cost">{money(selected.risk.potentialRenewalCost)}/yr</DetailRow>
              </>
            )}

            {selected.potentialSavings > 0 && (
              <>
                <p className="px-4 pb-1 pt-4 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-emerald-400">
                  Savings opportunity
                </p>
                <div className="px-4 py-3">
                  <p className="text-[22px] font-semibold tracking-tight text-emerald-400">
                    {money(selected.potentialSavings)}
                    <span className="ml-1 text-[11px] font-normal text-muted">/yr potential</span>
                  </p>
                  <ArrowLink href="/dashboard/savings" label="See the savings engine" />
                </div>
              </>
            )}

            <div className="px-4 py-4">
              <button
                onClick={() => router.push("/audit")}
                className="toolbar-btn w-full justify-center"
              >
                <ScanSearch size={13} /> Scan an updated document
              </button>
            </div>
          </div>
        )}
      </Inspector>
    </div>
  );
}

function UploadedRow({ c }: { c: ContractRecord }) {
  return (
    <Link
      key={c.id}
      href={`/dashboard/vendors/${c.id}`}
      className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-white/[0.03]"
    >
      <VendorCell name={c.vendorName} sub={c.linkedDocument} />
      <span className="ml-auto text-[12.5px] text-muted">{money(c.annualSpend)}/yr</span>
      <RiskChip level={c.riskScore >= 80 ? "critical" : c.riskScore >= 60 ? "high" : c.riskScore >= 35 ? "medium" : "low"} />
      <span className="text-[12px] text-emerald-400">View →</span>
    </Link>
  );
}
