import { useState, useCallback } from "react";
import "./teacher-generation.css";

type ProviderName = "gemini" | "claude" | "ollama";

interface PieceRecord {
  id: number;
  platform: "instagram_reel" | "facebook_post" | "youtube_short";
  piece_number: number;
  title: string;
  body: string;
  hashtags: string[];
  cta: string;
  status: string;
}

interface GenerateBatchApiSuccess {
  ok: true;
  batchId: number;
  attempts: number;
  pieces: PieceRecord[];
}

interface GenerateBatchApiFailure {
  ok: false;
  stage: string;
  message: string;
  validationErrors?: string[];
}

type GenerateBatchApiResult = GenerateBatchApiSuccess | GenerateBatchApiFailure;

const PROVIDERS: { value: ProviderName; label: string }[] = [
  { value: "gemini", label: "Gemini" },
  { value: "claude", label: "Claude" },
  { value: "ollama", label: "Ollama" },
];

const PLATFORM_META: Record<
  PieceRecord["platform"],
  { label: string; icon: string }
> = {
  instagram_reel: { label: "Instagram Reels", icon: "🎬" },
  facebook_post: { label: "Facebook Posts", icon: "📘" },
  youtube_short: { label: "YouTube Shorts", icon: "▶️" },
};

type ViewState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; stage: string; message: string; validationErrors?: string[] }
  | { status: "success"; batchId: number; attempts: number; pieces: PieceRecord[] };

export default function TeacherGenerationPage() {
  const [topic, setTopic] = useState("");
  const [provider, setProvider] = useState<ProviderName>("gemini");
  const [view, setView] = useState<ViewState>({ status: "idle" });

  const canSubmit = topic.trim().length > 0 && view.status !== "loading";

  const handleGenerate = useCallback(async () => {
    if (!topic.trim()) return;
    setView({ status: "loading" });

    try {
      const response = await fetch("/api/batches/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), provider }),
      });
      const result: GenerateBatchApiResult = await response.json();

      if (result.ok) {
        setView({
          status: "success",
          batchId: result.batchId,
          attempts: result.attempts,
          pieces: result.pieces,
        });
      } else {
        setView({
          status: "error",
          stage: result.stage,
          message: result.message,
          validationErrors: result.validationErrors,
        });
      }
    } catch (err) {
      setView({
        status: "error",
        stage: "network",
        message: err instanceof Error ? err.message : "Could not reach the server.",
      });
    }
  }, [topic, provider]);

  return (
    <main className="tg-page">
      <header className="tg-header">
        <span className="tg-mark">Social Content Factory</span>
      </header>

      <section className="tg-form" aria-label="Generate content batch">
        <h1 className="tg-title">Turn a topic into a lesson's worth of content</h1>
        <p className="tg-subtitle">
          Enter what you're teaching. The generator drafts 30 pieces — ready for you to review.
        </p>

        <label className="tg-label" htmlFor="tg-topic">
          Topic or chapter
        </label>
        <input
          id="tg-topic"
          className="tg-input"
          type="text"
          placeholder="e.g. Photosynthesis, Chapter 4"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          disabled={view.status === "loading"}
        />

        <span className="tg-label">AI provider</span>
        <div className="tg-provider-group" role="radiogroup" aria-label="AI provider">
          {PROVIDERS.map((p) => (
            <button
              key={p.value}
              type="button"
              role="radio"
              aria-checked={provider === p.value}
              className={`tg-provider-option${provider === p.value ? " tg-provider-option--active" : ""}`}
              onClick={() => setProvider(p.value)}
              disabled={view.status === "loading"}
            >
              {p.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="tg-generate-btn"
          onClick={handleGenerate}
          disabled={!canSubmit}
        >
          {view.status === "loading" ? "Generating 30 pieces…" : "Generate 30 pieces"}
        </button>
      </section>

      <section className="tg-result" aria-live="polite">
        {view.status === "idle" && (
          <p className="tg-empty">Nothing generated yet. Fill in a topic and press Generate.</p>
        )}

        {view.status === "loading" && (
          <div className="tg-loading">
            <span className="tg-spinner" aria-hidden="true" />
            <p>Writing 10 Reels, 10 Facebook posts, and 10 Shorts for "{topic.trim()}"…</p>
          </div>
        )}

        {view.status === "error" && (
          <div className="tg-error" role="alert">
            <p className="tg-error-title">Generation didn't finish.</p>
            <p className="tg-error-message">{view.message}</p>
            {view.validationErrors && view.validationErrors.length > 0 && (
              <ul className="tg-error-list">
                {view.validationErrors.slice(0, 6).map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            )}
            <p className="tg-error-hint">Nothing was saved. Adjust the topic or try again.</p>
          </div>
        )}

        {view.status === "success" && (
          <div className="tg-success">
            <div className="tg-stamp">Draft saved — 30/30 pieces, {view.attempts} attempt{view.attempts > 1 ? "s" : ""}</div>
            <div className="tg-platform-grid">
              {(Object.keys(PLATFORM_META) as PieceRecord["platform"][]).map((platform) => {
                const meta = PLATFORM_META[platform];
                const pieces = view.pieces
                  .filter((p) => p.platform === platform)
                  .sort((a, b) => a.piece_number - b.piece_number);
                return (
                  <div className="tg-platform-column" key={platform}>
                    <h2 className="tg-platform-heading">
                      <span aria-hidden="true">{meta.icon}</span> {meta.label}
                    </h2>
                    <ol className="tg-piece-list">
                      {pieces.map((piece) => (
                        <li className="tg-piece-card" key={piece.id}>
                          <span className="tg-piece-number">{piece.piece_number}</span>
                          <span className="tg-piece-title">{piece.title}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
