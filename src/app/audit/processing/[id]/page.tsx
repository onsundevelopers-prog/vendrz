"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { getAuditSession, updateAuditSession } from "@/lib/store";
import type { ContractExtraction } from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Review processing - live progress.                                */
/*                                                                     */
/*  When a file was uploaded and the server returned a queued job id   */
/*  (persistent servers), this page polls /api/extract/status/:jobId   */
/*  every 2 seconds, shows real progress, and routes to the report     */
/*  the moment the analysis completes. When the analysis already       */
/*  finished inside the upload response (serverless), it passes        */
/*  straight through to the results. No fabricated pipeline.           */
/* ------------------------------------------------------------------ */

const STAGE_LABELS: Record<string, string> = {
  queued: "Queued - analysis is about to start",
  uploading: "Uploading your file",
  extracting_text: "Reading your document",
  preprocessing: "Organizing the content",
  analyzing: "Extracting your contract terms with AI",
  validating: "Checking the findings against the source",
  persisting: "Building your report",
  complete: "Done",
  failed: "Analysis couldn't be completed",
};

interface JobProgress {
  sid: string;
  status: string;
  overall: number;
}

export default function AuditProcessingPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = params.id;

  const session = useMemo(() => getAuditSession(sessionId), [sessionId]);
  const [progress, setProgress] = useState<JobProgress[]>([]);
  const [failed, setFailed] = useState(false);
  const redirected = useRef(false);

  // Jobs map: { [sessionId]: jobId } passed from the audit page so every
  // file uploaded in the same batch gets its session completed.
  const jobs = useMemo<Record<string, string>>(() => {
    try {
      const parsed = JSON.parse(searchParams.get("jobs") ?? "{}") as Record<string, string>;
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }, [searchParams]);

  const hasRealData = !!session?.extraction || !!session?.result;

  useEffect(() => {
    if (!session || redirected.current) return;
    redirected.current = true;

    if (hasRealData) {
      // Real data exists - the analysis is already done; go to the report.
      updateAuditSession(sessionId, { pipelineStatus: "complete" });
      router.replace(`/audit/results/${sessionId}`);
      return;
    }

    const entries = Object.entries(jobs);
    if (entries.length === 0) {
      // No data source and no job to poll. Be honest: nothing to analyze.
      updateAuditSession(sessionId, { pipelineStatus: "complete", result: null });
      router.replace(`/audit/results/${sessionId}`);
      return;
    }

    let alive = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const pollAll = async () => {
      const results = await Promise.all(
        entries.map(async ([sid, jobId]): Promise<{
          sid: string;
          status: string;
          overall: number;
          result?: { extraction?: ContractExtraction; documentName?: string };
        }> => {
          try {
            const res = await fetch(`/api/extract/status/${jobId}`);
            if (!res.ok) return { sid, status: "lost", overall: 0 };
            const data = (await res.json()) as {
              status?: string;
              overallProgress?: number;
              result?: { extraction?: ContractExtraction; documentName?: string };
            };
            return {
              sid,
              status: data.status ?? "queued",
              overall: data.overallProgress ?? 0,
              result: data.result,
            };
          } catch {
            return { sid, status: "unreachable", overall: 0 };
          }
        })
      );
      if (!alive) return;

      setProgress(
        results.map((r) => ({ sid: r.sid, status: r.status, overall: r.overall }))
      );

      // Persist finished / failed sessions so the workspace and report
      // reflect reality even for files we don't open first.
      for (const r of results) {
        if (r.status === "complete" && r.result?.extraction) {
          const existing = getAuditSession(r.sid);
          updateAuditSession(r.sid, {
            extraction: r.result.extraction,
            documentName: existing?.documentName ?? r.result.documentName,
            pipelineStatus: "complete",
          });
        } else if (r.status === "failed") {
          updateAuditSession(r.sid, { pipelineStatus: "failed" });
        }
      }

      const mine = results.find((r) => r.sid === sessionId);
      if (mine?.status === "complete" && mine.result?.extraction) {
        router.replace(`/audit/results/${sessionId}`);
        return;
      }
      if (mine?.status === "failed" || results.every((r) => r.status === "failed" || r.status === "lost")) {
        setFailed(true);
        return;
      }
      timer = setTimeout(pollAll, 2000);
    };

    void pollAll();
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, [session, sessionId, jobs, router, hasRealData]);

  if (!session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas px-5">
        <div className="text-center">
          <p className="text-[15px] text-muted">This review session no longer exists.</p>
          <Link href="/audit" className="mt-2 inline-block text-[13px] tracking-tight text-muted underline underline-offset-4 hover:text-fg">
            Run a free review
          </Link>
        </div>
      </main>
    );
  }

  const mine = progress.find((p) => p.sid === sessionId);
  const stage = mine?.status ?? "queued";
  const overall = Math.max(mine?.overall ?? 0, 4);
  const stageLabel = STAGE_LABELS[stage] ?? "Analyzing your document";

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-canvas px-5">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md text-center"
      >
        {hasRealData ? (
          <>
            <p className="text-[15px] font-medium text-fg">Opening your report</p>
            <p className="mt-2 text-[13px] leading-relaxed text-muted">
              Your extracted data is ready — taking you there now.
            </p>
          </>
        ) : failed ? (
          <>
            <p className="text-[15px] font-medium text-fg">The analysis didn&apos;t complete</p>
            <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-muted">
              Something went wrong while analyzing this file. Please try again.
            </p>
            <Link
              href="/audit"
              className="mt-5 inline-block rounded-md bg-white px-3.5 py-2 text-[13px] font-medium text-black transition-opacity hover:opacity-90"
            >
              Try another file
            </Link>
          </>
        ) : (
          <>
            <p className="text-[15px] font-medium text-fg">Analyzing your contract</p>
            <p className="mt-2 truncate text-[13px] leading-relaxed text-muted">
              {session.documentName ?? "Your document"}
            </p>

            {/* live progress */}
            <div className="mt-6">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
                <div
                  className="h-full rounded-full bg-[#e4e4e7] transition-all duration-500 ease-out"
                  style={{ width: `${Math.min(overall, 100)}%` }}
                />
              </div>
              <p className="mt-3 text-[12px] tracking-tight text-muted">{stageLabel}</p>
              <p className="mt-1 text-[11px] tabular-nums text-muted/60">
                {Math.min(overall, 100)}% · usually under a minute
              </p>
            </div>

            {progress.length > 1 && (
              <p className="mt-4 text-[11.5px] tracking-tight text-muted/70">
                {progress.filter((p) => p.status === "complete").length} of {progress.length} files done
              </p>
            )}
          </>
        )}
      </motion.div>
    </main>
  );
}
