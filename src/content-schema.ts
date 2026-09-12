/**
 * Content Batch Schema + Runtime Validation
 * ---------------------------------
 * Defines the shape of a "content batch": exactly 30 pieces split evenly
 * across three platforms (10 each), and validates arbitrary parsed JSON
 * against that shape at runtime.
 *
 * This module is provider-agnostic. It doesn't know or care which
 * ContentGenerator produced the data — it only validates the data itself.
 * Today it is exercised against MockProvider's output; the same validator
 * would apply to Gemini/Claude/Ollama output once those request this shape.
 */

export type Platform = "instagram_reel" | "facebook_post" | "youtube_short";

export const PLATFORMS: readonly Platform[] = [
  "instagram_reel",
  "facebook_post",
  "youtube_short",
];

export const PIECES_PER_PLATFORM = 10;
export const TOTAL_PIECES = PLATFORMS.length * PIECES_PER_PLATFORM; // 30

export interface ContentPiece {
  platform: Platform;
  /** 1-10, unique within its platform. */
  piece_number: number;
  title: string;
  body: string;
  hashtags: string[];
  cta: string;
}

export interface ContentBatch {
  pieces: ContentPiece[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isNonEmptyStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((v) => isNonEmptyString(v))
  );
}

/**
 * Validates a single piece's field-level shape. Does not check
 * cross-piece constraints (uniqueness, counts) — see validateContentBatch.
 */
function validatePieceFields(piece: unknown, index: number, errors: string[]): piece is ContentPiece {
  const label = `pieces[${index}]`;

  if (typeof piece !== "object" || piece === null) {
    errors.push(`${label}: expected an object, got ${typeof piece}`);
    return false;
  }

  const p = piece as Record<string, unknown>;
  let ok = true;

  if (!PLATFORMS.includes(p.platform as Platform)) {
    errors.push(`${label}: platform must be one of ${PLATFORMS.join(", ")}, got ${JSON.stringify(p.platform)}`);
    ok = false;
  }
  if (
    typeof p.piece_number !== "number" ||
    !Number.isInteger(p.piece_number) ||
    p.piece_number < 1 ||
    p.piece_number > PIECES_PER_PLATFORM
  ) {
    errors.push(`${label}: piece_number must be an integer 1-${PIECES_PER_PLATFORM}, got ${JSON.stringify(p.piece_number)}`);
    ok = false;
  }
  if (!isNonEmptyString(p.title)) {
    errors.push(`${label}: title must be a non-empty string`);
    ok = false;
  }
  if (!isNonEmptyString(p.body)) {
    errors.push(`${label}: body must be a non-empty string`);
    ok = false;
  }
  if (!isNonEmptyStringArray(p.hashtags)) {
    errors.push(`${label}: hashtags must be a non-empty array of non-empty strings`);
    ok = false;
  }
  if (!isNonEmptyString(p.cta)) {
    errors.push(`${label}: cta must be a non-empty string`);
    ok = false;
  }

  return ok;
}

/**
 * Validates a full content batch:
 *  - exactly TOTAL_PIECES (30) pieces overall
 *  - exactly PIECES_PER_PLATFORM (10) pieces per platform
 *  - piece_number values within each platform are exactly 1..10, no duplicates
 *  - every piece has all required, non-empty fields
 */
export function validateContentBatch(data: unknown): ValidationResult {
  const errors: string[] = [];

  if (typeof data !== "object" || data === null || !("pieces" in data)) {
    return { valid: false, errors: ["batch must be an object with a `pieces` array"] };
  }

  const pieces = (data as { pieces: unknown }).pieces;
  if (!Array.isArray(pieces)) {
    return { valid: false, errors: ["`pieces` must be an array"] };
  }

  if (pieces.length !== TOTAL_PIECES) {
    errors.push(`expected exactly ${TOTAL_PIECES} pieces, got ${pieces.length}`);
  }

  const seenByPlatform = new Map<Platform, Set<number>>();
  for (const platform of PLATFORMS) seenByPlatform.set(platform, new Set());

  pieces.forEach((piece, index) => {
    const fieldsOk = validatePieceFields(piece, index, errors);
    if (!fieldsOk) return;

    const p = piece as ContentPiece;
    const seen = seenByPlatform.get(p.platform)!;
    if (seen.has(p.piece_number)) {
      errors.push(`duplicate piece_number ${p.piece_number} for platform "${p.platform}"`);
    } else {
      seen.add(p.piece_number);
    }
  });

  for (const platform of PLATFORMS) {
    const seen = seenByPlatform.get(platform)!;
    if (seen.size !== PIECES_PER_PLATFORM) {
      errors.push(
        `platform "${platform}" has ${seen.size} valid/unique piece(s), expected ${PIECES_PER_PLATFORM}`
      );
    }
    for (let n = 1; n <= PIECES_PER_PLATFORM; n++) {
      if (!seen.has(n)) {
        errors.push(`platform "${platform}" is missing piece_number ${n}`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
