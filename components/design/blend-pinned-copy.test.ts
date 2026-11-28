import { describe, expect, it } from "vitest";

import { BLEND_PINNED_HINT } from "./blend-pinned-copy";

describe("why a tip rail's blend slider is grey (fast 221)", () => {
  it("names the slider to move and which way, from the tip the pair is measured from", () => {
    expect(BLEND_PINNED_HINT.blendsFrom("nose")).toBe("Move Ends At further from the nose to move Blends From.");
    expect(BLEND_PINNED_HINT.blendsFrom("tail")).toBe("Move Ends At further from the tail to move Blends From.");
    expect(BLEND_PINNED_HINT.endsAt("nose")).toBe("Move Blends From closer to the nose to move Ends At.");
    expect(BLEND_PINNED_HINT.endsAt("tail")).toBe("Move Blends From closer to the tail to move Ends At.");
  });

  it("carries no figure, so it reads the same in Imperial and Metric", () => {
    for (const line of [BLEND_PINNED_HINT.blendsFrom("nose"), BLEND_PINNED_HINT.endsAt("tail")]) {
      expect(line).not.toMatch(/\d/);
    }
  });
});
