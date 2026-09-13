import { describe, it, expect } from "vitest";
import { validateContentBatch, TOTAL_PIECES } from "../src/content-schema";
import { generateMockContentBatch } from "../src/mock-content-batch";

function validBatch() {
  return generateMockContentBatch("protein powder launch");
}

describe("validateContentBatch", () => {
  it("accepts a well-formed 30-piece batch", () => {
    const result = validateContentBatch(validBatch());
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("requires exactly 30 pieces (rejects 29)", () => {
    const batch = validBatch();
    batch.pieces.pop(); // 29 pieces
    const result = validateContentBatch(batch);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes(`expected exactly ${TOTAL_PIECES} pieces`))).toBe(true);
  });

  it("requires exactly 30 pieces (rejects 31)", () => {
    const batch = validBatch();
    batch.pieces.push({ ...batch.pieces[0] }); // duplicate -> 31 total
    const result = validateContentBatch(batch);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes(`expected exactly ${TOTAL_PIECES} pieces`))).toBe(true);
  });

  it("rejects duplicate piece_numbers within the same platform", () => {
    const batch = validBatch();
    // Make piece 2 of instagram_reel collide with piece 1's number.
    const reelPieces = batch.pieces.filter((p) => p.platform === "instagram_reel");
    reelPieces[1].piece_number = reelPieces[0].piece_number;

    const result = validateContentBatch(batch);
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.includes("duplicate piece_number 1 for platform \"instagram_reel\""))
    ).toBe(true);
  });

  it("rejects a piece with a missing/empty title", () => {
    const batch = validBatch();
    batch.pieces[0].title = "";
    const result = validateContentBatch(batch);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("title must be a non-empty string"))).toBe(true);
  });

  it("rejects a piece with a missing body field", () => {
    const batch = validBatch();
    // @ts-expect-error intentionally malformed for the test
    delete batch.pieces[5].body;
    const result = validateContentBatch(batch);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("body must be a non-empty string"))).toBe(true);
  });

  it("rejects a piece with empty hashtags", () => {
    const batch = validBatch();
    batch.pieces[3].hashtags = [];
    const result = validateContentBatch(batch);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("hashtags must be a non-empty array"))).toBe(true);
  });

  it("rejects a piece with an empty cta", () => {
    const batch = validBatch();
    batch.pieces[7].cta = "   ";
    const result = validateContentBatch(batch);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("cta must be a non-empty string"))).toBe(true);
  });

  it("rejects a piece with an invalid platform value", () => {
    const batch = validBatch();
    // @ts-expect-error intentionally malformed for the test
    batch.pieces[0].platform = "tiktok_video";
    const result = validateContentBatch(batch);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("platform must be one of"))).toBe(true);
  });

  it("rejects a batch missing an entire platform's coverage", () => {
    const batch = validBatch();
    batch.pieces = batch.pieces.filter((p) => p.platform !== "youtube_short");
    // Pad back to 30 with duplicate instagram_reel pieces so the *count*
    // check alone wouldn't catch this — the per-platform check must.
    while (batch.pieces.length < TOTAL_PIECES) {
      batch.pieces.push({ ...batch.pieces[0] });
    }
    const result = validateContentBatch(batch);
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.includes('platform "youtube_short"') && e.includes("missing piece_number"))
    ).toBe(true);
  });

  it("rejects non-object input", () => {
    const result = validateContentBatch("not a batch");
    expect(result.valid).toBe(false);
  });

  it("rejects a batch where pieces is not an array", () => {
    const result = validateContentBatch({ pieces: "nope" });
    expect(result.valid).toBe(false);
  });
});
