"use client";

import { getDemoAudit } from "@/lib/store";
import { buildExecutiveReport } from "@/lib/services/audit";
import { Panel, SectionHeader, HealthScore, SeverityBadge } from "@/components/ui/primitives";
import { AreaChart, DonutChart } from "@/components/ui/charts";
import { money, formatDate, pct } from "@/lib/format";

const CATEGORY_COLORS: Record<string, string> = {
  Software: "#e4e4e7",
  Cloud: "#c8c8cc",
  Marketing: "#a1a1aa",
  Operations: "#8a8a92",
  Finance: "#71717a",
  HR: "#5c5c64",
  Infrastructure: "#e2e8f0",
  Other: "#71717a",
};

export default function ReportsPage() {
  const audit = getDemoAudit();
  const report = buildExecutiveReport(audit);
  const series = report.spendSeries.map((s) => ({ label: s.label, value: s.total }));
  const donutData = report.categories.map((c) => ({
    name: c.name,
    value: c.spend,
    color: CATEGORY_COLORS[c.name] ?? "#71717a",
  }));

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Executive report"
        subtitle={`${report.company} · generated ${formatDate(report.generatedAt.slice(0, 10))}`}
        action={
          <button
            onClick={() => window.print()}
            className="inline-flex h-10 items-center rounded-full border border-white/15 px-5 text-[13.5px] font-medium text-fg transition-colors hover:bg-white/10"
          >
            Export / Print
          </button>
        }
      />

      {/* cover summary */}
      <Panel delay={0.05} className="overflow-hidden">
        <div className="border-b border-line bg-panel px-6 py-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-muted">
                <span className="size-1.5 rounded-full bg-zinc-400" />
                Vendor Spend Intelligence Report
              </p>
              <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-fg">{report.company}</h3>
              <p className="mt-1 text-[12px] tracking-tight text-muted">
                Trailing 12 months · {report.vendorCount} vendors
              </p>
            </div>
            <div className="flex items-center gap-6">
              <div>
                <p className="text-[10.5px] uppercase tracking-[0.1em] text-muted">Total vendor spend</p>
                <p className="mt-1 text-[26px] font-semibold tracking-tight text-fg">{money(report.totalAnnualSpend)}</p>
              </div>
              <div>
                <p className="text-[10.5px] uppercase tracking-[0.1em] text-muted">Potential savings</p>
                <p className="mt-1 text-[26px] font-semibold tracking-tight text-fg">{money(report.potentialSavings)}</p>
              </div>
              <div>
                <p className="text-[10.5px] uppercase tracking-[0.1em] text-muted">Confirmed savings</p>
                <p className="mt-1 text-[26px] font-semibold tracking-tight text-fg">{money(report.confirmedSavings)}</p>
              </div>
              <div>
                <p className="text-[10.5px] uppercase tracking-[0.1em] text-muted">Vendor health</p>
                <div className="mt-1">
                  <HealthScore score={report.healthScore} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-[1.7fr_1fr]">
          <div>
            <p className="text-[10.5px] uppercase tracking-[0.12em] text-muted">Spend trend</p>
            <div className="mt-2">
              <AreaChart data={series} height={170} fillId="rep-area" />
            </div>
          </div>
          <div>
            <p className="text-[10.5px] uppercase tracking-[0.12em] text-muted">By category</p>
            <div className="mt-2 flex items-center gap-4">
              <DonutChart data={donutData} size={130} thickness={13} centerValue={report.categories[0]?.name.slice(0, 1) ?? ""} />
              <div className="min-w-0 flex-1 space-y-1.5">
                {report.categories.slice(0, 5).map((c) => (
                  <div key={c.name} className="flex items-center gap-2">
                    <span className="size-2 shrink-0 rounded-full" style={{ background: CATEGORY_COLORS[c.name] ?? "#71717a" }} />
                    <span className="min-w-0 flex-1 truncate text-[12px] text-muted">{c.name}</span>
                    <span className="text-[12px] font-medium text-fg">{money(c.spend)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Panel>

      {/* top vendors */}
      <Panel delay={0.1} className="overflow-hidden">
        <div className="border-b border-line px-5 py-4">
          <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-fg">Top vendors by spend</h3>
        </div>
        <div className="divide-y divide-line">
          {report.topVendors.map((v, i) => (
            <div key={v.id} className="flex items-center gap-3 px-5 py-2.5">
              <span className="w-4 text-[11px] text-muted">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-medium text-fg">{v.name}</p>
                <p className="text-[10.5px] tracking-tight text-muted">{v.category}</p>
              </div>
              <span className={`text-[11.5px] ${v.spendTrendPct >= 0 ? "text-red-400" : "text-fg"}`}>
                {pct(v.spendTrendPct)}
              </span>
              <span className="w-16 text-right text-[11.5px] text-muted">
                {v.risk ? `renews ${v.risk.daysToRenewal}d` : "-"}
              </span>
              <p className="w-24 text-right text-[13px] font-medium text-fg">{money(v.annualSpend)}</p>
            </div>
          ))}
        </div>
      </Panel>

      {/* risk + anomalies + opportunities */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel delay={0.15} className="overflow-hidden">
          <div className="border-b border-line px-5 py-4">
            <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-fg">Renewal risks</h3>
          </div>
          <div className="divide-y divide-line">
            {report.renewalRisks.slice(0, 8).map((v) => (
              <div key={v.id} className="flex items-center gap-3 px-5 py-2.5">
                <SeverityBadge severity={v.risk?.level ?? "low"} />
                <p className="min-w-0 flex-1 truncate text-[13.5px] text-fg">{v.name}</p>
                <p className="text-[11.5px] text-muted">{formatDate(v.renewalDate)}</p>
                <p className="w-24 text-right text-[13px] font-medium text-red-400">
                  {money(v.risk?.potentialRenewalCost ?? v.annualSpend)}
                </p>
              </div>
            ))}
          </div>
        </Panel>

        <div className="space-y-5">
          <Panel delay={0.18} className="overflow-hidden">
            <div className="border-b border-line px-5 py-4">
              <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-fg">Billing anomalies</h3>
            </div>
            <div className="divide-y divide-line">
              {report.anomalies.slice(0, 5).map((v) => (
                <div key={v.id} className="flex items-center gap-3 px-5 py-2.5">
                  <p className="min-w-0 flex-1 truncate text-[13.5px] text-fg">{v.name}</p>
                  <p className="text-[11.5px] text-muted">
                    {v.billing.anomalies.length} anomaly{v.billing.anomalies.length > 1 ? "ies" : "y"}
                  </p>
                  <p className="w-24 text-right text-[13px] font-medium text-red-400">
                    {pct(v.billing.variancePct)}
                  </p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel delay={0.2} className="overflow-hidden">
            <div className="border-b border-line px-5 py-4">
              <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-fg">Unused seats</h3>
            </div>
            <div className="divide-y divide-line">
              {report.unusedSeats.slice(0, 5).map((v) => (
                <div key={v.id} className="flex items-center gap-3 px-5 py-2.5">
                  <p className="min-w-0 flex-1 truncate text-[13.5px] text-fg">{v.name}</p>
                  <p className="text-[11.5px] text-muted">{v.usage?.inactiveUsers} seats</p>
                  <p className="w-24 text-right text-[13px] font-medium text-red-400">
                    {money(v.usage?.unusedSeatCost ?? 0)}
                  </p>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      {/* recommended actions */}
      <Panel delay={0.22} className="overflow-hidden">
        <div className="border-b border-line px-5 py-4">
          <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-fg">Recommended actions</h3>
          <p className="mt-0.5 text-[11.5px] tracking-tight text-muted">
            Top {report.opportunities.length} opportunities by estimated impact
          </p>
        </div>
        <div className="divide-y divide-line">
          {report.opportunities.slice(0, 10).map((o) => (
            <div key={o.id} className="flex items-center gap-3 px-5 py-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-[10.5px] font-semibold text-fg">
                {o.vendorName.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-medium text-fg">{o.vendorName} - {o.title}</p>
                <p className="truncate text-[11px] tracking-tight text-muted">{o.recommendedAction}</p>
              </div>
              <p className="w-24 shrink-0 text-right text-[13.5px] font-semibold text-fg">
                {money(o.estimatedSavings)}
              </p>
            </div>
          ))}
        </div>
      </Panel>

      <p className="text-[11px] leading-relaxed tracking-tight text-muted/70">
        All savings figures are potential estimates produced by deterministic rules from contracted terms,
        usage, and billing data - not guaranteed savings. Report generated on sample data (Acme Technologies).
      </p>
    </div>
  );
}
