/* ------------------------------------------------------------------ */
/*  AI provider factory.                                               */
/*                                                                     */
/*  The single entry point for the rest of the application. Read       */
/*  AI_PROVIDER from the environment and return the configured         */
/*  provider. Callers never know which provider they are talking to.   */
/*                                                                     */
/*  AI_PROVIDER=ollama_cloud  (default) - hosted models on ollama.com  */
/*  AI_PROVIDER=ollama_local            - local `ollama serve`         */
/*  AI_PROVIDER=gemini | vllm           - planned, not implemented     */
/* ------------------------------------------------------------------ */

import { LocalOllamaWithCloudFallback, OllamaCloudProvider } from "./ollama";
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

const SUPPORTED: AIProviderId[] = ["ollama_cloud", "ollama_local"];
const KNOWN: AIProviderId[] = [...SUPPORTED, "gemini", "vllm"];

let cached: AIProvider | null = null;

/**
 * The active AI provider for this process.
 *
 * Server-only: reads process.env at first call and caches the instance.
 * Throws a clear error for unknown AI_PROVIDER values or a missing
 * OLLAMA_API_KEY so misconfiguration fails loudly instead of at request
 * time with a confusing 500.
 */
export function getAIProvider(): AIProvider {
  if (cached) return cached;

  const raw = (process.env.AI_PROVIDER ?? "ollama_cloud").trim().toLowerCase();
  const id = KNOWN.includes(raw as AIProviderId) ? (raw as AIProviderId) : null;
  if (!id) {
    throw new Error(
      `Unknown AI_PROVIDER "${raw}". Supported now: ${SUPPORTED.join(", ")}. Planned: gemini, vllm.`
    );
  }
  if (!SUPPORTED.includes(id)) {
    throw new Error(`AI_PROVIDER "${id}" is recognized but not implemented yet.`);
  }

  cached =
    id === "ollama_cloud"
      ? new OllamaCloudProvider()
      : // Local with a transparent cloud fallback: scanning keeps working
        // even when the local daemon is down, as long as a cloud key exists.
        new LocalOllamaWithCloudFallback();
  return cached;
}

/** Test/dev helper: clear the cached instance (e.g. in unit tests). */
export function resetAIProvider(): void {
  cached = null;
}
