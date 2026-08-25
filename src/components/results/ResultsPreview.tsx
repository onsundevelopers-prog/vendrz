"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { AnalysisResult, Finding } from "@/lib/types";
import { RiskBadge, riskTone } from "@/components/ui/RiskBadge";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { money } from "@/lib/mockData";

/* ---------------- risk gauge ---------------- */

function RiskGauge({ score, label }: { score: number; label: string }) {
  const tone = riskTone(score);
  const R = 52;
  const CIRC = 2 * Math.PI * R;
  const offset = CIRC * (1 - score / 100);
  return (
    <div className="relative flex items-center justify-center">
      <svg width="148" height="148" viewBox="0 0 148 148" className="-rotate-90">
        <circle cx="74" cy="74" r={R} stroke="currentColor" strokeWidth="10" fill="none" className="text-white/[0.06]" />
        <motion.circle
          cx="74"
          cy="74"
          r={R}
          stroke={tone.bar === "bg-white" ? "#ffffff" : tone.bar === "bg-zinc-300" ? "#d4d4d8" : tone.bar === "bg-zinc-400" ? "#a1a1aa" : "#71717a"}
          strokeWidth="10"
          strokeLinecap="round"
          fill="none"
          strokeDasharray={CIRC}
          initial={{ strokeDashoffset: CIRC }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.1, ease: [0, 0, 0.2, 1], delay: 0.2 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-4xl font-semibold tabular-nums tracking-tight ${tone.text}`}>{score}</span>
        <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">/ 100</span>
      </div>
      <span
        className={`absolute -bottom-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${tone.chip}`}
      >
        {label} risk
      </span>
    </div>
  );
}

/* ---------------- finding row ---------------- */

function SeverityMark({ severity }: { severity: Finding["severity"] }) {
  if (severity === "critical") {
    return (
      <span className="flex size-4 items-center justify-center rounded-full bg-red-500/20 text-[10px] font-bold leading-none text-red-400">
        !
      </span>
    );
  }
  if (severity === "warning") {
    return (
      <span className="flex size-4 items-center justify-center rounded-full bg-zinc-300/15 text-[10px] font-bold leading-none text-zinc-300">
        !
      </span>
    );
  }
  return (
    <span className="flex size-4 items-center justify-center rounded-full bg-zinc-500/15 text-[10px] font-bold leading-none text-zinc-500">
      i
    </span>
  );
}

function FindingRow({ finding }: { finding: Finding }) {
  return (
    <div className="glass-border glass-glow group rounded-xl p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.06]">
          <SeverityMark severity={finding.severity} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold tracking-[-0.01em] text-fg">{finding.title}</p>
            <span className="ml-auto hidden shrink-0 text-[11px] tabular-nums text-muted sm:inline">
              {Math.round(finding.confidence * 100)}% conf.
            </span>
          </div>
          <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{finding.detail}</p>
          <div className="mt-2.5 flex items-start gap-2 rounded-lg bg-white/[0.04] px-3 py-2">
            <span className="shrink-0 font-serif text-[15px] leading-none text-zinc-500">“</span>
            <div className="min-w-0">
              <p className="text-xs italic leading-relaxed text-zinc-400">
                “{finding.evidence.excerpt}”
              </p>
              <p className="mt-1 text-[11px] text-muted">
                {finding.evidence.section} · p. {finding.evidence.page}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- main component ---------------- */

export function ResultsPreview({
  result,
  compact = false,
}: {
  result: AnalysisResult;
  compact?: boolean;
}) {
  const [tab, setTab] = useState<"findings" | "method">("findings");
  const keyFindings = result.findings.slice(0, compact ? 2 : 4);

  return (
    <SpotlightCard className="glass-border w-full overflow-hidden rounded-2xl shadow-glow">
      {/* header */}
      <div className="flex items-center gap-3 border-b border-line px-5 py-3.5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-white/10">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-fg">
            {result.documentName.toLowerCase().endsWith(".pdf")
              ? "PDF"
              : result.documentName.toLowerCase().endsWith(".docx")
                ? "DOCX"
                : "DOC"}
          </span>
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-[-0.01em] text-fg">
            {result.documentName}
          </p>
          <p className="text-xs text-muted">
            {result.vendorName} · analyzed {new Date(result.analyzedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
          </p>
        </div>
        <RiskBadge score={result.riskScore} label={result.riskLabel} size="sm" />
      </div>

      <div className={`grid gap-0 ${compact ? "lg:grid-cols-[260px_1fr]" : "lg:grid-cols-[280px_1fr]"}`}>
        {/* left rail — risk + savings */}
        <div className="border-b border-line p-5 lg:border-b-0 lg:border-r">
          <RiskGauge score={result.riskScore} label={result.riskLabel} />

          <div className="glass-border mt-6 rounded-xl p-4">
            <p className="text-xs font-medium uppercase tracking-[0.1em] text-muted">
              Potential savings
            </p>
            <p className="mt-2 text-xl font-semibold tabular-nums tracking-tight text-fg">
              {money(result.savings.low)}–{money(result.savings.high)}
              <span className="ml-1 text-xs font-normal text-muted/60">/yr</span>
            </p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-white/50">
              Estimated range, not guaranteed. Based on {result.opportunities.length}{" "}
              identified {result.opportunities.length === 1 ? "opportunity" : "opportunities"}.
            </p>
          </div>

          <div className="mt-4 space-y-1.5">
            {result.renewalDate && <KeyFact label="Renews" value={fmtDate(result.renewalDate)} />}
            {result.cancellationDeadline && <KeyFact label="Cancel by" value={fmtDate(result.cancellationDeadline)} />}
            {result.autoRenew && <KeyFact label="Auto-renew" value={`${result.autoRenewNoticeDays ?? "—"} day notice`} />}
            {result.annualValue ? <KeyFact label="Annual value" value={money(result.annualValue)} /> : null}
          </div>
        </div>

        {/* right — findings / method */}
        <div className="p-5">
          <div className="relative mb-4 flex items-center gap-1 rounded-lg bg-white/[0.06] p-1">
            {(
              [
                ["findings", "Key findings", result.findings.length],
                ["method", "How we calculated", null],
              ] as const
            ).map(([key, label, count]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`relative flex-1 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${
                  tab === key ? "text-fg" : "text-muted hover:text-fg"
                }`}
              >
                {tab === key && (
                  <motion.span
                    layoutId="results-tab-pill"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    className="absolute inset-0 rounded-md bg-surface shadow-sm"
                  />
                )}
                <span className="relative z-10">
                  {label}
                  {count !== null ? (
                    <span className="ml-1.5 rounded-full bg-white/10 px-1.5 py-0.5 text-[10px]">{count}</span>
                  ) : null}
                </span>
              </button>
            ))}
          </div>

          {tab === "findings" ? (
            <div className="space-y-2.5">
              {keyFindings.map((f) => (
                <FindingRow key={f.id} finding={f} />
              ))}
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="glass-border flex items-start gap-2 rounded-xl p-3.5">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-white/50" />
                <p className="text-[13px] leading-relaxed text-zinc-400">{result.method[0]}</p>
              </div>
              {result.opportunities.map((o) => (
                <div key={o.id} className="glass-border rounded-xl p-3.5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-fg">{o.type}</p>
                    <p className="text-sm font-medium tabular-nums text-fg">
                      {money(o.estimatedLow)}–{money(o.estimatedHigh)}
                    </p>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted">{o.basis}</p>
                </div>
              ))}
              <p className="px-1 text-[11px] text-muted">
                Estimates are informational and not guaranteed. Negotiation outcomes vary by vendor and market.
              </p>
            </div>
          )}
        </div>
      </div>
    </SpotlightCard>
  );
}

function KeyFact({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-line px-3 py-2">
      <span className="size-1.5 rounded-full bg-zinc-500" />
      <span className="text-xs font-medium uppercase tracking-wide text-muted">{label}</span>
      <span className="ml-auto text-[13px] font-medium tabular-nums text-fg">{value}</span>
    </div>
  );
}

function fmtDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
