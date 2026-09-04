/* ------------------------------------------------------------------ */
/*  audit_leads - server-side lead capture for the free review funnel. */
/*                                                                     */
/*  The no-signup audit is n4ma's acquisition wedge, but a review that */
/*  ends with no contact info is a dead end. This module stores the    */
/*  email + a compact summary of what the review found so the founder  */
/*  can nurture (findings digest, reactivation) later.                 */
/*                                                                     */
/*  Server-only: talks to Supabase with the service-role key.          */
/*                                                                     */
/*  Env:                                                               */
/*    SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY  - existing (see below) */
/*    RESEND_API_KEY - optional. When set, the lead email is actually  */
/*      delivered via Resend. Without it, leads are stored only and    */
/*      the route reports sent:false (the UI stays honest).            */
/*    RESEND_FROM    - optional. Defaults to Resend's onboarding       */
/*      address; verify a domain to send from your own address.        */
/*                                                                     */
/*  Table (run once in Supabase SQL editor - same pattern as the       */
/*  `documents` table documented in .env.example):                     */
/*    create table if not exists audit_leads (                         */
/*      id uuid primary key default gen_random_uuid(),                 */
/*      email text not null,                                           */
/*      session_id text,                                               */
/*      source text not null default 'audit',                          */
/*      document_name text,                                            */
/*      summary jsonb,                                                 */
/*      created_at timestamptz not null default now(),                 */
/*      updated_at timestamptz not null default now(),                 */
/*      last_sent_at timestamptz                                       */
/*    );                                                               */
/*    create unique index if not exists audit_leads_email_lower        */
/*      on audit_leads (lower(email));                                 */
/* ------------------------------------------------------------------ */

import { getSupabase, isSupabaseConfigured } from "./supabase";
import { SITE } from "./site";

/** Whitelisted fields the client may send; everything else is dropped. */
export interface AuditLeadSummary {
  vendorName?: string | null;
  riskScore?: number | null;
  riskLabel?: string | null;
  renewalDate?: string | null;
  savingsLow?: number | null;
  savingsHigh?: number | null;
  findings?: number | null;
}

export interface SaveAuditLeadInput {
  email: string;
  sessionId?: string;
  documentName?: string;
  summary?: AuditLeadSummary;
}

export type SaveAuditLeadResult =
  | { ok: true; stored: true; sent: boolean }
  | { ok: false; code: "NOT_CONFIGURED" | "TABLE_MISSING" | "STORAGE_ERROR" };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidLeadEmail(email: string): boolean {
  return email.length <= 254 && EMAIL_RE.test(email);
}

/** Keep free-text fields bounded so the row can never grow unbounded. */
function cap(v: string | null | undefined, max: number): string | null {
  if (!v) return null;
  const t = v.trim().slice(0, max);
  return t.length > 0 ? t : null;
}

function isMissingTableError(err: unknown): boolean {
  // PostgREST surfaces a missing relation with code 42P01 ("relation ... does
  // not exist"). Detect by code OR message so both REST and pool paths fail
  // gracefully with the same actionable result.
  const e = err as { code?: string; message?: string };
  return e?.code === "42P01" || /does not exist/i.test(e?.message ?? "");
}

/**
 * Store (or refresh) one lead. Dedupe by lower(email) - the same person
 * running a second audit updates their existing row instead of creating
 * duplicates, and the newest summary wins.
 */
export async function saveAuditLead(
  input: SaveAuditLeadInput
): Promise<SaveAuditLeadResult> {
  if (!isSupabaseConfigured()) return { ok: false, code: "NOT_CONFIGURED" };
  const email = input.email.trim().toLowerCase();

  const row = {
    email,
    session_id: cap(input.sessionId, 64),
    source: "audit",
    document_name: cap(input.documentName, 300),
    summary: input.summary ?? null,
    updated_at: new Date().toISOString(),
  };

  // Unique index is on lower(email); plain onConflict can't target it, so
  // insert first and update on the unique violation instead.
  try {
    const { error: insertError } = await getSupabase().from("audit_leads").insert(row);
    if (!insertError) return { ok: true, stored: true, sent: false };

    if (insertError.code === "23505") {
      const { error: updateError } = await getSupabase()
        .from("audit_leads")
        .update({ ...row, last_sent_at: null, updated_at: new Date().toISOString() })
        .eq("email", email);
      if (updateError) {
        console.error("[audit-lead] refresh failed:", updateError.message);
        return { ok: false, code: "STORAGE_ERROR" };
      }
      return { ok: true, stored: true, sent: false };
    }

    if (isMissingTableError(insertError)) return { ok: false, code: "TABLE_MISSING" };
    console.error("[audit-lead] insert failed:", insertError.message);
    return { ok: false, code: "STORAGE_ERROR" };
  } catch (err) {
    if (isMissingTableError(err)) return { ok: false, code: "TABLE_MISSING" };
    console.error("[audit-lead] unexpected error:", err);
    return { ok: false, code: "STORAGE_ERROR" };
  }
}

/* ------------------------------ email ------------------------------ */

export function isResendConfigured(): boolean {
  return !!process.env.RESEND_API_KEY?.trim();
}

/** Marks the row as emailed so we never double-send the same summary. */
export async function markLeadEmailed(email: string): Promise<void> {
  try {
    await getSupabase()
      .from("audit_leads")
      .update({ last_sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("email", email.trim().toLowerCase());
  } catch {
    /* best effort - the send already happened */
  }
}

const esc = (v: unknown): string =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const money = (v: number | null | undefined): string =>
  v == null ? "—" : `$${v.toLocaleString("en-US")}`;

function renderBody(summary: AuditLeadSummary | undefined, documentName: string | null): string {
  const lines = [
    "Thanks for running a free n4ma review.",
    "",
    documentName ? `Document reviewed: ${documentName}` : "Document reviewed: uploaded contract",
  ];
  if (summary?.vendorName) lines.push(`Vendor: ${summary.vendorName}`);
  if (summary?.riskLabel) lines.push(`Risk: ${summary.riskLabel}`);
  if (summary?.renewalDate) lines.push(`Next renewal: ${summary.renewalDate}`);
  if (summary?.savingsLow != null)
    lines.push(
      `Potential savings identified: ${money(summary.savingsLow)}–${money(summary.savingsHigh)}/yr`
    );
  if (summary?.findings != null) lines.push(`Evidence-backed findings: ${summary.findings}`);
  lines.push(
    "",
    "Run another review or create a free account to see the full breakdown:",
    `${SITE.url}/audit`,
    `${SITE.url}/auth?mode=signup`,
    "",
    "— n4ma · the AI financial watchdog for business software",
  );
  return lines.join("\n");
}

function renderHtml(summary: AuditLeadSummary | undefined, documentName: string | null): string {
  const rows = [
    documentName ? ["Document reviewed", documentName] : null,
    summary?.vendorName ? ["Vendor", summary.vendorName] : null,
    summary?.riskLabel ? ["Risk", summary.riskLabel] : null,
    summary?.renewalDate ? ["Next renewal", summary.renewalDate] : null,
    summary?.savingsLow != null
      ? ["Potential savings", `${money(summary.savingsLow)}–${money(summary.savingsHigh)}/yr`]
      : null,
    summary?.findings != null ? ["Evidence-backed findings", String(summary.findings)] : null,
  ].filter(Boolean) as Array<[string, string]>;

  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#0a0a0c;font-family:Inter,Arial,sans-serif;color:#e4e4e7;">
  <div style="max-width:520px;margin:0 auto;padding:32px 20px;">
    <p style="font-size:13px;letter-spacing:0.02em;color:#a1a1aa;">n4ma</p>
    <h1 style="font-size:20px;line-height:1.3;margin:12px 0 4px;color:#fafafa;">Your free spending review</h1>
    <p style="font-size:14px;line-height:1.6;color:#a1a1aa;margin:8px 0 20px;">
      Here's what the review surfaced. Every finding links back to the source document.
    </p>
    <table style="width:100%;border-collapse:collapse;background:#141416;border:1px solid #27272a;border-radius:8px;">
      ${rows
        .map(
          ([k, v]) => `<tr>
            <td style="padding:10px 14px;font-size:12px;color:#a1a1aa;border-bottom:1px solid #1f1f23;width:42%;">${esc(k)}</td>
            <td style="padding:10px 14px;font-size:13px;color:#f4f4f5;border-bottom:1px solid #1f1f23;">${esc(v)}</td>
          </tr>`
        )
        .join("")}
    </table>
    <p style="margin:22px 0 0;font-size:13px;">
      <a href="${SITE.url}/auth?mode=signup" style="background:#fafafa;color:#09090b;text-decoration:none;font-weight:600;padding:10px 16px;border-radius:6px;display:inline-block;">Create a free account to see the full review</a>
    </p>
    <p style="margin:14px 0 0;font-size:12px;color:#52525b;">
      <a href="${SITE.url}/audit" style="color:#a1a1aa;">Run another review</a>
    </p>
  </div>
</body></html>`;
}

/**
 * Deliver the lead email via Resend. Never throws - returns false on any
 * failure so the caller can report honestly (lead stored, email pending).
 */
export async function sendAuditLeadEmail(
  email: string,
  input: { documentName?: string | null; summary?: AuditLeadSummary }
): Promise<boolean> {
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM?.trim() || "n4ma <onboarding@resend.dev>";
  if (!key) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: email,
        subject: "Your free n4ma spending review is ready",
        text: renderBody(input.summary, input.documentName ?? null),
        html: renderHtml(input.summary, input.documentName ?? null),
      }),
    });
    if (!res.ok) {
      console.error(
        `[audit-lead] resend failed (${res.status}):`,
        (await res.text().catch(() => "")).slice(0, 300)
      );
      return false;
    }
    return true;
  } catch (err) {
    console.error("[audit-lead] resend error:", err);
    return false;
  }
}
