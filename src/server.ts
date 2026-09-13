/**
 * Server entrypoint.
 * ---------------------------------
 * Wires the SQLite database (src/db.ts) and the existing generate-batch
 * API route (src/generate-batch-route.ts) into a minimal Express app.
 *
 * No UI is served here yet beyond the API — src/ui/TeacherGenerationPage.tsx
 * is a standalone component meant to be mounted by whatever frontend build
 * (Vite/CRA/Next) this project adopts next; it talks to this server over
 * POST /api/batches/generate.
 */

import express from "express";
import path from "node:path";
import { openDatabase } from "./db";
import { registerGenerateBatchRoute } from "./generate-batch-route";
import { registerReviewDashboardRoutes } from "./review-dashboard-route";
import { registerVideoFactoryRoutes } from "./video-factory-route";

const PORT = Number(process.env.PORT) || 3000;
const DB_PATH = process.env.DB_PATH || "./social-content-factory.sqlite3";

export function createApp() {
  const app = express();
  app.use(express.json());

  // Serve the browser UI from the same service so the app is usable remotely.
  const publicDir = path.resolve(__dirname, "../public");
  app.use(express.static(publicDir));

  const db = openDatabase(DB_PATH);
  registerGenerateBatchRoute(app, db);
  registerReviewDashboardRoutes(app, db);
  registerVideoFactoryRoutes(app, db);

  app.get("/health", (_req, res) => res.json({ ok: true }));
  app.get("/", (_req, res) => res.sendFile(path.join(publicDir, "index.html")));

  return app;
}

// Only start listening when this file is actually run directly (`node
// dist/server.js` / `tsx src/server.ts`), never as a side effect of some
// other module (e.g. a future test) importing createApp from here.
if (require.main === module) {
  const app = createApp();
  app.listen(PORT, () => {
    console.log(`Social Content Factory API listening on http://localhost:${PORT}`);
  });
}
