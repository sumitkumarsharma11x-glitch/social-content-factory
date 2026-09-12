import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type Database from "better-sqlite3";
import { openDatabase } from "../src/db";
import { handleGenerateBatchRequest } from "../src/generate-batch-route";
import { getBatch } from "../src/persistence";
import { generateMockContentBatch } from "../src/mock-content-batch";
import { TOTAL_PIECES, PIECES_PER_PLATFORM, PLATFORMS } from "../src/content-schema";
import type { ContentGenerator, GenerationRequest, GenerationResult } from "../src/content-generator";
import type { AIProvider, ProviderName } from "../src/provider-selector";

let db: Database.Database;

beforeEach(() => {
  db = openDatabase(":memory:");
});

afterEach(() => {
  db.close();
});

function countRows(table: "batches" | "pieces"): number {
  return (db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n;
}

/** Fake ContentGenerator standing in for the real network call. */
class FakeGenerator implements ContentGenerator {
  public calls: GenerationRequest[] = [];
  constructor(public readonly provider: ProviderName, private readonly queue: GenerationResult[]) {}
  async generate(request: GenerationRequest): Promise<GenerationResult> {
    this.calls.push(request);
    const next = this.queue.shift();
    if (!next) throw new Error("FakeGenerator ran out of queued results");
    return next;
  }
}

function successResult(provider: ProviderName, content: string): GenerationResult {
  return { ok: true, provider, content, durationMs: 5 };
}

const fullyConfiguredEnv = {
  GEMINI_API_KEY: "fake-gemini-key",
  GEMINI_MODEL: "gemini-2.5-flash",
  ANTHROPIC_API_KEY: "fake-claude-key",
  CLAUDE_MODEL: "claude-sonnet-4-6",
  OLLAMA_HOST: "http://localhost:11434",
  OLLAMA_MODEL: "llama3",
} as unknown as NodeJS.ProcessEnv;

describe("handleGenerateBatchRequest — input validation", () => {
  it("returns 400 when topic is missing", async () => {
    const { status, result } = await handleGenerateBatchRequest(
      { topic: "", provider: "claude" },
      { db, env: fullyConfiguredEnv }
    );
    expect(status).toBe(400);
    expect(result.ok).toBe(false);
  });

  it("returns 400 when provider is missing", async () => {
    const { status, result } = await handleGenerateBatchRequest(
      { topic: "photosynthesis" } as any,
      { db, env: fullyConfiguredEnv }
    );
    expect(status).toBe(400);
    expect(result.ok).toBe(false);
  });
});

describe("handleGenerateBatchRequest — provider guard (server-side config only)", () => {
  it("returns 422 when Gemini is not configured", async () => {
    const { status, result } = await handleGenerateBatchRequest(
      { topic: "photosynthesis", provider: "gemini" },
      { db, env: { ...fullyConfiguredEnv, GEMINI_API_KEY: undefined } as any }
    );
    expect(status).toBe(422);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.stage).toBe("provider_guard");
  });

  it("returns 422 when Claude is not configured", async () => {
    const { status, result } = await handleGenerateBatchRequest(
      { topic: "photosynthesis", provider: "claude" },
      { db, env: { ...fullyConfiguredEnv, CLAUDE_MODEL: undefined } as any }
    );
    expect(status).toBe(422);
    expect(result.ok).toBe(false);
  });

  it("returns 422 when Ollama is not configured", async () => {
    const { status, result } = await handleGenerateBatchRequest(
      { topic: "photosynthesis", provider: "ollama" },
      { db, env: { ...fullyConfiguredEnv, OLLAMA_HOST: undefined } as any }
    );
    expect(status).toBe(422);
    expect(result.ok).toBe(false);
  });

  it("returns 422 for a genuinely unsupported provider value", async () => {
    const { status, result } = await handleGenerateBatchRequest(
      { topic: "photosynthesis", provider: "not-a-real-provider" as any },
      { db, env: fullyConfiguredEnv }
    );
    expect(status).toBe(422);
    expect(result.ok).toBe(false);
  });

  it("never exposes credentials in the response even on failure", async () => {
    const { result } = await handleGenerateBatchRequest(
      { topic: "photosynthesis", provider: "gemini" },
      { db, env: { ...fullyConfiguredEnv, GEMINI_API_KEY: undefined } as any }
    );
    expect(JSON.stringify(result)).not.toContain("fake-gemini-key");
  });
});

describe("handleGenerateBatchRequest — mock provider (no credentials required)", () => {
  it("returns 201 with 30 persisted pieces using the REAL mock generator (no injection, no network)", async () => {
    const { status, result } = await handleGenerateBatchRequest(
      { topic: "photosynthesis", provider: "mock" },
      { db, env: {} as any } // deliberately empty env: mock must not require any config
    );

    expect(status).toBe(201);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.pieces).toHaveLength(TOTAL_PIECES);
      const batch = getBatch(db, result.batchId);
      expect(batch?.provider).toBe("mock");
      expect(batch?.status).toBe("draft");
    }
  });
});

describe("handleGenerateBatchRequest — end-to-end via injected generator", () => {
  it("returns 201 with 30 persisted pieces on success (real generateBatch + real saveValidatedBatch)", async () => {
    const fake = new FakeGenerator("claude", [successResult("claude", JSON.stringify(generateMockContentBatch("photosynthesis")))]);

    const { status, result } = await handleGenerateBatchRequest(
      { topic: "photosynthesis", provider: "claude" },
      { db, env: fullyConfiguredEnv, createGenerator: () => fake }
    );

    expect(status).toBe(201);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.pieces).toHaveLength(TOTAL_PIECES);
      for (const platform of PLATFORMS) {
        expect(result.pieces.filter((p) => p.platform === platform)).toHaveLength(PIECES_PER_PLATFORM);
      }
      const batch = getBatch(db, result.batchId);
      expect(batch?.status).toBe("draft");
      expect(batch?.provider).toBe("claude");
      expect(batch?.model).toBe("claude-sonnet-4-6");
    }
  });

  it("returns 502 and persists nothing when generation fails validation after retries", async () => {
    const badBatch = generateMockContentBatch("x");
    badBatch.pieces.pop(); // 29 pieces -> invalid
    const fake = new FakeGenerator("gemini", [
      successResult("gemini", JSON.stringify(badBatch)),
      successResult("gemini", JSON.stringify(badBatch)),
    ]);

    const { status, result } = await handleGenerateBatchRequest(
      { topic: "x", provider: "gemini" },
      { db, env: fullyConfiguredEnv, createGenerator: () => fake }
    );

    expect(status).toBe(502);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.stage).toBe("validation");
      expect(result.validationErrors && result.validationErrors.length).toBeGreaterThan(0);
    }
    expect(countRows("batches")).toBe(0);
    expect(countRows("pieces")).toBe(0);
  });
});
