/* ------------------------------------------------------------------ */
/*  Ingestion core - the single normalized pipeline every vendor-data   */
/*  source feeds into.                                                 */
/*                                                                     */
/*    Manual Upload                                                    */
/*    Gmail ──────────────┐                                            */
/*    Google Drive ───────┼──▶ importDocumentForUser() ─▶ documents    */
/*    Slack ──────────────┘        table + bucket ─▶ extraction        */
/*                                             ─▶ analysis             */
/*                                                                     */
/*  Every imported file becomes a row in the `documents` table (the    */
/*  same persistence manual uploads use) with source provenance        */
/*  recorded when the deployment's schema has the source columns:      */
/*    source_type  - manual | gmail | google_drive | slack             */
/*    source_meta  - external_id, source_url, mime_type, imported_at,  */
/*                   checksum + source-specific extras                 */
/*                                                                     */
/*  This module must run ONLY on the server. Never import it from a    */
/*  client file.                                                       */
/* ------------------------------------------------------------------ */

import crypto from "node:crypto";
import {
  countDocumentsBySource,
  createDocumentRecord,
  findDocumentByExternalId,
  getDocumentForUser,
  storeDocumentFile,
  updateDocumentRecord,
  type DocumentRecord,
  type DocumentSourceMeta,
  type DocumentSourceType,
  type DocumentStatus,
} from "./documents";
import { getAIProvider } from "./ai";
import { extractFileText } from "./extractResume";
import { getCurrentUserPlan } from "./serverAuth";
import type { AnalysisResult } from "./types";

/* ------------------------------------------------------------------ */
/*  Free-tier allowance                                               */
/*                                                                     */
/*  Free accounts may import 1 document from the connected sources     */
/*  (Google Drive / Slack) so they can evaluate the feature; paid      */
/*  plans import without limit. The rest of the dashboard stays        */
/*  plan-gated exactly as before - this only relaxes the connectors.   */
/* ------------------------------------------------------------------ */

export const FREE_INTEGRATION_IMPORT_LIMIT = 1;
export const INTEGRATION_SOURCE_TYPES: DocumentSourceType[] = [
  "google_drive",
  "slack",
];

/**
 * How many more source imports a user may run before a paid plan is
 * required. Never throws - missing/old schema degrades to allowing the
 * import (the allowance is a soft product gate, not a security boundary).
 */
export async function integrationImportAllowance(userId: string): Promise<{
  plan: string;
  limit: number;
  used: number;
  remaining: number;
  allowed: boolean;
}> {
  const ctx = await getCurrentUserPlan();
  const plan = ctx?.plan ?? "free";
  if (plan !== "free") {
    return { plan, limit: Infinity, used: 0, remaining: Infinity, allowed: true };
  }
  // Count imports that actually produced an analyzed document (status
  // ready). Records that failed to analyze or were deleted don't consume
  // the free allowance.
  const used = await countDocumentsBySource(userId, INTEGRATION_SOURCE_TYPES, [
    "ready",
  ]);
  const remaining = Math.max(FREE_INTEGRATION_IMPORT_LIMIT - used, 0);
  return {
    plan,
    limit: FREE_INTEGRATION_IMPORT_LIMIT,
    used,
    remaining,
    allowed: used < FREE_INTEGRATION_IMPORT_LIMIT,
  };
}

/* ------------------------------------------------------------------ */
/*  Import                                                             */
/* ------------------------------------------------------------------ */

export interface ImportFileInput {
  /** Display filename (must carry a supported extension). */
  filename: string;
  bytes: Buffer;
  file_kind: DocumentRecord["file_kind"];
  /** Where the document came from (drives provenance + dedupe). */
  source_type: DocumentSourceType;
  source_meta?: DocumentSourceMeta | null;
  /** Human-safe error copy for unsupported types. */
  unsupportedMessage?: string;
}

export type ImportResult =
  | { status: "imported"; document: DocumentRecord; analysis: AnalysisResult | null }
  | { status: "duplicate"; document: DocumentRecord; analysis: AnalysisResult | null }
  | { status: "unsupported"; document: null; analysis: null; error: string }
  | { status: "error"; document: null; analysis: null; error: string };

const ALLOWED_EXTS = new Set(["pdf", "docx", "txt", "md", "csv"]);
const MAX_BYTES = 25 * 1024 * 1024;

/**
 * Import a file's bytes into the user's persistent workspace through the
 * exact same pipeline as manual uploads: documents row, storage bucket,
 * text extraction, LLM extraction, deterministic analysis. Returns a
 * result describing what happened (imported / duplicate / unsupported /
 * error); every message is safe to show to the end user.
 */
export async function importDocumentForUser(
  userId: string,
  input: ImportFileInput
): Promise<ImportResult> {
  const filename = sanitizeFilename(input.filename);
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";

  // Validate before doing any work.
  if (!ALLOWED_EXTS.has(ext)) {
    return {
      status: "unsupported",
      document: null,
      analysis: null,
      error:
        input.unsupportedMessage ??
        "This file type isn't supported. Use PDF, DOCX, TXT, Markdown, or CSV.",
    };
  }
  if (input.bytes.byteLength === 0) {
    return {
      status: "unsupported",
      document: null,
      analysis: null,
      error: "This file is empty - nothing to import.",
    };
  }
  if (input.bytes.byteLength > MAX_BYTES) {
    return {
      status: "unsupported",
      document: null,
      analysis: null,
      error: "This file is larger than 25 MB.",
    };
  }

  // Duplicate prevention: the same external item must not be imported
  // twice for the same user.
  const externalId = input.source_meta?.external_id;
  if (externalId) {
    const existing = await findDocumentByExternalId(
      userId,
      input.source_type,
      String(externalId)
    );
    if (existing) {
      return {
        status: "duplicate",
        document: existing,
        analysis: existing.analysis,
      };
    }
  }

  const sourceMeta: DocumentSourceMeta = {
    ...(input.source_meta ?? {}),
    mime_type: input.source_meta?.mime_type ?? mimeFor(filename),
    checksum: sha256(input.bytes),
    imported_at: new Date().toISOString(),
  };

  // 1. Persist the row + file FIRST so even a failed analysis leaves the
  //    imported file retrievable.
  const doc = await createDocumentRecord(userId, {
    filename,
    file_kind: input.file_kind,
    file_size: input.bytes.byteLength,
    source_type: input.source_type,
    source_meta: sourceMeta,
  });
  if (!doc) {
    return {
      status: "error",
      document: null,
      analysis: null,
      error: "Couldn't start the import. Please try again.",
    };
  }

  const storagePath = await storeDocumentFile(userId, doc.id, filename, input.bytes);
  await updateDocumentRecord(doc.id, userId, { storage_path: storagePath ?? null });

  // 2. Analyze with the shared pipeline. Failures mark the record failed
  //    (the file itself stays saved) instead of being lost.
  await updateDocumentRecord(doc.id, userId, { status: "processing" });
  const failed = async (message: string): Promise<ImportResult> => {
    await updateDocumentRecord(doc.id, userId, { status: "failed", error: message });
    const fresh = await getDocumentForUser(userId, doc.id);
    return {
      status: "imported",
      document: fresh ?? { ...doc, status: "failed" as DocumentStatus, error: message },
      analysis: null,
    };
  };

  try {
    const file = new File([input.bytes as unknown as BlobPart], filename, {
      type: mimeFor(filename),
    });
    const text = await extractFileText(file, filename);
    if (text.trim().length < 40) {
      return failed(
        "This file looks empty - no readable text was found. Imported documents need extractable text."
      );
    }

    // Same provider + staged pipeline the manual upload path uses.
    const provider = getAIProvider();
    const { runExtractionPipeline } = await import("./ai/extractPipeline");
    const { richToExtraction } = await import("./ai/base");
    const pipelineResult = await runExtractionPipeline(
      provider,
      text,
      filename,
      () => {}
    );
    if (pipelineResult.taskErrors.length >= 3) {
      return failed(
        "The analysis service couldn't process this file right now. Check the AI provider setup and try again."
      );
    }
    const rich = pipelineResult.extraction;
    const extraction = richToExtraction(rich);

    const { generateAnalysis } = await import("./pipeline");
    const analysis = generateAnalysis(filename, input.file_kind, { extraction, rich });

    await updateDocumentRecord(doc.id, userId, {
      status: "ready",
      analysis: analysis as AnalysisResult,
      extraction,
      document_name: filename,
    });
    const fresh = await getDocumentForUser(userId, doc.id);
    return {
      status: "imported",
      document:
        fresh ??
        ({
          ...doc,
          status: "ready",
          analysis,
          extraction,
          document_name: filename,
        } as DocumentRecord),
      analysis,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't analyze this file.";
    console.error(`[ingest] analyze ${doc.id} failed:`, message);
    return failed("Unable to import this file. It may be damaged or password-protected.");
  }
}

/** Build a small text document out of a Slack message for the pipeline. */
export function slackMessageToText(input: {
  channelName: string;
  username: string;
  ts: string;
  text: string;
  permalink?: string | null;
}): string {
  const date = input.ts
    ? new Date(Number(input.ts.split(".")[0]) * 1000).toISOString()
    : "";
  const lines = [
    "Imported from Slack",
    input.channelName ? `Channel: ${input.channelName}` : null,
    input.username ? `Posted by: ${input.username}` : null,
    date ? `Date: ${date}` : null,
    input.permalink ? `Source: ${input.permalink}` : null,
    "",
    input.text.replace(/[\uE000\uE001]/g, ""),
  ];
  return lines.filter((l) => l !== null).join("\n");
}

/* ------------------------- helpers ------------------------- */

function sanitizeFilename(name: string): string {
  const cleaned = name.replace(/[\u0000-\u001f<>:"/\\|?*]/g, "_").trim();
  // Never allow path separators or traversal in any direction.
  const base = cleaned.split("/").pop()?.split("\\").pop() ?? "document";
  return base.slice(0, 180) || "document";
}

function mimeFor(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return "application/pdf";
  if (ext === "docx")
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (ext === "csv") return "text/csv";
  if (ext === "md") return "text/markdown";
  return "text/plain";
}

function sha256(bytes: Buffer): string {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}
