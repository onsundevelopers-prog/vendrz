"use client";

import type { AnalysisResult } from "@/lib/types";
import { money, moneyShort } from "@/lib/format";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BarChart, AreaChart } from "@/components/ui/charts";

/* ------------------------------------------------------------------ */
/*  Free review report - organized like a Linear insights dashboard.   */
/*                                                                     */
/*  Top row: KPI stat cards with a single large number each. Then      */
/*  full-width bar charts with gridlines (severity, type), a tidy      */
/*  name/count breakdown table, the savings run-rate, and the key      */
/*  terms - every figure drawn from the real analysis. Nothing is      */
/*  invented.                                                          */
/* ------------------------------------------------------------------ */

const FINDING_TYPE_LABELS: Record<string, string> = {
  renewal: "Renewal",
  cancellation: "Cancellation",
  auto_renewal: "Auto-renew",
  price_escalation: "Escalation",
  opportunity: "Opportunity",
  risk: "Risk",
};

const OPP_TYPE_LABELS: Record<string, string> = {
  unused_seats: "Seats",
  duplicate_tools: "Duplicates",
  contract_optimization: "Contract",
  price_increase: "Price inc.",
  cancellation: "Cancel",
  billing_discrepancy: "Billing",
  usage_optimization: "Usage",
  license_reduction: "License",
};

function fmtDate(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/* Severity and type colors - monochrome zinc scale, Linear-style. */
const SEV_COLOR: Record<string, string> = {
  critical: "#f4f4f5",
  warning: "#a1a1aa",
  info: "#52525b",
};

const TYPE_COLORS = ["#f4f4f5", "#d4d4d8", "#a1a1aa", "#71717a", "#52525b"];

/* ---------------- main ---------------- */

export function ResultsPreview({
  result,
  compact = false,
}: {
  result: AnalysisResult;
  compact?: boolean;
}) {
  const findings = result.findings;
  const opportunities = result.opportunities;
  const topFindings = findings.slice(0, compact ? 2 : 3);

  const criticalCount = findings.filter((f) => f.severity === "critical").length;
  const warningCount = findings.filter((f) => f.severity === "warning").length;
  const infoCount = findings.filter((f) => f.severity === "info").length;

  /* ---- severity series (drives the full-width bar chart) ---- */
  const sevData: { label: string; value: number; color: string }[] = [];
  const sevOrder = ["critical", "warning", "info"] as const;
  for (const sev of sevOrder) {
    const count = findings.filter((f) => f.severity === sev).length;
    if (count === 0) continue;
    const name = sev[0].toUpperCase() + sev.slice(1);
    sevData.push({ label: name, value: count, color: SEV_COLOR[sev] });
  }

  /* ---- findings by type (drives the breakdown chart + table) ---- */
  const typeCounts = new Map<string, number>();
  for (const f of findings) {
    typeCounts.set(f.type, (typeCounts.get(f.type) ?? 0) + 1);
  }
  const typeEntries = [...typeCounts.entries()].sort((a, b) => b[1] - a[1]);
  const typeData = typeEntries.slice(0, 6).map(([type, count], i) => ({
    label: (FINDING_TYPE_LABELS[type] ?? type).slice(0, 9),
    value: count,
    color: TYPE_COLORS[i % TYPE_COLORS.length],
  }));

  /* ---- savings run-rate: real annual low/high spread across 12 months ---- */
  const now = new Date();
  const savingsSeries = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now);
    d.setMonth(d.getMonth() + i);
    return {
      label: d.toLocaleDateString("en-US", { month: "short" }),
      value: Math.round(result.savings.high / 12),
    };
  });

  /* ---- risk score tone ---- */
  const score = result.riskScore;
  const tone =
    score >= 75
      ? { label: "High risk", color: "#f4f4f5" }
      : score >= 50
        ? { label: "Moderate risk", color: "#d4d4d8" }
        : score >= 30
          ? { label: "Low risk", color: "#a1a1aa" }
          : { label: "Low risk", color: "#71717a" };

  return (
    <div className="w-full">
      {/* ------------------------------ header ------------------------------ */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-md border border-line bg-surface">
          <span className="text-[10px] font-semibold text-zinc-300">
            {result.documentName.toLowerCase().endsWith(".pdf")
              ? "PDF"
              : result.documentName.toLowerCase().endsWith(".docx")
                ? "DOCX"
                : "DOC"}
          </span>
        </div>
        <div className="min-w-0">
          <p className="truncate text-[14px] font-medium text-fg">
            {result.documentName}
          </p>
          <p className="truncate text-[11.5px] text-muted">
            {result.vendorName} · analyzed{" "}
            {new Date(result.analyzedAt).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-[11.5px] font-medium tracking-tight"
            style={{ color: tone.color }}
          >
            <span className="size-1.5 rounded-full" style={{ background: tone.color }} aria-hidden="true" />
            {tone.label}
          </span>
        </div>
      </div>

      {/* ------------------------ KPI stat cards ------------------------ */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Findings" value={String(findings.length)} />
        <StatCard label="Risk score" value={`${score}`} sub="/100" />
        <StatCard
          label="Savings potential"
          value={result.savings.high >= 1000 ? moneyShort(result.savings.high) : money(result.savings.high)}
          sub="/yr"
        />
        <StatCard
          label="Critical"
          value={String(criticalCount)}
          sub={criticalCount > 0 ? "need attention" : "nothing critical"}
          accent={criticalCount > 0 ? "#f4f4f5" : undefined}
        />
      </div>

      {/* ----------------- full-width severity chart ----------------- */}
      {sevData.length > 0 && (
        <ChartCard
          title="Findings by severity"
          description="How serious each flag is"
          className="mt-4"
        >
          <BarChart
            data={sevData}
            height={200}
            format={(v) => `${v}`}
          />
        </ChartCard>
      )}

      {/* ------------ type breakdown: chart + name/count table ------------ */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {typeData.length > 0 ? (
          <ChartCard
            title="Findings by type"
            description="What the scan flagged"
          >
            <BarChart
              data={typeData}
              height={180}
              format={(v) => `${v}`}
            />
          </ChartCard>
        ) : (
          <EmptyCard title="Findings by type" description="What the scan flagged">
            No notable clauses found.
          </EmptyCard>
        )}

        <Card className="rounded-lg border-line bg-surface">
          <CardHeader className="min-h-10 items-center gap-0.5 border-b border-line px-4">
            <CardTitle className="text-[11px] font-semibold tracking-[-0.01em] text-muted">
              Breakdown
            </CardTitle>
            <CardDescription className="text-[11px] tracking-tight text-muted/70">
              Finding type · count
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {typeEntries.length === 0 ? (
              <p className="px-4 py-6 text-[12.5px] text-muted">
                No notable clauses found.
              </p>
            ) : (
              <div className="divide-y divide-line/50">
                {typeEntries.slice(0, 6).map(([type, count], i) => {
                  const name = FINDING_TYPE_LABELS[type] ?? type;
                  const pct = findings.length > 0 ? Math.round((count / findings.length) * 100) : 0;
                  return (
                    <div key={type} className="flex items-center gap-3 px-4 py-2">
                      <span
                        className="size-1.5 shrink-0 rounded-full"
                        style={{ background: TYPE_COLORS[i % TYPE_COLORS.length] }}
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1 truncate text-[12.5px] text-fg">
                        {name}
                      </span>
                      <span className="h-[4px] w-16 shrink-0 overflow-hidden rounded-sm bg-white/[0.07]">
                        <span
                          className="block h-full rounded-sm"
                          style={{ width: `${pct}%`, background: TYPE_COLORS[i % TYPE_COLORS.length] }}
                        />
                      </span>
                      <span className="w-6 shrink-0 text-right text-[12.5px] tabular-nums text-muted">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ------------------- savings run-rate + key terms ------------------- */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          title="Savings run-rate"
          description="Projected 12-month run-rate from stated potential"
        >
          <AreaChart
            data={savingsSeries}
            height={150}
            color="var(--chart-1)"
            fillId="results-savings-fill"
            format={(v) => moneyShort(v)}
          />
        </ChartCard>

        <KeyTermsCard result={result} />
      </div>

      {/* ----------------------- key findings evidence ----------------------- */}
      {topFindings.length > 0 && (
        <div className="mt-4 border-sheen overflow-hidden rounded-lg border border-line bg-surface">
          <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
            <h3 className="text-[11px] font-semibold tracking-[-0.01em] text-muted">
              Key findings
            </h3>
            <span className="rounded-md bg-white/[0.08] px-1.5 py-0.5 text-[10.5px] tabular-nums text-zinc-400">
              {topFindings.length}
            </span>
          </div>
          <div className="grid gap-0 md:grid-cols-3">
            {topFindings.map((f) => (
              <div key={f.id} className="border-b border-line p-4 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0">
                <div className="flex items-baseline gap-2">
                  <span
                    className={`size-1.5 shrink-0 self-center rounded-full ${
                      f.severity === "critical" ? "bg-zinc-300" : "bg-zinc-600"
                    }`}
                    aria-hidden="true"
                  />
                  <p className="truncate text-[12.5px] font-medium text-fg">
                    {f.title}
                  </p>
                </div>
                <p className="mt-1 line-clamp-2 text-[11.5px] leading-relaxed text-muted">
                  {f.detail}
                </p>
                <p className="mt-1.5 line-clamp-1 text-[10.5px] italic leading-relaxed text-muted/60">
                  “{f.evidence.excerpt}”
                </p>
                <p className="mt-0.5 text-[9.5px] text-muted/50">
                  {f.evidence.section} · p. {f.evidence.page}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- dashboard primitives ---------------- */

/** Linear-style stat card: small label top-left, one big number centered. */
function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <Card className="rounded-lg border-line bg-surface p-4 text-center">
      <CardTitle className="text-left text-[11px] font-semibold tracking-[-0.01em] text-muted">
        {label}
      </CardTitle>
      <CardContent className="flex items-end justify-center gap-1 py-0 pt-3">
        <span
          className="text-[30px] font-semibold leading-none tracking-[-0.02em] tabular-nums"
          style={{ color: accent ?? "var(--color-fg)" }}
        >
          {value}
        </span>
        {sub && <span className="mb-0.5 text-[11px] text-muted/70">{sub}</span>}
      </CardContent>
    </Card>
  );
}

/** Card wrapper for the full-width / half-width charts. */
function ChartCard({
  title,
  description,
  className = "",
  children,
}: {
  title: string;
  description: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={`rounded-lg border-line bg-surface ${className}`}>
      <CardHeader className="min-h-10 items-center gap-0.5 border-b border-line px-4">
        <CardTitle className="text-[11px] font-semibold tracking-[-0.01em] text-muted">
          {title}
        </CardTitle>
        <CardDescription className="text-[11px] tracking-tight text-muted/70">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-3">{children}</CardContent>
    </Card>
  );
}

function EmptyCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="rounded-lg border-line bg-surface">
      <CardHeader className="min-h-10 items-center gap-0.5 border-b border-line px-4">
        <CardTitle className="text-[11px] font-semibold tracking-[-0.01em] text-muted">
          {title}
        </CardTitle>
        <CardDescription className="text-[11px] tracking-tight text-muted/70">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-center px-4 py-8">
        <p className="text-[12.5px] text-muted">{children}</p>
      </CardContent>
    </Card>
  );
}

function KeyTermsCard({ result }: { result: AnalysisResult }) {
  const facts: { label: string; value: string }[] = [];
  if (result.renewalDate) facts.push({ label: "Renews", value: fmtDate(result.renewalDate) });
  if (result.cancellationDeadline) facts.push({ label: "Cancel by", value: fmtDate(result.cancellationDeadline) });
  if (result.autoRenew != null)
    facts.push({
      label: "Auto-renew",
      value: `${result.autoRenewNoticeDays ?? "-"} day notice`,
    });
  if (result.annualValue) facts.push({ label: "Annual value", value: money(result.annualValue) });
  if (result.priceEscalation?.rate != null)
    facts.push({ label: "Escalation", value: `${result.priceEscalation.rate}% / yr` });

  return (
    <Card className="rounded-lg border-line bg-surface">
      <CardHeader className="min-h-10 items-center gap-0.5 border-b border-line px-4">
        <CardTitle className="text-[11px] font-semibold tracking-[-0.01em] text-muted">
          Key terms
        </CardTitle>
        <CardDescription className="text-[11px] tracking-tight text-muted/70">
          Extracted from the document
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {facts.length === 0 ? (
          <p className="px-4 py-6 text-[12.5px] text-muted">
            No dates or values were stated in the document.
          </p>
        ) : (
          <div className="divide-y divide-line/50">
            {facts.map((f) => (
              <div
                key={f.label}
                className="flex items-center gap-2.5 px-4 py-2"
              >
                <span className="text-[11px] tracking-[-0.01em] text-muted/70">
                  {f.label}
                </span>
                <span className="ml-auto truncate text-[12.5px] tabular-nums text-fg">
                  {f.value}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}