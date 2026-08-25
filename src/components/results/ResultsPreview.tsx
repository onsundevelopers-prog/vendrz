"use client";

import type { AnalysisResult } from "@/lib/types";
import { money } from "@/lib/format";

/* ------------------------------------------------------------------ */
/*  Minimal result view - one quiet Fey-style surface.                 */
/*  Risk + savings as clean numbers, findings as a simple list.        */
/* ------------------------------------------------------------------ */

function fmtDate(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function riskTone(score: number): {
  label: string;
  text: string;
  bar: string;
} {
  if (score >= 75)
    return { label: "High risk", text: "text-red-400", bar: "#f87171" };
  if (score >= 50)
    return { label: "Moderate risk", text: "text-zinc-300", bar: "#d4d4d8" };
  if (score >= 30)
    return { label: "Low risk", text: "text-zinc-400", bar: "#a1a1aa" };
  return { label: "Low risk", text: "text-zinc-500", bar: "#71717a" };
}

/* ---------------- main ---------------- */

export function ResultsPreview({
  result,
  compact = false,
}: {
  result: AnalysisResult;
  compact?: boolean;
}) {
  const tone = riskTone(result.riskScore);
  const findings = result.findings.slice(0, compact ? 2 : 8);
  const ring = 44;
  const circ = 2 * Math.PI * ring;
  const offset = circ * (1 - result.riskScore / 100);

  return (
    <div className="w-full overflow-hidden rounded-xl border border-white/[0.08] bg-[#111113]">
      {/* header - doc name */}
      <div className="flex items-center gap-3 border-b border-white/[0.06] px-5 py-3">
        <div className="flex size-8 items-center justify-center rounded-lg bg-white/[0.06]">
          <span className="text-[10px] font-semibold uppercase text-zinc-300">
            {result.documentName.toLowerCase().endsWith(".pdf")
              ? "PDF"
              : result.documentName.toLowerCase().endsWith(".docx")
                ? "DOCX"
                : "DOC"}
          </span>
        </div>
        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-medium text-fg">
            {result.documentName}
          </p>
          <p className="text-[11.5px] text-zinc-500">
            {result.vendorName} · analyzed{" "}
            {new Date(result.analyzedAt).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        </div>
      </div>

      <div
        className={`grid gap-0 ${compact ? "lg:grid-cols-[280px_1fr]" : "lg:grid-cols-[300px_1fr]"}`}
      >
        {/* left - risk + core facts */}
        <div className="border-b border-white/[0.06] p-5 lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-4">
            <div className="relative size-24 shrink-0">
              <svg width="96" height="96" viewBox="0 0 96 96" className="-rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r={ring}
                  fill="none"
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth="7"
                />
                <circle
                  cx="48"
                  cy="48"
                  r={ring}
                  fill="none"
                  stroke={tone.bar}
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray={circ}
                  strokeDashoffset={offset}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-xl font-semibold tabular-nums ${tone.text}`}>
                  {result.riskScore}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-zinc-500">
                  /100
                </span>
              </div>
            </div>
            <div>
              <p className={`text-[13px] font-medium ${tone.text}`}>{tone.label}</p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-zinc-500">
                Based on renewal terms, escalation, and cancellation risk.
              </p>
            </div>
          </div>

          {/* savings */}
          <div className="mt-5">
            <p className="text-[10px] uppercase tracking-[0.1em] text-zinc-500">
              Potential savings
            </p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-fg">
              {money(result.savings.low)}–{money(result.savings.high)}
              <span className="ml-1 text-xs font-normal text-zinc-500">/yr</span>
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
              Estimated range, not guaranteed. Based on{" "}
              {result.opportunities.length} identified{" "}
              {result.opportunities.length === 1 ? "opportunity" : "opportunities"}.
            </p>
          </div>

          {/* core facts */}
          <div className="mt-5 space-y-1.5">
            {result.renewalDate && (
              <FactRow label="Renews" value={fmtDate(result.renewalDate)} />
            )}
            {result.cancellationDeadline && (
              <FactRow label="Cancel by" value={fmtDate(result.cancellationDeadline)} />
            )}
            {result.autoRenew != null && (
              <FactRow
                label="Auto-renew"
                value={`${result.autoRenewNoticeDays ?? "-"} day notice`}
              />
            )}
            {result.annualValue ? (
              <FactRow label="Annual value" value={money(result.annualValue)} />
            ) : null}
            {result.priceEscalation?.rate != null ? (
              <FactRow
                label="Escalation"
                value={`${result.priceEscalation.rate}% per year`}
              />
            ) : null}
          </div>
        </div>

        {/* right - findings */}
        <div className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <h3 className="text-[13px] font-medium text-fg">Key findings</h3>
            <span className="rounded-full bg-white/[0.08] px-1.5 text-[10.5px] text-zinc-400">
              {findings.length}
            </span>
          </div>
          <div className="-mr-2 space-y-2">
            {findings.map((f) => (
              <div key={f.id} className="flex gap-3">
                <span
                  className={`mt-1.5 size-1.5 shrink-0 rounded-full ${
                    f.severity === "critical"
                      ? "bg-red-400"
                      : "bg-zinc-600"
                  }`}
                />
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2">
                    <p className="text-[13px] font-medium text-fg">{f.title}</p>
                    <span className="text-[10.5px] tabular-nums text-zinc-500">
                      {Math.round(f.confidence * 100)}% conf.
                    </span>
                  </div>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-zinc-400">
                    {f.detail}
                  </p>
                  <p className="mt-1.5 text-[11px] italic leading-relaxed text-zinc-500">
                    “{f.evidence.excerpt}”
                  </p>
                  <p className="mt-0.5 text-[10px] text-zinc-600">
                    {f.evidence.section} · p. {f.evidence.page}
                  </p>
                </div>
              </div>
            ))}
            {findings.length === 0 && (
              <p className="text-[12.5px] text-zinc-500">No notable clauses found.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FactRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 border-b border-white/[0.05] px-1 py-1.5">
      <span className="text-[10.5px] uppercase tracking-wider text-zinc-500">
        {label}
      </span>
      <span className="ml-auto text-[12.5px] tabular-nums text-fg">{value}</span>
    </div>
  );
}