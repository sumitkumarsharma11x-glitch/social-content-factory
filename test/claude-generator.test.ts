import { describe, it, expect } from "vitest";
import { ClaudeContentGenerator, type ClaudeClientLike } from "../src/claude-generator";
import { ClaudeProvider } from "../src/provider-selector";

const SECRET_API_KEY = "sk-ant-super-secret-xyz789";

function resolvedClaudeProvider() {
  return ClaudeProvider.fromConfig({ apiKey: SECRET_API_KEY });
}

function baseEnv(overrides: Partial<NodeJS.ProcessEnv> = {}): NodeJS.ProcessEnv {
  return {
    ANTHROPIC_API_KEY: SECRET_API_KEY,
    CLAUDE_MODEL: "claude-sonnet-4-6",
    ...overrides,
  } as NodeJS.ProcessEnv;
}

function fakeClientFactory(
  impl: ClaudeClientLike["messages"]["create"]
): () => Promise<ClaudeClientLike> {
  return async () => ({ messages: { create: impl } });
}

describe("ClaudeContentGenerator", () => {
  it("returns tool_use input as JSON content when structuredOutput is requested", async () => {
    const generator = new ClaudeContentGenerator(resolvedClaudeProvider(), {
      env: baseEnv(),
      clientFactory: fakeClientFactory(async (args) => {
        expect(args.model).toBe("claude-sonnet-4-6");
        expect(args.tool_choice).toEqual({ type: "tool", name: "submit_batch" });
        return {
          content: [{ type: "tool_use", input: { pieces: [{ a: 1 }] } }],
          usage: { input_tokens: 10, output_tokens: 20 },
        };
      }),
    });

    const result = await generator.generate({
      prompt: "Hello",
      timeoutMs: 5000,
      options: {
        structuredOutput: { name: "submit_batch", description: "d", schema: { type: "object" } },
      },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.provider).toBe("claude");
      expect(JSON.parse(result.content)).toEqual({ pieces: [{ a: 1 }] });
      expect(result.usage).toEqual({ inputTokens: 10, outputTokens: 20 });
    }
  });

  it("returns concatenated text content when no structuredOutput is requested", async () => {
    const generator = new ClaudeContentGenerator(resolvedClaudeProvider(), {
      env: baseEnv(),
      clientFactory: fakeClientFactory(async () => ({
        content: [{ type: "text", text: "Hi there!" }],
      })),
    });

    const result = await generator.generate({ prompt: "Hello", timeoutMs: 5000 });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.content).toBe("Hi there!");
  });

  it("returns a configuration failure when the API key is missing", async () => {
    const generator = new ClaudeContentGenerator(resolvedClaudeProvider(), {
      env: baseEnv({ ANTHROPIC_API_KEY: undefined }),
      clientFactory: fakeClientFactory(async () => {
        throw new Error("should never be called without an API key");
      }),
    });

    const result = await generator.generate({ prompt: "Hello", timeoutMs: 5000 });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.category).toBe("configuration");
      expect(result.error.code).toBe("claude.missing_api_key");
    }
  });

  it("maps a 401 SDK error to an authentication failure", async () => {
    const generator = new ClaudeContentGenerator(resolvedClaudeProvider(), {
      env: baseEnv(),
      clientFactory: fakeClientFactory(async () => {
        const err: any = new Error("invalid x-api-key");
        err.status = 401;
        throw err;
      }),
    });

    const result = await generator.generate({ prompt: "Hello", timeoutMs: 5000 });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.category).toBe("authentication");
      expect(result.error.code).toBe("claude.http_401");
    }
  });

  it("returns a timeout failure when the call exceeds timeoutMs", async () => {
    const generator = new ClaudeContentGenerator(resolvedClaudeProvider(), {
      env: baseEnv(),
      clientFactory: fakeClientFactory(
        (_args, opts) =>
          new Promise((_resolve, reject) => {
            opts?.signal?.addEventListener("abort", () => {
              const abortErr = new Error("This operation was aborted");
              abortErr.name = "AbortError";
              reject(abortErr);
            });
          })
      ),
    });

    const result = await generator.generate({ prompt: "Hello", timeoutMs: 20 });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.category).toBe("timeout");
      expect(result.error.code).toBe("claude.timeout");
    }
  }, 2000);

  it("maps a 429 SDK error to a rate_limit failure", async () => {
    const generator = new ClaudeContentGenerator(resolvedClaudeProvider(), {
      env: baseEnv(),
      clientFactory: fakeClientFactory(async () => {
        const err: any = new Error("rate limited");
        err.status = 429;
        throw err;
      }),
    });

    const result = await generator.generate({ prompt: "Hello", timeoutMs: 5000 });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.category).toBe("rate_limit");
      expect(result.error.code).toBe("claude.rate_limited");
    }
  });

  it("maps a connection-refused failure to a network failure", async () => {
    const generator = new ClaudeContentGenerator(resolvedClaudeProvider(), {
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
      expect(result.error.code).toBe("claude.econnrefused");
    }
  });

  it("maps a 500 SDK error to a provider_error failure", async () => {
    const generator = new ClaudeContentGenerator(resolvedClaudeProvider(), {
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
      expect(result.error.code).toBe("claude.http_500");
    }
  });

  it("never lets the API key appear anywhere in a failure result", async () => {
    const generator = new ClaudeContentGenerator(resolvedClaudeProvider(), {
      env: baseEnv(),
      clientFactory: fakeClientFactory(async () => {
        const err: any = new Error(`Upstream rejected key ${SECRET_API_KEY} in header`);
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
