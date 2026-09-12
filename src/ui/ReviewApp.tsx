import { useState } from "react";
import BatchHistoryPage from "./BatchHistoryPage";
import ReviewDashboardPage from "./ReviewDashboardPage";
import "./review-dashboard.css";

/**
 * Owns navigation between the Batch History list and the single-batch
 * Review Dashboard. Neither child component knows about the other —
 * this just decides which one to render and hands ReviewDashboardPage
 * the batchId the teacher picked.
 */
export default function ReviewApp() {
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);

  if (selectedBatchId === null) {
    return <BatchHistoryPage onOpenBatch={setSelectedBatchId} />;
  }

  return (
    <>
      <div className="bh-back">
        <button type="button" className="rd-btn" onClick={() => setSelectedBatchId(null)}>
          ← Back to batches
        </button>
      </div>
      <ReviewDashboardPage batchId={selectedBatchId} />
    </>
  );
}
