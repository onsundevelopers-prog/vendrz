/* ------------------------------------------------------------------ */
/*  Client-side types + fetchers for the Add Vendor Data experience.   */
/*  These mirror the server responses exactly and never carry tokens.  */
/* ------------------------------------------------------------------ */

export interface ConnectionStatus {
  connected: boolean;
  configured?: boolean;
  reconnectRequired?: boolean;
  connectedAt?: string;
  scope?: string;
  // provider-specific extras
  email?: string | null;
  name?: string | null;
  teamName?: string | null;
  workspaceUrl?: string | null;
}

export interface ImportAllowance {
  plan: string;
  limit: number;
  used: number;
  remaining: number;
  allowed: boolean;
}

export interface DriveFileRow {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string | null;
  createdTime: string | null;
  size: number | null;
  webViewLink: string | null;
  owner: string | null;
  ownerEmail: string | null;
  folder: string | null;
  parents: string[];
  trashed: boolean;
  importable: boolean;
  importHint: string | null;
  kind: "folder" | "file" | "shortcut";
  targetId: string | null;
}

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
  channelNames: string[];
  importable: boolean;
  importHint: string | null;
}

export type SlackHit = SlackMessageHit | SlackFileHit;

export interface ImportItemResult {
  id: string;
  name: string;
  kind?: "message" | "file";
  status: "imported" | "duplicate" | "unsupported" | "error" | "limit";
  error?: string | null;
  document?: {
    id: string;
    filename: string;
    status: string;
    analysis: unknown;
    createdAt: string;
    source_type?: string | null;
  } | null;
  upgradeTo?: string;
}

export async function getStatus(path: "/api/gmail/status" | "/api/drive/status" | "/api/slack/status"): Promise<ConnectionStatus> {
  try {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) return { connected: false };
    return (await res.json()) as ConnectionStatus;
  } catch {
    return { connected: false };
  }
}

export async function getAllowance(): Promise<ImportAllowance | null> {
  try {
    const res = await fetch("/api/integrations/allowance", { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as ImportAllowance;
  } catch {
    return null;
  }
}

export async function disconnectSource(path: "/api/gmail/disconnect" | "/api/drive/disconnect" | "/api/slack/disconnect"): Promise<boolean> {
  try {
    const res = await fetch(path, { method: "POST" });
    return res.ok;
  } catch {
    return false;
  }
}
