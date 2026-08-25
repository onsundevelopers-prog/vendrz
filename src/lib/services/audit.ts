import type {
  ActionStatus,
  AlertRecord,
  AuditStage,
  AuditStageMeta,
  CompanyAudit,
  DataSource,
  SpendCategory,
  SpendPoint,
  Transaction,
  VendorProfile,
} from "@/lib/types";
import {
  CATEGORY_DESCRIPTIONS,
  CURATED_VENDORS,
  FILLER_POOL,
  seededRandom,
  type VendorSeed,
} from "@/lib/data/vendorSeeds";
import {
  buildVendorProfile,
  computeVendorOpportunities,
  daysFromNow,
  findOverlappingVendors,
  last12Months,
  money,
  type OpportunityDraft,
} from "./engines";
import { buildAlerts } from "./alerts";
import { matchMerchant, normalizeMerchant } from "./vendorMatching";
// re-export so matching is available to consumers of the audit pipeline
export { matchMerchant, normalizeMerchant };

/* ------------------------------------------------------------------ */
/*  Audit pipeline stages                                             */
/* ------------------------------------------------------------------ */

export const AUDIT_STAGES: AuditStageMeta[] = [
  { id: "connect", label: "Connecting data source", description: "Establishing read-only access" },
  { id: "collect", label: "Collecting transactions", description: "Pulling statements & invoices" },
  { id: "normalize", label: "Normalizing records", description: "Standardizing amounts, dates, currencies" },
  { id: "match", label: "Matching vendors", description: "Resolving merchant strings to vendor identities" },
  { id: "analyze", label: "Analyzing spend", description: "Computing trends, categories, anomalies" },
  { id: "opportunities", label: "Detecting opportunities", description: "Running the savings engine" },
  { id: "recommend", label: "Building recommendations", description: "Prioritizing actions & alerts" },
  { id: "results", label: "Assembling your report", description: "Preparing the executive summary" },
];

export const AUDIT_STAGE_ORDER: AuditStage[] = AUDIT_STAGES.map((s) => s.id);

/* ------------------------------------------------------------------ */
/*  Long-tail filler generation                                       */
/* ------------------------------------------------------------------ */

function generateFillerSeeds(targetTotal: number): VendorSeed[] {
  const rand = seededRandom(20260823);
  const pool = FILLER_POOL.filter((f) => f.typical > 0);
  // deterministic Fisher–Yates shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const needed = targetTotal - CURATED_VENDORS.length;
  const chosen = pool.slice(0, Math.max(0, needed));
  return chosen.map((entry, i) => {
    const annual = Math.round((entry.typical * (0.55 + rand() * 0.75)) / 50) * 50;
    const hasSeats = ["Software", "Marketing", "Operations", "HR"].includes(entry.category);
    const seats = hasSeats ? 5 + Math.floor(rand() * 36) : 0;
    const active = hasSeats
      ? Math.max(2, Math.round(seats * (0.35 + rand() * 0.55)))
      : 0;
    const renewal = rand() > 0.45 ? Math.round(60 + rand() * 280) : undefined;
    const notice = Math.round(30 + rand() * 30);
    return {
      id: `v-f-${i + 1}`,
      name: entry.name,
      category: entry.category,
      description: CATEGORY_DESCRIPTIONS[entry.category] ?? "Miscellaneous services",
      annualSpend: annual,
      spendTrendPct: Math.round(-5 + rand() * 18),
      seats,
      activeUsers: active,
      renewalInDays: renewal,
      cancellationInDays:
        renewal !== undefined ? Math.max(7, renewal - notice) : undefined,
      autoRenew: rand() > 0.2,
      escalationRate: rand() > 0.85 ? 3 + Math.floor(rand() * 2) : null,
      anomalies: [],
      status: "active",
    };
  });
}

/* ------------------------------------------------------------------ */
/*  Transaction log (normalized merchant records)                     */
/* ------------------------------------------------------------------ */

const MERCHANT_VARIANTS: Record<string, string[]> = {
  "v-anthropic": ["ANTHROPIC*CLAUDE", "ANTHROPIC PBC", "CLAUDE.AI"],
  "v-cursor": ["CURSOR AI", "CURSOR.COM", "ANYSHP CURSOR"],
  "v-aws": ["AWS*MARKETPLACE", "AMAZON WEB SERVICES", "AWS"],
  "v-slack": ["SLACK TECHNOLOGIES", "SLACK", "SLACK*"],
  "v-adobe": ["ADOBE SYSTEMS", "ADOBE CREATIVE CLOUD", "ADOBE*"],
  "v-google-workspace": ["GOOGLE WORKSPACE", "GOOGLE*GSUITE", "GOOGLE"],
  "v-notion": ["NOTION LABS", "NOTION", "NOTION.AI"],
  "v-hubspot": ["HUBSPOT INC", "HUBSPOT*", "HUBSPOT"],
  "v-figma": ["FIGMA INC", "FIGMA", "FIGMA*"],
  "v-github": ["GITHUB INC", "GITHUB.COM", "GITHUB*"],
  "v-salesforce": ["SALESFORCE.COM", "SALESFORCE*", "SALESFORCE"],
  "v-microsoft-365": ["MICROSOFT*M365", "MICROSOFT", "M365"],
  "v-datadog": ["DATADOG INC", "DATADOG", "DDG*"],
  "v-snowflake": ["SNOWFLAKE COMPUTING", "SNOWFLAKE", "SNOWFLAKE*"],
  "v-zoom": ["ZOOM.US", "ZOOM VIDEO", "ZOOM*"],
  "v-docusign": ["DOCUSIGN INC", "DOCUSIGN", "DOCUSIGN*"],
  "v-atlassian": ["ATLASSIAN", "JIRA SOFTWARE", "ATLASSIAN*"],
  "v-confluence": ["CONFLUENCE", "ATLASSIAN CONFLUENCE"],
  "v-openai": ["OPENAI", "OPENAI.COM", "CHATGPT"],
  "v-linear": ["LINEARAPP", "LINEAR APP", "LINEAR"],
  "v-vercel": ["VERCEL INC", "VERCEL", "VERCEL*"],
  "v-stripe": ["STRIPE INC", "STRIPE", "STRIPE*"],
  "v-twilio": ["TWILIO INC", "TWILIO", "TWILIO*"],
  "v-cloudflare": ["CLOUDFLARE INC", "CLOUDFLARE", "CLOUDFLARE*"],
  "v-sentry": ["SENTRY.IO", "SENTRY", "SENTRY*"],
  "v-posthog": ["POSTHOG INC", "POSTHOG", "POSTHOG*"],
  "v-intercom": ["INTERCOM INC", "INTERCOM", "INTERCOM*"],
  "v-zendesk": ["ZENDESK INC", "ZENDESK", "ZENDESK*"],
  "v-asana": ["ASANA INC", "ASANA", "ASANA*"],
  "v-miro": ["MIRO.COM", "MIRO", "REALTIMEBOARD"],
  "v-loom": ["LOOM.COM", "LOOM", "LOOM*"],
  "v-canva": ["CANVA PTY", "CANVA", "CANVA*"],
  "v-dropbox": ["DROPBOX INC", "DROPBOX", "DROPBOX*"],
  "v-okta": ["OKTA INC", "OKTA", "OKTA*"],
  "v-1password": ["1PASSWORD.COM", "1PASSWORD", "1PASSWORD*"],
  "v-discord": ["DISCORD INC", "DISCORD", "DISCORD*"],
  "v-amplitude": ["AMPLITUDE INC", "AMPLITUDE", "AMPLITUDE*"],
  "v-segment": ["SEGMENT.IO", "TWILIO SEGMENT", "SEGMENT"],
  "v-zapier": ["ZAPIER INC", "ZAPIER", "ZAPIER*"],
  "v-webflow": ["WEBFLOW INC", "WEBFLOW", "WEBFLOW*"],
  "v-airtable": ["AIRTABLE INC", "AIRTABLE", "AIRTABLE*"],
  "v-pagerduty": ["PAGERDUTY", "PAGER DUTY", "PAGERDUTY*"],
  "v-new-relic": ["NEWRELIC", "NEW RELIC", "NEWRELIC*"],
  "v-mongodb": ["MONGODB ATLAS", "MONGODB INC", "MONGODB"],
  "v-supabase": ["SUPABASE INC", "SUPABASE", "SUPABASE*"],
  "v-fastly": ["FASTLY INC", "FASTLY", "FASTLY*"],
  "v-grammarly": ["GRAMMARLY INC", "GRAMMARLY", "GRAMMARLY*"],
};

function buildTransactions(vendors: VendorProfile[]): Transaction[] {
  const rand = seededRandom(424242);
  const txs: Transaction[] = [];
  const months = last12Months();
  for (const v of vendors) {
    const variants = MERCHANT_VARIANTS[v.id] ?? [v.name.toUpperCase()];
    for (let m = 0; m < 12; m++) {
      const monthly = v.monthlySeries[m] ?? v.monthlyAvg;
      const splits = 1 + Math.floor(rand() * 2);
      for (let s = 0; s < splits; s++) {
        const merchant = variants[Math.floor(rand() * variants.length)];
        const matched = matchMerchant(merchant);
        txs.push({
          id: `tx-${v.id}-${m}-${s}`,
          date: `${months[m].key}-${String(1 + Math.floor(rand() * 27)).padStart(2, "0")}`,
          amount: Math.round((monthly / splits) * 100) / 100,
          currency: "USD",
          description: `${v.name} — ${v.category.toLowerCase()}`,
          merchant,
          vendorId: matched?.vendorId ?? v.id,
          category: v.category,
          account: ["Corporate Amex", "Operating", "Engineering"][m % 3],
          recurring: true,
          source: "financial",
          confidence: matched?.confidence ?? 0.85,
        });
      }
    }
  }
  // A few unmatched merchants to demonstrate the matching layer's fallback.
  const unmatched = ["BESPOKE COFFEE ROASTERS", "WINDY CITY CAB", "ACME PRINT SHOP"];
  for (let i = 0; i < unmatched.length; i++) {
    const norm = normalizeMerchant(unmatched[i]);
    txs.push({
      id: `tx-u-${i}`,
      date: daysFromNow(-(i * 13)),
      amount: 80 + i * 25,
      currency: "USD",
      description: "Unmatched merchant — needs review",
      merchant: unmatched[i],
      vendorId: `v-x-${norm.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
      category: "Other",
      account: "Operating",
      recurring: false,
      source: "financial",
      confidence: 0.3,
    });
  }
  return txs;
}

/* ------------------------------------------------------------------ */
/*  Company audit assembly                                            */
/* ------------------------------------------------------------------ */

export function buildCompanyAudit(): CompanyAudit {
  const seeds: VendorSeed[] = [...CURATED_VENDORS, ...generateFillerSeeds(147)];
  const vendors = seeds.map(buildVendorProfile);

  // ---- spend series (trailing 12 months) ----
  const months = last12Months();
  const spendSeries: SpendPoint[] = months.map((m, i) => {
    const categories: Partial<Record<SpendCategory, number>> = {};
    let total = 0;
    for (const v of vendors) {
      const val = v.monthlySeries[i] ?? 0;
      total += val;
      categories[v.category] = (categories[v.category] ?? 0) + val;
    }
    return { month: m.key, label: m.label, total: Math.round(total), categories };
  });
  const totalAnnualSpend = spendSeries.reduce((a, s) => a + s.total, 0);
  const monthlySpend = spendSeries[spendSeries.length - 1]?.total ?? 0;

  // ---- opportunities (savings engine) ----
  const drafts: OpportunityDraft[] = [];
  for (const v of vendors) {
    drafts.push(...computeVendorOpportunities(v, vendors));
  }
  const now = new Date().toISOString();
  const ranked = [...drafts].sort((a, b) => b.estimatedSavings - a.estimatedSavings);
  const opportunities = ranked.map((d, i) => {
    // Deterministic status funnel: confirmed → actioned → in_review → open, few dismissed.
    let status: ActionStatus = "open";
    const pct = i / Math.max(1, ranked.length);
    if (pct < 0.05) status = "savings_confirmed";
    else if (pct < 0.19) status = "actioned";
    else if (pct < 0.31) status = "in_review";
    else if (pct > 0.97) status = "dismissed";
    return {
      ...d,
      id: `opp-${i + 1}`,
      status,
      createdAt: now,
    };
  });

  const potentialSavings = opportunities
    .filter((o) => o.status !== "dismissed")
    .reduce((a, o) => a + o.estimatedSavings, 0);
  const actioned = opportunities
    .filter((o) => o.status === "actioned" || o.status === "savings_confirmed")
    .reduce((a, o) => a + o.estimatedSavings, 0);
  const confirmed = opportunities
    .filter((o) => o.status === "savings_confirmed")
    .reduce((a, o) => a + o.estimatedSavings, 0);

  // ---- vendor potential savings (per-vendor sum) ----
  const byVendor = new Map<string, number>();
  for (const o of opportunities) {
    byVendor.set(o.vendorId, (byVendor.get(o.vendorId) ?? 0) + o.estimatedSavings);
  }
  for (const v of vendors) {
    v.potentialSavings = Math.round(byVendor.get(v.id) ?? 0);
    v.duplicates = findOverlappingVendors(v, vendors).map((o) => o.name);
  }

  // ---- categories ----
  const catMap = new Map<SpendCategory, { spend: number; count: number }>();
  for (const v of vendors) {
    const cur = catMap.get(v.category) ?? { spend: 0, count: 0 };
    cur.spend += v.annualSpend;
    cur.count += 1;
    catMap.set(v.category, cur);
  }
  const categories = [...catMap.entries()]
    .map(([name, c]) => ({ name, spend: Math.round(c.spend), count: c.count }))
    .sort((a, b) => b.spend - a.spend);

  // ---- headline counters ----
  const renewalRisks = vendors.filter((v) => v.risk).length;
  const unusedLicenses = vendors.reduce((a, v) => a + (v.usage?.inactiveUsers ?? 0), 0);
  const billingAnomalies = vendors.reduce((a, v) => a + v.billing.anomalies.length, 0);
  const priceIncreases = vendors.filter(
    (v) => (v.priceEscalationRate && v.priceEscalationRate >= 5) || v.spendTrendPct >= 20
  ).length;

  // ---- overall health (spend-weighted) ----
  const healthScore = Math.round(
    vendors.reduce((a, v) => a + v.healthScore * v.annualSpend, 0) / Math.max(1, totalAnnualSpend)
  );

  // ---- alerts ----
  const alerts: AlertRecord[] = buildAlerts({ vendors, spendSeries });

  // ---- data sources ----
  const dataSources: DataSource[] = [
    {
      id: "ds-plaid",
      name: "Business bank & card feeds",
      kind: "financial",
      status: "demo",
      readOnly: true,
      description: "Transactions from corporate cards and bank accounts (read-only).",
      connectedAt: now,
    },
    {
      id: "ds-stripe",
      name: "Stripe",
      kind: "financial",
      status: "demo",
      readOnly: true,
      description: "Payment processor billing records (read-only).",
      connectedAt: now,
    },
    {
      id: "ds-expensify",
      name: "Expensify",
      kind: "expense",
      status: "demo",
      readOnly: true,
      description: "Employee expense reports and reimbursements.",
      connectedAt: now,
    },
    {
      id: "ds-invoice",
      name: "Invoice & contract upload",
      kind: "invoice",
      status: "available",
      readOnly: true,
      description: "Upload PDF invoices and agreements for extraction.",
    },
    {
      id: "ds-vendor",
      name: "Individual vendor APIs",
      kind: "vendor",
      status: "available",
      readOnly: true,
      description: "Usage and seat data via vendor OAuth (e.g. Slack, GitHub).",
    },
  ];

  const transactions = buildTransactions(vendors);

  return {
    companyName: "Acme Technologies",
    generatedAt: now,
    totalAnnualSpend,
    monthlySpend,
    potentialSavings,
    vendorCount: vendors.length,
    transactionCount: transactions.length,
    renewalRisks,
    unusedLicenses,
    billingAnomalies,
    priceIncreases,
    healthScore,
    spendSeries,
    categories,
    vendors,
    opportunities,
    alerts,
    savings: { potential: potentialSavings, actioned, confirmed },
    dataSources,
  };
}

/* ------------------------------------------------------------------ */
/*  Executive report                                                   */
/* ------------------------------------------------------------------ */

export interface ExecutiveReport {
  company: string;
  generatedAt: string;
  totalAnnualSpend: number;
  monthlySpend: number;
  potentialSavings: number;
  confirmedSavings: number;
  vendorCount: number;
  healthScore: number;
  topVendors: VendorProfile[];
  categories: CompanyAudit["categories"];
  renewalRisks: VendorProfile[];
  anomalies: VendorProfile[];
  unusedSeats: VendorProfile[];
  priceIncreases: VendorProfile[];
  opportunities: CompanyAudit["opportunities"];
  spendSeries: SpendPoint[];
}

export function buildExecutiveReport(audit: CompanyAudit): ExecutiveReport {
  return {
    company: audit.companyName,
    generatedAt: audit.generatedAt,
    totalAnnualSpend: audit.totalAnnualSpend,
    monthlySpend: audit.monthlySpend,
    potentialSavings: audit.potentialSavings,
    confirmedSavings: audit.savings.confirmed,
    vendorCount: audit.vendorCount,
    healthScore: audit.healthScore,
    topVendors: [...audit.vendors].sort((a, b) => b.annualSpend - a.annualSpend).slice(0, 10),
    categories: audit.categories,
    renewalRisks: audit.vendors.filter((v) => v.risk).sort((a, b) => a.risk!.daysToRenewal - b.risk!.daysToRenewal),
    anomalies: audit.vendors.filter((v) => v.billing.anomalies.length > 0),
    unusedSeats: audit.vendors.filter((v) => (v.usage?.inactiveUsers ?? 0) > 0).sort((a, b) => (b.usage?.inactiveUsers ?? 0) - (a.usage?.inactiveUsers ?? 0)),
    priceIncreases: audit.vendors.filter((v) => v.priceEscalationRate !== null || v.spendTrendPct >= 15),
    opportunities: audit.opportunities,
    spendSeries: audit.spendSeries,
  };
}

export { money };
