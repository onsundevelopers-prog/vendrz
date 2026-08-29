/* ------------------------------------------------------------------ */
/*  BaseAIProvider.                                                    */
/*                                                                     */
/*  Concrete providers implement only the transport (`complete`).      */
/*  Everything else - chat, structured JSON, tool loops, contract      */
/*  analysis, email drafting, data reasoning - lives here once and is  */
/*  shared by every provider, so switching AI_PROVIDER changes only    */
/*  the wire, never the behavior.                                      */
/* ------------------------------------------------------------------ */

import type {
  ContractExtraction,
  ContractRisk,
  RichContractExtraction,
} from "@/lib/types";
import { formatSchema, parseJsonObject } from "./openai-compat";
import type {
  AIMessage,
  AIProvider,
  ChatOptions,
  ContractAnalysisInput,
  DataReasoningOptions,
  EmailDraft,
  EmailDraftRequest,
  JsonSchema,
  StructuredOptions,
  ToolCall,
  ToolCallOptions,
  ToolCallResult,
} from "./provider";
import type { CompleteParams, CompleteResult } from "./openai-compat";

const MAX_CONTRACT_CHARS = 60_000;

/* ------------------------------ prompts ------------------------------ */

const CONTRACT_ANALYSIS_SYSTEM = `You are a meticulous contract analyst for Noma, a spend-management product.

Extract structured data from the contract text. Rules:
- Only fill a field when the text actually supports it; otherwise use null or leave arrays empty.
- vendor_name and customer_name distinguish the two parties: the vendor supplies the service; the customer pays for it.
- cancellation_deadline should be the latest date to give notice and avoid auto-renewal (end/next-renewal date minus the notice period). If it cannot be derived, leave it null.
- auto_renewal is true only if the contract explicitly says it auto-renews or rolls over.
- price_escalation_percentage (e.g. 4.5) only when price_escalation is true.
- Quote obligations and termination/payment terms from the text; keep them short.
- Put anything that could cost the customer money or lock them in (auto-renewal, long minimum terms, unilateral price increases, short or missing cancellation windows) into risks, with a severity and a short evidence quote.
- For each savings opportunity, give a low and high annualized estimate in USD and a one-line ` + "basis" + ` explaining how it was derived; set confirmed to true only when the figure is directly calculable from the document.
- Return ONLY valid JSON matching the schema. No markdown fences, no commentary.`;

const EMAIL_DRAFT_SYSTEM = `You are a procurement assistant for Noma.

Draft a professional vendor email using ONLY the contract facts provided in the request. Rules:
- Never invent prices, dates, clauses, or contact details that are not in the provided context.
- Keep it concise, professional, and action-oriented.
- The draft is prepared for human review and approval - it is never sent automatically.
- Return ONLY valid JSON matching the schema: { subject, body, to }. No markdown fences.`;

const DATA_REASONING_SYSTEM = `You are a procurement analyst for Noma.

Answer the question using ONLY the structured data provided. Rules:
- Treat the data as ground truth. Never invent companies, contracts, prices, dates, or risks that are not present.
- If the data does not contain enough information to answer, say so explicitly in your answer.
- Distinguish what is a FACT (directly in the data) from an ESTIMATE (a calculated approximation) and a RECOMMENDATION (a suggested next step).
- Return ONLY valid JSON matching the schema. No markdown fences, no commentary.`;

/* ------------------------------ schemas ------------------------------ */

const RICH_EXTRACTION_REQUIRED = [
  "vendor_name",
  "customer_name",
];

/** Canonical, fully-detailed extraction schema (the "one now"). */
export const RICH_CONTRACT_EXTRACTION_SCHEMA: JsonSchema = {
  type: "object",
  properties: {
    vendor_name: { type: "string" },
    customer_name: { type: "string" },
    contract_start_date: { type: "string", description: "ISO YYYY-MM-DD when stated" },
    contract_end_date: { type: "string", description: "ISO YYYY-MM-DD when stated" },
    auto_renewal: { type: "boolean" },
    renewal_term_months: { type: "integer", description: "Term length in months for each renewal, when stated" },
    notice_period_days: { type: "integer", description: "Days of advance written notice required to cancel, when stated" },
    cancellation_deadline: { type: "string", description: "ISO YYYY-MM-DD - end/renewal date minus the notice period, when determinable" },
    contract_value: { type: "number", description: "Contract value in the stated currency, when stated" },
    currency: { type: "string", description: "e.g. USD", "default": "USD" },
    billing_frequency: { type: "string", description: "e.g. annual, monthly, quarterly" },
    price_escalation: { type: "boolean" },
    price_escalation_percentage: { type: "number", description: "Annual escalation % e.g. 4.5, only when price_escalation is true" },
    termination_terms: { type: "string" },
    payment_terms: { type: "string" },
    obligations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          term: { type: "string" },
          section: { type: "string" },
        },
        required: ["term"],
      },
    },
    risks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          description: { type: "string" },
          severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
          evidence: { type: "string" },
        },
        required: ["description", "severity"],
      },
    },
    savings_opportunities: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: { type: "string" },
          estimate_low: { type: "number" },
          estimate_high: { type: "number" },
          basis: { type: "string" },
          confirmed: { type: "boolean" },
        },
        required: ["type"],
      },
    },
    confidence_score: { type: "number", description: "0-1 overall confidence in the extraction" },
  },
  required: RICH_EXTRACTION_REQUIRED,
};

const EMAIL_DRAFT_SCHEMA: JsonSchema = {
  type: "object",
  properties: {
    subject: { type: "string" },
    body: { type: "string" },
    to: { type: "string" },
  },
  required: ["subject", "body"],
};

/* --------------------------- normalization --------------------------- */

/** ---------- normalization of the canonical rich shape ---------- */

type Severity = ContractRisk["severity"];

function strOrNull(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

/**
 * Coerce a model-provided date into a strict YYYY-MM-DD string.
 * Accepts plain dates and full ISO datetimes (models frequently return
 * "2026-12-31T00:00:00.000Z"); anything unparseable becomes null so a
 * malformed value can never break downstream date math.
 */
function dateOrNull(v: unknown): string | null {
  const s = strOrNull(v);
  if (!s) return null;
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s].*)?$/);
  if (m) {
    const month = Number(m[2]);
    const day = Number(m[3]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${m[1].padStart(4, "0")}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
    }
    return null;
  }
  const t = new Date(s).getTime();
  return Number.isNaN(t) ? null : new Date(t).toISOString().slice(0, 10);
}

function numOrNull(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v)
    ? v
    : typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))
      ? Number(v)
      : null;
}
function boolOrNull(v: unknown): boolean | null {
  return typeof v === "boolean" ? v : null;
}
function arr<T>(v: unknown, map: (x: unknown) => T | null): T[] {
  if (!Array.isArray(v)) return [];
  const out: T[] = [];
  for (const item of v) {
    const mapped = map(item);
    if (mapped !== null) out.push(mapped);
  }
  return out;
}

const toSeverity = (v: unknown): Severity | null => {
  if (typeof v !== "string") return null;
  const s = v.toLowerCase() as Severity;
  return ["low", "medium", "high", "critical"].includes(s) ? s : null;
};

/** Coerce loose model output into the typed rich shape. */
export function normalizeRichExtraction(input: unknown): RichContractExtraction {
  const r = (input ?? {}) as Record<string, unknown>;
  return {
    vendor_name: strOrNull(r.vendor_name) ?? "Unknown vendor",
    customer_name: strOrNull(r.customer_name) ?? "",
    contract_start_date: dateOrNull(r.contract_start_date),
    contract_end_date: dateOrNull(r.contract_end_date),
    auto_renewal: boolOrNull(r.auto_renewal),
    renewal_term_months: numOrNull(r.renewal_term_months)
      ? Math.round(numOrNull(r.renewal_term_months)!)
      : null,
    notice_period_days: numOrNull(r.notice_period_days)
      ? Math.round(numOrNull(r.notice_period_days)!)
      : null,
    cancellation_deadline: dateOrNull(r.cancellation_deadline),
    contract_value: numOrNull(r.contract_value),
    currency: strOrNull(r.currency) ?? "USD",
    billing_frequency: strOrNull(r.billing_frequency),
    price_escalation: boolOrNull(r.price_escalation),
    price_escalation_percentage: numOrNull(r.price_escalation_percentage),
    termination_terms: strOrNull(r.termination_terms),
    payment_terms: strOrNull(r.payment_terms),
    obligations: arr(r.obligations, (o) => {
      const obj = (o ?? {}) as Record<string, unknown>;
      const term = strOrNull(obj.term);
      return term ? { term, section: strOrNull(obj.section) } : null;
    }),
    risks: arr(r.risks, (x) => {
      const obj = (x ?? {}) as Record<string, unknown>;
      const description = strOrNull(obj.description);
      const severity = toSeverity(obj.severity);
      return description && severity
        ? { description, severity, evidence: strOrNull(obj.evidence) }
        : null;
    }),
    savings_opportunities: arr(r.savings_opportunities, (x) => {
      const obj = (x ?? {}) as Record<string, unknown>;
      const type = strOrNull(obj.type);
      if (!type) return null;
      return {
        type,
        estimate_low: numOrNull(obj.estimate_low),
        estimate_high: numOrNull(obj.estimate_high),
        basis: strOrNull(obj.basis),
        confirmed: obj.confirmed === true,
      };
    }),
    confidence_score: numOrNull(r.confidence_score),
  };
}

/** ---------- mapping rich -> legacy ContractExtraction ---------- */

/**
 * Map the canonical rich extraction down to the legacy ContractExtraction
 * that the existing pipeline & store consume. This keeps every downstream
 * consumer unchanged while still storing the rich schema alongside.
 */
export function richToExtraction(rich: RichContractExtraction): ContractExtraction {
  // Worse-case renewal date: end date, or end + renewal term if auto-renewing.
  // Dates are normalized to YYYY-MM-DD upstream, but guard anyway so a bad
  // value can never throw and fail the whole extraction.
  const end = rich.contract_end_date ? rich.contract_end_date + "T00:00:00" : null;
  let renewalDate: string | null = rich.contract_end_date;
  if (rich.auto_renewal && rich.renewal_term_months && end) {
    const d = new Date(end);
    if (!Number.isNaN(d.getTime())) {
      d.setMonth(d.getMonth() + rich.renewal_term_months);
      renewalDate = d.toISOString().slice(0, 10);
    }
  }

  return {
    vendorName: rich.vendor_name,
    parties: [rich.vendor_name, rich.customer_name].filter(Boolean),
    contractType: rich.billing_frequency ? `${rich.billing_frequency} subscription` : null,
    effectiveDate: rich.contract_start_date,
    renewalDate,
    autoRenews: rich.auto_renewal,
    autoRenewalNoticeDays: rich.notice_period_days,
    terminationNoticeDays: rich.notice_period_days,
    priceEscalationRate:
      rich.price_escalation === true ? rich.price_escalation_percentage : null,
    annualSpend:
      rich.contract_value != null && (rich.currency ?? "USD").toUpperCase() === "USD"
        ? rich.contract_value
        : null,
    paymentTerms: rich.payment_terms,
    keyClauses: rich.obligations.map((o) => o.term),
    riskFlags: rich.risks.map((r) => r.description),
    missingInformation: [],
    summary: [
      `${rich.obligations.length} obligation${rich.obligations.length === 1 ? "" : "s"}`,
      `${rich.risks.length} risk${rich.risks.length === 1 ? "" : "s"}`,
      `${rich.savings_opportunities.length} savings opportunit${rich.savings_opportunities.length === 1 ? "y" : "ies"}`,
    ].join(" · "),
  };
}


/* ------------------------------ base class ------------------------------ */

export abstract class BaseAIProvider implements AIProvider {
  abstract readonly id: AIProvider["id"];
  abstract readonly model: string;

  /** The only method a provider must implement: talk to the model. */
  protected abstract complete(params: CompleteParams): Promise<CompleteResult>;

  /* ------------------------------ transport ------------------------------ */

  async chat(messages: AIMessage[], opts: ChatOptions = {}): Promise<string> {
    const res = await this.complete({
      messages,
      temperature: opts.temperature,
      maxTokens: opts.maxTokens,
    });
    return res.content ?? "";
  }

  async structured<T>(opts: StructuredOptions): Promise<T> {
    const system = [
      opts.system,
      "Return ONLY valid JSON matching this schema:",
      formatSchema(opts.schema),
      "Do not include markdown fences, commentary, or trailing text.",
    ]
      .filter(Boolean)
      .join("\n\n");

    const res = await this.complete({
      messages: [
        { role: "system", content: system },
        { role: "user", content: opts.prompt },
      ],
      temperature: opts.temperature ?? 0.1,
      jsonMode: true,
    });
    return parseJsonObject<T>(res.content ?? "");
  }

  async tools(opts: ToolCallOptions): Promise<ToolCallResult> {
    const res = await this.complete({
      messages: [
        { role: "system", content: opts.system ?? "You are a helpful assistant." },
        { role: "user", content: opts.prompt },
      ],
      tools: opts.tools,
      toolChoice: "auto",
    });
    return { content: res.content ?? "", toolCalls: res.toolCalls };
  }

  async runToolLoop(
    opts: ToolCallOptions & { maxRounds?: number },
    executor: (call: ToolCall) => Promise<string>
  ): Promise<{ content: string; calls: ToolCall[] }> {
    const messages: AIMessage[] = [
      { role: "system", content: opts.system ?? "You are a helpful assistant." },
      { role: "user", content: opts.prompt },
    ];
    const calls: ToolCall[] = [];
    const maxRounds = opts.maxRounds ?? 3;

    for (let round = 0; round < maxRounds; round++) {
      const res = await this.complete({
        messages,
        tools: opts.tools,
        toolChoice: "auto",
      });
      const content = res.content ?? "";
      if (res.toolCalls.length === 0) return { content, calls };

      messages.push({ role: "assistant", content, toolCalls: res.toolCalls });
      for (const call of res.toolCalls) {
        calls.push(call);
        const result = await executor(call);
        messages.push({ role: "tool", content: result, toolCallId: call.id });
      }
    }
    return { content: "Tool execution reached the round limit.", calls };
  }

  /* ------------------------------ domain ------------------------------ */

  async analyzeContract(input: ContractAnalysisInput): Promise<ContractExtraction> {
    const rich = await this.analyzeContractRich(input);
    return richToExtraction(rich);
  }

  /** Canonical, fully-detailed extraction. Stored alongside the analysis. */
  async analyzeContractRich(input: ContractAnalysisInput): Promise<RichContractExtraction> {
    const raw = await this.structured<unknown>({
      system: CONTRACT_ANALYSIS_SYSTEM,
      prompt:
        `Analyze the attached contract text${input.filename ? ` ("${input.filename}")` : ""} ` +
        `and extract structured data.\n\n--- CONTRACT TEXT ---\n${input.text.slice(0, MAX_CONTRACT_CHARS)}`,
      schema: RICH_CONTRACT_EXTRACTION_SCHEMA,
      temperature: 0.1,
    });
    return normalizeRichExtraction(raw);
  }

  async draftEmail(req: EmailDraftRequest): Promise<EmailDraft> {
    const purposeLine =
      req.purpose === "negotiation"
        ? "a renewal/pricing negotiation"
        : req.purpose === "cancellation"
          ? "a cancellation notice"
          : req.purpose === "clarification"
            ? "a clarification request"
            : "a follow-up";
    const raw = await this.structured<EmailDraft>({
      system: EMAIL_DRAFT_SYSTEM,
      prompt:
        `Draft ${purposeLine} email to ${req.vendorName}.` +
        (req.senderName ? `\nSender: ${req.senderName}` : "") +
        (req.senderEmail ? `\nSender email: ${req.senderEmail}` : "") +
        `\n\nContract context (use ONLY these facts):\n${req.contractContext}\n\n` +
        `Return { subject, body, to } where "to" is the vendor contact address if determinable from context, otherwise null.`,
      schema: EMAIL_DRAFT_SCHEMA,
      temperature: 0.4,
    });
    return {
      subject: raw.subject ?? "",
      body: raw.body ?? "",
      to: raw.to ?? undefined,
    };
  }

  async reasonOverData<T>(opts: DataReasoningOptions): Promise<T> {
    const raw = await this.structured<T>({
      system: DATA_REASONING_SYSTEM + (opts.instructions ? `\n\n${opts.instructions}` : ""),
      prompt:
        `Question: ${opts.question}\n\n` +
        `Structured data:\n${JSON.stringify(opts.data, null, 2).slice(0, MAX_CONTRACT_CHARS)}`,
      schema: opts.schema,
      temperature: 0.1,
    });
    return raw;
  }
}
