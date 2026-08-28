/* ------------------------------------------------------------------ */
/*  OpenAI-compatible transport.                                       */
/*                                                                     */
/*  Both Ollama providers (cloud + local) speak the OpenAI Chat        */
/*  Completions protocol: POST {baseUrl}/chat/completions with         */
/*  messages, optional tools, and response_format for JSON output.     */
/*  This client is the only place HTTP is built; providers just point  */
/*  it at a base URL + key.                                            */
/* ------------------------------------------------------------------ */

import type { AIMessage, JsonSchema, ToolCall, ToolDefinition } from "./provider";

export interface OpenAICompatConfig {
  /** e.g. "https://ollama.com/api/v1" or "http://localhost:11434/v1". */
  baseUrl: string;
  apiKey?: string;
  model: string;
  timeoutMs?: number;
}

export interface CompleteParams {
  messages: AIMessage[];
  temperature?: number;
  maxTokens?: number;
  /** Force JSON output (OpenAI-compatible `response_format`). */
  jsonMode?: boolean;
  tools?: ToolDefinition[];
  toolChoice?: "auto" | "none";
}

export interface CompleteResult {
  content: string | null;
  toolCalls: ToolCall[];
}

interface OpenAIResponse {
  choices?: {
    message?: {
      content?: string | null;
      tool_calls?: OpenAIWireToolCall[];
    };
  }[];
}

interface OpenAIWireToolCall {
  id?: string;
  function?: { name?: string; arguments?: string };
}

/** Serialize a ToolCall into the OpenAI wire shape. */
function toWireToolCalls(calls: ToolCall[] | undefined) {
  return calls?.map((c) => ({
    id: c.id,
    type: "function",
    function: {
      name: c.name,
      arguments: JSON.stringify(c.arguments ?? {}),
    },
  }));
}

/** Parse OpenAI wire tool_calls into ToolCall[]. */
function fromWireToolCalls(raw: OpenAIWireToolCall[] | undefined): ToolCall[] {
  if (!raw) return [];
  return raw
    .filter((tc) => tc?.function?.name)
    .map((tc) => ({
      id: tc.id ?? `tc-${Math.random().toString(36).slice(2, 8)}`,
      name: tc.function!.name!,
      arguments: parseArgs(tc.function!.arguments),
    }));
}

function parseArgs(args: string | undefined): Record<string, unknown> {
  if (!args) return {};
  try {
    const parsed: unknown = JSON.parse(args);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export class OpenAICompatClient {
  private readonly config: OpenAICompatConfig;

  constructor(config: OpenAICompatConfig) {
    this.config = config;
  }

  async complete(params: CompleteParams): Promise<CompleteResult> {
    const body: Record<string, unknown> = {
      model: this.config.model,
      messages: params.messages.map(toWireMessage),
      stream: false,
    };
    if (params.temperature !== undefined) body.temperature = params.temperature;
    if (params.maxTokens !== undefined) body.max_tokens = params.maxTokens;
    if (params.jsonMode) body.response_format = { type: "json_object" };
    if (params.tools && params.tools.length > 0) {
      body.tools = params.tools.map((t) => ({
        type: "function",
        function: { name: t.name, description: t.description, parameters: t.parameters },
      }));
      body.tool_choice = params.toolChoice ?? "auto";
    }

    const res = await fetch(`${this.config.baseUrl.replace(/\/+$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : {}),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.config.timeoutMs ?? 120_000),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `AI provider error (${this.config.model}) ${res.status}: ${text.slice(0, 400)}`
      );
    }

    const data = (await res.json()) as OpenAIResponse;
    const message = data.choices?.[0]?.message;
    if (!message) throw new Error("AI provider returned no choices.");

    return {
      content: message.content ?? null,
      toolCalls: fromWireToolCalls(message.tool_calls),
    };
  }
}

function toWireMessage(msg: AIMessage) {
  if (msg.role === "tool") {
    return {
      role: "tool",
      content: msg.content,
      tool_call_id: msg.toolCallId ?? "",
    };
  }
  if (msg.role === "assistant" && msg.toolCalls && msg.toolCalls.length > 0) {
    return {
      role: "assistant",
      content: msg.content,
      tool_calls: toWireToolCalls(msg.toolCalls),
    };
  }
  return { role: msg.role, content: msg.content };
}

/* ------------------------------ shared utils ------------------------------ */

/** Extract a JSON object from model output, tolerating fences / prose. */
export function parseJsonObject<T>(raw: string): T {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    // Strip markdown fences, then grab the outermost {...} block.
    const noFences = trimmed.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
    const start = noFences.indexOf("{");
    const end = noFences.lastIndexOf("}");
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(noFences.slice(start, end + 1)) as T;
      } catch {
        // fall through
      }
    }
    throw new Error(`AI provider returned invalid JSON: ${trimmed.slice(0, 200)}`);
  }
}

export function formatSchema(schema: JsonSchema): string {
  try {
    return JSON.stringify(schema, null, 2);
  } catch {
    return String(schema);
  }
}
