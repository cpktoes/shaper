import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  PHONE_MOVE_VIA_MENU,
  RACK_COPY,
  holdToMoveEnabled,
  movesOffered,
  rackCountText,
  rackHeadingLine,
  rackHintText,
} from "./rack-config";

describe("D-11: the moves-offered matrix", () => {
  it("is switched off by default", () => {
    expect(PHONE_MOVE_VIA_MENU).toBe(false);
  });

  it("with the switch off: a mouse drags and gets the ⋯ moves; a finger holds and gets none (D-12)", () => {
    expect(holdToMoveEnabled("hover", false)).toBe(false);
    expect(movesOffered("hover", false)).toBe(true);
    expect(holdToMoveEnabled("swipe", false)).toBe(true);
    expect(movesOffered("swipe", false)).toBe(false);
  });

  it("with the switch on: a finger stops holding and gets the ⋯ moves instead; a mouse is unchanged", () => {
    expect(holdToMoveEnabled("hover", true)).toBe(false);
    expect(movesOffered("hover", true)).toBe(true);
    expect(holdToMoveEnabled("swipe", true)).toBe(false);
    expect(movesOffered("swipe", true)).toBe(true);
  });

  it("reads the switch as the default", () => {
    expect(holdToMoveEnabled("swipe")).toBe(holdToMoveEnabled("swipe", PHONE_MOVE_VIA_MENU));
    expect(movesOffered("swipe")).toBe(movesOffered("swipe", PHONE_MOVE_VIA_MENU));
    expect(rackHintText("swipe")).toBe(rackHintText("swipe", PHONE_MOVE_VIA_MENU));
    expect(rackHeadingLine(3, "swipe")).toBe(rackHeadingLine(3, "swipe", PHONE_MOVE_VIA_MENU));
  });
});

describe("R7 / D-08: the heading's line always shows the count and the hint", () => {
  it("counts boards in plain words", () => {
    expect(rackCountText(1)).toBe("1 board");
    expect(rackCountText(0)).toBe("0 boards");
    expect(rackCountText(15)).toBe("15 boards");
  });

  it("gives each rack its hint", () => {
    expect(rackHintText("hover", false)).toBe("point to turn, drag to move");
    expect(rackHintText("hover", true)).toBe("point to turn, drag to move");
    expect(rackHintText("swipe", false)).toBe("hold to move");
    expect(rackHintText("swipe", true)).toBe("tap ⋯ to move");
  });

  it("joins count and hint with a middle dot", () => {
    expect(rackHeadingLine(15, "hover", false)).toBe("15 boards · point to turn, drag to move");
    expect(rackHeadingLine(15, "swipe", false)).toBe("15 boards · hold to move");
    expect(rackHeadingLine(1, "hover", false).startsWith("1 board · ")).toBe(true);
    expect(rackHeadingLine(15, "swipe", true)).toBe("15 boards · tap ⋯ to move");
    expect(rackHeadingLine(15, "hover", false)).toContain(" · ");
  });
});

describe("every rack word, exactly as UI-SPEC § Copywriting has it", () => {
  it("names the rack and its boards", () => {
    expect(RACK_COPY.heading).toBe("Board Rack");
    expect(RACK_COPY.unsavedTag).toBe("In progress — not saved");
    expect(RACK_COPY.untitled).toBe("Untitled Board");
    expect(RACK_COPY.open).toBe("Open This Board");
    expect(RACK_COPY.continueBoard).toBe("Continue This Board");
  });

  it("dates the last touch the way the cards always have", () => {
    expect(RACK_COPY.lastTouched("Oct 4, 2026")).toBe("Last touched Oct 4, 2026");
    expect(RACK_COPY.lastTouched(new Date(2026, 9, 4, 12))).toBe("Last touched Oct 4, 2026");
  });

  it("says what a move did", () => {
    expect(RACK_COPY.moved("Daily Driver")).toBe("Moved Daily Driver. The rack keeps your order.");
    expect(RACK_COPY.unsavedStaysFirst).toBe("The unsaved board stays first until it's saved");
    expect(RACK_COPY.alreadyFirst("Fish")).toBe("Fish is already first.");
    expect(RACK_COPY.alreadyLast("Fish")).toBe("Fish is already last.");
    expect(RACK_COPY.saveFailed).toBe("Couldn't save the new order — try again.");
    expect(`${RACK_COPY.carryingPrefix}Fish${RACK_COPY.carryingSuffix}`).toBe(
      "Moving Fish. Let go where you want it.",
    );
  });

  it("says what duplicate and delete did", () => {
    expect(RACK_COPY.duplicated("Fish")).toBe("Duplicated Fish. The copy stands next to it.");
    expect(RACK_COPY.deleted("Fish")).toBe("Deleted Fish.");
    expect(RACK_COPY.duplicateFailed).toBe("Couldn't duplicate — try again.");
  });

  it("gives screen readers the rack's words", () => {
    expect(RACK_COPY.groupName).toBe("Boards in your rack");
    expect(RACK_COPY.hoverInstructions).toBe(
      "Use the left and right arrow keys to look along the rack, Enter to open the board, and Alt with an arrow key to move it one place.",
    );
    expect(RACK_COPY.swipeInstructions).toBe(
      "Swipe, or use the left and right arrow keys, to look along the rack. Press Enter to open the board.",
    );
    expect(RACK_COPY.boardLabel("Fish", "5'8\" · 20 1/4\"", 2, 15)).toBe("Fish, 5'8\" · 20 1/4\", board 2 of 15");
    expect(RACK_COPY.boardLabel("Fish", "5'8\" · 20 1/4\"", 2, 15, true)).toBe(
      "Fish, locked, 5'8\" · 20 1/4\", board 2 of 15",
    );
    expect(RACK_COPY.boardLabel("Fish", "5'8\"", 1, 3, false)).toBe("Fish, 5'8\", board 1 of 3");
    expect(RACK_COPY.unsavedBoardLabel("Fish", "5'8\"", 15)).toBe(
      "Fish, in progress and not saved, 5'8\", board 1 of 15",
    );
    expect(RACK_COPY.captionGroup("Fish")).toBe("Fish actions");
  });

  it("names the menu's two move rows and the three hints", () => {
    expect(RACK_COPY.moveLeft).toBe("Move left");
    expect(RACK_COPY.moveRight).toBe("Move right");
    expect(RACK_COPY.hints).toEqual({
      hover: "point to turn, drag to move",
      swipe: "hold to move",
      swipeViaMenu: "tap ⋯ to move",
    });
  });
});

describe("the rack's words file stays importable by the browser tests", () => {
  it("has no React import (comments aside)", () => {
    const source = readFileSync(new URL("./rack-config.ts", import.meta.url), "utf8");
    const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    expect(code).not.toMatch(/from\s+["']react["']|require\(["']react["']\)/);
    expect(code).not.toMatch(/^\s*["']use client["']/m);
  });
});
