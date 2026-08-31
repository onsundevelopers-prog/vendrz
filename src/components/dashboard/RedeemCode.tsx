"use client";

import { useState } from "react";
import { useDisplayMode } from "@/lib/displayMode";

/* ------------------------------------------------------------------ */
/*  Redeem Code - small modal reached from the dashboard header.       */
/*  Enters a code, validates it server-side (/api/redeem), and applies */
/*  the granted plan to the account on success. The code is only ever  */
/*  checked on the backend - this UI just submits and reports.         */
/* ------------------------------------------------------------------ */

export function RedeemCode({
  open,
  onClose,
  onRedeemed,
}: {
  open: boolean;
  onClose: () => void;
  /** Fired once a code was successfully applied (so the caller can refresh plan). */
  onRedeemed?: (plan: string) => void;
}) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const { activatePlan } = useDisplayMode();

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        plan?: string;
        message?: string;
      } | null;
      if (res.ok && data?.ok && data.plan) {
        // Apply the granted plan locally so the workspace reflects it now.
        activatePlan(data.plan as "team" | "business" | "enterprise");
        setMsg({ kind: "ok", text: data.message ?? "Code redeemed successfully." });
        setCode("");
        onRedeemed?.(data.plan);
      } else {
        setMsg({ kind: "err", text: data?.error ?? "That code didn't work. Try again." });
      }
    } catch {
      setMsg({ kind: "err", text: "Couldn't reach the server. Check your connection and try again." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 px-5 backdrop-blur-sm">
      <div className="border-sheen w-full max-w-sm rounded-xl border border-line-strong bg-surface p-6 shadow-2xl shadow-black/60">
        <p className="text-[10.5px] font-semibold tracking-[0.2em] text-muted">Redeem a code</p>
        <h2 className="mt-2 text-[20px] font-semibold tracking-tight text-fg">Unlock a plan</h2>
        <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
          Enter a redemption code to activate its plan on your account. Codes are
          validated securely and applied instantly.
        </p>

        <form onSubmit={submit} className="mt-5 space-y-3">
          <div className="border-sheen flex items-center gap-2 rounded-md border border-line bg-canvas px-3 focus-within:border-white/30">
            <input
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter code"
              autoComplete="off"
              spellCheck={false}
              className="h-11 w-full bg-transparent text-[14px] font-medium tracking-wide text-fg outline-none placeholder:text-zinc-600 placeholder:normal-case"
            />
          </div>

          {msg && (
            <p
              className={`text-[12px] leading-relaxed ${
                msg.kind === "ok" ? "text-zinc-200" : "text-zinc-400"
              }`}
            >
              {msg.text}
            </p>
          )}

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={busy || !code.trim()}
              className="inline-flex h-9 flex-1 items-center justify-center rounded-md bg-white text-[13px] font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {busy ? "Redeeming…" : "Redeem"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 items-center justify-center rounded-md border border-line px-3 text-[12.5px] font-medium text-muted transition-colors hover:border-white/25 hover:text-fg"
            >
              Close
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}