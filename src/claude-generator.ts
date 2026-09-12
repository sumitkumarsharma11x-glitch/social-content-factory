/**
 * ClaudeContentGenerator
 * ---------------------------------
 * Implements ContentGenerator (see content-generator.ts) for the "claude"
 * provider using the official Anthropic TypeScript SDK (@anthropic-ai/sdk).
 *
 * Structured (schema-shaped) output: the Anthropic Messages API has no
 * OpenAI-style `response_format` with a JSON schema. The documented,
 * widely-used equivalent is FORCED TOOL USE: declare one tool whose
 * `input_schema` is the target shape, set `tool_choice = { type: "tool",
 * name }`, and read the parsed object back from the response's `tool_use`
 * content block's `.input` (Anthropic validates the tool call arguments
 * against the schema itself). This file uses that pattern via the
 * `request.options.structuredOutput` field added to GenerationRequest.
 *
 * Design notes mirror gemini-generator.ts:
 *  - API key/model read from environment only (ANTHROPIC_API_KEY, CLAUDE_MODEL).
 *  - Client constructed lazily via a pluggable factory so tests never touch
 *    the real SDK or network.
 *  - Timeout via AbortController, passed as the SDK's `signal` request option.
 *  - Config validation failures return (never throw) a "configuration"
 *    GenerationFailure, without calling the SDK.
 *  - The API key is scrubbed from any returned message/cause.
 *  - Implements ONLY Claude. Never calls Gemini, Ollama, or Mock, and never
 *    falls back on failure.
 */

import type {
  ContentGenerator,
  GenerationRequest,
  GenerationResult,
  GenerationFailure,
  GenerationErrorCategory,
} from "./content-generator";
import type { AIProvider, ProviderName } from "./provider-selector";

// ---------------------------------------------------------------------------
// Minimal duck-typed shape of the parts of @anthropic-ai/sdk this file uses.
// ---------------------------------------------------------------------------

export interface ClaudeContentBlockLike {
  type: string;
  text?: string;
  input?: unknown; // present on type === "tool_use"
}

export interface ClaudeMessageResponseLike {
  content: ClaudeContentBlockLike[];
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
}

export interface ClaudeClientLike {
  messages: {
    create(
      args: {
        model: string;
        max_tokens: number;
        temperature?: number;
        stop_sequences?: string[];
        messages: { role: "user"; content: string }[];
        tools?: { name: string; description: string; input_schema: object }[];
        tool_choice?: { type: "tool"; name: string };
      },
      options?: { signal?: AbortSignal }
    ): Promise<ClaudeMessageResponseLike>;
  };
}

interface ClaudeSdkErrorLike {
  name?: string;
  message?: string;
  status?: number | string;
  code?: string;
  cause?: unknown;
}

// ---------------------------------------------------------------------------
// Runtime configuration
// ---------------------------------------------------------------------------

export interface ClaudeRuntimeConfig {
  apiKey?: string;
  model?: string;
}

export function loadClaudeConfigFromEnv(env: NodeJS.ProcessEnv = process.env): ClaudeRuntimeConfig {
  return {
    apiKey: env.ANTHROPIC_API_KEY,
    model: env.CLAUDE_MODEL,
  };
}

export type ClaudeClientFactory = (apiKey: string) => Promise<ClaudeClientLike>;

async function defaultClientFactory(apiKey: string): Promise<ClaudeClientLike> {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  return new Anthropic({ apiKey }) as unknown as ClaudeClientLike;
}

// ---------------------------------------------------------------------------
// Sanitization (same discipline as gemini-generator.ts)
// ---------------------------------------------------------------------------

function sanitizeText(text: string | undefined, apiKey: string | undefined): string {
  if (!text) return "";
  if (!apiKey) return text;
  return text.split(apiKey).join("[REDACTED]");
}

function sanitizeCause(cause: unknown, apiKey: string | undefined): unknown {
  if (!apiKey) return undefined;
  if (cause instanceof Error) {
    return { name: cause.name, message: sanitizeText(cause.message, apiKey) };
  }
  if (typeof cause === "string") {
    return sanitizeText(cause, apiKey);
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Error mapping (same category set/shape as gemini-generator.ts)
// ---------------------------------------------------------------------------

function categorizeClaudeError(
  err: unknown,
  wasAborted: boolean
): { category: GenerationErrorCategory; code: string } {
  if (wasAborted) {
    return { category: "timeout", code: "claude.timeout" };
  }

  const e = err as ClaudeSdkErrorLike;
  const status = typeof e?.status === "string" ? Number(e.status) : e?.status;

  if (typeof status === "number") {
    if (status === 401 || status === 403) {
      return { category: "authentication", code: `claude.http_${status}` };
    }
    if (status === 429) {
      return { category: "rate_limit", code: "claude.rate_limited" };
    }
    if (status === 400 || status === 404) {
      return { category: "configuration", code: `claude.http_${status}` };
    }
    if (status >= 500) {
      return { category: "provider_error", code: `claude.http_${status}` };
    }
    return { category: "provider_error", code: `claude.http_${status}` };
  }

  const networkCodes = new Set(["ECONNREFUSED", "ENOTFOUND", "ETIMEDOUT", "EAI_AGAIN", "ECONNRESET"]);
  if (e?.code && networkCodes.has(e.code)) {
    return { category: "network", code: `claude.${e.code.toLowerCase()}` };
  }
  if (e?.name === "TypeError" && /fetch/i.test(e?.message ?? "")) {
    return { category: "network", code: "claude.network_error" };
  }

  return { category: "provider_error", code: "claude.unknown_error" };
}

function toFailure(
  category: GenerationErrorCategory,
  code: string,
  message: string,
  durationMs: number,
  cause?: unknown
): GenerationFailure {
  return { ok: false, provider: "claude", error: { category, code, message, cause }, durationMs };
}

function assertProviderMatches(resolved: AIProvider, expected: ProviderName): void {
  if (resolved.name !== expected) {
    throw new Error(`Expected a resolved "${expected}" provider but received "${resolved.name}".`);
  }
}

// ---------------------------------------------------------------------------
// ClaudeContentGenerator
// ---------------------------------------------------------------------------

export interface ClaudeContentGeneratorOptions {
  env?: NodeJS.ProcessEnv;
  clientFactory?: ClaudeClientFactory;
}

export class ClaudeContentGenerator implements ContentGenerator {
  readonly provider = "claude" as const;

  constructor(
    resolved: AIProvider,
    private readonly options: ClaudeContentGeneratorOptions = {}
  ) {
    assertProviderMatches(resolved, "claude");
  }

  async generate(request: GenerationRequest): Promise<GenerationResult> {
    const start = Date.now();
    const { apiKey, model } = loadClaudeConfigFromEnv(this.options.env);

    if (!apiKey) {
      return toFailure(
        "configuration",
        "claude.missing_api_key",
        "Claude API key is not configured (set ANTHROPIC_API_KEY).",
        Date.now() - start
      );
    }
    if (!model) {
      return toFailure(
        "configuration",
        "claude.missing_model",
        "Claude model name is not configured (set CLAUDE_MODEL).",
        Date.now() - start
      );
    }

    let client: ClaudeClientLike;
    try {
      client = await (this.options.clientFactory ?? defaultClientFactory)(apiKey);
    } catch (err) {
      return toFailure(
        "configuration",
        "claude.client_init_failed",
        sanitizeText(err instanceof Error ? err.message : "Failed to initialize Claude client.", apiKey),
        Date.now() - start,
        sanitizeCause(err, apiKey)
      );
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), request.timeoutMs);

    try {
      const structuredOutput = request.options?.structuredOutput;

      const response = await client.messages.create(
        {
          model,
          max_tokens: request.options?.maxTokens ?? 4096,
          temperature: request.options?.temperature,
          stop_sequences: request.options?.stopSequences,
          messages: [{ role: "user", content: request.prompt }],
          ...(structuredOutput
            ? {
                tools: [
                  {
                    name: structuredOutput.name,
                    description: structuredOutput.description,
                    input_schema: structuredOutput.schema,
                  },
                ],
                tool_choice: { type: "tool" as const, name: structuredOutput.name },
              }
            : {}),
        },
        { signal: controller.signal }
      );

      const content = extractContent(response, structuredOutput?.name);

      return {
        ok: true,
        provider: "claude",
        content,
        usage: {
          inputTokens: response.usage?.input_tokens,
          outputTokens: response.usage?.output_tokens,
        },
        durationMs: Date.now() - start,
      };
    } catch (err) {
      const durationMs = Date.now() - start;
      const { category, code } = categorizeClaudeError(err, controller.signal.aborted);
      const rawMessage =
        (err as ClaudeSdkErrorLike)?.message ??
        (err instanceof Error ? err.message : "Claude generation failed.");
      const message =
        category === "timeout"
          ? `Claude request timed out after ${request.timeoutMs}ms.`
          : sanitizeText(rawMessage, apiKey);

      return toFailure(category, code, message, durationMs, sanitizeCause(err, apiKey));
    } finally {
      clearTimeout(timer);
    }
  }
}

/**
 * If a structured-output tool was forced, returns the JSON-stringified
 * tool_use input block (so `content` is always a plain string, consistent
 * with every other provider). Otherwise concatenates any text blocks.
 */
function extractContent(response: ClaudeMessageResponseLike, toolName: string | undefined): string {
  if (toolName) {
    const toolBlock = response.content.find((b) => b.type === "tool_use");
    if (toolBlock) {
      return JSON.stringify(toolBlock.input);
    }
  }
  return response.content
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text)
    .join("\n");
}
