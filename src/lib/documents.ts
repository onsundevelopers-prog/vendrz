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

export type DocumentSourceType = "manual" | "gmail" | "google_drive" | "slack";

/**
 * Provenance stored for every document (source columns on the documents
 * table - added by the ALTER in .env.example). `source_meta` carries the
 * normalized source model: external_id, source_url, mime_type and any
 * source-specific extras (e.g. Slack channel/sender/ts).
 */
export interface DocumentSourceMeta {
  external_id?: string | null;
  source_url?: string | null;
  mime_type?: string | null;
  checksum?: string | null;
  imported_at?: string;
  [key: string]: unknown;
}

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
  /** Where the document came from: manual | gmail | google_drive | slack. */
  source_type: DocumentSourceType | null;
  /** Source provenance (external id / url / mime / extras). */
  source_meta: DocumentSourceMeta | null;
  createdAt: string;
  updatedAt: string;
}

/** True when a PostgREST error means the documents table predates the
    source columns (no migration has been run for this deployment). */
function isMissingSourceColumn(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  if (err.code === "42703") return true;
  if (/could not find (the )?column/i.test(err.message ?? "")) return true;
  if (/column .* does not exist/i.test(err.message ?? "")) return true;
  return false;
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
    source_type: (row.source_type as DocumentSourceType | null | undefined) ?? null,
    source_meta:
      row.source_meta && typeof row.source_meta === "object"
        ? (row.source_meta as DocumentSourceMeta)
        : null,
    createdAt: row.created_at ? String(row.created_at) : "",
    updatedAt: row.updated_at ? String(row.updated_at) : "",
  };
}

/* ------------------------- create ------------------------- */

/**
 * Insert a document row (status=uploading) for a user and return it.
 *
 * When the deployment has run the source-columns migration the row also
 * stores source provenance (source_type + source_meta). Deployments that
 * predate the migration fall back to the legacy insert so uploads keep
 * working untouched - provenance is simply not recorded there.
 */
export async function createDocumentRecord(
  userId: string,
  input: {
    filename: string;
    file_kind: DocumentRecord["file_kind"];
    file_size: number;
    source_type?: DocumentSourceType;
    source_meta?: DocumentSourceMeta | null;
  }
): Promise<DocumentRecord | null> {
  const db = getSupabase();
  const base = {
    user_id: userId,
    filename: input.filename,
    file_kind: input.file_kind,
    file_size: input.file_size,
    status: "uploading",
  };

  const insert = async (row: Record<string, unknown>) => {
    const { data, error } = await db.from(T).insert(row).select().maybeSingle();
    if (error) return { error };
    return { data };
  };

  // Prefer the source-aware insert (new schema).
  if (input.source_type) {
    const withSource = await insert({
      ...base,
      source_type: input.source_type,
      source_meta: input.source_meta ?? {},
    });
    if (withSource.error && !isMissingSourceColumn(withSource.error)) {
      console.error(`[documents] create failed for ${userId}:`, withSource.error.message);
      return null;
    }
    if (!withSource.error && withSource.data) {
      return rowToDoc(withSource.data as Record<string, unknown>);
    }
    // Source columns don't exist - fall through to the legacy insert.
  }

  const legacy = await insert(base);
  if (legacy.error || !legacy.data) {
    console.error(
      `[documents] create failed for ${userId}:`,
      legacy.error?.message ?? "no row returned"
    );
    return null;
  }
  return rowToDoc(legacy.data as Record<string, unknown>);
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

/* ------------------------- source provenance ------------------------- */

/**
 * Best-effort dedupe lookup: has this external source item already been
 * imported for this user? Only meaningful when the source columns exist
 * (migration run); returns null when they don't, so callers treat the
 * import as new rather than failing.
 */
export async function findDocumentByExternalId(
  userId: string,
  sourceType: DocumentSourceType,
  externalId: string
): Promise<DocumentRecord | null> {
  try {
    const db = getSupabase();
    const { data, error } = await db
      .from(T)
      .select("*")
      .eq("user_id", userId)
      .eq("source_type", sourceType)
      .eq("source_meta->>external_id", externalId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      if (isMissingSourceColumn(error)) return null;
      console.error(`[documents] source lookup failed for ${userId}:`, error.message);
      return null;
    }
    if (!data) return null;
    return rowToDoc(data as Record<string, unknown>);
  } catch {
    return null;
  }
}

/**
 * Count documents a user imported from the given sources (used to enforce
 * the free-tier integration import allowance). Returns 0 when the source
 * columns are missing - the deployment can't prove usage, so it degrades
 * to allowing imports.
 */
export async function countDocumentsBySource(
  userId: string,
  sourceTypes: DocumentSourceType[],
  statuses?: DocumentStatus[]
): Promise<number> {
  try {
    const db = getSupabase();
    let query = db
      .from(T)
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .in("source_type", sourceTypes);
    if (statuses && statuses.length > 0) {
      query = query.in("status", statuses);
    }
    const { count, error } = await query;
    if (error) {
      if (isMissingSourceColumn(error)) return 0;
      console.error(`[documents] source count failed for ${userId}:`, error.message);
      return 0;
    }
    return count ?? 0;
  } catch {
    return 0;
  }
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