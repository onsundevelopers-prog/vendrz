/* ------------------------------------------------------------------ */
/*  Google Drive OAuth client + token manager (server-only).           */
/*                                                                     */
/*  Talks to Google's OAuth2 + Drive REST APIs with plain fetch - no   */
/*  extra dependencies. Handles:                                       */
/*    - building the authorization URL (offline access, consent)       */
/*    - exchanging the authorization code for tokens                   */
/*    - refreshing expired access tokens transparently                 */
/*    - revoking a connection on disconnect                            */
/*    - reading Drive metadata and file content                        */
/*                                                                     */
/*  Errors: expired access tokens auto-refresh; a dead refresh token   */
/*  (revoked / long-expired) surfaces as DriveReconnectRequiredError   */
/*  and the stored connection is removed so the UI can ask the user    */
/*  to reconnect.                                                      */
/*                                                                     */
/*  Privacy: this module only ever lists or reads files explicitly     */
/*  searched for or selected by the user - it never walks a Drive.     */
/* ------------------------------------------------------------------ */

import {
  DRIVE_API_BASE,
  DRIVE_SCOPE,
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

export class DriveOAuthError extends Error {
  constructor(
    message: string,
    /** Google error code, e.g. "invalid_grant". */
    readonly code?: string,
    /** HTTP status when raised by a Drive API call. */
    readonly status?: number
  ) {
    super(message);
    this.name = "DriveOAuthError";
  }
}

/** The user must go through the OAuth flow again to continue. */
export class DriveReconnectRequiredError extends Error {
  constructor(message = "Your Google Drive connection needs to be reconnected.") {
    super(message);
    this.name = "DriveReconnectRequiredError";
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
    scope: DRIVE_SCOPE,
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
      throw new DriveOAuthError(
        "The authorization grant is invalid or has expired.",
        code
      );
    }
    throw new DriveOAuthError(
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
    throw new DriveOAuthError("Google returned no access token.");
  }
  return {
    accessToken,
    refreshToken:
      typeof data.refresh_token === "string" ? data.refresh_token : null,
    expiresIn: typeof data.expires_in === "number" ? data.expires_in : 3600,
    scope: typeof data.scope === "string" ? data.scope : DRIVE_SCOPE,
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
 * when expired. Throws DriveReconnectRequiredError when the connection
 * is gone or the refresh token no longer works (revoked/expired) - in
 * that case the stored tokens are deleted so the UI can prompt for
 * reconnection.
 */
export async function getValidAccessToken(userId: string): Promise<string> {
  const stored = await getStoredTokens(userId);
  if (!stored) {
    throw new DriveReconnectRequiredError(
      "No Google Drive connection for this account."
    );
  }
  if (stored.expiryMs - Date.now() > 60_000) return stored.accessToken;
  if (!stored.refreshToken) {
    throw new DriveReconnectRequiredError(
      "This connection cannot be refreshed - reconnect your Google Drive account."
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
      if (err instanceof DriveOAuthError && err.code === "invalid_grant") {
        await deleteTokens(userId);
        throw new DriveReconnectRequiredError(
          "Your Google Drive connection expired or was revoked. Reconnect your account to continue."
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

/* ------------------------- Drive API ------------------------- */

/** Drive `about` profile - the account that authorized the app. */
export interface DriveProfile {
  displayName: string;
  emailAddress: string;
}

export async function fetchDriveProfile(
  accessToken: string
): Promise<DriveProfile> {
  const params = new URLSearchParams({
    fields: "user(displayName,emailAddress)",
  });
  const res = await fetch(`${DRIVE_API_BASE}/about?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    throw new DriveOAuthError(
      `Drive profile request failed (${res.status}).`,
      undefined,
      res.status
    );
  }
  const d = (await res.json()) as {
    user?: { displayName?: string; emailAddress?: string };
  };
  return {
    displayName: d.user?.displayName ?? "",
    emailAddress: d.user?.emailAddress ?? "",
  };
}

/** One Drive file as surfaced in listings (metadata only). */
export interface DriveFileSummary {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string | null;
  createdTime: string | null;
  size: number | null;
  webViewLink: string | null;
  owner: string | null;
  ownerEmail: string | null;
  /** Display path of resolved parent folders (best-effort, 1 level). */
  folder: string | null;
  parents: string[];
  trashed: boolean;
  /** Whether the user can download/export this file through this app. */
  importable: boolean;
  /** Human-readable reason when importable is false. */
  importHint: string | null;
  kind: "folder" | "file" | "shortcut";
  /** For shortcuts: the id of the target file. */
  targetId: string | null;
}

export type DriveImportPlanInput = {
  id: string;
  name: string;
  mimeType: string;
  shortcutDetails?: { targetId?: string } | null;
};

export type DriveImportPlan =
  | { ok: true; kind: "pdf" | "docx" | "txt" | "csv" | "md"; filename: string }
  | { ok: false; hint: string }
  | { shortcut: true; targetId: string };

/**
 * Map a Drive MIME type to the downstream pipeline kind + the filename we
 * should import. Google-native documents are exported to a text format;
 * everything else must be a type the existing extractors understand.
 * Shortcuts resolve to their target file on import.
 */
export function driveFileToImport(file: DriveImportPlanInput): DriveImportPlan {
  const mime = file.mimeType;

  // Shortcuts: resolve to the target file on import.
  if (mime === "application/vnd.google-apps.shortcut") {
    const targetId = file.shortcutDetails?.targetId;
    if (!targetId) {
      return { ok: false, hint: "This shortcut points to a file that can't be read." };
    }
    return { shortcut: true, targetId };
  }

  if (mime === "application/vnd.google-apps.folder") {
    return { ok: false, hint: "Folders can't be imported - select a file inside it." };
  }
  if (mime === "application/vnd.google-apps.document") {
    return { ok: true, kind: "txt", filename: `${baseName(file.name)}.txt` };
  }
  if (mime === "application/vnd.google-apps.spreadsheet") {
    return { ok: true, kind: "csv", filename: `${baseName(file.name)}.csv` };
  }
  if (mime === "application/vnd.google-apps.presentation") {
    return { ok: false, hint: "Google Slides can't be analyzed as a contract. Export to PDF or DOCX and upload it." };
  }
  if (mime === "application/pdf") {
    return { ok: true, kind: "pdf", filename: ensureExt(file.name, "pdf") };
  }
  if (
    mime ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return { ok: true, kind: "docx", filename: ensureExt(file.name, "docx") };
  }
  if (mime === "text/plain" || mime === "text/markdown") {
    const isMd = mime === "text/markdown" || file.name.toLowerCase().endsWith(".md");
    return { ok: true, kind: isMd ? "md" : "txt", filename: ensureExt(file.name, isMd ? "md" : "txt") };
  }
  if (mime === "text/csv") {
    return { ok: true, kind: "csv", filename: ensureExt(file.name, "csv") };
  }
  if (mime === "application/msword") {
    return {
      ok: false,
      hint: "Legacy .doc files can't be analyzed directly. Open it in Google Docs, then import the Docs version.",
    };
  }
  if (
    mime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ) {
    return {
      ok: false,
      hint: "Excel files aren't supported yet. Save the sheet as CSV in Google Sheets and import that.",
    };
  }
  return {
    ok: false,
    hint: "This file type isn't supported for contract analysis.",
  };
}

function baseName(name: string): string {
  const cleaned = name.replace(/\.(docx?|pdf|txt|csv|md|rtf)$/i, "");
  return cleaned.trim() || "document";
}

function ensureExt(name: string, ext: string): string {
  return /\.\w+$/.test(name) ? name : `${name}.${ext}`;
}

/** Download a file's binary content (files.get alt=media). */
export async function downloadDriveFile(
  accessToken: string,
  fileId: string
): Promise<{ bytes: Buffer; size: number } | null> {
  const res = await fetch(
    `${DRIVE_API_BASE}/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(60_000),
    }
  );
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  return { bytes: buf, size: buf.length };
}

/** Export a Google-native file (Docs/Sheets) to a target MIME format. */
export async function exportDriveFile(
  accessToken: string,
  fileId: string,
  mimeType: string
): Promise<{ bytes: Buffer; size: number } | null> {
  const params = new URLSearchParams({ mimeType });
  const res = await fetch(
    `${DRIVE_API_BASE}/files/${encodeURIComponent(fileId)}/export?${params.toString()}&supportsAllDrives=true`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(60_000),
    }
  );
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  return { bytes: buf, size: buf.length };
}

/** Resolve a single file's metadata (ownership-scoped by the token). */
export async function fetchDriveFile(
  accessToken: string,
  fileId: string
): Promise<DriveFileFull | null> {
  const params = new URLSearchParams({
    fields:
      "id,name,mimeType,size,modifiedTime,createdTime,webViewLink,trashed,parents,owners(displayName,emailAddress),shortcutDetails(targetId,mimeType),iconLink",
    supportsAllDrives: "true",
  });
  const res = await fetch(
    `${DRIVE_API_BASE}/files/${encodeURIComponent(fileId)}?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(15_000),
    }
  );
  if (!res.ok) return null;
  return (await res.json()) as DriveFileFull;
}

export interface DriveFileFull {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  createdTime?: string;
  webViewLink?: string;
  trashed?: boolean;
  parents?: string[];
  owners?: Array<{ displayName?: string; emailAddress?: string }>;
  shortcutDetails?: { targetId?: string; mimeType?: string } | null;
}

const LIST_FIELDS =
  "nextPageToken,files(id,name,mimeType,size,modifiedTime,createdTime,webViewLink,trashed,parents,owners(displayName,emailAddress),shortcutDetails(targetId,mimeType))";

/**
 * List/search Drive files the user can access. Searches only - never a
 * full-drive walk: when `query` is provided results are restricted by the
 * search expression; when `folderId` is provided only that folder's direct
 * children are listed.
 */
export async function listDriveFiles(
  accessToken: string,
  opts: { query?: string; folderId?: string; pageToken?: string; pageSize?: number }
): Promise<{ files: DriveFileSummary[]; nextPageToken: string | null }> {
  const pageSize = Math.min(Math.max(opts.pageSize ?? 25, 1), 50);
  const clauses: string[] = [];
  if (opts.folderId) {
    clauses.push(`'${escapeSingle(opts.folderId)}' in parents`);
  }
  if (opts.query?.trim()) {
    clauses.push(`(name contains '${escapeSingle(opts.query.trim())}' or fullText contains '${escapeSingle(opts.query.trim())}')`);
  }
  clauses.push("trashed = false");
  // Folders show up alongside files when browsing so users can navigate.
  if (!opts.folderId && opts.query?.trim()) {
    clauses.push("mimeType != 'application/vnd.google-apps.folder'");
  }
  const params = new URLSearchParams({
    q: clauses.join(" and "),
    pageSize: String(pageSize),
    fields: LIST_FIELDS,
    orderBy: "modifiedTime desc",
    spaces: "drive",
    corpora: "user",
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true",
  });
  if (opts.pageToken) params.set("pageToken", opts.pageToken);

  const res = await fetch(`${DRIVE_API_BASE}/files?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    throw new DriveOAuthError(
      `Drive search failed (${res.status}).`,
      undefined,
      res.status
    );
  }
  const data = (await res.json()) as {
    files?: Array<Record<string, unknown>>;
    nextPageToken?: string;
  };
  const raw = (data.files ?? []) as Array<{
    id?: string;
    name?: string;
    mimeType?: string;
    size?: string;
    modifiedTime?: string;
    createdTime?: string;
    webViewLink?: string;
    trashed?: boolean;
    parents?: string[];
    owners?: Array<{ displayName?: string; emailAddress?: string }>;
    shortcutDetails?: { targetId?: string; mimeType?: string } | null;
  }>;

  // Resolve folder names (one level) for the returned files so the UI can
  // show "location". Only parents present in the page are resolved and the
  // requests are deduplicated + bounded - never a drive-wide walk.
  const parentIds = [...new Set(raw.flatMap((f) => f.parents ?? []))].slice(0, 12);
  const names = new Map<string, string>();
  await Promise.all(
    parentIds.map(async (pid) => {
      try {
        const p = await fetchDriveFile(accessToken, pid);
        if (p && !p.trashed && p.mimeType === "application/vnd.google-apps.folder") {
          names.set(pid, p.name);
        } else if (p && !p.trashed) {
          names.set(pid, p.name);
        }
      } catch {
        // Folder name resolution is best-effort.
      }
    })
  );

  const files = raw.map((f): DriveFileSummary => {
    const name = f.name ?? "Untitled";
    const mimeType = f.mimeType ?? "application/octet-stream";
    const kind: DriveFileSummary["kind"] =
      mimeType === "application/vnd.google-apps.folder"
        ? "folder"
        : mimeType === "application/vnd.google-apps.shortcut"
          ? "shortcut"
          : "file";
    const mapping = kind === "file" ? driveFileToImport(f as DriveImportPlanInput) : null;
    const mappingOk = mapping !== null && "ok" in mapping ? mapping.ok : false;
    const importable =
      kind === "folder" ? false : kind === "shortcut" ? true : mappingOk;
    const importHint =
      kind === "folder" || kind === "shortcut"
        ? null
        : mapping !== null && "ok" in mapping && !mapping.ok
          ? mapping.hint
          : null;
    return {
      id: f.id ?? "",
      name,
      mimeType,
      modifiedTime: f.modifiedTime ?? null,
      createdTime: f.createdTime ?? null,
      size: f.size ? Number(f.size) : null,
      webViewLink: f.webViewLink ?? null,
      owner: f.owners?.[0]?.displayName ?? null,
      ownerEmail: f.owners?.[0]?.emailAddress ?? null,
      folder: f.parents?.length ? (names.get(f.parents[0]) ?? null) : null,
      parents: f.parents ?? [],
      trashed: !!f.trashed,
      importable,
      importHint,
      kind,
      targetId: f.shortcutDetails?.targetId ?? null,
    };
  });

  return { files, nextPageToken: data.nextPageToken ?? null };
}

function escapeSingle(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}
