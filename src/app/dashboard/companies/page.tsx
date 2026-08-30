"use client";

import { useMemo, useRef, useState } from "react";
import { useAuthUser } from "@/lib/auth";
import { planDef, useDisplayMode } from "@/lib/displayMode";
import { getActivity, getContracts, getEmailThreads, saveAgentMessage, getAgentMessages, logActivity, createAction, approveAction, rejectAction, markActionProgress, getAiUsage, incrementAiUsage } from "@/lib/store";
import { money, formatDate } from "@/lib/format";
import type { AgentMessage, ContractRecord } from "@/lib/types";
import { StatusChip, RiskChip, VendorCell, riskLevel } from "@/components/dashboard/shared";
import { CompanyInspector } from "@/components/dashboard/CompanyInspector";
import { AgentAssistant } from "@/components/dashboard/AgentAssistant";
import { WorkspaceEmpty } from "@/components/dashboard/panels";
import {
  DataTableEditor,
  type EditorColumn,
} from "@/components/dashboard/DataTableEditor";
import { tableTabs } from "@/components/dashboard/tableTabs";
import { Sparkles } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Vendors - Supabase-style table editor over the vendor register.    */
/*  Dense grid of the user's real analyzed contracts with checkbox     */
/*  selection, category/risk filters, an Ask-AI advisor, and a         */
/*  sliding vendor inspector.                                          */
/* ------------------------------------------------------------------ */

export default function CompaniesPage() {
  const auth = useAuthUser();
  const userId = auth.id;
  const contracts = useMemo(() => (userId ? getContracts(userId) : []), [userId]);
  const activity = useMemo(() => (userId ? getActivity(userId) : []), [userId]);
  const threads = useMemo(() => (userId ? getEmailThreads(userId) : []), [userId]);
  const storedMessages = useMemo(() => (userId ? getAgentMessages(userId) : []), [userId]);
  const { aiMessageLimit } = useDisplayMode();
  const [aiNotice, setAiNotice] = useState<string | null>(null);

  const [selected, setSelected] = useState<ContractRecord | null>(null);
  const [category, setCategory] = useState("");
  const [risk, setRisk] = useState("");
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const { mode, plan } = useDisplayMode();
  const isSimple = mode === "simple";

  const [advisorOpen, setAdvisorOpen] = useState(false);
  const [messages, setMessages] = useState<AgentMessage[]>(storedMessages);
  const [consulting, setConsulting] = useState(false);
  const consultingGuard = useRef(false);

  let scoped = contracts;
  if (category) scoped = scoped.filter((c) => c.category === category);
  if (risk) scoped = scoped.filter((c) => riskLevel(c.riskScore) === risk);

  const categories = [...new Set(contracts.map((c) => c.category))].sort();
  const checkedRows = contracts.filter((c) => checkedIds.includes(c.id));

  const columns: EditorColumn<ContractRecord>[] = [
    {
      key: "vendor",
      label: "Vendor",
      type: "text",
      description: "The vendor name and its analyzed agreement document.",
      render: (c) => <VendorCell name={c.vendorName || "Unidentified vendor"} sub={c.linkedDocument} />,
      value: (c) => c.vendorName.toLowerCase(),
    },
    {
      key: "category",
      label: "Category",
      type: "text",
      description: "Spend category the vendor is classified under.",
      render: (c) => <span className="text-zinc-400">{c.category || "—"}</span>,
      value: (c) => c.category,
    },
    {
      key: "value",
      label: "Annual spend",
      type: "money",
      align: "right",
      description: "Stated annual spend extracted from the agreement.",
      render: (c) =>
        c.annualSpend > 0 ? (
          <span className="font-medium tabular-nums text-zinc-100">{money(c.annualSpend)}</span>
        ) : (
          <span className="text-zinc-600">—</span>
        ),
      value: (c) => c.annualSpend,
    },
    {
      key: "renewal",
      label: "Next renewal",
      type: "date",
      description: "Next renewal date from the agreement terms.",
      render: (c) => <span className="text-zinc-200">{formatDate(c.renewalDate || null)}</span>,
      value: (c) => c.renewalDate,
    },
    {
      key: "cancel",
      label: "Cancel by",
      type: "date",
      description: "Deadline to cancel without committing to another term.",
      render: (c) => <span className="text-zinc-400">{formatDate(c.cancellationDeadline)}</span>,
      value: (c) => c.cancellationDeadline ?? "",
    },
    {
      key: "risk",
      label: "Risk",
      type: "chip",
      description: "Extracted risk score and severity label.",
      render: (c) => <RiskChip level={riskLevel(c.riskScore)} />,
      value: (c) => c.riskScore,
    },
    {
      key: "opportunity",
      label: "Opportunity",
      type: "money",
      align: "right",
      description: "Calculated savings range for this vendor.",
      render: (c) =>
        c.opportunityHigh > 0 ? (
          <span className="font-medium tabular-nums text-zinc-100">
            {money(c.opportunityLow)}–{money(c.opportunityHigh)}
          </span>
        ) : (
          <span className="text-zinc-600">—</span>
        ),
      value: (c) => c.opportunityHigh,
    },
    {
      key: "status",
      label: "Status",
      type: "chip",
      description: "Current lifecycle status of the contract.",
      render: (c) => <StatusChip status={c.status} />,
      value: (c) => c.status,
    },
  ];

  const tables = tableTabs({
    active: "vendors",
    contracts: contracts.length,
    renewals: contracts.filter((c) => c.renewalDate).length,
    risk: contracts.filter((c) => c.riskScore >= 60).length,
    activity: activity.length,
    savings: contracts.filter((c) => c.opportunityHigh > 0).length,
  });;

  const totalSpend = contracts.reduce((a, c) => a + c.annualSpend, 0);

  const selEmails = selected
    ? threads.filter((t) => t.vendorName.toLowerCase() === selected.vendorName.toLowerCase())
    : [];
  const selActivity = selected
    ? activity.filter((a) => (a.vendorName ?? "").toLowerCase() === selected.vendorName.toLowerCase())
    : [];

  /* --- Advisor send (honest real-delay behavior) --- */
  const sendAdvisor = (text: string) => {
    if (!userId || consultingGuard.current) return;
    // Free-tier AI allowance - counted per calendar month, matching the
    // Overview + AI workbench so the Vendors advisor obeys the same cap.
    const { used } = getAiUsage(userId);
    if (used >= aiMessageLimit) {
      setAiNotice(
        `You've used all ${aiMessageLimit} AI ${aiMessageLimit === 1 ? "message" : "messages"} this month on the ${planDef(plan).name} plan.`
      );
      return;
    }
    incrementAiUsage(userId);
    consultingGuard.current = true;
    setConsulting(true);

    const userMsg: AgentMessage = {
      id: `am-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };
    const next = [...messages, userMsg];
    setMessages(next);
    saveAgentMessage(userId, userMsg);

    const t = setTimeout(async () => {
      try {
        consultingGuard.current = false;
        setConsulting(false);
        const res = await fetch("/api/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: text,
            contracts,
            threads,
            activity,
            senderName: auth.name ?? "Your team",
          }),
        });
        const data = await res.json();
        const reply = {
          text: data.text ?? "I couldn't reach the analysis engine - try again in a moment.",
          contractIds: data.contractIds ?? [],
          draft: data.draft as
            | {
                action_type: "cancellation" | "negotiation" | "renewal" | "follow_up";
                vendorId: string;
                vendorName: string;
                to?: string;
                subject: string;
                body: string;
                reasoning?: string;
                proposed_changes?: string;
              }
            | undefined,
        };
        let pendingApproval: AgentMessage["pendingApproval"];
        if (reply.draft) {
          const d = reply.draft;
          const action = createAction(userId, {
            action_type: d.action_type,
            target: d.vendorName,
            reasoning: d.reasoning ?? d.body,
            proposed_changes: d.reasoning ?? `Send prepared email to ${d.vendorName}.`,
            vendorId: d.vendorId,
          });
          pendingApproval = {
            action_id: action.action_id,
            action_type: d.action_type,
            vendorId: d.vendorId,
            vendorName: d.vendorName,
            reasoning: d.reasoning ?? d.body,
            proposed_changes: d.reasoning ?? `Send prepared email to ${d.vendorName}.`,
            to: d.to ?? "",
            subject: d.subject,
            body: d.body,
          };
        }
        const agentMsg: AgentMessage = {
          id: `am-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          role: "agent",
          content: reply.text,
          createdAt: new Date().toISOString(),
          evidenceIds: reply.contractIds,
          pendingApproval,
        };
        const all = [...next, agentMsg];
        setMessages(all);
        saveAgentMessage(userId, agentMsg);
        if (reply.contractIds.length === 1) {
          const found = contracts.find((c) => c.id === reply.contractIds[0]);
          if (found) setSelected(found);
        }
      } catch {
        consultingGuard.current = false;
        setConsulting(false);
      }
    }, 400);
    void t;
  };

  /** Human-approval step: approve a persisted action - never auto-executes. */
  const approveDraft = (approval: {
    action_id: string;
    vendorId: string;
    vendorName: string;
    to: string;
    subject: string;
    body: string;
  }) => {
    if (!userId) return;
    approveAction(userId, approval.action_id);
    markActionProgress(userId, approval.action_id, "completed");
    logActivity(userId, {
      type: "email_sent",
      actor: "agent",
      vendorId: approval.vendorId,
      vendorName: approval.vendorName,
      title: `Action approved for ${approval.vendorName}`,
      detail: `Approved by user: \"${approval.subject}\" - recorded after approval. Never sent automatically.`,
    });
  };

  const rejectAction_ = (actionId: string) => {
    if (!userId) return;
    rejectAction(userId, actionId);
  };

  // Simple mode - the same spreadsheet, just the vendor essentials
  // (Vendor | Category | Renewal | Value | Risk).
  const simpleColumns: EditorColumn<ContractRecord>[] = [
    {
      key: "vendor",
      label: "Vendor",
      type: "text",
      render: (c) => (
        <span className="flex flex-col">
          <span className="font-medium text-fg">{c.vendorName || "Unidentified vendor"}</span>
          <span className="text-[10.5px] text-muted">{c.linkedDocument}</span>
        </span>
      ),
      value: (c) => c.vendorName.toLowerCase(),
    },
    {
      key: "category",
      label: "Category",
      type: "text",
      render: (c) => <span className="text-[12px] text-muted">{c.category || "—"}</span>,
      value: (c) => c.category,
    },
    {
      key: "renewal",
      label: "Renewal",
      type: "date",
      render: (c) => <span className="text-[12px] text-muted">{formatDate(c.renewalDate || null)}</span>,
      value: (c) => c.renewalDate,
    },
    {
      key: "value",
      label: "Value",
      type: "money",
      align: "right",
      render: (c) =>
        c.annualSpend > 0 ? (
          <span className="font-medium tabular-nums text-fg">{money(c.annualSpend)}</span>
        ) : (
          <span className="text-muted/60">—</span>
        ),
      value: (c) => c.annualSpend,
    },
    {
      key: "risk",
      label: "Risk",
      type: "chip",
      render: (c) => <RiskChip level={riskLevel(c.riskScore)} />,
      value: (c) => c.riskScore,
    },
  ];

  if (contracts.length === 0) {
    return (
      <div className="h-full">
        {aiNotice && (
          <div className="flex items-center gap-3 border-b border-line bg-surface px-4 py-2.5">
            <p className="min-w-0 flex-1 text-[12px] text-muted">{aiNotice}</p>
            <button onClick={() => setAiNotice(null)} className="shrink-0 text-[12px] text-fg">
              Dismiss
            </button>
          </div>
        )}
        <WorkspaceEmpty
          title="No vendors yet"
          body="Upload and analyze a contract and the vendor will appear here with its real extracted terms."
        />
      </div>
    );
  }

  return (
    <>
      {aiNotice && (
        <div className="flex items-center gap-3 border-b border-line bg-surface px-4 py-2.5">
          <p className="min-w-0 flex-1 text-[12px] text-muted">{aiNotice}</p>
          <button onClick={() => setAiNotice(null)} className="shrink-0 text-[12px] text-fg">
            Dismiss
          </button>
        </div>
      )}
      <DataTableEditor<ContractRecord>
        title="Vendors"
        railLabel="Vendors"
        description="vendors and their associated contracts"
        icon={<Sparkles size={13} className="text-muted" />}
        columns={isSimple ? simpleColumns : columns}
        simple={isSimple}
        rows={scoped}
        defaultSort={{ key: "value", dir: -1 }}
        filter={(c, q) =>
          [c.vendorName, c.category, c.linkedDocument, c.status, riskLevel(c.riskScore)]
            .join(" ")
            .toLowerCase()
            .includes(q.toLowerCase())
        }
        tables={tables}
        onRowClick={(c) => setSelected(selected?.id === c.id ? null : c)}
        selectedId={selected?.id}
        onSelectionChange={setCheckedIds}
        footerHint={`${money(totalSpend)} combined annual value across ${contracts.length} vendors`}
        toolbarRight={
          <>
            <div className="flex items-center gap-1.5">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                aria-label="Filter by category"
                className="h-7 rounded-md border border-line bg-canvas px-2 text-[11.5px] text-muted outline-none focus:border-white/25"
              >
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <select
                value={risk}
                onChange={(e) => setRisk(e.target.value)}
                aria-label="Filter by risk"
                className="h-7 rounded-md border border-line bg-canvas px-2 text-[11.5px] text-muted outline-none focus:border-white/25"
              >
                <option value="">All risk levels</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <button
                onClick={() => setAdvisorOpen(true)}
                className="flex h-7 items-center gap-1.5 rounded-md bg-white px-2.5 text-[12px] font-semibold text-black transition-opacity hover:opacity-90"
              >
                <Sparkles size={12} />
                Ask AI
              </button>
            </div>
            {checkedIds.length > 0 && (
              <span className="flex items-center gap-2">
                <span className="text-[11px] text-muted">
                  <span className="font-medium text-fg">{checkedIds.length}</span> selected
                </span>
                <button
                  onClick={() => {
                    const first = checkedRows[0];
                    if (first) setSelected(first);
                    setAdvisorOpen(true);
                  }}
                  className="flex h-7 items-center gap-1.5 rounded-md border border-white/20 bg-white/[0.06] px-2.5 text-[12px] font-medium text-zinc-200 transition-colors hover:bg-white/[0.1]"
                >
                  Review with AI
                </button>
                <button
                  onClick={() => setCheckedIds([])}
                  className="flex h-7 items-center rounded-md px-2 text-[12px] text-muted transition-colors hover:text-fg"
                >
                  Clear
                </button>
              </span>
            )}
          </>
        }
      >
        <CompanyInspector
          contract={selected}
          onClose={() => setSelected(null)}
          emails={selEmails}
          activity={selActivity}
        />
      </DataTableEditor>

      <AgentAssistant
        open={advisorOpen}
        onClose={() => setAdvisorOpen((v) => !v)}
        messages={messages}
        onSend={sendAdvisor}
        consulting={consulting}
        onSelectContract={(id) => {
          const c = contracts.find((x) => x.id === id);
          if (c) setSelected(c);
        }}
        onApproveDraft={approveDraft}
        onRejectDraft={rejectAction_}
      />
    </>
  );
}