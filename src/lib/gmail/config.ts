/* ------------------------------------------------------------------ */
/*  Gmail OAuth - server-only configuration.                           */
/*                                                                     */
/*  Reads the Google OAuth client credentials from the environment.    */
/*  Never expose these values to the browser.                          */
/* ------------------------------------------------------------------ */

/** Read-only access to the connected mailbox (profile + messages). */
export const GMAIL_SCOPE =
  "https://www.googleapis.com/auth/gmail.readonly";

export const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/auth";
export const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke";
export const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1";

export interface GmailClientConfig {
  clientId: string;
  clientSecret: string;
}

/** Whether a Google OAuth client is configured at all. */
export function isGmailOAuthConfigured(): boolean {
  return !!(
    process.env.GOOGLE_OAUTH_CLIENT_ID &&
    process.env.GOOGLE_OAUTH_CLIENT_SECRET
  );
}

/** Throw a clear error when the OAuth client is missing. */
export function getClientConfig(): GmailClientConfig {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "Gmail OAuth is not configured. Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET."
    );
  }
  return { clientId, clientSecret };
}

/**
 * The redirect URI Google sends the authorization code back to.
 * Defaults to `<origin>/api/gmail/callback` so dev and production both
 * work without config - as long as the exact URL is registered in the
 * Google Cloud console. Override with GOOGLE_OAUTH_REDIRECT_URI.
 */
export function getRedirectUri(origin: string): string {
  return (
    process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim() ||
    `${origin}/api/gmail/callback`
  );
}
