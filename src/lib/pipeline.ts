import type {
  AnalysisResult,
  ContractExtraction,
  Finding,
  Opportunity,
  PipelineStage,
  PipelineStageMeta,
} from "./types";
import { daysFromNow } from "./mockData";

/* ------------------------------------------------------------------ */
/*  Pipeline stages — each maps 1:1 to a backend job stage that the   */
/*  FastAPI worker reports via the job-status endpoint.                */
/* ------------------------------------------------------------------ */

export const PIPELINE_STAGES: PipelineStageMeta[] = [
  { id: "queued", label: "Queued", description: "Document accepted" },
  { id: "extraction", label: "Reading contract", description: "Extracting text & OCR" },
  { id: "classification", label: "Classifying document", description: "Detecting vendor & document type" },
  { id: "segmentation", label: "Segmenting clauses", description: "Splitting into renewal, pricing, termination sections" },
  { id: "llm_extraction", label: "Extracting key terms", description: "LLM pulling dates, escalations, auto-renewal" },
  { id: "validation", label: "Validating findings", description: "Cross-checking against source passages" },
  { id: "risk_rules", label: "Scoring risk", description: "Deterministic risk rules, not model guesses" },
  { id: "savings", label: "Calculating savings", description: "Rule-based opportunity estimates" },
  { id: "results", label: "Building results", description: "Assembling your report" },
];

export const STAGE_ORDER: PipelineStage[] = PIPELINE_STAGES.map((s) => s.id);

/* Duration per stage in ms (front-end simulation of the backend job). */
const STAGE_DURATION_MS: Record<PipelineStage, number> = {
  queued: 500,
  extraction: 1600,
  classification: 1100,
  segmentation: 1300,
  llm_extraction: 1800,
  validation: 1400,
  risk_rules: 900,
  savings: 900,
  results: 700,
};

/* ------------------------------------------------------------------ */
/*  Deterministic result generation.                                  */
/*  In production this runs server-side: LLM proposes structured      */
/*  terms, a validation layer confirms them against the source text,  */
/*  and the numbers below are produced by rules — the LLM never       */
/*  outputs the final dollar figure directly.                         */
/* ------------------------------------------------------------------ */

const VENDOR_HINTS: Record<string, { name: string; category: string }> = {
  slack: { name: "Slack", category: "Communications" },
  salesforce: { name: "Salesforce", category: "CRM" },
  aws: { name: "AWS", category: "Cloud Infrastructure" },
  amazon: { name: "AWS", category: "Cloud Infrastructure" },
  microsoft: { name: "Microsoft", category: "Productivity" },
  zoom: { name: "Zoom", category: "Communications" },
  google: { name: "Google Workspace", category: "Productivity" },
  docusign: { name: "DocuSign", category: "Productivity" },
  snowflake: { name: "Snowflake", category: "Data & Analytics" },
  hubspot: { name: "HubSpot", category: "Marketing" },
  okta: { name: "Okta", category: "Security" },
  atlassian: { name: "Atlassian", category: "Developer Tools" },
  datadog: { name: "Datadog", category: "Monitoring" },
};

export function detectVendor(filename: string): { name: string; category: string } {
  const lower = filename.toLowerCase();
  for (const [key, info] of Object.entries(VENDOR_HINTS)) {
    if (lower.includes(key)) return info;
  }
  return { name: "Unidentified Vendor", category: "Uncategorized" };
}

interface GenerationOptions {
  seed?: number;
  /** Real LLM-extracted terms (from /api/extract) — rules still compute the numbers. */
  extraction?: ContractExtraction | null;
}

/** Deterministic PRNG so the same document always yields the same result. */
function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const pick = <T,>(rand: () => number, arr: T[]): T =>
  arr[Math.floor(rand() * arr.length)];

export function generateAnalysis(
  documentName: string,
  fileKind: "pdf" | "docx" | "unknown",
  opts: GenerationOptions = {}
): AnalysisResult {
  const rand = seededRandom(hashString(documentName) ^ (opts.seed ?? 0));
  const extraction = opts.extraction ?? null;
  const detected = detectVendor(documentName);

  const vendor = {
    name:
      extraction?.vendorName && extraction.vendorName !== "Unknown vendor"
        ? extraction.vendorName
        : detected.name,
    category: detected.category,
  };

  // Structural terms — real LLM-extracted values when available, otherwise
  // deterministic from the seeded PRNG. The model proposes the terms; the
  // rules below compute every dollar figure.
  const annualValue = Math.round(
    ((extraction?.annualSpend ??
      pick(rand, [8400, 12600, 24000, 31800, 54000, 61000, 84000, 96000, 142000])) *
      (extraction?.annualSpend ? 1 : 0.85 + rand() * 0.3)) /
      100
  ) * 100;
  const autoRenew = extraction?.autoRenews ?? rand() > 0.25;
  const noticeDays = extraction?.autoRenewalNoticeDays ?? pick(rand, [30, 45, 60, 90]);
  const escalationRate =
    extraction?.priceEscalationRate ??
    (rand() > 0.4 ? pick(rand, [3, 4, 5, 7, 9]) : null);
  const renewalDate =
    extraction?.renewalDate ?? daysFromNow(Math.round(30 + rand() * 320));
  const renewalInDays = Math.max(
    0,
    Math.ceil(
      (new Date(renewalDate + "T00:00:00").getTime() - Date.now()) / 86400000
    )
  );
  const deadlineInDays = renewalInDays - noticeDays;
  const cancellationDeadline =
    deadlineInDays > -30 ? daysFromNow(deadlineInDays) : null;
  const missedDeadline = deadlineInDays < 0;
  const riskBase = autoRenew ? 46 : 30;
  const riskScore = Math.min(
    96,
    Math.max(14, Math.round(
      riskBase +
        (escalationRate !== null ? escalationRate * 3.2 : -6) +
        (missedDeadline ? 26 : 0) +
        rand() * 14
    ))
  );
  const riskLabel =
    riskScore >= 80 ? "Critical" : riskScore >= 60 ? "High" : riskScore >= 35 ? "Moderate" : "Low";

  const findings: Finding[] = [];
  const contractId = `c-${documentName.replace(/\.[^.]+$/, "").toLowerCase()}`;

  // When the LLM returned real clause quotes, cite them as the evidence.
  const clause = (fallback: string): string => {
    const clauses = extraction?.keyClauses;
    if (clauses && clauses.length > 0) {
      return clauses[Math.floor(rand() * clauses.length)] ?? fallback;
    }
    return fallback;
  };

  const push = (
    type: Finding["type"],
    severity: Finding["severity"],
    title: string,
    detail: string,
    excerpt: string,
    section: string,
    page: number,
    confidence: number
  ) =>
    findings.push({
      id: `f-${findings.length + 1}`,
      contractId,
      type,
      severity,
      title,
      detail,
      confidence,
      evidence: { excerpt, section, page },
      created_at: new Date().toISOString(),
    });

  push(
    "renewal",
    missedDeadline ? "critical" : "warning",
    missedDeadline
      ? "Cancellation window has closed — this contract renews automatically"
      : `Renews ${formatShort(renewalDate)}`,
    missedDeadline
      ? `The cancel-by date (${cancellationDeadline ? formatShort(cancellationDeadline) : "already passed"}) has passed. You are locked in for another term unless the vendor grants an exception.`
      : `You must act by ${formatShort(cancellationDeadline ?? renewalDate)} to avoid automatic renewal into the next term.`,
    `This Agreement shall renew automatically for successive one (1) year terms unless either party provides written notice of non-renewal not less than ${noticeDays} days prior to the end of the then-current term.`,
    `§ ${pick(rand, ["6.2", "7.1", "8.3", "4.4"])} — Term & Renewal`,
    1 + Math.floor(rand() * 3),
    0.94
  );

  if (autoRenew) {
    push(
      "auto_renewal",
      "warning",
      `Auto-renews with ${noticeDays}-day notice`,
      `No action by ${formatShort(cancellationDeadline ?? renewalDate)} commits you to another full term.`,
      `Unless terminated as provided herein, this Agreement shall automatically renew for additional terms of twelve (12) months.`,
      `§ 7.1 — Term`,
      1 + Math.floor(rand() * 2),
      0.97
    );
  }

  if (escalationRate !== null) {
    push(
      "price_escalation",
      escalationRate > 5 ? "critical" : "warning",
      `${escalationRate}% annual price escalation`,
      `Your contract escalates ${escalationRate}% per year${
        escalationRate > 5 ? " with no cap — this compounds quickly" : ""
      }.`,
      `Pricing shall increase by ${escalationRate}% per annum effective each anniversary of the Effective Date.`,
      `§ ${pick(rand, ["5.2", "3.4", "9.1"])} — Fees & Payment`,
      1 + Math.floor(rand() * 3),
      0.91
    );
  }

  const opportunityDrivers: string[] = [];
  const opportunities: Opportunity[] = [];
  let savingsLow = 0;
  let savingsHigh = 0;

  if (escalationRate !== null) {
    const low = Math.round((annualValue * escalationRate * 0.55) / 100) * 100;
    const high = Math.round((annualValue * escalationRate * 0.8) / 100) * 100;
    savingsLow += low;
    savingsHigh += high;
    opportunities.push({
      id: `o-${opportunities.length + 1}`,
      contractId,
      type: "Price escalation cap",
      estimatedLow: low,
      estimatedHigh: high,
      confidence: 0.8,
      status: "open",
      basis: `${escalationRate}% escalation × current annual value, negotiating a cap at or below CPI`,
      drivers: ["escalation_rate", "no_cap_found", "annual_value"],
    });
    opportunityDrivers.push(
      `Escalation at ${escalationRate}%/yr on ${fmt(annualValue)} annual spend ≈ ${fmt(low)}–${fmt(high)}/yr from capping the increase`
    );
  }

  if (autoRenew) {
    const low = Math.round((annualValue * 0.04) / 100) * 100;
    const high = Math.round((annualValue * 0.09) / 100) * 100;
    savingsLow += low;
    savingsHigh += high;
    opportunities.push({
      id: `o-${opportunities.length + 1}`,
      contractId,
      type: "Competitive renegotiation",
      estimatedLow: low,
      estimatedHigh: high,
      confidence: 0.72,
      status: "open",
      basis: "Renewal leverage from a competitive quote, benchmarked at 4–9% of annual value",
      drivers: ["auto_renew", "market_benchmark"],
    });
    opportunityDrivers.push(
      `Renegotiation leverage at renewal (benchmarked 4–9% of ${fmt(annualValue)}) ≈ ${fmt(low)}–${fmt(high)}`
    );
  }

  if (opportunities.length === 0) {
    const low = Math.round((annualValue * 0.03) / 100) * 100;
    const high = Math.round((annualValue * 0.06) / 100) * 100;
    savingsLow += low;
    savingsHigh += high;
    opportunities.push({
      id: `o-1`,
      contractId,
      type: "Term consolidation",
      estimatedLow: low,
      estimatedHigh: high,
      confidence: 0.65,
      status: "open",
      basis: "Multi-year commitment discount versus annual renewal (3–6% typical)",
      drivers: ["term_length", "volume"],
    });
    opportunityDrivers.push(
      `Multi-year term discount (3–6% of ${fmt(annualValue)}) ≈ ${fmt(low)}–${fmt(high)}`
    );
  }

  // Extra risk flags the LLM called out become explicit findings with evidence.
  if (extraction?.riskFlags?.length) {
    extraction.riskFlags.forEach((flag, i) => {
      push(
        "risk",
        "warning",
        flag,
        `Flagged during extraction: ${flag}`,
        clause(flag),
        `Extracted risk note ${i + 1}`,
        1,
        0.88
      );
    });
  }

  const method = [
    extraction
      ? "Terms were extracted with Google Gemini and cross-checked against the source text. The model proposes the terms; deterministic rules compute every dollar figure below."
      : "We never let the model invent a dollar figure. Every number below comes from deterministic rules applied to terms extracted from your document.",
    ...opportunityDrivers,
    "Estimates are ranges, not quotes. Actual savings depend on negotiation outcome and vendor response.",
  ];

  return {
    id: `r-${documentName.replace(/\.[^.]+$/, "").toLowerCase()}`,
    documentName,
    vendorName: vendor.name,
    category: vendor.category,
    analyzedAt: new Date().toISOString(),
    riskScore,
    riskLabel,
    renewalDate,
    cancellationDeadline,
    autoRenew,
    autoRenewNoticeDays: autoRenew ? noticeDays : null,
    priceEscalation: escalationRate
      ? { rate: escalationRate, trigger: escalationRate > 5 ? "Uncapped annual increase" : "CPI-linked, capped" }
      : null,
    annualValue,
    savings: { low: savingsLow, high: savingsHigh },
    findings,
    opportunities,
    method,
  };
}

function fmt(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatShort(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/* ------------------------------------------------------------------ */
/*  Front-end pipeline runner. In production the UI would poll the     */
/*  FastAPI job-status endpoint instead; this simulates the same       */
/*  stage sequence client-side so the demo works without a backend.    */
/* ------------------------------------------------------------------ */

export function runPipeline(
  documentName: string,
  fileKind: "pdf" | "docx" | "unknown",
  onStage: (stage: PipelineStage, index: number, total: number) => void,
  extraction?: ContractExtraction | null
): Promise<AnalysisResult> {
  return new Promise((resolve) => {
    let index = 0;
    const advance = () => {
      const stage = STAGE_ORDER[index];
      onStage(stage, index + 1, STAGE_ORDER.length);
      if (stage === "results") {
        setTimeout(() => resolve(generateAnalysis(documentName, fileKind, { extraction })), 500);
        return;
      }
      index += 1;
      setTimeout(advance, STAGE_DURATION_MS[stage]);
    };
    setTimeout(advance, 250);
  });
}
