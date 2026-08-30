"use client";

import Link from "next/link";
import { Lock, Sparkles } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  ReviewBlur - wraps the real review results and blurs them for      */
/*  logged-out visitors. The review is genuinely generated; only the   */
/*  content is obscured. A lock + sign-in CTA sits over the blur, and   */
/*  once the user authenticates they see the exact same results.        */
/* ------------------------------------------------------------------ */

export function ReviewBlur({
  children,
  blurred,
  sessionId,
  className = "",
}: {
  children: React.ReactNode;
  /** True = visitor is not signed in, so the results stay blurred. */
  blurred: boolean;
  /** Anonymous session id to carry into sign-in so it persists after auth. */
  sessionId?: string;
  className?: string;
}) {
  if (!blurred) return <div className={className}>{children}</div>;

  const href = `/auth?mode=signup${
    sessionId ? `&session=${sessionId}` : ""
  }&next=${encodeURIComponent(window.location.pathname)}`;

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
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-black/40 via-black/10 to-black/40 px-5">
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
            <Sparkles size={14} />
            Sign in to view results
          </Link>
          <p className="mt-2.5 text-[11px] tracking-tight text-zinc-600">
            No credit card · free account required to save
          </p>
        </div>
      </div>
    </div>
  );
}