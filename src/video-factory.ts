import type { Platform } from "./content-schema";

export type VideoAspectRatio = "9:16";
export type VideoTarget = "instagram_reel" | "youtube_short" | "facebook_video";

export interface VideoPlanInput {
  id: number;
  platform: Platform;
  piece_number: number;
  title: string;
  body: string;
  hashtags: string[];
  cta: string;
  target_duration_seconds?: number;
}

export interface VideoScene {
  scene_number: number;
  duration_seconds: number;
  voiceover: string;
  visual_prompt: string;
  on_screen_text: string;
}

export interface VideoProductionPlan {
  piece_id: number;
  source_platform: Platform;
  targets: VideoTarget[];
  aspect_ratio: VideoAspectRatio;
  estimated_duration_seconds: number;
  title: string;
  voiceover_script: string;
  scenes: VideoScene[];
  status: "planned";
}

function splitSentences(text: string): string[] {
  return text.replace(/\s+/g, " ").split(/(?<=[.!?।])\s+/).map((part) => part.trim()).filter(Boolean);
}
function targetForPlatform(platform: Platform): VideoTarget[] {
  if (platform === "instagram_reel") return ["instagram_reel"];
  if (platform === "youtube_short") return ["youtube_short"];
  return ["facebook_video"];
}
function sceneDuration(sentence: string): number {
  const words = sentence.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(5, Math.min(13, Math.round(words / 2.25)));
}
function targetDuration(input: VideoPlanInput): number | undefined {
  const value = input.target_duration_seconds;
  if (!Number.isFinite(value)) return undefined;
  return Math.max(30, Math.min(900, Math.round(value!)));
}
export function buildVideoProductionPlan(piece: VideoPlanInput): VideoProductionPlan {
  const sentences = splitSentences(piece.body);
  const usable = sentences.length > 0 ? sentences : [piece.body.trim()];
  const requested = targetDuration(piece);
  const scenes = usable.map((sentence, index) => ({
    scene_number: index + 1,
    duration_seconds: sceneDuration(sentence),
    voiceover: sentence,
    visual_prompt: `Create a beautiful vertical 9:16 educational visual that clearly illustrates the concept in this narration. Use one strong central illustration, clean labels, simple diagram elements, high readability, no tiny text, no logos, no watermark: ${sentence}`,
    on_screen_text: sentence.length > 100 ? `${sentence.slice(0, 97)}...` : sentence,
  }));
  const estimated = scenes.reduce((sum, scene) => sum + scene.duration_seconds, 0);
  return { piece_id: piece.id, source_platform: piece.platform, targets: targetForPlatform(piece.platform), aspect_ratio: "9:16", estimated_duration_seconds: requested ?? estimated, title: piece.title, voiceover_script: usable.join(" "), scenes, status: "planned" };
}
