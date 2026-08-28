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

const CLOUD_BASE_URL = "https://ollama.com";
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
