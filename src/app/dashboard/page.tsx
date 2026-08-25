"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { getDemoAudit } from "@/lib/store";
import { Panel, StatCard, HealthScore } from "@/components/ui/primitives";
import { AreaChart, DonutChart } from "@/components/ui/charts";
import { money, moneyShort, pct } from "@/lib/format";
import { AnimatedStat } from "@/components/ui/RollingNumber";

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

export default function DashboardOverview() {
  const audit = getDemoAudit();
  const series = audit.spendSeries.map((s) => ({ label: s.label, value: s.total }));

  const topSavings = [...audit.opportunities]
    .filter((o) => o.status !== "dismissed")
    .sort((a, b) => b.estimatedSavings - a.estimatedSavings)
    .slice(0, 5);

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
          <span className="text-[11px] uppercase tracking-[0.12em] text-muted">
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
          label="Vendors"
          value={audit.vendorCount}
          accent="text-fg"
          sub={`${audit.categories.length} categories`}
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

      {/* top savings + attention required */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel delay={0.2} className="overflow-hidden">
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

        <Panel delay={0.26} className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h3 className="flex items-center gap-2 text-[15px] font-semibold tracking-[-0.01em] text-fg">
              <span className="size-1.5 rounded-full bg-amber-400" />
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
      </div>

      {/* quick counters strip */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Renewal risks", value: audit.renewalRisks, to: "/dashboard/renewals", accent: "text-amber-400" },
          { label: "Unused licenses", value: audit.unusedLicenses, to: "/dashboard/usage", accent: "text-orange-400" },
          { label: "Billing anomalies", value: audit.billingAnomalies, to: "/dashboard/invoices", accent: "text-red-400" },
          { label: "Price increases", value: audit.priceIncreases, to: "/dashboard/renewals", accent: "text-amber-400" },
        ].map((c, i) => (
          <Link key={c.label} href={c.to}>
            <Panel delay={0.3 + i * 0.05} className="flex items-center justify-between p-4 transition-colors hover:bg-white/[0.03]">
              <div>
                <p className="text-[11px] uppercase tracking-[0.1em] text-muted">{c.label}</p>
                <p className={`mt-1.5 text-[24px] font-semibold leading-none tracking-tight ${c.accent}`}>
                  <AnimatedStat value={c.value} duration={1200 + i * 150} />
                </p>
              </div>
              <span className={`size-2 rounded-full ${c.accent.replace("text-", "bg-")}`} />
            </Panel>
          </Link>
        ))}
      </div>
    </div>
  );
}
