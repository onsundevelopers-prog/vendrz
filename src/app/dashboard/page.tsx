"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getActivity, getDemoAudit, getEmailThreads } from "@/lib/store";
import { money, formatDateShort, daysUntil } from "@/lib/format";
import type { VendorProfile } from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Overview - a single quiet surface: what needs attention right now. */
/* ------------------------------------------------------------------ */

export default function DashboardOverview() {
  const audit = getDemoAudit();
  const activity = getActivity("demo");
  const threads = getEmailThreads("demo");

  const renewals = audit.vendors
    .filter((v) => v.renewalDate && daysUntil(v.renewalDate) >= 0)
    .sort((a, b) => daysUntil(a.renewalDate) - daysUntil(b.renewalDate))
    .slice(0, 5);

  const attention = [
    ...audit.vendors
      .filter((v) => v.risk)
      .sort((a, b) => (a.risk?.daysToRenewal ?? 999) - (b.risk?.daysToRenewal ?? 999))
      .slice(0, 4)
      .map((v) => ({
        id: v.id,
        kind: "Renewal" as const,
        title: `${v.name} renews in ${v.risk?.daysToRenewal} days`,
        detail: v.risk?.autoRenew
          ? `Auto-renews · cancel by ${v.risk?.daysToDeadline} days`
          : "Manual renewal",
        vendor: v,
      })),
    ...audit.vendors
      .filter((v) => v.billing.variancePct > 8)
      .sort((a, b) => Math.abs(b.billing.variancePct) - Math.abs(a.billing.variancePct))
      .slice(0, 2)
      .map((v) => ({
        id: v.id + "-b",
        kind: "Billing" as const,
        title: `${v.name} billing ${v.billing.variancePct.toFixed(0)}% above contract`,
        detail: v.billing.anomalies[0]?.detail ?? "Unexplained variance",
        vendor: v,
      })),
  ];

  const insights = buildInsights(audit.vendors, threads);

  const counts = {
    savings: audit.potentialSavings,
    risk: audit.vendors.filter((v) => v.risk).length,
    renewals: renewals.length,
    activity: activity.length,
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <h1 className="text-[16px] font-semibold tracking-tight text-fg">Overview</h1>
          <p className="mt-0.5 text-[12px] text-muted">
            {audit.companyName} · {audit.vendorCount} vendors · {money(audit.totalAnnualSpend)}/yr
          </p>
        </div>
        <Link href="/dashboard/agent" className="text-[12px] font-medium text-muted hover:text-fg">
          Open vendor agent →
        </Link>
      </div>

      {/* key figures - one quiet row */}
      <div className="flex divide-x divide-line border-b border-line pb-4">
        <div className="pr-8">
          <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted/70">Potential savings</p>
          <p className="mt-1 text-[18px] font-semibold tracking-tight text-fg">{money(counts.savings)}</p>
        </div>
        <div className="px-8">
          <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted/70">Contracts at risk</p>
          <p className="mt-1 text-[18px] font-semibold tracking-tight text-fg">{counts.risk}</p>
        </div>
        <div className="px-8">
          <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted/70">Upcoming renewals</p>
          <p className="mt-1 text-[18px] font-semibold tracking-tight text-fg">{counts.renewals}</p>
        </div>
        <div className="pl-8">
          <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted/70">Recent activity</p>
          <p className="mt-1 text-[18px] font-semibold tracking-tight text-fg">{counts.activity}</p>
        </div>
      </div>

      {/* attention queue */}
      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-[13px] font-semibold tracking-tight text-fg">Needs attention</h2>
          <Link href="/dashboard/renewals" className="text-[11.5px] text-muted hover:text-fg">
            All renewals
          </Link>
        </div>
        <div className="border border-line">
          {attention.map((a) => (
            <Link
              key={a.id}
              href={`/dashboard/vendors/${a.vendor.id}`}
              className="flex items-center gap-3 border-b border-line/60 px-3 py-2.5 transition-colors last:border-b-0 hover:bg-white/[0.03]"
            >
              <span className="w-14 shrink-0 text-[10px] uppercase tracking-[0.08em] text-muted/60">
                {a.kind}
              </span>
              <span className="min-w-0 flex-1 truncate text-[12.5px] text-fg">{a.title}</span>
              <span className="hidden shrink-0 text-[11px] text-muted sm:inline">{a.detail}</span>
              <ArrowRight size={12} className="shrink-0 text-muted/50" />
            </Link>
          ))}
          {attention.length === 0 && (
            <p className="px-3 py-6 text-[12px] text-muted">Nothing needs attention right now.</p>
          )}
        </div>
      </section>

      {/* upcoming renewals */}
      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-[13px] font-semibold tracking-tight text-fg">Upcoming renewals</h2>
          <Link href="/dashboard/renewals" className="text-[11.5px] text-muted hover:text-fg">
            Manage renewals
          </Link>
        </div>
        <div className="border border-line">
          {renewals.map((v) => {
            const d = daysUntil(v.renewalDate);
            return (
              <Link
                key={v.id}
                href={`/dashboard/vendors/${v.id}`}
                className="flex items-center gap-3 border-b border-line/60 px-3 py-2.5 transition-colors last:border-b-0 hover:bg-white/[0.03]"
              >
                <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-fg">{v.name}</span>
                <span className="hidden shrink-0 text-[11px] text-muted md:inline">
                  {formatDateShort(v.renewalDate)}
                </span>
                <span className="w-14 shrink-0 text-right text-[11px] text-muted">{d}d</span>
                <span className="shrink-0 text-[11px] text-muted">{money(v.annualSpend)}</span>
              </Link>
            );
          })}
          {renewals.length === 0 && (
            <p className="px-3 py-6 text-[12px] text-muted">No upcoming renewals.</p>
          )}
        </div>
      </section>

      {/* agent findings */}
      {insights.length > 0 && (
        <section>
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-[13px] font-semibold tracking-tight text-fg">Agent findings</h2>
            <Link href="/dashboard/agent" className="text-[11.5px] text-muted hover:text-fg">
              Open agent
            </Link>
          </div>
          <div className="border border-line">
            {insights.map((ins, i) => (
              <div key={i} className="border-b border-line/60 px-3 py-2.5 last:border-b-0">
                <p className="text-[12.5px] font-medium text-fg">{ins.title}</p>
                <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted">{ins.detail}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  AI insight generation - deterministic, derived from real data     */
/* ------------------------------------------------------------------ */

function buildInsights(
  vendors: VendorProfile[],
  threads: { vendorId: string; category: string; unread: boolean }[]
): { title: string; detail: string }[] {
  const out: { title: string; detail: string }[] = [];

  const urgent = vendors
    .filter((v) => v.risk && v.risk.daysToRenewal <= 45)
    .sort((a, b) => (a.risk?.daysToRenewal ?? 0) - (b.risk?.daysToRenewal ?? 0));
  if (urgent.length > 0) {
    const v = urgent[0];
    out.push({
      title: `${v.name} renews in ${v.risk?.daysToRenewal} days${v.risk?.autoRenew ? " and will auto-renew" : ""}`,
      detail: `Cancellation window closes in ${v.risk?.daysToDeadline} days (${v.risk?.noticePeriodDays}-day notice). Decide whether to renegotiate or let it renew.`,
    });
  }

  const overbilled = vendors
    .filter((v) => v.billing.variancePct > 8)
    .sort((a, b) => Math.abs(b.billing.variancePct) - Math.abs(a.billing.variancePct));
  if (overbilled.length > 0) {
    const v = overbilled[0];
    out.push({
      title: `${v.name} is billing ${v.billing.variancePct.toFixed(0)}% above contract`,
      detail: `Roughly ${money(Math.abs(v.billing.actualMonthly - v.billing.expectedMonthly) * 12)}/yr beyond the contracted baseline. A billing dispute could recover this.`,
    });
  }

  const unreadRenewal = threads.filter((t) => t.category === "renewal" && t.unread);
  if (unreadRenewal.length > 0) {
    out.push({
      title: `${unreadRenewal.length} renewal notice${unreadRenewal.length === 1 ? " is" : "s are"} unread in your inbox`,
      detail: "The agent can summarize these threads and draft replies - nothing is sent without your approval.",
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
    });
  }

  const highEsc = vendors.filter((v) => (v.priceEscalationRate ?? 0) >= 5);
  if (highEsc.length > 0) {
    out.push({
      title: `${highEsc.length} contracts escalate ${Math.max(...highEsc.map((v) => v.priceEscalationRate ?? 0))}%+ per year`,
      detail: "Uncapped escalations compound. Capping these before the next anniversary is a high-confidence win.",
    });
  }

  return out.slice(0, 5);
}
