import { describe, expect, it } from "vitest";
import { guideVolumeInput } from "@/lib/geometry/__fixtures__/guide-volume-input";
import { guideCaptionText, guideCardId } from "@/lib/geometry/guide-card";
import { buildVolumeGuide, VOLUME_GUIDE_CARD_ORDER } from "@/lib/geometry/guide-volume";
import { guideIntro } from "../guide-copy";
import { readGuideWordsPage } from "./read-words-page";
import { VOLUME_GUIDE_GROUPS, VOLUME_GUIDE_INTRO, VOLUME_GUIDE_WORDS } from "./volume";

/**
 * VOLUME's words are the founder's, line for line (Phase 18, D-09, R6): the module the page reads is held
 * to `18-GUIDE-WORDS.md` by exact string equality, card by card in order. The page is found by name under
 * `.planning/`, so the test keeps reading it after the phase moves to the archive.
 */

const page = readGuideWordsPage();
const volume = page.pages.find((p) => p.page === "volume")!;

describe("the words page", () => {
  it("is read as five pages and only five, with the cards and MODEL INFO notes it holds", () => {
    expect(page.pages.map((p) => p.page)).toEqual(["template", "rocker", "rails", "volume", "fins"]);
    expect(page.pages.map((p) => p.cards.length)).toEqual([22, 14, 17, 8, 23]);
    expect(page.cards).toHaveLength(84);
    expect(page.cards.filter((card) => card.info !== null)).toHaveLength(14);
    expect(page.cards.filter((card) => card.info !== null).every((card) => card.page === "fins")).toBe(true);
  });

  it("holds no non-breaking space anywhere, and no card line holds markup", () => {
    expect(page.raw.includes(" ")).toBe(false);
    for (const card of page.cards) {
      for (const line of [card.is, card.does, card.info, card.how]) {
        if (line === null) continue;
        expect(line, `${card.page} ${card.name}`).toBe(line.trim());
        expect(line.length, `${card.page} ${card.name}`).toBeGreaterThan(0);
        expect(line, `${card.page} ${card.name}`).not.toMatch(/\*\*|<|>/);
      }
    }
  });

  it("gives every card its is, does and how", () => {
    for (const card of page.cards) {
      expect(card.is, card.name).not.toBe("");
      expect(card.does, card.name).not.toBe("");
      expect(card.how, card.name).not.toBe("");
    }
  });
});

describe("VOLUME's words module equals the words page", () => {
  it("card for card, in order: id, group, name, is, does, info and how", () => {
    expect(VOLUME_GUIDE_WORDS.map((card) => [card.id, card.page, card.group, card.name, card.is, card.does, card.info, card.how])).toEqual(
      volume.cards.map((card) => [
        guideCardId("volume", card.group, card.name),
        "volume",
        card.group,
        card.name,
        card.is,
        card.does,
        card.info,
        card.how,
      ]),
    );
  });

  it("its intro, with the Shortboard's name filled in, is the page's intro", () => {
    expect(guideIntro(VOLUME_GUIDE_INTRO, "imperial", { board: "Shortboard" })).toBe(volume.intro);
  });

  it("its two groups and the Inputs qualifier are the page's headings", () => {
    expect(VOLUME_GUIDE_GROUPS).toEqual(volume.groups);
  });

  it("its ids are the builder's eight, in order", () => {
    expect(VOLUME_GUIDE_WORDS.map((card) => card.id)).toEqual(VOLUME_GUIDE_CARD_ORDER);
  });

  it("the Shortboard in Imperial gives exactly the page's tag and caption on every card that shows one", () => {
    const built = buildVolumeGuide(guideVolumeInput("shortboard"), "imperial");
    let tags = 0;
    let captions = 0;
    for (const card of volume.cards) {
      const model = built.get(guideCardId("volume", card.group, card.name))!;
      if (card.tag !== null) {
        expect(model.tag.text, `${card.name} tag`).toBe(card.tag);
        tags++;
      } else {
        expect(model.tag.kind, `${card.name} tag`).toBe("none");
      }
      expect(guideCaptionText(model.caption), `${card.name} caption`).toBe(card.caption ?? "");
      if (card.caption !== null) captions++;
    }
    expect(tags).toBe(8);
    expect(captions).toBe(3);
  });
});
