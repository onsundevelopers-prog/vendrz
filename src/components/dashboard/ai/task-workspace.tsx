"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, ChevronDown, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { AgentApprovalRequest, AgentContractAnalysis, AgentTask } from "@/lib/agentTask";
import type { ContractRecord } from "@/lib/types";
import { timeAgo } from "@/lib/format";
import { AgentChat, AgentEventLogLight } from "./agent-chat";
import { BrowserTab, BrowserWindow } from "./browser-window";
import { ChatComposer } from "./composer";

/* ------------------------------------------------------------------ */
/*  AI chat workspace - n4ma's dark adaptation of the reference      */
/*  chat:                                                              */
/*    - "Chats" aside (persistent history, each task = its own chat)   */
/*    - center: greeting when no chat is open, else the live thread    */
/*    - docked composer ("Reply, @ for context")                       */
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

function shortTime(iso: string): string {
  try {
    return timeAgo(iso);
  } catch {
    return "";
  }
}

function statusLabel(s: AgentTask["status"]): string {
  switch (s) {
    case "running": return "Running";
    case "awaiting_approval": return "Awaiting approval";
    case "completed": return "Completed";
    case "failed": return "Failed";
    case "cancelled": return "Not approved";
    default: return "Queued";
  }
}

/* ------------------------------------------------------------------ */
/*  Greeting - the empty-chat state                                    */
/* ------------------------------------------------------------------ */

const SUGGESTIONS = [
  "What contracts renew soon?",
  "Show me the vendors we should watch",
  "Find contracts we can cancel",
  "How much are we spending?",
  "Draft a renewal email to a vendor",
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
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col items-center text-center"
      >
        <h2 className="text-[24px] font-semibold tracking-[-0.02em] text-fg">
          How can I help, {name}?
        </h2>
        <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-zinc-500">
          Ask me to work across your contracts, renewals and mail. A new chat
          opens and you can watch what I&apos;m doing as I go.
        </p>
      </motion.div>

      {!hasContracts && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="mt-4 max-w-sm text-center text-[11.5px] leading-relaxed text-zinc-600"
        >
          No contracts yet — upload and analyze one, then give me a task.
        </motion.p>
      )}

      <motion.div
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05, delayChildren: 0.12 } } }}
        className="mt-6 flex max-w-xl flex-wrap items-center justify-center gap-2"
      >
        {SUGGESTIONS.map((s) => (
          <motion.button
            key={s}
            variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] } } }}
            onClick={() => !atCap && onAsk(s)}
            disabled={atCap}
            className="rounded-md border border-line bg-surface px-3 py-1.5 text-[12px] text-zinc-300 transition-colors hover:border-white/25 hover:bg-white/[0.05] hover:text-fg disabled:opacity-40"
          >
            {s}
          </motion.button>
        ))}
      </motion.div>
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
  /** The open chat, or null to show the greeting (no chat open). */
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
  const [logOpen, setLogOpen] = useState(false);
  const [asideOpen, setAsideOpen] = useState(true);
  const [chatQuery, setChatQuery] = useState("");

  const openRecord = (tab: BrowserTab) => {
    setWindows((prev) => [tab, ...prev.filter((w) => w.key !== tab.key)]);
  };

  const closeRecord = (key: string) => setWindows((prev) => prev.filter((w) => w.key !== key));

  // Follow the live stream: keep the newest activity in view, smoothly.
  const eventCount = task?.events.length ?? 0;
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [eventCount, task?.status, task?.id]);

  const sorted = useMemo(
    () => [...(windows)].sort((a, b) => a.title.localeCompare(b.title)),
    [windows]
  );

  const q = chatQuery.trim().toLowerCase();
  const visibleTasks = useMemo(
    () =>
      q
        ? tasks.filter(
            (t) =>
              t.title.toLowerCase().includes(q) ||
              t.request.toLowerCase().includes(q)
          )
        : tasks,
    [tasks, q]
  );

  const openCount = sorted.length;
  const hasContracts = contracts.length > 0;
  const running = task?.status === "running" || task?.status === "awaiting_approval";

  return (
    <div className="relative flex h-full min-h-0">
      {/* Chats aside - persistent history, each task is its own chat */}
      <AnimatePresence initial={false}>
        {asideOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 232, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="flex shrink-0 flex-col overflow-hidden border-r border-line bg-[#101014]"
          >
            <div className="flex h-11 shrink-0 items-center justify-between border-b border-line px-3">
              <span className="truncate text-[12px] font-medium text-zinc-200">Chats</span>
              <button
                title="New chat"
                aria-label="New chat"
                onClick={onBack}
                className="flex size-6 shrink-0 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-zinc-100"
              >
                <Plus size={14} />
              </button>
            </div>
            {/* list search - like the reference list pane */}
            <div className="shrink-0 px-2.5 pb-1.5 pt-2">
              <label className="flex h-7 items-center gap-1.5 rounded-md border border-line bg-canvas px-2 transition-colors focus-within:border-line-strong">
                <Search size={11} className="shrink-0 text-zinc-500" />
                <input
                  value={chatQuery}
                  onChange={(e) => setChatQuery(e.target.value)}
                  placeholder="Search"
                  className="min-w-0 flex-1 bg-transparent text-[11.5px] text-fg outline-none placeholder:text-zinc-600"
                />
                {chatQuery && (
                  <button
                    onClick={() => setChatQuery("")}
                    aria-label="Clear search"
                    className="text-zinc-500 hover:text-zinc-200"
                  >
                    <Plus size={11} className="rotate-45" />
                  </button>
                )}
              </label>
            </div>
            <motion.div
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.03 } } }}
              className="min-h-0 flex-1 overflow-y-auto px-1.5 pb-2"
            >
              {visibleTasks.map((t) => (
                <motion.button
                  key={t.id}
                  variants={{ hidden: { opacity: 0, x: -6 }, show: { opacity: 1, x: 0, transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] } } }}
                  onClick={() => onSelectTask(t.id)}
                  className={`mb-0.5 flex w-full flex-col rounded-md px-2 py-1.5 text-left transition-colors ${
                    task?.id === t.id ? "bg-white/[0.08]" : "hover:bg-white/[0.04]"
                  }`}
                >
                  <span className="flex w-full items-center gap-2">
                    <TaskBadge task={t} />
                    <span
                      className={`min-w-0 flex-1 truncate text-[12px] ${
                        task?.id === t.id ? "text-zinc-100" : "text-zinc-300"
                      }`}
                    >
                      {t.title}
                    </span>
                  </span>
                  <span className="mt-0.5 flex w-full items-center justify-between gap-2 pl-[14px]">
                    <span className="min-w-0 flex-1 truncate text-[10.5px] text-zinc-600">
                      {t.request.length > 56 ? t.request.slice(0, 56) + "…" : t.request}
                    </span>
                    <span className="shrink-0 text-[9.5px] text-zinc-600">{shortTime(t.updatedAt)}</span>
                  </span>
                </motion.button>
              ))}
              {visibleTasks.length === 0 && (
                <p className="px-2 py-4 text-[11px] text-zinc-600">
                  {tasks.length === 0 ? "No chats yet." : "No chats match."}
                </p>
              )}
            </motion.div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* center chat */}
      <div className="flex min-w-0 flex-1 flex-col bg-canvas">
        {/* header */}
        <div className="flex h-11 shrink-0 items-center gap-2 border-b border-line px-4">
          <button
            onClick={() => setAsideOpen((v) => !v)}
            aria-label={asideOpen ? "Hide chats" : "Show chats"}
            title={asideOpen ? "Hide chats" : "Show chats"}
            className="flex size-6 shrink-0 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-100"
          >
            <ChevronDown size={14} className={asideOpen ? "rotate-90" : "-rotate-90"} />
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
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {task ? (
              <motion.div
                key={task.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex h-full flex-col"
              >
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
                <AgentEventLogLight
                  task={task}
                  open={logOpen || running}
                  onToggle={() => setLogOpen((v) => !v)}
                />
              </motion.div>
            ) : (
              <motion.div
                key="greeting"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="h-full"
              >
                <Greeting
                  name={userName}
                  atCap={atCap}
                  hasContracts={hasContracts}
                  onAsk={onSendMessage}
                />
              </motion.div>
            )}
          </AnimatePresence>
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
        <div className="absolute bottom-16 right-4 z-20 flex flex-col gap-3" style={{ maxWidth: 320 }}>
          {sorted.map((tab) => (
            <BrowserWindow key={tab.key} tab={tab} onClose={() => closeRecord(tab.key)} />
          ))}
        </div>
      )}
    </div>
  );
}
