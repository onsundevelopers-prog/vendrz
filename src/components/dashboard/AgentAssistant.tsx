"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Check, Mail, Radar, X } from "lucide-react";
import type { AgentMessage } from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  n4maAI - a query panel over the user's real contract data via     */
/*  the rule-based query engine. Evidence chips open the underlying   */
/*  contract; prepared emails/cancellations render as approval cards  */
/*  that are never sent until the user confirms.                      */
/* ------------------------------------------------------------------ */

const SUGGESTIONS = [
  "What needs attention?",
  "Find emails from a vendor",
  "Draft a reply to a vendor",
  "Draft a renewal negotiation to a vendor",
  "Cancel a vendor contract",
  "Where can we save money?",
];

/** Renders **bold**, # headings, - bullets, and blank lines. */
function renderAgent(content: string): React.ReactNode {
  return content.split("\n").map((line, i) => {
    if (line.startsWith("## ")) {
      return (
        <p key={i} className="mb-1 mt-2 text-[13px] font-semibold tracking-tight text-fg first:mt-0">
          {line.slice(3)}
        </p>
      );
    }
    if (line.startsWith("### ")) {
      return (
        <p key={i} className="mb-1 mt-2 text-[12.5px] font-semibold text-fg first:mt-0">
          {line.slice(4)}
        </p>
      );
    }
    if (line.trim() === "") return <div key={i} className="h-1.5" />;
    if (line.startsWith("- ")) {
      return (
        <p key={i} className="mt-1 flex gap-1.5 text-[12.5px] leading-relaxed text-zinc-300 first:mt-0">
          <span className="shrink-0 select-none text-zinc-600">–</span>
          <span>{renderInline(line.slice(2))}</span>
        </p>
      );
    }
    return (
      <p key={i} className="text-[12.5px] leading-relaxed text-zinc-300">
        {renderInline(line)}
      </p>
    );
  });
}

function renderInline(text: string): React.ReactNode {
  return text.split(/\*\*(.+?)\*\*/g).map((part, j) =>
    j % 2 === 1 ? (
      <span key={j} className="font-semibold text-fg">
        {part}
      </span>
    ) : (
      <span key={j}>{part}</span>
    )
  );
}

/**
 * Approval card. Defensive against older stored messages whose
 * pendingApproval predates the action_type/action_id schema - it renders
 * whatever fields exist and only offers Approve/Reject when an action_id
 * is actually persisted.
 */
function ApprovalCard({
  pa,
  onApproveDraft,
  onRejectDraft,
}: {
  pa: NonNullable<AgentMessage["pendingApproval"]>;
  onApproveDraft?: (approval: {
    action_id: string;
    vendorId: string;
    vendorName: string;
    to: string;
    subject: string;
    body: string;
  }) => void;
  onRejectDraft?: (actionId: string) => void;
}) {
  const typeLabel = (pa.action_type ?? "action").replace("_", " ");
  const actionable = typeof pa.action_id === "string" && pa.action_id.length > 0;
  return (
    <div className="mt-2.5 border-t border-line pt-2.5">
      <p className="flex items-center gap-1.5 text-[10.5px] font-semibold tracking-[0.1em] text-muted/70">
        <Mail size={10} />
        {typeLabel} · requires approval
      </p>
      {pa.subject ? (
        <p className="mt-1.5 text-[12px] font-medium text-fg">{pa.subject}</p>
      ) : null}
      {pa.reasoning && (
        <p className="mt-1 text-[11px] leading-relaxed text-muted">
          <span className="font-medium text-zinc-400">Why:</span> {pa.reasoning}
        </p>
      )}
      <p className="mt-1 whitespace-pre-wrap rounded-md border border-line bg-[#0c0c10] p-2.5 text-[11.5px] leading-relaxed text-zinc-400">
        {pa.body}
      </p>
      <div className="mt-2 flex items-center gap-2">
        {actionable ? (
          <>
            <button
              onClick={() =>
                onApproveDraft?.({
                  action_id: pa.action_id,
                  vendorId: pa.vendorId ?? "",
                  vendorName: pa.vendorName ?? "",
                  to: pa.to ?? "",
                  subject: pa.subject ?? "",
                  body: pa.body ?? "",
                })
              }
              className="flex h-7 items-center gap-1.5 rounded-md bg-white px-3 text-[11.5px] font-semibold text-black transition-opacity hover:opacity-90"
            >
              <Check size={12} />
              Approve
            </button>
            {onRejectDraft && (
              <button
                onClick={() => onRejectDraft(pa.action_id)}
                className="flex h-7 items-center gap-1.5 rounded-md border border-line px-3 text-[11.5px] font-medium text-muted transition-colors hover:border-white/25 hover:text-fg"
              >
                Reject
              </button>
            )}
          </>
        ) : (
          <span className="text-[10.5px] text-muted/60">Recorded before action tracking</span>
        )}
        <span className="ml-auto text-[10.5px] text-muted/70">
          Nothing is sent without your approval
        </span>
      </div>
    </div>
  );
}

export function AgentAssistant({
  open,
  onClose,
  messages,
  onSend,
  consulting,
  onSelectContract,
  onApproveDraft,
  onRejectDraft,
}: {
  open: boolean;
  onClose: () => void;
  messages: AgentMessage[];
  onSend: (text: string) => void;
  consulting: boolean;
  onSelectContract?: (id: string) => void;
  /** Approve a pending action (persisted as `approved`/`completed`). */
  onApproveDraft?: (approval: {
    action_id: string;
    vendorId: string;
    vendorName: string;
    to: string;
    subject: string;
    body: string;
  }) => void;
  /** Reject a pending action (persisted as `rejected`). */
  onRejectDraft?: (actionId: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, consulting, open]);

  const submit = (text: string) => {
    const t = text.trim();
    if (!t || consulting) return;
    setDraft("");
    onSend(t);
    inputRef.current?.focus();
  };

  return (
    <div className="relative">
      {/* floating toggle button */}
      <button
        onClick={onClose}
        aria-label={open ? "Close assistant" : "Open assistant"}
        title={open ? "Close assistant" : "Open assistant"}
        className="fixed bottom-4 right-4 z-40 flex size-9 items-center justify-center rounded-md border border-line bg-[#1d1d23] text-fg transition-colors hover:bg-[#26262e]"
      >
        {open ? <X size={18} /> : <Radar size={18} />}
      </button>

      {/* panel */}
      <aside
        className="fixed bottom-0 right-0 top-12 z-30 flex w-[400px] max-w-full flex-col border-l border-line bg-[#0c0c10] shadow-[-16px_0_40px_rgba(0,0,0,0.5)] transition-transform duration-200"
        style={open ? undefined : { transform: "translateX(100%)" }}
        aria-label="Ask AI panel"
      >
        {/* header */}
        <div className="flex h-11 shrink-0 items-center gap-2.5 border-b border-line px-4">
          <span className="flex size-6 items-center justify-center rounded-md bg-white/[0.06] text-zinc-300">
            <Radar size={13} />
          </span>
          <span className="text-[13px] font-medium text-fg">Ask AI</span>
          <span className="ml-auto text-[10px] text-muted/60">your contract data</span>
        </div>

        {/* messages */}
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          {messages.length === 0 && (
            <div className="px-1">
              <p className="text-[12.5px] font-medium text-fg">Ask about your contracts</p>
              <p className="mt-1 text-[12px] leading-relaxed text-muted">
                Query renewals, risk, spend, savings and escalations. Everything is
                computed from your real contracts, and every claim is labeled FACT,
                ESTIMATE, or RECOMMENDATION.
              </p>
            </div>
          )}

          {messages.map((m) => (
            <div key={m.id} className="mb-3">
              <div
                className={`max-w-[94%] rounded-lg border px-3 py-2 ${
                  m.role === "user"
                    ? "ml-auto border-line bg-white/[0.06] text-fg"
                    : "border-line bg-[#14141a]"
                }`}
              >
                <div className={m.role === "user" ? "text-[12.5px]" : ""}>{renderAgent(m.content)}</div>

                {/* approval card - never sent without explicit user confirmation */}
                {m.role === "agent" && m.pendingApproval && (
                  <ApprovalCard
                    pa={m.pendingApproval}
                    onApproveDraft={onApproveDraft}
                    onRejectDraft={onRejectDraft}
                  />
                )}
              </div>

              {/* evidence chips */}
              {m.role === "agent" && m.evidenceIds && m.evidenceIds.length > 0 && onSelectContract && (
                <div className="ml-1 mt-1 flex flex-wrap gap-1.5">
                  {m.evidenceIds.map((id) => (
                    <button
                      key={id}
                      onClick={() => onSelectContract(id)}
                      className="rounded-md border border-line bg-white/[0.03] px-2 py-1 text-[10.5px] text-muted transition-colors hover:border-white/25 hover:text-fg"
                    >
                      View contract →
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* thinking / typing indicator */}
          {consulting && (
            <div className="flex items-center gap-2 rounded-md border border-line bg-[#14141a] px-3 py-2.5 max-w-[94%]">
              <span className="size-3 shrink-0 animate-spin rounded-full border-2 border-zinc-500 border-t-transparent" />
              <span className="text-[12px] text-muted">Analyzing your contracts…</span>
            </div>
          )}
        </div>

        {/* suggestions */}
        {messages.length === 0 && (
          <div className="shrink-0 border-t border-line px-3 py-2.5">
            <p className="mb-2 text-[10px] font-semibold tracking-[0.1em] text-muted/60">
              Suggested
            </p>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => submit(s)}
                  disabled={consulting}
                  className="rounded-md border border-line bg-white/[0.03] px-2.5 py-1.5 text-[11.5px] text-muted transition-colors hover:border-white/20 hover:bg-white/[0.06] hover:text-fg disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* input */}
        <div className="shrink-0 border-t border-line p-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(draft);
            }}
            className="border-sheen flex items-center gap-2 rounded-lg border border-line bg-[#14141a] px-2.5 py-1.5 focus-within:border-white/25"
          >
            <Radar size={13} className="shrink-0 text-zinc-500" />
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ask about your contracts…"
              className="min-w-0 flex-1 bg-transparent text-[12.5px] text-fg outline-none placeholder:text-zinc-600"
            />
            <button
              type="submit"
              disabled={!draft.trim() || consulting}
              aria-label="Send"
              className="flex size-6 shrink-0 items-center justify-center rounded-md bg-white text-black transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              <ArrowUp size={13} />
            </button>
          </form>
        </div>
      </aside>
    </div>
  );
}
