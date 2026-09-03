import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getAIProvider } from "@/lib/ai";
import { rejectUnauthenticated } from "@/lib/serverAuth";
import {
  getDocumentsForUser,
  isDocumentsReady,
} from "@/lib/documents";
import { importDocumentForUser } from "@/lib/ingest";

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
  const bytes = Buffer.from(await file.arrayBuffer());

  // Everything after this point runs through the shared ingestion core -
  // the exact same pipeline Google Drive and Slack imports use - so every
  // source produces one normalized document record with provenance.
  const result = await importDocumentForUser(userId, {
    filename: file.name,
    bytes,
    file_kind: kind,
    source_type: "manual",
  });

  if (result.status === "unsupported" || result.status === "error") {
    return NextResponse.json(
      { error: result.error ?? "Couldn't start the upload. Please try again." },
      { status: 502 }
    );
  }
  return NextResponse.json({
    document: result.document,
    analysis: result.analysis,
  });
}