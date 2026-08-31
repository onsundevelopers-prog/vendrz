"use client";

import { useMemo, useState } from "react";
import { useAuthUser } from "@/lib/auth";
import { getActivity, getContracts, getEmailThreads } from "@/lib/store";
import { money, formatDate } from "@/lib/format";
import type { ContractRecord } from "@/lib/types";
import { StatusChip, RiskChip, riskLevel } from "@/components/dashboard/shared";
import { CompanyInspector } from "@/components/dashboard/CompanyInspector";
import { WorkspaceEmpty } from "@/components/dashboard/panels";
import { DocumentsPanel } from "@/components/dashboard/DocumentsPanel";
import {
  DataTableEditor,
  type EditorColumn,
} from "@/components/dashboard/DataTableEditor";
import { tableTabs } from "@/components/dashboard/tableTabs";

/* ------------------------------------------------------------------ */
/*  Contracts - the contract register as a Supabase-style table        */
/*  editor. One row per analyzed agreement, real extracted terms,      */
/*  dense and flat, with checkbox selection, sorting, resizing via     */
/*  the Data/Definition toolbar and a paginated grid.                  */
/* ------------------------------------------------------------------ */

export default function ContractsPage() {
  const auth = useAuthUser();
  const userId = auth.id;
  const contracts = useMemo(() => (userId ? getContracts(userId) : []), [userId]);
  const activity = useMemo(() => (userId ? getActivity(userId) : []), [userId]);
  const threads = useMemo(() => (userId ? getEmailThreads(userId) : []), [userId]);

  const [selected, setSelected] = useState<ContractRecord | null>(null);

  const selActivity = selected
    ? activity.filter((a) => (a.vendorName ?? "").toLowerCase() === selected.vendorName.toLowerCase())
    : [];
  const selEmails = selected
    ? threads.filter((t) => t.vendorName.toLowerCase() === selected.vendorName.toLowerCase())
    : [];

  const columns: EditorColumn<ContractRecord>[] = [
    {
      key: "vendor",
      label: "Vendor",
      type: "text",
      description: "The vendor name the contract was signed with.",
      render: (c) => (
        <span className="flex items-center gap-2">
          <span className="grid size-5 shrink-0 place-items-center rounded bg-white/[0.06] text-[9px] font-semibold text-fg">
            {c.vendorName.slice(0, 2).toUpperCase()}
          </span>
          <span className="min-w-0 truncate text-[12.5px] font-medium text-fg">
            {c.vendorName || "Unidentified vendor"}
          </span>
        </span>
      ),
      value: (c) => c.vendorName.toLowerCase(),
    },
    {
      key: "document",
      label: "Contract",
      type: "text",
      description: "The source agreement document.",
      render: (c) => (
        <span className="truncate text-[11.5px] text-zinc-300">{c.linkedDocument}</span>
      ),
      value: (c) => c.linkedDocument,
    },
    {
      key: "category",
      label: "Category",
      type: "text",
      description: "Spend category the vendor is classified under.",
      render: (c) => <span className="text-[11.5px] text-zinc-400">{c.category || "—"}</span>,
      value: (c) => c.category,
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
      key: "start",
      label: "Start Date",
      type: "date",
      description: "Effective start date of the agreement.",
      render: () => <span className="text-zinc-500">—</span>,
      value: () => "",
    },
    {
      key: "end",
      label: "End Date",
      type: "date",
      description: "Scheduled end of the current term.",
      render: () => <span className="text-zinc-500">—</span>,
      value: () => "",
    },
    {
      key: "renewal",
      label: "Renewal Date",
      type: "date",
      description: "Next renewal date from the agreement terms.",
      render: (c) => <span className="tabular-nums text-zinc-200">{formatDate(c.renewalDate || null)}</span>,
      value: (c) => c.renewalDate,
    },
    {
      key: "deadline",
      label: "Notice Deadline",
      type: "date",
      description: "Deadline to cancel without committing to another term.",
      render: (c) => <span className="tabular-nums text-zinc-400">{formatDate(c.cancellationDeadline)}</span>,
      value: (c) => c.cancellationDeadline ?? "",
    },
    {
      key: "cost",
      label: "Annual Cost",
      type: "money",
      align: "right",
      description: "Stated annual spend extracted from the agreement.",
      render: (c) =>
        c.annualSpend > 0 ? (
          <span className="font-medium tabular-nums text-zinc-100">{money(c.annualSpend)}</span>
        ) : (
          <span className="text-zinc-500">—</span>
        ),
      value: (c) => c.annualSpend,
    },
    {
      key: "autorenew",
      label: "Auto-Renew",
      type: "chip",
      description: "Whether the contract renews automatically.",
      render: (c) => (
        <span className={c.autoRenew ? "text-zinc-200" : "text-zinc-500"}>
          {c.autoRenew ? "Yes" : "Manual"}
        </span>
      ),
      value: (c) => Number(c.autoRenew),
    },
    {
      key: "status",
      label: "Status",
      type: "chip",
      description: "Current lifecycle status of the contract.",
      render: (c) => <StatusChip status={c.status} />,
      value: (c) => c.status,
    },
    {
      key: "risk",
      label: "Risk",
      type: "chip",
      description: "Extracted risk score and severity label.",
      render: (c) => (
        <span className="flex items-center gap-1.5">
          <span
            className={`text-[11px] font-semibold tabular-nums ${
              c.riskScore >= 60 ? "text-zinc-100" : "text-zinc-300"
            }`}
          >
            {c.riskScore}
          </span>
          <RiskChip level={riskLevel(c.riskScore)} />
        </span>
      ),
      value: (c) => c.riskScore,
    },
  ];

  const tables = tableTabs({
    active: "contracts",
    contracts: contracts.length,
    renewals: contracts.filter((c) => c.renewalDate).length,
    risk: contracts.filter((c) => c.riskScore >= 60).length,
    activity: activity.length,
    savings: contracts.filter((c) => c.opportunityHigh > 0).length,
  });

  const totalSpend = contracts.reduce((s, c) => s + c.annualSpend, 0);

  return (
    <div className="h-full overflow-y-auto">
      <div className="border-b border-line">
        <div className="flex items-center gap-2 border-b border-line bg-surface px-4 py-2">
          <span className="text-[11px] font-semibold tracking-[0.1em] text-muted">
            Document library
          </span>
        </div>
        <DocumentsPanel />
      </div>
      {contracts.length === 0 ? (
        <div className="py-10">
          <WorkspaceEmpty
            title="No contracts yet"
            body="Documents you upload are shown above. Once a contract is analyzed, its extracted terms appear below."
          />
        </div>
      ) : (
        <div className="h-full">
          <DataTableEditor<ContractRecord>
            title="Contracts"
            railLabel="Contracts"
            description="contract register"
            columns={columns}
            rows={contracts}
            defaultSort={{ key: "cost", dir: -1 }}
            filter={(c, q) =>
              [c.vendorName, c.category, c.linkedDocument, c.status].join(" ").toLowerCase().includes(q.toLowerCase())
            }
            tables={tables}
            selectedId={selected?.id}
            onRowClick={(c) => setSelected(selected?.id === c.id ? null : c)}
            footerHint={`${money(totalSpend)} combined annual cost across ${contracts.length} contracts`}
          >
            <CompanyInspector
              contract={selected}
              onClose={() => setSelected(null)}
              emails={selEmails}
              activity={selActivity}
            />
          </DataTableEditor>
        </div>
      )}    </div>
  );
}
