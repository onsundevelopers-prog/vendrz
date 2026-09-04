"use client";

/* ------------------------------------------------------------------ */
/*  auditImport.ts                                                     */
/*                                                                     */
/*  Free reviews run anonymously ("No signup · no credit card") and    */
/*  keep their data in the review store only. When the reviewer later  */
/*  signs in, the review is bound to their account (unlockedToUserId)  */
/*  and synced - but nothing ever made its document appear in the      */
/*  workspace registers. This module closes that gap: on dashboard     */
/*  load it imports every completed manual review claimed by the user  */
/*  into a workspace session, exactly like an anonymous upload, so     */
/*  Home / Vendors / Contracts / Renewals / ... show the same data.    */
/*                                                                     */
/*  The analysis is synthesized with generateAnalysis from the real    */
/*  extracted terms (the same deterministic step the review page       */
/*  uses) - never fabricated. Duplicate-proof via workspaceSessionId.  */
/* ------------------------------------------------------------------ */

import { daysFromNow } from "./dates";
import { generateAnalysis } from "./pipeline";
import { getAllAuditSessions, getSession, saveSession, updateAuditSession } from "./store";
import type { AnonymousSession } from "./types";

/** Kind derived from the review's source document name. */
function fileKindFromName(name: string | null | undefined): "pdf" | "docx" | "unknown" {
  const n = (name ?? "").toLowerCase();
  if (n.endsWith(".pdf")) return "pdf";
  if (n.endsWith(".docx")) return "docx";
  return "unknown";
}

/**
 * Import the signed-in user's completed free reviews into the workspace.
 *
 * Runs after hydration on every dashboard load, so any review claimed on
 * this device (via the results-page sign-in) or synced from another device
 * lands in the registers exactly once. Returns how many were imported.
 */
export function importClaimedAudits(userId: string): number {
  let imported = 0;

  for (const audit of getAllAuditSessions()) {
    // Only real manual-upload reviews with extracted terms are importable.
    if (!audit || audit.source !== "manual") continue;
    if (audit.pipelineStatus !== "complete") continue;
    const extraction = audit.extraction;
    if (!extraction) continue;

    // Bind reviews started on this device that no account claimed yet, so a
    // sign-in through the dashboard (no ?session= in the URL) keeps them too.
    if (!audit.unlockedToUserId) {
      updateAuditSession(audit.id, { unlockedToUserId: userId });
    } else if (audit.unlockedToUserId !== userId) {
      continue; // claimed by a different account
    }

    // Already imported and the workspace session still exists -> skip.
    if (audit.workspaceSessionId && getSession(audit.workspaceSessionId)) continue;

    // Same synthesis the review page uses - deterministic from the real
    // extracted terms, never invented.
    const documentName = audit.documentName ?? "Uploaded contract.pdf";
    const id = `audit-${audit.id}`;
    const session: AnonymousSession = {
      id,
      documentName,
      fileKind: fileKindFromName(documentName),
      fileSize: 0,
      createdAt: audit.createdAt,
      expiresAt: daysFromNow(14),
      pipelineStatus: "complete",
      result: generateAnalysis(documentName, fileKindFromName(documentName), {
        extraction,
      }),
      extraction,
      richExtraction: null,
      transferredToUserId: userId,
      source: "manual",
    };
    saveSession(session);
    updateAuditSession(audit.id, { unlockedToUserId: userId, workspaceSessionId: id });
    imported++;
  }

  return imported;
}
