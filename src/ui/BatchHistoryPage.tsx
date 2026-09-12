import { useEffect, useState, useCallback } from "react";
import "./review-dashboard.css";

type BatchStatus = "draft" | "in_review" | "approved" | "rejected" | "archived";

interface BatchSummary {
  id: number;
  created_at: string;
  provider: string;
  model: string;
  status: BatchStatus;
  totalPieces: number;
  approvedPieces: number;
}

const STATUS_LABEL: Record<BatchStatus, string> = {
  draft: "Draft",
  in_review: "In review",
  approved: "Approved",
  rejected: "Rejected",
  archived: "Archived",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

export default function BatchHistoryPage({ onOpenBatch }: { onOpenBatch: (batchId: number) => void }) {
  const [batches, setBatches] = useState<BatchSummary[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "error" | "ready">("loading");
  const [loadError, setLoadError] = useState<string>("");

  const loadBatches = useCallback(async () => {
    setLoadState("loading");
    try {
      const res = await fetch("/api/batches");
      const data = await res.json();
      if (!data.ok) {
        setLoadState("error");
        setLoadError(data.message);
        return;
      }
      setBatches(data.batches);
      setLoadState("ready");
    } catch (err) {
      setLoadState("error");
      setLoadError(err instanceof Error ? err.message : "Could not reach the server.");
    }
  }, []);

  useEffect(() => {
    loadBatches();
  }, [loadBatches]);

  return (
    <main className="rd-page">
      <header className="rd-header">
        <span className="rd-mark">Social Content Factory · Batch History</span>
      </header>

      {loadState === "loading" && <p className="rd-empty">Loading batches…</p>}

      {loadState === "error" && (
        <div className="rd-error" role="alert">
          <p className="rd-error-title">Couldn't load batch history.</p>
          <p>{loadError}</p>
        </div>
      )}

      {loadState === "ready" && batches.length === 0 && (
        <p className="rd-empty">No batches yet — generate one to see it here.</p>
      )}

      {loadState === "ready" && batches.length > 0 && (
        <ol className="bh-list">
          {batches.map((batch) => (
            <li className="bh-row" key={batch.id}>
              <div className="bh-row-main">
                <span className="bh-row-title">Batch #{batch.id}</span>
                <span className={`rd-status rd-status--${batch.status === "approved" ? "approved" : batch.status === "rejected" ? "rejected" : "pending"}`}>
                  {STATUS_LABEL[batch.status]}
                </span>
              </div>
              <div className="bh-row-meta">
                <span>{formatDate(batch.created_at)}</span>
                <span>
                  {batch.provider} · {batch.model}
                </span>
                <span>
                  {batch.approvedPieces}/{batch.totalPieces} approved
                </span>
              </div>
              <button type="button" className="rd-btn rd-btn--save" onClick={() => onOpenBatch(batch.id)}>
                Open
              </button>
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
