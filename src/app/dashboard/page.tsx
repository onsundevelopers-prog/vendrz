"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUp, ArrowDown, Eye, EyeOff, RotateCcw, Settings2 } from "lucide-react";
import { getActivity, getDemoAudit, getEmailThreads } from "@/lib/store";
import { AreaChart, DonutChart, BarChart } from "@/components/ui/charts";
import { money, moneyShort, pct, timeAgo, formatDateShort, daysUntil } from "@/lib/format";
import { MenuPop, useDismiss } from "@/components/ui/menu";
import { Kpi, KpiStrip, PageHeader, ArrowLink } from "@/components/dashboard/shared";
import { HealthScore } from "@/components/ui/primitives";
import type { VendorProfile } from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Overview - a customizable professional workspace.                 */
/*  Widgets can be shown/hidden, reordered, widened, and the layout   */
/*  persists per browser.                                             */
/* ------------------------------------------------------------------ */

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

const WIDGET_DEFS: { id: string; title: string; sub: string }[] = [
  { id: "kpis", title: "Key metrics", sub: "spend, savings, risk" },
  { id: "spend", title: "Spend trend", sub: "monthly vendor spend" },
  { id: "categories", title: "Spend by category", sub: "trailing 12 months" },
  { id: "insights", title: "AI insights", sub: "derived from your data" },
  { id: "timeline", title: "Renewal timeline", sub: "next contracts up" },
  { id: "risk", title: "Risk distribution", sub: "renewal risk levels" },
  { id: "attention", title: "Attention queue", sub: "what needs action now" },
  { id: "savings", title: "Top savings", sub: "highest-confidence opportunities" },
  { id: "activity", title: "Recent activity", sub: "alerts, agent actions, reviews" },
];

const DEFAULT_ORDER = WIDGET_DEFS.map((w) => w.id);

interface Layout {
  order: string[];
  wide: Record<string, boolean>;
  hidden: string[];
}

function loadLayout(): Layout {
  if (typeof window === "undefined") return { order: DEFAULT_ORDER, wide: {}, hidden: [] };
  try {
    const raw = window.localStorage.getItem("vt.dash.layout");
    if (raw) return JSON.parse(raw) as Layout;
  } catch {
    /* ignore */
  }
  return { order: DEFAULT_ORDER, wide: {}, hidden: [] };
}

const severityDot: Record<string, string> = {
  critical: "bg-red-400",
  high: "bg-orange-400",
  medium: "bg-amber-400",
  low: "bg-zinc-500",
};

export default function DashboardOverview() {
  const audit = getDemoAudit();
  const activity = getActivity("demo");
  const threads = getEmailThreads("demo");
  const [layout, setLayout] = useState<Layout>(loadLayout);
  const [customize, setCustomize] = useState(false);
  const custRef = useRef<HTMLButtonElement>(null);
  useDismiss(customize, () => setCustomize(false));

  useEffect(() => {
    try {
      window.localStorage.setItem("vt.dash.layout", JSON.stringify(layout));
    } catch {
      /* ignore */
    }
  }, [layout]);

  const series = audit.spendSeries.map((s) => ({ label: s.label, value: s.total }));

  const topSavings = useMemo(
    () =>
      [...audit.opportunities]
        .filter((o) => o.status !== "dismissed")
        .sort((a, b) => b.estimatedSavings - a.estimatedSavings)
        .slice(0, 5),
    [audit.opportunities]
  );

  const renewals = useMemo(
    () =>
      audit.vendors
        .filter((v) => v.renewalDate && daysUntil(v.renewalDate) >= 0)
        .sort((a, b) => daysUntil(a.renewalDate) - daysUntil(b.renewalDate))
        .slice(0, 6),
    [audit.vendors]
  );

  const deadlines = useMemo(
    () =>
      audit.vendors
        .filter((v) => v.cancellationDeadline && v.autoRenew)
        .sort((a, b) => daysUntil(a.cancellationDeadline) - daysUntil(b.cancellationDeadline))
        .slice(0, 5),
    [audit.vendors]
  );

  const riskDist = (["critical", "high", "medium", "low"] as const)
    .map((lvl) => ({
      label: lvl,
      value: audit.vendors.filter((v) => v.risk?.level === lvl).length,
      color: RISK_COLORS[lvl],
    }))
    .filter((d) => d.value > 0);
  const riskTotal = riskDist.reduce((a, d) => a + d.value, 0);

  const attention = useMemo(() => {
    return [
      ...audit.vendors
        .filter((v) => v.risk)
        .sort((a, b) => (a.risk?.daysToRenewal ?? 999) - (b.risk?.daysToRenewal ?? 999))
        .slice(0, 3)
        .map((v) => ({
          id: v.id,
          kind: "renewal" as const,
          title: `${v.name} renews in ${v.risk?.daysToRenewal} days`,
          detail: v.risk?.autoRenew
            ? "Auto-renews · cancel by " + (v.risk?.daysToDeadline ?? 0) + " days"
            : "Manual renewal",
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
  }, [audit.vendors]);

  const donutData = audit.categories.map((c) => ({
    name: c.name,
    value: c.spend,
    color: CATEGORY_COLORS[c.name] ?? "#71717a",
  }));

  const aiInsights = useMemo(() => buildInsights(audit.vendors, threads), [audit.vendors, threads]);

  /* ---------------- widget registry ---------------- */
  const widgets: Record<string, { def: (typeof WIDGET_DEFS)[number]; wide: boolean; render: React.ReactNode }> = useMemo(() => {
    const kpis = (
      <KpiStrip>
        <Kpi label="Total spend" value={audit.totalAnnualSpend} format={money} sub="/yr all categories" />
        <Kpi label="Potential savings" value={audit.potentialSavings} format={money} accent="text-emerald-400" sub="estimates, not guaranteed" />
        <Kpi label="Monthly spend" value={audit.monthlySpend} format={money} sub={`${moneyShort(audit.spendSeries[audit.spendSeries.length - 2]?.total ?? 0)} last month`} />
        <Kpi
          label="Renewal risk"
          value={audit.renewalRisks}
          accent="text-amber-400"
          sub={`${deadlines.filter((d) => daysUntil(d.cancellationDeadline) < 0).length} past cancellation deadline`}
        />
      </KpiStrip>
    );

    const spend = (
      <div className="p-4">
        <AreaChart data={series} height={190} fillId="ov-area" />
      </div>
    );

    const categories = (
      <div className="flex items-center gap-4 p-4">
        <DonutChart
          data={donutData}
          size={150}
          thickness={14}
          centerValue={moneyShort(audit.totalAnnualSpend)}
          centerLabel="annual"
        />
        <div className="min-w-0 flex-1 space-y-1.5">
          {audit.categories.slice(0, 8).map((c) => (
            <div key={c.name} className="flex items-center gap-2">
              <span className="size-2 shrink-0 rounded-sm" style={{ background: CATEGORY_COLORS[c.name] ?? "#71717a" }} />
              <span className="min-w-0 flex-1 truncate text-[12px] text-muted">{c.name}</span>
              <span className="text-[11.5px] font-medium text-fg">{moneyShort(c.spend)}</span>
            </div>
          ))}
        </div>
      </div>
    );

    const insights = (
      <div className="divide-y divide-line">
        {aiInsights.map((ins, i) => (
          <div key={i} className="flex gap-3 px-4 py-3">
            <span
              className={`mt-1 size-1.5 shrink-0 rounded-full ${
                ins.tone === "alert" ? "bg-amber-400" : ins.tone === "positive" ? "bg-emerald-400" : "bg-zinc-500"
              }`}
            />
            <div className="min-w-0">
              <p className="text-[12.5px] font-medium leading-snug text-fg">{ins.title}</p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-muted">{ins.detail}</p>
            </div>
          </div>
        ))}
      </div>
    );

    const timeline = (
      <div className="divide-y divide-line">
        {renewals.map((v) => {
          const d = daysUntil(v.renewalDate);
          return (
            <Link
              key={v.id}
              href={`/dashboard/vendors/${v.id}`}
              className="group flex items-center justify-between gap-3 px-4 py-2.5 transition-colors hover:bg-white/[0.03]"
            >
              <div className="min-w-0">
                <p className="truncate text-[12.5px] font-medium text-fg group-hover:text-emerald-300">{v.name}</p>
                <p className="text-[11px] tracking-tight text-muted">
                  {formatDateShort(v.renewalDate)} · {d} days · {money(v.annualSpend)}/yr
                </p>
              </div>
              <span
                className={`chip ${d <= 30 ? "chip-red" : d <= 60 ? "chip-amber" : "chip-neutral"}`}
              >
                {d <= 30 ? "Urgent" : d <= 60 ? "Soon" : `${d}d`}
              </span>
            </Link>
          );
        })}
        {renewals.length === 0 && (
          <p className="px-4 py-8 text-center text-[12px] text-muted">No upcoming renewals.</p>
        )}
      </div>
    );

    const risk = (
      <div className="p-4">
        <BarChart
          data={riskDist.map((d) => ({ label: d.label, value: d.value }))}
          height={130}
          color="#fbbf24"
          highlightLast={false}
        />
        <p className="mt-2 text-[11px] text-muted">{riskTotal} vendors with active renewal risk</p>
      </div>
    );

    const attentionList = (
      <div className="divide-y divide-line">
        {attention.map((a) => (
          <Link
            key={a.id}
            href={`/dashboard/vendors/${a.vendor.id}`}
            className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-white/[0.03]"
          >
            <span className={`mt-[6px] size-1.5 shrink-0 rounded-full ${severityDot[a.severity]}`} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] font-medium text-fg group-hover:text-emerald-300">{a.title}</p>
              <p className="truncate text-[11px] tracking-tight text-muted">{a.detail}</p>
            </div>
            <span className="chip chip-neutral !text-[10px] uppercase tracking-wide">{a.kind}</span>
          </Link>
        ))}
      </div>
    );

    const savingsList = (
      <div className="divide-y divide-line">
        {topSavings.map((o, i) => (
          <Link
            key={o.id}
            href={`/dashboard/vendors/${o.vendorId}`}
            className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-white/[0.03]"
          >
            <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-white/[0.06] text-[10.5px] font-semibold text-muted">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] font-medium text-fg group-hover:text-emerald-300">{o.vendorName}</p>
              <p className="truncate text-[11px] tracking-tight text-muted">{o.title}</p>
            </div>
            <p className="shrink-0 text-[12.5px] font-semibold tracking-tight text-emerald-400">
              {money(o.estimatedSavings)}
            </p>
          </Link>
        ))}
      </div>
    );

    const activityList = (
      <div className="max-h-[340px] divide-y divide-line overflow-y-auto">
        {activity.slice(0, 10).map((a) => (
          <div key={a.id} className="flex gap-3 px-4 py-2.5">
            <span
              className={`mt-1 flex size-5 shrink-0 items-center justify-center rounded-full border border-line text-[9px] ${
                a.actor === "agent" ? "text-emerald-400" : a.actor === "user" ? "text-fg" : "text-muted"
              }`}
            >
              {a.actor === "agent" ? "✦" : a.actor === "user" ? "●" : "◉"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] leading-snug text-fg">{a.title}</p>
              <p className="mt-0.5 line-clamp-1 text-[11.5px] leading-relaxed text-muted">{a.detail}</p>
              <p className="mt-0.5 text-[10px] tracking-tight text-muted/60">
                {a.actor} · {timeAgo(a.createdAt)}
                {a.vendorName ? ` · ${a.vendorName}` : ""}
              </p>
            </div>
          </div>
        ))}
      </div>
    );

    const build = (id: string, render: React.ReactNode, wide = false) => ({
      def: WIDGET_DEFS.find((w) => w.id === id)!,
      wide,
      render,
    });

    return {
      kpis: build("kpis", kpis, true),
      spend: build("spend", spend, true),
      categories: build("categories", categories),
      insights: build("insights", insights, true),
      timeline: build("timeline", timeline),
      risk: build("risk", risk),
      attention: build("attention", attentionList),
      savings: build("savings", savingsList),
      activity: build("activity", activityList, true),
    };
  }, [audit, activity, aiInsights, attention, deadlines, donutData, renewals, riskDist, riskTotal, series, topSavings]);

  const visibleOrder = layout.order.filter((id) => !layout.hidden.includes(id) && widgets[id]);

  /* ---------------- customization actions ---------------- */
  const toggleWidget = (id: string) => {
    setLayout((l) => ({
      ...l,
      hidden: l.hidden.includes(id) ? l.hidden.filter((h) => h !== id) : [...l.hidden, id],
    }));
  };
  const moveWidget = (id: string, dir: -1 | 1) => {
    setLayout((l) => {
      const order = [...l.order];
      const i = order.indexOf(id);
      const j = Math.max(0, Math.min(order.length - 1, i + dir));
      if (i === j) return l;
      order.splice(i, 1);
      order.splice(j, 0, id);
      return { ...l, order };
    });
  };
  const toggleWide = (id: string) => {
    setLayout((l) => ({ ...l, wide: { ...l.wide, [id]: !l.wide[id] } }));
  };
  const resetLayout = () => setLayout({ order: DEFAULT_ORDER, wide: {}, hidden: [] });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Overview"
        sub={`${audit.companyName} · trailing 12 months · ${audit.vendorCount} vendors under watch`}
        actions={
          <>
            <Link href="/dashboard/agent" className="toolbar-btn !h-8">
              ✦ Open vendor agent
            </Link>
            <button
              ref={custRef}
              onClick={() => setCustomize((c) => !c)}
              className={`toolbar-btn !h-8 ${customize ? "active" : ""}`}
            >
              <Settings2 size={14} /> Customize
            </button>
            <div className="hidden items-center gap-2 lg:flex">
              <span className="text-[10.5px] uppercase tracking-[0.1em] text-muted">Health</span>
              <HealthScore score={audit.healthScore} size="sm" />
            </div>
          </>
        }
      />

      <MenuPop
        open={customize}
        onClose={() => setCustomize(false)}
        anchor={custRef}
        align="end"
        items={[
          { label: "Workspace layout", kind: "label" },
          ...WIDGET_DEFS.map((w) => {
            const hidden = layout.hidden.includes(w.id);
            const wide = layout.wide[w.id];
            return {
              label: w.title,
              icon: hidden ? <EyeOff size={13} /> : <Eye size={13} />,
              onSelect: () => toggleWidget(w.id),
              kbd: wide ? "wide" : undefined,
            };
          }),
          { separator: true },
          { label: "Reset layout", icon: <RotateCcw size={13} />, onSelect: resetLayout },
        ]}
      />

      {/* widget grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        {visibleOrder.map((id) => {
          const w = widgets[id];
          const wide = layout.wide[id] ?? w.wide;
          return (
            <section
              key={id}
              className={`panel-surface flex min-w-0 flex-col overflow-hidden ${wide ? "lg:col-span-2" : ""}`}
            >
              <div className="panel-header">
                <div className="min-w-0">
                  <span className="panel-title">{w.def.title}</span>
                  <span className="ml-2 hidden text-[10.5px] text-muted/60 sm:inline">{w.def.sub}</span>
                </div>
                <div className="flex items-center gap-1">
                  {id === "spend" && <ArrowLink href="/dashboard/spend" label="Full analysis" />}
                  {id === "timeline" && <ArrowLink href="/dashboard/renewals" label="All renewals" />}
                  {id === "attention" && <ArrowLink href="/dashboard/alerts" label="All alerts" />}
                  {id === "savings" && <ArrowLink href="/dashboard/savings" label="Savings engine" />}
                  {id === "insights" && <ArrowLink href="/dashboard/agent" label="Ask the agent" />}
                  {id === "activity" && <ArrowLink href="/dashboard/activity" label="Full log" />}
                  <span className="ml-1 hidden items-center gap-0.5 sm:flex">
                    <button
                      onClick={() => moveWidget(id, -1)}
                      className="flex size-5 items-center justify-center rounded text-muted hover:bg-white/5 hover:text-fg"
                      aria-label={`Move ${w.def.title} up`}
                    >
                      <ArrowUp size={11} />
                    </button>
                    <button
                      onClick={() => moveWidget(id, 1)}
                      className="flex size-5 items-center justify-center rounded text-muted hover:bg-white/5 hover:text-fg"
                      aria-label={`Move ${w.def.title} down`}
                    >
                      <ArrowDown size={11} />
                    </button>
                    <button
                      onClick={() => toggleWide(id)}
                      className="flex size-5 items-center justify-center rounded text-muted hover:bg-white/5 hover:text-fg"
                      aria-label={`Toggle ${w.def.title} width`}
                    >
                      <Settings2 size={11} />
                    </button>
                    <button
                      onClick={() => toggleWidget(id)}
                      className="flex size-5 items-center justify-center rounded text-muted hover:bg-white/5 hover:text-fg"
                      aria-label={`Hide ${w.def.title}`}
                    >
                      <EyeOff size={11} />
                    </button>
                  </span>
                </div>
              </div>
              <div className="min-w-0 flex-1">{w.render}</div>
            </section>
          );
        })}
      </div>

      {visibleOrder.length === 0 && (
        <div className="panel-surface px-6 py-14 text-center">
          <p className="text-[13.5px] font-medium text-fg">All widgets are hidden.</p>
          <button className="toolbar-btn active mt-4" onClick={resetLayout}>
            <RotateCcw size={13} /> Restore default layout
          </button>
        </div>
      )}

      <p className="text-[11px] tracking-tight text-muted/60">
        Figures are computed from connected financial data and deterministic rules - savings estimates are never
        guaranteed. Layout customizations are saved in this browser.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  AI insight generation - deterministic, derived from real data     */
/* ------------------------------------------------------------------ */

function buildInsights(
  vendors: VendorProfile[],
  threads: { vendorId: string; category: string; unread: boolean }[]
): { title: string; detail: string; tone: "alert" | "positive" | "neutral" }[] {
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
      detail: "The agent can summarize these threads and draft replies - nothing is sent without your approval.",
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
      detail: `${v.usage?.activeUsers} of ${v.usage?.seatsPurchased} seats are active - a cancellation candidate worth ${money(v.potentialSavings)}/yr.`,
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
    detail: "No renewal risk, no billing variance, strong utilization - nothing to do on these right now.",
    tone: "positive",
  });

  return out.slice(0, 6);
}
