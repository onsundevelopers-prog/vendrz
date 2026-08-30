"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { getSession, updateSession } from "@/lib/store";
import { PIPELINE_STAGES, runPipeline, STAGE_ORDER } from "@/lib/pipeline";
import type { PipelineStage } from "@/lib/types";

export default function ProcessingPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const sessionId = params.id;
  const [currentIndex, setCurrentIndex] = useState(-1);
  const started = useRef(false);

  const session = useMemo(() => getSession(sessionId), [sessionId]);

  // React StrictMode double-invokes effects in dev, mounting → cleanup →
  // remount. The timer must survive that, so the once-guard and the
  // runPipeline call live INSIDE the timeout callback, and the cleanup only
  // clears a timer that is actually re-scheduled on the remount. Without
  // this the pipeline's timer gets cancelled and never restarts, freezing
  // the progress meter at 11%.
  useEffect(() => {
    if (!session) return;

    const timeout = setTimeout(() => {
      if (started.current) return;
      started.current = true;

      runPipeline(
        session.documentName,
        session.fileKind,
        (stage, index) => {
          setCurrentIndex(index - 1);
          updateSession(sessionId, { pipelineStatus: stage as PipelineStage });
          if (stage === "results") {
            updateSession(sessionId, {
              pipelineStatus: "complete",
              result: null, // placeholder; replaced below
            });
          }
        },
        session.extraction,
        session.richExtraction
      ).then((result) => {
        updateSession(sessionId, { pipelineStatus: "complete", result });
        router.replace(`/results/${sessionId}`);
      });
    }, 400);

    return () => clearTimeout(timeout);
  }, [session, sessionId, router]);

  if (!session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas px-5">
        <div className="text-center">
          <p className="text-[15px] text-muted">This analysis session no longer exists.</p>
          <a href="/upload" className="mt-2 inline-block text-[13px] tracking-tight text-muted underline underline-offset-4 hover:text-fg">
            Upload a contract
          </a>
        </div>
      </main>
    );
  }

  const doneCount = currentIndex + 1;

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-canvas px-5">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-lg"
      >
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl border border-line bg-surface">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
              {session.fileKind === "pdf" ? "PDF" : session.fileKind === "docx" ? "DOCX" : "DOC"}
            </span>
          </div>
          <div className="min-w-0">
            <p className="truncate text-[14px] font-medium tracking-tight text-fg">{session.documentName}</p>
            <p className="text-[12px] tracking-tight text-muted">Analyzing your contract</p>
          </div>
        </div>

        <div className="mt-8 space-y-2">
          {PIPELINE_STAGES.map((stage, i) => {
            const isDone = i < doneCount;
            const isActive = i === doneCount;
            const isFinal = stage.id === "results";
            return (
              <div
                key={stage.id}
                className={`flex items-center gap-3.5 rounded-xl border px-4 py-3 transition-all duration-300 ${
                  isActive
                    ? "border-beam border-white/25 bg-white/[0.05]"
                    : isDone
                      ? "border-sheen border-line bg-surface"
                      : "border-line bg-transparent opacity-40"
                }`}
              >
                <div
                  className={`flex size-6 shrink-0 items-center justify-center rounded-full transition-colors ${
                    isDone
                      ? "bg-white text-black"
                      : isActive
                        ? "bg-white/15 text-zinc-200"
                        : "bg-white/5 text-muted"
                  }`}
                >
                  {isDone ? (
                    <span aria-hidden="true" className="block h-[7px] w-[11px] rotate-45 border-b-2 border-r-2 border-black" />
                  ) : isActive ? (
                    <span className="size-3.5 animate-spin rounded-full border-2 border-zinc-300 border-t-transparent" />
                  ) : (
                    <span className="size-1.5 rounded-full bg-white/20" />
                  )}
                </div>
                <div className="min-w-0">
                  <p
                    className={`text-[14px] font-medium ${
                      isDone || isActive ? "text-fg" : "text-muted"
                    }`}
                  >
                    {stage.label}
                  </p>
                  <p className="text-[11.5px] tracking-tight text-muted">{stage.description}</p>
                </div>
                {isDone && !isFinal && (
                  <span className="ml-auto text-[11px] tracking-tight text-zinc-500">done</span>
                )}
                {isActive && (
                  <span className="ml-auto text-[11px] tracking-tight text-zinc-300">
                    {Math.round(((doneCount + 1) / STAGE_ORDER.length) * 100)}%
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <p className="mt-6 text-center text-[12px] tracking-tight text-muted">
          Progress updates in real time as your contract is analyzed.
        </p>
      </motion.div>
    </main>
  );
}
