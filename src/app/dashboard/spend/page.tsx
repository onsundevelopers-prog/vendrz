"use client";

import Link from "next/link";
import { getDemoAudit } from "@/lib/store";
import { Panel, SectionHeader, StatCard } from "@/components/ui/primitives";
import { AreaChart, BarChart, DonutChart, Sparkline } from "@/components/ui/charts";
import { money, moneyShort } from "@/lib/format";

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

export default function SpendPage() {
  const audit = getDemoAudit();
  const series = audit.spendSeries.map((s) => ({ label: s.label, value: s.total }));
  const topVendors = [...audit.vendors].sort((a, b) => b.annualSpend - a.annualSpend).slice(0, 10);

  const prev3 = audit.spendSeries.slice(-6, -3).reduce((a, s) => a + s.total, 0) / 3;
  const last3 = audit.spendSeries.slice(-3).reduce((a, s) => a + s.total, 0) / 3;
  const quarterlyDelta = last3 - prev3;

  const donutData = audit.categories.map((c) => ({
    name: c.name,
    value: c.spend,
    color: CATEGORY_COLORS[c.name] ?? "#71717a",
  }));

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Spend analytics"
        subtitle={`${audit.companyName} · trailing 12 months`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total vendor spend" value={audit.totalAnnualSpend} valueFormat={money} sub="/yr" />
        <StatCard label="Monthly spend" value={audit.monthlySpend} valueFormat={money} sub="current month" delay={0.05} />
        <StatCard
          label="Quarterly run-rate"
          value={quarterlyDelta}
          valueFormat={money}
          accent={quarterlyDelta >= 0 ? "text-orange-400" : "text-emerald-400"}
          sub={quarterlyDelta >= 0 ? "up vs prior quarter" : "down vs prior quarter"}
          delay={0.1}
        />
        <StatCard label="Categories" value={audit.categories.length} sub={`${audit.vendorCount} vendors`} delay={0.15} />
      </div>

      <Panel delay={0.1} className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-fg">Monthly spend trend</h3>
            <p className="mt-0.5 text-[11.5px] tracking-tight text-muted">
              Total vendor spend across all categories
            </p>
          </div>
          <div className="text-right">
            <p className="text-[22px] font-semibold tracking-tight text-fg">
              {moneyShort(audit.monthlySpend)}
            </p>
            <p className="text-[10.5px] tracking-tight text-muted">last month</p>
          </div>
        </div>
        <div className="mt-4">
          <AreaChart data={series} height={220} fillId="spend-area" />
        </div>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        {/* categories */}
        <Panel delay={0.15} className="p-5">
          <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-fg">Spend by category</h3>
          <div className="mt-4 flex flex-wrap items-center gap-6">
            <DonutChart
              data={donutData}
              size={176}
              thickness={16}
              centerValue={moneyShort(audit.totalAnnualSpend)}
              centerLabel="annual"
            />
            <div className="min-w-0 flex-1 space-y-2.5">
              {audit.categories.map((c) => (
                <div key={c.name} className="flex items-center gap-2.5">
                  <span className="size-2 shrink-0 rounded-full" style={{ background: CATEGORY_COLORS[c.name] ?? "#71717a" }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] text-muted">{c.name}</span>
                      <span className="text-[12.5px] font-medium text-fg">{moneyShort(c.spend)}</span>
                    </div>
                    <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/[0.07]">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${(c.spend / audit.totalAnnualSpend) * 100}%`, background: CATEGORY_COLORS[c.name] ?? "#71717a" }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        {/* top vendors */}
        <Panel delay={0.2} className="overflow-hidden">
          <div className="border-b border-line px-5 py-4">
            <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-fg">Top vendors by spend</h3>
            <p className="mt-0.5 text-[11.5px] tracking-tight text-muted">
              {money(topVendors[0]?.annualSpend ?? 0)}–{money(topVendors[topVendors.length - 1]?.annualSpend ?? 0)}/yr
            </p>
          </div>
          <div className="divide-y divide-line">
            {topVendors.map((v, i) => (
              <Link
                key={v.id}
                href={`/dashboard/vendors/${v.id}`}
                className="group flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-white/[0.03]"
              >
                <span className="w-4 text-[11px] text-muted">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-medium text-fg group-hover:text-emerald-300">{v.name}</p>
                  <p className="text-[10.5px] tracking-tight text-muted">{v.category}</p>
                </div>
                <Sparkline data={v.monthlySeries} width={56} height={20} color={v.spendTrendPct >= 0 ? "#34d399" : "#f87171"} />
                <p className="w-20 text-right text-[13px] font-medium text-fg">{moneyShort(v.annualSpend)}</p>
              </Link>
            ))}
          </div>
        </Panel>
      </div>

      {/* category monthly comparison */}
      <Panel delay={0.25} className="p-5">
        <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-fg">Monthly by category</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {audit.categories.slice(0, 4).map((c) => {
            const data = audit.spendSeries.map((s) => ({
              label: s.label,
              value: s.categories[c.name] ?? 0,
            }));
            return (
              <div key={c.name} className="rounded-xl border border-line bg-white/[0.02] p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-[12.5px] font-medium text-fg">{c.name}</span>
                  <span className="text-[11.5px] text-muted">{moneyShort(c.spend)}/yr</span>
                </div>
                <div className="mt-2">
                  <BarChart data={data} height={80} highlightLast={false} />
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-[11px] tracking-tight text-muted/70">
          Monthly spend includes both contracted subscriptions and usage-based consumption.
        </p>
      </Panel>
    </div>
  );
}
