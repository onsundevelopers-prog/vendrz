"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Loader2,
  ShieldAlert,
  CircleDashed,
  ExternalLink,
  Info,
  ChevronDown,
  FileText,
  Search,
  Mail,
  BadgeCheck,
  Wrench,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  type AgentApprovalRequest,
  type AgentClauseFinding,
  type AgentContractAnalysis,
  type AgentEvent,
  type AgentTask,
} from "@/lib/agentTask";
import type { ContractRecord } from "@/lib/types";
import { formatTime, initials } from "@/lib/format";
import { BrowserTab } from "./browser-window";

/* ------------------------------------------------------------------ */
/*  Agent chat - a conversational assistant response.                  */
/*                                                                     */
/*  Modeled on the reference assistant chat: the agent opens with      */
/*  plain prose ("I'll check your contracts for upcoming renewals…"),  */
/*  works through a single subtle activity strip that streams the      */
/*  real tool calls as they happen, then closes with a conversational   */
/*  summary. No card-per-step, no robotic system labels, no fake       */
/*  progress. Everything is the assistant talking about real work.     */
/* ------------------------------------------------------------------ */

const TOOL_ICONS: Record<string, typeof Wrench> = {
  search_gmail: Mail,
  search_email_threads: Mail,
  open_document: FileText,
  get_contract: FileText,
  find_vendor: Search,
  search_contracts: Search,
  verify_result: BadgeCheck,
};

function toolIconEl(name: string, size: number) {
  const Icon = TOOL_ICONS[name] ?? Wrench;
  return <Icon size={size} />;
}

/** Blinking caret shown on live narration while the agent is working. */
function Caret() {
  return (
    <motion.span
      aria-hidden="true"
      initial={{ opacity: 1 }}
      animate={{ opacity: [1, 0, 1] }}
      transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
      className="ml-0.5 inline-block h-[13px] w-[7px] translate-y-[2px] rounded-[1px] bg-zinc-500"
    />
  );
}

/** A natural-language opening line for each kind of job. */
function conversationOpener(task: AgentTask): string {
  switch (task.plan.intent) {
    case "cancel":
      return "I'll find the matching contract, open it, and read the cancellation terms so I can confirm your deadline and what notice is required. Then I'll prepare the cancellation notice for you to review — I won't send anything until you approve it.";
    case "renewals":
      return "I'll go through your contracts and pull every renewal date that's coming up, along with how much renewal spend that exposes.";
    case "risk":
      return "I'll score your contracts by risk and rank the vendors that need attention.";
    case "savings":
      return "I'll look across the register for places we could reasonably spend less.";
    case "portfolio":
      return "I'll summarise the whole portfolio from your stored records.";
    case "documents":
      return "I'll open the stored agreement and read what its clauses actually say.";
    case "compare":
      return "I'll pull both records and compare their terms side by side.";
    case "emails":
      return "I'll search the mailbox for vendor correspondence and summarise what's actually there.";
    case "email_draft":
      return "I'll search the mailbox for recent correspondence, then draft a reply for you to review — nothing is sent until you approve it.";
    default:
      return "I'll work through your contracts and pull together what you've asked for.";
  }
}

/** Turn the live steps/events into a natural-prose progress line. */
function currentActivity(task: AgentTask): string {
  const active = task.plan.steps.find(
    (s) => s.status === "running" || s.status === "requires_approval"
  );
  if (task.status === "awaiting_approval") return "I've prepared what you asked for — waiting on your review before I continue.";
  if (active) {
    const lastTool = [...task.events]
      .reverse()
      .find((e) => (e.type === "tool.started" || e.type === "tool.completed") && (!e.stepId || e.stepId === active.id));
    if (lastTool?.detail) return lastTool.detail;
    if (lastTool?.label) return `${active.title} — ${lastTool.label}`;
    if (active.detail) return active.detail;
    return active.title;
  }
  if (task.status === "completed") return "Done.";
  if (task.status === "failed") return "I hit a problem and couldn't finish.";
  return "Getting started.";
}

/* ------------------------------------------------------------------ */
/*  Tool activity - ONE subtle strip that streams live tool calls.     */
/* ------------------------------------------------------------------ */

interface ToolView {
  tool: string;
  label: string;
  detail: string;
  status: "running" | "done" | "failed";
  outcome?: string;
  at: string;
}

function toolViewsFor(task: AgentTask): ToolView[] {
  const map = new Map<string, ToolView>();
  for (const e of task.events) {
    const key = `${e.stepId ?? ""}:${e.tool ?? "tool"}`;
    if (e.type === "tool.started") {
      map.set(key, {
        tool: e.tool ?? "tool",
        label: e.label ?? e.tool ?? "tool",
        detail: e.detail ?? "",
        status: "running",
        at: e.at,
      });
    } else if (e.type === "tool.completed" || e.type === "tool.failed") {
      const cur = map.get(key);
      map.set(key, {
        tool: e.tool ?? "tool",
        label: cur?.label ?? e.tool ?? "tool",
        detail: cur?.detail ?? "",
        status: e.type === "tool.completed" ? "done" : "failed",
        outcome: e.detail ?? "",
        at: e.at,
      });
    }
  }
  return [...map.values()];
}

/** Compact, single-row activity. Auto-opens while work is live. */
function ActivityStrip({ task }: { task: AgentTask }) {
  const views = toolViewsFor(task);
  const running = task.status === "running" || task.status === "awaiting_approval";
  const [open, setOpen] = useState(true);
  const anyActive = running && views.some((v) => v.status === "running");

  if (views.length === 0) return null;

  return (
    <div className="mt-2 overflow-hidden rounded-xl border border-line bg-surface">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left"
      >
        {anyActive ? (
          <Loader2 size={13} className="shrink-0 animate-spin text-zinc-400" />
        ) : (
          <Check size={13} className="shrink-0 text-zinc-500" />
        )}
        <span className="min-w-0 flex-1 truncate text-[12.5px] text-zinc-300">
          {currentActivity(task)}
        </span>
        <ChevronDown
          size={13}
          className={`shrink-0 text-zinc-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <motion.div
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
              className="divide-y divide-line/40 border-t border-line/60"
            >
              {views.map((v, i) => (
                  <motion.div
                    key={i}
                    variants={{ hidden: { opacity: 0, y: 4 }, show: { opacity: 1, y: 0, transition: { duration: 0.16, ease: "easeOut" } } }}
                    className={`flex items-start gap-2.5 px-3.5 py-2 transition-opacity duration-200 ${v.status === "running" ? "" : "opacity-60"}`}
                  >
                    <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center">
                      {v.status === "running" ? (
                        <Loader2 size={12} className="animate-spin text-zinc-300" />
                      ) : v.status === "done" ? (
                        <Check size={12} className="text-zinc-500" />
                      ) : (
                        <ShieldAlert size={12} className="text-zinc-300" />
                      )}
                    </span>
                    <span className="flex size-5 shrink-0 items-center justify-center rounded bg-white/[0.05] text-zinc-500">
                      {toolIconEl(v.tool, 10)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className={`text-[12px] font-medium ${v.status === "failed" ? "text-zinc-300" : v.status === "running" ? "text-zinc-100" : "text-zinc-300"}`}>
                          {v.detail || v.label}
                        </span>
                      </div>
                      {v.status === "running" && (
                        <p className="mt-0.5 text-[11px] text-zinc-500">Working on this…</p>
                      )}
                      {v.status === "done" && v.outcome && (
                        <p className="mt-0.5 text-[11.5px] leading-relaxed text-zinc-400">{v.outcome}</p>
                      )}
                      {v.status === "failed" && v.outcome && (
                        <p className="mt-0.5 text-[11.5px] leading-relaxed text-zinc-300/80">{v.outcome}</p>
                      )}
                    </div>
                    {!anyActive && (
                      <span className="shrink-0 text-[10px] tabular-nums text-zinc-600">{formatTime(v.at)}</span>
                    )}
                  </motion.div>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Clause findings - real document evidence, written naturally.       */
/* ------------------------------------------------------------------ */

function ClauseFindings({
  contract,
  findings,
  onOpenRecord,
}: {
  contract: ContractRecord;
  findings: AgentClauseFinding[];
  onOpenRecord: (tab: BrowserTab) => void;
}) {
  if (findings.length === 0) return null;
  return (
    <div className="mt-2 overflow-hidden rounded-xl border border-line bg-surface">
      <div className="flex items-center gap-2 border-b border-line/60 px-3.5 py-2">
        <FileText size={12} className="text-zinc-500" />
        <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-zinc-200">
          What the agreement actually says
        </span>
        <button
          onClick={() =>
            onOpenRecord({
              key: `clauses-${contract.id}`,
              title: `${contract.vendorName} · clauses`,
              url: "vendrz://clauses",
              contract,
              clauses: findings,
            })
          }
          className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-zinc-400 transition-colors hover:text-fg"
        >
          <ExternalLink size={10} />
          Open
        </button>
      </div>
      <div className="divide-y divide-line/40">
        {findings.slice(0, 4).map((f, i) => (
          <div key={i} className="flex items-start gap-2.5 px-3.5 py-2">
            <span
              className={`mt-1 size-1.5 shrink-0 rounded-full ${
                f.severity === "critical" ? "bg-zinc-300" : f.severity === "warning" ? "bg-zinc-400" : "bg-zinc-600"
              }`}
            />
            <div className="min-w-0">
              <p className="text-[12px] font-medium text-zinc-200">{f.title}</p>
              <p className="mt-0.5 text-[11.5px] leading-relaxed text-zinc-400">{f.detail}</p>
              {f.evidence?.section && (
                <p className="mt-0.5 text-[10.5px] text-zinc-600">
                  § {f.evidence.section}
                  {f.evidence.page ? ` · p.${f.evidence.page}` : ""}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Approval gate - a clean action row in the conversation.           */
/* ------------------------------------------------------------------ */

function ApprovalGate({
  approval,
  onApprove,
  onDeny,
}: {
  approval: AgentApprovalRequest;
  onApprove: () => void;
  onDeny: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="mt-3 overflow-hidden rounded-xl border border-white/15 bg-surface"
    >
      <div className="px-3.5 py-2.5">
        <p className="text-[12.5px] font-medium text-fg">
          I&apos;ve drafted a {approval.actionType.replace("_", " ")} notice for {approval.vendorName}.
        </p>
        <p className="mt-1 text-[12.5px] leading-relaxed text-zinc-400">
          {/* Keep punctuation clean - no bolded system code, just a normal sentence. */}
          {approval.subject}
        </p>
        <details className="group">
          <summary className="mt-1.5 inline-flex cursor-pointer list-none items-center gap-1 text-[12px] font-medium text-zinc-400 transition-colors hover:text-zinc-200">
            Review the draft
            <ChevronDown size={12} className="transition-transform duration-200 group-open:rotate-180" />
          </summary>
          <div className="mt-2 overflow-hidden rounded-lg border border-line bg-[#0a0a0e] p-3">
            <p className="text-[10.5px] uppercase tracking-[0.06em] text-zinc-600">
              To · {approval.to || "address not on file"}
            </p>
            <p className="mt-1 text-[13px] font-medium text-zinc-100">{approval.subject}</p>
            <pre className="mt-2 whitespace-pre-wrap font-sans text-[12.5px] leading-relaxed text-zinc-300">
              {approval.body}
            </pre>
          </div>
        </details>
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={onApprove}
            className="flex h-8 items-center gap-1.5 rounded-lg bg-white px-3.5 text-[12.5px] font-semibold text-black transition-colors hover:opacity-90"
          >
            <Check size={13} />
            Approve
          </button>
          <button
            onClick={onDeny}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-line px-3.5 text-[12.5px] font-medium text-zinc-400 transition-colors hover:border-white/25 hover:text-fg"
          >
            Not this
          </button>
        </div>
        {approval.requiresGmail && (
          <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-zinc-500">
            <Info size={12} className="mt-0.5 shrink-0" />
            Gmail isn&apos;t connected here, so approving prepares the draft — nothing is sent until a connected inbox delivers it.
          </p>
        )}
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Final summary - plain conversational result.                       */
/* ------------------------------------------------------------------ */

function renderInline(text: string): React.ReactNode {
  return text.split(/\*\*(.+?)\*\*/g).map((part, j) =>
    j % 2 === 1 ? (
      <strong key={j} className="font-medium text-zinc-100">
        {part}
      </strong>
    ) : (
      <span key={j}>{part}</span>
    )
  );
}

function FinalSummary({ task }: { task: AgentTask }) {
  if (!task.result) return null;
  if (task.status === "cancelled") {
    return (
      <p className="mt-4 flex items-start gap-2 text-[13px] leading-relaxed text-zinc-400">
        <CircleDashed size={15} className="mt-0.5 shrink-0 text-zinc-500" />
        <span>No worries — I stopped there and didn&apos;t change anything. Let me know if you&apos;d like the draft adjusted.</span>
      </p>
    );
  }
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4">
      {task.status === "failed" ? (
        <p className="flex items-start gap-2 text-[13px] leading-relaxed text-zinc-400">
          <ShieldAlert size={15} className="mt-0.5 shrink-0 text-zinc-300" />
          <span>
            {task.error || "I ran into a problem and couldn't finish."} You can re-run the task anytime.
          </span>
        </p>
      ) : (
        <div className="rounded-xl border border-line/70 bg-surface px-4 py-3">
          <p className="text-[13.5px] leading-relaxed text-zinc-200">{renderInline(task.result)}</p>
          <p className="mt-2 text-[11.5px] text-zinc-500">Let me know if you&apos;d like me to take any next step.</p>
        </div>
      )}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Phase strip - a quiet one-line indicator (not a system bar).       */
/* ------------------------------------------------------------------ */
/*  Execution log (collapsible developer view).                        */
/* ------------------------------------------------------------------ */

function eventLabel(type: AgentEvent["type"]): string {
  const m: Record<string, string> = {
    "task.created": "Task created",
    "task.started": "Task started",
    "plan.created": "Plan created",
    "step.started": "Step started",
    "step.completed": "Step completed",
    "step.failed": "Step failed",
    "approval.required": "Approval required",
    "approval.granted": "Approval granted",
    "approval.denied": "Approval denied",
    "tool.started": "Tool started",
    "tool.completed": "Tool completed",
    "tool.failed": "Tool failed",
    "task.completed": "Task completed",
    "task.failed": "Task failed",
    "task.cancelled": "Task cancelled",
  };
  return m[type] ?? type;
}

export function AgentEventLogLight({
  task,
  open,
  onToggle,
}: {
  task: AgentTask;
  open: boolean;
  onToggle?: () => void;
}) {
  const events = [...task.events].reverse();
  const running = task.status === "running" || task.status === "awaiting_approval";
  return (
    <div className="border-t border-line/60">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-4 py-1.5 text-left"
        disabled={!onToggle}
      >
        <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-zinc-500">
          Activity log · {events.length}
        </span>
        {running && (
          <span className="flex items-center gap-1 text-[10px] text-zinc-500">
            <Loader2 size={9} className="animate-spin" /> live
          </span>
        )}
        {onToggle && (
          <span className="ml-auto text-[10px] text-zinc-600">{open ? "Hide" : "Show"}</span>
        )}
      </button>
      {(open || running) && (
        <div className="max-h-56 overflow-y-auto pb-2">
          {events.length === 0 ? (
            <p className="px-4 py-2 text-[11px] text-zinc-600">No events yet.</p>
          ) : (
            events.map((e, i) => (
              <div key={i} className="flex items-start gap-2.5 px-4 py-1">
                <span className="mt-0.5 w-12 shrink-0 text-right text-[9.5px] tabular-nums text-zinc-600">
                  {formatTime(e.at)}
                </span>
                <span className="min-w-0 flex-1 text-[11px] leading-relaxed text-zinc-400">
                  {eventLabel(e.type)}
                  {e.tool ? <span className="text-zinc-500"> · {e.tool}</span> : null}
                  {e.detail ? <span className="text-zinc-500"> — {e.detail}</span> : null}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main conversation.                                                */
/* ------------------------------------------------------------------ */

export function AgentChat({
  task,
  contracts,
  analyses,
  onOpenRecord,
  onApprove,
  onDeny,
}: {
  task: AgentTask;
  contracts: ContractRecord[];
  analyses: AgentContractAnalysis[];
  onOpenRecord: (tab: BrowserTab) => void;
  onApprove: (a: AgentApprovalRequest) => void;
  onDeny: (a: AgentApprovalRequest) => void;
}) {
  const pending = task.approvals.find((a) => a.status === "pending");
  const grantedApproval = task.approvals.find((a) => a.status === "granted");
  const deniedApproval = task.approvals.find((a) => a.status === "denied");
  const running = task.status === "running" || task.status === "awaiting_approval";
  const ref = referencedContract(task, contracts);

  // Auto-open the real document record when the agent genuinely opens one.
  const openedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    for (const e of task.events) {
      if (e.type === "tool.completed" && e.tool === "open_document" && e.stepId) {
        const key = `doc-${e.at}-${e.stepId}`;
        if (openedRef.current.has(key)) continue;
        openedRef.current.add(key);
        if (ref) {
          onOpenRecord({
            key: `doc-${e.at}`,
            title: `${ref.vendorName} · contract`,
            url: "vendrz://document",
            contract: ref,
            clauses: analyses.find((a) => a.contractId === ref.id)?.findings ?? [],
          });
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.events.length]);

  const clausesFor = (contract: ContractRecord | null): AgentClauseFinding[] =>
    contract ? analyses.find((a) => a.contractId === contract.id)?.findings ?? [] : [];

  // Natural-language "what I found" written from the real referenced contract.
  const recap = useMemo(() => {
    if (!ref) return null;
    const deadline = ref.cancellationDeadline;
    const renewal = ref.renewalDate;
    const value = ref.annualSpend;
    let s = `Found **${ref.vendorName}** — `;
    s += value ? `${fmtMoney(value)}/yr${renewal ? `, renews ${fmtDate(renewal)}` : ""}.` : renewal ? `renews ${fmtDate(renewal)}.` : "in the register.";
    if (deadline) {
      s += ` You need to act by **${fmtDate(deadline)}** to avoid committing to another term.`;
    }
    return s;
  }, [ref]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col px-4 pb-2 pt-5">
      {/* USER message - right aligned bubble */}
      <motion.div
        initial={{ opacity: 0, x: 14 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
        className="flex justify-end"
      >
        <motion.div
          whileHover={{ scale: 1.01 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="max-w-[78%] rounded-xl rounded-br-sm border border-white/10 bg-white/[0.07] px-4 py-2.5"
        >
          <p className="text-[14px] leading-relaxed text-fg">{task.request}</p>
        </motion.div>
      </motion.div>

      {/* AGENT response */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, delay: 0.04, ease: [0.22, 1, 0.36, 1] }}
        className="mt-6 flex flex-col"
      >
        {/* identity row */}
        <div className="flex items-center gap-2.5">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.08] text-[10px] font-semibold text-zinc-200">
            {initials("Noma AI")}
          </span>
          <span className="text-[13px] font-medium text-zinc-100">Noma AI</span>
          {running && (
            <span className="flex items-center gap-1.5 text-[12px] text-zinc-500">
              <Loader2 size={11} className="animate-spin" />
              working
            </span>
          )}
        </div>

        {/* the response */}
        <div className="mt-2.5">
          <p className="text-[14px] leading-[1.65] text-zinc-300">
            {conversationOpener(task)}
            {running && <Caret />}
          </p>

          {running && (
            <motion.p
              key={task.events.length}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="mt-2 text-[13.5px] leading-relaxed text-zinc-400"
            >
              Looks like a solid match — checking the details now.
            </motion.p>
          )}

          {/* compact live activity */}
          <ActivityStrip task={task} />

          {/* what I found (natural recap from the referenced contract) */}
          {recap && !running && task.status !== "failed" && task.status !== "cancelled" && (
            <p className="mt-3 text-[14px] leading-[1.65] text-zinc-300">{renderInline(recap)}</p>
          )}

          {/* real clause findings */}
          {ref && !running && <ClauseFindings contract={ref} findings={clausesFor(ref)} onOpenRecord={onOpenRecord} />}

          {/* approval gate */}
          {pending && (
            <ApprovalGate approval={pending} onApprove={() => onApprove(pending)} onDeny={() => onDeny(pending)} />
          )}
          {!pending && grantedApproval && (
            <p className="mt-3 flex items-start gap-2 text-[13px] leading-relaxed text-zinc-400">
              <Check size={15} className="mt-0.5 shrink-0 text-zinc-500" />
              <span>Thanks — approved. Moving on to deliver this now.</span>
            </p>
          )}
          {!pending && deniedApproval && (
            <p className="mt-3 flex items-start gap-2 text-[13px] leading-relaxed text-zinc-400">
              <CircleDashed size={15} className="mt-0.5 shrink-0 text-zinc-500" />
              <span>Understood — I&apos;ll stop here and leave everything as it is.</span>
            </p>
          )}

          {/* result / failure */}
          <FinalSummary task={task} />
        </div>
      </motion.div>
    </div>
  );
}

function referencedContract(task: AgentTask, contracts: ContractRecord[]): ContractRecord | null {
  if (task.evidenceIds.length > 0) {
    const found = contracts.find((c) => c.id === task.evidenceIds[0]);
    if (found) return found;
  }
  return contracts[0] ?? null;
}

function fmtMoney(n: number): string {
  return "$" + (n >= 1_000_000 ? (n / 1_000_000).toFixed(1) + "M" : n >= 1000 ? Math.round(n / 1000) + "k" : String(n));
}
function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return iso;
  }
}

export function ApprovalCardLight({
  approval,
  onApprove,
  onDeny,
}: {
  approval: AgentApprovalRequest;
  onApprove: () => void;
  onDeny: () => void;
}) {
  return <ApprovalGate approval={approval} onApprove={onApprove} onDeny={onDeny} />;
}

export function AgentEventLogLightCompat() {
  return null;
}