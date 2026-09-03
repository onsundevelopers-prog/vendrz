/* ------------------------------------------------------------------ */
/*  Google Drive token store - server-side, secure.                    */
/*                                                                     */
/*  Tokens never leave the server and are never sent to the browser.   */
/*  Backed by the shared encrypted-at-rest file store (lib/oauth/      */
/*  fileStore.ts) so connections survive restarts when a token file    */
/*  + passphrase are configured.                                       */
/*                                                                     */
/*  Env:                                                               */
/*    DRIVE_TOKEN_FILE    - path of the encrypted-at-rest store file.  */
/*                          Omit for memory-only (tokens lost on       */
/*                          restart, user reconnects). On Render,      */
/*                          point this at a mounted persistent disk.   */
/*    DRIVE_TOKEN_SECRET  - passphrase for AES-256-GCM (falls back to  */
/*                          GMAIL_TOKEN_SECRET). Required when the     */
/*                          file is set.                               */
/* ------------------------------------------------------------------ */

import { createTokenStore } from "@/lib/oauth/fileStore";

export type StoredDriveTokens = {
  /** OAuth access token (short-lived, ~1h). */
  accessToken: string;
  /** OAuth refresh token (long-lived). Null only if Google issued none. */
  refreshToken: string | null;
  /** Epoch ms at which the access token expires. */
  expiryMs: number;
  /** Space-separated scopes granted by the user. */
  scope: string;
  /** Google account display name + email of the authorized user. */
  name: string | null;
  email: string | null;
  /** ISO timestamp of the original connection. */
  connectedAt: string;
}

export const driveTokenStore = createTokenStore<StoredDriveTokens>({
  integration: "drive",
  fileEnv: "DRIVE_TOKEN_FILE",
  secretEnv: "DRIVE_TOKEN_SECRET",
});

export async function getStoredTokens(
  userId: string
): Promise<StoredDriveTokens | null> {
  return driveTokenStore.get(userId);
}

export async function saveTokens(
  userId: string,
  tokens: StoredDriveTokens
): Promise<void> {
  await driveTokenStore.save(userId, tokens);
}

export async function deleteTokens(userId: string): Promise<void> {
  await driveTokenStore.delete(userId);
}
