/* ------------------------------------------------------------------ */
/*  AI provider abstraction.                                           */
/*                                                                     */
/*  The rest of n4ma talks ONLY to this interface. The                 */
/*  active implementation is chosen by the AI_PROVIDER env var via     */
/*  getAIProvider() in src/lib/ai/index.ts - the app never imports a   */
/*  concrete provider.                                                 */
/*                                                                     */
/*  Supported today: ollama_cloud, ollama_local, gemini.               */
/*  Future values: vllm.                                               */
/* ------------------------------------------------------------------ */

import type { ContractExtraction, RichContractExtraction } from "@/lib/types";

export type AIProviderId = "ollama_cloud" | "ollama_local" | "gemini" | "vllm";


/** Loose JSON Schema object - documented shape, passed to the model. */
export type JsonSchema = Record<string, unknown>;

export interface AIMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  /** For role "tool" - id of the tool call being answered. */
  toolCallId?: string;
  /** For role "assistant" - tool calls the model made, echoed back. */
  toolCalls?: ToolCall[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: JsonSchema;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
}

export interface StructuredOptions {
  system?: string;
  prompt: string;
  /** JSON Schema the output must conform to. */
  schema: JsonSchema;
  temperature?: number;
}

export interface ToolCallOptions {
  system?: string;
  prompt: string;
  tools: ToolDefinition[];
}

export interface ToolCallResult {
  content: string;
  toolCalls: ToolCall[];
}

/* ------------------------- domain capabilities ------------------------- */

export interface ContractAnalysisInput {
  /** Plain text extracted from the document (PDF/DOCX/TXT). */
  text: string;
  filename?: string;
}

export type EmailPurpose = "negotiation" | "cancellation" | "follow_up" | "clarification";

export interface EmailDraftRequest {
  vendorName: string;
  purpose: EmailPurpose;
  /** Real facts about the contract - the draft must only use these. */
  contractContext: string;
  senderName?: string;
  senderEmail?: string;
}

export interface EmailDraft {
  subject: string;
  body: string;
  to?: string;
}

export interface DataReasoningOptions {
  question: string;
  /** Structured company/vendor data the answer must be grounded in. */
  data: unknown;
  schema: JsonSchema;
  instructions?: string;
}

export interface AIProvider {
  readonly id: AIProviderId;
  readonly model: string;

  /* ------------------------------ transport ------------------------------ */

  /** Free-form multi-turn chat. */
  chat(messages: AIMessage[], opts?: ChatOptions): Promise<string>;

  /** Deterministic JSON output matching `schema`. */
  structured<T>(opts: StructuredOptions): Promise<T>;

  /** One round of tool calling - returns calls to execute + assistant text. */
  tools(opts: ToolCallOptions): Promise<ToolCallResult>;

  /** Full tool loop: executes `executor` for every call until the model stops. */
  runToolLoop(
    opts: ToolCallOptions & { maxRounds?: number },
    executor: (call: ToolCall) => Promise<string>
  ): Promise<{ content: string; calls: ToolCall[] }>;

  /* ------------------------------ domain ------------------------------ */

  /** Extract structured contract terms from document text. */
  analyzeContract(input: ContractAnalysisInput): Promise<ContractExtraction>;

  /**
   * Canonical, fully-detailed extraction (the rich schema). Kept separate
   * from analyzeContract, which maps this down to the legacy shape.
   */
  analyzeContractRich(input: ContractAnalysisInput): Promise<RichContractExtraction>;

  /** Draft a vendor email from real contract context (never sent). */
  draftEmail(req: EmailDraftRequest): Promise<EmailDraft>;

  /** Answer a question over structured company data, grounded in that data. */
  reasonOverData<T>(opts: DataReasoningOptions): Promise<T>;
}
