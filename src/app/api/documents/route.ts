import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getAIProvider } from "@/lib/ai";
import { aiUnreachableMessage, extractFileText } from "@/lib/extractResume";
import type { AnalysisResult } from "@/lib/types";
import { rejectUnauthenticated } from "@/lib/serverAuth";
import {
  createDocumentRecord,
  storeDocumentFile,
  updateDocumentRecord,
  getDocumentsForUser,
  isDocumentsReady,
} from "@/lib/documents";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_BYTES = 25 * 1024 * 1024;
// Multipart overhead (boundaries + other fields) on top of the raw file.
const MAX_BODY_BYTES = MAX_BYTES + 1024 * 1024;

/** GET /api/documents - the signed-in user's uploaded documents (DB truth). */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const docs = await getDocumentsForUser(userId);
  return NextResponse.json({ documents: docs });
}

/**
 * POST /api/documents - upload a contract file and analyze it.
 *
 * Unlike the anonymous /api/extract, this requires authentication, stores
 * the original PDF/DOCX in Supabase Storage, and records a per-user row so
 * the document persists in the dashboard (even if analysis fails) and can
 * be retrieved later. The AI analysis reuses the exact same extraction
 * pipeline as /api/extract.
 */
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return rejectUnauthenticated();

  if (!(await isDocumentsReady())) {
    return NextResponse.json(
      { error: "Document storage isn't ready yet. Check that the documents table and storage bucket are configured." },
      { status: 503 }
    );
  }
  // Fail fast on AI misconfiguration before doing any work.
  try {
    getAIProvider();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[documents] AI provider not configured:", message);
    return NextResponse.json(
      { error: "The analysis service isn't configured yet. Contact support." },
      { status: 503 }
    );
  }

  // Reject oversized uploads by the request body size BEFORE parsing it -
  // the serverless runtime refuses to parse multipart bodies over its
  // limit, so the per-file check below would never get the chance to run.
  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "File is larger than 25 MB." }, { status: 413 });
  }

  let form: FormData | null = null;
  try {
    form = await req.formData();
  } catch {
    // The client always validates size before uploading, so a multipart
    // body that the runtime refuses to parse is a size rejection.
    return NextResponse.json(
      { error: "File is larger than 25 MB." },
      { status: 413 }
    );
  }
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File is larger than 25 MB." }, { status: 413 });
  }
  const name = file.name.toLowerCase();
  const ext = name.split(".").pop() ?? "";
  const allowed = ["pdf", "docx", "txt", "md", "csv"];
  if (!allowed.includes(ext)) {
    return NextResponse.json(
      { error: "Unsupported file type. Use PDF, DOCX, TXT, or Markdown." },
      { status: 400 }
    );
  }
  const kind = ext === "docx" ? "docx" : ext === "pdf" ? "pdf" : "unknown";

  // 1. Persist the document row + file FIRST so the upload survives even if
  //    the analysis below fails. The record starts as "uploading".
  const doc = await createDocumentRecord(userId, {
    filename: file.name,
    file_kind: kind,
    file_size: file.size,
  });
  if (!doc) {
    return NextResponse.json(
      { error: "Couldn't start the upload. Please try again." },
      { status: 502 }
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const storagePath = await storeDocumentFile(userId, doc.id, file.name, bytes);
  await updateDocumentRecord(doc.id, userId, { storage_path: storagePath ?? null });

  // 2. Analyze. Mark processing, run the shared pipeline, then persist the
  //    final state. On any failure the document stays saved (status=failed).
  await updateDocumentRecord(doc.id, userId, { status: "processing" });
  try {
    const text = await extractFileText(file, file.name);
    if (text.trim().length < 40) {
      await updateDocumentRecord(doc.id, userId, {
        status: "failed",
        error: "This file looks empty - no readable text found.",
      });
      return NextResponse.json(
        { document: { ...doc, status: "failed", error: "This file looks empty - no readable text found." }, analysis: null },
        { status: 200 }
      );
    }

    // Reuse the real LLM extraction (same provider/fallback as /api/extract).
    const provider = getAIProvider();
    const { runExtractionPipeline } = await import("@/lib/ai/extractPipeline");
    const { richToExtraction } = await import("@/lib/ai/base");
    const pipelineResult = await runExtractionPipeline(
      provider,
      text,
      file.name,
      () => {}
    );
    if (pipelineResult.taskErrors.length >= 3) {
      const err = aiUnreachableMessage(pipelineResult.taskErrors);
      await updateDocumentRecord(doc.id, userId, { status: "failed", error: err });
      return NextResponse.json({ document: { ...doc, status: "failed", error: err }, analysis: null }, { status: 200 });
    }
    const rich = pipelineResult.extraction;
    const extraction = richToExtraction(rich);

    // Build the full deterministic analysis (risk score, findings, savings
    // opportunities, cancellation deadline) from the extracted terms - the
    // exact same rules the anonymous upload flow applies, so a signed-in
    // upload is never shown as permanently "Pending / low risk" with an empty
    // findings list just because it took the authenticated path.
    const { generateAnalysis } = await import("@/lib/pipeline");
    const analysis = generateAnalysis(file.name, kind, { extraction, rich });

    await updateDocumentRecord(doc.id, userId, {
      status: "ready",
      analysis: analysis as AnalysisResult,
      extraction,
      document_name: file.name,
    });
    return NextResponse.json({ document: { ...doc, status: "ready", analysis, extraction }, analysis });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't analyze this file.";
    await updateDocumentRecord(doc.id, userId, { status: "failed", error: message });
    console.error(`[documents] analyze ${doc.id} failed:`, message);
    return NextResponse.json(
      { document: { ...doc, status: "failed", error: message }, analysis: null },
      { status: 200 }
    );
  }
}