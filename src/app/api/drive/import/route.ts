import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getAIProvider } from "@/lib/ai";
import {
  DriveReconnectRequiredError,
  downloadDriveFile,
  driveFileToImport,
  exportDriveFile,
  fetchDriveFile,
  getValidAccessToken,
} from "@/lib/drive/oauth";
import { isDocumentsReady } from "@/lib/documents";
import { importDocumentForUser, integrationImportAllowance } from "@/lib/ingest";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_BATCH = 20;

/**
 * POST /api/drive/import  body: { files: [{ id, name }] }
 *
 * Imports the selected Drive files into the user's workspace through the
 * shared ingestion pipeline (the same one manual uploads and Gmail use).
 * Each file is refetched server-side with the user's own token - nothing
 * from the request body is trusted for content. Per-file results report
 * imported / duplicate / unsupported / error, each with a user-safe
 * message. Only files the user explicitly selected are touched.
 */
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let body: { files?: Array<{ id?: string; name?: string }> };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const ids = [...new Set((body.files ?? []).map((f) => String(f?.id ?? "").trim()).filter(Boolean))].slice(
    0,
    MAX_BATCH
  );
  if (ids.length === 0) {
    return NextResponse.json(
      { error: "Select at least one file to import." },
      { status: 400 }
    );
  }

  if (!(await isDocumentsReady())) {
    return NextResponse.json(
      { error: "Document storage isn't ready yet. Check that the documents table and storage bucket are configured." },
      { status: 503 }
    );
  }
  try {
    getAIProvider();
  } catch {
    return NextResponse.json(
      { error: "The analysis service isn't configured yet. Contact support." },
      { status: 503 }
    );
  }

  // Free-tier allowance: 1 imported document per account; paid plans are
  // unlimited. Checking before any download keeps wasted work to zero.
  const allowance = await integrationImportAllowance(userId);
  if (!allowance.allowed) {
    return NextResponse.json(
      {
        error:
          "Free accounts can import 1 document from Google Drive or Slack. Upgrade to the Team plan for unlimited imports.",
        code: "import_limit",
        upgradeTo: "team",
        remaining: 0,
      },
      { status: 403 }
    );
  }

  try {
    const accessToken = await getValidAccessToken(userId);
    const results = [];
    for (const id of ids) {
      results.push(await importDriveFile(userId, accessToken, id));
    }
    return NextResponse.json({ results });
  } catch (err) {
    if (err instanceof DriveReconnectRequiredError) {
      return NextResponse.json(
        { error: "reconnect_required", message: err.message },
        { status: 401 }
      );
    }
    console.error("[drive] import failed:", err);
    return NextResponse.json(
      { error: "Couldn't reach Google Drive right now. Please try again." },
      { status: 502 }
    );
  }
}

async function importDriveFile(
  userId: string,
  accessToken: string,
  fileId: string
): Promise<Record<string, unknown>> {
  const fail = (status: string, error: string, name?: string) => ({
    id: fileId,
    name: name ?? fileId,
    status,
    error,
  });

  // Refetch metadata server-side with the user's token - never trust the
  // request body. This also confirms the user can actually see the file.
  const meta = await fetchDriveFile(accessToken, fileId);
  if (!meta || meta.trashed) {
    return fail(
      "error",
      "This file isn't accessible anymore. It may have been moved, renamed, or deleted.",
      meta?.name
    );
  }

  // Resolve shortcuts one level to their target, then plan the import.
  let item = meta;
  let plan = driveFileToImport(item);
  if ("shortcut" in plan && plan.shortcut) {
    const target = await fetchDriveFile(accessToken, plan.targetId);
    if (!target || target.trashed) {
      return fail("error", "The file this shortcut points to isn't accessible anymore.", meta.name);
    }
    item = target;
    plan = driveFileToImport(item);
  }
  if (!("ok" in plan) || !plan.ok) {
    const hint = "shortcut" in plan ? "This shortcut can't be read." : (plan as { hint?: string }).hint;
    return fail("unsupported", hint ?? "This file type isn't supported.", meta.name);
  }

  // Fetch content: Google-native files are exported to text; everything
  // else downloads its native bytes. Only the selected file is fetched.
  const targetMime =
    item.mimeType === "application/vnd.google-apps.document"
      ? "text/plain"
      : item.mimeType === "application/vnd.google-apps.spreadsheet"
        ? "text/csv"
        : null;
  const content = targetMime
    ? await exportDriveFile(accessToken, item.id, targetMime)
    : await downloadDriveFile(accessToken, item.id);
  if (!content || content.size === 0) {
    return fail(
      "error",
      "Couldn't read this file's contents from Google Drive. The file may be empty or unavailable.",
      meta.name
    );
  }

  const result = await importDocumentForUser(userId, {
    filename: plan.filename || item.name,
    bytes: content.bytes,
    file_kind: plan.kind === "pdf" ? "pdf" : plan.kind === "docx" ? "docx" : "unknown",
    source_type: "google_drive",
    source_meta: {
      external_id: `drive:${item.id}`,
      drive_id: item.id,
      source_url: item.webViewLink ?? meta.webViewLink ?? null,
      mime_type: item.mimeType,
      original_name: meta.name,
    },
    unsupportedMessage: "This file type isn't supported for contract analysis.",
  });

  if (result.status === "duplicate") {
    return {
      id: fileId,
      name: meta.name,
      status: "duplicate",
      document: result.document,
      error: "This document has already been imported.",
    };
  }
  if (result.status === "unsupported" || result.status === "error") {
    return fail(result.status, result.error ?? "Unable to import this file.", meta.name);
  }
  return {
    id: fileId,
    name: meta.name,
    status: "imported",
    document: result.document,
    analysis: result.analysis,
    documentStatus: result.document.status,
  };
}
