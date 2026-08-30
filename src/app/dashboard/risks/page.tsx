"use client";

import { useMemo, useState } from "react";
import { useAuthUser } from "@/lib/auth";
import { useDisplayMode } from "@/lib/displayMode";
import { useSectionEntitlement } from "@/lib/useSectionEntitlement";
import { getActivity, getContracts, getEmailThreads } from "@/lib/store";
import { useNow } from "@/lib/useNow";
import { money } from "@/lib/format";
import type { ContractRecord } from "@/lib/types";
import { RiskChip, riskLevel } from "@/components/dashboard/shared";
import {
  CompanyInspector,
  contractReasons,
  recommendedContractAction,
} from "@/components/dashboard/CompanyInspector";
import { WorkspaceEmpty } from "@/components/dashboard/panels";
import { SectionLocked } from "@/components/dashboard/SectionLocked";
import { DataTableEditor, type EditorColumn } from "@/components/dashboard/DataTableEditor";
import { Sparkles } from "lucide-react";
import { tableTabs } from "@/components/dashboard/tableTabs";

/* ------------------------------------------------------------------ */
/*  Risks - the vendor risk register as a table editor.               */
/*  One row per elevated contract with the real drivers behind the     */
/*  score and the recommended next step.                               */
/* ------------------------------------------------------------------ */

export default function RisksPage() {
  const auth = useAuthUser();
  const userId = auth.id;
  const now = useNow();
  const { lockedSections } = useDisplayMode();
  const { locked: riskLocked } = useSectionEntitlement("risk", lockedSections.includes("risk"));
  const contracts = useMemo(() => (userId ? getContracts(userId) : []), [userId]);
  const activity = useMemo(() => (userId ? getActivity(userId) : []), [userId]);
  const threads = useMemo(() => (userId ? getEmailThreads(userId) : []), [userId]);

  const [selected, setSelected] = useState<ContractRecord | null>(null);

  if (riskLocked) {
    return (
      <SectionLocked
        title="Risk"
        description="See every contract risk and its severity so nothing can auto-renew or escalate unnoticed."
      />
    );
  }

  const selEmails = selected
    ? threads.filter((t) => t.vendorName.toLowerCase() === selected.vendorName.toLowerCase())
    : [];
  const selActivity = selected
    ? activity.filter((a) => (a.vendorName ?? "").toLowerCase() === selected.vendorName.toLowerCase())
    : [];

  const atRisk = contracts.filter((c) => c.riskScore >= 55);

  /** Top driver label for a contract (from the real reasons list). */
  const riskType = (c: ContractRecord): string => {
    const r = contractReasons(c, now)[0] ?? "";
    if (r.includes("Auto-renews")) return "Auto-renewal";
    if (r.includes("Cancellation window")) return "Notice deadline";
    if (r.includes("Savings")) return "Savings";
    if (r.includes("Risk score")) return "Composite";
    return r || "—";
  };

  const columns: EditorColumn<ContractRecord>[] = [
    {
      key: "vendor",
      label: "Vendor",
      type: "text",
      description: "The vendor with elevated risk.",
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
      key: "contract",
      label: "Contract",
      type: "text",
      description: "The source agreement document.",
      render: (c) => <span className="truncate text-[11.5px] text-zinc-400">{c.linkedDocument}</span>,
      value: (c) => c.linkedDocument,
    },
    {
      key: "level",
      label: "Risk Level",
      type: "chip",
      description: "Severity label derived from the risk score.",
      render: (c) => {
        const lvl = riskLevel(c.riskScore);
        return (
          <span className="flex items-center gap-1.5">
            <RiskChip level={lvl} />
            <span className={`text-[11px] font-semibold tabular-nums ${c.riskScore >= 60 ? "text-zinc-100" : "text-zinc-300"}`}>
              {c.riskScore}
            </span>
          </span>
        );
      },
      value: (c) => c.riskScore,
    },
    {
      key: "type",
      label: "Risk Type",
      type: "text",
      description: "Primary driver behind the elevated score.",
      render: (c) => <span className="text-[11.5px] text-zinc-300">{riskType(c)}</span>,
      value: (c) => riskType(c),
    },
    {
      key: "renewalRisk",
      label: "Renewal Risk",
      type: "number",
      align: "right",
      description: "Days to the next renewal, flagged when close.",
      render: (c) => {
        if (!c.renewalDate) return <span className="text-zinc-500">—</span>;
        const d = Math.ceil((new Date(c.renewalDate + "T00:00:00").getTime() - now) / 86400000);
        return (
          <span className={`text-[11.5px] ${d < 0 ? "text-zinc-100" : d <= 30 ? "text-zinc-200" : "text-zinc-300"}`}>
            {d < 0 ? "Past due" : d <= 30 ? `Within ${d}d` : `${d}d`}
          </span>
        );
      },
      value: (c) => (c.renewalDate ? Math.ceil((new Date(c.renewalDate + "T00:00:00").getTime() - now) / 86400000) : 99999),
    },
    {
      key: "financial",
      label: "Financial Risk",
      type: "money",
      align: "right",
      description: "Annual value at risk under this agreement.",
      render: (c) =>
        c.annualSpend > 0 ? (
          <span className={`tabular-nums ${c.riskScore >= 60 ? "text-zinc-100" : "text-zinc-300"}`}>{money(c.annualSpend)}</span>
        ) : (
          <span className="text-zinc-500">—</span>
        ),
      value: (c) => c.annualSpend,
    },
    {
      key: "autoRisk",
      label: "Auto-Renew Risk",
      type: "chip",
      description: "Whether auto-renewal is a live threat.",
      render: (c) => {
        if (!c.autoRenew) return <span className="text-zinc-500">Manual</span>;
        const near =
          c.cancellationDeadline &&
          new Date(c.cancellationDeadline + "T00:00:00").getTime() - now <= 30 * 86400000;
        return (
          <span className={`text-[11.5px] ${near ? "text-zinc-100" : "text-zinc-200"}`}>
            {near ? "Window closing" : "Auto-renew"}
          </span>
        );
      },
      value: (c) => Number(c.autoRenew),
    },
    {
      key: "contractRisk",
      label: "Contract Risk",
      type: "chip",
      description: "Composite risk embedded in the contract terms.",
      render: () => <span className="text-zinc-500">—</span>,
      value: () => "",
    },
    {
      key: "complianceRisk",
      label: "Compliance Risk",
      type: "chip",
      description: "Compliance exposure from the agreement.",
      render: () => <span className="text-zinc-500">—</span>,
      value: () => "",
    },
    {
      key: "exposure",
      label: "Annual Exposure",
      type: "money",
      align: "right",
      description: "Annualized exposure for this contract.",
      render: (c) =>
        c.annualSpend > 0 ? (
          <span className="font-medium tabular-nums text-zinc-100">{money(c.annualSpend)}</span>
        ) : (
          <span className="text-zinc-500">—</span>
        ),
      value: (c) => c.annualSpend,
    },
    {
      key: "reason",
      label: "Reason",
      type: "text",
      description: "Why this contract carries elevated risk.",
      render: (c) => (
        <span className="line-clamp-1 block whitespace-normal text-[11px] text-zinc-400">
          {contractReasons(c, now).slice(0, 2).join(" · ") || "—"}
        </span>
      ),
      value: (c) => contractReasons(c, now).join(" · "),
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
      key: "status",
      label: "Status",
      type: "chip",
      description: "Lifecycle status of the contract.",
      render: (c) => <span className="text-[11.5px] text-zinc-300">{c.status.replace("_", " ")}</span>,
      value: (c) => c.status,
    },
    {
      key: "action",
      label: "Recommended Action",
      type: "text",
      description: "The recommended next step.",
      render: (c) => (
        <span className="line-clamp-1 block whitespace-normal text-[11px] text-zinc-400">
          {recommendedContractAction(c, now)}
        </span>
      ),
      value: (c) => recommendedContractAction(c, now),
    },
  ];

  const tables = tableTabs({
    active: "risk",
    contracts: contracts.length,
    renewals: contracts.filter((c) => c.renewalDate).length,
    risk: atRisk.length,
    activity: activity.length,
    savings: contracts.filter((c) => c.opportunityHigh > 0).length,
  });

  if (contracts.length === 0) {
    return (
      <div className="h-full">
        <WorkspaceEmpty
          title="No risks to show"
          body="Contracts with elevated risk scores from real analysis will appear here with their drivers and recommended actions."
        />
      </div>
    );
  }

  return (
    <DataTableEditor<ContractRecord>
      title="Risk"
      railLabel="Risk"
      description="risk register"
      icon={<Sparkles size={13} className="text-muted" />}
      columns={columns}
      rows={atRisk}
      defaultSort={{ key: "level", dir: -1 }}
      filter={(c, q) =>
        [c.vendorName, c.linkedDocument, riskType(c), c.status]
          .join(" ")
          .toLowerCase()
          .includes(q.toLowerCase())
      }
      tables={tables}
      selectedId={selected?.id}
      onRowClick={(c) => setSelected(selected?.id === c.id ? null : c)}
      footerHint={`${atRisk.length} contracts with elevated risk`}
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