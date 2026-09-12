/**
 * Mock Content Batch Generator
 * ---------------------------------
 * Deterministic, offline generator used for free/demo testing.
 * Produces exactly 30 valid ContentPieces: 10 Instagram Reels,
 * 10 Facebook Posts and 10 YouTube Shorts.
 *
 * IMPORTANT: The mock provider receives the full generation prompt from the
 * use-case, not the raw topic. We therefore extract the Topic/Chapter from
 * the prompt before creating copy. This keeps the mock output readable and
 * prevents the entire instruction prompt from appearing as the topic.
 */

import { PLATFORMS, PIECES_PER_PLATFORM, type ContentBatch, type ContentPiece, type Platform } from "./content-schema";

const PLATFORM_LABEL: Record<Platform, string> = {
  instagram_reel: "Instagram Reel",
  facebook_post: "Facebook Post",
  youtube_short: "YouTube Short",
};

/** Pull the teacher's actual topic out of the structured generation prompt. */
function extractTopic(prompt: string): string {
  const match = prompt.match(/Topic\/Chapter:\s*"([^"]+)"/i);
  if (match?.[1]?.trim()) return match[1].trim();

  // Fallback for direct/unit-test calls that pass a plain topic.
  const cleaned = prompt.trim();
  return cleaned || "your topic";
}

function buildPiece(platform: Platform, pieceNumber: number, topic: string): ContentPiece {
  const label = PLATFORM_LABEL[platform];

  const hooks: Record<Platform, string[]> = {
    instagram_reel: [
      `What is ${topic}? Let's understand it in one quick lesson.`,
      `The basic idea of ${topic}, explained simply.`,
      `3 key points you should know about ${topic}.`,
      `A quick concept check: can you explain ${topic}?`,
      `Why does ${topic} matter? Here's the core idea.`,
      `Common mistake alert: let's revise ${topic} correctly.`,
      `Quick revision: remember these essentials of ${topic}.`,
      `Think like a scientist: ask this question about ${topic}.`,
      `One-minute revision challenge on ${topic}.`,
      `Final recap: the most important ideas from ${topic}.`,
    ],
    facebook_post: [
      `Understanding ${topic}: the foundation`,
      `A simple explanation of ${topic}`,
      `Three important ideas from ${topic}`,
      `Check your understanding of ${topic}`,
      `Why ${topic} is important to learn`,
      `Avoid this common misunderstanding about ${topic}`,
      `Quick revision notes for ${topic}`,
      `Think deeper about ${topic}`,
      `A short self-test on ${topic}`,
      `Classroom recap: ${topic}`,
    ],
    youtube_short: [
      `${topic} in 30 seconds`,
      `The basic idea of ${topic}`, 
      `3 things to remember about ${topic}`,
      `Can you answer this ${topic} question?`,
      `Why is ${topic} important?`,
      `Common ${topic} mistake`,
      `${topic} quick revision`,
      `Think about ${topic} like a scientist`,
      `${topic} mini quiz`,
      `${topic}: final recap`,
    ],
  };

  const bodies: Record<Platform, string[]> = {
    instagram_reel: [
      `${topic} is the focus of today's quick revision. Start by defining the concept in your own words, then identify its main parts or stages.`,
      `Use this study method for ${topic}: learn the definition, understand the process or key ideas, and then explain them without looking at your notes.`,
      `For ${topic}, focus on three things: the main concept, the important terms, and the relationship between the steps or ideas.`,
      `Pause and answer: What is ${topic}? What are its key features? Can you give one correct example?`,
      `Understanding ${topic} helps you connect the chapter's facts instead of memorising isolated lines.`,
      `Do not confuse similar terms while revising ${topic}. Compare their meanings and write one difference in your notebook.`,
      `Quick revision rule for ${topic}: definition → key points → process or relationship → example → one self-check question.`,
      `Ask “why” and “how”, not only “what”, when studying ${topic}. Those questions help you build real understanding.`,
      `Mini challenge: explain ${topic} in three sentences without using your textbook. Then check what you missed.`,
      `Recap ${topic} by writing five keywords and one sentence connecting them. That makes a great last-minute revision activity.`,
    ],
    facebook_post: [
      `Today we are revising ${topic}. Begin with the definition, then identify the major ideas, steps, or terms that explain the concept.`,
      `A simple way to study ${topic} is to move from the big idea to the details. First understand what it means, then learn how its parts are connected.`,
      `When revising ${topic}, make a three-column note: key term, meaning, and example. This makes recall easier before a test.`,
      `Self-check: Can you define ${topic}, name its important parts, and explain one relationship or process connected with it?`,
      `${topic} is easier to remember when you understand why the concept matters. Try connecting today's lesson to an everyday observation or classroom example.`,
      `A common study mistake is learning a term from ${topic} without understanding it. Write the term, explain it in simple language, and compare it with a related term.`,
      `Quick revision plan for ${topic}: read the concept once, close the book, recall the main points, and then correct your gaps.`,
      `Go one level deeper with ${topic}: ask what causes it, what changes it, and what evidence could help you explain it.`,
      `Try this mini quiz on ${topic}: What is the main idea? Which terms are essential? What is one example? Explain your answers in your own words.`,
      `End your ${topic} revision with a one-minute summary. If you can teach the concept clearly to a classmate, you probably understand it well.`,
    ],
    youtube_short: [
      `In this short revision, we are breaking ${topic} into a simple definition and its most important ideas.`,
      `Remember ${topic} by learning the main idea first, then the terms and relationships that support it.`,
      `For quick revision, remember the main concept, two important terms, and one example connected with ${topic}.`,
      `Quiz time: define ${topic} in one sentence, then name one important feature or step.`,
      `Knowing why ${topic} matters makes the chapter easier to understand and remember.`,
      `Watch out for similar-sounding terms in ${topic}. Learn the difference instead of memorising both separately.`,
      `Fast revision for ${topic}: definition, key terms, important relationship, example, and one self-test.`,
      `A scientist would ask how and why ${topic} works. Use those questions to move beyond memorisation.`,
      `Mini quiz: explain ${topic} without notes, then check your answer against your textbook.`,
      `Final recap: write five keywords from ${topic} and connect them in one clear explanation.`,
    ],
  };

  return {
    platform,
    piece_number: pieceNumber,
    title: hooks[platform][pieceNumber - 1],
    body: bodies[platform][pieceNumber - 1],
    hashtags: ["#Education", "#StudyTips", `#${platform}`],
    cta: platform === "facebook_post"
      ? "Save this post for revision and share it with a classmate."
      : "Save this for revision and follow for more lessons.",
  };
}

export function generateMockContentBatch(prompt: string): ContentBatch {
  const topic = extractTopic(prompt);
  const pieces: ContentPiece[] = [];

  for (const platform of PLATFORMS) {
    for (let n = 1; n <= PIECES_PER_PLATFORM; n++) {
      pieces.push(buildPiece(platform, n, topic));
    }
  }

  return { pieces };
}
