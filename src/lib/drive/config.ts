/* ------------------------------------------------------------------ */
/*  Google Drive OAuth - server-only configuration.                    */
/*                                                                     */
/*  Reads the Google OAuth client credentials from the environment.    */
/*  Never expose these values to the browser.                          */
/*                                                                     */
/*  Env (resolution order shown):                                      */
/*    GOOGLE_DRIVE_CLIENT_ID / GOOGLE_DRIVE_CLIENT_SECRET              */
/*    GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET                          */
/*    GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET (Gmail's     */
/*      existing client - fine in dev when both redirect URIs are      */
/*      registered on the same OAuth client)                           */
/* ------------------------------------------------------------------ */

/** Read-only access to the user's Drive files (metadata + content). */
export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.readonly";

export const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/auth";
export const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke";
export const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";

export interface DriveClientConfig {
  clientId: string;
  clientSecret: string;
}

function firstDefined(...values: Array<string | undefined>): string | undefined {
  for (const v of values) {
    if (v?.trim()) return v.trim();
  }
  return undefined;
}

/** Whether a Google OAuth client is configured at all. */
export function isDriveOAuthConfigured(): boolean {
  return !!getClientId();
}

function getClientId(): string | undefined {
  return firstDefined(
    process.env.GOOGLE_DRIVE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_ID
  );
}

function getClientSecret(): string | undefined {
  return firstDefined(
    process.env.GOOGLE_DRIVE_CLIENT_SECRET,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET
  );
}

/** Throw a clear error when the OAuth client is missing. */
export function getClientConfig(): DriveClientConfig {
  const clientId = getClientId();
  const clientSecret = getClientSecret();
  if (!clientId || !clientSecret) {
    throw new Error(
      "Google Drive OAuth is not configured. Set GOOGLE_DRIVE_CLIENT_ID/SECRET (or GOOGLE_CLIENT_ID/SECRET, or the Gmail GOOGLE_OAUTH_CLIENT_ID/SECRET pair)."
    );
  }
  return { clientId, clientSecret };
}

/**
 * The redirect URI Google sends the authorization code back to.
 * Defaults to `<origin>/api/drive/callback` so dev and production both
 * work without config - as long as the exact URL is registered in the
 * Google Cloud console. Override with GOOGLE_DRIVE_REDIRECT_URI.
 */
export function getRedirectUri(origin: string): string {
  return (
    process.env.GOOGLE_DRIVE_REDIRECT_URI?.trim() ||
    `${origin}/api/drive/callback`
  );
}
