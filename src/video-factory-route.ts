/**
 * Video Factory Phase 2: production-plan API.
 *
 * This layer does not render MP4s. It turns approved content into a stable,
 * renderer-ready 9:16 production plan containing voice-over, scenes, visual
 * instructions, and on-screen text. Phase 3 can consume this plan to render.
 */

import type { Request, Response, Router } from "express";
import type Database from "better-sqlite3";
import { getBatch, listPieces, NotFoundError, type PieceRecord } from "./persistence";
import { buildVideoProductionPlan, type VideoProductionPlan } from "./video-factory";

export interface VideoPlanSuccess {
  ok: true;
  plan: VideoProductionPlan;
}

export interface VideoBatchPlanSuccess {
  ok: true;
  batchId: number;
  plans: VideoProductionPlan[];
}

export interface VideoPlanFailure {
  ok: false;
  message: string;
}

function toContentPiece(piece: PieceRecord) {
  return {
    platform: piece.platform,
    piece_number: piece.piece_number,
    title: piece.title,
    body: piece.body,
    hashtags: piece.hashtags,
    cta: piece.cta,
  };
}

export async function handlePieceVideoPlanRequest(
  pieceId: number,
  deps: { db: Database.Database }
): Promise<{ status: number; result: VideoPlanSuccess | VideoPlanFailure }> {
  const row = deps.db.prepare("SELECT batch_id FROM pieces WHERE id = ?").get(pieceId) as
    | { batch_id: number }
    | undefined;

  if (!row) {
    return { status: 404, result: { ok: false, message: `Piece ${pieceId} was not found.` } };
  }

  const piece = listPieces(deps.db, row.batch_id).find((item) => item.id === pieceId);
  if (!piece) {
    return { status: 404, result: { ok: false, message: `Piece ${pieceId} was not found.` } };
  }

  if (piece.status !== "approved") {
    return {
      status: 409,
      result: {
        ok: false,
        message: `Piece ${pieceId} must be approved before a video plan can be created. Current status: ${piece.status}.`,
      },
    };
  }

  const plan = buildVideoProductionPlan({ id: piece.id, ...toContentPiece(piece) });
  return { status: 200, result: { ok: true, plan } };
}

export async function handleBatchVideoPlanRequest(
  batchId: number,
  deps: { db: Database.Database }
): Promise<{ status: number; result: VideoBatchPlanSuccess | VideoPlanFailure }> {
  const batch = getBatch(deps.db, batchId);
  if (!batch) {
    return { status: 404, result: { ok: false, message: `Batch ${batchId} was not found.` } };
  }

  if (batch.status !== "approved") {
    return {
      status: 409,
      result: {
        ok: false,
        message: `Batch ${batchId} must be approved before video plans can be created. Current status: ${batch.status}.`,
      },
    };
  }

  const pieces = listPieces(deps.db, batchId);
  const unapproved = pieces.filter((piece) => piece.status !== "approved");
  if (unapproved.length > 0) {
    return {
      status: 409,
      result: {
        ok: false,
        message: `Batch ${batchId} has ${unapproved.length} piece(s) that are not approved yet.`,
      },
    };
  }

  const plans = pieces.map((piece) =>
    buildVideoProductionPlan({ id: piece.id, ...toContentPiece(piece) })
  );

  return { status: 200, result: { ok: true, batchId, plans } };
}

export function registerVideoFactoryRoutes(router: Router, db: Database.Database): void {
  router.get("/api/pieces/:pieceId/video-plan", async (req: Request, res: Response) => {
    const pieceId = Number(req.params.pieceId);
    if (!Number.isInteger(pieceId) || pieceId < 1) {
      res.status(400).json({ ok: false, message: "pieceId must be a positive integer." });
      return;
    }
    const { status, result } = await handlePieceVideoPlanRequest(pieceId, { db });
    res.status(status).json(result);
  });

  router.post("/api/batches/:batchId/video-plan", async (req: Request, res: Response) => {
    const batchId = Number(req.params.batchId);
    if (!Number.isInteger(batchId) || batchId < 1) {
      res.status(400).json({ ok: false, message: "batchId must be a positive integer." });
      return;
    }
    const { status, result } = await handleBatchVideoPlanRequest(batchId, { db });
    res.status(status).json(result);
  });
}
