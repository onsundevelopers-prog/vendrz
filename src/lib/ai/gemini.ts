/**
 * Server-only Gemini client for contract & invoice text extraction.
 *
 * Never import this from a client component — it reads GOOGLE_API_KEY from the
 * environment and calls the Generative Language API directly.
 *
 * Feed it plain text (extracted from PDF/DOCX by the upload flow). It returns
 * structured JSON matching `ContractExtraction`, so downstream code (risk
 * scoring, renewal dates, escalation flags) stays deterministic and auditable.
 */

// Flash-Lite tier: the cheapest Gemini model with reliable JSON output. The
// -latest alias always points at the current Flash-Lite release.
const MODEL = "gemini-flash-lite-latest";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

import type { ContractExtraction } from "@/lib/types";

export type { ContractExtraction };

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    vendorName: { type: "STRING" },
    parties: { type: "ARRAY", items: { type: "STRING" } },
    contractType: { type: "STRING" },
    effectiveDate: { type: "STRING", description: "ISO date YYYY-MM-DD when stated" },
    renewalDate: {
      type: "STRING",
      description: "Next renewal or end date as ISO YYYY-MM-DD if determinable",
    },
    autoRenews: { type: "BOOLEAN" },
    autoRenewalNoticeDays: {
      type: "INTEGER",
      description: "Days of advance notice required to cancel, if stated",
    },
    terminationNoticeDays: { type: "INTEGER" },
    priceEscalationRate: {
      type: "NUMBER",
      description: "Annual price escalation percentage if stated, e.g. 4.5",
    },
    annualSpend: { type: "NUMBER", description: "Annualized fee in USD if stated" },
    paymentTerms: { type: "STRING" },
    keyClauses: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "Short quotes of the most important clauses",
    },
    riskFlags: {
      type: "ARRAY",
      items: { type: "STRING" },
      description:
        "Anything risky: auto-renew traps, long lock-in, unilateral price changes, missing cancel terms",
    },
    missingInformation: { type: "ARRAY", items: { type: "STRING" } },
    summary: { type: "STRING" },
  },
  required: [
    "vendorName",
    "parties",
    "keyClauses",
    "riskFlags",
    "missingInformation",
    "summary",
  ],
};

const SYSTEM_PROMPT = `You are a meticulous contract analyst for Vendor Watchtower, a spend-management product.

Extract structured data from the contract text that follows. Rules:
- Only fill a field when the text actually supports it; otherwise use null or leave arrays empty.
- renewalDate is the NEXT renewal or end date if it can be determined (e.g. "renews annually on January 15" -> next occurrence of January 15).
- autoRenews is true only if the contract explicitly says it auto-renews or rolls over.
- Quote clauses near-verbatim in keyClauses; keep them short.
- Put anything that could cost the customer money or lock them in (auto-renewal, long minimum terms, unilateral price increases, short or missing cancellation windows) in riskFlags.
- Return JSON only, matching the requested schema.`;

async function generate(parts: Record<string, unknown>[]): Promise<ContractExtraction> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_API_KEY is not set — add it to .env.local");
  }

  const res = await fetch(`${API_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${body.slice(0, 400)}`);
  }

  const data = await res.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) {
    throw new Error("Gemini returned no content");
  }

  const parsed: unknown = typeof raw === "string" ? JSON.parse(raw) : raw;
  return normalize(parsed);
}

/** Extract from raw contract text (already pulled out of a document). */
export async function extractContract(text: string): Promise<ContractExtraction> {
  return generate([{ text: `${SYSTEM_PROMPT}\n\n--- CONTRACT TEXT ---\n${text}` }]);
}

/**
 * Extract directly from a document (PDFs are read natively by Gemini — no
 * separate text-extraction step needed).
 */
export async function extractContractFromFile(params: {
  mimeType: string;
  base64Data: string;
  filename?: string;
}): Promise<ContractExtraction> {
  return generate([
    { text: `${SYSTEM_PROMPT}\n\nAnalyze the attached contract document and return JSON only.` },
    { inlineData: { mimeType: params.mimeType, data: params.base64Data } },
  ]);
}

function normalize(input: unknown): ContractExtraction {
  const r = (input ?? {}) as Record<string, unknown>;
  const str = (v: unknown): string | null =>
    typeof v === "string" && v.trim() ? v.trim() : null;
  const num = (v: unknown): number | null =>
    typeof v === "number" && Number.isFinite(v)
      ? v
      : typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))
        ? Number(v)
        : null;
  const bool = (v: unknown): boolean | null => (typeof v === "boolean" ? v : null);
  const list = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

  return {
    vendorName: str(r.vendorName) ?? "Unknown vendor",
    parties: list(r.parties),
    contractType: str(r.contractType),
    effectiveDate: str(r.effectiveDate),
    renewalDate: str(r.renewalDate),
    autoRenews: bool(r.autoRenews),
    autoRenewalNoticeDays: num(r.autoRenewalNoticeDays),
    terminationNoticeDays: num(r.terminationNoticeDays),
    priceEscalationRate: num(r.priceEscalationRate),
    annualSpend: num(r.annualSpend),
    paymentTerms: str(r.paymentTerms),
    keyClauses: list(r.keyClauses),
    riskFlags: list(r.riskFlags),
    missingInformation: list(r.missingInformation),
    summary: str(r.summary) ?? "",
  };
}
