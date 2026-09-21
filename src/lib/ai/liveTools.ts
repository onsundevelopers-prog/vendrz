/* ------------------------------------------------------------------ */
/*  Live source tools - Slack + Gmail, queried for real at call time.  */
/*                                                                     */
/*  The base AGENT_TOOLS in lib/ai/agentTools.ts are pure functions    */
/*  over the workspace snapshot the client sent (contracts, stored     */
/*  threads, activity). That is fast and works offline, but it means   */
/*  the agent could only ever "read email" that had already been       */
/*  copied into the workspace, and Slack was not reachable at all.     */
/*                                                                     */
/*  These tools are different: they hit the real providers        .    */
/*  server-side with the signed-in user's stored token, so the agent   */
/*  can search Slack and read Gmail messages that were never imported. */
/*                                                                     */
/*  Contract with the caller: executeLiveTool returns                */
/*    - a JSON string when it owns the tool (including "not connected" */
/*      and "wrong scope" paths, which must stay honest),             */
/*    - null when the call is not a live tool, so the caller falls     */
/*      back to the synchronous AGENT_TOOLS executor.                 */
/*                                                                     */
/*  Server-only: reads encrypted token stores for the given userId.    */
/*  No token ever leaves this process or reaches the model.            */
/* ------------------------------------------------------------------ */

import type { ToolCall, ToolDefinition } from "./provider";
import { getStoredTokens as getStoredSlackTokens } from "@/lib/slack/store";
import {
  SlackApiError,
  searchSlackFiles,
  searchSlackMessages,
} from "@/lib/slack/oauth";
import {
  GmailReconnectRequiredError,
  fetchGmailMessages,
  getValidAccessToken,
} from "@/lib/gmail/oauth";
import { getStoredTokens as getStoredGmailTokens } from "@/lib/gmail/store";

/** Tools that reach outside the workspace snapshot. */
export const LIVE_SOURCE_TOOLS: ToolDefinition[] = [
  {
    name: "search_slack",
    description:
      "Search the user's connected Slack for vendor messages and files (contracts, invoices, renewal notices, negotiations). Reads Slack directly with the user's own authorization. Reports honestly when Slack is not connected or nothing matches - never invents results.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Slack search query, e.g. \"renewal\" or \"from:@vendor invoice\" or \"has:pdf agreement\"",
        },
        type: {
          type: "string",
          enum: ["messages", "files", "both"],
          description: "What to search (default both)",
        },
        count: { type: "number", description: "Max results per kind (default 10)" },
      },
      required: ["query"],
    },
  },
  {
    name: "read_gmail",
    description:
      "Read real messages from the user's connected Gmail using Gmail search syntax. Returns sender, subject, date and snippet for each match. Use this to read actual vendor correspondence that is not stored in the workspace. Reports honestly when Gmail is not connected or nothing matches.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Gmail search query, e.g. \"from:stripe.com newer_than:180d\", \"subject:renewal\", \"invoice\"",
        },
        max_results: { type: "number", description: "Max messages to read (default 10)" },
      },
      required: ["query"],
    },
  },
];

export interface LiveToolContext {
  /** Clerk user id - the key for both token stores. */
  userId: string;
}

/* ----------------------------- helpers ----------------------------- */

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(Math.floor(n), min), max);
}

/** A stored Slack authorization that Slack has since rejected. */
function isSlackAuthDead(err: unknown): boolean {
  if (err instanceof SlackApiError) {
    return ["token_revoked", "invalid_auth", "account_inactive", "missing_scope", "not_authed"].includes(
      err.code ?? ""
    );
  }
  return false;
}

/* ------------------------------ Slack ------------------------------ */

async function searchSlack(args: Record<string, unknown>, userId: string): Promise<string> {
  const tokens = await getStoredSlackTokens(userId);
  if (!tokens) {
    return JSON.stringify({
      connected: false,
      searched: false,
      note: "Slack is not connected for this account. Connect Slack on the Import page to let the agent search it - nothing was searched.",
    });
  }

  const query = String(args.query ?? "").trim();
  if (!query) {
    return JSON.stringify({ connected: true, searched: false, error: "No search query provided." });
  }

  const kind = args.type === "messages" || args.type === "files" ? args.type : "both";
  const count = clampInt(args.count, 10, 1, 25);

  try {
    const out: Record<string, unknown> = {
      connected: true,
      searched: true,
      workspace: tokens.teamName || null,
      query,
    };

    if (kind !== "files") {
      const messages = await searchSlackMessages(tokens.userToken, query, count);
      out.message_total = messages.total;
      out.messages = messages.matches.map((m) => ({
        channel: m.channelName,
        from: m.username || m.user || null,
        date: m.ts,
        text: m.text,
        permalink: m.permalink || null,
      }));
    }

    if (kind !== "messages") {
      const files = await searchSlackFiles(tokens.userToken, query, count);
      out.file_total = files.total;
      out.files = files.matches.map((f) => ({
        name: f.name,
        filetype: f.filetype,
        size: f.size,
        from: f.username || f.user || null,
        permalink: f.permalink || null,
        importable: f.importable,
        import_hint: f.importHint,
      }));
    }

    const found = (out.messages as unknown[] | undefined)?.length ?? 0;
    const foundFiles = (out.files as unknown[] | undefined)?.length ?? 0;
    out.note =
      found + foundFiles > 0
        ? `Found ${found} message(s) and ${foundFiles} file(s) in Slack.`
        : "Slack is connected but nothing in this workspace matched that query - nothing was found.";
    return JSON.stringify(out);
  } catch (err) {
    if (isSlackAuthDead(err)) {
      // Report the truth; the status endpoint owns clearing the connection.
      return JSON.stringify({
        connected: false,
        searched: false,
        reconnect_required: true,
        note: "The stored Slack authorization is no longer valid. Reconnect Slack on the Import page, then ask again.",
      });
    }
    return JSON.stringify({
      connected: true,
      searched: false,
      error: err instanceof Error ? err.message : "Slack search failed.",
    });
  }
}

/* ------------------------------ Gmail ------------------------------ */

async function readGmail(args: Record<string, unknown>, userId: string): Promise<string> {
  const query = String(args.query ?? "").trim();
  const maxResults = clampInt(args.max_results, 10, 1, 25);

  let accessToken: string;
  try {
    accessToken = await getValidAccessToken(userId);
  } catch (err) {
    if (err instanceof GmailReconnectRequiredError) {
      return JSON.stringify({
        connected: false,
        searched: false,
        reconnect_required: true,
        note: "The stored Gmail authorization is no longer valid. Reconnect Gmail in Settings, then ask again.",
      });
    }
    throw err;
  }

  const messages = await fetchGmailMessages(accessToken, query, maxResults);
  return JSON.stringify({
    connected: true,
    searched: true,
    query: query || null,
    count: messages.length,
    messages: messages.map((m) => ({
      from: m.from,
      subject: m.subject,
      date: m.date,
      snippet: m.snippet,
      permalink: `https://mail.google.com/mail/u/0/#all/${m.id}`,
    })),
    note:
      messages.length > 0
        ? `Read ${messages.length} message(s) from Gmail.`
        : "Gmail is connected but no messages matched that query.",
  });
}

/**
 * `search_gmail` is declared in AGENT_TOOLS and answered synchronously from
 * the workspace snapshot. When the account really has Gmail connected we
 * take it over and read live mail instead - which is what the tool's own
 * description promises. Without a connection we return null so the
 * synchronous build keeps answering, so offline/demo behaviour is unchanged.
 */
async function searchGmailLive(
  args: Record<string, unknown>,
  userId: string
): Promise<string | null> {
  const stored = await getStoredGmailTokens(userId).catch(() => null);
  if (!stored) return null;
  const query =
    String(args.query ?? "").trim() ||
    (String(args.vendor_name ?? "").trim() ? String(args.vendor_name).trim() : "");
  return readGmail({ query, max_results: args.max_results }, userId);
}

/* ---------------------------- entry point ---------------------------- */

export async function executeLiveTool(
  call: ToolCall,
  ctx: LiveToolContext
): Promise<string | null> {
  try {
    switch (call.name) {
      case "search_slack":
        return await searchSlack(call.arguments, ctx.userId);
      case "read_gmail":
        return await readGmail(call.arguments, ctx.userId);
      case "search_gmail":
        return await searchGmailLive(call.arguments, ctx.userId);
      default:
        return null;
    }
  } catch (err) {
    return JSON.stringify({
      error: err instanceof Error ? err.message : "Live source tool failed.",
    });
  }
}

/**
 * Connection state for the signed-in account, resolved server-side from the
 * token stores. Used to tell the model which sources it can actually reach,
 * so it never promises a Slack search that would fail.
 */
export async function getSourceAvailability(userId: string): Promise<{
  slack: boolean;
  gmail: boolean;
}> {
  const [slack, gmail] = await Promise.all([
    getStoredSlackTokens(userId).catch(() => null),
    getStoredGmailTokens(userId).catch(() => null),
  ]);
  return { slack: !!slack, gmail: !!gmail };
}
