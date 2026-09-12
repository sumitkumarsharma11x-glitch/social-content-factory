import { describe, it, expect } from "vitest";
import {
  GeminiContentGenerator,
  type GeminiClientLike,
} from "../src/gemini-generator";
import { GeminiProvider } from "../src/provider-selector";

const SECRET_API_KEY = "sk-gemini-super-secret-abc123";

/** Builds a resolved GeminiProvider the same way ProviderSelector would. */
function resolvedGeminiProvider() {
  return GeminiProvider.fromConfig({ apiKey: SECRET_API_KEY });
}

function baseEnv(overrides: Partial<NodeJS.ProcessEnv> = {}): NodeJS.ProcessEnv {
  return {
    GEMINI_API_KEY: SECRET_API_KEY,
    GEMINI_MODEL: "gemini-2.5-flash",
    ...overrides,
  } as NodeJS.ProcessEnv;
}

function fakeClientFactory(
  impl: GeminiClientLike["models"]["generateContent"]
): () => Promise<GeminiClientLike> {
  return async () => ({ models: { generateContent: impl } });
}

describe("GeminiContentGenerator", () => {
  it("returns a successful GenerationResult on a normal call", async () => {
    const generator = new GeminiContentGenerator(resolvedGeminiProvider(), {
      env: baseEnv(),
      clientFactory: fakeClientFactory(async (args) => {
        expect(args.model).toBe("gemini-2.5-flash");
        expect(args.contents).toBe("Hello");
        return {
          text: "Hi there!",
          usageMetadata: { promptTokenCount: 3, candidatesTokenCount: 4 },
        };
      }),
    });

    const result = await generator.generate({ prompt: "Hello", timeoutMs: 5000 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.provider).toBe("gemini");
      expect(result.content).toBe("Hi there!");
      expect(result.usage).toEqual({ inputTokens: 3, outputTokens: 4 });
      expect(typeof result.durationMs).toBe("number");
    }
  });

  it("returns a configuration failure when the API key is missing", async () => {
    const generator = new GeminiContentGenerator(resolvedGeminiProvider(), {
      env: baseEnv({ GEMINI_API_KEY: undefined, GOOGLE_API_KEY: undefined }),
      clientFactory: fakeClientFactory(async () => {
        throw new Error("should never be called without an API key");
      }),
    });

    const result = await generator.generate({ prompt: "Hello", timeoutMs: 5000 });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.provider).toBe("gemini");
      expect(result.error.category).toBe("configuration");
      expect(result.error.code).toBe("gemini.missing_api_key");
    }
  });

  it("maps a 401/403 SDK error to an authentication failure", async () => {
    const generator = new GeminiContentGenerator(resolvedGeminiProvider(), {
      env: baseEnv(),
      clientFactory: fakeClientFactory(async () => {
        const err: any = new Error("Request is missing required authentication credential.");
        err.name = "AuthenticationError";
        err.status = 401;
        throw err;
      }),
    });

    const result = await generator.generate({ prompt: "Hello", timeoutMs: 5000 });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.category).toBe("authentication");
      expect(result.error.code).toBe("gemini.http_401");
    }
  });

  it("returns a timeout failure when the call exceeds timeoutMs", async () => {
    const generator = new GeminiContentGenerator(resolvedGeminiProvider(), {
      env: baseEnv(),
      clientFactory: fakeClientFactory(
        (args) =>
          new Promise((_resolve, reject) => {
            const signal = args.config?.abortSignal;
            signal?.addEventListener("abort", () => {
              const abortErr = new Error("This operation was aborted");
              abortErr.name = "AbortError";
              reject(abortErr);
            });
            // Never resolves on its own — only the abort fires.
          })
      ),
    });

    const result = await generator.generate({ prompt: "Hello", timeoutMs: 20 });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.category).toBe("timeout");
      expect(result.error.code).toBe("gemini.timeout");
    }
  }, 2000);

  it("maps a 429 SDK error to a rate_limit failure", async () => {
    const generator = new GeminiContentGenerator(resolvedGeminiProvider(), {
      env: baseEnv(),
      clientFactory: fakeClientFactory(async () => {
        const err: any = new Error("Resource has been exhausted (quota).");
        err.status = 429;
        throw err;
      }),
    });

    const result = await generator.generate({ prompt: "Hello", timeoutMs: 5000 });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.category).toBe("rate_limit");
      expect(result.error.code).toBe("gemini.rate_limited");
    }
  });

  it("maps a connection-refused failure to a network failure", async () => {
    const generator = new GeminiContentGenerator(resolvedGeminiProvider(), {
      env: baseEnv(),
      clientFactory: fakeClientFactory(async () => {
        const err: any = new Error("connect ECONNREFUSED 127.0.0.1:443");
        err.code = "ECONNREFUSED";
        throw err;
      }),
    });

    const result = await generator.generate({ prompt: "Hello", timeoutMs: 5000 });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.category).toBe("network");
      expect(result.error.code).toBe("gemini.econnrefused");
    }
  });

  it("maps a 500 SDK error to a provider_error failure", async () => {
    const generator = new GeminiContentGenerator(resolvedGeminiProvider(), {
      env: baseEnv(),
      clientFactory: fakeClientFactory(async () => {
        const err: any = new Error("Internal error occurred.");
        err.status = 500;
        throw err;
      }),
    });

    const result = await generator.generate({ prompt: "Hello", timeoutMs: 5000 });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.category).toBe("provider_error");
      expect(result.error.code).toBe("gemini.http_500");
    }
  });

  it("never lets the API key appear anywhere in a failure result", async () => {
    const generator = new GeminiContentGenerator(resolvedGeminiProvider(), {
      env: baseEnv(),
      clientFactory: fakeClientFactory(async () => {
        // Simulate an SDK/proxy error that (mis)echoes the key in its message.
        const err: any = new Error(
          `Upstream rejected request with key ${SECRET_API_KEY} in query string`
        );
        err.status = 400;
        throw err;
      }),
    });

    const result = await generator.generate({ prompt: "Hello", timeoutMs: 5000 });

    expect(result.ok).toBe(false);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain(SECRET_API_KEY);
    if (!result.ok) {
      expect(result.error.message).not.toContain(SECRET_API_KEY);
      expect(result.error.message).toContain("[REDACTED]");
    }
  });
});
