"use client";

import { useMemo, useState } from "react";
import { useAuthUser } from "@/lib/auth";
import { getActivity, getContracts, getEmailThreads } from "@/lib/store";
import { useNow } from "@/lib/useNow";
import { money, formatDate } from "@/lib/format";
import type { ContractRecord } from "@/lib/types";
import { RiskChip, riskLevel } from "@/components/dashboard/shared";
import { CompanyInspector, recommendedContractAction } from "@/components/dashboard/CompanyInspector";
import { WorkspaceEmpty } from "@/components/dashboard/panels";
import { DataTableEditor, type EditorColumn } from "@/components/dashboard/DataTableEditor";
import { Sparkles } from "lucide-react";
import { tableTabs } from "@/components/dashboard/tableTabs";

/* ------------------------------------------------------------------ */
/*  Renewals - the renewal calendar as a table editor.                */
/*  Real dates and deadlines, urgency indicators in the grid, sorting  */
/*  by day-difference to stay on top of what renews next.             */
/* ------------------------------------------------------------------ */

interface RenewalRow {
  id: string;
  c: ContractRecord;
  days: number;
  noticeDays: number | null;
}

function renewalStatus(r: RenewalRow) {
  if (r.days < 0) return { label: "Expired", cls: "text-zinc-100", dot: "bg-zinc-300" };
  if (r.days <= 7) return { label: "Critical", cls: "text-zinc-300", dot: "bg-zinc-300" };
  if (r.days <= 30) return { label: "Due soon", cls: "text-zinc-200", dot: "bg-zinc-300" };
  return { label: "Upcoming", cls: "text-zinc-300", dot: "bg-zinc-400" };
}

export default function RenewalsPage() {
  const auth = useAuthUser();
  const userId = auth.id;
  const now = useNow();
  const contracts = useMemo(() => (userId ? getContracts(userId) : []), [userId]);
  const activity = useMemo(() => (userId ? getActivity(userId) : []), [userId]);
  const threads = useMemo(() => (userId ? getEmailThreads(userId) : []), [userId]);

  const [selected, setSelected] = useState<ContractRecord | null>(null);

  const selEmails = selected
    ? threads.filter((t) => t.vendorName.toLowerCase() === selected.vendorName.toLowerCase())
    : [];
  const selActivity = selected
    ? activity.filter((a) => (a.vendorName ?? "").toLowerCase() === selected.vendorName.toLowerCase())
    : [];

  const rows = useMemo<RenewalRow[]>(() => {
    return contracts
      .filter((c) => c.renewalDate)
      .map((c) => ({
        id: c.id,
        c,
        days: Math.ceil((new Date(c.renewalDate + "T00:00:00").getTime() - now) / 86400000),
        noticeDays: c.cancellationDeadline
          ? Math.ceil((new Date(c.cancellationDeadline + "T00:00:00").getTime() - now) / 86400000)
          : null,
      }))
      .sort((a, b) => a.days - b.days);
  }, [contracts, now]);

  const columns: EditorColumn<RenewalRow>[] = [
    {
      key: "vendor",
      label: "Vendor",
      type: "text",
      description: "The vendor whose contract renews.",
      render: (r) => (
        <span className="min-w-0 truncate text-[12.5px] font-medium text-fg">{r.c.vendorName}</span>
      ),
      value: (r) => r.c.vendorName.toLowerCase(),
    },
    {
      key: "contract",
      label: "Contract",
      type: "text",
      description: "The source agreement document.",
      render: (r) => <span className="truncate text-[11.5px] text-zinc-400">{r.c.linkedDocument}</span>,
      value: (r) => r.c.linkedDocument,
    },
    {
      key: "renewal",
      label: "Renewal Date",
      type: "date",
      description: "Next renewal date from the agreement terms.",
      render: (r) => <span className="tabular-nums text-zinc-200">{formatDate(r.c.renewalDate)}</span>,
      value: (r) => r.c.renewalDate,
    },
    {
      key: "days",
      label: "Days Until",
      type: "number",
      align: "right",
      description: "Days remaining until the renewal date.",
      render: (r) => (
        <span className={`font-semibold tabular-nums ${r.days < 30 ? "text-zinc-100" : "text-zinc-300"}`}>
          {r.days < 0 ? `-${Math.abs(r.days)}` : r.days}
        </span>
      ),
      value: (r) => r.days,
    },
    {
      key: "deadline",
      label: "Notice Deadline",
      type: "date",
      description: "Deadline to cancel without committing to another term.",
      render: (r) => <span className="tabular-nums text-zinc-400">{formatDate(r.c.cancellationDeadline)}</span>,
      value: (r) => r.c.cancellationDeadline ?? "",
    },
    {
      key: "noticeDays",
      label: "Days to Notice",
      type: "number",
      align: "right",
      description: "Days remaining until the cancellation deadline.",
      render: (r) =>
        r.noticeDays == null ? (
          <span className="text-zinc-500">—</span>
        ) : (
          <span className={`tabular-nums ${r.noticeDays < 0 ? "text-zinc-100" : r.noticeDays <= 30 ? "text-zinc-200" : "text-zinc-300"}`}>
            {r.noticeDays < 0 ? "past" : r.noticeDays}
          </span>
        ),
      value: (r) => r.noticeDays ?? 99999,
    },
    {
      key: "cost",
      label: "Annual Cost",
      type: "money",
      align: "right",
      description: "Stated annual spend extracted from the agreement.",
      render: (r) =>
        r.c.annualSpend > 0 ? (
          <span className="font-medium tabular-nums text-zinc-100">{money(r.c.annualSpend)}</span>
        ) : (
          <span className="text-zinc-500">—</span>
        ),
      value: (r) => r.c.annualSpend,
    },
    {
      key: "autorenew",
      label: "Auto-Renew",
      type: "chip",
      description: "Whether the contract renews automatically.",
      render: (r) => (
        <span className={r.c.autoRenew ? "text-zinc-200" : "text-zinc-500"}>
          {r.c.autoRenew ? "Yes" : "Manual"}
        </span>
      ),
      value: (r) => Number(r.c.autoRenew),
    },
    {
      key: "status",
      label: "Status",
      type: "chip",
      description: "Renewal urgency derived from the real dates.",
      render: (r) => {
        const s = renewalStatus(r);
        return (
          <span className="flex items-center gap-1.5">
            <span className={`size-1.5 rounded-full ${s.dot}`} aria-hidden="true" />
            <span className={`text-[11.5px] font-medium ${s.cls}`}>{s.label}</span>
          </span>
        );
      },
      value: (r) => renewalStatus(r).label,
    },
    {
      key: "risk",
      label: "Risk",
      type: "chip",
      description: "Extracted risk score and severity label.",
      render: (r) => (
        <span className="flex items-center gap-1.5">
          <span className={`text-[11px] font-semibold tabular-nums ${r.c.riskScore >= 60 ? "text-zinc-100" : "text-zinc-300"}`}>
            {r.c.riskScore}
          </span>
          <RiskChip level={riskLevel(r.c.riskScore)} />
        </span>
      ),
      value: (r) => r.c.riskScore,
    },
    {
      key: "owner",
      label: "Owner",
      type: "text",
      description: "Accountable owner for this agreement.",
      render: () => <span className="text-zinc-500">—</span>,
      value: () => "",
    },
    {
      key: "action",
      label: "Action",
      type: "text",
      description: "Recommended next step for this renewal.",
      render: (r) => (
        <span className="line-clamp-1 block whitespace-normal text-[11px] text-zinc-400">
          {recommendedContractAction(r.c, now)}
        </span>
      ),
      value: (r) => recommendedContractAction(r.c, now),
    },
  ];

  const tables = tableTabs({
    active: "renewals",
    contracts: contracts.length,
    renewals: rows.length,
    risk: contracts.filter((c) => c.riskScore >= 60).length,
    activity: activity.length,
    savings: contracts.filter((c) => c.opportunityHigh > 0).length,
  });

  if (contracts.length === 0) {
    return (
      <div className="h-full">
        <WorkspaceEmpty
          title="No renewals yet"
          body="Renewal dates extracted from your analyzed contracts will appear here, sorted by urgency."
        />
      </div>
    );
  }

  return (
    <DataTableEditor<RenewalRow>
      title="Renewals"
      railLabel="Renewals"
      description="renewal calendar"
      icon={<Sparkles size={13} className="text-muted" />}
      columns={columns}
      rows={rows}
      defaultSort={{ key: "days", dir: 1 }}
      filter={(r, q) =>
        [r.c.vendorName, r.c.linkedDocument, renewalStatus(r).label]
          .join(" ")
          .toLowerCase()
          .includes(q.toLowerCase())
      }
      tables={tables}
      selectedId={selected?.id}
      onRowClick={(r) => setSelected(selected?.id === r.c.id ? null : r.c)}
      footerHint={`${rows.length} renewals sorted by days until renewal`}
    >
      <CompanyInspector
        contract={selected}
        onClose={() => setSelected(null)}
        emails={selEmails}
        activity={selActivity}
      />
    </DataTableEditor>
  );
}