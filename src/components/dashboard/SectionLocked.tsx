"use client";

import Link from "next/link";
import { Lock } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  SectionLocked - shown when a workspace section isn't included in   */
/*  the account's plan (e.g. Renewals / Risk / Savings on Business).   */
/*  Explains the feature ships with the Team plan and offers upgrade.   */
/* ------------------------------------------------------------------ */

export function SectionLocked({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex h-full items-center justify-center bg-canvas px-5">
      <div className="mx-auto w-full max-w-md text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-xl border border-line bg-surface">
          <Lock size={18} className="text-muted" />
        </div>
        <h2 className="mt-5 text-[18px] font-semibold tracking-tight text-fg">
          {title} is included with Team
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-muted">
          {description} Your current plan doesn&apos;t include this section.
        </p>
        <div className="mt-6 flex items-center justify-center gap-2">
          <Link
            href="/dashboard?upgrade=team"
            className="inline-flex h-9 items-center rounded-md bg-white px-4 text-[13px] font-semibold text-black transition-opacity hover:opacity-90"
          >
            Upgrade to Team
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex h-9 items-center rounded-md border border-line px-4 text-[12.5px] font-medium text-muted transition-colors hover:border-white/25 hover:text-fg"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}