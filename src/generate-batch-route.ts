/**
 * Generate Batch API Route
 * ---------------------------------
 * Thin bridge between the Teacher Generation UI and the existing
 * generate-batch-usecase.ts.
 *
 * Responsibilities:
 *  1. Validate the incoming topic/provider.
 *  2. Resolve exactly the provider selected by the user.
 *  3. Support Gemini, Claude, Ollama, and Mock.
 *  4. Create the matching ContentGenerator.
 *  5. Run generateBatch().
 *  6. Load persisted pieces and return them to the UI.
 *
 * Important:
 *  - There is NO automatic provider fallback.
 *  - Mock requires NO API key.
 *  - Gemini/Claude/Ollama require their own configuration.
 */

import type { Request, Response, Router } from "express";
import type Database from "better-sqlite3";

import {
  GeminiProvider,
  ClaudeProvider,
  OllamaProvider,
  MockProvider,
  type AIProvider,
  type ProviderName,
} from "./provider-selector";

import {
  createContentGenerator,
  type ContentGenerator,
} from "./content-generator";

import {
  generateBatch,
  type GenerateBatchResult,
} from "./generate-batch-usecase";

import {
  listPieces,
  type PieceRecord,
} from "./persistence";

// ---------------------------------------------------------------------------
// Request / Response types
// ---------------------------------------------------------------------------

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

export type GenerateBatchApiResult =
  | GenerateBatchApiSuccess
  | GenerateBatchApiFailure;

// ---------------------------------------------------------------------------
// Provider resolution
// ---------------------------------------------------------------------------

/**
 * Resolves the provider explicitly selected by the Teacher UI.
 *
 * IMPORTANT:
 * There is NO fallback.
 *
 * Example:
 *   provider = "gemini"
 *   -> only Gemini is resolved.
 *
 *   provider = "mock"
 *   -> only MockProvider is resolved.
 *
 * Mock does not require any credentials.
 */
function resolveTeacherSelectedProvider(
  provider: ProviderName,
  env: NodeJS.ProcessEnv
):
  | { provider: AIProvider; model: string }
  | { error: string } {
  switch (provider) {
    // -----------------------------------------------------------------------
    // Gemini
    // -----------------------------------------------------------------------
    case "gemini": {
      const apiKey =
        env.GEMINI_API_KEY ||
        env.GOOGLE_API_KEY;

      const model = env.GEMINI_MODEL;

      if (!apiKey) {
        return {
          error:
            "Gemini is not configured (missing GEMINI_API_KEY).",
        };
      }

      if (!model) {
        return {
          error:
            "Gemini is not configured (missing GEMINI_MODEL).",
        };
      }

      return {
        provider: GeminiProvider.fromConfig({
          apiKey,
        }),
        model,
      };
    }

    // -----------------------------------------------------------------------
    // Claude
    // -----------------------------------------------------------------------
    case "claude": {
      const apiKey = env.ANTHROPIC_API_KEY;
      const model = env.CLAUDE_MODEL;

      if (!apiKey) {
        return {
          error:
            "Claude is not configured (missing ANTHROPIC_API_KEY).",
        };
      }

      if (!model) {
        return {
          error:
            "Claude is not configured (missing CLAUDE_MODEL).",
        };
      }

      return {
        provider: ClaudeProvider.fromConfig({
          apiKey,
        }),
        model,
      };
    }

    // -----------------------------------------------------------------------
    // Ollama
    // -----------------------------------------------------------------------
    case "ollama": {
      const host = env.OLLAMA_HOST;
      const model = env.OLLAMA_MODEL;

      if (!host) {
        return {
          error:
            "Ollama is not configured (missing OLLAMA_HOST).",
        };
      }

      if (!model) {
        return {
          error:
            "Ollama is not configured (missing OLLAMA_MODEL).",
        };
      }

      return {
        provider: OllamaProvider.fromConfig({
          host,
          model,
        }),
        model,
      };
    }

    // -----------------------------------------------------------------------
    // Mock
    // -----------------------------------------------------------------------
    case "mock": {
      /**
       * Mock provider needs:
       *   - API key: NO
       *   - Model configuration: NO
       *   - Internet connection: NO
       *
       * It generates deterministic local test content.
       */
      return {
        provider: MockProvider.fromConfig(undefined),
        model: "mock-v1",
      };
    }

    // -----------------------------------------------------------------------
    // Unsupported provider
    // -----------------------------------------------------------------------
    default: {
      return {
        error:
          `Unsupported provider "${provider}". ` +
          "Choose gemini, claude, ollama, or mock.",
      };
    }
  }
}

// ---------------------------------------------------------------------------
// Main request handler
// ---------------------------------------------------------------------------

export async function handleGenerateBatchRequest(
  body: GenerateBatchRequestBody,
  deps: {
    db: Database.Database;

    /**
     * Optional environment override.
     *
     * Mainly useful for tests.
     * Defaults to process.env in production.
     */
    env?: NodeJS.ProcessEnv;

    /**
     * Optional ContentGenerator factory override.
     *
     * Used by tests to inject a fake generator without changing
     * the real generation/use-case logic.
     */
    createGenerator?: (
      provider: AIProvider
    ) => ContentGenerator;
  }
): Promise<{
  status: number;
  result: GenerateBatchApiResult;
}> {
  // -------------------------------------------------------------------------
  // Input validation
  // -------------------------------------------------------------------------

  const topic =
    typeof body?.topic === "string"
      ? body.topic.trim()
      : "";

  if (!topic) {
    return {
      status: 400,
      result: {
        ok: false,
        stage: "input",
        message: "Topic/Chapter is required.",
      },
    };
  }

  if (!body?.provider) {
    return {
      status: 400,
      result: {
        ok: false,
        stage: "input",
        message: "Provider selection is required.",
      },
    };
  }

  // -------------------------------------------------------------------------
  // Resolve exactly the selected provider
  // -------------------------------------------------------------------------

  const resolved = resolveTeacherSelectedProvider(
    body.provider,
    deps.env ?? process.env
  );

  if ("error" in resolved) {
    return {
      status: 422,
      result: {
        ok: false,
        stage: "provider_guard",
        message: resolved.error,
      },
    };
  }

  // -------------------------------------------------------------------------
  // Create matching content generator
  // -------------------------------------------------------------------------

  const buildGenerator =
    deps.createGenerator ??
    createContentGenerator;

  const generator = buildGenerator(
    resolved.provider
  );

  // -------------------------------------------------------------------------
  // Generate the 30-piece batch
  // -------------------------------------------------------------------------

  const useCaseResult: GenerateBatchResult =
    await generateBatch({
      topic,
      generator,
      model: resolved.model,
      db: deps.db,
    });

  // -------------------------------------------------------------------------
  // Handle generation/use-case failure
  // -------------------------------------------------------------------------

  if (!useCaseResult.ok) {
    const status =
      useCaseResult.stage === "provider_guard"
        ? 422
        : 502;

    return {
      status,
      result: {
        ok: false,
        stage: useCaseResult.stage,
        message: useCaseResult.message,
        validationErrors:
          useCaseResult.validationErrors,
      },
    };
  }

  // -------------------------------------------------------------------------
  // Load persisted pieces
  // -------------------------------------------------------------------------

  const pieces = listPieces(
    deps.db,
    useCaseResult.batchId
  );

  // -------------------------------------------------------------------------
  // Success
  // -------------------------------------------------------------------------

  return {
    status: 201,
    result: {
      ok: true,
      batchId: useCaseResult.batchId,
      attempts: useCaseResult.attempts,
      pieces,
    },
  };
}

// ---------------------------------------------------------------------------
// Express route registration
// ---------------------------------------------------------------------------

/**
 * Registers:
 *
 * POST /api/batches/generate
 */
export function registerGenerateBatchRoute(
  router: Router,
  db: Database.Database
): void {
  router.post(
    "/api/batches/generate",
    async (
      req: Request,
      res: Response
    ) => {
      try {
        const { status, result } =
          await handleGenerateBatchRequest(
            req.body,
            { db }
          );

        res
          .status(status)
          .json(result);
      } catch (error) {
        /**
         * Unexpected server-side error.
         * Do not expose secrets or stack traces to the browser.
         */
        const message =
          error instanceof Error
            ? error.message
            : "Unexpected server error.";

        res.status(500).json({
          ok: false,
          stage: "server",
          message,
        });
      }
    }
  );
}
