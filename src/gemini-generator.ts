/**
 * GeminiContentGenerator
 * ---------------------------------
 * Implements ContentGenerator (see content-generator.ts) for the "gemini"
 * provider using the official Google Gen AI SDK (@google/genai).
 *
 * Docs consulted:
 *  - https://ai.google.dev/gemini-api/docs/libraries
 *  - https://googleapis.github.io/js-genai/release_docs/index.html
 *  - https://github.com/googleapis/js-genai (Quickstart + Error Handling)
 *  - https://googleapis.github.io/js-genai/release_docs/interfaces/types.GenerateContentConfig.html
 *
 * Design notes:
 *  - The API key and model name are read from configuration/environment
 *    only (GEMINI_API_KEY / GOOGLE_API_KEY, GEMINI_MODEL). They are never
 *    hard-coded and never placed in any returned/logged string as-is —
 *    sanitizeMessage() strips the raw key value before it can leak.
 *  - The SDK client is constructed lazily, once per generate() call, from a
 *    pluggable factory (defaultClientFactory) so tests can inject a fake
 *    client without touching the real SDK or environment.
 *  - Timeout is implemented with AbortController, wired into the SDK's
 *    supported `config.abortSignal` (GenerateContentConfig.abortSignal per
 *    the official types), not a home-grown Promise.race hack.
 *  - Config validation (missing key/model) never throws — it is returned as
 *    a normal GenerationFailure with category "configuration", per the
 *    contract in content-generator.ts.
 *  - This file implements ONLY Gemini. It never calls Claude, Ollama, or
 *    Mock, and never falls back on failure.
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
// Minimal duck-typed shape of the parts of the @google/genai client this
// file uses. Kept narrow and local (rather than importing the SDK's full
// type surface) so the generator stays easy to test with fakes and doesn't
// couple business logic to SDK internals beyond this one file.
// ---------------------------------------------------------------------------

export interface GeminiGenerateContentResponseLike {
  text?: string;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
  };
}

export interface GeminiClientLike {
  models: {
    generateContent(args: {
      model: string;
      contents: string;
      config?: {
        abortSignal?: AbortSignal;
        maxOutputTokens?: number;
        temperature?: number;
        stopSequences?: string[];
      };
    }): Promise<GeminiGenerateContentResponseLike>;
  };
}

/** Error shape the SDK's ApiError follows (name/message/status). */
interface GeminiSdkErrorLike {
  name?: string;
  message?: string;
  status?: number | string;
  code?: string;
  cause?: unknown;
}

// ---------------------------------------------------------------------------
// Runtime configuration (environment/config only — never hard-coded)
// ---------------------------------------------------------------------------

export interface GeminiRuntimeConfig {
  apiKey?: string;
  model?: string;
}

export function loadGeminiConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env
): GeminiRuntimeConfig {
  return {
    // GEMINI_API_KEY is the primary variable used by the official SDK docs;
    // GOOGLE_API_KEY is accepted as an alias per the same docs.
    apiKey: env.GEMINI_API_KEY || env.GOOGLE_API_KEY,
    model: env.GEMINI_MODEL,
  };
}

// ---------------------------------------------------------------------------
// Client factory (lazy import so this module has no hard dependency on the
// SDK being installed until a real call is actually made).
// ---------------------------------------------------------------------------

export type GeminiClientFactory = (apiKey: string) => GeminiClientLike;

async function defaultClientFactory(apiKey: string): Promise<GeminiClientLike> {
  const { GoogleGenAI } = await import("@google/genai");
  return new GoogleGenAI({ apiKey }) as unknown as GeminiClientLike;
}

// ---------------------------------------------------------------------------
// Sanitization: guarantees the API key can never appear in a returned
// message, cause, or code — regardless of what the SDK/network put in it.
// ---------------------------------------------------------------------------

function sanitizeText(text: string | undefined, apiKey: string | undefined): string {
  if (!text) return "";
  if (!apiKey) return text;
  return text.split(apiKey).join("[REDACTED]");
}

function sanitizeCause(cause: unknown, apiKey: string | undefined): unknown {
  if (!apiKey) return undefined; // never forward raw causes if we can't scrub them safely
  if (cause instanceof Error) {
    return { name: cause.name, message: sanitizeText(cause.message, apiKey) };
  }
  if (typeof cause === "string") {
    return sanitizeText(cause, apiKey);
  }
  // Unknown shape (e.g. raw SDK error object): drop it rather than risk a leak.
  return undefined;
}

// ---------------------------------------------------------------------------
// Error mapping: SDK/network failure -> exactly one GenerationErrorCategory
// ---------------------------------------------------------------------------

function categorizeGeminiError(
  err: unknown,
  wasAborted: boolean
): { category: GenerationErrorCategory; code: string } {
  if (wasAborted) {
    return { category: "timeout", code: "gemini.timeout" };
  }

  const e = err as GeminiSdkErrorLike;
  const status = typeof e?.status === "string" ? Number(e.status) : e?.status;

  if (typeof status === "number") {
    if (status === 401 || status === 403) {
      return { category: "authentication", code: `gemini.http_${status}` };
    }
    if (status === 429) {
      return { category: "rate_limit", code: "gemini.rate_limited" };
    }
    if (status === 400 || status === 404) {
      // Invalid request / unknown model name is almost always a
      // configuration problem (wrong model string, malformed request),
      // not a transient provider issue.
      return { category: "configuration", code: `gemini.http_${status}` };
    }
    if (status >= 500) {
      return { category: "provider_error", code: `gemini.http_${status}` };
    }
    return { category: "provider_error", code: `gemini.http_${status}` };
  }

  // No HTTP status: likely a transport-level failure (DNS, connection
  // refused, socket reset, etc.) rather than an API-reported error.
  const networkCodes = new Set([
    "ECONNREFUSED",
    "ENOTFOUND",
    "ETIMEDOUT",
    "EAI_AGAIN",
    "ECONNRESET",
  ]);
  if (e?.code && networkCodes.has(e.code)) {
    return { category: "network", code: `gemini.${e.code.toLowerCase()}` };
  }
  if (e?.name === "TypeError" && /fetch/i.test(e?.message ?? "")) {
    // Node's fetch throws a TypeError for underlying network failures.
    return { category: "network", code: "gemini.network_error" };
  }

  return { category: "provider_error", code: "gemini.unknown_error" };
}

function toFailure(
  category: GenerationErrorCategory,
  code: string,
  message: string,
  durationMs: number,
  cause?: unknown
): GenerationFailure {
  return {
    ok: false,
    provider: "gemini",
    error: { category, code, message, cause },
    durationMs,
  };
}

function assertProviderMatches(resolved: AIProvider, expected: ProviderName): void {
  if (resolved.name !== expected) {
    throw new Error(
      `Expected a resolved "${expected}" provider but received "${resolved.name}".`
    );
  }
}

// ---------------------------------------------------------------------------
// GeminiContentGenerator
// ---------------------------------------------------------------------------

export interface GeminiContentGeneratorOptions {
  /** Override for testing; defaults to reading process.env. */
  env?: NodeJS.ProcessEnv;
  /** Override for testing; defaults to constructing a real GoogleGenAI client. */
  clientFactory?: GeminiClientFactory | ((apiKey: string) => Promise<GeminiClientLike>);
}

export class GeminiContentGenerator implements ContentGenerator {
  readonly provider = "gemini" as const;

  constructor(
    resolved: AIProvider,
    private readonly options: GeminiContentGeneratorOptions = {}
  ) {
    // Requirement 9 / defensive check: this generator must only ever be
    // constructed against a resolved "gemini" provider. It never falls
    // back to another provider if this check fails — it errors out.
    assertProviderMatches(resolved, "gemini");
  }

  async generate(request: GenerationRequest): Promise<GenerationResult> {
    const start = Date.now();
    const { apiKey, model } = loadGeminiConfigFromEnv(this.options.env);

    if (!apiKey) {
      return toFailure(
        "configuration",
        "gemini.missing_api_key",
        "Gemini API key is not configured (set GEMINI_API_KEY).",
        Date.now() - start
      );
    }
    if (!model) {
      return toFailure(
        "configuration",
        "gemini.missing_model",
        "Gemini model name is not configured (set GEMINI_MODEL).",
        Date.now() - start
      );
    }

    let client: GeminiClientLike;
    try {
      client = await (this.options.clientFactory ?? defaultClientFactory)(apiKey);
    } catch (err) {
      return toFailure(
        "configuration",
        "gemini.client_init_failed",
        sanitizeText(err instanceof Error ? err.message : "Failed to initialize Gemini client.", apiKey),
        Date.now() - start,
        sanitizeCause(err, apiKey)
      );
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), request.timeoutMs);

    try {
      const response = await client.models.generateContent({
        model,
        contents: request.prompt,
        config: {
          abortSignal: controller.signal,
          maxOutputTokens: request.options?.maxTokens,
          temperature: request.options?.temperature,
          stopSequences: request.options?.stopSequences,
        },
      });

      return {
        ok: true,
        provider: "gemini",
        content: response.text ?? "",
        usage: {
          inputTokens: response.usageMetadata?.promptTokenCount,
          outputTokens: response.usageMetadata?.candidatesTokenCount,
        },
        durationMs: Date.now() - start,
      };
    } catch (err) {
      const durationMs = Date.now() - start;
      const { category, code } = categorizeGeminiError(err, controller.signal.aborted);
      const rawMessage =
        (err as GeminiSdkErrorLike)?.message ??
        (err instanceof Error ? err.message : "Gemini generation failed.");
      const message =
        category === "timeout"
          ? `Gemini request timed out after ${request.timeoutMs}ms.`
          : sanitizeText(rawMessage, apiKey);

      return toFailure(category, code, message, durationMs, sanitizeCause(err, apiKey));
    } finally {
      clearTimeout(timer);
    }
  }
}
