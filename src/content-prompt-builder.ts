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
            core_question_id: { type: "integer", minimum: 1, maximum: PIECES_PER_PLATFORM },
            explanation_angle: { type: "string", minLength: 1 },
          },
          required: ["platform", "piece_number", "title", "body", "hashtags", "cta", "core_question_id", "explanation_angle"],
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
- Create exactly 10 core curiosity questions. Each core question must appear once on each platform (3 pieces total). Keep the core question/hook the same within that 3-piece group, but give each platform a genuinely different explanation angle, example, pacing, visual treatment, and takeaway. Return core_question_id 1-10 so the grouping is explicit.
- Return a unique explanation_angle for every piece. Within each core_question_id, the three platforms MUST use different explanation_angle values; within each platform, all 10 explanation_angle values must be unique. Never copy an explanation word-for-word across platforms.
- For every piece, the explanation angle must be different: examples include surprise reveal, what-if scenario, hidden detail, challenge, misconception bust, real-life analogy, exam trigger, why-first explanation, diagram decoding, or one-minute summary.
- Voice-over must be natural spoken Hindi. English technical terms may remain in English where they are standard subject terminology. Avoid repeating the same opener phrase across pieces; vary the spoken openings or jump directly into the reveal. Keep spoken sentences short and conversational.
- Use this flow inside the body: HOOK/QUESTION → CURIOSITY → REVEAL → SIMPLE EXPLANATION → EXAMPLE/VISUAL → optional WEBSITE APPROACH → CTA. Do not print internal strategy labels as if the creator should speak them; the body should read like usable creator copy plus concise visual direction.
- Website promotion must feel educational and natural, never like an aggressive advertisement.
- The website is "rojgardwaar.in". Refer to it by name (e.g. "RojgarDwaar पर", "rojgardwaar.in पर") — do NOT invent a different URL, and do not repeat the exact same sentence across pieces.
- Not every piece needs a website mention. Roughly 60-70% of pieces should include a soft, contextual reference; the rest should stand complete without one.
- When mentioned, tie it to the specific concept just explained (e.g. "इस chapter ka पूरा breakdown rojgardwaar.in पर मिलेगा"), not a generic boilerplate line.
- Instagram Reels: punchy 20-35 second spoken script, short lines, fast reveal, visual cue, energetic close; do not end with a discussion question.
- Facebook Posts: same core question can be reused, but give the deepest explanation of the three, a useful example/context, and a discussion question at the end.
- YouTube Shorts: hook within the first few seconds, explicit suspense beat, fast reveal, one-line payoff, and an exam/revision takeaway.
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
