/**
 * Generate Batch API Route
 * ---------------------------------
 * Thin bridge between the Teacher Generation UI and the existing,
 * unmodified generate-batch-usecase.ts. Two pieces:
 *
 *  1. handleGenerateBatchRequest() — a pure async function (no Express
 *     types in its signature) that does the actual work: resolve the
 *     teacher-chosen provider explicitly (no fallback, same rule as
 *     ProviderSelector), build a ContentGenerator, call generateBatch(),
 *     and on success load the persisted pieces back out so the UI has
 *     something to render. This is what's unit-tested.
 *  2. registerGenerateBatchRoute() — wraps (1) in an Express handler.
 *     Not unit-tested directly (thin enough that testing (1) covers the
 *     real logic); would be covered by an integration/HTTP test later.
 */

import type { Request, Response, Router } from "express";
import type Database from "better-sqlite3";
import { GeminiProvider, ClaudeProvider, OllamaProvider, type AIProvider, type ProviderName } from "./provider-selector";
import { createContentGenerator } from "./content-generator";
import { generateBatch, type GenerateBatchResult } from "./generate-batch-usecase";
import { listPieces, type PieceRecord } from "./persistence";

export interface GenerateBatchRequestBody {
  topic: string;
  provider: ProviderName;
}

export interface GenerateBatchApiSuccess {
  ok: true;
  batchId: number;
  attempts: number;
  pieces: PieceRecord[];
}

export interface GenerateBatchApiFailure {
  ok: false;
  stage: string;
  message: string;
  validationErrors?: string[];
}

export type GenerateBatchApiResult = GenerateBatchApiSuccess | GenerateBatchApiFailure;

/**
 * Resolves a UI-selected provider name into a concrete AIProvider using
 * the same explicit, no-fallback construction ProviderSelector uses
 * internally — this reads credentials from the environment, exactly like
 * every generator already does, rather than trusting the client for them.
 */
function resolveTeacherSelectedProvider(
  provider: ProviderName,
  env: NodeJS.ProcessEnv
): { provider: AIProvider; model: string } | { error: string } {
  switch (provider) {
    case "gemini": {
      const apiKey = env.GEMINI_API_KEY || env.GOOGLE_API_KEY;
      const model = env.GEMINI_MODEL;
      if (!apiKey) return { error: "Gemini is not configured (missing GEMINI_API_KEY)." };
      if (!model) return { error: "Gemini is not configured (missing GEMINI_MODEL)." };
      return { provider: GeminiProvider.fromConfig({ apiKey }), model };
    }
    case "claude": {
      const apiKey = env.ANTHROPIC_API_KEY;
      const model = env.CLAUDE_MODEL;
      if (!apiKey) return { error: "Claude is not configured (missing ANTHROPIC_API_KEY)." };
      if (!model) return { error: "Claude is not configured (missing CLAUDE_MODEL)." };
      return { provider: ClaudeProvider.fromConfig({ apiKey }), model };
    }
    case "ollama": {
      const host = env.OLLAMA_HOST;
      const model = env.OLLAMA_MODEL;
      if (!host) return { error: "Ollama is not configured (missing OLLAMA_HOST)." };
      if (!model) return { error: "Ollama is not configured (missing OLLAMA_MODEL)." };
      return { provider: OllamaProvider.fromConfig({ host, model }), model };
    }
    default:
      return { error: `Unsupported provider "${provider}". Choose gemini, claude, or ollama.` };
  }
}

export async function handleGenerateBatchRequest(
  body: GenerateBatchRequestBody,
  deps: {
    db: Database.Database;
    env?: NodeJS.ProcessEnv;
    /**
     * Optional override for how a resolved AIProvider becomes a
     * ContentGenerator. Defaults to the real createContentGenerator.
     * Exists purely so tests can inject a fake generator at the one
     * legitimate seam (the outbound AI call) without touching
     * generateBatch, validateContentBatch, or saveValidatedBatch — all of
     * which remain the real, unmodified implementations.
     */
    createGenerator?: (provider: AIProvider) => ReturnType<typeof createContentGenerator>;
  }
): Promise<{ status: number; result: GenerateBatchApiResult }> {
  const topic = body?.topic?.trim();
  if (!topic) {
    return { status: 400, result: { ok: false, stage: "input", message: "Topic/Chapter is required." } };
  }
  if (!body?.provider) {
    return { status: 400, result: { ok: false, stage: "input", message: "Provider selection is required." } };
  }

  const resolved = resolveTeacherSelectedProvider(body.provider, deps.env ?? process.env);
  if ("error" in resolved) {
    return { status: 422, result: { ok: false, stage: "provider_guard", message: resolved.error } };
  }

  const buildGenerator = deps.createGenerator ?? createContentGenerator;
  const generator = buildGenerator(resolved.provider);

  const useCaseResult: GenerateBatchResult = await generateBatch({
    topic,
    generator,
    model: resolved.model,
    db: deps.db,
  });

  if (!useCaseResult.ok) {
    const status = useCaseResult.stage === "provider_guard" ? 422 : 502;
    return {
      status,
      result: {
        ok: false,
        stage: useCaseResult.stage,
        message: useCaseResult.message,
        validationErrors: useCaseResult.validationErrors,
      },
    };
  }

  const pieces = listPieces(deps.db, useCaseResult.batchId);
  return {
    status: 201,
    result: { ok: true, batchId: useCaseResult.batchId, attempts: useCaseResult.attempts, pieces },
  };
}

/** Registers POST /api/batches/generate on an existing Express Router/app. */
export function registerGenerateBatchRoute(router: Router, db: Database.Database): void {
  router.post("/api/batches/generate", async (req: Request, res: Response) => {
    const { status, result } = await handleGenerateBatchRequest(req.body, { db });
    res.status(status).json(result);
  });
}
