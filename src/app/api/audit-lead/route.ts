import { NextRequest, NextResponse } from "next/server";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import {
  isValidLeadEmail,
  markLeadEmailed,
  saveAuditLead,
  sendAuditLeadEmail,
  type AuditLeadSummary,
} from "@/lib/auditLeads";

export const runtime = "nodejs";

/**
 * POST /api/audit-lead
 *
 * Captures an email + a compact summary from the no-signup free review so
 * the founder can nurture the lead later. Anonymous visitors can run a
 * review without an account - this is the one moment they volunteer a
 * contact, so the endpoint is public but rate-limited per IP.
 *
 * Body:  { email, sessionId?, documentName?, summary? }
 *        `summary` is a whitelisted subset (see AuditLeadSummary) - every
 *        other field is dropped server-side.
 *
 * Returns:
 *   200 { ok, sent }          - lead stored (and emailed if RESEND_API_KEY
 *                               is configured; `sent` says which).
 *   400 { error }             - invalid email.
 *   429 { error }             - too many captures from this IP.
 *   501 { error, code }       - Supabase isn't configured.
 *   503 { error, code }       - the audit_leads table doesn't exist yet
 *                               (run the CREATE TABLE in Supabase - see
 *                               src/lib/auditLeads.ts header) or storage
 *                               failed.
 */

const STR = (v: unknown, max: number): string | null =>
  typeof v === "string" && v.trim().length > 0 ? v.trim().slice(0, max) : null;

/** Coerce the untrusted body into the whitelisted summary shape. */
function parseSummary(raw: unknown): AuditLeadSummary | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const out: AuditLeadSummary = {};
  if (typeof o.vendorName === "string") out.vendorName = o.vendorName.trim().slice(0, 200);
  if (typeof o.riskLabel === "string") out.riskLabel = o.riskLabel.trim().slice(0, 200);
  if (typeof o.renewalDate === "string") out.renewalDate = o.renewalDate.trim().slice(0, 20);
  if (typeof o.riskScore === "number" && Number.isFinite(o.riskScore)) out.riskScore = o.riskScore;
  if (typeof o.savingsLow === "number" && Number.isFinite(o.savingsLow)) out.savingsLow = o.savingsLow;
  if (typeof o.savingsHigh === "number" && Number.isFinite(o.savingsHigh)) out.savingsHigh = o.savingsHigh;
  if (typeof o.findings === "number" && Number.isFinite(o.findings)) out.findings = o.findings;
  const hasAny = [
    "vendorName",
    "riskLabel",
    "renewalDate",
    "riskScore",
    "savingsLow",
    "savingsHigh",
    "findings",
  ].some((k) => out[k as keyof AuditLeadSummary] != null);
  return hasAny ? out : undefined;
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const limited = rateLimit(`lead:${ip}`);
  if (!limited.ok) {
    return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const b = (body ?? {}) as Record<string, unknown>;

  const email = typeof b.email === "string" ? b.email.trim() : "";
  if (!isValidLeadEmail(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const sessionId = STR(b.sessionId, 64);
  const documentName = STR(b.documentName, 300);
  const summary = parseSummary(b.summary);

  const saved = await saveAuditLead({
    email,
    sessionId: sessionId ?? undefined,
    documentName: documentName ?? undefined,
    summary,
  });
  if (!saved.ok) {
    if (saved.code === "NOT_CONFIGURED") {
      return NextResponse.json(
        { error: "Lead capture isn't configured on this server.", code: saved.code },
        { status: 501 }
      );
    }
    if (saved.code === "TABLE_MISSING") {
      return NextResponse.json(
        {
          error: "Lead storage isn't set up yet.",
          code: saved.code,
        },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: "Couldn't save your email right now. Try again in a moment.", code: saved.code },
      { status: 503 }
    );
  }

  // Email delivery is best-effort and optional: without RESEND_API_KEY the
  // lead is stored only and `sent` is false so the UI never over-promises.
  let sent = false;
  if (email) {
    sent = await sendAuditLeadEmail(email, { documentName, summary });
    if (sent) await markLeadEmailed(email).catch(() => {});
  }

  return NextResponse.json({ ok: true, sent });
}
