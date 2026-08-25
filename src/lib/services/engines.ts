import type {
  AlertSeverity,
  BillingAnomaly,
  InvoiceRecord,
  RenewalRisk,
  SavingsOpportunity,
  SpendCategory,
  UsageSnapshot,
  VendorProfile,
} from "@/lib/types";
import type { VendorSeed } from "@/lib/data/vendorSeeds";
import { seededRandom } from "@/lib/data/vendorSeeds";
import { daysFromNow } from "@/lib/mockData";

/* ------------------------------------------------------------------ */
/*  Usage intelligence                                                */
/* ------------------------------------------------------------------ */

export function computeUsage(seed: VendorSeed): UsageSnapshot | null {
  if (seed.seats <= 0) return null;
  const monthlyAvg = seed.annualSpend / 12;
  const perSeatMonthly = monthlyAvg / seed.seats;
  const inactive = Math.max(0, seed.seats - seed.activeUsers);
  const utilization = (seed.activeUsers / seed.seats) * 100;
  return {
    seatsPurchased: seed.seats,
    activeUsers: seed.activeUsers,
    inactiveUsers: inactive,
    utilizationPct: Math.round(utilization * 10) / 10,
    costPerActiveUser: Math.round(perSeatMonthly * 100) / 100,
    unusedSeatCost: Math.round(inactive * perSeatMonthly * 12),
  };
}

/* ------------------------------------------------------------------ */
/*  Billing intelligence                                              */
/* ------------------------------------------------------------------ */

export function computeBilling(seed: VendorSeed): {
  expectedMonthly: number;
  actualMonthly: number;
  variancePct: number;
  anomalies: BillingAnomaly[];
} {
  const monthlyAvg = seed.annualSpend / 12;
  const expected = seed.expectedMonthly ?? monthlyAvg;
  // Actual monthly = the most recent month in the spend series.
  const actual = computeLastMonth(seed);
  const variancePct =
    expected > 0 ? Math.round(((actual - expected) / expected) * 1000) / 10 : 0;

  const anomalies: BillingAnomaly[] = seed.anomalies.map((a, i) => ({
    id: `${seed.id}-ba-${i + 1}`,
    vendorId: seed.id,
    type: a.type,
    detail: a.detail,
    variancePct: a.variancePct,
    impact: Math.round((expected * (a.variancePct / 100) * 12) / 10) * 10,
  }));

  return { expectedMonthly: expected, actualMonthly: actual, variancePct, anomalies };
}

/* ------------------------------------------------------------------ */
/*  Renewal risk system                                               */
/* ------------------------------------------------------------------ */

export function computeRenewalRisk(seed: VendorSeed): RenewalRisk | null {
  if (seed.renewalInDays === undefined) return null;
  const days = seed.renewalInDays;
  const deadline = seed.cancellationInDays ?? days - 45;
  const notice = Math.max(0, days - deadline);
  const increase = seed.escalationRate ?? 0;
  const potential = Math.round(seed.annualSpend * (1 + increase / 100));

  let level: AlertSeverity;
  if (deadline < 0 || days <= 30) level = "critical";
  else if (days <= 60) level = "high";
  else if (days <= 90) level = "medium";
  else return null;

  return {
    level,
    daysToRenewal: days,
    daysToDeadline: deadline,
    noticePeriodDays: notice,
    expectedIncreasePct: increase,
    potentialRenewalCost: potential,
    autoRenew: seed.autoRenew,
  };
}

/* ------------------------------------------------------------------ */
/*  Spend series                                                      */
/* ------------------------------------------------------------------ */

function computeLastMonth(seed: VendorSeed): number {
  const avg = seed.annualSpend / 12;
  if (seed.expectedMonthly) {
    const maxVariance = Math.max(0, ...seed.anomalies.map((a) => a.variancePct));
    return Math.round((seed.expectedMonthly * (1 + maxVariance / 100)) * 100) / 100;
  }
  return Math.round(avg * (1 + seed.spendTrendPct / 200) * 100) / 100;
}

export function computeMonthlySeries(seed: VendorSeed): number[] {
  const last = computeLastMonth(seed);
  const growth = seed.spendTrendPct / 100;
  const first = last / (1 + growth);
  const rand = seededRandom(hash(seed.id));
  const raw = Array.from({ length: 12 }, (_, i) => {
    const t = i / 11;
    const season = 0.97 + 0.03 * Math.sin(i * 0.9 + rand() * 0.4);
    return (first + (last - first) * t) * season;
  });
  if (!seed.expectedMonthly) {
    // Normalize so the trailing-12 sum equals the seed's annual spend.
    const sum = raw.reduce((a, b) => a + b, 0);
    const scale = seed.annualSpend / sum;
    return raw.map((v) => Math.round(v * scale));
  }
  // Anchored vendors keep their actual last month (e.g. AWS $2,540).
  return raw.map((v) => Math.round(v));
}

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export interface MonthPoint {
  month: string; // "2025-09"
  label: string; // "Sep"
  total: number;
  categories: Partial<Record<SpendCategory, number>>;
}

export function last12Months(): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString("en-US", { month: "short" }),
    });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/*  Vendor health score (0–100)                                       */
/* ------------------------------------------------------------------ */

export function computeHealthScore(seed: VendorSeed): number {
  const usage = computeUsage(seed);
  const billing = computeBilling(seed);
  const risk = computeRenewalRisk(seed);

  let score = 58;

  // Utilization — healthy usage is the strongest signal.
  if (usage) {
    score += (usage.utilizationPct / 100) * 20;
    score -= Math.min(8, (usage.inactiveUsers / usage.seatsPurchased) * 14);
  } else {
    score += 9; // usage-based vendors: neutral
  }

  // Billing health.
  const absVariance = Math.abs(billing.variancePct);
  score += Math.max(-6, 12 - absVariance * 0.7);

  // Renewal proximity.
  if (risk) {
    if (risk.level === "critical") score -= 12;
    else if (risk.level === "high") score -= 8;
    else score -= 4;
  } else if (seed.renewalInDays !== undefined) {
    score += 5;
  }

  // Contract risk — escalations and growth that outpace the business.
  if (seed.escalationRate) score -= seed.escalationRate * 0.5;
  score -= Math.min(8, Math.max(0, seed.spendTrendPct - 15) * 0.4);
  score -= Math.min(6, billing.anomalies.length * 2);

  return Math.max(8, Math.min(96, Math.round(score)));
}

/* ------------------------------------------------------------------ */
/*  Vendor profile assembly                                           */
/* ------------------------------------------------------------------ */

const OWNERS = [
  "Priya Sharma",
  "Marcus Webb",
  "Dana Kowalski",
  "Tom Ellison",
  "Ava Rodriguez",
  "Noah Kim",
  "Sofia Alvarez",
  "Liam O'Connor",
  "Emma Chen",
  "Jordan Blake",
] as const;

/** Deterministic owner + review date so every vendor row is stable. */
export function vendorOwner(seedId: string): string {
  const h = hash(seedId);
  return OWNERS[h % OWNERS.length];
}

export function vendorLastReviewed(seedId: string, atRisk: boolean): string {
  const h = hash(seedId + ":review");
  // At-risk vendors get reviewed recently; healthy ones drift further back.
  const span = atRisk ? 21 : 60;
  return daysFromNow(-(2 + (h % span)));
}

export function buildVendorProfile(seed: VendorSeed): VendorProfile {
  const series = computeMonthlySeries(seed);
  const annualSpend = series.reduce((a, b) => a + b, 0);
  const monthlyAvg = annualSpend / 12;
  const usage = computeUsage(seed);
  const billing = computeBilling(seed);
  const risk = computeRenewalRisk(seed);
  const health = computeHealthScore(seed);

  const invoices: InvoiceRecord[] = buildInvoices(seed, monthlyAvg, billing.anomalies);

  return {
    id: seed.id,
    name: seed.name,
    category: seed.category,
    description: seed.description,
    annualSpend,
    monthlyAvg: Math.round(monthlyAvg),
    spendTrendPct: seed.spendTrendPct,
    monthlySeries: series,
    contractStatus: seed.status,
    contractValue: seed.annualSpend,
    startDate: daysFromNow(-(240 + (hash(seed.id) % 700))),
    renewalDate: seed.renewalInDays !== undefined ? daysFromNow(seed.renewalInDays) : null,
    cancellationDeadline:
      seed.cancellationInDays !== undefined ? daysFromNow(seed.cancellationInDays) : null,
    autoRenew: seed.autoRenew,
    priceEscalationRate: seed.escalationRate,
    seats: seed.seats,
    activeUsers: seed.activeUsers,
    unusedSeats: usage ? usage.inactiveUsers : 0,
    utilizationPct: usage ? usage.utilizationPct : 100,
    costPerActiveUser: usage ? usage.costPerActiveUser : 0,
    potentialSavings: 0, // filled by the savings engine
    healthScore: health,
    owner: vendorOwner(seed.id),
    lastReviewed: vendorLastReviewed(seed.id, risk !== null && risk.level !== "low"),
    usage,
    billing: {
      expectedMonthly: billing.expectedMonthly,
      actualMonthly: billing.actualMonthly,
      variancePct: billing.variancePct,
      anomalies: billing.anomalies,
    },
    invoices,
    duplicates: [],
    risk,
    isCurated: seed.anomalies.length > 0 || seed.renewalInDays !== undefined,
  };
}

function buildInvoices(
  seed: VendorSeed,
  monthlyAvg: number,
  anomalies: BillingAnomaly[]
): InvoiceRecord[] {
  const rand = seededRandom(hash(seed.id) ^ 0x5f3759df);
  const count = 3 + Math.floor(rand() * 3);
  const invoices: InvoiceRecord[] = [];
  for (let i = 0; i < count; i++) {
    const contracted = Math.round(monthlyAvg);
    const anomaly = anomalies[i % Math.max(1, anomalies.length)];
    const amount = anomaly
      ? Math.round((contracted * (1 + anomaly.variancePct / 100)) / 10) * 10
      : contracted;
    invoices.push({
      id: `${seed.id}-inv-${i + 1}`,
      vendorId: seed.id,
      number: `INV-${String(1000 + Math.floor(rand() * 8000) + i)}`,
      date: daysFromNow(-(i * 30 + Math.floor(rand() * 20))),
      amount,
      contractedAmount: contracted,
      status: i === 0 ? "pending" : "paid",
      lineItems: [`${seed.name} subscription — ${seed.category}`],
      anomalyId: anomaly ? anomaly.id : undefined,
    });
  }
  return invoices;
}

/* ------------------------------------------------------------------ */
/*  Savings engine                                                    */
/* ------------------------------------------------------------------ */

export type OpportunityDraft = Omit<SavingsOpportunity, "id" | "createdAt" | "status">;

export function computeVendorOpportunities(
  vendor: VendorProfile,
  allVendors: VendorProfile[]
): OpportunityDraft[] {
  const opps: OpportunityDraft[] = [];
  const category = vendor.category;

  // 1. Unused seats
  if (vendor.usage && vendor.usage.inactiveUsers >= 2) {
    opps.push({
      vendorId: vendor.id,
      vendorName: vendor.name,
      category,
      type: "unused_seats",
      title: `Reduce unused seats`,
      what: `${vendor.usage.inactiveUsers} of ${vendor.usage.seatsPurchased} purchased seats show no activity in the last 90 days.`,
      why: `You are billed for ${vendor.usage.inactiveUsers} seats at ${money(
        vendor.usage.costPerActiveUser
      )}/seat/mo that your team does not use.`,
      estimatedSavings: vendor.usage.unusedSeatCost,
      recommendedAction:
        "Remove unused seats before the next billing cycle to stop paying for idle licenses.",
      confidence: 0.88,
      basis: `${vendor.usage.inactiveUsers} inactive seats × ${money(
        vendor.usage.costPerActiveUser
      )}/mo × 12 months`,
    });
  }

  // 2. Duplicate tools (overlap detection)
  const overlap = allVendors.filter(
    (v) =>
      v.id !== vendor.id &&
      v.category === vendor.category &&
      v.name !== vendor.name &&
      isOverlappingTool(vendor.name, v.name)
  );
  if (overlap.length > 0 && vendor.annualSpend <= Math.max(...overlap.map((o) => o.annualSpend))) {
    const names = overlap.map((o) => o.name).slice(0, 3).join(", ");
    opps.push({
      vendorId: vendor.id,
      vendorName: vendor.name,
      category,
      type: "duplicate_tools",
      title: `Potential overlap with ${names}`,
      what: `${vendor.name} overlaps with ${names} in the ${category.toLowerCase()} category — the same teams are provisioned in both.`,
      why: "Duplicate tools split usage, seats, and admin overhead while you pay full price in each.",
      estimatedSavings: Math.round(vendor.annualSpend * 0.45),
      recommendedAction:
        "Consolidate on the primary tool and migrate the overlapping team before the next renewal.",
      confidence: 0.72,
      basis: `${money(vendor.annualSpend)} annual spend × 45% consolidation estimate`,
    });
  }

  // 3. Contract optimization at renewal
  if (vendor.risk && vendor.risk.daysToRenewal <= 180) {
    const est = Math.round(vendor.annualSpend * 0.05);
    opps.push({
      vendorId: vendor.id,
      vendorName: vendor.name,
      category,
      type: "contract_optimization",
      title: `Renegotiate at renewal`,
      what: `${vendor.name} renews in ${vendor.risk.daysToRenewal} days${
        vendor.autoRenew ? " and auto-renews if no action is taken" : ""
      }.`,
      why: "Renewal is the single strongest negotiation lever; 4–9% is typical for a competitive quote.",
      estimatedSavings: est,
      recommendedAction: "Open a competitive quote and negotiate before the cancellation deadline.",
      confidence: 0.7,
      basis: `${money(vendor.annualSpend)} × 5% renewal-leverage benchmark`,
    });
  }

  // 4. Price-increase opportunities (cap the escalation)
  if (vendor.priceEscalationRate) {
    const est = Math.round(vendor.annualSpend * (vendor.priceEscalationRate / 100) * 0.6);
    opps.push({
      vendorId: vendor.id,
      vendorName: vendor.name,
      category,
      type: "price_increase",
      title: `Cap the ${vendor.priceEscalationRate}% price increase`,
      what: `Your contract escalates ${vendor.priceEscalationRate}% per year${
        vendor.priceEscalationRate > 5 ? " with no cap" : ""
      }.`,
      why: `Uncapped escalation compounds — capping at CPI (~3%) keeps $${est.toLocaleString()}/yr in the business.`,
      estimatedSavings: est,
      recommendedAction: "Negotiate a cap at or below CPI before the next anniversary.",
      confidence: 0.78,
      basis: `${vendor.priceEscalationRate}% escalation × ${money(
        vendor.annualSpend
      )} × 60% capture`,
    });
  }

  // 5. Cancellation opportunity — very low utilization
  if (vendor.usage && vendor.usage.utilizationPct < 40 && vendor.annualSpend >= 2000) {
    opps.push({
      vendorId: vendor.id,
      vendorName: vendor.name,
      category,
      type: "cancellation",
      title: `Cancel or cut ${vendor.name}`,
      what: `Utilization is ${vendor.usage.utilizationPct.toFixed(0)}% — only ${vendor.usage.activeUsers} of ${vendor.usage.seatsPurchased} seats are active.`,
      why: `The team is effectively not using this tool; it costs ${money(
        vendor.annualSpend
      )}/yr.`,
      estimatedSavings: Math.round(vendor.annualSpend * 0.9),
      recommendedAction:
        "Audit actual usage with the vendor, then cancel or downgrade to the minimum tier.",
      confidence: 0.66,
      basis: `${vendor.usage.utilizationPct.toFixed(0)}% utilization × ${money(
        vendor.annualSpend
      )} annual spend`,
    });
  }

  // 6. Billing discrepancy savings
  const overbilled = vendor.billing.variancePct > 8;
  const anomalyImpact = vendor.billing.anomalies.reduce((a, b) => a + b.impact, 0);
  if (overbilled || anomalyImpact > 500) {
    const est = Math.max(anomalyImpact, Math.round((vendor.billing.actualMonthly - vendor.billing.expectedMonthly) * 12));
    opps.push({
      vendorId: vendor.id,
      vendorName: vendor.name,
      category,
      type: "billing_discrepancy",
      title: `Recover the ${vendor.billing.variancePct > 0 ? "+" : ""}${vendor.billing.variancePct}% billing variance`,
      what: `Actual monthly billing is ${money(vendor.billing.actualMonthly)} vs ${money(
        vendor.billing.expectedMonthly
      )} contracted — a ${vendor.billing.variancePct > 0 ? "+" : ""}${vendor.billing.variancePct}% variance.`,
      why: "The gap is unexplained by usage or headcount and compounds every billing cycle.",
      estimatedSavings: est,
      recommendedAction:
        "Open a billing dispute with the contracted amounts and this month's invoice.",
      confidence: 0.82,
      basis: `${money(est)}/yr from correcting the ${vendor.billing.variancePct}% variance`,
    });
  }

  // 7. Usage optimization — cost per active user above benchmark
  if (vendor.usage && vendor.usage.costPerActiveUser > 60) {
    const excess = (vendor.usage.costPerActiveUser - 45) * vendor.usage.activeUsers * 12 * 0.3;
    if (excess > 400) {
      opps.push({
        vendorId: vendor.id,
        vendorName: vendor.name,
        category,
        type: "usage_optimization",
        title: `Optimize cost per active user`,
        what: `Cost per active user is ${money(vendor.usage.costPerActiveUser)}/mo vs a ~$45 benchmark for this category.`,
        why: "High per-seat pricing means every seat matters — right-sizing tiers or plans would pay off immediately.",
        estimatedSavings: Math.round(excess),
        recommendedAction: "Review plan tiers and negotiate a volume discount on the active base.",
        confidence: 0.6,
        basis: `${money(vendor.usage.costPerActiveUser)} vs $45 benchmark × ${vendor.usage.activeUsers} users`,
      });
    }
  }

  return opps;
}

/** Tool-overlap heuristic: same category + curated duplicate groups. */
const OVERLAP_GROUPS: Record<string, string[]> = {
  documentation: ["Notion", "Confluence", "Google Docs"],
  communication: ["Slack", "Discord", "Microsoft Teams"],
  analytics: ["Amplitude", "Segment", "PostHog", "Heap", "Mixpanel"],
  "project-mgmt": ["Asana", "Monday.com", "ClickUp", "Wrike"],
};

export function isOverlappingTool(a: string, b: string): boolean {
  for (const group of Object.values(OVERLAP_GROUPS)) {
    if (group.includes(a) && group.includes(b)) return true;
  }
  return false;
}

export function findOverlappingVendors(
  vendor: VendorProfile,
  allVendors: VendorProfile[]
): VendorProfile[] {
  return allVendors.filter(
    (v) => v.id !== vendor.id && isOverlappingTool(vendor.name, v.name)
  );
}

export function money(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export { daysFromNow };
