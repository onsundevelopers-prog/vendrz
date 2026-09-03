/* ------------------------------------------------------------------ */
/*  Encrypted token file store - shared by the Google Drive and Slack  */
/*  integrations (the Gmail integration keeps its own copy under       */
/*  lib/gmail/store.ts).                                               */
/*                                                                     */
/*  Tokens never leave the server and are never sent to the browser.   */
/*  Storage is a per-process in-memory map, optionally persisted to    */
/*  disk encrypted with AES-256-GCM so restarts don't drop tokens.     */
/*                                                                     */
/*  Env (per integration, named by the caller):                        */
/*    <INTEGRATION>_TOKEN_FILE    - path of the encrypted-at-rest      */
/*                                  store file. Omit for memory-only.  */
/*                                  On Render, point this at the       */
/*                                  mounted persistent disk (/data).   */
/*    <INTEGRATION>_TOKEN_SECRET  - passphrase for AES-256-GCM.        */
/*                                  Required when the file is set.     */
/*    GMAIL_TOKEN_SECRET          - fallback passphrase so deployments */
/*                                  that already manage one secret for */
/*                                  Gmail can persist Drive/Slack      */
/*                                  tokens without adding another.     */
/* ------------------------------------------------------------------ */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export interface TokenStore<T extends Record<string, unknown>> {
  get(key: string): Promise<T | null>;
  save(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
}

interface TokenStoreOptions {
  /** Log prefix + salt discriminator, e.g. "drive" or "slack". */
  integration: string;
  /** Env var name holding the optional token file path. */
  fileEnv: string;
  /** Env var name holding the AES passphrase (falls back to GMAIL_TOKEN_SECRET). */
  secretEnv: string;
}

const memory = new Map<string, Map<string, Record<string, unknown>>>();
const loaded = new Set<string>();
const writeChains = new Map<string, Promise<void>>();

function tokenFilePath(fileEnv: string): string | null {
  const p = process.env[fileEnv]?.trim();
  return p || null; // unset -> memory-only (tokens lost on restart)
}

function secretFor(integration: string, secretEnv: string): string | null {
  return (
    process.env[secretEnv]?.trim() ||
    process.env.GMAIL_TOKEN_SECRET?.trim() ||
    null
  );
}

function saltFor(integration: string): string {
  return `n4ma-${integration}-tokens-v1`;
}

function encrypt(integration: string, secretEnv: string, plaintext: string): string {
  const secret = secretFor(integration, secretEnv);
  if (!secret) {
    throw new Error(
      `${integration.toUpperCase()}_TOKEN_SECRET (or GMAIL_TOKEN_SECRET) is not set - cannot persist tokens at rest.`
    );
  }
  const key = crypto.scryptSync(secret, saltFor(integration), 32);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), enc.toString("base64")].join(".");
}

function decrypt(integration: string, secretEnv: string, payload: string): string {
  const secret = secretFor(integration, secretEnv);
  if (!secret) {
    throw new Error(
      `${integration.toUpperCase()}_TOKEN_SECRET (or GMAIL_TOKEN_SECRET) is not set - cannot read persisted tokens.`
    );
  }
  const [ivB64, tagB64, dataB64] = payload.split(".");
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("Malformed encrypted token payload.");
  }
  const key = crypto.scryptSync(secret, saltFor(integration), 32);
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

function chainFor(integration: string): Promise<void> {
  let chain = writeChains.get(integration);
  if (!chain) {
    chain = Promise.resolve();
    writeChains.set(integration, chain);
  }
  return chain;
}

function fileFor(fileEnv: string): string | null {
  return tokenFilePath(fileEnv);
}

async function loadFromDisk(
  integration: string,
  fileEnv: string,
  secretEnv: string
): Promise<void> {
  if (loaded.has(integration)) return;
  loaded.add(integration);
  const file = fileFor(fileEnv);
  if (!file) return;
  try {
    const raw = await fs.promises.readFile(/* turbopackIgnore: true */ file, "utf8");
    const parsed = JSON.parse(raw) as Record<string, string>;
    const entries = new Map<string, Record<string, unknown>>();
    for (const [key, payload] of Object.entries(parsed)) {
      try {
        entries.set(key, JSON.parse(decrypt(integration, secretEnv, payload)) as Record<string, unknown>);
      } catch {
        // A single unreadable record (e.g. rotated secret) must not kill
        // the whole store - the user just reconnects.
      }
    }
    memory.set(integration, entries);
  } catch {
    // No file yet (or unreadable) - start empty.
  }
}

async function persist(integration: string, fileEnv: string, secretEnv: string): Promise<void> {
  const file = fileFor(fileEnv);
  if (!file || !secretFor(integration, secretEnv)) return; // memory-only
  const entries = memory.get(integration);
  const payload: Record<string, string> = {};
  if (entries) {
    for (const [key, tokens] of entries) {
      payload[key] = encrypt(integration, secretEnv, JSON.stringify(tokens));
    }
  }
  await fs.promises.mkdir(path.dirname(/* turbopackIgnore: true */ file), { recursive: true });
  await fs.promises.writeFile(/* turbopackIgnore: true */ file, JSON.stringify(payload, null, 2), "utf8");
}

/** Build a per-integration token store keyed by Clerk user id. */
export function createTokenStore<T extends Record<string, unknown>>(
  opts: TokenStoreOptions
): TokenStore<T> {
  const { integration, fileEnv, secretEnv } = opts;

  async function ensureLoaded(): Promise<void> {
    if (!loaded.has(integration)) {
      await loadFromDisk(integration, fileEnv, secretEnv);
    }
  }

  return {
    async get(key: string): Promise<T | null> {
      await ensureLoaded();
      const entries = memory.get(integration);
      const raw = entries?.get(key);
      return raw ? ({ ...raw } as T) : null;
    },
    async save(key: string, value: T): Promise<void> {
      await ensureLoaded();
      let entries = memory.get(integration);
      if (!entries) {
        entries = new Map();
        memory.set(integration, entries);
      }
      entries.set(key, { ...value });
      const chain = chainFor(integration).then(() =>
        persist(integration, fileEnv, secretEnv)
      );
      writeChains.set(integration, chain);
      await chain;
    },
    async delete(key: string): Promise<void> {
      await ensureLoaded();
      const entries = memory.get(integration);
      if (entries) entries.delete(key);
      const chain = chainFor(integration).then(() =>
        persist(integration, fileEnv, secretEnv)
      );
      writeChains.set(integration, chain);
      await chain;
    },
  };
}
