import type { AlertRecord, CompanyAudit } from "@/lib/types";
import { money } from "./engines";

/* ------------------------------------------------------------------ */
/*  Alert engine — turns computed signals into severity-ranked alerts */
/* ------------------------------------------------------------------ */

const DAY = 86400000;

export function buildAlerts(audit: Pick<CompanyAudit, "vendors" | "spendSeries">): AlertRecord[] {
  const alerts: AlertRecord[] = [];
  const now = new Date();
  const push = (
    severity: AlertRecord["severity"],
    title: string,
    detail: string,
    type: AlertRecord["type"],
    vendorId?: string,
    vendorName?: string,
    amount?: number
  ) =>
    alerts.push({
      id: `al-${alerts.length + 1}`,
      severity,
      title,
      detail,
      vendorId,
      vendorName,
      type,
      amount,
      createdAt: new Date(now.getTime() - alerts.length * 3600000).toISOString(),
      read: false,
    });

  for (const v of audit.vendors) {
    // Renewals
    if (v.risk) {
      if (v.risk.level === "critical") {
        push(
          "critical",
          v.risk.daysToDeadline < 0
            ? `${v.name} cancellation window has closed`
            : `${v.name} renewal is ${v.risk.daysToRenewal} days away`,
          v.risk.daysToDeadline < 0
            ? `The cancel-by date has passed. ${v.name} auto-renews at ${money(
                v.risk.potentialRenewalCost
              )}/yr unless the vendor grants an exception.`
            : `Cancel by ${v.risk.daysToDeadline} days to avoid automatic renewal into the next term.`,
          "renewal",
          v.id,
          v.name,
          v.risk.potentialRenewalCost
        );
      } else if (v.risk.level === "high") {
        push(
          "high",
          `${v.name} renewal is ${v.risk.daysToRenewal} days away`,
          `Cancellation deadline is ${v.risk.daysToDeadline} days out. Negotiate before the window closes.`,
          "renewal",
          v.id,
          v.name,
          v.risk.potentialRenewalCost
        );
      } else {
        push(
          "medium",
          `${v.name} renewal approaching`,
          `Renews in ${v.risk.daysToRenewal} days — ${v.risk.autoRenew ? "auto-renews" : "manual renewal"} if no action is taken.`,
          "renewal",
          v.id,
          v.name,
          v.risk.potentialRenewalCost
        );
      }
    }

    // Price increases
    if (v.priceEscalationRate && v.priceEscalationRate >= 5) {
      push(
        v.priceEscalationRate >= 10 ? "high" : "medium",
        `${v.name} price increased ${v.priceEscalationRate}%`,
        `Contractual escalation of ${v.priceEscalationRate}%/yr${
          v.priceEscalationRate > 5 ? " with no cap" : ""
        } on ${money(v.annualSpend)} of annual spend.`,
        "price_increase",
        v.id,
        v.name,
        Math.round((v.annualSpend * v.priceEscalationRate) / 100)
      );
    } else if (v.spendTrendPct >= 15) {
      push(
        v.spendTrendPct >= 30 ? "high" : "medium",
        `${v.name} spend up ${v.spendTrendPct}% year over year`,
        `Annualized spend grew from ${money(
          Math.round(v.annualSpend / (1 + v.spendTrendPct / 100))
        )} to ${money(v.annualSpend)} — well above company average.`,
        "price_increase",
        v.id,
        v.name,
        Math.round(v.annualSpend - v.annualSpend / (1 + v.spendTrendPct / 100))
      );
    }

    // Unused seats
    if (v.usage && v.usage.inactiveUsers >= 9) {
      push(
        v.usage.inactiveUsers >= 25 ? "high" : "medium",
        `${v.name} has ${v.usage.inactiveUsers} unused seats`,
        `${v.usage.activeUsers} of ${v.usage.seatsPurchased} seats are active (${v.usage.utilizationPct.toFixed(
          0
        )}% utilization). Potential savings ${money(v.usage.unusedSeatCost)}/yr.`,
        "unused_seats",
        v.id,
        v.name,
        v.usage.unusedSeatCost
      );
    }

    // Billing anomalies
    for (const a of v.billing.anomalies) {
      if (a.type === "duplicate_charge") {
        push(
          "medium",
          `Two invoices appear to contain duplicate charges`,
          `${v.name}: ${a.detail} (~${money(a.impact)}/yr impact).`,
          "billing",
          v.id,
          v.name,
          a.impact
        );
      } else if (a.type === "overbilling" || a.type === "unexpected_increase") {
        push(
          "high",
          `${v.name} spending increased ${a.variancePct > 0 ? "+" : ""}${a.variancePct}%`,
          `${v.name}: ${a.detail}`,
          "billing",
          v.id,
          v.name,
          a.impact
        );
      } else if (a.type === "missing_discount" || a.type === "incorrect_seat_count") {
        push(
          "low",
          `${v.name} billing discrepancy detected`,
          `${v.name}: ${a.detail}`,
          "billing",
          v.id,
          v.name,
          a.impact
        );
      }
    }
  }

  // Duplicate tool alerts
  const seen = new Set<string>();
  for (const v of audit.vendors) {
    const dupes = audit.vendors.filter(
      (o) =>
        o.id !== v.id &&
        isOverlap(v.name, o.name) &&
        !seen.has(`${v.id}:${o.id}`) &&
        !seen.has(`${o.id}:${v.id}`)
    );
    if (dupes.length > 0) {
      seen.add(`${v.id}:${dupes[0].id}`);
      push(
        "low",
        `Potentially overlapping tools detected`,
        `${v.name} overlaps with ${dupes.map((d) => d.name).join(", ")} — teams are provisioned in both.`,
        "duplicate_tools",
        v.id,
        v.name
      );
    }
  }

  // Company-level spend growth
  const series = audit.spendSeries;
  if (series.length >= 6) {
    const recent = series.slice(-3).reduce((a, s) => a + s.total, 0) / 3;
    const prior = series.slice(-6, -3).reduce((a, s) => a + s.total, 0) / 3;
    const annualizedDelta = Math.round((recent - prior) * 12);
    if (annualizedDelta > 2000) {
      push(
        "high",
        `Annualized vendor spend increased ${money(Math.abs(annualizedDelta))} this quarter`,
        `Run-rate spend is up ${money(annualizedDelta > 0 ? annualizedDelta : 0)}/yr versus three months ago.`,
        "spend_growth",
        undefined,
        undefined,
        annualizedDelta
      );
    }
  }

  const order: Record<AlertRecord["severity"], number> = { critical: 0, high: 1, medium: 2, low: 3 };
  return alerts
    .sort(
      (a, b) =>
        order[a.severity] - order[b.severity] ||
        (b.amount ?? 0) - (a.amount ?? 0) ||
        b.createdAt.localeCompare(a.createdAt)
    )
    .slice(0, 24);
}

const OVERLAP_GROUPS: string[][] = [
  ["Notion", "Confluence", "Google Docs"],
  ["Slack", "Discord", "Microsoft Teams"],
  ["Amplitude", "Segment", "PostHog", "Heap", "Mixpanel"],
  ["Asana", "Monday.com", "ClickUp", "Wrike"],
];

function isOverlap(a: string, b: string): boolean {
  if (a === b) return false;
  return OVERLAP_GROUPS.some((g) => g.includes(a) && g.includes(b));
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export { DAY };
