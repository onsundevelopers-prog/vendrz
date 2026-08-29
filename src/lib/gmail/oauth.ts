/* ------------------------------------------------------------------ */
/*  Gmail OAuth client + token manager (server-only).                  */
/*                                                                     */
/*  Talks to Google's OAuth2 + Gmail REST APIs with plain fetch - no   */
/*  extra dependencies. Handles:                                       */
/*    - building the authorization URL (offline access, consent)       */
/*    - exchanging the authorization code for tokens                   */
/*    - refreshing expired access tokens transparently                 */
/*    - revoking a connection on disconnect                            */
/*    - reading the user's Gmail data (profile + messages)             */
/*                                                                     */
/*  Errors: expired access tokens auto-refresh; a dead refresh token   */
/*  (revoked / long-expired) surfaces as GmailReconnectRequiredError   */
/*  and the stored connection is removed so the UI can ask the user    */
/*  to reconnect.                                                      */
/* ------------------------------------------------------------------ */

import {
  GMAIL_API_BASE,
  GMAIL_SCOPE,
  GOOGLE_AUTH_URL,
  GOOGLE_REVOKE_URL,
  GOOGLE_TOKEN_URL,
  getClientConfig,
} from "./config";
import { deleteTokens, getStoredTokens, saveTokens } from "./store";

export interface OAuthTokens {
  accessToken: string;
  refreshToken: string | null;
  expiresIn: number;
  scope: string;
}

export class GmailOAuthError extends Error {
  constructor(
    message: string,
    /** Google error code, e.g. "invalid_grant". */
    readonly code?: string
  ) {
    super(message);
    this.name = "GmailOAuthError";
  }
}

/** The user must go through the OAuth flow again to continue. */
export class GmailReconnectRequiredError extends Error {
  constructor(message = "Your Gmail connection needs to be reconnected.") {
    super(message);
    this.name = "GmailReconnectRequiredError";
  }
}

/* ------------------------- auth URL ------------------------- */

export function buildAuthUrl(opts: {
  redirectUri: string;
  state: string;
}): string {
  const { clientId } = getClientConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: opts.redirectUri,
    response_type: "code",
    scope: GMAIL_SCOPE,
    state: opts.state,
    access_type: "offline",
    // Always re-ask so reconnecting issues a fresh refresh token.
    prompt: "consent",
    include_granted_scopes: "true",
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

/* ------------------------- token endpoints ------------------------- */

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
  if (!res.ok) {
    const code = typeof data.error === "string" ? data.error : undefined;
    const desc =
      typeof data.error_description === "string" ? data.error_description : "";
    if (code === "invalid_grant") {
      throw new GmailOAuthError(
        "The authorization grant is invalid or has expired.",
        code
      );
    }
    throw new GmailOAuthError(
      desc || `Google OAuth failed (${res.status}).`,
      code
    );
  }
  return data;
}

function parseTokens(data: Record<string, unknown>): OAuthTokens {
  const accessToken =
    typeof data.access_token === "string" ? data.access_token : null;
  if (!accessToken) {
    throw new GmailOAuthError("Google returned no access token.");
  }
  return {
    accessToken,
    refreshToken:
      typeof data.refresh_token === "string" ? data.refresh_token : null,
    expiresIn: typeof data.expires_in === "number" ? data.expires_in : 3600,
    scope: typeof data.scope === "string" ? data.scope : GMAIL_SCOPE,
  };
}

/** Exchange the one-time authorization code for access + refresh tokens. */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<OAuthTokens> {
  const { clientId, clientSecret } = getClientConfig();
  const data = await postForm(
    GOOGLE_TOKEN_URL,
    new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    })
  );
  return parseTokens(data);
}

/** Refresh an expired access token with the stored refresh token. */
export async function refreshAccessToken(
  refreshToken: string
): Promise<OAuthTokens> {
  const { clientId, clientSecret } = getClientConfig();
  const data = await postForm(
    GOOGLE_TOKEN_URL,
    new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    })
  );
  return parseTokens(data);
}

/** Best-effort server-side revocation when the user disconnects. */
export async function revokeGoogleToken(token: string): Promise<void> {
  try {
    await fetch(
      `${GOOGLE_REVOKE_URL}?token=${encodeURIComponent(token)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        signal: AbortSignal.timeout(10_000),
      }
    );
  } catch {
    // Revocation is best-effort; local deletion still proceeds.
  }
}

/* ------------------------- token manager ------------------------- */

const refreshInFlight = new Map<string, Promise<string>>();

/**
 * Return a valid access token for the user, transparently refreshing it
 * when expired. Throws GmailReconnectRequiredError when the connection
 * is gone or the refresh token no longer works (revoked/expired) - in
 * that case the stored tokens are deleted so the UI can prompt for
 * reconnection.
 */
export async function getValidAccessToken(userId: string): Promise<string> {
  const stored = await getStoredTokens(userId);
  if (!stored) {
    throw new GmailReconnectRequiredError(
      "No Gmail connection for this account."
    );
  }
  if (stored.expiryMs - Date.now() > 60_000) return stored.accessToken;
  if (!stored.refreshToken) {
    throw new GmailReconnectRequiredError(
      "This connection cannot be refreshed - reconnect your Gmail account."
    );
  }

  // Deduplicate concurrent refreshes for the same user.
  const inFlight = refreshInFlight.get(userId);
  if (inFlight) return inFlight;

  const refreshing = (async () => {
    try {
      const refreshed = await refreshAccessToken(stored.refreshToken!);
      const updated: typeof stored = {
        ...stored,
        accessToken: refreshed.accessToken,
        expiryMs: Date.now() + (refreshed.expiresIn - 60) * 1000,
        scope: refreshed.scope || stored.scope,
      };
      await saveTokens(userId, updated);
      return updated.accessToken;
    } catch (err) {
      if (err instanceof GmailOAuthError && err.code === "invalid_grant") {
        await deleteTokens(userId);
        throw new GmailReconnectRequiredError(
          "Your Gmail connection expired or was revoked. Reconnect your account to continue."
        );
      }
      throw err;
    } finally {
      refreshInFlight.delete(userId);
    }
  })();
  refreshInFlight.set(userId, refreshing);
  return refreshing;
}

/* ------------------------- Gmail data ------------------------- */

export interface GmailProfile {
  emailAddress: string;
  messagesTotal: number;
  threadsTotal: number;
}

export async function fetchGmailProfile(
  accessToken: string
): Promise<GmailProfile> {
  const res = await fetch(`${GMAIL_API_BASE}/users/me/profile`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    throw new GmailOAuthError(
      `Gmail profile request failed (${res.status}). ${(await res.text()).slice(0, 160)}`
    );
  }
  const d = (await res.json()) as {
    emailAddress?: string;
    messagesTotal?: number;
    threadsTotal?: number;
  };
  return {
    emailAddress: d.emailAddress ?? "",
    messagesTotal: d.messagesTotal ?? 0,
    threadsTotal: d.threadsTotal ?? 0,
  };
}

export interface GmailMessageSummary {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
}

const METADATA_HEADERS = ["From", "Subject", "Date"];

/**
 * List the most recent messages, newest first, with header metadata.
 * Pass a Gmail search query (e.g. "from:stripe.com newer_than:180d").
 */
export async function fetchGmailMessages(
  accessToken: string,
  query = "",
  maxResults = 10
): Promise<GmailMessageSummary[]> {
  const params = new URLSearchParams({ maxResults: String(maxResults) });
  if (query) params.set("q", query);
  const listRes = await fetch(
    `${GMAIL_API_BASE}/users/me/messages?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(15_000),
    }
  );
  if (!listRes.ok) {
    throw new GmailOAuthError(
      `Gmail message list failed (${listRes.status}). ${(await listRes.text()).slice(0, 160)}`
    );
  }
  const list = (await listRes.json()) as {
    messages?: { id: string; threadId?: string }[];
  };
  const items = list.messages ?? [];

  const summaries = await Promise.all(
    items.map(async (m) => {
      const headerParams = METADATA_HEADERS.map(
        (h) => `metadataHeaders=${encodeURIComponent(h)}`
      ).join("&");
      const res = await fetch(
        `${GMAIL_API_BASE}/users/me/messages/${m.id}?format=metadata&${headerParams}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: AbortSignal.timeout(15_000),
        }
      );
      if (!res.ok) return null;
      const d = (await res.json()) as {
        id?: string;
        threadId?: string;
        snippet?: string;
        payload?: { headers?: { name?: string; value?: string }[] };
      };
      const headers = d.payload?.headers ?? [];
      const get = (name: string) =>
        headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())
          ?.value ?? "";
      return {
        id: d.id ?? m.id,
        threadId: d.threadId ?? m.threadId ?? m.id,
        subject: get("subject"),
        from: get("from"),
        date: get("date"),
        snippet: d.snippet ?? "",
      };
    })
  );

  return summaries.filter(
    (s): s is GmailMessageSummary => s !== null
  );
}
