import { describe, expect, it } from "vitest";
import {
  GUIDE_NO_CAPTION,
  GUIDE_NO_TAG,
  GUIDE_PAGES,
  guideCaptionText,
  guideCardId,
  guideFigure,
  guideSlug,
  guideText,
} from "./guide-card";

describe("guideSlug", () => {
  it("lower-cases and joins every run of other characters with one dash", () => {
    expect(guideSlug("Nose Rail · Center Rail · Tail Rail")).toBe("nose-rail-center-rail-tail-rail");
    expect(guideSlug("Add 5th/Center fin")).toBe("add-5th-center-fin");
    expect(guideSlug("  2+1  ")).toBe("2-1");
  });
});

describe("guideCardId", () => {
  it("keys a card on its page, group and name, so a name that repeats on a page never collides (D-27)", () => {
    const tail = guideCardId("template", "Tail Controls", "Fullness");
    const nose = guideCardId("template", "Nose Controls", "Fullness");
    expect(tail).not.toBe(nose);
    expect(tail).toBe("template.tail-controls.fullness");
    expect(guideCardId("volume", "Inputs", "Board Length")).not.toBe(guideCardId("template", "Board Length", "Board Length"));
  });

  it("lists the five pages in the order a board is shaped", () => {
    expect(GUIDE_PAGES).toEqual(["template", "rocker", "rails", "volume", "fins"]);
  });
});

describe("guideCaptionText", () => {
  it("reads dashed, drawn as, or nothing at all", () => {
    expect(guideCaptionText({ kind: "dashed", parts: [guideFigure('6\'8"'), guideText(" → "), guideFigure("31.8 L")] })).toBe(
      "dashed · 6'8\" → 31.8 L",
    );
    expect(guideCaptionText({ kind: "drawnAs", parts: [guideText("Thruster — McKee Gun")] })).toBe("drawn as · Thruster — McKee Gun");
    expect(guideCaptionText(GUIDE_NO_CAPTION)).toBe("");
  });

  it("has no tag and no caption by default", () => {
    expect(GUIDE_NO_TAG).toEqual({ kind: "none", text: "" });
    expect(GUIDE_NO_CAPTION.kind).toBe("none");
  });
});
