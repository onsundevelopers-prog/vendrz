"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getAuditSession, enterDemoMode } from "@/lib/store";
import { generateAnalysis } from "@/lib/pipeline";
import type { AnalysisResult } from "@/lib/types";
import { ResultsPreview } from "@/components/results/ResultsPreview";

export default function AuditResultsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
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
          <p className="text-[14px] text-muted">Analysis not ready yet.</p>
          <Link
            href="/audit"
            className="mt-2 inline-block text-[13px] text-muted underline underline-offset-4 hover:text-fg"
          >
            Run a scan
          </Link>
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
            Vendrz
          </span>
          <button
            onClick={() => {
              enterDemoMode();
              router.push("/dashboard");
            }}
            className="flex h-7 items-center rounded-md bg-white px-3 text-[12.5px] font-medium text-black transition-opacity hover:opacity-90"
          >
            Open dashboard
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-5 py-8 lg:px-8">
        <ResultsPreview result={analysis as AnalysisResult} />
      </div>
    </main>
  );
}