import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";

const KNOWN = ["gemini", "ollama_cloud", "ollama_local", "vllm"] as const;
const DEFAULT_PROVIDER = "gemini";
const DEFAULT_GEMINI_MODEL = "gemini-3.6-flash";

/**
 * GET /api/settings/ai
 * Returns the non-secret AI configuration for the workspace: the active
 * provider id and configured model. The API key and base URL are NEVER
 * returned - they remain server-only and never leak to the browser.
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const raw = (process.env.AI_PROVIDER ?? DEFAULT_PROVIDER).trim().toLowerCase();
  const provider = (KNOWN as readonly string[]).includes(raw) ? raw : DEFAULT_PROVIDER;
  const model =
    provider === "gemini"
      ? process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL
      : process.env.OLLAMA_MODEL?.trim() || null;
  return NextResponse.json({ provider, model });
}