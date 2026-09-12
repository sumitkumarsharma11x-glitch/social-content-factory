import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type Database from "better-sqlite3";
import { openDatabase } from "../src/db";
import { generateBatch } from "../src/generate-batch-usecase";
import { generateMockContentBatch } from "../src/mock-content-batch";
import type { ContentGenerator, GenerationRequest, GenerationResult } from "../src/content-generator";
import type { ProviderName } from "../src/provider-selector";
import { getBatch, listPieces } from "../src/persistence";
import { TOTAL_PIECES, PIECES_PER_PLATFORM, PLATFORMS } from "../src/content-schema";

let db: Database.Database;

beforeEach(() => {
  db = openDatabase(":memory:");
});

afterEach(() => {
  db.close();
});

/** Scriptable fake ContentGenerator: returns queued results, one per call. */
class ScriptedGenerator implements ContentGenerator {
  public calls: GenerationRequest[] = [];
  constructor(public readonly provider: ProviderName, private readonly queue: GenerationResult[]) {}

  async generate(request: GenerationRequest): Promise<GenerationResult> {
    this.calls.push(request);
    const next = this.queue.shift();
    if (!next) throw new Error("ScriptedGenerator ran out of queued results");
    return next;
  }
}

function validBatchJson(): string {
  return JSON.stringify(generateMockContentBatch("photosynthesis"));
}

function successResult(provider: ProviderName, content: string): GenerationResult {
  return { ok: true, provider, content, durationMs: 5 };
}

function failureResult(provider: ProviderName, category: any, message = "boom"): GenerationResult {
  return { ok: false, provider, error: { category, code: `${provider}.x`, message }, durationMs: 5 };
}

function countRows(table: "batches" | "pieces"): number {
  return (db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n;
}

describe("generateBatch", () => {
  it("rejects an unsupported provider (mock) with stage=provider_guard and persists nothing", async () => {
    const generator = new ScriptedGenerator("mock", []);
    const result = await generateBatch({ topic: "fractions", generator, model: "mock-v1", db });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.stage).toBe("provider_guard");
    expect(countRows("batches")).toBe(0);
    expect(countRows("pieces")).toBe(0);
  });

  it("succeeds on the first attempt: generates, validates, and saves as draft", async () => {
    const generator = new ScriptedGenerator("claude", [successResult("claude", validBatchJson())]);

    const result = await generateBatch({ topic: "photosynthesis", generator, model: "claude-sonnet-4-6", db });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.attempts).toBe(1);
      expect(result.pieceIds).toHaveLength(TOTAL_PIECES);

      const batch = getBatch(db, result.batchId);
      expect(batch?.status).toBe("draft");
      expect(batch?.provider).toBe("claude");
      expect(batch?.model).toBe("claude-sonnet-4-6");

      const pieces = listPieces(db, result.batchId);
      expect(pieces).toHaveLength(TOTAL_PIECES);
      for (const platform of PLATFORMS) {
        expect(pieces.filter((p) => p.platform === platform)).toHaveLength(PIECES_PER_PLATFORM);
      }
    }
    expect(generator.calls).toHaveLength(1);
  });

  it("retries the SAME generator on invalid JSON, then succeeds on attempt 2", async () => {
    const generator = new ScriptedGenerator("gemini", [
      successResult("gemini", "not json at all {{{"),
      successResult("gemini", validBatchJson()),
    ]);

    const result = await generateBatch({ topic: "gravity", generator, model: "gemini-2.5-flash", db, maxAttempts: 2 });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.attempts).toBe(2);
    expect(generator.calls).toHaveLength(2);
    // Second call's prompt should carry corrective feedback.
    expect(generator.calls[1].prompt).toContain("previous attempt did not match");
  });

  it("retries on a schema-invalid (but parseable) batch, then succeeds", async () => {
    const badBatch = generateMockContentBatch("x");
    badBatch.pieces.pop(); // 29 pieces -> invalid
    const generator = new ScriptedGenerator("claude", [
      successResult("claude", JSON.stringify(badBatch)),
      successResult("claude", validBatchJson()),
    ]);

    const result = await generateBatch({ topic: "x", generator, model: "claude-sonnet-4-6", db, maxAttempts: 2 });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.attempts).toBe(2);
  });

  it("fails with stage=validation and persists NOTHING after exhausting retries on invalid content", async () => {
    const badBatch = generateMockContentBatch("x");
    badBatch.pieces.pop();
    const generator = new ScriptedGenerator("claude", [
      successResult("claude", JSON.stringify(badBatch)),
      successResult("claude", JSON.stringify(badBatch)),
    ]);

    const result = await generateBatch({ topic: "x", generator, model: "claude-sonnet-4-6", db, maxAttempts: 2 });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.stage).toBe("validation");
      expect(result.attempts).toBe(2);
      expect(result.validationErrors && result.validationErrors.length).toBeGreaterThan(0);
    }
    expect(countRows("batches")).toBe(0);
    expect(countRows("pieces")).toBe(0);
  });

  it("retries a retryable generation failure (timeout) on the SAME provider, then succeeds", async () => {
    const generator = new ScriptedGenerator("gemini", [
      failureResult("gemini", "timeout"),
      successResult("gemini", validBatchJson()),
    ]);

    const result = await generateBatch({ topic: "x", generator, model: "gemini-2.5-flash", db, maxAttempts: 2 });

    expect(result.ok).toBe(true);
    expect(generator.calls).toHaveLength(2);
    // Never a different provider: the same ScriptedGenerator instance (provider="gemini") was reused.
    expect(generator.provider).toBe("gemini");
  });

  it("does NOT retry a non-retryable generation failure (authentication) and persists nothing", async () => {
    const generator = new ScriptedGenerator("claude", [failureResult("claude", "authentication")]);

    const result = await generateBatch({ topic: "x", generator, model: "claude-sonnet-4-6", db, maxAttempts: 3 });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.stage).toBe("generation");
      expect(result.attempts).toBe(1);
    }
    expect(generator.calls).toHaveLength(1); // no retry attempted
    expect(countRows("batches")).toBe(0);
  });

  it("respects a custom maxAttempts of 1 (no retries at all)", async () => {
    const generator = new ScriptedGenerator("claude", [successResult("claude", "not json")]);

    const result = await generateBatch({ topic: "x", generator, model: "claude-sonnet-4-6", db, maxAttempts: 1 });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.stage).toBe("parsing");
      expect(result.attempts).toBe(1);
    }
    expect(generator.calls).toHaveLength(1);
  });
});
