/* ------------------------------------------------------------------ */
/*  Ollama providers.                                                  */
/*                                                                     */
/*  OllamaCloudProvider - hosted models on ollama.com (production).    */
/*  LocalOllamaProvider  - a local `ollama serve` on this machine.     */
/*                                                                     */
/*  Both speak the OpenAI-compatible /v1/chat/completions protocol;    */
/*  the only differences are base URL, auth, and default model.        */
/* ------------------------------------------------------------------ */

import { BaseAIProvider } from "./base";
import { OpenAICompatClient, type CompleteParams, type CompleteResult } from "./openai-compat";
import type { AIProviderId } from "./provider";

// ollama.com exposes the OpenAI-compatible API under /v1 (the native API
// lives at /api/*). The client appends /chat/completions to this base URL.
const CLOUD_BASE_URL = "https://ollama.com/v1";
const LOCAL_BASE_URL = "http://localhost:11434/v1";

/* ------------------------------ Ollama Cloud ------------------------------ */

export class OllamaCloudProvider extends BaseAIProvider {
  readonly id: AIProviderId = "ollama_cloud";
  readonly model: string;
  private readonly client: OpenAICompatClient;

  constructor(opts: { baseUrl?: string; apiKey?: string; model?: string } = {}) {
    super();
    const apiKey = opts.apiKey ?? process.env.OLLAMA_API_KEY;
    if (!apiKey) {
      throw new Error(
        "OLLAMA_API_KEY is not set - add it to .env.local (create one at https://ollama.com/settings/keys) or set AI_PROVIDER=ollama_local."
      );
    }
    this.model = opts.model ?? process.env.OLLAMA_MODEL ?? "qwen3:32b";
    this.client = new OpenAICompatClient({
      baseUrl: opts.baseUrl ?? process.env.OLLAMA_BASE_URL ?? CLOUD_BASE_URL,
      apiKey,
      model: this.model,
    });
  }

  protected complete(params: CompleteParams): Promise<CompleteResult> {
    return this.client.complete(params);
  }
}

/* ------------------------------ Local Ollama ------------------------------ */

export class LocalOllamaProvider extends BaseAIProvider {
  readonly id: AIProviderId = "ollama_local";
  readonly model: string;
  private readonly client: OpenAICompatClient;

  constructor(opts: { baseUrl?: string; apiKey?: string; model?: string } = {}) {
    super();
    this.model =
      opts.model ??
      process.env.OLLAMA_LOCAL_MODEL ??
      process.env.OLLAMA_MODEL ??
      "llama3.2";
    this.client = new OpenAICompatClient({
      baseUrl: opts.baseUrl ?? process.env.OLLAMA_LOCAL_BASE_URL ?? LOCAL_BASE_URL,
      // Local Ollama requires a non-empty key field but ignores its value.
      apiKey: opts.apiKey ?? process.env.OLLAMA_LOCAL_API_KEY ?? "ollama",
      model: this.model,
    });
  }

  protected complete(params: CompleteParams): Promise<CompleteResult> {
    return this.client.complete(params);
  }
}

/**
 * Local `ollama serve` with automatic cloud fallback.
 *
 * When AI_PROVIDER=ollama_local but the local daemon isn't running (or
 * hasn't pulled the model), every request would otherwise fail and the
 * user would see "analysis service unavailable". If OLLAMA_API_KEY is
 * set, requests transparently fall back to ollama.com so document
 * scanning still works. Without a key the original failure surfaces.
 *
 * A dead local server can hang the TCP connect for a very long time, so
 * before every request we probe the daemon with a short timeout and go
 * straight to the cloud fallback when it isn't there - otherwise the
 * 120s inference timeout would burn the whole request on a dead port.
 */
const LOCAL_PROBE_TIMEOUT_MS = 3_000;

export class LocalOllamaWithCloudFallback extends LocalOllamaProvider {
  private readonly fallback: OpenAICompatClient | null;
  private readonly probeUrl: string;

  constructor(opts: { baseUrl?: string; apiKey?: string; model?: string } = {}) {
    super(opts);
    const baseUrl = opts.baseUrl ?? process.env.OLLAMA_LOCAL_BASE_URL ?? LOCAL_BASE_URL;
    this.probeUrl = `${baseUrl.replace(/\/+$/, "")}/models`;
    this.fallback = process.env.OLLAMA_API_KEY
      ? new OpenAICompatClient({
          baseUrl: process.env.OLLAMA_BASE_URL ?? CLOUD_BASE_URL,
          apiKey: process.env.OLLAMA_API_KEY,
          model: process.env.OLLAMA_MODEL ?? "qwen3:32b",
        })
      : null;
  }

  protected async complete(params: CompleteParams): Promise<CompleteResult> {
    if (!(await this.localReachable())) {
      if (!this.fallback) {
        throw new Error(
          "Local Ollama is not reachable and no OLLAMA_API_KEY fallback is configured."
        );
      }
      console.warn(
        "[ollama] Local Ollama not reachable; falling back to ollama.com."
      );
      return this.fallback.complete(params);
    }
    try {
      return await super.complete(params);
    } catch (err) {
      if (!this.fallback) throw err;
      const reason = err instanceof Error ? err.message : String(err);
      console.warn(
        `[ollama] Local Ollama unavailable (${reason}); falling back to ollama.com.`
      );
      return this.fallback.complete(params);
    }
  }

  /** Quick liveness check against the local daemon's /v1/models. */
  private async localReachable(): Promise<boolean> {
    try {
      const res = await fetch(this.probeUrl, {
        signal: AbortSignal.timeout(LOCAL_PROBE_TIMEOUT_MS),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}
