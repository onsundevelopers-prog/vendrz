"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Globe, Loader2, Mail, Plus, AtSign } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  AI composer - a single docked chat bar.                           */
/*                                                                     */
/*  Premium feel: auto-growing textarea (Enter sends, Shift+Enter      */
/*  newline), soft focus halo, send button that responds to input      */
/*  availability, and an @ context menu of REAL things the agent can   */
/*  work on (contracts, Gmail, renewals, risk, savings).               */
/* ------------------------------------------------------------------ */

const AT_MENTIONS = [
  { token: "contracts", label: "your contracts", hint: "all analyzed vendor agreements" },
  { token: "gmail", label: "your Gmail", hint: "vendor correspondence, read-only" },
  { token: "renewals", label: "renewals", hint: "upcoming renewal dates & exposure" },
  { token: "risk", label: "risk", hint: "flagged vendors and why" },
  { token: "savings", label: "savings", hint: "places we could spend less" },
] as const;

export function ContextRow({
  contractCount,
  gmailConnected,
  runningCount,
  atCap,
}: {
  contractCount?: number;
  gmailConnected?: boolean;
  runningCount?: number;
  atCap?: boolean;
}) {
  const hasContext =
    typeof contractCount === "number" || typeof gmailConnected === "boolean" || typeof runningCount === "number";
  if (!hasContext) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {typeof runningCount === "number" && runningCount > 0 && (
        <span className="inline-flex h-6 items-center gap-1 rounded-md border border-white/15 bg-white/[0.05] px-2 text-[10.5px] text-zinc-300">
          <Loader2 size={10} className="animate-spin" />
          {runningCount} agent{runningCount === 1 ? "" : "s"} running
        </span>
      )}
      {typeof contractCount === "number" && (
        <span className="inline-flex h-6 items-center gap-1 rounded-md border border-line bg-white/[0.03] px-2 text-[10.5px] text-zinc-500">
          <Globe size={10} />
          {contractCount} contract{contractCount === 1 ? "" : "s"} in scope
        </span>
      )}
      {typeof gmailConnected === "boolean" && (
        <span
          className={`inline-flex h-6 items-center gap-1 rounded-md border px-2 text-[10.5px] ${
            gmailConnected
              ? "border-white/15 bg-white/[0.05] text-zinc-300"
              : "border-line bg-white/[0.02] text-zinc-600"
          }`}
        >
          <Mail size={10} />
          Gmail {gmailConnected ? "connected" : "not connected"}
        </span>
      )}
      {atCap && <span className="text-[10.5px] text-zinc-600">Parallel limit reached — wait for one agent to finish.</span>}
    </div>
  );
}

export function ChatComposer({
  onSend,
  placeholder = "Reply, @ for context",
  runningCount,
  atCap,
  contractCount,
  gmailConnected,
}: {
  onSend: (text: string) => void;
  onNewChat?: () => void;
  placeholder?: string;
  runningCount?: number;
  atCap?: boolean;
  contractCount?: number;
  gmailConnected?: boolean;
}) {
  const [draft, setDraft] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const blocked = !!atCap;
  const trimmed = draft.trim();

  // Auto-grow the textarea up to 5 lines; shrink back when emptied.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = Math.min(el.scrollHeight, 132) + "px";
  }, [draft]);

  // Open the @ menu whenever the trailing token starts with "@".
  const trailing = draft.match(/(?:^|\s)@([a-z]*)$/i);
  const atActive = !!trailing;
  const showMenu = menuOpen && atActive;

  const pickMention = (token: string) => {
    const replaced = draft.replace(/(?:^|\s)@[a-z]*$/i, ` @${token} `).trimStart();
    setDraft(replaced);
    setMenuOpen(false);
    textareaRef.current?.focus();
  };

  const submit = () => {
    if (!trimmed || blocked) return;
    setDraft("");
    setMenuOpen(false);
    onSend(trimmed);
  };

  return (
    <div className="shrink-0 px-4 pb-3 pt-1">
      <div className="mx-auto flex w-full max-w-[var(--ai-composer-maxw)] flex-col gap-1.5">
        <div className="relative">
          {showMenu && (
            <div className="ai-stage-in absolute bottom-full left-0 z-20 mb-2 w-72 overflow-hidden rounded-lg border border-line bg-[#14141a] shadow-[0_12px_32px_rgba(0,0,0,0.55)]">
              <p className="flex items-center gap-1.5 border-b border-line px-3 py-2 text-[10px] font-semibold tracking-[-0.01em] text-zinc-500">
                <AtSign size={10} />
                Add context
              </p>
              {AT_MENTIONS.map((m) => (
                <button
                  key={m.token}
                  onClick={() => pickMention(m.token)}
                  className="flex w-full items-baseline gap-2 px-3 py-2 text-left transition-colors hover:bg-white/[0.05]"
                >
                  <span className="shrink-0 font-mono text-[11px] text-zinc-300">@{m.token}</span>
                  <span className="min-w-0">
                    <span className="block text-[11.5px] font-medium text-fg">{m.label}</span>
                    <span className="block text-[10px] text-zinc-500">{m.hint}</span>
                  </span>
                </button>
              ))}
            </div>
          )}

          <div className="ai-composer flex items-end gap-2 rounded-xl border border-line bg-surface px-3 py-2.5">
            <button
              type="button"
              disabled
              aria-label="Attachments"
              title="Attachments"
              className="flex size-7 shrink-0 items-center justify-center rounded-md text-zinc-600"
            >
              <Plus size={15} />
            </button>
            <textarea
              ref={textareaRef}
              value={draft}
              rows={1}
              onChange={(e) => {
                setDraft(e.target.value);
                if (e.target.value.match(/(?:^|\s)@[a-z]*$/i)) setMenuOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && atActive && menuOpen) {
                  e.preventDefault();
                  const q = trailing![1]?.toLowerCase() ?? "";
                  const match = AT_MENTIONS.find((m) => m.token.startsWith(q));
                  pickMention(match?.token ?? AT_MENTIONS[0].token);
                  return;
                }
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
                if (e.key === "Escape") setMenuOpen(false);
              }}
              placeholder={blocked ? "Parallel limit reached — wait for an agent to finish" : placeholder}
              aria-label="Message AI"
              disabled={blocked}
              className="max-h-[132px] min-w-0 flex-1 resize-none bg-transparent py-1 text-[13.5px] leading-relaxed text-fg outline-none placeholder:text-zinc-600 disabled:opacity-50"
            />
            <button
              type="button"
              onClick={submit}
              disabled={!trimmed || blocked}
              aria-label="Start task"
              title="Send"
              className={`flex size-7 shrink-0 items-center justify-center rounded-md transition-all duration-150 ${
                trimmed && !blocked
                  ? "bg-white text-black hover:opacity-90"
                  : "bg-white/[0.06] text-zinc-600"
              }`}
            >
              <ArrowUp size={14} className="transition-transform duration-150" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <ContextRow
            contractCount={contractCount}
            gmailConnected={gmailConnected}
            runningCount={runningCount}
            atCap={atCap}
          />
          <span className="ml-auto hidden text-[11px] tracking-tight text-zinc-600 lg:inline">
            <kbd className="rounded border border-line bg-surface px-1 py-px text-[9.5px]">Enter</kbd> to send
            <span className="mx-1.5 text-zinc-700">·</span>
            <kbd className="rounded border border-line bg-surface px-1 py-px text-[9.5px]">Shift</kbd>+
            <kbd className="rounded border border-line bg-surface px-1 py-px text-[9.5px]">Enter</kbd> newline
          </span>
        </div>
      </div>
    </div>
  );
}

/** Greeting composer - same bar, greeting wording. */
export function GreetingComposer(props: Parameters<typeof ChatComposer>[0]) {
  return <ChatComposer {...props} />;
}

export function HomeComposer(props: Parameters<typeof ChatComposer>[0]) {
  return <ChatComposer {...props} />;
}