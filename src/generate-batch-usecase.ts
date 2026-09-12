/**
 * Generate Batch Use-Case
 * ---------------------------------
 * Wires together, in order: provider guard -> prompt builder -> an
 * already-resolved ContentGenerator -> response parser -> validateContentBatch
 * (existing, unmodified) -> saveValidatedBatch (existing, unmodified).
 *
 * No fallback: on a failed attempt, at most `maxAttempts` retries happen
 * against the SAME generator instance (same provider identity) with
 * corrective feedback appended to the prompt. If still invalid, the whole
 * call fails and NOTHING is persisted — saveValidatedBatch is only ever
 * called once, with an already-validated batch, on the success path.
 */

import type Database from "better-sqlite3";
import type { ContentGenerator } from "./content-generator";
import type { ProviderName } from "./provider-selector";
import { buildGenerateBatchPrompt, buildRetryPrompt } from "./content-prompt-builder";
import { parseBatchContent } from "./content-response-parser";
import { validateContentBatch, type ContentBatch } from "./content-schema";
import { saveValidatedBatch, type SaveBatchResult } from "./persistence";

/** Providers this feature is allowed to run against, per product scope. */
const SUPPORTED_PROVIDERS: ProviderName[] = ["gemini", "claude", "ollama"];

export type GenerateBatchFailureStage =
  | "provider_guard"
  | "generation"
  | "parsing"
  | "validation"
  | "persistence";

export interface GenerateBatchInput {
  topic: string;
  /** Already resolved via ProviderSelector -> createContentGenerator. Not re-resolved here. */
  generator: ContentGenerator;
  /** The actual model string configured for this generator (recorded on the persisted batch). */
  model: string;
  db: Database.Database;
  /** Max attempts against the SAME generator before giving up. Default 2. Never switches provider. */
  maxAttempts?: number;
  timeoutMs?: number;
  maxOutputTokens?: number;
}

export interface GenerateBatchSuccess {
  ok: true;
  batchId: number;
  pieceIds: number[];
  attempts: number;
}

export interface GenerateBatchFailure {
  ok: false;
  stage: GenerateBatchFailureStage;
  message: string;
  attempts: number;
  /** Populated when stage is "validation" (or a parsing failure carried into it). */
  validationErrors?: string[];
}

export type GenerateBatchResult = GenerateBatchSuccess | GenerateBatchFailure;

const DEFAULT_MAX_ATTEMPTS = 2;
const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_MAX_OUTPUT_TOKENS = 8192;

/** Error categories worth retrying (same provider) before giving up. */
const RETRYABLE_GENERATION_CATEGORIES = new Set(["timeout", "network", "rate_limit", "provider_error"]);

export async function generateBatch(input: GenerateBatchInput): Promise<GenerateBatchResult> {
  const providerName = input.generator.provider;
  if (!SUPPORTED_PROVIDERS.includes(providerName)) {
    return {
      ok: false,
      stage: "provider_guard",
      message: `This feature requires provider "gemini", "claude", or "ollama"; got "${providerName}".`,
      attempts: 0,
    };
  }

  const maxAttempts = input.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const { prompt: basePrompt, structuredOutput } = buildGenerateBatchPrompt(input.topic);

  let currentPrompt = basePrompt;
  let lastErrors: string[] = [];
  let attempt = 0;

  while (attempt < maxAttempts) {
    attempt++;

    const genResult = await input.generator.generate({
      prompt: currentPrompt,
      timeoutMs: input.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      options: {
        maxTokens: input.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS,
        structuredOutput,
      },
    });

    if (!genResult.ok) {
      const canRetry = attempt < maxAttempts && RETRYABLE_GENERATION_CATEGORIES.has(genResult.error.category);
      if (canRetry) continue; // same provider, same prompt, just try again
      return {
        ok: false,
        stage: "generation",
        message: genResult.error.message,
        attempts: attempt,
      };
    }

    const parsed = parseBatchContent(genResult.content);
    if (!parsed.ok) {
      lastErrors = [parsed.message];
      if (attempt < maxAttempts) {
        currentPrompt = buildRetryPrompt(basePrompt, lastErrors);
        continue;
      }
      return { ok: false, stage: "parsing", message: parsed.message, attempts: attempt };
    }

    const validation = validateContentBatch(parsed.data);
    if (!validation.valid) {
      lastErrors = validation.errors;
      if (attempt < maxAttempts) {
        currentPrompt = buildRetryPrompt(basePrompt, lastErrors);
        continue;
      }
      return {
        ok: false,
        stage: "validation",
        message: `Batch failed validation after ${attempt} attempt(s).`,
        attempts: attempt,
        validationErrors: lastErrors,
      };
    }

    // Valid: persist exactly once, via the existing, unmodified persistence layer.
    let saveResult: SaveBatchResult;
    try {
      saveResult = saveValidatedBatch(input.db, {
        provider: providerName,
        model: input.model,
        batch: parsed.data as ContentBatch,
      });
    } catch (err) {
      return {
        ok: false,
        stage: "persistence",
        message: err instanceof Error ? err.message : "Failed to persist the generated batch.",
        attempts: attempt,
      };
    }

    return { ok: true, batchId: saveResult.batchId, pieceIds: saveResult.pieceIds, attempts: attempt };
  }

  // Unreachable in practice (every loop iteration returns or continues within
  // the attempt budget), kept as an explicit exhaustive fallback.
  return {
    ok: false,
    stage: "generation",
    message: "Exhausted all attempts without a successful generation.",
    attempts: attempt,
  };
}
