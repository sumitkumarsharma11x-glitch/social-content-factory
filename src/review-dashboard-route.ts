/**
 * Review Dashboard API Routes
 * ---------------------------------
 * Thin bridge between the Review Dashboard UI and the existing,
 * unmodified persistence.ts. As with generate-batch-route.ts, each route
 * is a pure async handler (no Express types in the signature) that does
 * the real work, plus a thin Express adapter that's not separately
 * unit-tested.
 *
 *  - GET  /api/batches                        -> all saved batches + piece progress (Batch History)
 *  - GET  /api/batches/:batchId              -> batch + its pieces
 *  - PUT  /api/pieces/:pieceId                -> edit content (title/body/hashtags/cta)
 *  - POST /api/pieces/:pieceId/transition     -> { status } piece status change
 *
 * No batch-level "approve all" here — that's the Final Approval Flow
 * feature; this dashboard only edits/approves/rejects individual pieces,
 * reusing transitionPieceStatus's existing rules (including the fact that
 * the batch itself can't reach "approved" until all 30 pieces already are,
 * enforced elsewhere in transitionBatchStatus — unchanged, untouched here).
 */

import type { Request, Response, Router } from "express";
import type Database from "better-sqlite3";
import {
  getBatch,
  listBatches,
  listPieces,
  updatePieceContent,
  transitionPieceStatus,
  NotFoundError,
  InvalidTransitionError,
  type BatchRecord,
  type BatchSummary,
  type PieceRecord,
  type PieceStatus,
} from "./persistence";

export interface ListBatchesApiSuccess {
  ok: true;
  batches: BatchSummary[];
}
export type ListBatchesApiResult = ListBatchesApiSuccess | ApiFailure;

export async function handleListBatchesRequest(deps: {
  db: Database.Database;
}): Promise<{ status: number; result: ListBatchesApiResult }> {
  const batches = listBatches(deps.db);
  return { status: 200, result: { ok: true, batches } };
}

export interface GetBatchApiSuccess {
  ok: true;
  batch: BatchRecord;
  pieces: PieceRecord[];
}
export interface ApiFailure {
  ok: false;
  message: string;
}
export type GetBatchApiResult = GetBatchApiSuccess | ApiFailure;

export async function handleGetBatchRequest(
  batchId: number,
  deps: { db: Database.Database }
): Promise<{ status: number; result: GetBatchApiResult }> {
  const batch = getBatch(deps.db, batchId);
  if (!batch) {
    return { status: 404, result: { ok: false, message: `Batch ${batchId} was not found.` } };
  }
  const pieces = listPieces(deps.db, batchId);
  return { status: 200, result: { ok: true, batch, pieces } };
}

export interface UpdatePieceApiSuccess {
  ok: true;
  piece: PieceRecord;
}
export type UpdatePieceApiResult = UpdatePieceApiSuccess | ApiFailure;

function findPiece(db: Database.Database, pieceId: number): PieceRecord | null {
  const row = db.prepare(`SELECT batch_id FROM pieces WHERE id = ?`).get(pieceId) as
    | { batch_id: number }
    | undefined;
  if (!row) return null;
  return listPieces(db, row.batch_id).find((p) => p.id === pieceId) ?? null;
}

export interface UpdatePieceRequestBody {
  title?: string;
  body?: string;
  hashtags?: string[];
  cta?: string;
}

export async function handleUpdatePieceRequest(
  pieceId: number,
  edit: UpdatePieceRequestBody,
  deps: { db: Database.Database }
): Promise<{ status: number; result: UpdatePieceApiResult }> {
  try {
    updatePieceContent(deps.db, pieceId, edit);
  } catch (err) {
    if (err instanceof NotFoundError) {
      return { status: 404, result: { ok: false, message: err.message } };
    }
    // Any other failure here is almost always a DB CHECK constraint
    // rejecting an invalid edit (e.g. an empty title) — surfaced as a
    // clean 400 rather than a raw SQLite error leaking to the client.
    return {
      status: 400,
      result: { ok: false, message: `Edit was rejected: ${err instanceof Error ? err.message : "invalid content"}` },
    };
  }

  const piece = findPiece(deps.db, pieceId);
  if (!piece) {
    return { status: 404, result: { ok: false, message: `Piece ${pieceId} was not found after update.` } };
  }
  return { status: 200, result: { ok: true, piece } };
}

export interface TransitionPieceApiSuccess {
  ok: true;
  piece: PieceRecord;
}
export type TransitionPieceApiResult = TransitionPieceApiSuccess | ApiFailure;

export async function handleTransitionPieceRequest(
  pieceId: number,
  nextStatus: PieceStatus,
  deps: { db: Database.Database }
): Promise<{ status: number; result: TransitionPieceApiResult }> {
  try {
    transitionPieceStatus(deps.db, pieceId, nextStatus);
  } catch (err) {
    if (err instanceof NotFoundError) {
      return { status: 404, result: { ok: false, message: err.message } };
    }
    if (err instanceof InvalidTransitionError) {
      return { status: 409, result: { ok: false, message: err.message } };
    }
    return { status: 400, result: { ok: false, message: err instanceof Error ? err.message : "Transition failed." } };
  }

  const piece = findPiece(deps.db, pieceId);
  if (!piece) {
    return { status: 404, result: { ok: false, message: `Piece ${pieceId} was not found after transition.` } };
  }
  return { status: 200, result: { ok: true, piece } };
}

/** Registers the three Review Dashboard routes on an existing Express Router/app. */
export function registerReviewDashboardRoutes(router: Router, db: Database.Database): void {
  router.get("/api/batches", async (_req: Request, res: Response) => {
    const { status, result } = await handleListBatchesRequest({ db });
    res.status(status).json(result);
  });

  router.get("/api/batches/:batchId", async (req: Request, res: Response) => {
    const batchId = Number(req.params.batchId);
    const { status, result } = await handleGetBatchRequest(batchId, { db });
    res.status(status).json(result);
  });

  router.put("/api/pieces/:pieceId", async (req: Request, res: Response) => {
    const pieceId = Number(req.params.pieceId);
    const { status, result } = await handleUpdatePieceRequest(pieceId, req.body ?? {}, { db });
    res.status(status).json(result);
  });

  router.post("/api/pieces/:pieceId/transition", async (req: Request, res: Response) => {
    const pieceId = Number(req.params.pieceId);
    const { status, result } = await handleTransitionPieceRequest(pieceId, req.body?.status, { db });
    res.status(status).json(result);
  });
}
