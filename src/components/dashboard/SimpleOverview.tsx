"use client";

import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
} from "lucide-react";
import { useNow } from "@/lib/useNow";
import { money, moneyShort, formatDateShort, timeAgo } from "@/lib/format";
import { CountUp, useSpotlight } from "@/lib/motion";
import type { ActivityRecord, ContractRecord } from "@/lib/types";
import { riskLevel } from "@/components/dashboard/shared";
import { Sparkline } from "@/components/ui/charts";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";

/* ------------------------------------------------------------------ */
/*  SimpleOverview - the Simple display mode's home.                  */
/*  A financial / stock-terminal readout of the same real contract     */
/*  data: dense stat blocks, grid lines, large $ amounts, % deltas,    */
/*  and charts drawing in like a market terminal. No added sections -  */
/*  every block is one of the existing ones, only presented as data.   */
/* ------------------------------------------------------------------ */

const daysUntil = (iso: string, now: number) =>
  Math.ceil((new Date(iso + "T00:00:00").getTime() - now) / 86400000);

/** As-if over-mo nimble delta, derived from real ratios - never invented. */
const fin = (n: number) => new Intl.NumberFormat("en-US").format(Math.round(n));

export function SimpleOverview({
  userName,
  contracts,
  renewals,
  atRisk,
  totalSpend,
  opportunityLow,
  opportunityHigh,
  activity,
  onSelectContract,
}: {
  userName: string;
  contracts: ContractRecord[];
  renewals: ContractRecord[];
  atRisk: ContractRecord[];
  totalSpend: number;
  opportunityLow: number;
  opportunityHigh: number;
  activity: ActivityRecord[];
  onSelectContract: (c: ContractRecord) => void;
}) {
  const now = useNow();
  const firstName = (userName || "there").split(" ")[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const renewalsSoon = renewals.filter((c) => {
    const d = daysUntil(c.renewalDate, now);
    return d >= 0 && d <= 90;
  });
  const activeCount = contracts.filter((c) => c.status === "active").length;
  const autoRenewCount = contracts.filter((c) => c.autoRenew).length;
  const attentionCount = new Set([...atRisk, ...renewalsSoon].map((c) => c.id)).size;

  /* ------------------ derived financial series (real data) ------------------ */

  // Spend distribution ordered by vendor value -> drives the spend sparkline.
  const spendSeries = [...contracts]
    .sort((a, b) => b.annualSpend - a.annualSpend)
    .map((c) => c.annualSpend)
    .filter((v) => v > 0);

  // Savings opportunity spread as an even monthly share of the real annual
  // high estimate. It is a straight-line projection of the actual figure -
  // no invented growth ramp, nothing that isn't derived from the data.
  const savingsSeries = Array.from({ length: 12 }, (_, i) => {
    const month = new Date(now);
    month.setMonth(month.getMonth() + i);
    return {
      label: month.toLocaleDateString("en-US", { month: "short" }),
      value: Math.round(opportunityHigh / 12),
    };
  });

  // Renewal exposure: each upcoming renewal's value -> a timeline bar chart.
  const renewalSeries = renewalsSoon
    .sort((a, b) => a.renewalDate.localeCompare(b.renewalDate))
    .slice(0, 8)
    .map((c) => ({
      label: c.vendorName.slice(0, 3).toUpperCase(),
      value: c.annualSpend,
      days: daysUntil(c.renewalDate, now),
    }));

  // Risk: each at-risk vendor's score as stacked bars -> level + exposure.
  const riskSeries = atRisk
    .slice(0, 8)
    .map((c) => ({ label: c.vendorName.slice(0, 3).toUpperCase(), value: c.riskScore }));

  const savingsPctOfSpend = totalSpend > 0 ? (opportunityHigh / totalSpend) * 100 : 0;
  const exposure = atRisk.reduce((s, c) => s + c.annualSpend, 0);
  const exposurePct = totalSpend > 0 ? (exposure / totalSpend) * 100 : 0;
  const renewalExposure = renewalsSoon.reduce((s, c) => s + c.annualSpend, 0);

  const nextRenewal = renewalsSoon[0]
    ? { vendor: renewalsSoon[0].vendorName, days: daysUntil(renewalsSoon[0].renewalDate, now) }
    : null;

  return (
    <div className="h-full overflow-y-auto bg-canvas">
      <div className="mx-auto w-full max-w-[1120px] px-5 pb-12 pt-6">
        {/* ------------------------------ header ------------------------------ */}
        <div className="flex items-end gap-3">
          <div>
            <p className="text-[11px] font-medium tracking-[-0.01em] text-muted/70">
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </p>
            <h1 className="mt-1 text-[24px] font-semibold leading-none tracking-[-0.02em] text-fg">
              {greeting}, {firstName}
            </h1>
            <p className="mt-1.5 text-[12.5px] text-muted">
              {attentionCount > 0
                ? `${attentionCount} contract${attentionCount === 1 ? "" : "s"} need${attentionCount === 1 ? "s" : ""} your attention · ${fin(totalSpend)} / yr at risk`
                : "All positions on track · nothing needs attention"}
            </p>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <Link href="/dashboard/ai" className="toolbar-btn active">
              Ask AI
            </Link>
            <Link href="/upload" className="toolbar-btn">
              Upload
            </Link>
          </div>
        </div>

        {/* ------------------------------ ticker strip ------------------------------ */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {renewalsSoon.length > 0 && (
            <Tick label="Renewing <90d" value={fin(renewalsSoon.length)} tone="text-zinc-200" />
          )}
          {atRisk.length > 0 && (
            <Tick label="At risk" value={fin(atRisk.length)} tone="text-zinc-100" />
          )}
          {autoRenewCount > 0 && (
            <Tick label="Auto-renew" value={fin(autoRenewCount)} tone="text-zinc-200" />
          )}
          {opportunityHigh > 0 && (
            <Tick label="Savings potential" value={moneyShort(opportunityHigh)} tone="text-fg" up />
          )}
          {totalSpend > 0 && (
            <Tick label="Total spend" value={moneyShort(totalSpend)} tone="text-fg" />
          )}
        </div>

        {/* ------------------------------ stat grid ------------------------------ */}
        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
          {/* ---- Contracts / spend ---- */}
          <FinCard
            label="Contracts"
            meta={`${contracts.length} analyzed`}
            value={moneyShort(totalSpend)}
            actionHref="/dashboard/contracts"
            beam
            hrefLabel="Register"
          >
            <div className="flex items-end justify-between gap-4">
              <div className="min-w-0 flex-1 space-y-2">
                <BreakdownRow label="Active" value={activeCount} total={contracts.length} color="text-zinc-200" bar="bg-zinc-200/80" />
                <BreakdownRow label="At risk" value={atRisk.length} total={contracts.length} color="text-zinc-100" bar="bg-zinc-300/80" />
                <BreakdownRow label="Auto-renew" value={autoRenewCount} total={contracts.length} color="text-zinc-200" bar="bg-zinc-400/80" />
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <Sparkline data={spendSeries} width={120} height={34} color="#a1a1aa" />
                <span className="text-[10px] tracking-[-0.01em] text-muted/60">spend · $/yr</span>
              </div>
            </div>
          </FinCard>

          {/* ---- Savings ---- */}
          {/* The shadcn linear area chart over the real 12-month projection
              of stated savings potential - no invented growth. */}
          <SavingsTrendCard
            meta={`${contracts.filter((c) => c.opportunityHigh > 0).length} contracts`}
            value={
              <>
                <CountUp target={opportunityLow} format={money} />
                {"–"}
                <CountUp target={opportunityHigh} format={money} />
              </>
            }
            delta={`${savingsPctOfSpend.toFixed(1)}% of spend`}
            data={savingsSeries}
            pctOfSpend={savingsPctOfSpend}
          />

          {/* ---- Renewals ---- */}
          <FinCard
            label="Upcoming renewals"
            meta={`${renewalsSoon.length} in 90d`}
            value={moneyShort(renewalExposure)}
            delta={nextRenewal ? `${nextRenewal.vendor} · ${nextRenewal.days}d` : "—"}
            actionHref="/dashboard/renewals"
            hrefLabel="Calendar"
          >
            {renewalSeries.length > 0 ? (
              <div className="space-y-1.5">
                {renewalSeries.slice(0, 5).map((r) => {
                  const d = r.days;
                  const tone = d < 30 ? "text-zinc-100" : d < 60 ? "text-zinc-200" : "text-zinc-300";
                  return (
                    <button
                      key={r.label}
                      onClick={() => onSelectContract(r as unknown as ContractRecord)}
                      className="flex w-full items-center gap-2 group/row"
                    >
                      <span className="w-8 shrink-0 truncate text-[10px] tracking-[-0.01em] text-muted">{r.label}</span>
                      <span className="h-[6px] flex-1 overflow-hidden rounded-sm bg-white/[0.06]">
                        <span
                          className="block h-full rounded-sm transition-all group-hover/row:opacity-80"
                          style={{
                            width: `${Math.max(8, (r.value / Math.max.apply(null, renewalSeries.map((x) => x.value))) * 100)}%`,
                            background: d < 30 ? "#f4f4f5" : d < 60 ? "#d4d4d8" : "#a1a1aa",
                          }}
                        />
                      </span>
                      <span className="shrink-0 text-[10.5px] tabular-nums text-muted">{moneyShort(r.value)}</span>
                      <span className={`w-9 shrink-0 text-right text-[10px] tabular-nums font-medium ${tone}`}>{d}d</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-[12px] text-muted">No renewal dates yet — they appear here once extracted.</p>
            )}
          </FinCard>

          {/* ---- Risks ---- */}
          <FinCard
            label="Risk"
            meta={`${exposurePct.toFixed(0)}% of spend exposed`}
            value={moneyShort(exposure)}
            delta={atRisk.length > 0 ? `${fin(atRisk.length)} contracts` : "clear"}
            up={atRisk.length === 0}
            actionHref="/dashboard/risks"
            hrefLabel="Register"
          >
            {riskSeries.length > 0 ? (
              <div className="space-y-1.5">
                {atRisk.slice(0, 5).map((c) => {
                  const lvl = riskLevel(c.riskScore);
                  const tone =
                    lvl === "critical" ? "text-zinc-100" : lvl === "high" ? "text-zinc-200" : "text-zinc-300";
                  return (
                    <button
                      key={c.id}
                      onClick={() => onSelectContract(c)}
                      className="flex w-full items-center gap-2 group/row"
                    >
                      <span className="w-8 shrink-0 truncate text-[10px] tracking-[-0.01em] text-muted">{c.vendorName.slice(0, 3).toUpperCase()}</span>
                      <span className={`font-semibold tabular-nums text-[11px] w-7 shrink-0 text-right ${tone}`}>{c.riskScore}</span>
                      <span className="h-[6px] flex-1 overflow-hidden rounded-sm bg-white/[0.06]">
                        <span
                          className="block h-full rounded-sm transition-all group-hover/row:opacity-80"
                          style={{
                            width: `${c.riskScore}%`,
                            background: c.riskScore >= 80 ? "#f4f4f5" : c.riskScore >= 60 ? "#d4d4d8" : "#a1a1aa",
                          }}
                        />
                      </span>
                      <span className="shrink-0 text-[10.5px] tabular-nums text-muted">{moneyShort(c.annualSpend)}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-[12px] text-muted">No elevated risk right now — exposure is under control.</p>
            )}
          </FinCard>
        </div>

        {/* ------------------------------ recent activity ------------------------------ */}
        <FinCard
          label="Recent activity"
          meta={`event log`}
          value={<>{fin(activity.length)}</>}
          actionHref="/dashboard/activity"
          hrefLabel="Full log"
          className="mt-3"
        >
          {activity.slice(0, 6).map((a) => {
            const act = a;
            return (
              <button
                key={a.id}
                onClick={() => a.vendorName && onSelectContract(a as unknown as ContractRecord)}
                className="flex w-full items-center gap-3 border-t border-line/60 px-4 py-2 text-left transition-colors hover:bg-white/[0.03]"
              >
                <span className="w-20 shrink-0 text-[10.5px] tabular-nums text-muted">
                  {formatDateShort(a.createdAt.slice(0, 10))}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-medium text-fg">{a.title}</p>
                  {a.vendorName && <p className="truncate text-[10.5px] text-muted">{a.vendorName}</p>}
                </div>
                <span className="hidden shrink-0 text-[10px] tracking-[-0.01em] text-muted/60 sm:block">
                  {a.actor === "agent" ? "AI" : a.actor}
                </span>
                <span className="w-16 shrink-0 text-right text-[10.5px] text-muted">{timeAgo(a.createdAt)}</span>
              </button>
            );
          })}
          {activity.length === 0 && (
            <p className="px-4 py-6 text-[12px] text-muted">Actions you take will appear here.</p>
          )}
        </FinCard>

        <p className="mt-6 text-center text-[11px] text-muted/70">
          All figures are computed from your analyzed contracts — switch to Business in Settings for the full workspace.
        </p>
      </div>
    </div>
  );
}

/* ------------------------------ primitives ------------------------------ */

function Tick({ label, value, tone, up }: { label: string; value: string; tone: string; up?: boolean }) {
  return (
    <span className="glass-glow inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-2.5 py-1 text-[11px] tabular-nums">
      <span className="text-[10px] font-semibold tracking-[-0.01em] text-muted/70">{label}</span>
      <span className={`font-semibold ${tone}`}>
        {up ? (
          <span className="inline-flex items-center gap-0.5"><ArrowUpRight size={11} className="text-zinc-200" />{value}</span>
        ) : value}
      </span>
    </span>
  );
}

/* ------------------------- savings trend chart ------------------------- */

/**
 * The shadcn linear area chart, wired to the real 12-month projection of
 * stated savings potential. Every value is derived (annual high ÷ 12); the
 * footer says so plainly - no invented growth, no fake analytics.
 */
function SavingsTrendCard({
  meta,
  value,
  delta,
  data,
  pctOfSpend,
}: {
  meta: string;
  value: React.ReactNode;
  delta: string;
  data: { label: string; value: number }[];
  pctOfSpend: number;
}) {
  const ref = useSpotlight<HTMLDivElement>();
  const chartConfig = {
    savings: { label: "Projected savings", color: "var(--chart-1)" },
  } satisfies ChartConfig;

  return (
    <Card
      ref={ref}
      className="spotlight-card rounded-lg border-beam glass-glow overflow-visible p-0"
    >
      <div className="spotlight-glow" aria-hidden="true" />
      <CardHeader className="min-h-10 items-center border-b border-line px-4">
        <CardTitle className="text-[11px] font-medium tracking-[-0.01em] text-muted">
          Potential savings
        </CardTitle>
        <CardDescription className="text-[11px] tabular-nums text-muted/70">
          {meta}
        </CardDescription>
        <CardAction>
          <Link
            href="/dashboard/savings"
            className="flex shrink-0 items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] font-medium text-muted transition-colors hover:bg-white/[0.05] hover:text-fg"
          >
            Opportunities
            <ArrowUpRight size={11} />
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent className="px-4 pt-3">
        <div className="flex items-end justify-between gap-3">
          <p className="min-w-0 truncate text-[26px] font-semibold leading-none tracking-[-0.02em] text-fg tabular-nums">
            {value}
          </p>
          <span className="mb-0.5 flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-zinc-200">
            <ArrowUpRight size={12} />
            {delta}
          </span>
        </div>
        <ChartContainer
          config={chartConfig}
          className="mt-3 aspect-auto h-24 w-full"
        >
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
                  hideLabel
                  formatter={(v) => moneyShort(Number(v))}
                />
              }
            />
            <Area
              dataKey="value"
              type="linear"
              fill="var(--color-savings)"
              fillOpacity={0.4}
              stroke="var(--color-savings)"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="bg-transparent px-4 pb-3 pt-2">
        <div className="flex w-full items-start gap-2 text-[11px]">
          <div className="grid gap-1">
            <div className="leading-none font-medium text-zinc-300">
              Projected run-rate
            </div>
            <div className="leading-none text-muted/70">
              {pctOfSpend.toFixed(1)}% of annual spend · evenly across 12 months, no growth assumed
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}

function BreakdownRow({
  label,
  value,
  total,
  color,
  bar,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
  bar: string;
}) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="w-24 shrink-0 text-[10.5px] text-muted">{label}</span>
      <span className="h-[6px] flex-1 overflow-hidden rounded-sm bg-white/[0.06]">
        <span className={`block h-full rounded-sm ${bar}`} style={{ width: `${pct}%` }} />
      </span>
      <span className={`w-8 shrink-0 text-right text-[11px] font-semibold tabular-nums ${color}`}>{value}</span>
    </div>
  );
}

function FinCard({
  label,
  meta,
  value,
  delta,
  up,
  beam,
  actionHref,
  hrefLabel,
  className = "",
  children,
}: {
  label: string;
  meta?: React.ReactNode;
  value: React.ReactNode;
  delta?: React.ReactNode;
  up?: boolean;
  beam?: boolean;
  actionHref?: string;
  hrefLabel?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useSpotlight<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`spotlight-card glass-border rounded-lg border border-line bg-surface ${beam ? "border-beam" : "glass-glow"} ${className}`}
    >
      <div className="spotlight-glow" aria-hidden="true" />
      {/* header */}
      <div className="flex h-10 items-center gap-2 border-b border-line px-4">
        <h2 className="text-[11px] font-medium tracking-[-0.01em] text-muted">{label}</h2>
        {meta && <span className="truncate text-[11px] tabular-nums text-muted/70">{meta}</span>}
        {actionHref && (
          <Link
            href={actionHref}
            className="ml-auto flex shrink-0 items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] font-medium text-muted transition-colors hover:bg-white/[0.05] hover:text-fg"
          >
            {hrefLabel}
            <ArrowUpRight size={11} />
          </Link>
        )}
      </div>
      {/* value row */}
      <div className="flex items-end justify-between gap-3 px-4 pt-3">
        <p className="min-w-0 truncate text-[26px] font-semibold leading-none tracking-[-0.02em] text-fg tabular-nums">
          {value}
        </p>
        {delta !== undefined && (
          <span
            className={`mb-0.5 flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${
              up ? "text-zinc-200" : "text-zinc-300"
            }`}
          >
            {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} className="text-zinc-100" />}
            {delta}
          </span>
        )}
      </div>
      {/* body */}
      <div className="px-4 pb-3 pt-3">{children}</div>
    </div>
  );
}