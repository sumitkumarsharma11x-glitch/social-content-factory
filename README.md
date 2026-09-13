# Social Content Factory

Teacher enters a topic/chapter → AI (Gemini/Claude/Ollama, explicitly
selected, never a silent fallback) generates exactly 30 educational social
content pieces (10 Instagram Reels + 10 Facebook Posts + 10 YouTube
Shorts) → validated → saved as a `draft` batch in SQLite → teacher reviews,
edits, and approves piece-by-piece, with the batch only reaching `approved`
once all 30 pieces are.

## Setup

```bash
npm install
cp .env.example .env   # fill in the provider(s) you'll actually use
npm run dev             # starts the API on http://localhost:3000
npm test                # runs the full vitest suite
```

`npm run dev` uses `tsx` directly against the TypeScript source (no build
step needed for local development). `npm run build && npm start` compiles
to `dist/` and runs the compiled server. The Express server also serves the
web UI from `public/`, so the same service can be opened from a browser.

## Project layout

```
src/
  provider-selector.ts        Explicit single-provider selection (gemini | claude | ollama | mock), no fallback
  content-generator.ts        ContentGenerator interface + typed GenerationResult, factory per provider
  gemini-generator.ts         Real Gemini implementation (@google/genai)
  claude-generator.ts         Real Claude implementation (@anthropic-ai/sdk, forced tool-use for structured output)
  content-schema.ts           ContentBatch/ContentPiece types + validateContentBatch() — the single source of truth for "valid content"
  mock-content-batch.ts       Deterministic offline batch generator (provider="mock")
  content-prompt-builder.ts   Topic -> generation prompt + JSON schema for structured output
  content-response-parser.ts  Raw model text -> parsed JSON (no validation logic duplicated)
  generate-batch-usecase.ts   Orchestrates: provider guard -> generate -> parse -> validate (bounded same-provider retry) -> persist
  db.ts                       better-sqlite3 connection + schema (batches, pieces tables), PRAGMA foreign_keys=ON
  persistence.ts              saveValidatedBatch, getBatch, listBatchesByStatus, listPieces, updatePieceContent, status transitions
  generate-batch-route.ts     Express route bridging the Teacher Generation UI to generate-batch-usecase
  review-dashboard-route.ts   Express routes: GET batch+pieces, PUT piece edit, POST piece status transition
  video-factory.ts             Phase 2: approved content -> renderer-ready 9:16 video production plan
  video-factory-route.ts       Phase 2 API: piece/batch approval gate -> video production plan
  server.ts                   Express app entrypoint
  ui/
    TeacherGenerationPage.tsx Topic input, provider selection, Generate 30 button, loading/error/success states
    teacher-generation.css    Styling for the above
    ReviewDashboardPage.tsx   Platform tabs, per-piece edit/save, approve/reject, status display
    review-dashboard.css      Styling for the above

test/
  *.test.ts / *.test.tsx      Vitest unit/integration/UI tests (78 passing as of the last checkpoint)
  setup.ts                    Registers @testing-library/jest-dom matchers
```

## Web deployment

The project includes a minimal browser UI in `public/index.html` and a
`render.yaml` blueprint for a Node web service. Push the repository to GitHub
and create the service from the repository/blueprint. Keep API keys in the
hosting provider's environment settings; never commit `.env` or secrets.

The current SQLite database is suitable for a prototype, but free cloud
instances may have non-persistent local disks. Before treating the deployment
as the permanent production system, move persistence to a managed database
and generated files to durable object storage.

## Status

**Implemented:** provider selection architecture, content-generation
contract, real Gemini + Claude generators, Mock generator, SQLite
persistence layer with status-transition rules and the "30/30 approved"
gate, the topic→30-piece generation orchestration (with bounded
same-provider retry, no fallback), the Teacher Generation UI + API route,
and the Review Dashboard (platform tabs, per-piece edit/save,
approve/reject, status display) + its API routes.

**Not yet implemented:** Ollama's real provider (still a stub), Batch
History UI, "Approve All" / the batch-level Final Approval Flow UI
(the underlying gate — batch can't reach `approved` until all 30 pieces
are — already exists and is tested in `persistence.ts`), stricter
`updatePieceContent()` validation beyond the DB's own CHECK constraints,
and — out of scope for now by design — auto-publishing, social platform
APIs, video rendering, TTS, and any automatic provider fallback.

## Notes for continuing development

- `GEMINI_API_KEY`/`GOOGLE_API_KEY`, `ANTHROPIC_API_KEY`, and
  `OLLAMA_HOST`/`OLLAMA_MODEL` are read from the environment only, per
  provider, at generation time — never hard-coded, never logged.
- `content-schema.ts` and its validation rules are treated as an approved,
  stable contract in this project's history — changes to it should be
  deliberate.
- The UI's `TeacherGenerationPage.tsx` currently expects a bundler (Vite/
  CRA/Next) to mount it and to serve `/api/batches/generate` from this
  same Express server (or a proxy to it) — no bundler config is included
  yet.

## Render free-tier storage note

The free Render web service uses an ephemeral filesystem. This project currently stores data in SQLite, so batches/pieces are suitable for prototype testing but should not be treated as durable production storage on the free tier. For durable production data, move SQLite to a persistent managed database (for example PostgreSQL) or use a paid persistent disk.

## Browser UI

The deployed `public/index.html` now provides generation, batch history, and a browser-accessible Review & Approval flow (edit, approve, reject) using the existing API routes. The React review components remain available for a future bundled frontend but are not required for the deployed vanilla browser UI.


## Content strategy quality

New generated batches use optional `core_question_id` and `explanation_angle` metadata to enforce same-question/different-explanation strategy across platforms.

## Video Factory — Phase 2

Approved content can now be converted into a renderer-ready 9:16 production plan. Phase 2 does not render MP4; Phase 3 will consume the plan for TTS, visuals, subtitles, and video composition.
