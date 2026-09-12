/**
 * Content Response Parser
 * ---------------------------------
 * Pure function: raw text from any ContentGenerator -> best-effort parsed
 * JSON. Does NOT duplicate validation logic — validateContentBatch() in
 * content-schema.ts remains the single source of truth for whether the
 * parsed shape is actually a valid batch. This module only worries about
 * turning text into *some* JSON value (or reporting that it couldn't).
 */

export interface ParseSuccess {
  ok: true;
  data: unknown;
}

export interface ParseFailure {
  ok: false;
  message: string;
}

export type ParseResult = ParseSuccess | ParseFailure;

/**
 * Strips a leading/trailing ```json or ``` code fence if present. Some
 * models wrap JSON in a fence even when explicitly asked not to.
 */
function stripCodeFence(text: string): string {
  const fenced = text.trim().match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1] : text;
}

export function parseBatchContent(rawContent: string): ParseResult {
  const candidate = stripCodeFence(rawContent);
  try {
    const data = JSON.parse(candidate);
    return { ok: true, data };
  } catch (err) {
    return {
      ok: false,
      message: `Response was not valid JSON: ${err instanceof Error ? err.message : "unknown parse error"}`,
    };
  }
}
