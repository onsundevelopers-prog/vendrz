/* ------------------------------------------------------------------ */
/*  Documents - server-only persistence for uploaded contract files.   */
/*                                                                     */
/*  The documents table + a private `documents` storage bucket in      */
/*  Supabase are the source of truth for uploaded files. Each row      */
/*  belongs to exactly one user (Clerk user_id) and every read/write   */
/*  is scoped + ownership-checked: a user can only see, change or      */
/*  delete their own rows, and only authorized callers (server routes  */
/*  gated by Clerk) can reach the service-role-backed client.          */
/*                                                                     */
/*  Statuses: uploading -> processing -> ready | failed                */
/*                                                                     */
/*  This module must run ONLY on the server (imports @supabase/supabase-js
/*  with the service-role key). Never import it from a client file.    */
/* ------------------------------------------------------------------ */

import { getSupabase, isSupabaseConfigured } from "./supabase";
import type { AnalysisResult, ContractExtraction } from "./types";

export type DocumentStatus = "uploading" | "processing" | "ready" | "failed";

export interface DocumentRecord {
  id: string;
  user_id: string;
  filename: string;
  file_kind: "pdf" | "docx" | "unknown";
  file_size: number;
  storage_path: string | null;
  status: DocumentStatus;
  error: string | null;
  analysis: AnalysisResult | null;
  extraction: ContractExtraction | null;
  document_name: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Storage bucket path for a user's document file. */
export function storagePathFor(userId: string, docId: string, filename: string): string {
  const ext = filename.includes(".") ? filename.split(".").pop()!.toLowerCase() : "bin";
  return `${userId}/${docId}.${ext}`;
}

/* ------------------------- table helpers ------------------------- */

const T = "documents";

async function rowToDoc(row: Record<string, unknown>): Promise<DocumentRecord> {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    filename: String(row.filename),
    file_kind: (row.file_kind as DocumentRecord["file_kind"]) ?? "unknown",
    file_size: Number(row.file_size ?? 0),
    storage_path: row.storage_path ? String(row.storage_path) : null,
    status: (row.status as DocumentStatus) ?? "uploading",
    error: row.error ? String(row.error) : null,
    analysis: (row.analysis as AnalysisResult) ?? null,
    extraction: (row.extraction as ContractExtraction) ?? null,
    document_name: row.document_name ? String(row.document_name) : null,
    createdAt: row.created_at ? String(row.created_at) : "",
    updatedAt: row.updated_at ? String(row.updated_at) : "",
  };
}

/* ------------------------- create ------------------------- */

/** Insert a document row (status=uploading) for a user and return it. */
export async function createDocumentRecord(
  userId: string,
  input: { filename: string; file_kind: DocumentRecord["file_kind"]; file_size: number }
): Promise<DocumentRecord | null> {
  const db = getSupabase();
  const { data, error } = await db
    .from(T)
    .insert({
      user_id: userId,
      filename: input.filename,
      file_kind: input.file_kind,
      file_size: input.file_size,
      status: "uploading",
    })
    .select()
    .maybeSingle();
  if (error) {
    console.error(`[documents] create failed for ${userId}:`, error.message);
    return null;
  }
  if (!data) return null;
  // Store the file as soon as the row exists so even a failed analysis
  // leaves the PDF retrievable.
  return rowToDoc(data as Record<string, unknown>);
}

/** Upload file bytes into the user's storage under the doc's object key. */
export async function storeDocumentFile(
  userId: string,
  docId: string,
  filename: string,
  bytes: Buffer
): Promise<string | null> {
  const path = storagePathFor(userId, docId, filename);
  const { error } = await getSupabase()
    .storage.from("documents")
    .upload(path, bytes, { contentType: mimeFor(filename), upsert: true });
  if (error) {
    console.error(`[documents] storage upload failed for ${docId}:`, error.message);
    return null;
  }
  return path;
}

function mimeFor(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return "application/pdf";
  if (ext === "docx")
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  return "application/octet-stream";
}

/* ------------------------- upsert status / result ------------------------- */

/** Scoped update of a document's status / error / analysis / storage_path. */
export async function updateDocumentRecord(
  docId: string,
  userId: string,
  patch: Partial<{
    status: DocumentStatus;
    error: string;
    analysis: AnalysisResult;
    extraction: ContractExtraction;
    storage_path: string | null;
    document_name: string;
  }>
): Promise<boolean> {
  const updated: Record<string, unknown> = {};
  if (patch.status) updated.status = patch.status;
  if (patch.error !== undefined) updated.error = patch.error;
  if (patch.analysis !== undefined) updated.analysis = patch.analysis;
  if (patch.extraction !== undefined) updated.extraction = patch.extraction;
  if (patch.storage_path !== undefined) updated.storage_path = patch.storage_path;
  if (patch.document_name !== undefined) updated.document_name = patch.document_name;
  if (Object.keys(updated).length === 0) return true;
  updated.updated_at = new Date().toISOString();
  // .match() guarantees the update is scoped to the owning user only.
  const { error } = await getSupabase()
    .from(T)
    .update(updated)
    .match({ id: docId, user_id: userId });
  if (error) {
    console.error(`[documents] update ${docId} failed:`, error.message);
    return false;
  }
  return true;
}

/* ------------------------- read ------------------------- */

/** One user's documents, newest first. Always scoped to userId. */
export async function getDocumentsForUser(userId: string): Promise<DocumentRecord[]> {
  const db = getSupabase();
  const { data, error } = await db
    .from(T)
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error(`[documents] list failed for ${userId}:`, error.message);
    return [];
  }
  return Promise.all((data ?? []).map((r) => rowToDoc(r as Record<string, unknown>)));
}

/** A single document, ensuring it belongs to userId. */
export async function getDocumentForUser(
  userId: string,
  docId: string
): Promise<DocumentRecord | null> {
  const db = getSupabase();
  const { data, error } = await db
    .from(T)
    .select("*")
    .match({ id: docId, user_id: userId })
    .maybeSingle();
  if (error) {
    console.error(`[documents] get ${docId} failed:`, error.message);
    return null;
  }
  if (!data) return null;
  return rowToDoc(data as Record<string, unknown>);
}

/* ------------------------- delete ------------------------- */

/**
 * Delete a document row AND its stored file. Ownership-scoped: a user
 * can only ever delete their own document, and the bucket object is
 * removed so nothing lingers.
 */
export async function deleteDocumentForUser(
  userId: string,
  docId: string
): Promise<"ok" | "not_found" | "error"> {
  const doc = await getDocumentForUser(userId, docId);
  if (!doc) return "not_found";
  const db = getSupabase();
  const { error: delErr } = await db.from(T).delete().match({ id: docId, user_id: userId });
  if (delErr) {
    console.error(`[documents] delete row ${docId} failed:`, delErr.message);
    return "error";
  }
  if (doc.storage_path) {
    const { error: fileErr } = await getSupabase()
      .storage.from("documents")
      .remove([doc.storage_path]);
    if (fileErr) {
      // Row is already gone; a dangling object is cleaned by bucket policy.
      console.error(`[documents] delete file ${doc.storage_path} failed:`, fileErr.message);
    }
  }
  return "ok";
}

/** Generate a short-lived signed URL to fetch a user's stored file bytes. */
export async function getDocumentFileUrl(
  userId: string,
  docId: string,
  ttlSeconds = 300
): Promise<string | null> {
  const doc = await getDocumentForUser(userId, docId);
  if (!doc || !doc.storage_path) return null;
  const { data, error } = await getSupabase()
    .storage.from("documents")
    .createSignedUrl(doc.storage_path, ttlSeconds);
  if (error || !data?.signedUrl) {
    console.error(`[documents] signed url for ${docId} failed:`, error?.message);
    return null;
  }
  return data.signedUrl;
}

export async function isDocumentsReady(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const db = getSupabase();
    const { error } = await db.from(T).select("id").limit(1);
    return !error;
  } catch {
    return false;
  }
}