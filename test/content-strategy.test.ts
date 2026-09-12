import { describe, it, expect } from "vitest";
import { generateMockContentBatch } from "../src/mock-content-batch";
import { validateContentBatch } from "../src/content-schema";

function photosynthesisBatch() {
  return generateMockContentBatch('Topic/Chapter: "Photosynthesis"');
}

describe("content strategy mock", () => {
  it("creates 30 pieces with 10 core questions shared across platforms", () => {
    const batch = photosynthesisBatch();
    expect(batch.pieces).toHaveLength(30);
    expect(new Set(batch.pieces.map((p) => p.core_question_id)).size).toBe(10);

    for (let id = 1; id <= 10; id++) {
      const group = batch.pieces.filter((p) => p.core_question_id === id);
      expect(group).toHaveLength(3);
      expect(new Set(group.map((p) => p.title)).size).toBe(1);
    }
  });

  it("uses different explanation angles across platforms for each core question", () => {
    const batch = photosynthesisBatch();
    for (let id = 1; id <= 10; id++) {
      const group = batch.pieces.filter((p) => p.core_question_id === id);
      expect(new Set(group.map((p) => p.explanation_angle)).size).toBe(3);
    }
  });

  it("keeps website mentions contextual and below 100 percent", () => {
    const batch = photosynthesisBatch();
    const mentions = batch.pieces.filter((p) => p.body.includes("rojgardwaar.in")).length;
    expect(mentions).toBe(20);
    expect(mentions).toBeLessThan(30);
    expect(batch.pieces.every((p) => !p.body.includes("example.com"))).toBe(true);
  });

  it("validates strategy metadata as an additive quality contract", () => {
    const batch = photosynthesisBatch();
    expect(validateContentBatch(batch)).toEqual({ valid: true, errors: [] });

    batch.pieces[10].explanation_angle = batch.pieces[0].explanation_angle;
    const result = validateContentBatch(batch);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("explanation_angle must differ across platforms"))).toBe(true);
  });
});
