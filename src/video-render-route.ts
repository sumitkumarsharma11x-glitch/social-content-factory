import type { Request, Response, Router } from "express";
import type Database from "better-sqlite3";
import { listPieces, getBatch, type PieceRecord } from "./persistence";
import { renderVideoForPiece, type RenderedVideo } from "./video-renderer";
import type { VideoPlanInput } from "./video-factory";

export interface VideoRenderSuccess { ok: true; video: RenderedVideo; }
export interface VideoBatchRenderSuccess { ok: true; batchId: number; videos: RenderedVideo[]; }
export interface VideoRenderFailure { ok: false; message: string; }

function toInput(piece: PieceRecord): VideoPlanInput {
  return {
    id: piece.id,
    platform: piece.platform,
    piece_number: piece.piece_number,
    title: piece.title,
    body: piece.body,
    hashtags: piece.hashtags,
    cta: piece.cta,
  };
}

export async function handlePieceVideoRenderRequest(
  pieceId: number,
  publicVideoDir: string,
  deps: { db: Database.Database },
  targetDurationSeconds?: number,
): Promise<{ status: number; result: VideoRenderSuccess | VideoRenderFailure }> {
  const row = deps.db.prepare("SELECT batch_id FROM pieces WHERE id = ?").get(pieceId) as { batch_id: number } | undefined;
  if (!row) return { status: 404, result: { ok: false, message: `Piece ${pieceId} was not found.` } };
  const piece = listPieces(deps.db, row.batch_id).find((item) => item.id === pieceId);
  if (!piece) return { status: 404, result: { ok: false, message: `Piece ${pieceId} was not found.` } };
  if (piece.status !== "approved") return { status: 409, result: { ok: false, message: `Piece ${pieceId} must be approved before video creation. Current status: ${piece.status}.` } };

  try {
    const input = toInput(piece);
    if (Number.isFinite(targetDurationSeconds) && (targetDurationSeconds ?? 0) >= 30) {
      input.target_duration_seconds = Math.min(900, Math.round(targetDurationSeconds!));
    }
    return { status: 200, result: { ok: true, video: await renderVideoForPiece(input, publicVideoDir) } };
  } catch (error) {
    return { status: 500, result: { ok: false, message: error instanceof Error ? error.message : "Video rendering failed." } };
  }
}

export async function handleBatchVideoRenderRequest(
  batchId: number,
  publicVideoDir: string,
  deps: { db: Database.Database },
  targetDurationSeconds?: number,
): Promise<{ status: number; result: VideoBatchRenderSuccess | VideoRenderFailure }> {
  const batch = getBatch(deps.db, batchId);
  if (!batch) return { status: 404, result: { ok: false, message: `Batch ${batchId} was not found.` } };
  if (batch.status !== "approved") return { status: 409, result: { ok: false, message: `Batch ${batchId} must be approved before video creation. Current status: ${batch.status}.` } };

  const pieces = listPieces(deps.db, batchId);
  const unapproved = pieces.filter((piece) => piece.status !== "approved");
  if (unapproved.length) return { status: 409, result: { ok: false, message: `${unapproved.length} piece(s) are not approved yet.` } };

  try {
    const videos: RenderedVideo[] = [];
    for (const piece of pieces) {
      const input = toInput(piece);
      if (Number.isFinite(targetDurationSeconds) && (targetDurationSeconds ?? 0) >= 30) {
        input.target_duration_seconds = Math.min(900, Math.round(targetDurationSeconds!));
      }
      videos.push(await renderVideoForPiece(input, publicVideoDir));
    }
    return { status: 200, result: { ok: true, batchId, videos } };
  } catch (error) {
    return { status: 500, result: { ok: false, message: error instanceof Error ? error.message : "Batch video rendering failed." } };
  }
}

export function registerVideoRenderRoutes(router: Router, db: Database.Database, publicVideoDir: string): void {
  router.post("/api/pieces/:pieceId/video", async (req: Request, res: Response) => {
    const pieceId = Number(req.params.pieceId);
    if (!Number.isInteger(pieceId) || pieceId < 1) {
      res.status(400).json({ ok: false, message: "pieceId must be a positive integer." });
      return;
    }
    const { status, result } = await handlePieceVideoRenderRequest(pieceId, publicVideoDir, { db }, Number(req.body?.duration_seconds));
    res.status(status).json(result);
  });

  router.post("/api/batches/:batchId/videos", async (req: Request, res: Response) => {
    const batchId = Number(req.params.batchId);
    if (!Number.isInteger(batchId) || batchId < 1) {
      res.status(400).json({ ok: false, message: "batchId must be a positive integer." });
      return;
    }
    const { status, result } = await handleBatchVideoRenderRequest(batchId, publicVideoDir, { db }, Number(req.body?.duration_seconds));
    res.status(status).json(result);
  });
}
