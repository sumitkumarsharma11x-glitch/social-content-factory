import { describe, it, expect } from "vitest";
import { ProviderSelector, type AppConfig } from "../src/provider-selector";
import { createContentGenerator } from "../src/content-generator";
import { validateContentBatch, PLATFORMS, PIECES_PER_PLATFORM, TOTAL_PIECES } from "../src/content-schema";

describe("MockProvider end-to-end generation", () => {
  it("produces exactly 30 pieces (10 Reels + 10 FB posts + 10 Shorts) that pass validation", async () => {
    const config: AppConfig = { AI_PROVIDER: "mock" };

    const provider = ProviderSelector.select(config);
    expect(provider.name).toBe("mock");

    const generator = createContentGenerator(provider);
    expect(generator.provider).toBe("mock");

    const result = await generator.generate({
      prompt: "protein powder launch",
      timeoutMs: 5000,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const batch = JSON.parse(result.content);
    expect(batch.pieces).toHaveLength(TOTAL_PIECES);

    for (const platform of PLATFORMS) {
      const count = batch.pieces.filter((p: any) => p.platform === platform).length;
      expect(count).toBe(PIECES_PER_PLATFORM);
    }

    const validation = validateContentBatch(batch);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toEqual([]);

    for (const piece of batch.pieces) {
      expect(piece.piece_number).toBeGreaterThanOrEqual(1);
      expect(piece.piece_number).toBeLessThanOrEqual(10);
      expect(typeof piece.title).toBe("string");
      expect(piece.title.length).toBeGreaterThan(0);
      expect(typeof piece.body).toBe("string");
      expect(piece.body.length).toBeGreaterThan(0);
      expect(Array.isArray(piece.hashtags)).toBe(true);
      expect(piece.hashtags.length).toBeGreaterThan(0);
      expect(typeof piece.cta).toBe("string");
      expect(piece.cta.length).toBeGreaterThan(0);
    }
  });

  it("never selects mock when AI_PROVIDER is gemini", () => {
    const config: AppConfig = { AI_PROVIDER: "gemini", gemini: { apiKey: "fake-key-for-selection-only" } };
    const provider = ProviderSelector.select(config);
    expect(provider.name).toBe("gemini");
    expect(provider.name).not.toBe("mock");
  });

  it("never selects mock when AI_PROVIDER is claude", () => {
    const config: AppConfig = { AI_PROVIDER: "claude", claude: { apiKey: "fake-key-for-selection-only" } };
    const provider = ProviderSelector.select(config);
    expect(provider.name).toBe("claude");
    expect(provider.name).not.toBe("mock");
  });

  it("never selects mock when AI_PROVIDER is ollama", () => {
    const config: AppConfig = {
      AI_PROVIDER: "ollama",
      ollama: { host: "http://localhost:11434", model: "llama3" },
    };
    const provider = ProviderSelector.select(config);
    expect(provider.name).toBe("ollama");
    expect(provider.name).not.toBe("mock");
  });
});
