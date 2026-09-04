"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  CircleDashed,
  ExternalLink,
  Info,
  ChevronDown,
  FileText,
  Search,
  Mail,
  BadgeCheck,
  Wrench,
  Copy,
  ThumbsUp,
  ThumbsDown,
  CheckCheck,
} from "lucide-react";

import {
  type AgentApprovalRequest,
  type AgentClauseFinding,
  type AgentContractAnalysis,
  type AgentTask,
} from "@/lib/agentTask";
import type { ContractRecord } from "@/lib/types";
import { formatTime, initials } from "@/lib/format";
import { BrowserTab } from "./browser-window";
import { Markdown } from "@/lib/markdown";

/* ------------------------------------------------------------------ */
/*  Agent chat - a conversational assistant response.                  */
/*                                                                     */
/*  Claude-style interaction quality: the response reads as natural    */
/*  content flowing through the page - no card-per-step, no robotic    */
/*  labels. The agent opens with plain prose, works through a quiet    */
/*  staged indicator (thinking -> checking -> preparing), streams the  */
/*  final answer as polished markdown, and reveals actions (copy,      */
/*  feedback) only when relevant.                                      */
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

/* ------------------------------------------------------------------ */
/*  Typewriter - reveals assistant prose a few characters at a time.  */
/* ------------------------------------------------------------------ */

const TYPEWRITER_SPEED_MS = 30;

function Typewriter({
  text,
  render,
  speedMs = TYPEWRITER_SPEED_MS,
}: {
  text: string;
  render?: (partial: string) => React.ReactNode;
  speedMs?: number;
}) {
  const [count, setCount] = useState(0);
  const [prevText, setPrevText] = useState(text);

  if (prevText !== text) {
    setPrevText(text);
    setCount(0);
  }

  useEffect(() => {
    if (!text) return;
    let n = 0;
    const id = window.setInterval(() => {
      n += 1;
      setCount(n);
      if (n >= text.length) window.clearInterval(id);
    }, speedMs);
    return () => window.clearInterval(id);
  }, [text, speedMs]);

  const partial = text.slice(0, count);
  return <>{render ? render(partial) : partial}</>;
}

/** Blinking caret shown on live narration while the agent is working. */
function Caret() {
  return (
    <span
      aria-hidden="true"
      className="ai-caret ml-0.5 inline-block h-[13px] w-[7px] translate-y-[2px] rounded-[1px] bg-zinc-500"
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
  if (task.status === "awaiting_approval") return "Preparing your draft for review";
  if (active) {
    const lastTool = [...task.events]
      .reverse()
      .find((e) => (e.type === "tool.started" || e.type === "tool.completed") && (!e.stepId || e.stepId === active.id));
    if (lastTool?.detail) return lastTool.detail;
    if (lastTool?.label) return `${active.title} — ${lastTool.label}`;
    if (active.detail) return active.detail;
    return active.title;
  }
  if (task.status === "completed") return "Done";
  if (task.status === "failed") return "I hit a problem and couldn't finish";
  return "Getting started";
}

/* ------------------------------------------------------------------ */
/*  Working indicator - staged, calm, no spinner.                     */
/* ------------------------------------------------------------------ */

const STAGE_META: { label: string; sub: string }[] = [
  { label: "Thinking", sub: "Understanding what you asked for" },
  { label: "Checking your data", sub: "Reading contracts and connected sources" },
  { label: "Preparing response", sub: "Assembling what I found" },
];

function WorkingIndicator() {
  // Three crossfading stages, keyed by time so the label animates in.
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setStage((s) => (s + 1) % STAGE_META.length), 2400);
    return () => window.clearInterval(id);
  }, []);

  const meta = STAGE_META[stage];
  return (
    <div className="mt-2.5 flex items-center gap-3" role="status" aria-live="polite">
      <span className="flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <span key={i} className="ai-dot size-1.5 rounded-full bg-zinc-400" />
        ))}
      </span>
      <div className="flex min-w-0 items-baseline gap-2">
        <span key={`label-${stage}`} className="ai-stage-in text-[12.5px] font-medium text-zinc-200">
          {meta.label}
        </span>
        <span className="hidden truncate text-[11.5px] text-zinc-500 sm:inline">
          {meta.sub}
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tool activity - ONE subtle expandable strip that streams live      */
/*  tool calls. Collapses to a quiet status line when done.            */
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
    <div className="mt-3 overflow-hidden rounded-lg border border-line bg-surface">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3.5 py-2 text-left"
      >
        <span className={`size-1.5 shrink-0 rounded-full ${anyActive ? "animate-pulse bg-zinc-300" : "bg-zinc-600"}`} />
        <span className="min-w-0 flex-1 truncate text-[12.5px] text-zinc-300">
          {currentActivity(task)}
        </span>
        <ChevronDown
          size={13}
          className={`shrink-0 text-zinc-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <div className="ai-expand" data-open={open}>
        <div>
          <div className="divide-y divide-line/40 border-t border-line/60">
            {views.map((v, i) => (
              <div
                key={i}
                className={`flex items-start gap-2.5 px-3.5 py-2 transition-opacity duration-200 ${
                  v.status === "running" ? "" : "opacity-60"
                }`}
              >
                <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center">
                  {v.status === "running" ? (
                    <span className="size-1.5 animate-pulse rounded-full bg-zinc-300" />
                  ) : v.status === "done" ? (
                    <CheckCheck size={12} className="text-zinc-500" />
                  ) : (
                    <CircleDashed size={12} className="text-zinc-300" />
                  )}
                </span>
                <span className="flex size-5 shrink-0 items-center justify-center rounded bg-white/[0.05] text-zinc-500">
                  {toolIconEl(v.tool, 10)}
                </span>
                <div className="min-w-0 flex-1">
                  <span className={`text-[12px] font-medium ${v.status === "failed" ? "text-zinc-300" : "text-zinc-200"}`}>
                    {v.detail || v.label}
                  </span>
                  {v.status === "running" && <p className="mt-0.5 text-[11px] text-zinc-500">Working on this…</p>}
                  {v.status !== "running" && v.outcome && (
                    <p className="mt-0.5 text-[11.5px] leading-relaxed text-zinc-400">{v.outcome}</p>
                  )}
                </div>
                {!anyActive && (
                  <span className="shrink-0 text-[10px] tabular-nums text-zinc-600">{formatTime(v.at)}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
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
    <div className="mt-3 overflow-hidden rounded-lg border border-line bg-surface">
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
    <div className="ai-stage-in mt-4 overflow-hidden rounded-lg border border-white/15 bg-surface">
      <div className="px-3.5 py-3">
        <p className="text-[13px] font-medium text-fg">
          I&apos;ve drafted a {approval.actionType.replace("_", " ")} notice for {approval.vendorName}.
        </p>
        <p className="mt-1 text-[13px] leading-relaxed text-zinc-400">{approval.subject}</p>
        <details className="group">
          <summary className="mt-1.5 inline-flex cursor-pointer list-none items-center gap-1 text-[12px] font-medium text-zinc-400 transition-colors hover:text-zinc-200">
            Review the draft
            <ChevronDown size={12} className="transition-transform duration-200 group-open:rotate-180" />
          </summary>
          <div className="mt-2 overflow-hidden rounded-lg border border-line bg-[#0a0a0e] p-3">
            <p className="text-[10.5px] tracking-[-0.01em] text-zinc-600">
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
            className="flex h-8 items-center gap-1.5 rounded-lg bg-white px-3.5 text-[12.5px] font-semibold text-black transition-opacity hover:opacity-90"
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
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Subtle actions - copy + feedback, revealed on hover/focus.         */
/* ------------------------------------------------------------------ */

function ResponseActions({ task }: { task: AgentTask }) {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
  const text = task.result ?? "";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  };

  if (task.status !== "completed" || !text) return null;

  return (
    <div className="ai-hover-actions mt-3 flex items-center gap-0.5">
      <button
        onClick={copy}
        className="flex h-6 items-center gap-1.5 rounded-md px-1.5 text-[11px] text-zinc-500 transition-colors hover:bg-white/[0.05] hover:text-zinc-300"
      >
        {copied ? <Check size={11} className="text-zinc-300" /> : <Copy size={11} />}
        {copied ? "Copied" : "Copy"}
      </button>
      <span className="mx-1 h-3 w-px bg-line" aria-hidden="true" />
      <button
        onClick={() => setFeedback(feedback === "up" ? null : "up")}
        aria-label="Helpful"
        title="Helpful"
        className={`flex size-6 items-center justify-center rounded-md transition-colors hover:bg-white/[0.05] ${
          feedback === "up" ? "text-zinc-200" : "text-zinc-500 hover:text-zinc-300"
        }`}
      >
        <ThumbsUp size={11} />
      </button>
      <button
        onClick={() => setFeedback(feedback === "down" ? null : "down")}
        aria-label="Not helpful"
        title="Not helpful"
        className={`flex size-6 items-center justify-center rounded-md transition-colors hover:bg-white/[0.05] ${
          feedback === "down" ? "text-zinc-200" : "text-zinc-500 hover:text-zinc-300"
        }`}
      >
        <ThumbsDown size={11} />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Final summary - plain conversational result, rendered as markdown. */
/* ------------------------------------------------------------------ */

function FinalSummary({ task }: { task: AgentTask }) {
  if (!task.result) return null;
  if (task.status === "cancelled") {
    return (
      <p className="mt-4 flex items-start gap-2 text-[13.5px] leading-relaxed text-zinc-400">
        <CircleDashed size={15} className="mt-0.5 shrink-0 text-zinc-500" />
        <span>No worries — I stopped there and didn&apos;t change anything. Let me know if you&apos;d like the draft adjusted.</span>
      </p>
    );
  }
  if (task.status === "failed") {
    return (
      <p className="mt-4 flex items-start gap-2 text-[13.5px] leading-relaxed text-zinc-400">
        <CircleDashed size={15} className="mt-0.5 shrink-0 text-zinc-300" />
        <span>{task.error || "I ran into a problem and couldn't finish."} You can re-run the task anytime.</span>
      </p>
    );
  }
  return (
    <div className="ai-msg-in mt-4">
      <Markdown text={task.result} />
      <p className="mt-3 text-[12.5px] text-zinc-500">Let me know if you&apos;d like me to take any next step.</p>
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
    <div className="mx-auto flex w-full max-w-[var(--ai-msg-maxw)] flex-col px-4 pb-4 pt-6 sm:px-6">
      {/* USER message - quiet pill, right aligned */}
      <div className="ai-msg-in flex justify-end">
        <div className="max-w-[80%] rounded-xl rounded-br-sm border border-line bg-white/[0.06] px-4 py-2.5">
          <p className="text-[14px] leading-relaxed text-fg">{task.request}</p>
        </div>
      </div>

      {/* AGENT response - natural content flow, no card */}
      <div className="ai-msg-in mt-7 flex flex-col">
        {/* identity row */}
        <div className="flex items-center gap-2.5">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.08] text-[10px] font-semibold text-zinc-200">
            {initials("n4ma AI")}
          </span>
          <span className="text-[13px] font-medium text-zinc-100">n4ma AI</span>
          {running && (
            <span className="flex items-center gap-1.5 text-[12px] text-zinc-500">
              <span className="size-1.5 animate-pulse rounded-full bg-zinc-400" />
              working
            </span>
          )}
        </div>

        {/* the response */}
        <div className="mt-2.5">
          <p className="text-[14.5px] leading-[1.7] text-zinc-300">
            <Typewriter text={conversationOpener(task)} />
            {running && <Caret />}
          </p>

          {running && <WorkingIndicator />}

          {/* compact live activity */}
          <ActivityStrip task={task} />

          {/* what I found (natural recap from the referenced contract) */}
          {recap && !running && task.status !== "failed" && task.status !== "cancelled" && (
            <div className="ai-msg-in mt-4">
              <Markdown text={recap} />
            </div>
          )}

          {/* real clause findings */}
          {ref && !running && <ClauseFindings contract={ref} findings={clausesFor(ref)} onOpenRecord={onOpenRecord} />}

          {/* approval gate */}
          {pending && (
            <ApprovalGate approval={pending} onApprove={() => onApprove(pending)} onDeny={() => onDeny(pending)} />
          )}
          {!pending && grantedApproval && (
            <p className="ai-msg-in mt-4 flex items-start gap-2 text-[13.5px] leading-relaxed text-zinc-400">
              <Check size={15} className="mt-0.5 shrink-0 text-zinc-500" />
              <span>Thanks — approved. Moving on to deliver this now.</span>
            </p>
          )}
          {!pending && deniedApproval && (
            <p className="ai-msg-in mt-4 flex items-start gap-2 text-[13.5px] leading-relaxed text-zinc-400">
              <CircleDashed size={15} className="mt-0.5 shrink-0 text-zinc-500" />
              <span>Understood — I&apos;ll stop here and leave everything as it is.</span>
            </p>
          )}

          {/* result / failure */}
          <FinalSummary task={task} />

          {/* subtle actions - copy + feedback */}
          <ResponseActions task={task} />
        </div>
      </div>
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