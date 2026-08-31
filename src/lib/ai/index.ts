/* ------------------------------------------------------------------ */
/*  AI provider factory.                                               */
/*                                                                     */
/*  The single entry point for the rest of the application. Read       */
/*  AI_PROVIDER from the environment and return the configured         */
/*  provider. Callers never know which provider they are talking to.   */
/*                                                                     */
/*  AI_PROVIDER=gemini        (default) - Google Gemini directly       */
/*  AI_PROVIDER=ollama_cloud          - hosted models on ollama.com    */
/*  AI_PROVIDER=ollama_local          - local `ollama serve`           */
/*                                                                     */
/*  Gemini is the default primary provider. It transparently falls     */
/*  back to Ollama Cloud when unreachable or erroring (as long as an   */
/*  Ollama key is configured), so a Gemini outage never takes down     */
/*  the analysis pipeline. Ollama providers in turn fall back to       */
/*  Gemini, so the chain stays up either way.                          */
/* ------------------------------------------------------------------ */

import { LocalOllamaWithCloudFallback, OllamaCloudProvider, WithOllamaCloudFallback } from "./ollama";
import { GeminiProvider, geminiApiKey, WithGeminiFallback } from "./gemini";
import type { AIProvider, AIProviderId } from "./provider";

export type { AIProvider, AIProviderId };
export type {
  AIMessage,
  ChatOptions,
  ContractAnalysisInput,
  DataReasoningOptions,
  EmailDraft,
  EmailDraftRequest,
  StructuredOptions,
  ToolCall,
  ToolCallOptions,
  ToolCallResult,
  ToolDefinition,
} from "./provider";

const SUPPORTED: AIProviderId[] = ["ollama_cloud", "ollama_local", "gemini"];
const KNOWN: AIProviderId[] = [...SUPPORTED, "vllm"];

let cached: AIProvider | null = null;

/** Ollama Cloud, wrapped so a failure retries against Gemini. */
function buildOllamaCloud(): AIProvider {
  try {
    return new WithGeminiFallback(new OllamaCloudProvider());
  } catch (err) {
    // No OLLAMA_API_KEY at all - if Gemini is configured, use it instead
    // of failing the whole app.
    if (geminiApiKey()) {
      console.warn(
        "[ai] OLLAMA_API_KEY is not set; using Gemini as the primary provider."
      );
      return new GeminiProvider();
    }
    throw err;
  }
}

/**
 * Gemini, wrapped so a failure retries against Ollama Cloud. The default:
 * Gemini is primary and ollama.com is the safety net.
 */
function buildGemini(): AIProvider {
  try {
    return new WithOllamaCloudFallback(new GeminiProvider());
  } catch (err) {
    // No Gemini key at all - if Ollama Cloud is configured, use it instead
    // of failing the whole app.
    if (process.env.OLLAMA_API_KEY?.trim()) {
      console.warn(
        "[ai] GEMINI_API_KEY is not set; using Ollama Cloud as the primary provider."
      );
      return new OllamaCloudProvider();
    }
    throw err;
  }
}

/**
 * The active AI provider for this process.
 *
 * Server-only: reads process.env at first call and caches the instance.
 * Throws a clear error for unknown AI_PROVIDER values or a missing
 * GEMINI_API_KEY so misconfiguration fails loudly instead of at request
 * time with a confusing 500.
 */
export function getAIProvider(): AIProvider {
  if (cached) return cached;

  const raw = (process.env.AI_PROVIDER ?? "gemini").trim().toLowerCase();
  const id = KNOWN.includes(raw as AIProviderId) ? (raw as AIProviderId) : null;
  if (!id) {
    throw new Error(
      `Unknown AI_PROVIDER "${raw}". Supported now: ${SUPPORTED.join(", ")}.`
    );
  }
  if (!SUPPORTED.includes(id)) {
    throw new Error(`AI_PROVIDER "${id}" is recognized but not implemented yet.`);
  }

  cached =
    id === "gemini"
      ? buildGemini()
      : id === "ollama_cloud"
        ? buildOllamaCloud()
        : // Local with a transparent cloud fallback: scanning keeps working
          // even when the local daemon is down, as long as a cloud key
          // exists. The chain ends at Gemini if Ollama is fully down.
          new WithGeminiFallback(new LocalOllamaWithCloudFallback());
  return cached;
}

/** Test/dev helper: clear the cached instance (e.g. in unit tests). */
export function resetAIProvider(): void {
  cached = null;
}
