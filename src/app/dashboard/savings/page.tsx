"use client";

import { useMemo, useState } from "react";
import { useAuthUser } from "@/lib/workspace-auth";
import { useDisplayMode } from "@/lib/displayMode";
import { useSectionEntitlement } from "@/lib/useSectionEntitlement";
import { getContracts } from "@/lib/store";
import { useNow } from "@/lib/useNow";
import { money } from "@/lib/format";
import type { ContractRecord } from "@/lib/types";
import { CompanyInspector, recommendedContractAction } from "@/components/dashboard/CompanyInspector";
import { WorkspaceEmpty } from "@/components/dashboard/panels";
import { SectionLocked } from "@/components/dashboard/SectionLocked";
import { DataTableEditor, type EditorColumn } from "@/components/dashboard/DataTableEditor";
import { tableTabs } from "@/components/dashboard/tableTabs";

/* ------------------------------------------------------------------ */
/*  Savings - the savings register as a table editor.                 */
/*  Potential savings derived from real contract terms, aligned and    */
/*  scannable, with the driver behind each opportunity.                */
/* ------------------------------------------------------------------ */

export default function SavingsPage() {
  const auth = useAuthUser();
  const userId = auth.id;
  const now = useNow();
  const { lockedSections } = useDisplayMode();
  const { locked: savingsLocked } = useSectionEntitlement("savings", lockedSections.includes("savings"));
  const contracts = useMemo(() => (userId ? getContracts(userId) : []), [userId]);

  const [selected, setSelected] = useState<ContractRecord | null>(null);

  // Hooks are called unconditionally (before any early return) so the
  // locked-state render keeps the exact same hook order as the full render.
  const candidates = useMemo(
    () => contracts.filter((c) => c.opportunityHigh > 0),
    [contracts]
  );

  if (savingsLocked) {
    return (
      <SectionLocked
        title="Savings"
        description="See every negotiated savings opportunity and its estimated annual impact, ranked by value."
      />
    );
  }

  const savingsDrivers = (c: ContractRecord): string => {
    const drivers: string[] = [];
    if (c.escalationRate != null) drivers.push(`${c.escalationRate}% escalation`);
    if (c.autoRenew && c.renewalDate) drivers.push("auto-renew");
    if (c.category) drivers.push(c.category);
    return drivers.join(" · ") || "—";
  };

  const pct = (c: ContractRecord) =>
    c.annualSpend > 0 ? Math.round((c.opportunityHigh / c.annualSpend) * 100) : 0;

  const columns: EditorColumn<ContractRecord>[] = [
    {
      key: "vendor",
      label: "Vendor",
      type: "text",
      description: "The vendor with identified savings room.",
      render: (c) => (
        <span className="flex items-center gap-2">
          <span className="grid size-5 shrink-0 place-items-center rounded bg-white/[0.06] text-[9px] font-semibold text-fg">
            {c.vendorName.slice(0, 2).toUpperCase()}
          </span>
          <span className="min-w-0 truncate text-[12.5px] font-medium text-fg">{c.vendorName}</span>
        </span>
      ),
      value: (c) => c.vendorName.toLowerCase(),
    },
    {
      key: "current",
      label: "Current Cost",
      type: "money",
      align: "right",
      description: "Stated annual spend extracted from the agreement.",
      render: (c) =>
        c.annualSpend > 0 ? (
          <span className="tabular-nums text-zinc-300">{money(c.annualSpend)}</span>
        ) : (
          <span className="text-zinc-500">—</span>
        ),
      value: (c) => c.annualSpend,
    },
    {
      key: "potentialCost",
      label: "Potential Cost",
      type: "money",
      align: "right",
      description: "Estimated cost after capturing the opportunity.",
      render: (c) =>
        c.annualSpend > 0 ? (
          <span className="tabular-nums text-zinc-300">{money(Math.max(0, c.annualSpend - c.opportunityHigh))}</span>
        ) : (
          <span className="text-zinc-500">—</span>
        ),
      value: (c) => c.opportunityHigh,
    },
    {
      key: "savings",
      label: "Potential Savings",
      type: "money",
      align: "right",
      description: "Estimated savings range from the identified opportunity.",
      render: (c) => (
        <span className="font-semibold tabular-nums text-fg">
          {money(c.opportunityLow)}–{money(c.opportunityHigh)}
        </span>
      ),
      value: (c) => c.opportunityHigh,
    },
    {
      key: "pct",
      label: "Savings %",
      type: "number",
      align: "right",
      description: "Savings as a share of annual cost.",
      render: (c) => (
        <span className="tabular-nums text-zinc-200">{c.annualSpend > 0 ? `${pct(c)}%` : "—"}</span>
      ),
      value: (c) => pct(c),
    },
    {
      key: "opportunity",
      label: "Opportunity",
      type: "text",
      description: "The driver behind the savings opportunity.",
      render: (c) => <span className="truncate text-[11.5px] text-zinc-300">{savingsDrivers(c)}</span>,
      value: (c) => savingsDrivers(c),
    },
    {
      key: "source",
      label: "Source",
      type: "text",
      description: "The agreement the opportunity comes from.",
      render: (c) => <span className="truncate text-[11.5px] text-zinc-400">{c.linkedDocument || "—"}</span>,
      value: (c) => c.linkedDocument,
    },
    {
      key: "status",
      label: "Status",
      type: "chip",
      description: "Disposition of the opportunity.",
      render: () => <span className="text-zinc-300">Open</span>,
      value: () => "Open",
    },
    {
      key: "owner",
      label: "Owner",
      type: "text",
      description: "Accountable owner for this opportunity.",
      render: () => <span className="text-zinc-500">—</span>,
      value: () => "",
    },
    {
      key: "action",
      label: "Action",
      type: "text",
      description: "Recommended next step for this opportunity.",
      render: (c) => (
        <span className="line-clamp-1 block whitespace-normal text-[11px] text-zinc-400">
          {recommendedContractAction(c, now)}
        </span>
      ),
      value: (c) => recommendedContractAction(c, now),
    },
  ];

  const totalLow = candidates.reduce((s, c) => s + c.opportunityLow, 0);
  const totalHigh = candidates.reduce((s, c) => s + c.opportunityHigh, 0);

  const tables = tableTabs({
    active: "savings",
    contracts: contracts.length,
    renewals: contracts.filter((c) => c.renewalDate).length,
    risk: contracts.filter((c) => c.riskScore >= 60).length,
    savings: candidates.length,
  });

  if (contracts.length === 0) {
    return (
      <div className="h-full">
        <WorkspaceEmpty
          title="No savings to show"
          body="Savings opportunities derived from your analyzed contracts will appear here with the driver behind each one."
        />
      </div>
    );
  }

  return (
    <DataTableEditor<ContractRecord>
      title="Savings"
      railLabel="Savings"
      description="savings register"
      columns={columns}
      rows={candidates}
      defaultSort={{ key: "savings", dir: -1 }}
      filter={(c, q) =>
        [c.vendorName, c.linkedDocument, savingsDrivers(c)]
          .join(" ")
          .toLowerCase()
          .includes(q.toLowerCase())
      }
      tables={tables}
      selectedId={selected?.id}
      onRowClick={(c) => setSelected(selected?.id === c.id ? null : c)}
      footerHint={`Total potential ${money(totalLow)}–${money(totalHigh)}/yr across ${candidates.length} contracts`}
    >
      <CompanyInspector
        contract={selected}
        onClose={() => setSelected(null)}
        emails={[]}
        activity={[]}
      />
    </DataTableEditor>
  );
}