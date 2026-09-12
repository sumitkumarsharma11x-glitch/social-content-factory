@import url("https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Inter:wght@400;500;600&display=swap");

:root {
  --bg: #14261f;
  --panel: #1b322a;
  --ink: #f1ecdd;
  --muted: #9bb0a4;
  --accent: #e7b24b;
  --accent-ink: #1c1204;
  --danger: #c1553a;
  --border: #2c463c;
}

.tg-page {
  min-height: 100vh;
  background: var(--bg);
  color: var(--ink);
  font-family: "Inter", system-ui, sans-serif;
  padding: 2.5rem 1.25rem 4rem;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.tg-header {
  width: 100%;
  max-width: 640px;
  margin-bottom: 2.5rem;
}

.tg-mark {
  font-family: "Fraunces", serif;
  font-weight: 600;
  font-size: 1.05rem;
  letter-spacing: 0.01em;
}

.tg-form {
  width: 100%;
  max-width: 640px;
}

.tg-title {
  font-family: "Fraunces", serif;
  font-weight: 600;
  font-size: 2rem;
  line-height: 1.15;
  margin: 0 0 0.6rem;
  max-width: 22ch;
}

.tg-subtitle {
  color: var(--muted);
  font-size: 1rem;
  line-height: 1.5;
  margin: 0 0 2rem;
  max-width: 52ch;
}

.tg-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--muted);
  margin: 0 0 0.5rem;
}

.tg-input {
  width: 100%;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--ink);
  font-family: inherit;
  font-size: 1rem;
  padding: 0.75rem 0.9rem;
  margin-bottom: 1.5rem;
}

.tg-input:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

.tg-provider-group {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.75rem;
}

.tg-provider-option {
  flex: 1;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--muted);
  font-family: inherit;
  font-size: 0.9rem;
  font-weight: 500;
  padding: 0.6rem 0.5rem;
  cursor: pointer;
}

.tg-provider-option:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

.tg-provider-option--active {
  border-color: var(--accent);
  color: var(--ink);
  background: #22392f;
}

.tg-provider-option:disabled,
.tg-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.tg-generate-btn {
  width: 100%;
  background: var(--accent);
  color: var(--accent-ink);
  border: none;
  border-radius: 4px;
  font-family: inherit;
  font-weight: 600;
  font-size: 1rem;
  padding: 0.85rem 1rem;
  cursor: pointer;
}

.tg-generate-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tg-result {
  width: 100%;
  max-width: 960px;
  margin-top: 2.5rem;
}

.tg-empty {
  color: var(--muted);
  text-align: center;
  font-size: 0.95rem;
}

.tg-loading {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  justify-content: center;
  color: var(--muted);
  font-size: 0.95rem;
}

.tg-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: tg-spin 0.8s linear infinite;
  flex-shrink: 0;
}

@keyframes tg-spin {
  to {
    transform: rotate(360deg);
  }
}

.tg-error {
  background: var(--panel);
  border: 1px solid var(--danger);
  border-radius: 4px;
  padding: 1.25rem 1.5rem;
  max-width: 640px;
  margin: 0 auto;
}

.tg-error-title {
  font-weight: 600;
  color: var(--danger);
  margin: 0 0 0.35rem;
}

.tg-error-message {
  margin: 0 0 0.5rem;
  font-size: 0.95rem;
}

.tg-error-list {
  margin: 0 0 0.75rem;
  padding-left: 1.1rem;
  font-size: 0.85rem;
  color: var(--muted);
}

.tg-error-hint {
  margin: 0;
  font-size: 0.85rem;
  color: var(--muted);
}

.tg-stamp {
  display: inline-block;
  border: 1px solid var(--accent);
  color: var(--accent);
  border-radius: 4px;
  padding: 0.4rem 0.8rem;
  font-weight: 500;
  font-size: 0.875rem;
  margin-bottom: 1.5rem;
}

.tg-platform-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.25rem;
}

@media (max-width: 780px) {
  .tg-platform-grid {
    grid-template-columns: 1fr;
  }
}

.tg-platform-column {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 1rem 1.1rem 1.25rem;
}

.tg-platform-heading {
  font-family: "Fraunces", serif;
  font-weight: 600;
  font-size: 1.05rem;
  margin: 0 0 0.75rem;
}

.tg-piece-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.tg-piece-card {
  display: flex;
  gap: 0.6rem;
  align-items: baseline;
  border-top: 1px solid var(--border);
  padding-top: 0.5rem;
  font-size: 0.875rem;
}

.tg-piece-number {
  color: var(--muted);
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
  width: 1.2rem;
}

.tg-piece-title {
  line-height: 1.4;
}
