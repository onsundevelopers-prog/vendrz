"use client";

/* ------------------------------------------------------------------ */
/*  Client helpers for the documents API.                              */
/*                                                                     */
/*  These call authenticated endpoints and return plain JS describing   */
/*  success/error. All persistence happens server-side; the client      */
/*  never holds the source of truth.                                    */
/* ------------------------------------------------------------------ */

import { daysFromNow } from "./dates";
import { getSession, KEYS, saveSession } from "./store";
import type { AnalysisResult, AnonymousSession, ContractExtraction } from "./types";

export type DocumentSourceType = "manual" | "gmail" | "google_drive" | "slack";

export interface ClientDocument {
  id: string;
  filename: string;
  file_kind: string;
  file_size: number;
  status: "uploading" | "processing" | "ready" | "failed";
  error: string | null;
  analysis: AnalysisResult | null;
  extraction: ContractExtraction | null;
  document_name: string | null;
  /** Where the document came from (null on deployments without the
      source-columns migration). */
  source_type?: DocumentSourceType | null;
  /** Provenance extras: external id, source url, etc. */
  source_meta?: { external_id?: string | null; source_url?: string | null; [key: string]: unknown } | null;
  createdAt: string;
  updatedAt: string;
}

/** All of the signed-in user's persisted documents. */
export async function fetchDocuments(): Promise<ClientDocument[]> {
  const res = await fetch("/api/documents", { cache: "no-store" });
  if (!res.ok) return [];
  const { documents } = (await res.json()) as { documents: ClientDocument[] };
  return documents ?? [];
}

/**
 * Session id used for a persisted server document in the localStorage
 * workspace (the dashboard's contract registers read sessions).
 */
export function documentSessionId(docId: string): string {
  return `doc-${docId}`;
}

/**
 * Materialize a localStorage workspace session for a persisted server
 * document so the dashboard registers (Vendors / Contracts / Renewals /
 * Risk / Savings / AI) see it too.
 *
 * The documents API (Supabase) is the source of truth for the file and
 * its analysis; this mirror makes the localStorage-backed registers show
 * the same contract. Only ready documents with a real analysis are
 * registered - uploads that failed or are still processing stay visible
 * in the DocumentsPanel only.
 */
export function registerDocumentSession(
  doc: ClientDocument,
  userId: string
): string | null {
  if (doc.status !== "ready" || !doc.analysis) return null;
  const id = documentSessionId(doc.id);
  if (getSession(id)) return id;
  const source = doc.source_type ?? "manual";
  const session: AnonymousSession = {
    id,
    documentName: doc.document_name ?? doc.filename,
    fileKind:
      doc.file_kind === "docx" ? "docx" : doc.file_kind === "pdf" ? "pdf" : "unknown",
    fileSize: doc.file_size,
    createdAt: doc.createdAt || new Date().toISOString(),
    expiresAt: daysFromNow(14),
    pipelineStatus: "complete",
    result: doc.analysis,
    extraction: doc.extraction,
    richExtraction: null,
    transferredToUserId: userId,
    source: source === "google_drive" || source === "slack" || source === "gmail" ? source : "manual",
  };
  saveSession(session);
  return id;
}

/**
 * Reconcile the localStorage workspace with the server's document list:
 * add sessions for every ready analyzed document that isn't local yet and
 * drop local `doc-*` sessions whose server record disappeared (deleted).
 * Returns how many sessions changed.
 */
export function reconcileDocumentSessions(
  documents: ClientDocument[],
  userId: string
): number {
  const readyIds = new Set(
    documents.filter((d) => d.status === "ready" && d.analysis).map((d) => d.id)
  );
  let changed = 0;
  for (const doc of documents) {
    if (registerDocumentSession(doc, userId)) changed++;
  }
  // Drop local doc-sessions whose server record no longer exists (deleted
  // from the document library). Only sessions mirrored from the API are
  // touched - anonymous-upload sessions are never removed here.
  if (typeof window !== "undefined") {
    const raw = window.localStorage.getItem(KEYS.sessions);
    if (raw) {
      try {
        const map = JSON.parse(raw) as Record<string, AnonymousSession>;
        let removed = 0;
        for (const [id, s] of Object.entries(map)) {
          if (!id.startsWith("doc-")) continue;
          const docId = id.slice(4);
          if (s.transferredToUserId === userId && !readyIds.has(docId)) {
            delete map[id];
            removed++;
          }
        }
        if (removed > 0) {
          window.localStorage.setItem("wt.sessions", JSON.stringify(map));
          changed += removed;
        }
      } catch {
        /* ignore - the register stays as-is */
      }
    }
  }
  return changed;
}

/**
 * Upload + analyze a file into the user's persistent workspace.
 * Returns the created document (status ready/failed) or throws with a
 * user-safe message.
 */
export interface UploadDocumentError extends Error {
  /** HTTP status from the documents API (503 = document storage not ready). */
  status?: number;
}

export async function uploadDocument(file: File): Promise<ClientDocument> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/documents", { method: "POST", body: form });
  const data = (await res.json().catch(() => null)) as {
    document?: ClientDocument;
    error?: string;
  } | null;
  if (!res.ok || !data?.document) {
    const err: UploadDocumentError = new Error(
      data?.error ?? "Couldn't upload this file. Try again."
    );
    err.status = res.status;
    throw err;
  }
  return data.document;
}

/**
 * True when the documents API couldn't be used because its storage layer
 * isn't provisioned (503 with the "storage isn't ready" message). In that
 * case uploads should fall back to the local analysis flow instead of
 * failing - the analysis still lands in the dashboard registers.
 */
export function isStorageUnavailable(err: unknown): boolean {
  if (err instanceof Error) {
    const status = (err as UploadDocumentError).status;
    if (status === 503) return true;
    return /storage isn't ready|documents table/i.test(err.message);
  }
  return false;
}

/** Fetch a short-lived signed URL to open the original file. */
export async function getDocumentFileUrl(docId: string): Promise<string | null> {
  const res = await fetch(`/api/documents/${docId}?file=1`, { cache: "no-store" });
  if (!res.ok) return null;
  const { url } = (await res.json()) as { url?: string };
  return url ?? null;
}

/** Delete a document (row + stored file). Throws on failure. */
export async function deleteDocument(docId: string): Promise<void> {
  const res = await fetch(`/api/documents/${docId}`, { method: "DELETE" });
  if (!res.ok) {
    throw new Error("Couldn't delete this document. Try again.");
  }
}

/** Ask the server whether the user may access a feature section. */
export async function canAccessSection(section: string): Promise<boolean> {
  const res = await fetch(`/api/features/${section}`, { cache: "no-store" });
  return res.ok;
}