/**
 * Content Generation Layer
 * ---------------------------------
 * Depends on provider-selector.ts only for the AIProvider type/identity
 * (ProviderName, AIProvider). It does NOT re-implement or call into
 * selection logic — a resolved AIProvider is always handed in from outside.
 *
 * Rules enforced by this design:
 *  - Business logic calls one method, generate(provider, request), and gets
 *    back a typed result. It never touches a provider-specific SDK.
 *  - No fallback: generate() invokes exactly the provider passed to it.
 *    If that call fails, the failure is returned/thrown as-is.
 *  - MockProvider's generator only runs when a MockProvider instance was
 *    actually selected upstream — nothing here can substitute it in.
 *  - Timeout is part of the contract every generator must honor.
 */

import type { AIProvider, ProviderName } from "./provider-selector";
import { GeminiContentGenerator as RealGeminiContentGenerator } from "./gemini-generator";
import { ClaudeContentGenerator as RealClaudeContentGenerator } from "./claude-generator";
import { generateMockContentBatch } from "./mock-content-batch";

// ---------------------------------------------------------------------------
// Request
// ---------------------------------------------------------------------------

export interface GenerationRequest {
  /** The content-generation prompt. */
  prompt: string;
  /** Optional generation knobs; providers ignore fields they don't support. */
  options?: {
    maxTokens?: number;
    temperature?: number;
    stopSequences?: string[];
    /**
     * Optional request for schema-shaped JSON output. Providers that support
     * it (Gemini via responseSchema, Claude via forced tool-use) use it to
     * constrain output shape; providers that don't (Mock, and Ollama until
     * implemented) simply ignore it. Additive field — existing callers that
     * don't set it are unaffected.
     */
    structuredOutput?: {
      /** Tool/schema name (required by Claude's forced tool-use approach). */
      name: string;
      description: string;
      /** JSON-schema-shaped object describing the desired output. */
      schema: object;
    };
  };
  /**
   * Milliseconds before the call is aborted. Every provider implementation
   * must respect this and surface a "timeout" failure if exceeded.
   */
  timeoutMs: number;
}

// ---------------------------------------------------------------------------
// Result: discriminated union, success | failure
// ---------------------------------------------------------------------------

export interface GenerationSuccess {
  ok: true;
  provider: ProviderName;
  /** Generated text/content. */
  content: string;
  /** Optional provider-reported usage; shape kept generic on purpose. */
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
  };
  /** Wall-clock time the generation call took, in milliseconds. */
  durationMs: number;
}

export type GenerationErrorCategory =
  | "configuration"
  | "authentication"
  | "rate_limit"
  | "timeout"
  | "network"
  | "provider_error";

export interface GenerationFailure {
  ok: false;
  provider: ProviderName;
  error: {
    category: GenerationErrorCategory;
    /** Machine-readable code, provider-namespaced, e.g. "gemini.invalid_api_key". */
    code: string;
    /** Human-readable message safe to log/display. */
    message: string;
    /** Original error/cause, if any, for debugging — not for display. */
    cause?: unknown;
  };
  durationMs: number;
}

export type GenerationResult = GenerationSuccess | GenerationFailure;

// ---------------------------------------------------------------------------
// Error type used internally by provider implementations to signal failure
// before it's wrapped into a GenerationFailure. Keeps category/code/message
// mandatory and typed even when thrown mid-implementation.
// ---------------------------------------------------------------------------

export class GenerationError extends Error {
  constructor(
    public readonly provider: ProviderName,
    public readonly category: GenerationErrorCategory,
    public readonly code: string,
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "GenerationError";
  }

  toFailure(durationMs: number): GenerationFailure {
    return {
      ok: false,
      provider: this.provider,
      error: {
        category: this.category,
        code: this.code,
        message: this.message,
        cause: this.cause,
      },
      durationMs,
    };
  }
}

// ---------------------------------------------------------------------------
// Common generator contract
// ---------------------------------------------------------------------------

/**
 * Every provider's generator implements exactly this. Business logic depends
 * only on this interface, never on a provider SDK type.
 */
export interface ContentGenerator {
  readonly provider: ProviderName;
  generate(request: GenerationRequest): Promise<GenerationResult>;
}

// ---------------------------------------------------------------------------
// Provider-specific generator stubs
// ---------------------------------------------------------------------------
// No actual API calls yet. Each stub shows where the SDK call, timeout
// enforcement, and error mapping belong. Each is constructed FROM an
// already-resolved AIProvider instance (from provider-selector.ts) — this
// layer never resolves a provider itself.

// Gemini is now implemented for real in ./gemini-generator.ts (imported above
// as RealGeminiContentGenerator). Claude, Ollama, and Mock remain stubs below,
// unchanged and unimplemented, per scope.

// Claude is now implemented for real in ./claude-generator.ts (imported
// above as RealClaudeContentGenerator). Ollama and Mock's generate paths
// are described below; Ollama remains an unimplemented stub, Mock is real.

export class OllamaContentGenerator implements ContentGenerator {
  readonly provider = "ollama" as const;
  constructor(private readonly resolved: AIProvider) {
    assertProviderMatches(resolved, "ollama");
  }

  async generate(request: GenerationRequest): Promise<GenerationResult> {
    const start = Date.now();
    try {
      // TODO: real Ollama HTTP call (local host), same timeout/error-mapping
      // contract. Network category is especially relevant here (local
      // daemon unreachable).
      throw new GenerationError(
        "ollama",
        "provider_error",
        "ollama.not_implemented",
        "Ollama API call is not implemented yet."
      );
    } catch (err) {
      const durationMs = Date.now() - start;
      if (err instanceof GenerationError) return err.toFailure(durationMs);
      return unexpectedFailure("ollama", err, durationMs);
    }
  }
}

export class MockContentGenerator implements ContentGenerator {
  readonly provider = "mock" as const;
  constructor(private readonly resolved: AIProvider) {
    // This check is what guarantees requirement 9: this generator only ever
    // runs against a MockProvider instance, which itself is only produced
    // by ProviderSelector when AI_PROVIDER === "mock".
    assertProviderMatches(resolved, "mock");
  }

  async generate(request: GenerationRequest): Promise<GenerationResult> {
    const start = Date.now();
    // Deterministic, local, no network/timeout concerns. Content is the
    // 30-piece batch (10 Reels + 10 FB posts + 10 Shorts) serialized as
    // JSON text, so callers use the same `content: string` contract as
    // every other provider and validate it with content-schema.ts.
    const batch = generateMockContentBatch(request.prompt);
    return {
      ok: true,
      provider: "mock",
      content: JSON.stringify(batch),
      durationMs: Date.now() - start,
    };
  }
}

function assertProviderMatches(resolved: AIProvider, expected: ProviderName): void {
  if (resolved.name !== expected) {
    throw new GenerationError(
      expected,
      "configuration",
      `${expected}.provider_mismatch`,
      `Expected a resolved "${expected}" provider but received "${resolved.name}".`
    );
  }
}

function unexpectedFailure(
  provider: ProviderName,
  err: unknown,
  durationMs: number
): GenerationFailure {
  return {
    ok: false,
    provider,
    error: {
      category: "provider_error",
      code: `${provider}.unexpected_error`,
      message: err instanceof Error ? err.message : "Unknown error during generation.",
      cause: err,
    },
    durationMs,
  };
}

// ---------------------------------------------------------------------------
// Factory: maps a resolved AIProvider to its ContentGenerator.
// Still no fallback — this is a 1:1 lookup, not a chain.
// ---------------------------------------------------------------------------

export function createContentGenerator(resolved: AIProvider): ContentGenerator {
  switch (resolved.name) {
    case "gemini":
      return new RealGeminiContentGenerator(resolved);
    case "claude":
      return new RealClaudeContentGenerator(resolved);
    case "ollama":
      return new OllamaContentGenerator(resolved);
    case "mock":
      return new MockContentGenerator(resolved);
    default: {
      const _exhaustive: never = resolved.name;
      throw new GenerationError(
        resolved.name as ProviderName,
        "configuration",
        "unknown_provider",
        `No content generator exists for provider "${String(_exhaustive)}".`
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Usage (business logic never sees SDK details, provider name is opaque
// data it can log/branch on but never uses to pick a fallback):
// ---------------------------------------------------------------------------
//
// const provider = ProviderSelector.select(loadedConfig);   // selection layer
// const generator = createContentGenerator(provider);       // this layer
// const result = await generator.generate({ prompt, timeoutMs: 30_000 });
// if (result.ok) { /* result.content */ } else { /* result.error.category */ }
