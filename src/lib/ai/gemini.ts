/* ------------------------------------------------------------------ */
/*  Google Gemini provider.                                           */
/*                                                                     */
/*  Talks to Google's OpenAI-compatible endpoint (which supports       */
/*  chat, JSON mode and tool calls) using a Gemini API key.            */
/*                                                                     */
/*  Env:                                                               */
/*    GEMINI_API_KEY - create one at https://aistudio.google.com/apikey */
/*    GEMINI_MODEL   - optional model override (default gemini-2.5-flash) */
/*    GOOGLE_API_KEY - secondary fallback key, tried when GEMINI_API_KEY */
/*                     is unset (some Google Cloud keys work with Gemini) */
/* ------------------------------------------------------------------ */

import { BaseAIProvider } from "./base";
import {
  OpenAICompatClient,
  type CompleteParams,
  type CompleteResult,
} from "./openai-compat";
import type { AIProviderId } from "./provider";

// Google exposes the OpenAI-compatible surface under /v1beta/openai.
// The client appends /chat/completions to this base URL.
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai";

/** The configured Gemini API key, if any (GEMINI_API_KEY wins, then GOOGLE_API_KEY). */
export function geminiApiKey(): string | undefined {
  return process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim() || undefined;
}

export class GeminiProvider extends BaseAIProvider {
  readonly id: AIProviderId = "gemini";
  readonly model: string;
  private readonly client: OpenAICompatClient;

  constructor(opts: { baseUrl?: string; apiKey?: string; model?: string } = {}) {
    super();
    const apiKey = opts.apiKey ?? geminiApiKey();
    if (!apiKey) {
      throw new Error(
        "No Gemini API key is set - add GEMINI_API_KEY to your environment (create one at https://aistudio.google.com/apikey)."
      );
    }
    this.model = opts.model ?? process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
    this.client = new OpenAICompatClient({
      baseUrl: opts.baseUrl ?? process.env.GEMINI_BASE_URL ?? GEMINI_BASE_URL,
      apiKey,
      model: this.model,
    });
  }

  public complete(params: CompleteParams): Promise<CompleteResult> {
    return this.client.complete(params);
  }
}

/**
 * Wraps any provider with a transparent Gemini fallback.
 *
 * When the primary provider fails (unreachable, auth error, model error),
 * the request is retried against Google Gemini so document scanning and
 * the AI assistant keep working through an Ollama outage. Only active
 * when a Gemini key is configured - otherwise the original error
 * surfaces unchanged so misconfiguration still fails loudly.
 */
export class WithGeminiFallback extends BaseAIProvider {
  readonly id: AIProviderId;
  readonly model: string;
  private readonly primary: BaseAIProvider;
  private readonly fallback: GeminiProvider | null;

  constructor(primary: BaseAIProvider) {
    super();
    this.primary = primary;
    this.id = primary.id;
    this.model = primary.model;
    this.fallback = geminiApiKey() ? new GeminiProvider() : null;
  }

  public async complete(params: CompleteParams): Promise<CompleteResult> {
    if (!this.fallback) return this.primary.complete(params);
    try {
      return await this.primary.complete(params);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      console.warn(
        `[ai] ${this.primary.id} unavailable (${reason}); falling back to Gemini.`
      );
      return this.fallback.complete(params);
    }
  }
}
