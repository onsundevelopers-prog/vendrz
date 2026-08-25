"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { getActivity, getDemoAudit, getEmailThreads } from "@/lib/store";
import { Panel, StatCard, HealthScore } from "@/components/ui/primitives";
import { AreaChart, DonutChart, BarChart } from "@/components/ui/charts";
import { money, moneyShort, pct, timeAgo, formatDateShort, daysUntil } from "@/lib/format";
import { AnimatedStat } from "@/components/ui/RollingNumber";
import type { VendorProfile } from "@/lib/types";

const ease = [0.22, 1, 0.36, 1] as const;

const CATEGORY_COLORS: Record<string, string> = {
  Software: "#34d399",
  Cloud: "#38bdf8",
  Marketing: "#f472b6",
  Operations: "#fbbf24",
  Finance: "#a78bfa",
  HR: "#fb923c",
  Infrastructure: "#e2e8f0",
  Other: "#71717a",
};

const RISK_COLORS: Record<string, string> = {
  critical: "#f87171",
  high: "#fb923c",
  medium: "#fbbf24",
  low: "#71717a",
};

export default function DashboardOverview() {
  const audit = getDemoAudit();
  const activity = getActivity("demo");
  const threads = getEmailThreads("demo");
  const series = audit.spendSeries.map((s) => ({ label: s.label, value: s.total }));

  const topSavings = [...audit.opportunities]
    .filter((o) => o.status !== "dismissed")
    .sort((a, b) => b.estimatedSavings - a.estimatedSavings)
    .slice(0, 5);

  /* ---- renewal timeline (next 6 months) ---- */
  const renewals = audit.vendors
    .filter((v) => v.renewalDate && daysUntil(v.renewalDate) >= 0)
    .sort((a, b) => daysUntil(a.renewalDate) - daysUntil(b.renewalDate))
    .slice(0, 6);

  /* ---- cancellation deadlines (nearest, including past) ---- */
  const deadlines = audit.vendors
    .filter((v) => v.cancellationDeadline && v.autoRenew)
    .sort((a, b) => daysUntil(a.cancellationDeadline) - daysUntil(b.cancellationDeadline))
    .slice(0, 5);

  /* ---- risk distribution for chart ---- */
  const riskDist = (["critical", "high", "medium", "low"] as const)
    .map((lvl) => ({
      label: lvl,
      value: audit.vendors.filter((v) => v.risk?.level === lvl).length,
      color: RISK_COLORS[lvl],
    }))
    .filter((d) => d.value > 0);
  const riskTotal = riskDist.reduce((a, d) => a + d.value, 0);

  /* ---- top vendors by value for chart ---- */
  const topVendors = [...audit.vendors].sort((a, b) => b.annualSpend - a.annualSpend).slice(0, 8);

  /* ---- attention list ---- */
  const attention = [
    ...audit.vendors
      .filter((v) => v.risk)
      .sort((a, b) => (a.risk?.daysToRenewal ?? 999) - (b.risk?.daysToRenewal ?? 999))
      .slice(0, 3)
      .map((v) => ({
        id: v.id,
        kind: "renewal" as const,
        title: `${v.name} renews in ${v.risk?.daysToRenewal} days`,
        detail: v.risk?.autoRenew ? "Auto-renews — cancel by " + (v.risk?.daysToDeadline ?? 0) + " days" : "Manual renewal",
        severity: v.risk?.level ?? "low",
        vendor: v,
      })),
    ...audit.vendors
      .filter((v) => v.billing.variancePct > 8 || v.billing.anomalies.length > 0)
      .sort((a, b) => Math.abs(b.billing.variancePct) - Math.abs(a.billing.variancePct))
      .slice(0, 2)
      .map((v) => ({
        id: v.id + "-b",
        kind: "billing" as const,
        title: `${v.name} billing ${pct(v.billing.variancePct)} vs contract`,
        detail: v.billing.anomalies[0]?.detail ?? "Unexplained variance",
        severity: Math.abs(v.billing.variancePct) > 15 ? ("high" as const) : ("medium" as const),
        vendor: v,
      })),
    ...audit.vendors
      .filter((v) => v.priceEscalationRate && v.priceEscalationRate >= 5)
      .slice(0, 1)
      .map((v) => ({
        id: v.id + "-p",
        kind: "price" as const,
        title: `${v.name} price increase ${v.priceEscalationRate}%`,
        detail: "Uncapped annual escalation on renewal",
        severity: "medium" as const,
        vendor: v,
      })),
    ...audit.vendors
      .filter((v) => (v.usage?.inactiveUsers ?? 0) >= 9)
      .sort((a, b) => (b.usage?.inactiveUsers ?? 0) - (a.usage?.inactiveUsers ?? 0))
      .slice(0, 1)
      .map((v) => ({
        id: v.id + "-u",
        kind: "seats" as const,
        title: `${v.name} has ${v.usage?.inactiveUsers} unused seats`,
        detail: `${v.usage?.utilizationPct.toFixed(0)}% utilization · ${money(v.usage?.unusedSeatCost ?? 0)}/yr`,
        severity: "medium" as const,
        vendor: v,
      })),
  ];

  const donutData = audit.categories.map((c) => ({
    name: c.name,
    value: c.spend,
    color: CATEGORY_COLORS[c.name] ?? "#71717a",
  }));

  const severityDot: Record<string, string> = {
    critical: "bg-red-400",
    high: "bg-orange-400",
    medium: "bg-amber-400",
    low: "bg-zinc-500",
  };

  /* ---- AI insights derived from real audit data ---- */
  const aiInsights = buildInsights(audit.vendors, threads);

  return (
    <div className="space-y-6">
      {/* header */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease }}
        className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <h2 className="text-xl font-semibold leading-[1.05] tracking-[-0.035em] text-fg">
            Vendor spend overview
          </h2>
          <p className="mt-1 text-[12.5px] tracking-tight text-muted">
            {audit.companyName} · trailing 12 months · {audit.vendorCount} vendors under watch
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/agent"
            className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/[0.08] px-4 py-2 text-[13px] font-medium tracking-tight text-emerald-300 transition-colors hover:bg-emerald-500/15"
          >
            <span aria-hidden="true" className="text-[14px] leading-none">✦</span>
            Open vendor agent
          </Link>
          <span className="hidden text-[11px] uppercase tracking-[0.12em] text-muted sm:inline">
            Vendor spend health
          </span>
          <HealthScore score={audit.healthScore} />
        </div>
      </motion.div>

      {/* top cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total vendor spend"
          value={audit.totalAnnualSpend}
          valueFormat={money}
          accent="text-fg"
          sub="/yr · across all categories"
        />
        <StatCard
          label="Potential savings"
          value={audit.potentialSavings}
          valueFormat={money}
          accent="text-emerald-400"
          sub="estimates · not guaranteed"
        />
        <StatCard
          label="Monthly spend"
          value={audit.monthlySpend}
          valueFormat={money}
          accent="text-fg"
          sub={`${moneyShort(audit.spendSeries[audit.spendSeries.length - 2]?.total ?? 0)} last month`}
          delay={0.06}
        />
        <StatCard
          label="Renewal risks"
          value={audit.renewalRisks}
          accent="text-amber-400"
          sub={`${deadlines.filter((d) => daysUntil(d.cancellationDeadline) < 0).length} past cancellation deadline${deadlines.filter((d) => daysUntil(d.cancellationDeadline) < 0).length === 1 ? "" : "s"}`}
          delay={0.12}
        />
      </div>

      {/* spend trend + categories */}
      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <Panel delay={0.1} className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-fg">Spend trend</h3>
              <p className="mt-0.5 text-[11.5px] tracking-tight text-muted">Monthly vendor spend</p>
            </div>
            <Link
              href="/dashboard/spend"
              className="text-[12px] tracking-tight text-emerald-400 hover:text-emerald-300"
            >
              Full analysis →
            </Link>
          </div>
          <div className="mt-4">
            <AreaChart data={series} height={190} fillId="ov-area" />
          </div>
        </Panel>

        <Panel delay={0.16} className="p-5">
          <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-fg">Categories</h3>
          <div className="mt-2 flex items-center gap-4">
            <DonutChart
              data={donutData}
              size={148}
              thickness={14}
              centerValue={moneyShort(audit.totalAnnualSpend)}
              centerLabel="annual"
            />
            <div className="min-w-0 flex-1 space-y-2">
              {audit.categories.slice(0, 6).map((c) => (
                <div key={c.name} className="flex items-center gap-2">
                  <span className="size-2 shrink-0 rounded-full" style={{ background: CATEGORY_COLORS[c.name] ?? "#71717a" }} />
                  <span className="min-w-0 flex-1 truncate text-[12.5px] text-muted">{c.name}</span>
                  <span className="text-[12px] font-medium text-fg">{moneyShort(c.spend)}</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>

      {/* AI insights */}
      <Panel delay={0.2} className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h3 className="flex items-center gap-2 text-[15px] font-semibold tracking-[-0.01em] text-fg">
              <span aria-hidden="true" className="text-[14px] text-emerald-400">✦</span>
              AI insights
            </h3>
            <p className="mt-0.5 text-[11.5px] tracking-tight text-muted">
              Generated from your vendor data and recent vendor correspondence
            </p>
          </div>
          <Link
            href="/dashboard/agent"
            className="text-[12px] tracking-tight text-emerald-400 hover:text-emerald-300"
          >
            Ask the agent →
          </Link>
        </div>
        <div className="grid gap-px bg-line lg:grid-cols-2">
          {aiInsights.map((ins, i) => (
            <div key={i} className="flex gap-3 bg-surface px-5 py-4">
              <span className={`mt-1 size-2 shrink-0 rounded-full ${ins.tone === "alert" ? "bg-amber-400" : ins.tone === "positive" ? "bg-emerald-400" : "bg-zinc-500"}`} />
              <div>
                <p className="text-[13.5px] font-medium leading-snug text-fg">{ins.title}</p>
                <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted">{ins.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* renewal timeline + risk distribution */}
      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Panel delay={0.24} className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-fg">Renewal timeline</h3>
              <p className="mt-0.5 text-[11.5px] tracking-tight text-muted">Next contracts up for renewal</p>
            </div>
            <Link
              href="/dashboard/renewals"
              className="text-[12px] tracking-tight text-emerald-400 hover:text-emerald-300"
            >
              All renewals →
            </Link>
          </div>
          <div className="mt-5 space-y-4">
            {renewals.map((v) => {
              const d = daysUntil(v.renewalDate);
              const daysLeft = Math.max(1, d);
              const pctW = Math.max(4, Math.min(100, (1 - daysLeft / 200) * 100));
              return (
                <Link
                  key={v.id}
                  href={`/dashboard/vendors/${v.id}`}
                  className="group block"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-fg group-hover:text-emerald-300">{v.name}</p>
                      <p className="text-[11px] tracking-tight text-muted">
                        {formatDateShort(v.renewalDate)} · {d} days · {money(v.annualSpend)}/yr
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                      d <= 30
                        ? "border-red-500/30 bg-red-500/10 text-red-400"
                        : d <= 60
                          ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                          : "border-white/10 bg-white/[0.04] text-muted"
                    }`}>
                      {d <= 30 ? "Urgent" : d <= 60 ? "Soon" : `${d}d`}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pctW}%`,
                        background: d <= 30 ? "#f87171" : d <= 60 ? "#fbbf24" : "#34d399",
                      }}
                    />
                  </div>
                </Link>
              );
            })}
            {renewals.length === 0 && (
              <p className="py-6 text-center text-[13px] text-muted">No upcoming renewals.</p>
            )}
          </div>
        </Panel>

        <div className="space-y-5">
          <Panel delay={0.28} className="p-5">
            <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-fg">Vendor risk distribution</h3>
            <p className="mt-0.5 text-[11.5px] tracking-tight text-muted">
              {riskTotal} vendors with active renewal risk
            </p>
            <div className="mt-4">
              <BarChart
                data={riskDist.map((d) => ({ label: d.label, value: d.value }))}
                height={130}
                color="#fbbf24"
                highlightLast={false}
              />
            </div>
          </Panel>

          <Panel delay={0.32} className="p-5">
            <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-fg">Contract value by vendor</h3>
            <p className="mt-0.5 text-[11.5px] tracking-tight text-muted">Top 8 by annual spend</p>
            <div className="mt-4 space-y-2.5">
              {topVendors.map((v) => (
                <Link
                  key={v.id}
                  href={`/dashboard/vendors/${v.id}`}
                  className="group flex items-center gap-3"
                >
                  <span className="w-32 shrink-0 truncate text-[12.5px] text-muted group-hover:text-emerald-300">
                    {v.name}
                  </span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full bg-emerald-400/70 transition-all group-hover:bg-emerald-400"
                      style={{ width: `${(v.annualSpend / (topVendors[0]?.annualSpend ?? 1)) * 100}%` }}
                    />
                  </div>
                  <span className="w-16 shrink-0 text-right text-[12px] font-medium text-fg">
                    {moneyShort(v.annualSpend)}
                  </span>
                </Link>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      {/* attention + activity feed */}
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          <Panel delay={0.36} className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-fg">
                Attention required
              </h3>
              <Link
                href="/dashboard/alerts"
                className="text-[12px] tracking-tight text-emerald-400 hover:text-emerald-300"
              >
                All alerts →
              </Link>
            </div>
            <div className="divide-y divide-line">
              {attention.map((a) => (
                <Link
                  key={a.id}
                  href={`/dashboard/vendors/${a.vendor.id}`}
                  className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-white/[0.03]"
                >
                  <span className={`mt-[7px] size-1.5 shrink-0 rounded-full ${severityDot[a.severity]}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium text-fg group-hover:text-emerald-300">{a.title}</p>
                    <p className="truncate text-[11.5px] tracking-tight text-muted">{a.detail}</p>
                  </div>
                  <span className="shrink-0 text-[11px] uppercase tracking-wide text-muted">
                    {a.kind}
                  </span>
                </Link>
              ))}
            </div>
          </Panel>

          <Panel delay={0.4} className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-fg">
                Cancellation deadlines
              </h3>
              <span className="text-[11.5px] tracking-tight text-muted">auto-renew contracts</span>
            </div>
            <div className="divide-y divide-line">
              {deadlines.map((v) => {
                const d = daysUntil(v.cancellationDeadline);
                return (
                  <Link
                    key={v.id}
                    href={`/dashboard/vendors/${v.id}`}
                    className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-white/[0.03]"
                  >
                    <span className={`mt-[7px] size-1.5 shrink-0 rounded-full ${d < 0 ? "bg-red-400" : d <= 14 ? "bg-amber-400" : "bg-emerald-400"}`} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium text-fg group-hover:text-emerald-300">{v.name}</p>
                      <p className="truncate text-[11.5px] tracking-tight text-muted">
                        {d < 0 ? `Deadline passed ${Math.abs(d)} days ago` : `Cancel by ${formatDateShort(v.cancellationDeadline)}`}
                      </p>
                    </div>
                    <span className={`shrink-0 text-[12px] font-medium ${d < 0 ? "text-red-400" : d <= 14 ? "text-amber-400" : "text-muted"}`}>
                      {d < 0 ? "Passed" : `${d}d`}
                    </span>
                  </Link>
                );
              })}
            </div>
          </Panel>
        </div>

        <Panel delay={0.44} className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <div>
              <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-fg">Recent activity</h3>
              <p className="mt-0.5 text-[11.5px] tracking-tight text-muted">Alerts, agent actions, and reviews</p>
            </div>
            <span className="text-[11.5px] tracking-tight text-muted">last 30 days</span>
          </div>
          <div className="max-h-[430px] overflow-y-auto">
            <div className="divide-y divide-line">
              {activity.slice(0, 8).map((a) => (
                <div key={a.id} className="flex gap-3 px-5 py-3.5">
                  <div className="flex flex-col items-center">
                    <span className={`flex size-6 shrink-0 items-center justify-center rounded-full border border-line bg-white/[0.04] text-[10px] ${
                      a.actor === "agent" ? "text-emerald-400" : a.actor === "user" ? "text-fg" : "text-muted"
                    }`}>
                      {a.actor === "agent" ? "✦" : a.actor === "user" ? "●" : "◉"}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] leading-snug text-fg">{a.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-[12px] leading-relaxed text-muted">{a.detail}</p>
                    <div className="mt-1 flex items-center gap-2 text-[10.5px] tracking-tight text-muted/60">
                      <span className="capitalize">{a.actor}</span>
                      <span>·</span>
                      <span>{timeAgo(a.createdAt)}</span>
                      {a.vendorName && (
                        <>
                          <span>·</span>
                          <Link
                            href={`/dashboard/vendors/${a.vendorId ?? ""}`}
                            className="text-emerald-400/80 hover:text-emerald-300"
                          >
                            {a.vendorName}
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>

      {/* top savings + counters */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel delay={0.48} className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-fg">
              Top savings opportunities
            </h3>
            <Link
              href="/dashboard/savings"
              className="text-[12px] tracking-tight text-emerald-400 hover:text-emerald-300"
            >
              Savings engine →
            </Link>
          </div>
          <div className="divide-y divide-line">
            {topSavings.map((o, i) => (
              <Link
                key={o.id}
                href={`/dashboard/vendors/${o.vendorId}`}
                className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-white/[0.03]"
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-[11px] font-semibold text-muted">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium text-fg group-hover:text-emerald-300">
                    {o.vendorName}
                  </p>
                  <p className="truncate text-[11.5px] tracking-tight text-muted">{o.title}</p>
                </div>
                <p className="shrink-0 text-[14px] font-semibold tracking-tight text-emerald-400">
                  {money(o.estimatedSavings)}
                </p>
              </Link>
            ))}
          </div>
        </Panel>

        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { label: "Unused licenses", value: audit.unusedLicenses, to: "/dashboard/usage", accent: "text-orange-400" },
            { label: "Billing anomalies", value: audit.billingAnomalies, to: "/dashboard/invoices", accent: "text-red-400" },
            { label: "Price increases", value: audit.priceIncreases, to: "/dashboard/renewals", accent: "text-amber-400" },
            { label: "Opportunities open", value: audit.opportunities.filter((o) => o.status === "open").length, to: "/dashboard/actions", accent: "text-emerald-400" },
          ].map((c, i) => (
            <Link key={c.label} href={c.to}>
              <Panel delay={0.52 + i * 0.05} className="flex h-full flex-col justify-between p-4 transition-colors hover:bg-white/[0.03]">
                <p className="text-[11px] uppercase tracking-[0.1em] text-muted">{c.label}</p>
                <p className={`mt-1.5 text-[24px] font-semibold leading-none tracking-tight ${c.accent}`}>
                  <AnimatedStat value={c.value} duration={1200 + i * 150} />
                </p>
              </Panel>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  AI insight generation — deterministic, derived from real data     */
/* ------------------------------------------------------------------ */

function buildInsights(vendors: VendorProfile[], threads: { vendorId: string; category: string; unread: boolean }[]): {
  title: string;
  detail: string;
  tone: "alert" | "positive" | "neutral";
}[] {
  const out: { title: string; detail: string; tone: "alert" | "positive" | "neutral" }[] = [];

  const urgent = vendors
    .filter((v) => v.risk && v.risk.daysToRenewal <= 45)
    .sort((a, b) => (a.risk?.daysToRenewal ?? 0) - (b.risk?.daysToRenewal ?? 0));
  if (urgent.length > 0) {
    const v = urgent[0];
    out.push({
      title: `${v.name} renews in ${v.risk?.daysToRenewal} days${v.risk?.autoRenew ? " and will auto-renew" : ""}`,
      detail: `The cancellation window closes in ${v.risk?.daysToDeadline} days (${v.risk?.noticePeriodDays}-day notice). Decide whether to renegotiate or let it renew.`,
      tone: "alert",
    });
  }

  const overbilled = vendors
    .filter((v) => v.billing.variancePct > 8)
    .sort((a, b) => Math.abs(b.billing.variancePct) - Math.abs(a.billing.variancePct));
  if (overbilled.length > 0) {
    const v = overbilled[0];
    out.push({
      title: `${v.name} is billing ${pct(v.billing.variancePct)} above contract`,
      detail: `That's roughly ${money(Math.abs(v.billing.actualMonthly - v.billing.expectedMonthly) * 12)}/yr beyond the contracted baseline. A billing dispute could recover this.`,
      tone: "alert",
    });
  }

  const unreadRenewal = threads.filter((t) => t.category === "renewal" && t.unread);
  if (unreadRenewal.length > 0) {
    out.push({
      title: `${unreadRenewal.length} renewal notice${unreadRenewal.length === 1 ? " is" : "s are"} unread in your inbox`,
      detail: "The agent can summarize these threads and draft replies — nothing is sent without your approval.",
      tone: "neutral",
    });
  }

  const lowUtil = vendors
    .filter((v) => v.usage && v.usage.utilizationPct < 40 && v.annualSpend >= 2000)
    .sort((a, b) => (a.usage?.utilizationPct ?? 0) - (b.usage?.utilizationPct ?? 0));
  if (lowUtil.length > 0) {
    const v = lowUtil[0];
    out.push({
      title: `${v.name} is only ${v.usage?.utilizationPct.toFixed(0)}% utilized`,
      detail: `${v.usage?.activeUsers} of ${v.usage?.seatsPurchased} seats are active — a cancellation candidate worth ${money(v.potentialSavings)}/yr.`,
      tone: "neutral",
    });
  }

  const highEsc = vendors.filter((v) => (v.priceEscalationRate ?? 0) >= 5);
  if (highEsc.length > 0) {
    out.push({
      title: `${highEsc.length} contracts escalate ${Math.max(...highEsc.map((v) => v.priceEscalationRate ?? 0))}%+ per year`,
      detail: "Uncapped escalations compound. Capping these at CPI before the next anniversary is a high-confidence win.",
      tone: "alert",
    });
  }

  const clean = vendors.filter(
    (v) => !v.risk && v.billing.variancePct === 0 && v.usage && v.usage.utilizationPct >= 75
  ).length;
  out.push({
    title: `${clean} vendors are running healthy`,
    detail: "No renewal risk, no billing variance, strong utilization — nothing to do on these right now.",
    tone: "positive",
  });

  return out.slice(0, 6);
}
