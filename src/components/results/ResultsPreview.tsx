"use client";

import type { AnalysisResult } from "@/lib/types";
import { money } from "@/lib/format";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Area,
  AreaChart,
  CartesianGrid,
  LabelList,
  Pie,
  PieChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  XAxis,
} from "recharts";

/* ------------------------------------------------------------------ */
/*  Free review report - chart-driven.                                */
/*  Every chart is drawn from the real analysis: findings by type and */
/*  severity, the savings estimate (low/high band), and the           */
/*  cumulative opportunity potential. Nothing is invented.            */
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

function riskTone(score: number): {
  label: string;
  text: string;
  bar: string;
} {
  if (score >= 75)
    return { label: "High risk", text: "text-zinc-100", bar: "#f4f4f5" };
  if (score >= 50)
    return { label: "Moderate risk", text: "text-zinc-300", bar: "#d4d4d8" };
  if (score >= 30)
    return { label: "Low risk", text: "text-zinc-400", bar: "#a1a1aa" };
  return { label: "Low risk", text: "text-zinc-500", bar: "#71717a" };
}

const chartCard =
  "flex h-full flex-col rounded-lg";

const cardHeader =
  "min-h-10 items-center gap-0.5 border-b border-line px-4";

const cardTitle =
  "text-[11px] font-semibold tracking-[0.1em] text-muted";

const cardDesc = "text-[11px] tracking-tight text-muted/70";

const cardFooter = "border-t border-line bg-transparent px-4 py-2.5";

/* ---------------- main ---------------- */

export function ResultsPreview({
  result,
  compact = false,
}: {
  result: AnalysisResult;
  compact?: boolean;
}) {
  const tone = riskTone(result.riskScore);
  const findings = result.findings;
  const opportunities = result.opportunities;
  const topFindings = findings.slice(0, compact ? 2 : 3);

  /* ---- real chart data, derived from the analysis ---- */

  // Savings band: the stated annual low/high spread evenly across 12 months.
  const now = new Date();
  const savingsSeries = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now);
    d.setMonth(d.getMonth() + i);
    return {
      label: d.toLocaleDateString("en-US", { month: "short" }),
      low: Math.round(result.savings.low / 12),
      high: Math.round(result.savings.high / 12),
    };
  });

  // Findings by type (only types actually present; rest fold into "Other").
  const typeCounts = new Map<string, number>();
  for (const f of findings) {
    typeCounts.set(f.type, (typeCounts.get(f.type) ?? 0) + 1);
  }
  const typeEntries = [...typeCounts.entries()]
    .sort((a, b) => b[1] - a[1]);
  const PIE_COLORS = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
  ];
  const pieData: { name: string; value: number; fill: string }[] = [];
  const pieConfig: ChartConfig = {};
  typeEntries.slice(0, 5).forEach(([type, count], i) => {
    const key = `type-${i}`;
    const name = FINDING_TYPE_LABELS[type] ?? type;
    pieData.push({ name, value: count, fill: `var(--color-${key})` });
    pieConfig[key] = { label: name, color: PIE_COLORS[i % PIE_COLORS.length] };
  });
  const rest = typeEntries.slice(5).reduce((a, [, c]) => a + c, 0);
  if (rest > 0) {
    pieData.push({
      name: "Other",
      value: rest,
      fill: "var(--color-type-other)",
    });
    pieConfig["type-other"] = { label: "Other", color: "var(--chart-5)" };
  }

  // Findings by severity (only severities present).
  const sevOrder = ["critical", "warning", "info"] as const;
  const sevData: { name: string; value: number; fill: string }[] = [];
  const sevConfig: ChartConfig = {};
  const sevColors: Record<string, string> = {
    critical: "var(--chart-1)",
    warning: "var(--chart-2)",
    info: "var(--chart-3)",
  };
  for (const sev of sevOrder) {
    const count = findings.filter((f) => f.severity === sev).length;
    if (count === 0) continue;
    const name = sev[0].toUpperCase() + sev.slice(1);
    sevData.push({ name, value: count, fill: `var(--color-sev-${sev})` });
    sevConfig[`sev-${sev}`] = { label: name, color: sevColors[sev] };
  }

  // Cumulative savings potential by opportunity (real estimatedHigh values).
  const cumData: { label: string; value: number }[] = [];
  let acc = 0;
  for (const o of [...opportunities].sort((a, b) => a.estimatedHigh - b.estimatedHigh)) {
    acc += o.estimatedHigh || 0;
    cumData.push({ label: OPP_TYPE_LABELS[o.type] ?? o.type, value: acc });
  }

  const criticalCount = findings.filter((f) => f.severity === "critical").length;
  const warningCount = findings.filter((f) => f.severity === "warning").length;

  return (
    <div className="w-full">
      {/* report header */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
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
            className={`rounded-full border border-line bg-surface px-3 py-1 text-[11.5px] font-medium tracking-tight ${tone.text}`}
          >
            {tone.label}
          </span>
        </div>
      </div>

      {/* row 1 - savings, risk, findings-by-type */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <SavingsBandCard
          className="lg:col-span-5"
          data={savingsSeries}
          low={result.savings.low}
          high={result.savings.high}
          oppCount={opportunities.length}
        />
        <RiskGaugeCard
          className="lg:col-span-3"
          score={result.riskScore}
          toneLabel={tone.label}
          toneBar={tone.bar}
        />
        <FindingsPieCard
          className="lg:col-span-4"
          data={pieData}
          config={pieConfig}
          total={findings.length}
        />
      </div>

      {/* row 2 - severity, opportunities, key terms */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <SeverityRadialCard
          className="lg:col-span-4"
          data={sevData}
          config={sevConfig}
          critical={criticalCount}
          warning={warningCount}
        />
        <OpportunitiesStepCard
          className="lg:col-span-4"
          data={cumData}
          total={opportunities.length}
          high={result.savings.high}
        />
        <KeyTermsCard
          className="lg:col-span-4"
          result={result}
        />
      </div>

      {/* writing - the top findings, kept short and evidence-backed */}
      {topFindings.length > 0 && (
        <div className="mt-4 border-sheen overflow-hidden rounded-lg border border-line bg-surface">
          <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
            <h3 className="text-[11px] font-semibold tracking-[0.1em] text-muted">
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

/* ---------------- chart cards ---------------- */

function SavingsBandCard({
  className,
  data,
  low,
  high,
  oppCount,
}: {
  className?: string;
  data: { label: string; low: number; high: number }[];
  low: number;
  high: number;
  oppCount: number;
}) {
  const config = {
    low: { label: "Low estimate", color: "var(--chart-3)" },
    high: { label: "High estimate", color: "var(--chart-1)" },
  } satisfies ChartConfig;

  if (low <= 0 && high <= 0) {
    return (
      <Card className={`${chartCard} ${className ?? ""}`}>
        <CardHeader className={cardHeader}>
          <CardTitle className={cardTitle}>Potential savings</CardTitle>
          <CardDescription className={cardDesc}>12-month run-rate</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-1 items-center justify-center px-4 py-6">
          <p className="text-[12.5px] text-muted">
            No stated value to project from yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${chartCard} ${className ?? ""}`}>
      <CardHeader className={cardHeader}>
        <CardTitle className={cardTitle}>Potential savings</CardTitle>
        <CardDescription className={cardDesc}>Projected run-rate · low–high band</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 px-4 pb-1 pt-3">
        <ChartContainer config={config} className="aspect-auto h-36 w-full">
          <AreaChart
            accessibilityLayer
            data={data}
            margin={{ left: 12, right: 12 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  indicator="dot"
                  formatter={(v) => money(Number(v))}
                />
              }
            />
            <Area
              dataKey="low"
              type="linear"
              fill="var(--color-low)"
              fillOpacity={0.3}
              stroke="var(--color-low)"
              strokeDasharray="3 3"
            />
            <Area
              dataKey="high"
              type="linear"
              fill="var(--color-high)"
              fillOpacity={0.4}
              stroke="var(--color-high)"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className={cardFooter}>
        <div className="flex w-full items-start gap-2 text-[11px]">
          <div className="grid gap-1">
            <div className="leading-none font-medium text-zinc-300">
              {money(low)}–{money(high)} /yr potential
            </div>
            <div className="leading-none text-muted/70">
              Evenly projected from {oppCount}{" "}
              {oppCount === 1 ? "opportunity" : "opportunities"} · no growth assumed
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}

function RiskGaugeCard({
  className,
  score,
  toneLabel,
  toneBar,
}: {
  className?: string;
  score: number;
  toneLabel: string;
  toneBar: string;
}) {
  const config = { risk: { label: "Risk", color: toneBar } } satisfies ChartConfig;
  const data = [{ name: "risk", value: score, fill: "var(--color-risk)" }];

  return (
    <Card className={`${chartCard} ${className ?? ""}`}>
      <CardHeader className={cardHeader}>
        <CardTitle className={cardTitle}>Risk score</CardTitle>
        <CardDescription className={cardDesc}>{toneLabel}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 items-center px-4 py-2">
        <div className="relative mx-auto aspect-square w-full max-w-[190px]">
          <ChartContainer config={config} className="aspect-square w-full">
            <RadialBarChart
              data={data}
              startAngle={90}
              endAngle={-270}
              innerRadius={34}
              outerRadius={90}
              barSize={12}
            >
              <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
              <RadialBar dataKey="value" background cornerRadius={6} />
            </RadialBarChart>
          </ChartContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-semibold leading-none tabular-nums tracking-tight text-fg">
              {score}
            </span>
            <span className="mt-1 text-[9.5px] tracking-[0.14em] text-muted">
              /100
            </span>
          </div>
        </div>
      </CardContent>
      <CardFooter className={cardFooter}>
        <div className="flex w-full items-start gap-2 text-[11px]">
          <div className="grid gap-1">
            <div className="leading-none font-medium text-zinc-300">
              {toneLabel}
            </div>
            <div className="leading-none text-muted/70">
              Based on renewal, escalation, and cancellation terms.
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}

function FindingsPieCard({
  className,
  data,
  config,
  total,
}: {
  className?: string;
  data: { name: string; value: number; fill: string }[];
  config: ChartConfig;
  total: number;
}) {
  if (data.length === 0) {
    return (
      <Card className={`${chartCard} ${className ?? ""}`}>
        <CardHeader className={cardHeader}>
          <CardTitle className={cardTitle}>Findings by type</CardTitle>
          <CardDescription className={cardDesc}>What the scan flagged</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-1 items-center justify-center px-4 py-6">
          <p className="text-[12.5px] text-muted">No notable clauses found.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${chartCard} ${className ?? ""}`}>
      <CardHeader className={cardHeader}>
        <CardTitle className={cardTitle}>Findings by type</CardTitle>
        <CardDescription className={cardDesc}>What the scan flagged</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col items-center justify-center px-4 py-3">
        <ChartContainer
          config={config}
          className="mx-auto aspect-square w-full max-w-[190px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie data={data} dataKey="value" nameKey="name" stroke="0" />
          </PieChart>
        </ChartContainer>
        <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1">
          {data.map((d) => (
            <span key={d.name} className="flex items-center gap-1.5 text-[11px] text-muted">
              <span
                className="size-2 shrink-0 rounded-[2px]"
                style={{ background: d.fill }}
                aria-hidden="true"
              />
              {d.name} · {d.value}
            </span>
          ))}
        </div>
      </CardContent>
      <CardFooter className={cardFooter}>
        <div className="flex w-full items-start gap-2 text-[11px]">
          <div className="grid gap-1">
            <div className="leading-none font-medium text-zinc-300">
              {total} {total === 1 ? "finding" : "findings"}
            </div>
            <div className="leading-none text-muted/70">
              Each one tied to the clause it came from.
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}

function SeverityRadialCard({
  className,
  data,
  config,
  critical,
  warning,
}: {
  className?: string;
  data: { name: string; value: number; fill: string }[];
  config: ChartConfig;
  critical: number;
  warning: number;
}) {
  if (data.length === 0) {
    return (
      <Card className={`${chartCard} ${className ?? ""}`}>
        <CardHeader className={cardHeader}>
          <CardTitle className={cardTitle}>Findings by severity</CardTitle>
          <CardDescription className={cardDesc}>How serious each flag is</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-1 items-center justify-center px-4 py-6">
          <p className="text-[12.5px] text-muted">Nothing flagged as critical.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${chartCard} ${className ?? ""}`}>
      <CardHeader className={cardHeader}>
        <CardTitle className={cardTitle}>Findings by severity</CardTitle>
        <CardDescription className={cardDesc}>How serious each flag is</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 items-center px-4 py-2">
        <ChartContainer
          config={config}
          className="mx-auto aspect-square w-full max-w-[210px]"
        >
          <RadialBarChart
            data={data}
            startAngle={-90}
            endAngle={380}
            innerRadius={28}
            outerRadius={95}
          >
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel nameKey="name" />}
            />
            <RadialBar dataKey="value" background>
              <LabelList
                position="insideStart"
                dataKey="name"
                className="fill-zinc-200"
                fontSize={11}
              />
            </RadialBar>
          </RadialBarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className={cardFooter}>
        <div className="flex w-full items-start gap-2 text-[11px]">
          <div className="grid gap-1">
            <div className="leading-none font-medium text-zinc-300">
              {critical > 0 ? `${critical} critical · ${warning} warning` : `${warning} warning`}
            </div>
            <div className="leading-none text-muted/70">
              Severity reflects cost, lock-in, or liability.
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}

function OpportunitiesStepCard({
  className,
  data,
  total,
  high,
}: {
  className?: string;
  data: { label: string; value: number }[];
  total: number;
  high: number;
}) {
  const config = {
    value: { label: "Cumulative potential", color: "var(--chart-1)" },
  } satisfies ChartConfig;

  if (data.length === 0) {
    return (
      <Card className={`${chartCard} ${className ?? ""}`}>
        <CardHeader className={cardHeader}>
          <CardTitle className={cardTitle}>Savings opportunities</CardTitle>
          <CardDescription className={cardDesc}>Cumulative potential</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-1 items-center justify-center px-4 py-6">
          <p className="text-[12.5px] text-muted">No opportunities identified yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${chartCard} ${className ?? ""}`}>
      <CardHeader className={cardHeader}>
        <CardTitle className={cardTitle}>Savings opportunities</CardTitle>
        <CardDescription className={cardDesc}>Cumulative potential by type</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 px-4 pb-1 pt-3">
        <ChartContainer config={config} className="aspect-auto h-36 w-full">
          <AreaChart
            accessibilityLayer
            data={data}
            margin={{ left: 12, right: 12 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  indicator="dot"
                  formatter={(v) => money(Number(v))}
                />
              }
            />
            <Area
              dataKey="value"
              type="step"
              fill="var(--color-value)"
              fillOpacity={0.4}
              stroke="var(--color-value)"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className={cardFooter}>
        <div className="flex w-full items-start gap-2 text-[11px]">
          <div className="grid gap-1">
            <div className="leading-none font-medium text-zinc-300">
              {total} {total === 1 ? "opportunity" : "opportunities"} · up to {money(high)}/yr
            </div>
            <div className="leading-none text-muted/70">
              Cumulative high estimates from the real analysis.
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}

function KeyTermsCard({
  className,
  result,
}: {
  className?: string;
  result: AnalysisResult;
}) {
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
    <Card className={`${chartCard} ${className ?? ""}`}>
      <CardHeader className={cardHeader}>
        <CardTitle className={cardTitle}>Key terms</CardTitle>
        <CardDescription className={cardDesc}>Extracted from the document</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 px-4 py-2">
        {facts.length === 0 ? (
          <p className="py-4 text-[12.5px] text-muted">
            No dates or values were stated in the document.
          </p>
        ) : (
          <div className="flex h-full flex-col justify-center gap-0.5 py-2">
            {facts.map((f) => (
              <div
                key={f.label}
                className="flex items-center gap-2.5 border-b border-line/50 px-0.5 py-1.5 last:border-b-0"
              >
                <span className="text-[10px] tracking-[0.1em] text-muted/70">
                  {f.label}
                </span>
                <span className="ml-auto truncate text-[12px] tabular-nums text-fg">
                  {f.value}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className={cardFooter}>
        <div className="flex w-full items-start gap-2 text-[11px]">
          <div className="leading-none text-muted/70">
            Every term points back to a clause in the document.
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
