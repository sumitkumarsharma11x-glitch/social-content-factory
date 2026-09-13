import type { Request, Response, Router } from "express";
import type Database from "better-sqlite3";
import { getBatch, listPieces, transitionBatchStatus, transitionPieceStatus, NotFoundError, InvalidTransitionError } from "./persistence";

export function registerApproveAllRoute(router: Router, db: Database.Database): void {
  router.post("/api/batches/:batchId/approve-all", async (req: Request, res: Response) => {
    const batchId = Number(req.params.batchId);
    if (!Number.isInteger(batchId) || batchId < 1) { res.status(400).json({ ok:false, message:"batchId must be a positive integer." }); return; }
    try {
      const result = db.transaction(() => {
        const batch = getBatch(db, batchId);
        if (!batch) throw new NotFoundError("batch", batchId);
        if (batch.status === "draft") transitionBatchStatus(db, batchId, "in_review");
        else if (batch.status !== "in_review") throw new InvalidTransitionError("batch", batch.status, "approved");
        const pieces = listPieces(db, batchId);
        if (pieces.length !== 30) throw new InvalidTransitionError("batch", "in_review", "approved", `expected 30 pieces, found ${pieces.length}`);
        for (const piece of pieces) if (piece.status !== "approved") transitionPieceStatus(db, piece.id, "approved");
        transitionBatchStatus(db, batchId, "approved");
        return { batch: getBatch(db, batchId), pieces: listPieces(db, batchId) };
      })();
      res.status(200).json({ ok:true, ...result });
    } catch (error) {
      if (error instanceof NotFoundError) { res.status(404).json({ ok:false, message:error.message }); return; }
      if (error instanceof InvalidTransitionError) { res.status(409).json({ ok:false, message:error.message }); return; }
      res.status(500).json({ ok:false, message:error instanceof Error ? error.message : "Approve all failed." });
    }
  });
}
