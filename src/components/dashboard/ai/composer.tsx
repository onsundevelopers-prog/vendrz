"use client";

import { useRef, useState } from "react";
import { ArrowUp, Globe, Loader2, Mail } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

/* ------------------------------------------------------------------ */
/*  AI composer - a single docked chat bar.                           */
/*                                                                     */
/*  Placeholder reads "@ for context" like the reference: typing @     */
/*  opens a menu of REAL things the agent can work on (contracts,      */
/*  Gmail, renewals, risk, savings). Picking one inserts a tag into    */
/*  the prompt so the request carries its context. No fake controls.   */
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
      {atCap && (
        <span className="text-[10.5px] text-zinc-600">
          Parallel limit reached — wait for one agent to finish.
        </span>
      )}
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
  /** Submits a new job - each job opens its own dedicated chat. */
  onSend: (text: string) => void;
  /** Start a fresh chat (clears the selection to the greeting). */
  onNewChat?: () => void;
  placeholder?: string;
  runningCount?: number;
  atCap?: boolean;
  contractCount?: number;
  gmailConnected?: boolean;
}) {
  const [draft, setDraft] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const blocked = !!atCap;
  const trimmed = draft.trim();

  // Open the @ menu whenever the trailing token starts with "@".
  const trailing = draft.match(/(?:^|\s)@([a-z]*)$/i);
  const atActive = !!trailing;
  const showMenu = menuOpen && atActive;

  const pickMention = (token: string) => {
    // Replace the trailing "@..." token with the full tag + space.
    const replaced = draft.replace(/(?:^|\s)@[a-z]*$/i, ` @${token} `).trimStart();
    setDraft(replaced);
    setMenuOpen(false);
    inputRef.current?.focus();
  };

  const submit = () => {
    if (!trimmed || blocked) return;
    setDraft("");
    setMenuOpen(false);
    onSend(trimmed);
  };

  return (
    <div className="shrink-0 border-t border-line bg-surface px-4 pb-3 pt-2.5">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-1.5">
        {/* bar */}
        <div className="relative">
          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.98 }}
                transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                className="absolute bottom-full left-0 z-20 mb-2 w-64 overflow-hidden rounded-lg border border-line bg-[#14141a] shadow-[0_12px_32px_rgba(0,0,0,0.55)]"
              >
                <p className="border-b border-line px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-500">
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
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center gap-1.5 rounded-md border border-white/10 bg-[#16161b] px-2.5 py-1.5 transition-colors focus-within:border-white/25">
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                if (e.target.value.match(/(?:^|\s)@[a-z]*$/i)) setMenuOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && atActive && menuOpen) {
                  e.preventDefault();
                  pickMention(trailing![1] ? AT_MENTIONS.find((m) => m.token.startsWith(trailing![1].toLowerCase()))?.token ?? AT_MENTIONS[0].token : AT_MENTIONS[0].token);
                  return;
                }
                if (e.key === "Enter") submit();
                if (e.key === "Escape") setMenuOpen(false);
              }}
              placeholder={blocked ? "Parallel limit reached — wait for an agent to finish" : placeholder}
              aria-label="Message AI"
              disabled={blocked}
              className="min-w-0 flex-1 bg-transparent text-[13px] text-fg outline-none placeholder:text-zinc-600 disabled:opacity-50"
            />
            <motion.button
              type="button"
              onClick={submit}
              disabled={!trimmed || blocked}
              aria-label="Start task"
              whileHover={!blocked && trimmed ? { scale: 1.05 } : undefined}
              whileTap={!blocked && trimmed ? { scale: 0.92 } : undefined}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
              className="flex size-7 shrink-0 items-center justify-center rounded-md border border-white/15 bg-white/[0.06] text-zinc-300 transition-colors hover:bg-white/[0.1] hover:text-white disabled:opacity-40"
            >
              <ArrowUp size={14} />
            </motion.button>
          </div>
        </div>

        {/* real context row */}
        <div className="flex items-center gap-1.5">
          <ContextRow
            contractCount={contractCount}
            gmailConnected={gmailConnected}
            runningCount={runningCount}
            atCap={atCap}
          />
          <span className="ml-auto hidden text-[11px] tracking-tight text-zinc-600 lg:inline">
            Each task runs in its own chat you can reopen anytime
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
