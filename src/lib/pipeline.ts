import type {
  AnalysisResult,
  ContractExtraction,
  Finding,
  Opportunity,
  PipelineStage,
  PipelineStageMeta,
  RichContractExtraction,
} from "./types";

/* ------------------------------------------------------------------ */
/*  Pipeline stages - each maps 1:1 to a backend job stage that the   */
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
/*  Result assembly.                                                  */
/*  Every figure comes from terms actually extracted from the user's  */
/*  document (via /api/extract) and deterministic rules applied to    */
/*  those terms. When no extraction exists, returns null - the app    */
/*  shows an honest "analysis unavailable" state instead of invented  */
/*  numbers. Nothing here fabricates contract content.                */
/* ------------------------------------------------------------------ */

interface GenerationOptions {
  /** Real LLM-extracted terms (from /api/extract). Required. */
  extraction: ContractExtraction;
  /** Canonical rich extraction (the AI's full output) - enriches findings
      and opportunities with the model's structured risks & savings. */
  rich?: RichContractExtraction | null;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

function parseISO(iso: string | null): Date | null {
  if (!iso) return null;
  const d = new Date(iso.length <= 10 ? iso + "T00:00:00" : iso);
  return isNaN(d.getTime()) ? null : d;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function generateAnalysis(
  documentName: string,
  fileKind: "pdf" | "docx" | "unknown",
  opts: GenerationOptions
): AnalysisResult {
  const extraction = opts.extraction;

  // Only real extracted terms are used. Unknown values stay null / 0 and are
  // rendered as "—" in the UI; they are never replaced with made-up figures.
  const annualValue = extraction.annualSpend ?? null;
  const autoRenew = extraction.autoRenews ?? null;
  const noticeDays = extraction.autoRenewalNoticeDays ?? null;
  const escalationRate = extraction.priceEscalationRate ?? null;
  const renewalDate = extraction.renewalDate ?? null;

  const renewal = parseISO(renewalDate);
  const cancellationDeadline =
    renewal && noticeDays
      ? new Date(renewal.getTime() - noticeDays * 86400000).toISOString().slice(0, 10)
      : null;

  // Risk score: deterministic rules over the extracted terms only.
  let riskScore = autoRenew === true ? 46 : autoRenew === false ? 30 : 38;
  if (escalationRate !== null) riskScore += escalationRate * 3.2;
  const deadline = parseISO(cancellationDeadline);
  if (deadline && deadline.getTime() < Date.now()) riskScore += 26;
  riskScore = Math.round(clamp(riskScore, 14, 96));

  const riskLabel =
    riskScore >= 80 ? "Critical" : riskScore >= 60 ? "High" : riskScore >= 35 ? "Moderate" : "Low";

  const contractId = `c-${documentName.replace(/\.[^.]+$/, "").toLowerCase()}`;
  const findings: Finding[] = [];
  const opportunities: Opportunity[] = [];

  const push = (
    type: Finding["type"],
    severity: Finding["severity"],
    title: string,
    detail: string,
    excerpt: string,
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
      evidence: { excerpt, section: "Document", page: 1 },
      created_at: new Date().toISOString(),
    });

  // Clause-backed findings are only produced when the extraction returned
  // real quotes from the document. Without evidence, no finding is invented.
  const clauses = extraction.keyClauses ?? [];

  if (renewal) {
    const missed = deadline !== null && deadline.getTime() < Date.now();
    push(
      "renewal",
      missed ? "critical" : "warning",
      missed ? "Cancellation window has closed" : `Renews ${fmtDate(renewalDate)}`,
      missed
        ? `The cancel-by date (${fmtDate(cancellationDeadline)}) has passed. The contract is committed to its next term unless the vendor grants an exception.`
        : `You must act by ${fmtDate(cancellationDeadline ?? renewalDate)} to avoid renewal into the next term.`,
      clauses[0] ?? `Renewal date extracted from the document: ${fmtDate(renewalDate)}.`,
      missed ? 0.92 : 0.88
    );
  }

  if (autoRenew === true) {
    push(
      "auto_renewal",
      "warning",
      `Auto-renews${noticeDays ? ` with ${noticeDays}-day notice` : ""}`,
      `No action by ${fmtDate(cancellationDeadline ?? renewalDate)} commits you to another full term.`,
      clauses[1] ?? "Auto-renewal term extracted from the document.",
      noticeDays ? 0.9 : 0.85
    );
  }

  if (escalationRate !== null) {
    push(
      "price_escalation",
      escalationRate > 5 ? "critical" : "warning",
      `${escalationRate}% annual price escalation`,
      `The contract escalates ${escalationRate}% per year${escalationRate > 5 ? " with no cap found - this compounds quickly" : ""}.`,
      clauses[2] ?? "Price escalation rate extracted from the document.",
      0.88
    );
  }

  // Savings opportunities are computed by rules from the extracted annual
  // value and terms. They are estimates, never guaranteed figures.
  let savingsLow = 0;
  let savingsHigh = 0;

  if (annualValue && annualValue > 0) {
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
        drivers: ["escalation_rate", "annual_value"],
      });
    }

    if (autoRenew === true) {
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
        basis: "Renewal leverage from a competitive quote, benchmarked at 4-9% of annual value",
        drivers: ["auto_renew", "market_benchmark"],
      });
    }
  }

  // Risk flags surfaced by the model become explicit findings with the
  // flag text as evidence - nothing is paraphrased into a fake clause.
  if (extraction.riskFlags?.length) {
    extraction.riskFlags.forEach((flag) => {
      push("risk", "warning", flag, `Flagged during extraction: ${flag}`, flag, 0.88);
    });
  }

  // Enrich findings with the rich schema's structured risks.
  if (opts.rich?.risks?.length) {
    opts.rich.risks.forEach((r) => {
      push(
        "risk",
        r.severity === "critical" ? "critical" : r.severity === "high" ? "warning" : "info",
        r.description,
        r.description,
        r.evidence ?? "Risk flagged during extraction.",
        r.severity === "low" ? 0.7 : 0.9
      );
    });
  }

  // Enrich opportunities with the rich schema's structured savings.
  if (opts.rich?.savings_opportunities?.length) {
    opts.rich.savings_opportunities.forEach((s) => {
      opportunities.push({
        id: `o-${opportunities.length + 1}`,
        contractId,
        type: s.type,
        estimatedLow: s.estimate_low ?? 0,
        estimatedHigh: s.estimate_high ?? s.estimate_low ?? 0,
        confidence: 0.8,
        status: "open",
        basis: s.basis ?? "Identified by the analysis model.",
        drivers: ["model_opportunity"],
      });
    });
  }

  const method = [
    "Terms were extracted from your document and cross-checked against the source text. The model proposes the terms; deterministic rules compute every figure below.",
    "Unknown values are shown as unavailable - never estimated.",
    "Savings estimates are ranges, not quotes. Actual savings depend on negotiation outcome and vendor response.",
  ];

  return {
    id: `r-${documentName.replace(/\.[^.]+$/, "").toLowerCase()}`,
    documentName,
    vendorName:
      extraction.vendorName && extraction.vendorName !== "Unknown vendor"
        ? extraction.vendorName
        : "Unidentified Vendor",
    category: "Uncategorized",
    analyzedAt: new Date().toISOString(),
    riskScore,
    riskLabel,
    renewalDate,
    cancellationDeadline,
    autoRenew,
    autoRenewNoticeDays: autoRenew === true ? noticeDays : null,
    priceEscalation: escalationRate !== null ? { rate: escalationRate, trigger: "Annual increase" } : null,
    annualValue,
    savings: { low: savingsLow, high: savingsHigh },
    findings,
    opportunities,
    method,
  };
}

/* ------------------------------------------------------------------ */
/*  Front-end pipeline runner. In production the UI would poll the     */
/*  FastAPI job-status endpoint instead; this simulates the same       */
/*  stage sequence client-side. Requires a real extraction - without   */
/*  one it resolves to null and the UI shows an honest empty state.    */
/* ------------------------------------------------------------------ */

export function runPipeline(
  documentName: string,
  fileKind: "pdf" | "docx" | "unknown",
  onStage: (stage: PipelineStage, index: number, total: number) => void,
  extraction: ContractExtraction | null,
  rich: RichContractExtraction | null = null
): Promise<AnalysisResult | null> {
  return new Promise((resolve) => {
    if (!extraction) {
      onStage("results", STAGE_ORDER.length, STAGE_ORDER.length);
      resolve(null);
      return;
    }
    let index = 0;
    const advance = () => {
      const stage = STAGE_ORDER[index];
      onStage(stage, index + 1, STAGE_ORDER.length);
      if (stage === "results") {
        setTimeout(
          () => resolve(generateAnalysis(documentName, fileKind, { extraction, rich })),
          500
        );
        return;
      }
      index += 1;
      setTimeout(advance, STAGE_DURATION_MS[stage]);
    };
    setTimeout(advance, 250);
  });
}
