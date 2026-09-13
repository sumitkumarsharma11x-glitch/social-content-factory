import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type Database from "better-sqlite3";
import { openDatabase } from "../src/db";
import { saveValidatedBatch } from "../src/persistence";
import { generateMockContentBatch } from "../src/mock-content-batch";
import {
  handleListBatchesRequest,
  handleGetBatchRequest,
  handleUpdatePieceRequest,
  handleTransitionPieceRequest,
} from "../src/review-dashboard-route";

let db: Database.Database;
let batchId: number;
let pieceIds: number[];

beforeEach(() => {
  db = openDatabase(":memory:");
  const result = saveValidatedBatch(db, {
    provider: "mock",
    model: "mock-v1",
    batch: generateMockContentBatch("cell division"),
  });
  batchId = result.batchId;
  pieceIds = result.pieceIds;
});

afterEach(() => {
  db.close();
});

describe("handleListBatchesRequest", () => {
  it("returns all saved batches with piece progress", async () => {
    const { status, result } = await handleListBatchesRequest({ db });

    expect(status).toBe(200);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.batches).toHaveLength(1);
      expect(result.batches[0].id).toBe(batchId);
      expect(result.batches[0].totalPieces).toBe(30);
      expect(result.batches[0].approvedPieces).toBe(0);
    }
  });

  it("reflects approvals in the progress count", async () => {
    await handleTransitionPieceRequest(pieceIds[0], "approved", { db });

    const { result } = await handleListBatchesRequest({ db });
    if (result.ok) {
      expect(result.batches[0].approvedPieces).toBe(1);
    }
  });
});

describe("handleGetBatchRequest", () => {
  it("returns the batch and all 30 pieces", async () => {
    const { status, result } = await handleGetBatchRequest(batchId, { db });

    expect(status).toBe(200);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.batch.id).toBe(batchId);
      expect(result.batch.status).toBe("draft");
      expect(result.pieces).toHaveLength(30);
    }
  });

  it("returns 404 for a non-existent batch", async () => {
    const { status, result } = await handleGetBatchRequest(999999, { db });
    expect(status).toBe(404);
    expect(result.ok).toBe(false);
  });
});

describe("handleUpdatePieceRequest", () => {
  it("saves an edit and returns the updated piece", async () => {
    const { status, result } = await handleUpdatePieceRequest(
      pieceIds[0],
      { title: "Mitosis in 30 seconds", hashtags: ["#biology", "#cells"] },
      { db }
    );

    expect(status).toBe(200);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.piece.title).toBe("Mitosis in 30 seconds");
      expect(result.piece.hashtags).toEqual(["#biology", "#cells"]);
      expect(result.piece.status).toBe("pending"); // unchanged by a content edit
    }
  });

  it("returns 404 for a non-existent piece", async () => {
    const { status, result } = await handleUpdatePieceRequest(999999, { title: "x" }, { db });
    expect(status).toBe(404);
    expect(result.ok).toBe(false);
  });

  it("returns 400 when an edit violates a DB constraint (empty title)", async () => {
    const { status, result } = await handleUpdatePieceRequest(pieceIds[0], { title: "" }, { db });
    expect(status).toBe(400);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("Edit was rejected");
  });
});

describe("handleTransitionPieceRequest", () => {
  it("approves a pending piece", async () => {
    const { status, result } = await handleTransitionPieceRequest(pieceIds[0], "approved", { db });
    expect(status).toBe(200);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.piece.status).toBe("approved");
  });

  it("rejects a pending piece", async () => {
    const { status, result } = await handleTransitionPieceRequest(pieceIds[1], "rejected", { db });
    expect(status).toBe(200);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.piece.status).toBe("rejected");
  });

  it("returns 409 for an illegal transition (approved -> approved)", async () => {
    await handleTransitionPieceRequest(pieceIds[0], "approved", { db });
    const { status, result } = await handleTransitionPieceRequest(pieceIds[0], "approved", { db });
    expect(status).toBe(409);
    expect(result.ok).toBe(false);
  });

  it("returns 404 for a non-existent piece", async () => {
    const { status, result } = await handleTransitionPieceRequest(999999, "approved", { db });
    expect(status).toBe(404);
    expect(result.ok).toBe(false);
  });
});
