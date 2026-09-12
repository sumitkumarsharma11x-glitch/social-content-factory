import { useEffect, useState, useCallback } from "react";
import "./review-dashboard.css";

type Platform = "instagram_reel" | "facebook_post" | "youtube_short";
type PieceStatus = "pending" | "edited" | "approved" | "rejected";

interface PieceRecord {
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

interface BatchRecord {
  id: number;
  created_at: string;
  provider: string;
  model: string;
  status: string;
}

const PLATFORM_TABS: { value: Platform; label: string; icon: string }[] = [
  { value: "instagram_reel", label: "Instagram Reels", icon: "🎬" },
  { value: "facebook_post", label: "Facebook Posts", icon: "📘" },
  { value: "youtube_short", label: "YouTube Shorts", icon: "▶️" },
];

const STATUS_LABEL: Record<PieceStatus, string> = {
  pending: "Pending review",
  edited: "Edited",
  approved: "Approved",
  rejected: "Rejected",
};

interface EditDraft {
  title: string;
  body: string;
  hashtags: string; // comma-separated while editing, split on save
  cta: string;
}

function toDraft(piece: PieceRecord): EditDraft {
  return { title: piece.title, body: piece.body, hashtags: piece.hashtags.join(", "), cta: piece.cta };
}

export default function ReviewDashboardPage({ batchId }: { batchId: number }) {
  const [batch, setBatch] = useState<BatchRecord | null>(null);
  const [pieces, setPieces] = useState<PieceRecord[]>([]);
  const [activeTab, setActiveTab] = useState<Platform>("instagram_reel");
  const [loadState, setLoadState] = useState<"loading" | "error" | "ready">("loading");
  const [loadError, setLoadError] = useState<string>("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<EditDraft | null>(null);
  const [pieceErrors, setPieceErrors] = useState<Record<number, string>>({});
  const [savingId, setSavingId] = useState<number | null>(null);

  const loadBatch = useCallback(async () => {
    setLoadState("loading");
    try {
      const res = await fetch(`/api/batches/${batchId}`);
      const data = await res.json();
      if (!data.ok) {
        setLoadState("error");
        setLoadError(data.message);
        return;
      }
      setBatch(data.batch);
      setPieces(data.pieces);
      setLoadState("ready");
    } catch (err) {
      setLoadState("error");
      setLoadError(err instanceof Error ? err.message : "Could not reach the server.");
    }
  }, [batchId]);

  useEffect(() => {
    loadBatch();
  }, [loadBatch]);

  function startEdit(piece: PieceRecord) {
    setEditingId(piece.id);
    setDraft(toDraft(piece));
    setPieceErrors((prev) => ({ ...prev, [piece.id]: "" }));
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(null);
  }

  async function saveEdit(pieceId: number) {
    if (!draft) return;
    setSavingId(pieceId);
    setPieceErrors((prev) => ({ ...prev, [pieceId]: "" }));

    try {
      const res = await fetch(`/api/pieces/${pieceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draft.title,
          body: draft.body,
          hashtags: draft.hashtags.split(",").map((h) => h.trim()).filter(Boolean),
          cta: draft.cta,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setPieceErrors((prev) => ({ ...prev, [pieceId]: data.message }));
        return;
      }
      setPieces((prev) => prev.map((p) => (p.id === pieceId ? data.piece : p)));
      setEditingId(null);
      setDraft(null);
    } catch (err) {
      setPieceErrors((prev) => ({
        ...prev,
        [pieceId]: err instanceof Error ? err.message : "Could not save the edit.",
      }));
    } finally {
      setSavingId(null);
    }
  }

  async function transition(pieceId: number, status: "approved" | "rejected") {
    setPieceErrors((prev) => ({ ...prev, [pieceId]: "" }));
    try {
      const res = await fetch(`/api/pieces/${pieceId}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!data.ok) {
        setPieceErrors((prev) => ({ ...prev, [pieceId]: data.message }));
        return;
      }
      setPieces((prev) => prev.map((p) => (p.id === pieceId ? data.piece : p)));
    } catch (err) {
      setPieceErrors((prev) => ({
        ...prev,
        [pieceId]: err instanceof Error ? err.message : "Could not update the status.",
      }));
    }
  }

  const approvedCount = pieces.filter((p) => p.status === "approved").length;

  return (
    <main className="rd-page">
      <header className="rd-header">
        <span className="rd-mark">Social Content Factory · Review</span>
        {batch && (
          <span className="rd-progress">
            {approvedCount}/{pieces.length} approved
          </span>
        )}
      </header>

      {loadState === "loading" && <p className="rd-empty">Loading batch…</p>}

      {loadState === "error" && (
        <div className="rd-error" role="alert">
          <p className="rd-error-title">Couldn't load this batch.</p>
          <p>{loadError}</p>
        </div>
      )}

      {loadState === "ready" && batch && (
        <>
          <div className="rd-tabs" role="tablist" aria-label="Platform">
            {PLATFORM_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.value}
                className={`rd-tab${activeTab === tab.value ? " rd-tab--active" : ""}`}
                onClick={() => setActiveTab(tab.value)}
              >
                <span aria-hidden="true">{tab.icon}</span> {tab.label}
              </button>
            ))}
          </div>

          <ol className="rd-piece-list">
            {pieces
              .filter((p) => p.platform === activeTab)
              .sort((a, b) => a.piece_number - b.piece_number)
              .map((piece) => {
                const isEditing = editingId === piece.id;
                const error = pieceErrors[piece.id];

                return (
                  <li className="rd-piece" key={piece.id}>
                    <div className="rd-piece-head">
                      <span className="rd-piece-number">{piece.piece_number}</span>
                      <span className={`rd-status rd-status--${piece.status}`}>
                        {STATUS_LABEL[piece.status]}
                      </span>
                    </div>

                    {!isEditing ? (
                      <>
                        <h3 className="rd-piece-title">{piece.title}</h3>
                        <p className="rd-piece-body">{piece.body}</p>
                        <p className="rd-piece-hashtags">{piece.hashtags.join(" ")}</p>
                        <p className="rd-piece-cta">{piece.cta}</p>

                        <div className="rd-piece-actions">
                          <button type="button" className="rd-btn" onClick={() => startEdit(piece)}>
                            Edit
                          </button>
                          <button
                            type="button"
                            className="rd-btn rd-btn--approve"
                            onClick={() => transition(piece.id, "approved")}
                            disabled={piece.status === "approved"}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            className="rd-btn rd-btn--reject"
                            onClick={() => transition(piece.id, "rejected")}
                            disabled={piece.status === "rejected"}
                          >
                            Reject
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="rd-edit-form">
                        <label className="rd-field-label" htmlFor={`title-${piece.id}`}>
                          Title
                        </label>
                        <input
                          id={`title-${piece.id}`}
                          className="rd-input"
                          value={draft?.title ?? ""}
                          onChange={(e) => setDraft((d) => (d ? { ...d, title: e.target.value } : d))}
                        />

                        <label className="rd-field-label" htmlFor={`body-${piece.id}`}>
                          Body
                        </label>
                        <textarea
                          id={`body-${piece.id}`}
                          className="rd-textarea"
                          value={draft?.body ?? ""}
                          onChange={(e) => setDraft((d) => (d ? { ...d, body: e.target.value } : d))}
                        />

                        <label className="rd-field-label" htmlFor={`hashtags-${piece.id}`}>
                          Hashtags (comma separated)
                        </label>
                        <input
                          id={`hashtags-${piece.id}`}
                          className="rd-input"
                          value={draft?.hashtags ?? ""}
                          onChange={(e) => setDraft((d) => (d ? { ...d, hashtags: e.target.value } : d))}
                        />

                        <label className="rd-field-label" htmlFor={`cta-${piece.id}`}>
                          Call to action
                        </label>
                        <input
                          id={`cta-${piece.id}`}
                          className="rd-input"
                          value={draft?.cta ?? ""}
                          onChange={(e) => setDraft((d) => (d ? { ...d, cta: e.target.value } : d))}
                        />

                        <div className="rd-piece-actions">
                          <button
                            type="button"
                            className="rd-btn rd-btn--save"
                            onClick={() => saveEdit(piece.id)}
                            disabled={savingId === piece.id}
                          >
                            {savingId === piece.id ? "Saving…" : "Save"}
                          </button>
                          <button type="button" className="rd-btn" onClick={cancelEdit}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {error && <p className="rd-piece-error">{error}</p>}
                  </li>
                );
              })}
          </ol>
        </>
      )}
    </main>
  );
}
