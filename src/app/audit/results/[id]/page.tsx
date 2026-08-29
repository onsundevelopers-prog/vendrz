"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getAuditSession } from "@/lib/store";
import { generateAnalysis } from "@/lib/pipeline";
import type { AnalysisResult } from "@/lib/types";
import { ResultsPreview } from "@/components/results/ResultsPreview";

export default function AuditResultsPage() {
  const params = useParams<{ id: string }>();
  const session = useMemo(() => getAuditSession(params.id), [params.id]);
  const audit = session?.result;

  const extractionAnalysis = useMemo(() => {
    if (!session?.extraction) return null;
    return generateAnalysis(
      session.documentName ?? "Uploaded contract.pdf",
      "pdf",
      { extraction: session.extraction }
    );
  }, [session]);

  const analysis = extractionAnalysis ?? audit ?? null;

  if (!analysis) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas px-5">
        <div className="text-center">
          <p className="text-[15px] font-medium text-fg">No data to show yet</p>
          <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-muted">
            This review has no connected data source, so there is nothing to
            analyze yet. Upload a contract to get real results.
          </p>
          <div className="mt-5 flex items-center justify-center gap-2">
            <Link
              href="/audit"
              className="inline-block rounded-md bg-white px-3.5 py-2 text-[12.5px] font-medium text-black transition-opacity hover:opacity-90"
            >
              Upload a contract
            </Link>
            <Link
              href="/dashboard"
              className="inline-block rounded-md border border-line px-3.5 py-2 text-[12.5px] font-medium text-muted transition-colors hover:border-white/25 hover:text-fg"
            >
              Open workspace
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#08080a]">
      {/* slim top bar */}
      <header className="sticky top-0 z-40 border-b border-line bg-[#08080a]/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-5 lg:px-8">
          <span className="text-[14px] font-semibold tracking-[-0.02em] text-fg">
            Noma
          </span>
          <Link
            href="/dashboard"
            className="flex h-7 items-center rounded-md bg-white px-3 text-[12.5px] font-medium text-black transition-opacity hover:opacity-90"
          >
            Open workspace
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-5 py-8 lg:px-8">
        <ResultsPreview result={analysis as AnalysisResult} />
      </div>
    </main>
  );
}