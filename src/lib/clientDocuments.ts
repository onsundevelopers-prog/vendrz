"use client";

/* ------------------------------------------------------------------ */
/*  Client helpers for the documents API.                              */
/*                                                                     */
/*  These call authenticated endpoints and return plain JS describing   */
/*  success/error. All persistence happens server-side; the client      */
/*  never holds the source of truth.                                    */
/* ------------------------------------------------------------------ */

import type { AnalysisResult, ContractExtraction } from "./types";

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
 * Upload + analyze a file into the user's persistent workspace.
 * Returns the created document (status ready/failed) or throws with a
 * user-safe message.
 */
export async function uploadDocument(file: File): Promise<ClientDocument> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/documents", { method: "POST", body: form });
  const data = (await res.json().catch(() => null)) as {
    document?: ClientDocument;
    error?: string;
  } | null;
  if (!res.ok || !data?.document) {
    throw new Error(data?.error ?? "Couldn't upload this file. Try again.");
  }
  return data.document;
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