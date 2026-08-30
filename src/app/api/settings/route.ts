import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";

const KNOWN = ["ollama_cloud", "ollama_local", "gemini", "vllm"] as const;

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
  const raw = (process.env.AI_PROVIDER ?? "ollama_cloud").trim().toLowerCase();
  const provider = (KNOWN as readonly string[]).includes(raw) ? raw : "ollama_cloud";
  const model = process.env.OLLAMA_MODEL?.trim() || null;
  return NextResponse.json({ provider, model });
}