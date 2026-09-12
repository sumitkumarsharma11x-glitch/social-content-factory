/**
 * Content Prompt Builder
 * ---------------------------------
 * Pure function: topic string -> generation prompt + structured-output
 * schema request. Provider-agnostic — the same output is handed to
 * whichever ContentGenerator the use-case is driving (Gemini or Claude
 * today; Ollama once implemented).
 */

import { PLATFORMS, PIECES_PER_PLATFORM, TOTAL_PIECES } from "./content-schema";

const PLATFORM_LABEL: Record<string, string> = {
  instagram_reel: "Instagram Reel",
  facebook_post: "Facebook Post",
  youtube_short: "YouTube Short",
};

export interface StructuredOutputRequest {
  name: string;
  description: string;
  schema: object;
}

export interface BuiltPrompt {
  prompt: string;
  structuredOutput: StructuredOutputRequest;
}

/** JSON-schema shape matching content-schema.ts's ContentBatch exactly. */
function contentBatchJsonSchema(): object {
  return {
    type: "object",
    properties: {
      pieces: {
        type: "array",
        minItems: TOTAL_PIECES,
        maxItems: TOTAL_PIECES,
        items: {
          type: "object",
          properties: {
            platform: { type: "string", enum: [...PLATFORMS] },
            piece_number: { type: "integer", minimum: 1, maximum: PIECES_PER_PLATFORM },
            title: { type: "string", minLength: 1 },
            body: { type: "string", minLength: 1 },
            hashtags: { type: "array", items: { type: "string", minLength: 1 }, minItems: 1 },
            cta: { type: "string", minLength: 1 },
          },
          required: ["platform", "piece_number", "title", "body", "hashtags", "cta"],
        },
      },
    },
    required: ["pieces"],
  };
}

export function buildGenerateBatchPrompt(topic: string): BuiltPrompt {
  const safeTopic = topic.trim();
  const platformLines = PLATFORMS.map(
    (p) => `- ${PIECES_PER_PLATFORM} pieces with platform="${p}" (${PLATFORM_LABEL[p]}), piece_number 1-${PIECES_PER_PLATFORM}`
  ).join("\n");

  const prompt = `You are creating an educational social media content batch for a teacher.

Topic/Chapter: "${safeTopic}"

Generate EXACTLY ${TOTAL_PIECES} content pieces total, split as:
${platformLines}

Content strategy (IMPORTANT):
- The first line/title must be a genuinely curiosity-driven QUESTION or hook that makes a viewer stop and think. Avoid generic openings such as “What is ${safeTopic}?” unless the question itself creates surprise or curiosity.
- Create 10 distinct core curiosity questions/angles. Reuse those same 10 core questions across the three platforms when useful, but NEVER copy the same explanation.
- For every piece, the explanation angle must be different: examples include surprise reveal, what-if scenario, hidden detail, challenge, misconception bust, real-life analogy, exam trigger, why-first explanation, diagram decoding, or one-minute summary.
- Voice-over must be natural Hindi. English technical terms may remain in English where they are standard subject terminology.
- Use this flow inside the body: HOOK/QUESTION → CURIOSITY → REVEAL → SIMPLE EXPLANATION → EXAMPLE/VISUAL → WEBSITE APPROACH → CTA.
- Website promotion must feel educational and natural, never like an aggressive advertisement. Do not invent a website URL; refer to “हमारी website” unless a URL is explicitly supplied.
- Instagram Reels: punchy, high-retention spoken script with a fast reveal and visual cue.
- Facebook Posts: same core question can be reused, but give a deeper explanation, example, and a discussion question.
- YouTube Shorts: very fast question → suspense → reveal → payoff → revision takeaway.
- Avoid repetitive filler, generic “quick revision” wording, and platform-name hashtags.

Rules:
- Every piece needs: platform, piece_number, title, body, hashtags (a non-empty array), cta.
- piece_number must be 1-${PIECES_PER_PLATFORM}, used exactly once per platform (no duplicates, no gaps).
- Content must be educational, accurate, age-appropriate, and specific to the topic above.
- Do not include any commentary outside the requested structured output.`;

  return {
    prompt,
    structuredOutput: {
      name: "submit_content_batch",
      description: `Submit exactly ${TOTAL_PIECES} educational social media content pieces (10 per platform).`,
      schema: contentBatchJsonSchema(),
    },
  };
}

/** Appends validation feedback to the base prompt for a corrective retry (same provider only). */
export function buildRetryPrompt(basePrompt: string, previousErrors: string[]): string {
  const errorList = previousErrors.slice(0, 10).map((e) => `- ${e}`).join("\n");
  return `${basePrompt}

Your previous attempt did not match the required structure. Fix these problems and resubmit the FULL batch:
${errorList}`;
}
