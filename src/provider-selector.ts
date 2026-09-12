/**
 * Provider Selection Architecture
 * ---------------------------------
 * Rules enforced by this design:
 *  - Exactly ONE provider is selected explicitly (no iteration, no chaining).
 *  - Selection is config-driven and produces a resolved provider reference only.
 *  - No generateContent() (or any content-generation call) happens during selection.
 *  - No automatic fallback between providers, ever.
 *  - MockProvider is only reachable when AI_PROVIDER === "mock".
 *  - Missing/invalid config for the selected provider throws a
 *    ProviderConfigurationError — it never causes a different provider to be tried.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ProviderName = "gemini" | "claude" | "ollama" | "mock";

/**
 * Marker interface only. Intentionally has NO generation method here —
 * content generation is defined and implemented elsewhere, in a separate
 * concern, so this file stays limited to selection/resolution.
 */
export interface AIProvider {
  readonly name: ProviderName;
}

// Per-provider config shapes. Add fields as needed; keep them provider-specific
// so validation errors are precise instead of generic.
export interface GeminiConfig {
  apiKey: string;
}

export interface ClaudeConfig {
  apiKey: string;
}

export interface OllamaConfig {
  host: string;
  model: string;
}

export interface MockConfig {
  // Mock intentionally requires no credentials.
}

export interface AppConfig {
  /** Must be set explicitly. There is no default provider. */
  AI_PROVIDER: ProviderName;
  gemini?: Partial<GeminiConfig>;
  claude?: Partial<ClaudeConfig>;
  ollama?: Partial<OllamaConfig>;
  mock?: Partial<MockConfig>;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/**
 * Thrown when the selected provider's configuration is missing/invalid.
 * This must NEVER trigger selection of a different provider — it is a
 * terminal error for the request.
 */
export class ProviderConfigurationError extends Error {
  constructor(public readonly provider: ProviderName, reason: string) {
    super(`Provider configuration error for "${provider}": ${reason}`);
    this.name = "ProviderConfigurationError";
  }
}

/** Thrown when AI_PROVIDER is missing, empty, or not a recognized value. */
export class ProviderSelectionError extends Error {
  constructor(reason: string) {
    super(`Provider selection error: ${reason}`);
    this.name = "ProviderSelectionError";
  }
}

// ---------------------------------------------------------------------------
// Provider stubs (no API calls implemented — construction/validation only)
// ---------------------------------------------------------------------------

export class GeminiProvider implements AIProvider {
  readonly name = "gemini" as const;
  private constructor(private readonly config: GeminiConfig) {}

  static fromConfig(config: Partial<GeminiConfig> | undefined): GeminiProvider {
    if (!config?.apiKey) {
      throw new ProviderConfigurationError("gemini", "missing required apiKey");
    }
    return new GeminiProvider({ apiKey: config.apiKey });
  }
}

export class ClaudeProvider implements AIProvider {
  readonly name = "claude" as const;
  private constructor(private readonly config: ClaudeConfig) {}

  static fromConfig(config: Partial<ClaudeConfig> | undefined): ClaudeProvider {
    if (!config?.apiKey) {
      throw new ProviderConfigurationError("claude", "missing required apiKey");
    }
    return new ClaudeProvider({ apiKey: config.apiKey });
  }
}

export class OllamaProvider implements AIProvider {
  readonly name = "ollama" as const;
  private constructor(private readonly config: OllamaConfig) {}

  static fromConfig(config: Partial<OllamaConfig> | undefined): OllamaProvider {
    if (!config?.host) {
      throw new ProviderConfigurationError("ollama", "missing required host");
    }
    if (!config?.model) {
      throw new ProviderConfigurationError("ollama", "missing required model");
    }
    return new OllamaProvider({ host: config.host, model: config.model });
  }
}

export class MockProvider implements AIProvider {
  readonly name = "mock" as const;
  private constructor() {}

  static fromConfig(_config: Partial<MockConfig> | undefined): MockProvider {
    // No credentials required, but still goes through the same explicit path.
    return new MockProvider();
  }
}

// ---------------------------------------------------------------------------
// Selector
// ---------------------------------------------------------------------------

/**
 * Resolves AppConfig.AI_PROVIDER to exactly one AIProvider instance.
 *
 * Guarantees:
 *  - Reads AI_PROVIDER once; does not probe or test-call any provider.
 *  - Never falls through to another provider on failure.
 *  - Never invokes any content-generation method.
 *  - "mock" is only reachable if AI_PROVIDER is literally "mock".
 */
export class ProviderSelector {
  static select(config: AppConfig): AIProvider {
    const selected = config.AI_PROVIDER;

    if (!selected) {
      throw new ProviderSelectionError(
        "AI_PROVIDER is not set; a provider must be explicitly configured"
      );
    }

    switch (selected) {
      case "gemini":
        return GeminiProvider.fromConfig(config.gemini);

      case "claude":
        return ClaudeProvider.fromConfig(config.claude);

      case "ollama":
        return OllamaProvider.fromConfig(config.ollama);

      case "mock":
        return MockProvider.fromConfig(config.mock);

      default: {
        // Exhaustiveness guard: if ProviderName grows, this fails to compile
        // until handled above — preventing silent unhandled cases.
        const _exhaustive: never = selected;
        throw new ProviderSelectionError(
          `Unrecognized AI_PROVIDER value: "${String(_exhaustive)}"`
        );
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Usage (selection only — no generation call is made or implied here)
// ---------------------------------------------------------------------------
//
// const provider = ProviderSelector.select(loadedConfig);
// // `provider` is now a single, concrete AIProvider (gemini | claude | ollama | mock).
// // Passing it to a content-generation call is a separate concern, out of scope here.
