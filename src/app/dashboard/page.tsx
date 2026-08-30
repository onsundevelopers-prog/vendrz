"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Bell, ChevronRight, Download, Eye, Mail, RefreshCw, TrendingUp, XCircle, Upload, FileScan } from "lucide-react";
import { useAuthUser } from "@/lib/auth";
import { planDef, useDisplayMode } from "@/lib/displayMode";
import { SimpleOverview } from "@/components/dashboard/SimpleOverview";
import { getActivity, getContracts, getDashboardStats, getEmailThreads, getAgentMessages, saveAgentMessage, logActivity, createAction, approveAction, rejectAction, markActionProgress, getAiUsage, incrementAiUsage } from "@/lib/store";
import { useNow } from "@/lib/useNow";
import { money, formatDate, timeAgo } from "@/lib/format";
import type { ActivityRecord, AgentMessage, ContractRecord } from "@/lib/types";
import { StatusChip, RiskChip, VendorCell, riskLevel } from "@/components/dashboard/shared";
import { CompanyInspector } from "@/components/dashboard/CompanyInspector";
import { AgentAssistant } from "@/components/dashboard/AgentAssistant";
import { Panel, KpiBlock, KpiStrip, PanelEmpty, WorkspaceEmpty } from "@/components/dashboard/panels";
import { Th, sorted, toggleSort, type SortState } from "@/components/dashboard/table";
import { BarChart, DonutChart } from "@/components/ui/charts";

/* ------------------------------------------------------------------ */
/*  Overview.                                                         */
/*  Built entirely from the user's real contracts (uploaded documents */
/*  processed by the extraction pipeline). With no contracts, an       */
/*  honest empty state is shown - nothing is invented.                 */
/* ------------------------------------------------------------------ */

const ACT_ICON: Record<ActivityRecord["type"], typeof Bell> = {
  alert: Bell,
  import: Download,
  review: Eye,
  email_sent: Mail,
  email_drafted: Mail,
  cancellation: XCircle,
  status_change: RefreshCw,
  savings: TrendingUp,
};

const daysUntil = (iso: string, now: number) =>
  Math.ceil((new Date(iso + "T00:00:00").getTime() - now) / 86400000);

export default function DashboardPage() {
  const auth = useAuthUser();
  const userId = auth.id;
  const now = useNow();
  const searchParams = useSearchParams();
  const contracts = useMemo(() => (userId ? getContracts(userId) : []), [userId]);
  const stats = useMemo(() => (userId ? getDashboardStats(userId) : null), [userId]);
  const activity = useMemo(() => (userId ? getActivity(userId) : []), [userId]);
  const threads = useMemo(() => (userId ? getEmailThreads(userId) : []), [userId]);
  const { mode, ready, plan, requestUpgrade, aiMessageLimit, lockedSections } = useDisplayMode();
  const renewalsLocked = lockedSections.includes("renewals");
  const riskLocked = lockedSections.includes("risk");
  const savingsLocked = lockedSections.includes("savings");

  // Landed from a pricing card (e.g. /dashboard?upgrade=team): open the
  // upgrade screen for that plan so the next step is payment, then clean
  // the query param off the URL.
  useEffect(() => {
    const target = searchParams.get("upgrade");
    if (target === "team" || target === "business" || target === "enterprise") {
      requestUpgrade(target);
      window.history.replaceState({}, "", "/dashboard");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  const [selected, setSelected] = useState<ContractRecord | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortState>({ key: "Spend", dir: -1 });
  const [aiNotice, setAiNotice] = useState<string | null>(null);

  // Advisor state - answers from the user's real contracts.
  const storedMessages = useMemo(() => (userId ? getAgentMessages(userId) : []), [userId]);
  const [advisorOpen, setAdvisorOpen] = useState(false);
  const [messages, setMessages] = useState<AgentMessage[]>(storedMessages);
  const [consulting, setConsulting] = useState(false);
  const consultingGuard = useRef(false);

  const sendAdvisor = (text: string) => {
    if (!userId || consultingGuard.current) return;
    // Free / Pro plan AI allowance - counted per calendar month.
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
    // Ask the real AI agent (server-side provider), grounded in real data.
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
        // Persist a formal approval action (always `pending` - never auto-executes).
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
    // Executing after explicit approval - recorded, never sent automatically.
    markActionProgress(userId, approval.action_id, "completed");
    logActivity(userId, {
      type: "email_sent",
      actor: "agent",
      vendorId: approval.vendorId,
      vendorName: approval.vendorName,
      title: `Action approved for ${approval.vendorName}`,
      detail: `Approved by user: "${approval.subject}" - recorded after approval. Never sent automatically.`,
    });
  };

  /** User rejects/revokes a pending action. */
  const rejectAction_ = (actionId: string) => {
    if (!userId) return;
    rejectAction(userId, actionId);
  };

  // ---- real renewals: contracts with an actual renewal date ----
  const renewals = contracts
    .filter((c) => c.renewalDate)
    .sort((a, b) => a.renewalDate.localeCompare(b.renewalDate));

  const atRisk = contracts
    .filter((c) => c.riskScore >= 60)
    .sort((a, b) => b.riskScore - a.riskScore);

  const renewalExposure = renewals
    .filter((c) => daysUntil(c.renewalDate, now) >= 0 && daysUntil(c.renewalDate, now) <= 90)
    .reduce((a, c) => a + c.annualSpend, 0);

  const totalSpend = contracts.reduce((a, c) => a + c.annualSpend, 0);
  const totalOpportunityLow = contracts.reduce((a, c) => a + c.opportunityLow, 0);
  const totalOpportunityHigh = contracts.reduce((a, c) => a + c.opportunityHigh, 0);

  // ---- real chart data, derived from the actual contracts ----
  const spendByCompany = [...contracts]
    .sort((a, b) => b.annualSpend - a.annualSpend)
    .slice(0, 8)
    .map((c) => ({ label: c.vendorName || "—", value: c.annualSpend }));

  const exposureBuckets = [
    { label: "0–30d", min: 0, max: 30 },
    { label: "31–90d", min: 31, max: 90 },
    { label: "91–180d", min: 91, max: 180 },
    { label: "180d+", min: 181, max: Infinity },
  ].map((b) => ({
    label: b.label,
    value: renewals
      .filter((c) => {
        const d = daysUntil(c.renewalDate, now);
        return d >= b.min && d <= b.max;
      })
      .reduce((a, c) => a + c.annualSpend, 0),
  }));

  const riskBuckets = ["low", "medium", "high", "critical"] as const;
  const riskDist = riskBuckets.map((lvl) => ({
    name: lvl[0].toUpperCase() + lvl.slice(1),
    value: contracts.filter((c) => riskLevel(c.riskScore) === lvl).length,
    color:
      lvl === "critical" ? "#f4f4f5" : lvl === "high" ? "#a1a1aa" : lvl === "medium" ? "#71717a" : "#3f3f46",
  }));

  const statusDist = (["active", "expiring_soon", "at_risk"] as const).map((s) => ({
    label: s.replace("_", " "),
    value: contracts.filter((c) => c.status === s).length,
  }));

  // ---- companies table: all on search, top 12 by spend otherwise ----
  const q = query.trim().toLowerCase();
  const searched = q
    ? contracts.filter((c) =>
        [c.vendorName, c.category, c.linkedDocument].join(" ").toLowerCase().includes(q)
      )
    : null;
  const tableRows =
    searched ?? [...contracts].sort((a, b) => b.annualSpend - a.annualSpend).slice(0, 12);
  const sortedRows = sorted(tableRows, sort, (c) =>
    sort?.key === "Vendor" ? c.vendorName.toLowerCase() : c.annualSpend
  );

  const selEmails = selected
    ? threads.filter((t) => t.vendorName.toLowerCase() === selected.vendorName.toLowerCase())
    : [];
  const selActivity = selected
    ? activity.filter((a) => (a.vendorName ?? "").toLowerCase() === selected.vendorName.toLowerCase())
    : [];

  // Display-mode gate: ask once, before the Overview, which level of
  // detail the user wants. The choice persists and is always editable
  // from Settings.
  if (!ready) {
    return <div className="h-full" />;
  }

  if (mode === "simple") {
    return (
      <>
        <SimpleOverview
          userName={auth.name ?? ""}
          contracts={contracts}
          renewals={renewals}
          atRisk={atRisk}
          totalSpend={totalSpend}
          opportunityLow={totalOpportunityLow}
          opportunityHigh={totalOpportunityHigh}
          activity={activity}
          onSelectContract={(c) => setSelected(c)}
        />
        <CompanyInspector
          contract={selected}
          onClose={() => setSelected(null)}
          emails={selEmails}
          activity={selActivity}
        />
      </>
    );
  }

  if (contracts.length === 0) {
    return (
      <div className="h-full">
        {aiNotice && (
          <AiLimitBanner
            text={aiNotice}
            onUpgrade={() => requestUpgrade()}
            onClose={() => setAiNotice(null)}
          />
        )}
        <WorkspaceEmpty
          title="No contracts yet"
          body="Upload a contract to analyze its terms, or run a review once a data source is connected. The workspace will show real records here - nothing is estimated."
        />
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
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      {aiNotice && (
        <AiLimitBanner
          text={aiNotice}
          onUpgrade={() => requestUpgrade()}
          onClose={() => setAiNotice(null)}
        />
      )}
      {/* greeting + quick actions */}
      <div className="flex items-center gap-3 border-b border-line bg-surface px-4 pb-3 pt-4">
        <div className="min-w-0">
          <h1 className="truncate text-[18px] font-medium tracking-tight text-fg">Overview</h1>
          <p className="mt-0.5 text-[12px] text-muted">
            {atRisk.length > 0
              ? `${atRisk.length} contracts at risk · ${renewals.length} renewals tracked.`
              : "No contracts currently require attention."}
          </p>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <button onClick={() => setAdvisorOpen(true)} className="toolbar-btn active" aria-label="Open AI">
            Ask AI
          </button>
          <Link href="/upload" className="toolbar-btn">
            <Upload size={13} />
            New upload
          </Link>
          <Link href="/audit" className="toolbar-btn">
            <FileScan size={13} />
            Run review
          </Link>
        </div>
      </div>

      {/* KPI strip - numbers count up from 0 on load (Apple-style) */}
      <KpiStrip>
        <KpiBlock label="Contracts" value={stats?.contractsMonitored ?? contracts.length} sub="Analyzed documents" count={stats?.contractsMonitored ?? contracts.length} />
        {!renewalsLocked && (
          <KpiBlock
            label="Upcoming renewals"
            value={stats?.upcomingRenewals ?? 0}
            sub="Within 90 days"
            accent={(stats?.upcomingRenewals ?? 0) > 0 ? "text-zinc-100" : "text-fg"}
            count={(stats?.upcomingRenewals ?? 0)}
          />
        )}
        {!riskLocked && (
          <KpiBlock
            label="High risk"
            value={stats?.highRiskContracts ?? 0}
            sub="Score ≥ 60"
            accent={(stats?.highRiskContracts ?? 0) > 0 ? "text-zinc-100" : "text-fg"}
            count={(stats?.highRiskContracts ?? 0)}
          />
        )}
        {!renewalsLocked && (
          <KpiBlock
            label="Auto-renewals"
            value={stats?.autoRenewals ?? 0}
            sub="No action = renewed"
            count={(stats?.autoRenewals ?? 0)}
          />
        )}
        {!riskLocked && (
          <KpiBlock
            label="Price escalations"
            value={stats?.priceEscalations ?? 0}
            sub="Fixed % increases"
            count={(stats?.priceEscalations ?? 0)}
          />
        )}
        {!renewalsLocked && (
          <KpiBlock
            label="Cancellation opportunities"
            value={stats?.cancellationOpportunities ?? 0}
            sub="In window · auto-renew"
            accent={(stats?.cancellationOpportunities ?? 0) > 0 ? "text-zinc-100" : "text-fg"}
            count={(stats?.cancellationOpportunities ?? 0)}
          />
        )}
        {!savingsLocked && (
          <KpiBlock
            label="Savings potential"
            value={`${money(totalOpportunityLow)}–${money(totalOpportunityHigh)}`}
            sub="Estimated range /yr"
          />
        )}
        <KpiBlock label="Annual spend" value={money(totalSpend)} sub="Sum of stated values" count={totalSpend} countFormat={(v) => money(v)} />
      </KpiStrip>

      {/* row: analytics charts */}
      <div className="grid grid-cols-12 border-b border-line">
        <Panel
          title="Annual spend by vendor"
          sub="Stated contract values"
          className="col-span-5 border-r border-line"
          bodyClass="overflow-y-auto px-4 py-3"
        >
          {spendByCompany.some((d) => d.value > 0) ? (
            <BarChart
              data={spendByCompany}
              height={200}
              color="#e4e4e7"
              format={(v) => money(v)}
            />
          ) : (
            <PanelEmpty
              title="No stated values"
              body="Contract amounts appear here once documents contain stated fees."
            />
          )}
        </Panel>

        {renewalsLocked ? (
          <Panel title="Renewal exposure" sub="included with Team" className="col-span-3 border-r border-line" bodyClass="flex items-center justify-center px-4 py-3">
            <p className="text-[12px] text-zinc-600">Renewal tracking is included with the Team plan.</p>
          </Panel>
        ) : (
          <Panel
            title="Renewal exposure"
            sub="Contract value by horizon"
            className="col-span-3 border-r border-line"
            bodyClass="overflow-y-auto px-4 py-3"
          >
            {exposureBuckets.some((d) => d.value > 0) ? (
              <BarChart
                data={exposureBuckets}
                height={200}
                color="#a1a1aa"
                format={(v) => money(v)}
              />
            ) : (
              <PanelEmpty
                title="No renewal dates"
                body="Renewal dates appear here once extracted from your contracts."
              />
            )}
          </Panel>
        )}

        {riskLocked ? (
          <Panel title="Risk distribution" sub="included with Team" className="col-span-4" bodyClass="flex items-center justify-center px-4 py-3">
            <p className="text-[12px] text-zinc-600">Risk scoring is included with the Team plan.</p>
          </Panel>
        ) : (
          <Panel title="Risk distribution" sub="By contract count" className="col-span-4" bodyClass="px-4 py-3">
            <div className="flex items-center gap-5">
              <DonutChart
                data={riskDist}
                size={150}
                thickness={14}
                centerValue={String(contracts.length)}
                centerLabel="contracts"
              />
              <div className="min-w-0 flex-1 space-y-1.5">
                {riskDist.map((r) => (
                  <div key={r.name} className="flex items-center gap-2 text-[11.5px]">
                    <span className="h-2 w-2 shrink-0" style={{ background: r.color }} />
                    <span className="text-muted">{r.name}</span>
                    <span className="ml-auto tabular-nums text-fg">{r.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </Panel>
        )}
      </div>

      {/* row: renewals + status + financial exposure */}
      <div className="grid grid-cols-12 border-b border-line">
        {renewalsLocked ? (
          <Panel title="Upcoming renewals" sub="included with Team" className="col-span-4 border-r border-line" bodyClass="flex items-center justify-center px-4 py-3">
            <p className="text-[12px] text-zinc-600">Renewal tracking is included with the Team plan.</p>
          </Panel>
        ) : (
          <Panel
            title="Upcoming renewals"
            sub={`${renewals.length} with dates`}
            className="col-span-4 border-r border-line"
            bodyClass="overflow-y-auto"
          >
            {renewals.slice(0, 7).map((c) => {
              const days = daysUntil(c.renewalDate, now);
              return (
                <button
                  key={c.id}
                  onClick={() => setSelected(c)}
                  className="flex w-full items-center gap-3 border-b border-line/50 px-4 py-2 text-left transition-colors hover:bg-white/[0.03]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-medium text-fg">{c.vendorName}</p>
                    <p className="truncate text-[10.5px] text-muted">
                      Renews {formatDate(c.renewalDate)} · cancel by {formatDate(c.cancellationDeadline)}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-[12px] font-semibold tabular-nums ${
                      days < 30 ? "text-zinc-100" : days < 60 ? "text-zinc-300" : "text-muted"
                    }`}
                  >
                    {days}d
                  </span>
                  <ChevronRight size={12} className="shrink-0 text-zinc-600" />
                </button>
              );
            })
            }
            {renewals.length === 0 && <PanelEmpty title="No renewal dates extracted" />}
          </Panel>
        )}

        <Panel
          title="Contracts by status"
          sub="Current state"
          className="col-span-4 border-r border-line"
          bodyClass="overflow-y-auto px-4 py-3"
        >
          {statusDist.some((d) => d.value > 0) ? (
            <BarChart
              data={statusDist}
              height={200}
              color="#71717a"
              format={(v) => `${v} contract${v === 1 ? "" : "s"}`}
            />
          ) : (
            <PanelEmpty title="No contracts" />
          )}
        </Panel>

        <Panel title="Financial exposure" sub="From stated values" className="col-span-4" bodyClass="px-4 py-1">
          <div className="grid grid-cols-2">
            <KpiBlock label="Annual spend" value={money(totalSpend)} sub="All contracts" count={totalSpend} countFormat={(v) => money(v)} />
            {!renewalsLocked && (
              <KpiBlock
                label="Renewal exposure"
                value={money(renewalExposure)}
                sub="Renewing within 90 days"
                accent={renewalExposure > 0 ? "text-zinc-100" : "text-fg"}
                count={renewalExposure}
                countFormat={(v) => money(v)}
              />
            )}
            {!riskLocked && (
              <KpiBlock label="High risk" value={atRisk.length} sub="Score ≥ 60" count={atRisk.length} />
            )}
            {!savingsLocked && (
              <KpiBlock
                label="Savings potential"
                value={`${money(totalOpportunityLow)}–${money(totalOpportunityHigh)}`}
                sub="Estimated range /yr"
              />
            )}
          </div>
        </Panel>
      </div>

      {/* row: companies table + risk watch */}
      <div className="grid grid-cols-12 border-b border-line">
        <Panel
          title="Vendors"
          sub={`${contracts.length} tracked · by annual spend`}
          className="col-span-8 border-r border-line"
          right={
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="toolbar-input h-7 w-44"
            />
          }
          bodyClass="overflow-auto"
        >
          <table className="ptable">
            <thead>
              <tr>
                <Th label="Vendor" sort={sort} onSort={(k) => setSort(toggleSort(sort, k))} />
                <Th label="Category" />
                <Th label="Spend" align="right" sort={sort} onSort={(k) => setSort(toggleSort(sort, k))} />
                <Th label="Next renewal" />
                <Th label="Risk" />
                <Th label="Status" />
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((c) => (
                <tr key={c.id} onClick={() => setSelected(c)} className="cursor-pointer">
                  <td>
                    <VendorCell name={c.vendorName} sub={c.linkedDocument} />
                  </td>
                  <td className="text-muted">{c.category}</td>
                  <td className="text-right font-medium tabular-nums">
                    {c.annualSpend > 0 ? money(c.annualSpend) : <span className="text-zinc-600">—</span>}
                  </td>
                  <td className="text-fg">{formatDate(c.renewalDate || null)}</td>
                  <td>
                    <RiskChip level={riskLevel(c.riskScore)} />
                  </td>
                  <td>
                    <StatusChip status={c.status} />
                  </td>
                </tr>
              ))}
              {sortedRows.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <PanelEmpty title="No vendors match" />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Panel>

        {riskLocked ? (
          <Panel title="Risk watch" sub="included with Team" className="col-span-4" bodyClass="flex items-center justify-center px-4 py-3">
            <p className="text-[12px] text-zinc-600">Risk monitoring is included with the Team plan.</p>
          </Panel>
        ) : (
          <Panel
            title="Risk watch"
            sub={`${atRisk.length} elevated`}
            className="col-span-4"
            bodyClass="overflow-y-auto"
          >
            {atRisk.slice(0, 8).map((c) => (
              <button
                key={c.id}
                onClick={() => setSelected(c)}
                className="flex w-full items-center gap-3 border-b border-line/50 px-4 py-2 text-left transition-colors hover:bg-white/[0.03]"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-medium text-fg">{c.vendorName}</p>
                  <p className="truncate text-[10.5px] text-muted">
                    {c.autoRenew ? "Auto-renews" : "Manual renewal"}
                    {c.cancellationDeadline
                      ? ` · cancel by ${formatDate(c.cancellationDeadline)}`
                      : ""}
                  </p>
                </div>
                <span className="shrink-0 text-[11px] font-semibold tabular-nums text-zinc-100">
                  {c.riskScore}
                </span>
              </button>
            ))}
            {atRisk.length === 0 && <PanelEmpty title="No elevated risks" />}
          </Panel>
        )}
      </div>

      {/* row: activity + correspondence */}
      <div className="grid grid-cols-12">
        <Panel title="Recent activity" className="col-span-6 border-r border-line" bodyClass="overflow-y-auto">
          {activity.slice(0, 7).map((a) => {
            const Icon = ACT_ICON[a.type] ?? Bell;
            return (
              <div key={a.id} className="flex items-start gap-3 border-b border-line/50 px-4 py-2.5">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-white/[0.05] text-zinc-400">
                  <Icon size={12} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-medium text-fg">{a.title}</p>
                  <p className="line-clamp-1 text-[11.5px] text-muted">{a.detail}</p>
                </div>
                <span className="shrink-0 text-[10.5px] text-muted/60">{timeAgo(a.createdAt)}</span>
              </div>
            );
          })}
          {activity.length === 0 && (
            <PanelEmpty title="No activity yet" body="Actions you take in the workspace will appear here." />
          )}
        </Panel>

        <Panel title="Correspondence" sub={`${threads.length} vendor threads`} className="col-span-6" bodyClass="overflow-y-auto">
          {threads.slice(0, 7).map((t) => (
            <div key={t.id} className="flex items-start gap-3 border-b border-line/50 px-4 py-2.5">
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-white/[0.05] text-zinc-400">
                <Mail size={12} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-medium text-fg">{t.subject}</p>
                <p className="line-clamp-1 text-[11.5px] text-muted">
                  {t.sender} · {t.vendorName}
                </p>
              </div>
              <span className="shrink-0 text-[10.5px] text-muted/60">{timeAgo(t.date)}</span>
            </div>
          ))}
          {threads.length === 0 && (
            <PanelEmpty title="No correspondence yet" body="Vendor email threads will appear once a mailbox is connected." />
          )}
        </Panel>
      </div>

      <CompanyInspector
        contract={selected}
        onClose={() => setSelected(null)}
        emails={selEmails}
        activity={selActivity}
      />

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
    </div>
  );
}

function AiLimitBanner({
  text,
  onUpgrade,
  onClose,
}: {
  text: string;
  onUpgrade: () => void;
  onClose: () => void;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-line bg-surface px-4 py-2.5">
      <p className="min-w-0 flex-1 text-[12.5px] leading-relaxed text-muted">{text}</p>
      <button
        onClick={onUpgrade}
        className="shrink-0 rounded-md bg-white px-3 py-1.5 text-[11.5px] font-semibold text-black transition-opacity hover:opacity-90"
      >
        Upgrade
      </button>
      <button
        onClick={onClose}
        aria-label="Dismiss"
        className="shrink-0 text-[14px] text-muted hover:text-fg"
      >
        ×
      </button>
    </div>
  );
}