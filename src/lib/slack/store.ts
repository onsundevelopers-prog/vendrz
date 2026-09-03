/* ------------------------------------------------------------------ */
/*  Slack token store - server-side, secure.                           */
/*                                                                     */
/*  Tokens never leave the server and are never sent to the browser.   */
/*  Backed by the shared encrypted-at-rest file store (lib/oauth/      */
/*  fileStore.ts) so connections survive restarts when a token file    */
/*  + passphrase are configured.                                       */
/*                                                                     */
/*  Env:                                                               */
/*    SLACK_TOKEN_FILE    - path of the encrypted-at-rest store file.  */
/*                          Omit for memory-only (tokens lost on       */
/*                          restart, user reconnects). On Render,      */
/*                          point this at a mounted persistent disk.   */
/*    SLACK_TOKEN_SECRET  - passphrase for AES-256-GCM (falls back to  */
/*                          GMAIL_TOKEN_SECRET). Required when the     */
/*                          file is set.                               */
/* ------------------------------------------------------------------ */

import { createTokenStore } from "@/lib/oauth/fileStore";

export type StoredSlackTokens = {
  /** Slack user token (xoxp-...) - long-lived; revoked only by the user. */
  userToken: string;
  /** Slack user id the account authorized as. */
  slackUserId: string;
  /** Workspace (team) id + name. */
  teamId: string;
  teamName: string;
  /** Workspace URL, e.g. https://acme.slack.com (from auth.test). */
  workspaceUrl: string | null;
  /** Comma/space separated user scopes granted. */
  scope: string;
  /** ISO timestamp of the original connection. */
  connectedAt: string;
}

export const slackTokenStore = createTokenStore<StoredSlackTokens>({
  integration: "slack",
  fileEnv: "SLACK_TOKEN_FILE",
  secretEnv: "SLACK_TOKEN_SECRET",
});

export async function getStoredTokens(
  userId: string
): Promise<StoredSlackTokens | null> {
  return slackTokenStore.get(userId);
}

export async function saveTokens(
  userId: string,
  tokens: StoredSlackTokens
): Promise<void> {
  await slackTokenStore.save(userId, tokens);
}

export async function deleteTokens(userId: string): Promise<void> {
  await slackTokenStore.delete(userId);
}
