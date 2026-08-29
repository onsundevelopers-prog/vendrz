/* ------------------------------------------------------------------ */
/*  Gmail token store - server-side, secure.                           */
/*                                                                     */
/*  Tokens never leave the server and are never sent to the browser.   */
/*  Storage is a per-process in-memory map (mirroring jobs.ts /        */
/*  paypalStore.ts), optionally persisted to disk encrypted with       */
/*  AES-256-GCM so restarts don't drop refresh tokens.                 */
/*                                                                     */
/*  Env:                                                               */
/*    GMAIL_TOKEN_FILE    - path of the encrypted-at-rest store file.  */
/*                          Omit for memory-only (tokens lost on       */
/*                          restart, user reconnects). On Render,      */
/*                          point this at a mounted persistent disk.   */
/*    GMAIL_TOKEN_SECRET  - passphrase for AES-256-GCM. Required when  */
/*                          GMAIL_TOKEN_FILE is set.                   */
/* ------------------------------------------------------------------ */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export interface StoredGmailTokens {
  /** OAuth access token (short-lived, ~1h). */
  accessToken: string;
  /** OAuth refresh token (long-lived). Null only if Google issued none. */
  refreshToken: string | null;
  /** Epoch ms at which the access token expires. */
  expiryMs: number;
  /** Space-separated scopes granted by the user. */
  scope: string;
  /** Gmail address the user authorized. */
  email: string | null;
  /** ISO timestamp of the original connection. */
  connectedAt: string;
}

const SALT = "noma-gmail-tokens-v1";

const memory = new Map<string, StoredGmailTokens>();
let loaded = false;
let writeChain: Promise<void> = Promise.resolve();

function tokenFilePath(): string | null {
  const p = process.env.GMAIL_TOKEN_FILE?.trim();
  return p || null;
}

/* ------------------------- encryption ------------------------- */

function encrypt(plaintext: string): string {
  const secret = process.env.GMAIL_TOKEN_SECRET;
  if (!secret) {
    throw new Error("GMAIL_TOKEN_SECRET is not set - cannot persist tokens at rest.");
  }
  const key = crypto.scryptSync(secret, SALT, 32);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), enc.toString("base64")].join(".");
}

function decrypt(payload: string): string {
  const secret = process.env.GMAIL_TOKEN_SECRET;
  if (!secret) {
    throw new Error("GMAIL_TOKEN_SECRET is not set - cannot read persisted tokens.");
  }
  const [ivB64, tagB64, dataB64] = payload.split(".");
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("Malformed encrypted token payload.");
  }
  const key = crypto.scryptSync(secret, SALT, 32);
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(ivB64, "base64")
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

/* ------------------------- persistence ------------------------- */

async function loadFromDisk(): Promise<void> {
  if (loaded) return;
  loaded = true;
  const file = tokenFilePath();
  if (!file) return;
  try {
    const raw = await fs.promises.readFile(/* turbopackIgnore: true */ file, "utf8");
    const parsed = JSON.parse(raw) as Record<string, string>;
    for (const [userId, payload] of Object.entries(parsed)) {
      try {
        memory.set(userId, JSON.parse(decrypt(payload)) as StoredGmailTokens);
      } catch {
        // A single unreadable record (e.g. rotated secret) must not kill
        // the whole store - the user just reconnects.
      }
    }
  } catch {
    // No file yet (or unreadable) - start empty.
  }
}

async function persist(): Promise<void> {
  const file = tokenFilePath();
  if (!file || !process.env.GMAIL_TOKEN_SECRET) return; // memory-only
  const payload: Record<string, string> = {};
  for (const [userId, tokens] of memory) {
    payload[userId] = encrypt(JSON.stringify(tokens));
  }
  await fs.promises.mkdir(path.dirname(/* turbopackIgnore: true */ file), { recursive: true });
  await fs.promises.writeFile(/* turbopackIgnore: true */ file, JSON.stringify(payload, null, 2), "utf8");
}

/* ------------------------- public API ------------------------- */

export async function getStoredTokens(
  userId: string
): Promise<StoredGmailTokens | null> {
  await loadFromDisk();
  return memory.get(userId) ?? null;
}

export async function saveTokens(
  userId: string,
  tokens: StoredGmailTokens
): Promise<void> {
  await loadFromDisk();
  memory.set(userId, tokens);
  // Serialize file writes so concurrent updates can't interleave.
  writeChain = writeChain.then(persist);
  await writeChain;
}

export async function deleteTokens(userId: string): Promise<void> {
  await loadFromDisk();
  memory.delete(userId);
  writeChain = writeChain.then(persist);
  await writeChain;
}
