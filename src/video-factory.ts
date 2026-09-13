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
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?।])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function targetForPlatform(platform: Platform): VideoTarget[] {
  if (platform === "instagram_reel") return ["instagram_reel"];
  if (platform === "youtube_short") return ["youtube_short"];
  return ["facebook_video"];
}

export function buildVideoProductionPlan(piece: VideoPlanInput): VideoProductionPlan {
  const sentences = splitSentences(piece.body);
  const usable = sentences.length > 0 ? sentences : [piece.body.trim()];
  const selected = usable.slice(0, 6);
  const durationPerScene = selected.length <= 3 ? 5 : 4;

  const scenes = selected.map((sentence, index) => ({
    scene_number: index + 1,
    duration_seconds: durationPerScene,
    voiceover: sentence,
    visual_prompt: `Create a vertical 9:16 educational visual that clearly illustrates: ${sentence}`,
    on_screen_text: sentence.length > 90 ? `${sentence.slice(0, 87)}...` : sentence,
  }));

  return {
    piece_id: piece.id,
    source_platform: piece.platform,
    targets: targetForPlatform(piece.platform),
    aspect_ratio: "9:16",
    estimated_duration_seconds: scenes.reduce((sum, scene) => sum + scene.duration_seconds, 0),
    title: piece.title,
    voiceover_script: selected.join(" "),
    scenes,
    status: "planned",
  };
}
