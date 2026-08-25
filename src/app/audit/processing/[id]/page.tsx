"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { getAuditSession, updateAuditSession } from "@/lib/store";
import { AUDIT_STAGES, AUDIT_STAGE_ORDER } from "@/lib/services/audit";
import { buildCompanyAudit } from "@/lib/services/audit";
import type { AuditStage } from "@/lib/types";

const STAGE_DURATION_MS: Record<AuditStage, number> = {
  connect: 900,
  collect: 1400,
  normalize: 1100,
  match: 1500,
  analyze: 1600,
  opportunities: 1200,
  recommend: 1000,
  results: 800,
};

export default function AuditProcessingPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const sessionId = params.id;
  const [currentIndex, setCurrentIndex] = useState(-1);
  const flow = useRef<{ startedAt: number | null; finished: boolean }>({ startedAt: null, finished: false });

  const session = useMemo(() => getAuditSession(sessionId), [sessionId]);

  useEffect(() => {
    if (!session) return;
    // Refs persist across StrictMode's double-mount, so progress isn't reset and
    // the completion path runs exactly once even if the effect re-runs.
    if (flow.current.startedAt === null) flow.current.startedAt = Date.now();
    const startedAt = flow.current.startedAt;

    const START_DELAY_MS = 400;

    // Wall-clock driven so background-tab timer throttling can't stall the flow.
    const tick = () => {
      const elapsed = Date.now() - startedAt - START_DELAY_MS;
      let index = 0;
      let acc = 0;
      for (; index < AUDIT_STAGE_ORDER.length; index++) {
        const duration = STAGE_DURATION_MS[AUDIT_STAGE_ORDER[index]];
        if (elapsed < acc + duration) break;
        acc += duration;
      }
      const clamped = Math.min(index, AUDIT_STAGE_ORDER.length - 1);
      const stage = AUDIT_STAGE_ORDER[clamped];
      setCurrentIndex(clamped);
      updateAuditSession(sessionId, { pipelineStatus: stage });
      if (stage === "results" && !flow.current.finished) {
        flow.current.finished = true;
        clearInterval(interval);
        const audit = buildCompanyAudit();
        updateAuditSession(sessionId, { pipelineStatus: "complete", result: audit });
        setTimeout(() => router.replace(`/audit/results/${sessionId}`), 700);
      }
    };

    const interval = setInterval(tick, 200);
    return () => clearInterval(interval);
  }, [session, sessionId, router]);

  if (!session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas px-5">
        <div className="text-center">
          <p className="text-[15px] text-muted">This audit session no longer exists.</p>
          <a href="/audit" className="mt-2 inline-block text-[13px] tracking-tight text-emerald-400 underline underline-offset-4">
            Run a free audit
          </a>
        </div>
      </main>
    );
  }

  const doneCount = currentIndex + 1;
  const pct = Math.round(((doneCount) / AUDIT_STAGE_ORDER.length) * 100);

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-canvas px-5">
      <div className="bg-grid-dark absolute inset-0 opacity-50" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-lg"
      >
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl border border-line bg-surface">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-400">
              Scan
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-[14px] font-medium tracking-tight text-fg">
              Vendor spend audit · {session.companyName}
            </p>
            <p className="text-[12px] tracking-tight text-muted">
              {session.source === "gmail"
                ? "Scanning inbox for vendor contracts"
                : session.source === "aws"
                  ? "Analyzing AWS billing & usage"
                  : "Analyzing your contract"}
            </p>
          </div>
        </div>

        {/* progress ring */}
        <div className="mt-8 flex items-center gap-5">
          <div className="relative flex size-20 shrink-0 items-center justify-center">
            <svg width="80" height="80" viewBox="0 0 80 80" className="-rotate-90">
              <circle cx="40" cy="40" r="34" stroke="rgba(255,255,255,0.08)" strokeWidth="5" fill="none" />
              <motion.circle
                cx="40"
                cy="40"
                r="34"
                stroke="#34d399"
                strokeWidth="5"
                strokeLinecap="round"
                fill="none"
                strokeDasharray={2 * Math.PI * 34}
                initial={{ strokeDashoffset: 2 * Math.PI * 34 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 34 * (1 - pct / 100) }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              />
            </svg>
            <span className="absolute text-[15px] font-semibold tracking-tight text-fg">{pct}%</span>
          </div>
          <div>
            <p className="text-[15px] font-semibold tracking-[-0.01em] text-fg">
              Building your spend intelligence
            </p>
            <p className="mt-1 text-[12px] tracking-tight text-muted">
              Transactions → vendors → opportunities → recommendations
            </p>
          </div>
        </div>

        {/* stage list */}
        <div className="mt-7 space-y-1.5">
          {AUDIT_STAGES.map((stage, i) => {
            const isDone = i < doneCount;
            const isActive = i === doneCount;
            return (
              <div
                key={stage.id}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 transition-all duration-300 ${
                  isActive
                    ? "border border-emerald-500/30 bg-emerald-500/[0.07]"
                    : isDone
                      ? "border border-line bg-surface/60"
                      : "border border-transparent opacity-35"
                }`}
              >
                <div
                  className={`flex size-5 shrink-0 items-center justify-center rounded-full ${
                    isDone
                      ? "bg-emerald-500 text-black"
                      : isActive
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "bg-white/5 text-muted"
                  }`}
                >
                  {isDone ? (
                    <span aria-hidden="true" className="block h-[6px] w-[9px] rotate-45 border-b-2 border-r-2 border-black" />
                  ) : isActive ? (
                    <span className="size-3 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
                  ) : (
                    <span className="size-1 rounded-full bg-white/20" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-[13.5px] font-medium ${isDone || isActive ? "text-fg" : "text-muted"}`}>
                    {stage.label}
                  </p>
                  <p className="text-[11px] tracking-tight text-muted">{stage.description}</p>
                </div>
                {isActive && <span className="text-[11px] tracking-tight text-emerald-400">running…</span>}
              </div>
            );
          })}
        </div>

        <p className="mt-6 text-center text-[11.5px] tracking-tight text-muted/70">
          Read-only analysis of sample data · nothing is written to your accounts
        </p>
      </motion.div>
    </main>
  );
}
