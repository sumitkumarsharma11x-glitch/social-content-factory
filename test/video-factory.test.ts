import { describe, expect, it } from "vitest";
import { buildVideoProductionPlan } from "../src/video-factory";

describe("Video Factory Phase 2", () => {
  it("creates a 9:16 renderer-ready plan from approved-content shape", () => {
    const plan = buildVideoProductionPlan({
      id: 101,
      platform: "instagram_reel",
      piece_number: 1,
      title: "Photosynthesis",
      body: "पौधे sunlight को chemical energy में बदलते हैं। इसी process को photosynthesis कहते हैं।",
      hashtags: ["#Science"],
      cta: "ऐसे ही आसान explanations के लिए RojgarDwaar देखें।",
    });

    expect(plan.piece_id).toBe(101);
    expect(plan.aspect_ratio).toBe("9:16");
    expect(plan.targets).toEqual(["instagram_reel"]);
    expect(plan.scenes.length).toBe(2);
    expect(plan.voiceover_script).toContain("photosynthesis");
    expect(plan.scenes.every((scene) => scene.duration_seconds > 0)).toBe(true);
  });
});
