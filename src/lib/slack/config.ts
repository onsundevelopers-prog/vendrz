/* ------------------------------------------------------------------ */
/*  Slack integration - server-only configuration.                     */
/*                                                                     */
/*  Reads the Slack app credentials from the environment. Never expose */
/*  these values to the browser.                                       */
/*                                                                     */
/*  Least-privilege user token scopes (granted to the signed-in user's */
/*  own token, never a bot):                                           */
/*    search:read  - search the user's messages and files              */
/*    files:read   - read file metadata + download files the user can  */
/*                   access (needed to import a selected file)         */
/*    users:read   - resolve sender names for search results           */
/*                                                                     */
/*  SLACK_SIGNING_SECRET / SLACK_VERIFICATION_TOKEN are NOT required   */
/*  for this flow: they only matter for Slack-initiated requests       */
/*  (events / slash commands), which this integration does not         */
/*  subscribe to. They are listed in .env.example for completeness.    */
/* ------------------------------------------------------------------ */

export const SLACK_USER_SCOPES = ["search:read", "files:read", "users:read"];

export const SLACK_AUTHORIZE_URL = "https://slack.com/oauth/v2/authorize";
export const SLACK_API_BASE = "https://slack.com/api";

export interface SlackClientConfig {
  clientId: string;
  clientSecret: string;
}

/** Whether a Slack app client is configured at all. */
export function isSlackConfigured(): boolean {
  return !!(
    process.env.SLACK_CLIENT_ID?.trim() &&
    process.env.SLACK_CLIENT_SECRET?.trim()
  );
}

/** Throw a clear error when the Slack client is missing. */
export function getClientConfig(): SlackClientConfig {
  const clientId = process.env.SLACK_CLIENT_ID?.trim();
  const clientSecret = process.env.SLACK_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error(
      "Slack is not configured. Set SLACK_CLIENT_ID and SLACK_CLIENT_SECRET."
    );
  }
  return { clientId, clientSecret };
}

/**
 * The redirect URI Slack sends the authorization code back to. Defaults
 * to `<origin>/api/slack/callback` so dev and production both work - as
 * long as the exact URL is registered in the Slack app's Redirect URLs.
 * Override with SLACK_REDIRECT_URI.
 */
export function getRedirectUri(origin: string): string {
  return (
    process.env.SLACK_REDIRECT_URI?.trim() ||
    `${origin}/api/slack/callback`
  );
}
