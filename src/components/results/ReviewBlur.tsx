"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lock, Mail } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  ReviewBlur - wraps the real review results and blurs them for      */
/*  logged-out visitors. The review is genuinely generated; only the   */
/*  content is obscured. A lock + sign-in CTA sits over the blur, and   */
/*  once the user authenticates they see the exact same results.        */
/*                                                                     */
/*  A secondary "email me a summary" capture sits under the sign-in    */
/*  CTA. It stores the lead server-side (see /api/audit-lead) so the   */
/*  no-signup audit is never a dead end. The copy stays honest: if     */
/*  outbound email isn't configured the user is told their review was  */
/*  saved, not that an email is on its way.                            */
/* ------------------------------------------------------------------ */

export type LeadSummary = {
  vendorName?: string | null;
  riskScore?: number | null;
  riskLabel?: string | null;
  renewalDate?: string | null;
  savingsLow?: number | null;
  savingsHigh?: number | null;
  findings?: number | null;
};

function LeadCapture({
  sessionId,
  documentName,
  summary,
}: {
  sessionId?: string;
  documentName?: string | null;
  summary?: LeadSummary | null;
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = email.trim();
    if (!value || status === "saving") return;
    setStatus("saving");
    setMessage(null);
    try {
      const res = await fetch("/api/audit-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: value,
          sessionId,
          documentName: documentName ?? undefined,
          summary: summary ?? undefined,
        }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; sent?: boolean; error?: string; code?: string }
        | null;
      if (res.ok && data?.ok) {
        setSent(!!data.sent);
        setStatus("done");
        setMessage(
          data.sent
            ? `Sent — check ${value} for your summary.`
            : "Saved — create a free account to see the full review."
        );
        return;
      }
      // Friendly, non-technical messages - never surface stack traces.
      if (res.status === 400) setMessage("Enter a valid email address.");
      else if (res.status === 429) setMessage("Too many requests. Try again in a moment.");
      else if (data?.code === "TABLE_MISSING" || data?.code === "NOT_CONFIGURED")
        setMessage("Email capture is being set up — try again shortly.");
      else setMessage("Couldn't save your email right now. Try again in a moment.");
      setStatus("error");
    } catch {
      setStatus("error");
      setMessage("Couldn't reach the server. Check your connection and try again.");
    }
  };

  return (
    <div className="mx-auto mt-6 w-full max-w-sm">
      <div className="flex items-center gap-3 text-[10.5px] font-medium uppercase tracking-[0.14em] text-zinc-600">
        <span className="h-px flex-1 bg-white/10" />
        or
        <span className="h-px flex-1 bg-white/10" />
      </div>

      {status === "done" ? (
        <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-left">
          <p className="text-[12.5px] leading-relaxed text-zinc-300">{message}</p>
          {!sent && (
            <Link
              href={`/auth?mode=signup${
                sessionId ? `&session=${sessionId}` : ""
              }`}
              className="mt-2 inline-block text-[12px] font-medium text-white underline-offset-2 hover:underline"
            >
              Create your free account
            </Link>
          )}
        </div>
      ) : (
        <form onSubmit={submit} className="mt-4 text-left">
          <p className="flex items-center gap-1.5 text-[12.5px] font-medium text-zinc-300">
            <Mail size={13} className="text-zinc-500" />
            Email me a summary of this review
          </p>
          <p className="mt-1 text-[11.5px] leading-relaxed text-zinc-500">
            A plain-English rundown of the findings — no account needed.
          </p>
          <div className="mt-3 flex gap-2">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              aria-label="Email address"
              className="h-10 min-w-0 flex-1 rounded-md border border-line bg-[#18181B] px-3 text-[13px] text-fg placeholder:text-zinc-600 focus:border-white/30 focus:outline-none"
            />
            <button
              type="submit"
              disabled={status === "saving"}
              className="flex h-10 shrink-0 items-center rounded-md border border-white/15 bg-white/[0.06] px-4 text-[12.5px] font-medium text-zinc-200 transition-colors hover:bg-white/[0.1] disabled:opacity-60"
            >
              {status === "saving" ? "Saving…" : "Email me"}
            </button>
          </div>
          {status === "error" && message && (
            <p className="mt-2 text-[11.5px] leading-relaxed text-zinc-400">{message}</p>
          )}
        </form>
      )}
    </div>
  );
}

export function ReviewBlur({
  children,
  blurred,
  sessionId,
  documentName,
  summary,
  className = "",
}: {
  children: React.ReactNode;
  /** True = visitor is not signed in, so the results stay blurred. */
  blurred: boolean;
  /** Anonymous session id to carry into sign-in so it persists after auth. */
  sessionId?: string;
  /** Source document name for the lead-summary email. */
  documentName?: string | null;
  /** Compact findings summary stored with the lead (see LeadSummary). */
  summary?: LeadSummary | null;
  className?: string;
}) {
  // usePathname works during both server and client rendering - never touch
  // `window` here, or logged-out visitors 500 on the server-rendered page.
  const pathname = usePathname();
  if (!blurred) return <div className={className}>{children}</div>;

  const href = `/auth?mode=signup${
    sessionId ? `&session=${sessionId}` : ""
  }&next=${encodeURIComponent(pathname)}`;

  return (
    <div className={`relative ${className}`}>
      {/* the real review, obscured */}
      <div
        className="pointer-events-none select-none"
        style={{
          filter: "blur(14px) saturate(0.6)",
          WebkitFilter: "blur(14px) saturate(0.6)",
        }}
        aria-hidden="true"
      >
        {children}
      </div>

      {/* lock + CTA overlay */}
      <div className="absolute inset-0 flex items-center justify-center overflow-y-auto bg-gradient-to-b from-black/40 via-black/10 to-black/40 px-5 py-10">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-xl border border-white/15 bg-[#18181B]">
            <Lock size={18} className="text-zinc-300" />
          </div>
          <h3 className="mt-4 text-[17px] font-semibold tracking-tight text-fg">
            Your review is ready
          </h3>
          <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-muted">
            Sign in to reveal the full results — renewals, risks, and savings
            derived from your uploaded document. They&apos;ll be saved to your
            account.
          </p>
          <Link
            href={href}
            className="mt-5 inline-flex h-10 items-center gap-1.5 rounded-md bg-white px-5 text-[13px] font-semibold text-black transition-opacity hover:opacity-90"
          >
            Sign in to view results
          </Link>
          <p className="mt-2.5 text-[11px] tracking-tight text-zinc-600">
            No credit card · free account required to save
          </p>

          {/* secondary: capture the lead so the audit isn't a dead end */}
          <LeadCapture sessionId={sessionId} documentName={documentName} summary={summary} />
        </div>
      </div>
    </div>
  );
}
