"use client";

import { useEffect, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { getAuditSession, updateAuditSession } from "@/lib/store";

/* ------------------------------------------------------------------ */
/*  Review processing - honest only.                                  */
/*  If a real data source was connected (extraction present), we       */
/*  genuinely move it to the results page. If there is no data source, */
/*  we say so plainly instead of pretending to analyze anything.       */
/*  No fabricated pipeline, no fake progress.                          */
/* ------------------------------------------------------------------ */

export default function AuditProcessingPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const sessionId = params.id;
  const session = useMemo(() => getAuditSession(sessionId), [sessionId]);
  const redirected = useRef(false);

  const hasRealData = !!session?.extraction || !!session?.result;

  useEffect(() => {
    if (!session || redirected.current) return;
    redirected.current = true;
    if (hasRealData) {
      // Real data exists - the analysis is already done; go to the report.
      updateAuditSession(sessionId, { pipelineStatus: "complete" });
      router.replace(`/audit/results/${sessionId}`);
    } else {
      // No data source connected. Be honest: there is nothing to analyze.
      updateAuditSession(sessionId, { pipelineStatus: "complete", result: null });
      router.replace(`/audit/results/${sessionId}`);
    }
  }, [session, sessionId, router, hasRealData]);

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
        ) : (
          <>
            <p className="text-[15px] font-medium text-fg">No data source connected yet</p>
            <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-muted">
              This review has no connected data source, so there is nothing to analyze.
              Upload a contract to get real results.
            </p>
            <Link
              href="/audit"
              className="mt-5 inline-block rounded-md bg-white px-3.5 py-2 text-[13px] font-medium text-black transition-opacity hover:opacity-90"
            >
              Upload a contract
            </Link>
          </>
        )}
      </motion.div>
    </main>
  );
}