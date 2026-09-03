/* ------------------------------------------------------------------ */
/*  Slack OAuth + Web API client (server-only).                        */
/*                                                                     */
/*  Talks to Slack's OAuth v2 + Web API with plain fetch - no extra    */
/*  dependencies. Uses the signed-in user's own token (user token      */
/*  scopes only - no bot scopes are requested). Handles:               */
/*    - building the authorization URL                                 */
/*    - exchanging the code for a user token                           */
/*    - searching the user's messages and files                        */
/*    - reading file metadata + content the user can access            */
/*    - revoking the token on disconnect                               */
/*                                                                     */
/*  Slack user tokens do not expire on their own; they are revoked     */
/*  only by the user or workspace admin. A revoked / invalid token     */
/*  surfaces as SlackReconnectRequiredError and the stored connection  */
/*  is removed so the UI can ask the user to reconnect.                */
/* ------------------------------------------------------------------ */

import {
  SLACK_API_BASE,
  SLACK_AUTHORIZE_URL,
  SLACK_USER_SCOPES,
  getClientConfig,
} from "./config";
import { deleteTokens, getStoredTokens } from "./store";

export class SlackApiError extends Error {
  constructor(
    message: string,
    /** Slack error code, e.g. "token_revoked". */
    readonly code?: string
  ) {
    super(message);
    this.name = "SlackApiError";
  }
}

/** The user must go through the OAuth flow again to continue. */
export class SlackReconnectRequiredError extends Error {
  constructor(message = "Your Slack connection needs to be reconnected.") {
    super(message);
    this.name = "SlackReconnectRequiredError";
  }
}

/* ------------------------- auth URL ------------------------- */

export function buildAuthUrl(opts: { redirectUri: string; state: string }): string {
  const { clientId } = getClientConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: opts.redirectUri,
    // No bot scopes - the integration only needs the user's own token.
    scope: "",
    user_scope: SLACK_USER_SCOPES.join(","),
    state: opts.state,
  });
  return `${SLACK_AUTHORIZE_URL}?${params.toString()}`;
}

/* ------------------------- token exchange ------------------------- */

export interface SlackTokenResult {
  userToken: string;
  slackUserId: string;
  teamId: string;
  teamName: string;
  scope: string;
}

async function postForm(
  url: string,
  body: URLSearchParams
): Promise<Record<string, unknown>> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    signal: AbortSignal.timeout(15_000),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return data;
}

function assertSlackOk(data: Record<string, unknown>): void {
  if (data.ok === true) return;
  const code = typeof data.error === "string" ? data.error : undefined;
  const desc = typeof data.warning === "string" ? data.warning : "";
  throw new SlackApiError(
    desc || (code ? `Slack API error: ${code}` : "Slack API error."),
    code
  );
}

/** Exchange the one-time code for the user token (oauth.v2.access). */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<SlackTokenResult> {
  const { clientId, clientSecret } = getClientConfig();
  const data = await postForm(
    `${SLACK_API_BASE}/oauth.v2.access`,
    new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    })
  );
  assertSlackOk(data);

  const authedUser = data.authed_user as
    | { id?: string; access_token?: string; scope?: string }
    | undefined;
  const userToken = authedUser?.access_token;
  const slackUserId = authedUser?.id;
  if (!userToken || !slackUserId) {
    throw new SlackApiError(
      "Slack didn't return a user token. Reinstall the app with user scopes enabled."
    );
  }
  const team = (data.team as { id?: string; name?: string } | undefined) ?? {};
  return {
    userToken,
    slackUserId,
    teamId: team.id ?? "",
    teamName: team.name ?? "",
    scope: authedUser?.scope ?? SLACK_USER_SCOPES.join(","),
  };
}

/** Best-effort server-side revocation when the user disconnects. */
export async function revokeSlackToken(token: string): Promise<void> {
  try {
    const data = await postForm(
      `${SLACK_API_BASE}/auth.revoke`,
      new URLSearchParams({ token })
    );
    assertSlackOk(data);
  } catch {
    // Revocation is best-effort; local deletion still proceeds.
  }
}

/* ------------------------- token manager ------------------------- */

/**
 * Return the stored user token for the account. Slack user tokens don't
 * expire, but they can be revoked - the caller-facing API calls detect
 * that and raise SlackReconnectRequiredError through
 * handleReconnectRequired(), which deletes the stored connection.
 */
export async function getUserToken(userId: string): Promise<string> {
  const stored = await getStoredTokens(userId);
  if (!stored) {
    throw new SlackReconnectRequiredError(
      "No Slack connection for this account."
    );
  }
  return stored.userToken;
}

/**
 * Call when Slack reports a dead token (token_revoked / invalid_auth /
 * account_inactive): drop the stored connection and surface a
 * reconnect-required error so the UI can prompt the user.
 */
export async function handleReconnectRequired(userId: string, cause: unknown): Promise<never> {
  await deleteTokens(userId);
  if (cause instanceof SlackApiError) {
    throw new SlackReconnectRequiredError(
      cause.code === "token_revoked"
        ? "Your Slack authorization was revoked. Reconnect Slack to continue."
        : "Your Slack connection expired or was revoked. Reconnect Slack to continue."
    );
  }
  throw new SlackReconnectRequiredError(
    "Your Slack connection expired or was revoked. Reconnect Slack to continue."
  );
}

/* ------------------------- auth.test ------------------------- */

export interface SlackAuthTest {
  userId: string;
  teamId: string;
  teamName: string;
  workspaceUrl: string;
}

export async function authTest(token: string): Promise<SlackAuthTest> {
  const data = await postForm(
    `${SLACK_API_BASE}/auth.test`,
    new URLSearchParams({ token })
  );
  assertSlackOk(data);
  return {
    userId: typeof data.user_id === "string" ? data.user_id : "",
    teamId: typeof data.team_id === "string" ? data.team_id : "",
    teamName: typeof data.team === "string" ? data.team : "",
    workspaceUrl: typeof data.url === "string" ? data.url : "",
  };
}

/* ------------------------- search ------------------------- */

export interface SlackMessageHit {
  kind: "message";
  channelId: string;
  channelName: string;
  user: string;
  username: string;
  ts: string;
  text: string;
  permalink: string;
}

export interface SlackFileHit {
  kind: "file";
  id: string;
  name: string;
  filetype: string;
  mimetype: string;
  size: number | null;
  user: string;
  username: string;
  permalink: string;
  created: number | null;
  /** Channels the file was shared in (names, when resolvable). */
  channelNames: string[];
  /** Whether this file can be downloaded + analyzed by the app. */
  importable: boolean;
  /** Human-readable reason when not importable. */
  importHint: string | null;
}

const FILETYPE_KIND: Record<string, "pdf" | "docx" | "txt" | "csv" | "md"> = {
  pdf: "pdf",
  docx: "docx",
  text: "txt",
  txt: "txt",
  markdown: "md",
  csv: "csv",
  space: "txt", // Slack "post" (rich text note)
};

/** Map a Slack filetype to the downstream pipeline kind (null = unsupported). */
export function slackFileKind(filetype: string): "pdf" | "docx" | "txt" | "csv" | "md" | null {
  return FILETYPE_KIND[filetype.toLowerCase()] ?? null;
}

async function apiGet(
  token: string,
  method: string,
  params: Record<string, string>
): Promise<Record<string, unknown>> {
  const qs = new URLSearchParams({ token, ...params });
  const res = await fetch(`${SLACK_API_BASE}/${method}?${qs.toString()}`, {
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    throw new SlackApiError(`Slack ${method} failed (HTTP ${res.status}).`);
  }
  const data = (await res.json()) as Record<string, unknown>;
  if (data.ok === true) return data;
  const code = typeof data.error === "string" ? data.error : "unknown_error";
  throw new SlackApiError(
    code === "missing_scope"
      ? "This workspace hasn't granted the required Slack permissions. Reconnect Slack."
      : `Slack ${method} error: ${code}`,
    code
  );
}

function channelLabel(channel: {
  id?: string;
  name?: string;
  is_im?: boolean;
  is_mpim?: boolean;
} | null): string {
  if (!channel) return "";
  if (channel.name) {
    if (channel.name.startsWith("D")) return `DM with ${channel.name.slice(1)}`;
    return channel.name;
  }
  if (channel.is_im) return "Direct message";
  return channel.id ?? "";
}

/** users.info - resolve a sender display name (user token + users:read). */
export async function fetchUserName(
  token: string,
  userId: string
): Promise<string | null> {
  try {
    const data = await apiGet(token, "users.info", { user: userId });
    const user = data.user as
      | { name?: string; real_name?: string; profile?: { display_name?: string } }
      | undefined;
    return (
      user?.profile?.display_name ||
      user?.real_name ||
      user?.name ||
      null
    );
  } catch {
    return null;
  }
}

export async function searchSlackMessages(
  token: string,
  query: string,
  count = 20
): Promise<{ matches: SlackMessageHit[]; total: number }> {
  const data = await apiGet(token, "search.messages", {
    query,
    count: String(Math.min(Math.max(count, 1), 100)),
    sort: "timestamp",
    sort_dir: "desc",
  });
  const messages = data.messages as
    | {
        matches?: Array<{
          channel?: { id?: string; name?: string; is_im?: boolean; is_mpim?: boolean };
          user?: string;
          username?: string;
          ts?: string;
          text?: string;
          permalink?: string;
        }>;
        total?: number;
      }
    | undefined;
  const matches = (messages?.matches ?? []).map((m): SlackMessageHit => ({
    kind: "message",
    channelId: m.channel?.id ?? "",
    channelName: channelLabel(m.channel ?? null),
    user: m.user ?? "",
    username: m.username ?? "",
    ts: m.ts ?? "",
    text: m.text ?? "",
    permalink: m.permalink ?? "",
  }));
  // Resolve sender display names when the search payload didn't include one.
  const missing = matches.filter((m) => !m.username && m.user);
  if (missing.length > 0) {
    const names = new Map<string, string>();
    await Promise.all(
      [...new Set(missing.map((m) => m.user))].slice(0, 10).map(async (uid) => {
        const name = await fetchUserName(token, uid);
        if (name) names.set(uid, name);
      })
    );
    for (const m of matches) {
      if (!m.username && names.has(m.user)) m.username = names.get(m.user) as string;
    }
  }
  return { matches, total: messages?.total ?? matches.length };
}

export async function searchSlackFiles(
  token: string,
  query: string,
  count = 20
): Promise<{ matches: SlackFileHit[]; total: number }> {
  const data = await apiGet(token, "search.files", {
    query,
    count: String(Math.min(Math.max(count, 1), 100)),
    sort: "timestamp",
    sort_dir: "desc",
  });
  const files = data.files as
    | {
        matches?: Array<{
          id?: string;
          name?: string;
          filetype?: string;
          mimetype?: string;
          size?: number;
          user?: string;
          username?: string;
          permalink?: string;
          created?: number;
          channels?: string[];
          mode?: string;
        }>;
        total?: number;
      }
    | undefined;
  const rawMatches = files?.matches ?? [];
  const matches = rawMatches.map((f): SlackFileHit => {
    const name = f.name ?? "Untitled file";
    const kind = slackFileKind(f.filetype ?? "");
    return {
      kind: "file",
      id: f.id ?? "",
      name,
      filetype: f.filetype ?? "",
      mimetype: f.mimetype ?? "",
      size: typeof f.size === "number" ? f.size : null,
      user: f.user ?? "",
      username: f.username ?? "",
      permalink: f.permalink ?? "",
      created: typeof f.created === "number" ? f.created : null,
      channelNames: Array.isArray(f.channels) ? f.channels : [],
      importable: kind !== null && f.mode !== "external" && f.mode !== "hidden_by_limit",
      importHint:
        kind === null
          ? "This file type isn't supported for contract analysis."
          : f.mode === "external"
            ? "External files can't be downloaded by the app."
            : null,
    };
  });
  // Resolve display names where the file search omitted them.
  const missing = matches.filter((m) => !m.username && m.user);
  if (missing.length > 0) {
    const names = new Map<string, string>();
    await Promise.all(
      [...new Set(missing.map((m) => m.user))].slice(0, 10).map(async (uid) => {
        const name = await fetchUserName(token, uid);
        if (name) names.set(uid, name);
      })
    );
    for (const m of matches) {
      if (!m.username && names.has(m.user)) m.username = names.get(m.user) as string;
    }
  }
  return { matches, total: files?.total ?? matches.length };
}

/* ------------------------- file content ------------------------- */

/** files.info - server-side refetch so imports never trust the client. */
export async function fetchSlackFileInfo(
  token: string,
  fileId: string
): Promise<{
  id: string;
  name: string;
  filetype: string;
  mimetype: string;
  urlPrivate: string | null;
  permalink: string;
} | null> {
  const data = await apiGet(token, "files.info", { file: fileId });
  const f = data.file as
    | {
        id?: string;
        name?: string;
        filetype?: string;
        mimetype?: string;
        url_private?: string;
        permalink?: string;
      }
    | undefined;
  if (!f?.id) return null;
  return {
    id: f.id,
    name: f.name ?? "Untitled file",
    filetype: f.filetype ?? "",
    mimetype: f.mimetype ?? "",
    urlPrivate: f.url_private ?? null,
    permalink: f.permalink ?? "",
  };
}

/** Download a file the user can access via its private URL. */
export async function downloadSlackFile(
  token: string,
  urlPrivate: string
): Promise<Buffer> {
  const res = await fetch(urlPrivate, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) {
    throw new SlackApiError(`Slack file download failed (HTTP ${res.status}).`);
  }
  return Buffer.from(await res.arrayBuffer());
}
