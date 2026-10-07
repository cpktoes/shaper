import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { liveControls, type RockerTab } from "./rocker-live-controls";

/**
 * Which ROCKER sidebar controls stay live on each tab (quick 261006-v20, 2026-10-06). The three
 * tables are pinned exactly — all ten keys as full literals — so a new key or a flipped value fails
 * here before it can reach a shaper's screen. VIEWER is everything, as before (D-01); DATASHEET the
 * three thicknesses the table can also type (D-01, D-12, D-13); TOP VIEW the blank picker and
 * Placement (D-01).
 */
describe("liveControls (quick 261006-v20)", () => {
  it('liveControls("viewer") leaves every sidebar control live, exactly as before', () => {
    expect(liveControls("viewer")).toEqual({
      center: true,
      blank: true,
      placement: true,
      deckSkin: true,
      rocker: true,
      tipThickness: true,
      fineTune: true,
      tipStyle: true,
      thinning: true,
      thicknessHeading: true,
    });
  });

  it('liveControls("datasheet") leaves only Center Thickness and the two tip thicknesses live', () => {
    expect(liveControls("datasheet")).toEqual({
      center: true,
      blank: false,
      placement: false,
      deckSkin: false,
      rocker: false,
      tipThickness: true,
      fineTune: false,
      tipStyle: false,
      thinning: false,
      thicknessHeading: true,
    });
  });

  it('liveControls("topView") leaves only the blank picker and Placement live', () => {
    expect(liveControls("topView")).toEqual({
      center: false,
      blank: true,
      placement: true,
      deckSkin: false,
      rocker: false,
      tipThickness: false,
      fineTune: false,
      tipStyle: false,
      thinning: false,
      thicknessHeading: false,
    });
  });

  it("the THICKNESS heading is live whenever any of its rows is live, on every tab (D-13)", () => {
    const tabs: RockerTab[] = ["viewer", "datasheet", "topView"];
    for (const tab of tabs) {
      const live = liveControls(tab);
      expect(live.thicknessHeading, tab).toBe(live.tipThickness || live.fineTune || live.tipStyle || live.thinning);
    }
  });

  it("returns a fresh, equal table on every call — changing one never changes the next", () => {
    const first = liveControls("datasheet");
    const second = liveControls("datasheet");
    expect(second).toEqual(first);
    expect(second).not.toBe(first);
    first.blank = true;
    first.center = false;
    expect(liveControls("datasheet").blank).toBe(false);
    expect(liveControls("datasheet").center).toBe(true);
  });

  it("the module stays pure: no import lines at all (D-03)", () => {
    const source = readFileSync(join(__dirname, "rocker-live-controls.ts"), "utf8");
    const importLines = source.split("\n").filter((line) => /^\s*import[\s{*"']/.test(line));
    expect(importLines).toEqual([]);
  });
});
