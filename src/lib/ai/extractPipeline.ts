/* ------------------------------------------------------------------ */
/*  Contract Extraction Pipeline - staged, parallel, retryable.        */
/*                                                                     */
/*  Instead of sending the entire document to the LLM once, we:       */
/*  1. Extract text (pdf-parse / mammoth)                             */
/*  2. Preprocess: normalize whitespace, detect sections              */
/*  3. Run parallel LLM extraction tasks:                             */
/*     - Parties + identity (who signed, vendor vs customer)           */
/*     - Dates + renewal (start, end, renewal, cancellation, notice)   */
/*     - Pricing + financials (value, escalation, payment terms)       */
/*     - Risks + obligations (obligations, risks, savings)             */
/*  4. Validate + merge into the canonical rich extraction             */
/*  5. Return structured result                                        */
/*                                                                     */
/*  Each LLM task gets ONLY the relevant section of the document,     */
/*  reducing token usage and improving accuracy. Retry on failure.     */
/* ------------------------------------------------------------------ */

import type { RichContractExtraction } from "@/lib/types";
import { AIHttpError } from "./openai-compat";
import type { AIProvider } from "./provider";
import { normalizeRichExtraction as normalizeExtraction } from "./base";

const MAX_CHARS_PER_CHUNK = 15_000;

/**
 * Deadline budget for the whole pipeline (all four LLM tasks, including
 * retries and the cross-provider fallback). Kept under Vercel's PKG-wide
 * function-time limit so a hung provider fails with a clear reason instead
 * of the invocation silently being terminated mid-air.
 */
// Serverless functions commonly cap at 60s (hobby) / 300s (pro). We budget
// conservatively for the hosted case, but a local `ollama serve` on modest
// hardware is far slower (a real contract across four parallel tasks can
// take minutes), so a slow-but-working local model must not be killed by a
// default tuned for fast hosted latency.
function pipelineDeadlineMs(provider: AIProvider): number {
  const configured = Number(process.env.EXTRACT_PIPELINE_DEADLINE_MS ?? NaN);
  if (Number.isFinite(configured) && configured > 0) return configured;
  // Local models run on shared CPU/GPU and are far slower than hosted ones,
  // but the deadline still bounds the worst case so a review never silently
  // runs for many minutes. 75s suits hosted providers with 45s per-call
  // timeouts and one retry round; local gets a longer (but still bounded)
  // budget.
  if (provider.id === "ollama_local") return 180_000;
  return 75_000;
}

/* ----------------------------- helpers ----------------------------- */

/** Extract a chunk of text around relevant keywords. */
function extractChunk(text: string, keywords: string[], before: number = 2000, after: number = 3000): string {
  const lowerText = text.toLowerCase();
  const positions: { start: number; end: number }[] = [];
  for (const kw of keywords) {
    const idx = lowerText.indexOf(kw.toLowerCase());
    if (idx !== -1) {
      positions.push({
        start: Math.max(0, idx - before),
        end: Math.min(text.length, idx + kw.length + after),
      });
    }
  }
  if (positions.length === 0) return text.slice(0, MAX_CHARS_PER_CHUNK);

  // Merge overlapping ranges
  positions.sort((a, b) => a.start - b.start);
  const merged: { start: number; end: number }[] = [positions[0]];
  for (let i = 1; i < positions.length; i++) {
    const last = merged[merged.length - 1];
    if (positions[i].start <= last.end + 200) {
      last.end = Math.max(last.end, positions[i].end);
    } else {
      merged.push({ ...positions[i] });
    }
  }

  // Return combined chunks (up to limit)
  let result = "";
  for (const range of merged) {
    const chunk = text.slice(range.start, range.end);
    if (result.length + chunk.length > MAX_CHARS_PER_CHUNK) break;
    result += (result ? "\n...\n" : "") + chunk;
  }
  return result || text.slice(0, MAX_CHARS_PER_CHUNK);
}

/** Retry an async operation with exponential backoff. */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (AIHttpError.is(err) && !err.retryable) {
        // A hard provider rejection (auth, unknown model, quota, bad request)
        // won't succeed on retry - surface the real cause immediately instead
        // of silently retrying the same doomed request.
        throw err;
      }
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, delayMs * Math.pow(2, attempt - 1)));
      }
    }
  }
  throw lastError ?? new Error("Retry failed");
}

/* ----------------------------- schemas ----------------------------- */

const PARTIES_SCHEMA = {
  type: "object",
  properties: {
    vendor_name: { type: "string" },
    customer_name: { type: "string" },
    contract_type: { type: "string" },
  },
  required: ["vendor_name"],
};

const DATES_SCHEMA = {
  type: "object",
  properties: {
    contract_start_date: { type: "string", description: "ISO YYYY-MM-DD" },
    contract_end_date: { type: "string", description: "ISO YYYY-MM-DD" },
    renewal_date: { type: "string", description: "ISO YYYY-MM-DD" },
    cancellation_deadline: { type: "string", description: "ISO YYYY-MM-DD" },
    notice_period_days: { type: "integer" },
    auto_renewal: { type: "boolean" },
    renewal_term_months: { type: "integer" },
  },
};

const PRICING_SCHEMA = {
  type: "object",
  properties: {
    contract_value: { type: "number" },
    currency: { type: "string" },
    billing_frequency: { type: "string" },
    price_escalation: { type: "boolean" },
    price_escalation_percentage: { type: "number" },
    payment_terms: { type: "string" },
    termination_terms: { type: "string" },
  },
};

const RISKS_SCHEMA = {
  type: "object",
  properties: {
    obligations: {
      type: "array",
      items: { type: "object", properties: { term: { type: "string" }, section: { type: "string" } }, required: ["term"] },
    },
    risks: {
      type: "array",
      items: { type: "object", properties: { description: { type: "string" }, severity: { type: "string", enum: ["low", "medium", "high", "critical"] }, evidence: { type: "string" } }, required: ["description", "severity"] },
    },
    savings_opportunities: {
      type: "array",
      items: { type: "object", properties: { type: { type: "string" }, estimate_low: { type: "number" }, estimate_high: { type: "number" }, basis: { type: "string" }, confirmed: { type: "boolean" } }, required: ["type"] },
    },
    confidence_score: { type: "number" },
  },
};

/* ----------------------------- prompts ----------------------------- */

const PARTIES_PROMPT = `Extract the parties (vendor/supplier vs customer/buyer) and contract type from this contract text.

Rules:
- vendor_name = the company supplying the service/product
- customer_name = the company paying for it
- contract_type = type of agreement (e.g. "Master Subscription Agreement", "Service Agreement", "SaaS License")

Return ONLY valid JSON matching the schema.`;

const DATES_PROMPT = `Extract all dates, renewal terms, and cancellation information from this contract text.

Rules:
- contract_start_date = when the contract begins (ISO YYYY-MM-DD)
- contract_end_date = when the contract ends (ISO YYYY-MM-DD)
- renewal_date = next renewal or end date
- cancellation_deadline = latest date to give notice to avoid auto-renewal (end date minus notice period)
- notice_period_days = days of advance notice required to cancel
- auto_renewal = true ONLY if the contract explicitly says it auto-renews
- renewal_term_months = length of each renewal term in months

Return ONLY valid JSON matching the schema. Use null for unknown fields.`;

const PRICING_PROMPT = `Extract pricing, financial terms, and escalation information from this contract text.

Rules:
- contract_value = total contract value in the stated currency
- currency = ISO currency code (e.g. "USD", "CAD")
- billing_frequency = "annual", "monthly", "quarterly", etc.
- price_escalation = true if the contract allows price increases
- price_escalation_percentage = the annual escalation rate (e.g. 4.5)
- payment_terms = payment schedule (e.g. "Net 30", "Annual upfront")
- termination_terms = termination conditions

Return ONLY valid JSON matching the schema. Use null for unknown fields.`;

const RISKS_PROMPT = `Analyze this contract text for obligations, risks, and savings opportunities.

Rules:
- obligations = key things each party must do
- risks = clauses that could cost money, lock in, or create liability
- savings_opportunities = potential areas to negotiate better terms
- confidence_score = 0-1 how confident you are in the extraction

For each risk, assign severity: low / medium / high / critical.
For savings, give low and high annualized USD estimates.

Return ONLY valid JSON matching the schema. Use empty arrays for unknown fields.`;

/* ----------------------------- pipeline ----------------------------- */

export interface ExtractionPipelineResult {
  extraction: RichContractExtraction;
  /** Errors from LLM tasks that failed after retries (empty when healthy). */
  taskErrors: string[];
  timings: {
    textExtractionMs: number;
    partiesMs: number;
    datesMs: number;
    pricingMs: number;
    risksMs: number;
    mergeMs: number;
    totalMs: number;
    llmCalls: number;
    tokensEstimate: number;
  };
}

/**
 * Run the staged extraction pipeline.
 * Each LLM task runs in parallel with its own focused document chunk.
 */
export async function runExtractionPipeline(
  provider: AIProvider,
  text: string,
  filename: string,
  onStage?: (stage: string, progress: number) => void
): Promise<ExtractionPipelineResult> {
  const start = Date.now();
  let llmCalls = 0;
  let tokensEstimate = 0;

  onStage?.("preprocessing", 0);

  // Step 1: Normalize text
  const normalized = text
    .replace(/\r\n/g, "\n")
    .replace(/\t/g, " ")
    .replace(/ {3,}/g, "  ")
    .trim();

  // Step 2: Create focused chunks for each extraction task
  const partiesChunk = extractChunk(normalized, [
    "parties", "agreement between", "supplier", "customer",
    "licensor", "licensee", "subscriber", "subscription", "provider",
    "master subscription", "master service", "master agreement",
  ], 3000, 3000);

  const datesChunk = extractChunk(normalized, [
    "renewal", "renewals", "termination", "terminate", "expiration", "expires",
    "cancellation", "cancel", "notice period", "auto-renew",
    "effective date", "commencement", "term", "duration",
  ], 3000, 4000);

  const pricingChunk = extractChunk(normalized, [
    "price", "pricing", "fees", "fee", "payment", "invoice",
    "annual", "annually", "monthly", "quarterly", "escalation",
    "rate", "cost", "amount", "subscription", "budget",
  ], 3000, 4000);

  const risksChunk = extractChunk(normalized, [
    "risk", "liability", "indemnification", "warranty", "guarantee",
    "penalty", "breach", "confidential", "data protection",
    "compliance", "obligation", "shall", "must",
    "termination", "savings", "negotiation", "discount",
  ], 3000, 4000);

  const deadlineAt = Date.now() + pipelineDeadlineMs(provider);
  const tasks = [
    { name: "parties", chunk: partiesChunk, system: PARTIES_PROMPT, schema: PARTIES_SCHEMA },
    { name: "dates", chunk: datesChunk, system: DATES_PROMPT, schema: DATES_SCHEMA },
    { name: "pricing", chunk: pricingChunk, system: PRICING_PROMPT, schema: PRICING_SCHEMA },
    { name: "risks", chunk: risksChunk, system: RISKS_PROMPT, schema: RISKS_SCHEMA },
  ];

  const results: Record<string, unknown> = {};
  const taskErrors: string[] = [];

  // Run tasks in parallel (4 concurrent LLM calls)
  onStage?.("analyzing", 10);

  const taskPromises = tasks.map(async (task) => {
    try {
      const result = await withRetry(async () => {
        // Enforce the global deadline on the whole pipeline, not just per call:
        // a single hung attempt should not blow through the serverless budget.
        if (Date.now() > deadlineAt) {
          throw new Error("Analysis exceeded the time limit.");
        }
        return provider.structured<unknown>({
          system: task.system,
          prompt: `Analyze this contract section:\n\n--- CONTRACT TEXT ---\n${task.chunk}\n\n--- END ---`,
          schema: task.schema,
          temperature: 0.1,
        });
      }, 2, 2000);
      llmCalls++;
      tokensEstimate += Math.ceil(task.chunk.length / 4); // rough token estimate
      return { name: task.name, result };
    } catch (err) {
      // Return partial results instead of failing entirely, but record the
      // error so callers can tell a degraded extraction from an unreachable
      // model.
      const message = err instanceof Error ? err.message : "failed";
      taskErrors.push(`${task.name}: ${message}`);
      return { name: task.name, result: {}, error: message };
    }
  });

  const completedTasks = await Promise.all(taskPromises);

  for (const task of completedTasks) {
    results[task.name] = task.result;
    onStage?.(`analyzing:${task.name}`, 10 + Math.round((completedTasks.indexOf(task) / completedTasks.length) * 60));
  }

  onStage?.("validating", 70);

  // Step 4: Merge results into canonical extraction
  const parties = (results.parties ?? {}) as Record<string, unknown>;
  const dates = (results.dates ?? {}) as Record<string, unknown>;
  const pricing = (results.pricing ?? {}) as Record<string, unknown>;
  const risks = (results.risks ?? {}) as Record<string, unknown>;

  const merged: Record<string, unknown> = {
    vendor_name: parties.vendor_name ?? null,
    customer_name: parties.customer_name ?? null,
    contract_start_date: dates.contract_start_date ?? null,
    contract_end_date: dates.contract_end_date ?? null,
    auto_renewal: dates.auto_renewal ?? null,
    renewal_term_months: dates.renewal_term_months ?? null,
    notice_period_days: dates.notice_period_days ?? null,
    cancellation_deadline: dates.cancellation_deadline ?? null,
    contract_value: pricing.contract_value ?? null,
    currency: pricing.currency ?? "USD",
    billing_frequency: pricing.billing_frequency ?? null,
    price_escalation: pricing.price_escalation ?? null,
    price_escalation_percentage: pricing.price_escalation_percentage ?? null,
    termination_terms: pricing.termination_terms ?? null,
    payment_terms: pricing.payment_terms ?? null,
    obligations: risks.obligations ?? [],
    risks: risks.risks ?? [],
    savings_opportunities: risks.savings_opportunities ?? [],
    confidence_score: risks.confidence_score ?? null,
  };

  onStage?.("persisting", 85);

  // Step 5: Normalize into the canonical shape
  const extraction = normalizeExtraction(merged);

  const mergeMs = Date.now() - start;

  return {
    extraction,
    taskErrors,
    timings: {
      textExtractionMs: 0, // caller measures this
      partiesMs: 0, // individual timings not tracked in parallel
      datesMs: 0,
      pricingMs: 0,
      risksMs: 0,
      mergeMs,
      totalMs: Date.now() - start,
      llmCalls,
      tokensEstimate,
    },
  };
}
