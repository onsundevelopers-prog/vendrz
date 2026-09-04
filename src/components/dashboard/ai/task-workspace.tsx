"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, ChevronDown, Search, X, Menu, FileText, BadgeCheck, Mail, Wrench } from "lucide-react";
import type { AgentApprovalRequest, AgentContractAnalysis, AgentEvent, AgentTask } from "@/lib/agentTask";
import type { ContractRecord } from "@/lib/types";
import { formatTime, timeAgo } from "@/lib/format";
import { AgentChat } from "./agent-chat";
import { BrowserTab, BrowserWindow } from "./browser-window";
import { ChatComposer } from "./composer";

/* ------------------------------------------------------------------ */
/*  AI chat workspace - n4ma's Claude-quality adaptation:             */
/*    - animated "Chats" sidebar (width transitions, mobile drawer)    */
/*    - center: greeting when no chat is open, else the live thread    */
/*    - docked composer (auto-growing, Enter to send)                  */
/*    - right floating record windows (real documents the agent opened)*/
/* ------------------------------------------------------------------ */

function TaskBadge({ task }: { task: AgentTask }) {
  const dot =
    task.status === "running"
      ? "animate-pulse bg-[#f4f4f5]"
      : task.status === "awaiting_approval"
        ? "bg-zinc-300"
        : task.status === "failed"
          ? "bg-zinc-300"
          : task.status === "cancelled"
            ? "bg-zinc-600"
            : "bg-zinc-500";
  return <span className={`size-1.5 shrink-0 rounded-full ${dot}`} aria-hidden="true" />;
}

function statusLabel(s: AgentTask["status"]): string {
  switch (s) {
    case "running": return "Working";
    case "awaiting_approval": return "Awaiting your review";
    case "completed": return "Completed";
    case "failed": return "Failed";
    case "cancelled": return "Not approved";
    default: return "Queued";
  }
}

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

function AgentEventLogLight({
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
        <span className="text-[10px] font-medium tracking-[-0.01em] text-zinc-500">
          Activity log · {events.length}
        </span>
        {running && (
          <span className="flex items-center gap-1 text-[10px] text-zinc-500">
            <span className="size-1 animate-pulse rounded-full bg-zinc-400" /> live
          </span>
        )}
        {onToggle && <span className="ml-auto text-[10px] text-zinc-600">{open ? "Hide" : "Show"}</span>}
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
/*  Greeting - the empty-chat state, immediately useful.               */
/* ------------------------------------------------------------------ */

const WORKFLOWS: { icon: typeof Search; label: string; prompt: string }[] = [
  { icon: Search, label: "Find upcoming renewals", prompt: "Which of my contracts renew in the next 90 days?" },
  { icon: FileText, label: "Analyze my vendors", prompt: "Give me a summary of my vendors and how much we spend with each." },
  { icon: BadgeCheck, label: "Find contracts with price increases", prompt: "Find contracts where pricing increased from the previous term." },
  { icon: Mail, label: "Check my Gmail for vendor mail", prompt: "Search my Gmail for recent vendor correspondence and summarise it." },
  { icon: Wrench, label: "Draft a renewal email", prompt: "Draft a renewal negotiation email to my biggest vendor." },
];

function Greeting({
  name,
  atCap,
  hasContracts,
  onAsk,
}: {
  name: string;
  atCap: boolean;
  hasContracts: boolean;
  onAsk: (text: string) => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center px-6">
      <div className="ai-msg-in flex w-full max-w-xl flex-col">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-500">N4MA AI</p>
        <h2 className="mt-1.5 text-[26px] font-semibold tracking-[-0.02em] text-fg">
          What should I work on, {name}?
        </h2>
        <p className="mt-2 max-w-md text-[13.5px] leading-relaxed text-zinc-500">
          I can work across your contracts, renewals and mail. Each task opens its own chat — you watch what I&apos;m doing as I go.
        </p>
      </div>

      {!hasContracts && (
        <p className="ai-msg-in mt-4 max-w-md text-center text-[11.5px] leading-relaxed text-zinc-600">
          No contracts yet — upload and analyze one, then give me a task.
        </p>
      )}

      <div className="ai-msg-in mt-8 grid w-full max-w-xl gap-2 sm:grid-cols-2">
        {WORKFLOWS.map((w) => {
          const Icon = w.icon;
          return (
            <button
              key={w.label}
              onClick={() => !atCap && onAsk(w.prompt)}
              disabled={atCap}
              className="group flex items-center gap-2.5 rounded-lg border border-line bg-surface px-3.5 py-3 text-left transition-all duration-150 hover:border-white/25 hover:bg-white/[0.04] disabled:opacity-40"
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-white/[0.06] text-zinc-400 transition-colors group-hover:text-zinc-200">
                <Icon size={13} />
              </span>
              <span className="text-[12.5px] font-medium text-zinc-300 transition-colors group-hover:text-fg">
                {w.label}
              </span>
            </button>
          );
        })}
      </div>

      <p className="ai-msg-in mt-6 text-[11px] text-zinc-600">
        Or describe anything — <span className="text-zinc-500">“What contracts can we cancel?”</span> ·{" "}
        <span className="text-zinc-500">“How much are we spending?”</span>
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Workspace shell                                                    */
/* ------------------------------------------------------------------ */

export function TaskWorkspace({
  task,
  tasks,
  contracts,
  analyses,
  gmailConnected,
  runningCount,
  atCap,
  onSelectTask,
  onSendMessage,
  onApprove,
  onDeny,
  onBack,
  userName,
}: {
  task: AgentTask | null;
  tasks: AgentTask[];
  contracts: ContractRecord[];
  analyses: AgentContractAnalysis[];
  gmailConnected: boolean;
  runningCount: number;
  atCap: boolean;
  onSelectTask: (id: string) => void;
  onSendMessage: (text: string) => void;
  onApprove: (a: AgentApprovalRequest) => void;
  onDeny: (a: AgentApprovalRequest) => void;
  onBack: () => void;
  userName: string;
}) {
  const [windows, setWindows] = useState<BrowserTab[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const followRef = useRef(true);
  const [logOpen, setLogOpen] = useState(false);
  const [asideOpen, setAsideOpen] = useState(true);
  const [mobileAside, setMobileAside] = useState(false);
  const [chatQuery, setChatQuery] = useState("");

  const openRecord = (tab: BrowserTab) => {
    setWindows((prev) => [tab, ...prev.filter((w) => w.key !== tab.key)]);
  };
  const closeRecord = (key: string) => setWindows((prev) => prev.filter((w) => w.key !== key));

  // Follow the live stream only while the user is near the bottom. If they
  // scroll up to read, we stop pulling them down; we resume when they
  // scroll back to the bottom.
  const eventCount = task?.events.length ?? 0;
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !followRef.current) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [eventCount, task?.status, task?.id]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    followRef.current = dist < 64;
  };

  const sorted = useMemo(() => [...windows].sort((a, b) => a.title.localeCompare(b.title)), [windows]);

  const q = chatQuery.trim().toLowerCase();
  const visibleTasks = useMemo(
    () =>
      q
        ? tasks.filter((t) => t.title.toLowerCase().includes(q) || t.request.toLowerCase().includes(q))
        : tasks,
    [tasks, q]
  );

  const openCount = sorted.length;
  const hasContracts = contracts.length > 0;
  const running = task?.status === "running" || task?.status === "awaiting_approval";

  const asideContent = (
    <>
      <div className="flex h-12 shrink-0 items-center justify-between px-3.5">
        <span className="truncate text-[12.5px] font-semibold tracking-[-0.01em] text-zinc-100">Chats</span>
        <div className="flex items-center gap-0.5">
          <button
            title="New chat"
            aria-label="New chat"
            onClick={() => {
              setMobileAside(false);
              onBack();
            }}
            className="flex size-6 shrink-0 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-zinc-100"
          >
            <Plus size={14} />
          </button>
          <button
            title="Close sidebar"
            aria-label="Close sidebar"
            onClick={() => {
              setAsideOpen(false);
              setMobileAside(false);
            }}
            className="flex size-6 shrink-0 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-100 md:hidden"
          >
            <X size={13} />
          </button>
        </div>
      </div>
      <div className="shrink-0 px-3 pb-1.5 pt-1">
        <label className="flex h-8 items-center gap-1.5 rounded-md border border-line bg-canvas px-2 transition-colors focus-within:border-line-strong">
          <Search size={11} className="shrink-0 text-zinc-500" />
          <input
            value={chatQuery}
            onChange={(e) => setChatQuery(e.target.value)}
            placeholder="Search chats"
            aria-label="Search chats"
            className="h-7 min-w-0 flex-1 bg-transparent text-[11.5px] text-fg outline-none placeholder:text-zinc-600"
          />
          {chatQuery && (
            <button onClick={() => setChatQuery("")} aria-label="Clear search" className="text-zinc-500 hover:text-zinc-200">
              <X size={11} />
            </button>
          )}
        </label>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {visibleTasks.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setMobileAside(false);
              onSelectTask(t.id);
            }}
            className={`mb-0.5 flex w-full flex-col rounded-md px-2 py-1.5 text-left transition-colors ${
              task?.id === t.id ? "bg-white/[0.08]" : "hover:bg-white/[0.04]"
            }`}
          >
            <span className="flex w-full items-center gap-2">
              <TaskBadge task={t} />
              <span className={`min-w-0 flex-1 truncate text-[12px] ${task?.id === t.id ? "text-zinc-100" : "text-zinc-300"}`}>
                {t.title}
              </span>
            </span>
            <span className="mt-0.5 flex w-full items-center justify-between gap-2 pl-[14px]">
              <span className="min-w-0 flex-1 truncate text-[10.5px] text-zinc-600">
                {t.request.length > 56 ? t.request.slice(0, 56) + "…" : t.request}
              </span>
              <span className="shrink-0 text-[9.5px] text-zinc-600">{shortTime(t.updatedAt)}</span>
            </span>
          </button>
        ))}
        {visibleTasks.length === 0 && (
          <p className="px-2 py-4 text-[11px] text-zinc-600">{tasks.length === 0 ? "No chats yet." : "No chats match."}</p>
        )}
      </div>
    </>
  );

  return (
    <div className="relative flex h-full min-h-0 overflow-hidden">
      {/* Mobile drawer - slides over content with a backdrop */}
      {mobileAside && (
        <div className="absolute inset-0 z-40 md:hidden" role="dialog" aria-modal="true">
          <button
            aria-label="Close chats"
            onClick={() => setMobileAside(false)}
            className="absolute inset-0 bg-black/60"
          />
          <aside className="ai-sidebar absolute inset-y-0 left-0 flex w-[264px] flex-col bg-[#101014] shadow-[16px_0_40px_rgba(0,0,0,0.5)]">
            <div className="ai-sidebar-inner flex min-h-0 flex-1 flex-col">{asideContent}</div>
          </aside>
        </div>
      )}

      {/* Desktop sidebar - animated width */}
      <aside
        className={`ai-sidebar hidden h-full shrink-0 flex-col overflow-hidden border-r border-line bg-[#101014] md:flex ${
          asideOpen ? "w-[var(--ai-sidebar-w)]" : "w-0 border-r-0"
        }`}
        aria-hidden={!asideOpen}
      >
        <div className="ai-sidebar-inner flex min-h-0 flex-1 flex-col" style={{ opacity: asideOpen ? 1 : 0, width: "var(--ai-sidebar-w)" }}>
          {asideContent}
        </div>
      </aside>

      {/* center chat */}
      <div className="flex min-w-0 flex-1 flex-col bg-canvas">
        {/* header */}
        <div className="flex h-12 shrink-0 items-center gap-2 border-b border-line px-3.5 sm:px-4">
          <button
            onClick={() => {
              if (window.innerWidth < 768) setMobileAside(true);
              else setAsideOpen((v) => !v);
            }}
            aria-label="Toggle chats"
            title="Chats"
            className="flex size-7 shrink-0 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-100"
          >
            {asideOpen ? <ChevronDown size={14} className="rotate-90" /> : <Menu size={14} />}
          </button>
          <span className="min-w-0 flex-1 truncate text-[13px] font-semibold tracking-tight text-fg">
            {task ? task.title : "AI"}
          </span>
          {task && (
            <span className="flex shrink-0 items-center gap-1.5 text-[11px] text-zinc-500">
              {running && <span className="size-1.5 animate-pulse rounded-full bg-[#f4f4f5]" aria-hidden="true" />}
              {statusLabel(task.status)}
            </span>
          )}
          {!task && contracts.length > 0 && (
            <span className="hidden shrink-0 items-center gap-1 text-[11px] text-zinc-600 md:flex">
              {contracts.length} contract{contracts.length === 1 ? "" : "s"} in scope
            </span>
          )}
        </div>

        {/* thread / greeting */}
        <div ref={scrollRef} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {task ? (
            <div key={task.id} className="ai-msg-in flex h-full flex-col">
              <div className="min-h-0 flex-1">
                <AgentChat
                  task={task}
                  contracts={contracts}
                  analyses={analyses}
                  onOpenRecord={openRecord}
                  onApprove={onApprove}
                  onDeny={onDeny}
                />
              </div>
              <AgentEventLogLight task={task} open={logOpen || running} onToggle={() => setLogOpen((v) => !v)} />
            </div>
          ) : (
            <div key="greeting" className="ai-msg-in h-full">
              <Greeting name={userName} atCap={atCap} hasContracts={hasContracts} onAsk={onSendMessage} />
            </div>
          )}
        </div>

        {/* docked composer */}
        <ChatComposer
          onSend={onSendMessage}
          onNewChat={onBack}
          placeholder={task ? "Reply, @ for context" : "Ask AI a task, @ for context"}
          runningCount={runningCount}
          atCap={atCap}
          contractCount={contracts.length}
          gmailConnected={gmailConnected}
        />
      </div>

      {/* right record windows - real documents the agent opened */}
      {hasContracts && openCount > 0 && (
        <div className="absolute bottom-16 right-4 z-20 hidden flex-col gap-3 lg:flex" style={{ maxWidth: 320 }}>
          {sorted.map((tab) => (
            <BrowserWindow key={tab.key} tab={tab} onClose={() => closeRecord(tab.key)} />
          ))}
        </div>
      )}
    </div>
  );
}

function shortTime(iso: string): string {
  try {
    return timeAgo(iso);
  } catch {
    return "";
  }
}