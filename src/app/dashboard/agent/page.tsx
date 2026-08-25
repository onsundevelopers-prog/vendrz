"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  clearAgentMessages,
  getAgentMessages,
  getDemoAudit,
  getEmailThreads,
  getGmailConnection,
  logActivity,
  saveAgentMessage,
} from "@/lib/store";
import { agentReply, approvalOutcome } from "@/lib/services/agent";
import { useAuthUser } from "@/lib/auth";
import { timeAgo, formatDateShort } from "@/lib/format";
import type { AgentMessage, EmailThread } from "@/lib/types";

const SUGGESTIONS = [
  "Cancel our Adobe contract",
  "Summarize vendor emails from AWS",
  "Draft a reply to Slack about the renewal",
  "What's the status on Datadog?",
];

const CATEGORY_LABEL: Record<EmailThread["category"], { label: string; cls: string }> = {
  renewal: { label: "Renewal", cls: "border-amber-500/25 bg-amber-500/10 text-amber-400" },
  invoice: { label: "Invoice", cls: "border-blue-500/25 bg-blue-500/10 text-blue-400" },
  negotiation: { label: "Negotiation", cls: "border-emerald-500/25 bg-emerald-500/10 text-emerald-400" },
  general: { label: "General", cls: "border-white/10 bg-white/[0.04] text-muted" },
};

export default function AgentPage() {
  return (
    <Suspense fallback={null}>
      <AgentInner />
    </Suspense>
  );
}

function AgentInner() {
  const params = useSearchParams();
  const auth = useAuthUser();
  const userId = auth.id ?? "demo";
  const audit = getDemoAudit();
  const connection = getGmailConnection(userId);
  const threads = useMemo(() => getEmailThreads(userId), [userId]);

  const [messages, setMessages] = useState<AgentMessage[]>(() => getAgentMessages(userId));
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [pendingApproval, setPendingApproval] = useState<NonNullable<AgentMessage["pendingApproval"]> | null>(null);
  const [sending, setSending] = useState(false);
  const [sentLog, setSentLog] = useState<{ id: string; vendor: string; action: string; time: string }[]>([]);
  const endRef = useRef<HTMLDivElement>(null);
  const [prevUserId, setPrevUserId] = useState(userId);

  // Prefill from ?vendor= - jump straight to that vendor's status.
  useEffect(() => {
    const vendor = params.get("vendor");
    if (!vendor) return;
    const initial = messages.length === 0;
    if (initial) {
      void send(vendor, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset state when the account changes.
  if (prevUserId !== userId) {
    setPrevUserId(userId);
    setMessages(getAgentMessages(userId));
    setPendingApproval(null);
  }

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, thinking]);

  const approve = (m: AgentMessage) => {
    if (!m.pendingApproval) return;
    setPendingApproval(m.pendingApproval);
  };

  const confirmSend = () => {
    if (!pendingApproval) return;
    setSending(true);
    setTimeout(() => {
      const outcome = approvalOutcome(pendingApproval.action, pendingApproval.vendorName, pendingApproval.to);
      logActivity(userId, {
        vendorId: pendingApproval.vendorId,
        vendorName: pendingApproval.vendorName,
        type: pendingApproval.action === "cancel_contract" ? "cancellation" : "email_sent",
        actor: "agent",
        title: outcome.title,
        detail: outcome.detail,
      });
      setSentLog((s) => [
        {
          id: `sent-${Date.now()}`,
          vendor: pendingApproval.vendorName,
          action: pendingApproval.action === "cancel_contract" ? "Cancellation notice" : "Reply",
          time: new Date().toISOString(),
        },
        ...s,
      ]);
      const agentMsg: AgentMessage = {
        id: `m-${Date.now()}`,
        role: "agent",
        content: `✅ **${pendingApproval.action === "cancel_contract" ? "Cancellation notice" : "Reply"} sent to ${pendingApproval.vendorName}** - recorded in your activity log. ${
          pendingApproval.action === "cancel_contract"
            ? "I've flagged the vendor for follow-up at the renewal date."
            : "You'll see a copy in the sent folder of the connected inbox."
        }`,
        createdAt: new Date().toISOString(),
      };
      const next = saveAgentMessage(userId, agentMsg);
      setMessages(next);
      setPendingApproval(null);
      setSending(false);
    }, 1100);
  };

  const dismissApproval = () => setPendingApproval(null);

  async function send(raw?: string, silent = false) {
    const text = (raw ?? input).trim();
    if (!text || thinking) return;
    setInput("");
    setThinking(true);

    const userMsg: AgentMessage = {
      id: `m-${Date.now()}`,
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };
    const withUser = saveAgentMessage(userId, userMsg);
    setMessages(withUser);

    // Simulate the agent's retrieval + drafting latency.
    await new Promise((r) => setTimeout(r, 800 + Math.random() * 600));

    const reply = agentReply(text, audit, threads, auth.name || "Acme Technologies");
    const agentMsg: AgentMessage = {
      id: `m-${Date.now() + 1}`,
      role: "agent",
      content: reply.content,
      createdAt: new Date().toISOString(),
      pendingApproval: reply.approval,
    };
    const next = saveAgentMessage(userId, agentMsg);
    setMessages(next);
    setThinking(false);
    if (reply.approval) setPendingApproval(reply.approval);
    if (silent) void next;
  }

  const selected = threads.find((t) => t.id === selectedThread) ?? null;

  return (
    <div className="space-y-6">
      {/* header */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <h2 className="flex items-center gap-2.5 text-xl font-semibold leading-[1.05] tracking-[-0.035em] text-fg">
            <span aria-hidden="true" className="flex size-8 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-[15px] text-emerald-400">✦</span>
            Gemini vendor agent
          </h2>
          <p className="mt-1 text-[12.5px] tracking-tight text-muted">
            Manages vendors, reads your vendor correspondence, drafts replies - and never sends without your approval
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-medium tracking-tight ${
            connection ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300" : "border-white/10 bg-white/[0.04] text-muted"
          }`}>
            <span className={`size-1.5 rounded-full ${connection ? "bg-emerald-400" : "bg-zinc-500"}`} />
            {connection ? "Email connected" : "Email not connected"}
          </span>
          {!connection && (
            <Link
              href="/dashboard/gmail"
              className="rounded-full border border-line bg-surface px-3 py-1 text-[12px] font-medium tracking-tight text-fg hover:border-emerald-500/30"
            >
              Connect Gmail
            </Link>
          )}
        </div>
      </motion.div>

      {/* approval banner */}
      {pendingApproval && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden border border-amber-500/30 bg-amber-500/[0.05]"
        >
          <div className="flex items-center gap-3 border-b border-amber-500/20 px-5 py-3.5">
            <span className="flex size-8 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-[15px]">⚠</span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-fg">
                {pendingApproval.action === "cancel_contract" ? "Cancellation notice ready for review" : "Reply ready for review"}
              </p>
              <p className="truncate text-[12px] tracking-tight text-muted">
                To: {pendingApproval.to} · Subject: {pendingApproval.subject}
              </p>
            </div>
          </div>
          <div className="px-5 py-4">
            <p className="text-[10.5px] uppercase tracking-[0.12em] text-muted">Draft - nothing sent yet</p>
            <div className="mt-2 rounded-xl border border-line bg-canvas px-4 py-3.5">
              <p className="text-[10.5px] uppercase tracking-[0.1em] text-muted">{pendingApproval.subject}</p>
              <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-fg/90">
                {pendingApproval.body}
              </p>
            </div>
            <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[12px] tracking-tight text-muted">
                {pendingApproval.action === "cancel_contract"
                  ? "Sending records the action in your activity log and updates vendor status."
                  : "Sending records the reply in your activity log and sent folder."}
              </p>
              <div className="flex gap-2.5">
                <button
                  onClick={dismissApproval}
                  disabled={sending}
                  className="rounded-full border border-line bg-surface px-4 py-2 text-[12.5px] font-medium tracking-tight text-muted transition-colors hover:text-fg"
                >
                  Edit draft
                </button>
                <button
                  onClick={confirmSend}
                  disabled={sending}
                  className="inline-flex min-w-[140px] items-center justify-center gap-2 rounded-full bg-white px-4 py-2 text-[12.5px] font-medium tracking-tight text-black transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {sending ? (
                    <>
                      <span className="size-3.5 animate-spin rounded-full border-2 border-black/30 border-t-black" />
                      Sending…
                    </>
                  ) : (
                    `Confirm & send`
                  )}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* sent log */}
      {sentLog.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {sentLog.map((s) => (
            <span key={s.id} className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/[0.07] px-3 py-1 text-[11.5px] tracking-tight text-emerald-300">
              ✓ {s.action} · {s.vendor}
              <span className="text-emerald-400/50">{timeAgo(s.time)}</span>
            </span>
          ))}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        {/* chat column */}
        <div className="space-y-5">
          <div className="panel-surface flex h-[560px] flex-col overflow-hidden">
            <div className="panel-header">
              <span className="panel-title">Conversation</span>
              <span className="panel-sub">read-only until you approve</span>
              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <button
                    onClick={() => {
                      clearAgentMessages(userId);
                      setMessages([]);
                      setPendingApproval(null);
                    }}
                    className="toolbar-btn !h-7"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
            {/* chat messages */}
            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              {messages.length === 0 && !thinking && (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <span className="flex size-14 items-center justify-center rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.07] text-[22px] text-emerald-400">✦</span>
                  <p className="mt-4 text-[15px] font-semibold text-fg">How can I help with your vendors?</p>
                  <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-muted">
                    I can check vendor status, summarize their emails, draft replies, and execute cancellations - always with your approval before sending.
                  </p>
                  <div className="mt-5 flex max-w-md flex-col gap-2">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => void send(s)}
                        className="rounded-md border border-line bg-white/[0.03] px-4 py-2.5 text-left text-[12.5px] tracking-tight text-muted transition-colors hover:border-emerald-500/30 hover:text-fg"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] ${m.role === "user" ? "text-right" : ""}`}>
                    <div
                      className={`inline-block rounded-lg border px-4 py-3 text-left text-[13.5px] leading-relaxed tracking-[-0.01em] ${
                        m.role === "user"
                          ? "border-white/10 bg-white/[0.07] text-fg"
                          : "border-line bg-white/[0.03] text-fg/90"
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{m.content}</div>
                    </div>
                    {m.pendingApproval && !pendingApproval && (
                      <button
                        onClick={() => approve(m)}
                        className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-[12px] font-medium tracking-tight text-amber-300 transition-colors hover:bg-amber-500/20"
                      >
                        ⚠ Review {m.pendingApproval.action === "cancel_contract" ? "cancellation" : "reply"} → 
                      </button>
                    )}
                    <p className="mt-1.5 text-[10.5px] tracking-tight text-muted/50">
                      {new Date(m.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}

              {thinking && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 rounded-lg border border-line bg-white/[0.03] px-4 py-3">
                    <span className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <motion.span
                          key={i}
                          className="size-1.5 rounded-full bg-emerald-400"
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                        />
                      ))}
                    </span>
                    <span className="text-[12.5px] tracking-tight text-muted">Searching vendor data…</span>
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>

            {/* input */}
            <div className="border-t border-line p-3.5">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void send();
                }}
                className="flex items-center gap-2.5"
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about a vendor, cancel a contract, draft a reply…"
                  className="h-11 flex-1 rounded-xl border border-line bg-canvas px-4 text-[13.5px] tracking-tight text-fg outline-none transition-colors placeholder:text-muted focus:border-emerald-400/50"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || thinking}
                  aria-label="Send"
                  className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white text-[17px] text-black transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  ↑
                </button>
              </form>
              <p className="mt-2 text-center text-[10.5px] tracking-tight text-muted/50">
                The agent never sends emails without your explicit confirmation.
              </p>
            </div>
          </div>
        </div>

        {/* right rail */}
        <div className="space-y-5">
          {/* email panel */}
          <div className="panel-surface overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-4 py-3.5">
              <div>
                <h3 className="text-[14px] font-semibold tracking-[-0.01em] text-fg">Vendor inbox</h3>
                <p className="text-[11px] tracking-tight text-muted">
                  {connection ? `Connected · ${connection.scopeGranted.length} permissions` : "Read-only · not connected"}
                </p>
              </div>
              <Link
                href={connection ? "/dashboard/gmail/discovery" : "/dashboard/gmail"}
                className="text-[11.5px] tracking-tight text-emerald-400 hover:text-emerald-300"
              >
                {connection ? "Manage →" : "Connect →"}
              </Link>
            </div>
            <div className="max-h-[300px] overflow-y-auto">
              <div className="divide-y divide-line">
                {threads.map((t) => {
                  const cat = CATEGORY_LABEL[t.category];
                  return (
                    <button
                      key={t.id}
                      onClick={() => setSelectedThread(t.id)}
                      className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.03] ${selectedThread === t.id ? "bg-white/[0.04]" : ""}`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`size-1.5 shrink-0 rounded-full ${t.unread ? "bg-emerald-400" : "bg-zinc-600"}`} />
                          <p className="truncate text-[12.5px] font-medium text-fg">{t.vendorName}</p>
                          <span className={`ml-auto shrink-0 rounded-full border px-1.5 py-px text-[9px] font-medium uppercase tracking-wide ${cat.cls}`}>
                            {cat.label}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-[12px] text-muted">{t.subject}</p>
                        <p className="mt-0.5 line-clamp-1 text-[11px] tracking-tight text-muted/60">{t.snippet}</p>
                        <p className="mt-1 text-[10px] tracking-tight text-muted/50">{formatDateShort(t.date)} · {t.sender}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* thread detail */}
          {selected && (
            <div className="border border-line bg-surface p-4">
              <p className="text-[10px] uppercase tracking-[0.12em] text-muted">Selected thread</p>
              <p className="mt-1.5 text-[13.5px] font-medium leading-snug text-fg">{selected.subject}</p>
              <p className="mt-1 text-[12px] leading-relaxed text-muted">{selected.snippet}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href={`/dashboard/vendors/${selected.vendorId}`}
                  className="rounded-full border border-line bg-white/[0.03] px-3 py-1.5 text-[11.5px] font-medium tracking-tight text-fg hover:border-emerald-500/30"
                >
                  Open vendor
                </Link>
                <button
                  onClick={() => void send(`Draft a reply to ${selected.vendorName}`)}
                  className="rounded-full border border-emerald-500/25 bg-emerald-500/[0.07] px-3 py-1.5 text-[11.5px] font-medium tracking-tight text-emerald-300 hover:bg-emerald-500/15"
                >
                  Draft reply
                </button>
                <button
                  onClick={() => void send(`Summarize vendor emails from ${selected.vendorName}`)}
                  className="rounded-full border border-line bg-white/[0.03] px-3 py-1.5 text-[11.5px] font-medium tracking-tight text-muted hover:text-fg"
                >
                  Summarize
                </button>
              </div>
            </div>
          )}

          {/* agent actions panel */}
          <div className="panel-surface overflow-hidden">
            <div className="border-b border-line px-4 py-3.5">
              <h3 className="text-[14px] font-semibold tracking-[-0.01em] text-fg">Agent actions</h3>
              <p className="text-[11px] tracking-tight text-muted">Drafts, sends, and cancellations</p>
            </div>
            <div className="divide-y divide-line">
              {sentLog.length === 0 ? (
                <p className="px-4 py-5 text-center text-[12px] tracking-tight text-muted/60">
                  No agent actions yet. Ask the agent to cancel a contract or draft a reply.
                </p>
              ) : (
                sentLog.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-emerald-500/25 bg-emerald-500/10 text-[11px] text-emerald-400">✓</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-medium text-fg">{s.action} · {s.vendor}</p>
                      <p className="text-[10.5px] tracking-tight text-muted">{timeAgo(s.time)}</p>
                    </div>
                  </div>
                ))
              )}
              <div className="border-t border-line px-4 py-3">
                <button
                  onClick={() => {
                    clearAgentMessages(userId);
                    setMessages([]);
                    setPendingApproval(null);
                  }}
                  className="text-[11.5px] tracking-tight text-muted/60 transition-colors hover:text-red-400"
                >
                  Clear conversation
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
