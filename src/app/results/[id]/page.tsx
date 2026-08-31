"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { getSession } from "@/lib/store";
import { useAuthUser } from "@/lib/auth";
import { ResultsPreview } from "@/components/results/ResultsPreview";
import { ReviewBlur } from "@/components/results/ReviewBlur";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";

export default function ResultsPage() {
  const params = useParams<{ id: string }>();
  const session = useMemo(() => getSession(params.id), [params.id]);
  const [dismissed, setDismissed] = useState(false);
  // Sibling analyses from the same multi-file upload batch (?batch=a,b,c).
  // Read client-side after mount - purely a navigation aid.
  const [batch, setBatch] = useState<string[]>([]);

  useEffect(() => {
    const t = setTimeout(() => {
      const raw = new URLSearchParams(window.location.search).get("batch");
      if (raw) setBatch(raw.split(",").filter(Boolean));
    }, 0);
    return () => clearTimeout(t);
  }, []);

  const batchLinks = useMemo(
    () =>
      batch
        .filter((id) => id !== params.id)
        .map((id) => ({ id, session: getSession(id) }))
        .filter((b) => b.session?.result),
    [batch, params.id]
  );

  const auth = useAuthUser();
  const transferred = session?.transferredToUserId != null;
  const showSignup = !auth.id && !transferred && !dismissed && session?.result != null;

  if (!session?.result) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas px-5">
        <div className="text-center">
          <p className="text-[15px] font-medium text-fg">Analysis unavailable</p>
          <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-muted">
            We couldn&apos;t find extractable terms in this document. Nothing was
            estimated - upload the file again to retry.
          </p>
          <Link href="/upload" className="mt-4 inline-block text-[13px] tracking-tight text-muted underline underline-offset-4 hover:text-fg">
            Back to upload
          </Link>
        </div>
      </main>
    );
  }

  const result = session.result;

  return (
    <main className="min-h-screen bg-canvas">
      {/* slim top bar */}
      <header className="sticky top-0 z-40 border-b border-line bg-canvas/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 lg:px-8">
          <Link href="/">
            <Logo />
          </Link>
          <div className="flex items-center gap-3">
            {auth.id && (
              <span className="hidden items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-[12px] tracking-tight text-muted sm:inline-flex">
                Saved to your account
              </span>
            )}
            <Button href="/upload" size="sm" variant="outline">
              Scan another
            </Button>
            <Button href="/dashboard" size="sm">
              Go to workspace
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-10 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[12px] tracking-tight text-muted">
                Analysis complete · {new Date(result.analyzedAt).toLocaleString("en-US", { month: "long", day: "numeric", hour: "numeric", minute: "2-digit" })}
              </p>
              <h1 className="mt-1 text-2xl font-semibold leading-[1.05] tracking-[-0.035em] text-fg sm:text-3xl">
                {result.vendorName} · {result.documentName}
              </h1>
            </div>
            {/* Batch navigator - every analysis from a multi-file upload. */}
            {batchLinks.length > 0 && (
              <div className="w-full sm:w-auto">
                <p className="text-[10.5px] font-semibold tracking-[0.14em] text-muted">
                  {batchLinks.length + 1} analyses in this batch
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {batch.map((id) => {
                    const s = getSession(id);
                    const active = id === params.id;
                    return (
                      <Link
                        key={id}
                        href={`/results/${id}?batch=${encodeURIComponent(batch.join(","))}`}
                        className={`inline-flex max-w-[220px] items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11.5px] tracking-tight transition-colors ${
                          active
                            ? "border-white/30 bg-white/[0.08] text-fg"
                            : "border-line bg-surface text-muted hover:border-line-strong hover:text-fg"
                        }`}
                      >
                        <span className="size-1 shrink-0 rounded-full bg-zinc-500" aria-hidden="true" />
                        <span className="truncate">
                          {s?.result?.vendorName || s?.documentName || id.slice(0, 12)}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2 text-[12px] tracking-tight text-muted">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1">
                Encrypted · never shared
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1">
                Retention: {new Date(session.expiresAt + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            </div>
          </div>

          <ReviewBlur blurred={!auth.id} sessionId={params.id}>
            <ResultsPreview result={result} />
          </ReviewBlur>
        </motion.div>
      </div>

      {/* persistent, non-blocking signup CTA */}
      {showSignup && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="sticky bottom-4 z-40 mx-auto mb-4 w-[calc(100%-2.5rem)] max-w-2xl"
        >
          <div className="border-sheen relative overflow-hidden rounded-xl border border-line bg-panel p-5">
            <button
              onClick={() => setDismissed(true)}
              aria-label="Dismiss"
              className="absolute right-3 top-3 flex size-7 items-center justify-center rounded-lg text-[15px] text-muted hover:bg-white/5 hover:text-fg"
            >
              ×
            </button>
            <div className="relative flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-line bg-white/[0.06]">
                <span className="text-[12px] font-semibold tracking-tight text-fg">14d</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold text-fg">
                  Don&apos;t lose this analysis
                </p>
                <p className="mt-0.5 text-[13px] font-normal leading-relaxed tracking-[-0.01em] text-muted">
                  This report expires in 14 days. Create a free account and we&apos;ll
                  keep tracking this contract - renewal deadlines, escalations, and
                  new opportunities - then alert you before they slip past.
                </p>
              </div>
              <Button
                href={`/auth?mode=signup&session=${session.id}&next=${encodeURIComponent("/dashboard")}`}
                className="shrink-0"
              >
                Save & track it free
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </main>
  );
}
