/**
 * Persistence Layer
 * ---------------------------------
 * Implements the interface from the approved persistence-architecture.md.
 * Depends on content-schema.ts only for ContentBatch/ContentPiece/Platform
 * and validateContentBatch() — none of which are modified here.
 *
 * No UI, no publishing, no HTTP endpoints, no Claude/Ollama. This module
 * only reads/writes SQLite via better-sqlite3.
 */

import type Database from "better-sqlite3";
import { validateContentBatch, type ContentBatch, type ContentPiece, type Platform } from "./content-schema";
import type { ProviderName } from "./provider-selector";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BatchStatus = "draft" | "in_review" | "approved" | "rejected" | "archived";
export type PieceStatus = "pending" | "edited" | "approved" | "rejected";

export interface BatchRecord {
  id: number;
  created_at: string;
  provider: ProviderName;
  model: string;
  status: BatchStatus;
}

export interface PieceRecord {
  id: number;
  batch_id: number;
  platform: Platform;
  piece_number: number;
  title: string;
  body: string;
  hashtags: string[];
  cta: string;
  status: PieceStatus;
}

export interface SaveBatchInput {
  provider: ProviderName;
  model: string;
  /** Must already satisfy validateContentBatch(batch).valid === true. */
  batch: ContentBatch;
}

export interface SaveBatchResult {
  batchId: number;
  /** Piece ids, index-aligned to SaveBatchInput.batch.pieces order. */
  pieceIds: number[];
}

export type PieceEdit = Partial<Pick<ContentPiece, "title" | "body" | "hashtags" | "cta">>;

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class InvalidBatchError extends Error {
  constructor(public readonly errors: string[]) {
    super(`Batch failed validation and was not persisted: ${errors.join("; ")}`);
    this.name = "InvalidBatchError";
  }
}

export class InvalidTransitionError extends Error {
  constructor(kind: "batch" | "piece", from: string, to: string, reason?: string) {
    super(
      `Invalid ${kind} status transition: "${from}" -> "${to}"` + (reason ? ` (${reason})` : "")
    );
    this.name = "InvalidTransitionError";
  }
}

export class NotFoundError extends Error {
  constructor(kind: "batch" | "piece", id: number) {
    super(`${kind} with id ${id} was not found`);
    this.name = "NotFoundError";
  }
}

// ---------------------------------------------------------------------------
// Status transition tables (per the approved design, §3)
// ---------------------------------------------------------------------------

const BATCH_TRANSITIONS: Record<BatchStatus, BatchStatus[]> = {
  draft: ["in_review"],
  in_review: ["approved", "rejected"],
  approved: ["in_review", "archived"],
  rejected: ["archived"],
  archived: [],
};

const PIECE_TRANSITIONS: Record<PieceStatus, PieceStatus[]> = {
  pending: ["edited", "approved", "rejected"],
  edited: ["approved", "rejected"],
  approved: ["edited"],
  rejected: ["edited"],
};

// ---------------------------------------------------------------------------
// Row <-> domain mapping
// ---------------------------------------------------------------------------

interface BatchRow {
  id: number;
  created_at: string;
  provider: string;
  model: string;
  status: string;
}

interface PieceRow {
  id: number;
  batch_id: number;
  platform: string;
  piece_number: number;
  title: string;
  body: string;
  hashtags: string;
  cta: string;
  status: string;
}

function mapBatchRow(row: BatchRow): BatchRecord {
  return {
    id: row.id,
    created_at: row.created_at,
    provider: row.provider as ProviderName,
    model: row.model,
    status: row.status as BatchStatus,
  };
}

function mapPieceRow(row: PieceRow): PieceRecord {
  return {
    id: row.id,
    batch_id: row.batch_id,
    platform: row.platform as Platform,
    piece_number: row.piece_number,
    title: row.title,
    body: row.body,
    hashtags: JSON.parse(row.hashtags),
    cta: row.cta,
    status: row.status as PieceStatus,
  };
}

// ---------------------------------------------------------------------------
// saveValidatedBatch
// ---------------------------------------------------------------------------

/**
 * Re-validates the batch (defense-in-depth against a caller that skipped
 * validateContentBatch), then inserts one `batches` row (status="draft")
 * and all 30 `pieces` rows (status="pending") inside a single
 * better-sqlite3 transaction. Throws InvalidBatchError (no DB write at all)
 * if validation fails, or lets a constraint violation propagate — either
 * way, no partial batch is ever left behind.
 */
export function saveValidatedBatch(db: Database.Database, input: SaveBatchInput): SaveBatchResult {
  // Step 1: application gate. No BEGIN, no writes, if this fails.
  const validation = validateContentBatch(input.batch);
  if (!validation.valid) {
    throw new InvalidBatchError(validation.errors);
  }

  const insertBatch = db.prepare(
    `INSERT INTO batches (provider, model, status) VALUES (@provider, @model, 'draft')`
  );
  const insertPiece = db.prepare(
    `INSERT INTO pieces (batch_id, platform, piece_number, title, body, hashtags, cta, status)
     VALUES (@batch_id, @platform, @piece_number, @title, @body, @hashtags, @cta, 'pending')`
  );

  // Step 2: single transaction. better-sqlite3's db.transaction() wraps
  // this in BEGIN/COMMIT and automatically ROLLBACKs the whole thing if
  // the function throws at any point (e.g. a UNIQUE or CHECK violation on
  // any one piece insert).
  const runInTransaction = db.transaction((batch: ContentBatch) => {
    const batchInsertResult = insertBatch.run({ provider: input.provider, model: input.model });
    const batchId = Number(batchInsertResult.lastInsertRowid);

    const pieceIds: number[] = [];
    for (const piece of batch.pieces) {
      const result = insertPiece.run({
        batch_id: batchId,
        platform: piece.platform,
        piece_number: piece.piece_number,
        title: piece.title,
        body: piece.body,
        hashtags: JSON.stringify(piece.hashtags),
        cta: piece.cta,
      });
      pieceIds.push(Number(result.lastInsertRowid));
    }

    return { batchId, pieceIds };
  });

  return runInTransaction(input.batch);
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export function getBatch(db: Database.Database, batchId: number): BatchRecord | null {
  const row = db.prepare(`SELECT * FROM batches WHERE id = ?`).get(batchId) as BatchRow | undefined;
  return row ? mapBatchRow(row) : null;
}

export function listBatchesByStatus(db: Database.Database, status: BatchStatus): BatchRecord[] {
  const rows = db
    .prepare(`SELECT * FROM batches WHERE status = ? ORDER BY created_at DESC`)
    .all(status) as BatchRow[];
  return rows.map(mapBatchRow);
}

export interface BatchSummary extends BatchRecord {
  /** Always 30 for a batch saved via saveValidatedBatch; 0 only if pieces were somehow removed. */
  totalPieces: number;
  approvedPieces: number;
}

interface BatchSummaryRow extends BatchRow {
  total_pieces: number;
  approved_pieces: number | null;
}

/**
 * Every batch (any status), newest first, each annotated with piece counts
 * for a "Batch History" list view — one aggregate query, no N+1 per batch.
 */
export function listBatches(db: Database.Database): BatchSummary[] {
  const rows = db
    .prepare(
      `SELECT b.*,
              COUNT(p.id) AS total_pieces,
              SUM(CASE WHEN p.status = 'approved' THEN 1 ELSE 0 END) AS approved_pieces
       FROM batches b
       LEFT JOIN pieces p ON p.batch_id = b.id
       GROUP BY b.id
       ORDER BY b.created_at DESC, b.id DESC`
    )
    .all() as BatchSummaryRow[];

  return rows.map((row) => ({
    ...mapBatchRow(row),
    totalPieces: row.total_pieces,
    approvedPieces: row.approved_pieces ?? 0,
  }));
}

export function listPieces(db: Database.Database, batchId: number): PieceRecord[] {
  const rows = db
    .prepare(`SELECT * FROM pieces WHERE batch_id = ? ORDER BY platform, piece_number`)
    .all(batchId) as PieceRow[];
  return rows.map(mapPieceRow);
}

// ---------------------------------------------------------------------------
// Edits (content only — never changes status)
// ---------------------------------------------------------------------------

export function updatePieceContent(db: Database.Database, pieceId: number, edit: PieceEdit): void {
  const existingRow = db.prepare(`SELECT * FROM pieces WHERE id = ?`).get(pieceId) as PieceRow | undefined;
  if (!existingRow) {
    throw new NotFoundError("piece", pieceId);
  }

  const next = {
    title: edit.title ?? existingRow.title,
    body: edit.body ?? existingRow.body,
    hashtags: edit.hashtags ? JSON.stringify(edit.hashtags) : existingRow.hashtags,
    cta: edit.cta ?? existingRow.cta,
  };

  db.prepare(
    `UPDATE pieces SET title = @title, body = @body, hashtags = @hashtags, cta = @cta WHERE id = @id`
  ).run({ ...next, id: pieceId });
}

// ---------------------------------------------------------------------------
// Status transitions
// ---------------------------------------------------------------------------

export function transitionPieceStatus(db: Database.Database, pieceId: number, next: PieceStatus): void {
  const row = db.prepare(`SELECT * FROM pieces WHERE id = ?`).get(pieceId) as PieceRow | undefined;
  if (!row) {
    throw new NotFoundError("piece", pieceId);
  }

  const current = row.status as PieceStatus;
  const allowed = PIECE_TRANSITIONS[current] ?? [];
  if (!allowed.includes(next)) {
    throw new InvalidTransitionError("piece", current, next);
  }

  db.prepare(`UPDATE pieces SET status = ? WHERE id = ?`).run(next, pieceId);
}

/**
 * Enforces the batch transition table. For `in_review -> approved`,
 * verifies all 30 pieces for the batch are currently `approved` (a
 * cross-row rule SQLite CHECK constraints can't express) before applying
 * the transition; throws InvalidTransitionError otherwise.
 */
export function transitionBatchStatus(db: Database.Database, batchId: number, next: BatchStatus): void {
  const row = db.prepare(`SELECT * FROM batches WHERE id = ?`).get(batchId) as BatchRow | undefined;
  if (!row) {
    throw new NotFoundError("batch", batchId);
  }

  const current = row.status as BatchStatus;
  const allowed = BATCH_TRANSITIONS[current] ?? [];
  if (!allowed.includes(next)) {
    throw new InvalidTransitionError("batch", current, next);
  }

  if (current === "in_review" && next === "approved") {
    const pieces = listPieces(db, batchId);
    const notApproved = pieces.filter((p) => p.status !== "approved");
    if (pieces.length === 0 || notApproved.length > 0) {
      throw new InvalidTransitionError(
        "batch",
        current,
        next,
        `${notApproved.length} of ${pieces.length} piece(s) are not yet approved`
      );
    }
  }

  db.prepare(`UPDATE batches SET status = ? WHERE id = ?`).run(next, batchId);
}
