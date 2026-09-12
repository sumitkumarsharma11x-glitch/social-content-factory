import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type Database from "better-sqlite3";
import { openDatabase } from "../src/db";
import {
  saveValidatedBatch,
  getBatch,
  listBatches,
  listBatchesByStatus,
  listPieces,
  updatePieceContent,
  transitionPieceStatus,
  transitionBatchStatus,
  InvalidBatchError,
  InvalidTransitionError,
  NotFoundError,
} from "../src/persistence";
import { generateMockContentBatch } from "../src/mock-content-batch";
import { TOTAL_PIECES, PIECES_PER_PLATFORM, PLATFORMS } from "../src/content-schema";

let db: Database.Database;

beforeEach(() => {
  db = openDatabase(":memory:");
});

afterEach(() => {
  db.close();
});

function validBatch() {
  return generateMockContentBatch("spring sale");
}

function countRows(table: "batches" | "pieces"): number {
  return (db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n;
}

describe("saveValidatedBatch", () => {
  it("persists a valid 30-piece batch and returns the batch id + 30 piece ids", () => {
    const result = saveValidatedBatch(db, { provider: "mock", model: "mock-v1", batch: validBatch() });

    expect(typeof result.batchId).toBe("number");
    expect(result.pieceIds).toHaveLength(TOTAL_PIECES);
    expect(new Set(result.pieceIds).size).toBe(TOTAL_PIECES); // all unique
  });

  it("persists exactly 30 piece rows for the batch, 10 per platform", () => {
    const { batchId } = saveValidatedBatch(db, { provider: "mock", model: "mock-v1", batch: validBatch() });

    const pieces = listPieces(db, batchId);
    expect(pieces).toHaveLength(TOTAL_PIECES);

    for (const platform of PLATFORMS) {
      expect(pieces.filter((p) => p.platform === platform)).toHaveLength(PIECES_PER_PLATFORM);
    }
  });

  it("creates the batch with status draft and pieces with status pending", () => {
    const { batchId } = saveValidatedBatch(db, { provider: "mock", model: "mock-v1", batch: validBatch() });

    const batch = getBatch(db, batchId);
    expect(batch?.status).toBe("draft");

    const pieces = listPieces(db, batchId);
    expect(pieces.every((p) => p.status === "pending")).toBe(true);
  });

  it("round-trips hashtags as a real string array through JSON TEXT storage", () => {
    const batch = validBatch();
    batch.pieces[0].hashtags = ["#one", "#two", "#three"];

    const { batchId } = saveValidatedBatch(db, { provider: "mock", model: "mock-v1", batch });
    const pieces = listPieces(db, batchId);
    const first = pieces.find((p) => p.platform === batch.pieces[0].platform && p.piece_number === 1)!;

    expect(Array.isArray(first.hashtags)).toBe(true);
    expect(first.hashtags).toEqual(["#one", "#two", "#three"]);

    // And confirm it's genuinely stored as TEXT in the DB, not some other type.
    const raw = db.prepare(`SELECT hashtags FROM pieces WHERE id = ?`).get(first.id) as { hashtags: string };
    expect(typeof raw.hashtags).toBe("string");
    expect(JSON.parse(raw.hashtags)).toEqual(["#one", "#two", "#three"]);
  });

  it("refuses an invalid batch before writing anything (wrong total piece count)", () => {
    const batch = validBatch();
    batch.pieces.pop(); // 29 pieces -> invalid

    expect(() => saveValidatedBatch(db, { provider: "mock", model: "mock-v1", batch })).toThrow(
      InvalidBatchError
    );

    expect(countRows("batches")).toBe(0);
    expect(countRows("pieces")).toBe(0);
  });

  it("refuses an invalid batch before writing anything (empty field)", () => {
    const batch = validBatch();
    batch.pieces[4].title = "";

    expect(() => saveValidatedBatch(db, { provider: "mock", model: "mock-v1", batch })).toThrow(
      InvalidBatchError
    );

    expect(countRows("batches")).toBe(0);
    expect(countRows("pieces")).toBe(0);
  });

  it("rolls back the ENTIRE transaction, leaving zero rows, when a duplicate slot violates the UNIQUE constraint", () => {
    // Bypass validateContentBatch's own duplicate detection by constructing
    // a batch that is otherwise "valid-shaped" per field checks but forces
    // a DB-level UNIQUE collision: two pieces claiming the same
    // (platform, piece_number) slot, achieved by removing one piece so the
    // total is still 30 pieces the validator would reject for a different
    // reason (missing piece_number) OR — to specifically exercise the DB
    // constraint independent of the app-level validator — insert directly
    // through the same transaction path with a monkey-patched batch that
    // slips past validation is not possible since validation always runs
    // first. Instead, this test drives the constraint directly to prove
    // the transaction rollback mechanics, independent of the validation
    // gate already covered above.
    const batch = validBatch();

    const insertBatch = db.prepare(`INSERT INTO batches (provider, model, status) VALUES (?, ?, 'draft')`);
    const insertPiece = db.prepare(
      `INSERT INTO pieces (batch_id, platform, piece_number, title, body, hashtags, cta, status)
       VALUES (@batch_id, @platform, @piece_number, @title, @body, @hashtags, @cta, 'pending')`
    );

    const runInTransaction = db.transaction(() => {
      const batchInsertResult = insertBatch.run("mock", "mock-v1");
      const batchId = Number(batchInsertResult.lastInsertRowid);

      for (let i = 0; i < batch.pieces.length; i++) {
        const piece = batch.pieces[i];
        insertPiece.run({
          batch_id: batchId,
          platform: piece.platform,
          // Force the 2nd piece to collide with the 1st piece's slot.
          piece_number: i === 1 ? batch.pieces[0].piece_number : piece.piece_number,
          title: piece.title,
          body: piece.body,
          hashtags: JSON.stringify(piece.hashtags),
          cta: piece.cta,
        });
      }
    });

    expect(() => runInTransaction()).toThrow(); // UNIQUE constraint violation

    expect(countRows("batches")).toBe(0); // the batch insert was rolled back too
    expect(countRows("pieces")).toBe(0);
  });

});

describe("getBatch / listBatchesByStatus", () => {
  it("returns null for a non-existent batch id", () => {
    expect(getBatch(db, 9999)).toBeNull();
  });

  it("lists batches filtered by status", () => {
    const a = saveValidatedBatch(db, { provider: "mock", model: "mock-v1", batch: validBatch() });
    const b = saveValidatedBatch(db, { provider: "mock", model: "mock-v1", batch: validBatch() });
    transitionBatchStatus(db, b.batchId, "in_review");

    const drafts = listBatchesByStatus(db, "draft");
    const inReview = listBatchesByStatus(db, "in_review");

    expect(drafts.map((r) => r.id)).toEqual([a.batchId]);
    expect(inReview.map((r) => r.id)).toEqual([b.batchId]);
  });
});

describe("listBatches", () => {
  it("returns an empty list when no batches exist", () => {
    expect(listBatches(db)).toEqual([]);
  });

  it("returns every batch newest-first, each with total/approved piece counts", () => {
    const a = saveValidatedBatch(db, { provider: "mock", model: "mock-v1", batch: validBatch() });
    const b = saveValidatedBatch(db, { provider: "mock", model: "mock-v1", batch: validBatch() });
    transitionPieceStatus(db, b.pieceIds[0], "approved");
    transitionPieceStatus(db, b.pieceIds[1], "approved");

    const summaries = listBatches(db);

    expect(summaries.map((s) => s.id)).toEqual([b.batchId, a.batchId]); // newest first
    const bSummary = summaries.find((s) => s.id === b.batchId)!;
    const aSummary = summaries.find((s) => s.id === a.batchId)!;
    expect(bSummary.totalPieces).toBe(TOTAL_PIECES);
    expect(bSummary.approvedPieces).toBe(2);
    expect(aSummary.totalPieces).toBe(TOTAL_PIECES);
    expect(aSummary.approvedPieces).toBe(0);
  });
});

describe("updatePieceContent", () => {
  it("updates content fields without changing status", () => {
    const { batchId, pieceIds } = saveValidatedBatch(db, { provider: "mock", model: "mock-v1", batch: validBatch() });
    const pieceId = pieceIds[0];

    updatePieceContent(db, pieceId, { title: "New Title", hashtags: ["#new"] });

    const piece = listPieces(db, batchId).find((p) => p.id === pieceId)!;
    expect(piece.title).toBe("New Title");
    expect(piece.hashtags).toEqual(["#new"]);
    expect(piece.status).toBe("pending"); // unchanged
  });

  it("throws NotFoundError for a non-existent piece id", () => {
    expect(() => updatePieceContent(db, 9999, { title: "x" })).toThrow(NotFoundError);
  });
});

describe("transitionPieceStatus", () => {
  let batchId: number;
  let pieceIds: number[];

  beforeEach(() => {
    const result = saveValidatedBatch(db, { provider: "mock", model: "mock-v1", batch: validBatch() });
    batchId = result.batchId;
    pieceIds = result.pieceIds;
  });

  it("allows pending -> approved", () => {
    transitionPieceStatus(db, pieceIds[0], "approved");
    const piece = listPieces(db, batchId).find((p) => p.id === pieceIds[0])!;
    expect(piece.status).toBe("approved");
  });

  it("allows approved -> edited (reopen)", () => {
    transitionPieceStatus(db, pieceIds[0], "approved");
    transitionPieceStatus(db, pieceIds[0], "edited");
    const piece = listPieces(db, batchId).find((p) => p.id === pieceIds[0])!;
    expect(piece.status).toBe("edited");
  });

  it("rejects an illegal transition (approved -> approved)", () => {
    transitionPieceStatus(db, pieceIds[0], "approved");
    expect(() => transitionPieceStatus(db, pieceIds[0], "approved")).toThrow(InvalidTransitionError);
  });

  it("rejects an illegal transition (pending -> pending is not in the allowed list)", () => {
    expect(() => transitionPieceStatus(db, pieceIds[0], "pending" as any)).toThrow(InvalidTransitionError);
  });

  it("throws NotFoundError for a non-existent piece id", () => {
    expect(() => transitionPieceStatus(db, 9999, "approved")).toThrow(NotFoundError);
  });
});

describe("transitionBatchStatus", () => {
  let batchId: number;
  let pieceIds: number[];

  beforeEach(() => {
    const result = saveValidatedBatch(db, { provider: "mock", model: "mock-v1", batch: validBatch() });
    batchId = result.batchId;
    pieceIds = result.pieceIds;
  });

  it("allows draft -> in_review", () => {
    transitionBatchStatus(db, batchId, "in_review");
    expect(getBatch(db, batchId)?.status).toBe("in_review");
  });

  it("rejects draft -> approved (must go through in_review)", () => {
    expect(() => transitionBatchStatus(db, batchId, "approved")).toThrow(InvalidTransitionError);
  });

  it("cannot approve the batch unless all 30 pieces are approved", () => {
    transitionBatchStatus(db, batchId, "in_review");

    // Approve only 29 of 30.
    for (let i = 0; i < pieceIds.length - 1; i++) {
      transitionPieceStatus(db, pieceIds[i], "approved");
    }

    expect(() => transitionBatchStatus(db, batchId, "approved")).toThrow(InvalidTransitionError);
    expect(getBatch(db, batchId)?.status).toBe("in_review"); // unchanged
  });

  it("approves the batch once all 30 pieces are approved", () => {
    transitionBatchStatus(db, batchId, "in_review");
    for (const id of pieceIds) {
      transitionPieceStatus(db, id, "approved");
    }

    transitionBatchStatus(db, batchId, "approved");
    expect(getBatch(db, batchId)?.status).toBe("approved");
  });

  it("allows approved -> in_review (reopen) and approved -> archived", () => {
    transitionBatchStatus(db, batchId, "in_review");
    for (const id of pieceIds) transitionPieceStatus(db, id, "approved");
    transitionBatchStatus(db, batchId, "approved");

    transitionBatchStatus(db, batchId, "in_review");
    expect(getBatch(db, batchId)?.status).toBe("in_review");

    // Re-approve and archive.
    transitionBatchStatus(db, batchId, "approved");
    transitionBatchStatus(db, batchId, "archived");
    expect(getBatch(db, batchId)?.status).toBe("archived");
  });

  it("rejects a transition out of the terminal archived status", () => {
    transitionBatchStatus(db, batchId, "in_review");
    transitionBatchStatus(db, batchId, "rejected");
    transitionBatchStatus(db, batchId, "archived");

    expect(() => transitionBatchStatus(db, batchId, "in_review")).toThrow(InvalidTransitionError);
  });

  it("throws NotFoundError for a non-existent batch id", () => {
    expect(() => transitionBatchStatus(db, 9999, "in_review")).toThrow(NotFoundError);
  });
});
