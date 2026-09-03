import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getAIProvider } from "@/lib/ai";
import {
  downloadSlackFile,
  fetchSlackFileInfo,
  getUserToken,
  handleReconnectRequired,
  slackFileKind,
  SlackApiError,
  SlackReconnectRequiredError,
} from "@/lib/slack/oauth";
import { isDocumentsReady } from "@/lib/documents";
import {
  importDocumentForUser,
  integrationImportAllowance,
  slackMessageToText,
} from "@/lib/ingest";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_BATCH = 20;
const EXT_BY_KIND: Record<"pdf" | "docx" | "txt" | "csv" | "md", string> = {
  pdf: "pdf",
  docx: "docx",
  txt: "txt",
  csv: "csv",
  md: "md",
};

interface ImportItemMessage {
  kind: "message";
  channelId: string;
  channelName?: string;
  username?: string;
  user?: string;
  ts: string;
  text: string;
  permalink?: string;
}
interface ImportItemFile {
  kind: "file";
  id: string;
}

/**
 * POST /api/slack/import  body: { items: [{ kind: "file", id } |
 * { kind: "message", channelId, ts, text, ... }] }
 *
 * Imports selected Slack content into the user's workspace through the
 * shared ingestion pipeline. File items are refetched server-side
 * (files.info + private download) with the user's own token - the client
 * only supplies the id. Message items are documents synthesized from the
 * message text the user already saw in search results. Per-item results
 * report imported / duplicate / unsupported / error / limit.
 */
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let body: { items?: Array<ImportItemMessage | ImportItemFile> };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const items = (body.items ?? []).slice(0, MAX_BATCH);
  if (items.length === 0) {
    return NextResponse.json(
      { error: "Select at least one message or file to import." },
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

  let token: string;
  try {
    token = await getUserToken(userId);
  } catch (err) {
    if (err instanceof SlackReconnectRequiredError) {
      return NextResponse.json(
        { error: "reconnect_required", message: err.message },
        { status: 401 }
      );
    }
    throw err;
  }

  const results: Record<string, unknown>[] = [];
  for (const item of items) {
    results.push(await importSlackItem(userId, token, item));
  }
  return NextResponse.json({ results });
}

async function importSlackItem(
  userId: string,
  token: string,
  item: ImportItemMessage | ImportItemFile
): Promise<Record<string, unknown>> {
  if (item.kind === "file") {
    return importSlackFile(userId, token, item);
  }
  return importSlackMessage(userId, item);
}

async function importSlackFile(
  userId: string,
  token: string,
  item: ImportItemFile
): Promise<Record<string, unknown>> {
  const id = String(item.id ?? "").trim().slice(0, 64);
  const fail = (status: string, error: string, name?: string) => ({
    id,
    kind: "file",
    name: name ?? id,
    status,
    error,
  });

  if (!/^[A-Za-z0-9]+$/.test(id)) {
    return fail("error", "This file isn't valid.", id);
  }

  // Refetch metadata + private URL server-side with the user's token.
  let info: Awaited<ReturnType<typeof fetchSlackFileInfo>>;
  try {
    info = await fetchSlackFileInfo(token, id);
  } catch (err) {
    if (err instanceof SlackApiError && ["file_not_found", "not_found", "not_allowed_token_type"].includes(err.code ?? "")) {
      return fail("error", "This file isn't accessible anymore. It may have been deleted or its sharing changed.", id);
    }
    if (err instanceof SlackApiError && ["token_revoked", "invalid_auth", "account_inactive"].includes(err.code ?? "")) {
      await handleReconnectRequired(userId, err);
      return fail("error", "reconnect_required");
    }
    return fail("error", "Couldn't read this file from Slack right now.", id);
  }
  if (!info) {
    return fail("error", "This file isn't accessible anymore. It may have been deleted or its sharing changed.", id);
  }

  const kind = slackFileKind(info.filetype);
  if (!kind) {
    return fail("unsupported", "This file type isn't supported for contract analysis.", info.name);
  }
  if (!info.urlPrivate) {
    return fail("error", "This file can't be downloaded by the app. Ask the sender to share it directly in a channel.", info.name);
  }

  // Free-tier allowance is re-checked per item so a multi-select batch on
  // the free plan imports up to the limit and reports the rest honestly.
  const allowance = await integrationImportAllowance(userId);
  if (!allowance.allowed) {
    return {
      id,
      kind: "file",
      name: info.name,
      status: "limit",
      error: "Free accounts can import 1 document from Google Drive or Slack. Upgrade to Team for unlimited imports.",
      upgradeTo: "team",
    };
  }

  let bytes: Buffer;
  try {
    bytes = await downloadSlackFile(token, info.urlPrivate);
  } catch (err) {
    if (err instanceof SlackApiError && ["token_revoked", "invalid_auth"].includes(err.code ?? "")) {
      await handleReconnectRequired(userId, err);
      return fail("error", "reconnect_required", info.name);
    }
    return fail("error", "Couldn't download this file from Slack. It may be too large or restricted.", info.name);
  }

  const ext = EXT_BY_KIND[kind];
  const base = String(info.name).replace(/\.\w+$/, "") || "slack-file";
  const filename = `${base.slice(0, 160)}.${ext}`;

  const result = await importDocumentForUser(userId, {
    filename,
    bytes,
    file_kind: kind === "pdf" ? "pdf" : kind === "docx" ? "docx" : "unknown",
    source_type: "slack",
    source_meta: {
      external_id: `slack:file:${id}`,
      slack_file_id: id,
      source_url: info.permalink || null,
      mime_type: info.mimetype || null,
      slack_filetype: info.filetype,
    },
    unsupportedMessage: "This file type isn't supported for contract analysis.",
  });

  if (result.status === "duplicate") {
    return {
      id,
      kind: "file",
      name: info.name,
      status: "duplicate",
      document: result.document,
      error: "This document has already been imported.",
    };
  }
  if (result.status === "unsupported" || result.status === "error") {
    return fail(result.status, result.error ?? "Unable to import this file.", info.name);
  }
  return {
    id,
    kind: "file",
    name: info.name,
    status: "imported",
    document: result.document,
    analysis: result.analysis,
    documentStatus: result.document.status,
  };
}

async function importSlackMessage(
  userId: string,
  item: ImportItemMessage
): Promise<Record<string, unknown>> {
  const id = `${item.channelId ?? "C?"}:${item.ts ?? ""}`.slice(0, 120);
  const fail = (status: string, error: string) => ({
    id,
    kind: "message",
    name: id,
    status,
    error,
  });

  const channelId = String(item.channelId ?? "").trim().slice(0, 64);
  const ts = String(item.ts ?? "").trim();
  if (!channelId || !/^\d{10}\.\d{6}$/.test(ts)) {
    return fail("error", "This message isn't valid.");
  }
  const text = String(item.text ?? "").replace(/[\uE000\uE001]/g, "").slice(0, 40000);
  if (!text.trim()) {
    return fail("unsupported", "This message has no text content to import.");
  }

  const channelName = String(item.channelName ?? item.channelId ?? "Slack").slice(0, 80);
  const username = String(item.username ?? item.user ?? "Slack member").slice(0, 80);
  const permalink = String(item.permalink ?? "").slice(0, 500) || null;
  const date = ts ? new Date(Number(ts.split(".")[0]) * 1000) : new Date();
  const dateLabel = date.toISOString().slice(0, 10);
  const filename = `Slack ${channelName} ${dateLabel}.txt`.replace(/[^\w\s.-]/g, "_");

  const allowance = await integrationImportAllowance(userId);
  if (!allowance.allowed) {
    return {
      id,
      kind: "message",
      name: filename,
      status: "limit",
      error: "Free accounts can import 1 document from Google Drive or Slack. Upgrade to Team for unlimited imports.",
      upgradeTo: "team",
    };
  }

  const textDoc = slackMessageToText({
    channelName,
    username,
    ts,
    text,
    permalink,
  });
  const bytes = Buffer.from(textDoc, "utf8");

  const result = await importDocumentForUser(userId, {
    filename,
    bytes,
    file_kind: "unknown",
    source_type: "slack",
    source_meta: {
      external_id: `slack:message:${channelId}:${ts}`,
      slack_channel_id: channelId,
      slack_channel_name: channelName,
      slack_user: username,
      slack_ts: ts,
      source_url: permalink,
      mime_type: "text/plain",
    },
  });

  if (result.status === "duplicate") {
    return {
      id,
      kind: "message",
      name: filename,
      status: "duplicate",
      document: result.document,
      error: "This message has already been imported.",
    };
  }
  if (result.status === "unsupported" || result.status === "error") {
    return fail(result.status, result.error ?? "Unable to import this message.");
  }
  return {
    id,
    kind: "message",
    name: filename,
    status: "imported",
    document: result.document,
    analysis: result.analysis,
    documentStatus: result.document.status,
  };
}
