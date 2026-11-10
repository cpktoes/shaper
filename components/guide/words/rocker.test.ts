import { describe, expect, it } from "vitest";
import { guideRockerInput } from "@/lib/geometry/__fixtures__/guide-rocker-input";
import { guideCaptionText, guideCardId } from "@/lib/geometry/guide-card";
import { buildRockerGuide, ROCKER_GUIDE_CARD_ORDER } from "@/lib/geometry/guide-rocker";
import { guideIntro } from "../guide-copy";
import { readGuideWordsPage } from "./read-words-page";
import { ROCKER_GUIDE_GROUPS, ROCKER_GUIDE_INTRO, ROCKER_GUIDE_WORDS } from "./rocker";

/**
 * ROCKER's words are the founder's, line for line (Phase 18, D-09, R6): the module the page reads is held to
 * `18-GUIDE-WORDS.md` by exact string equality, card by card in order, and the eleven captions plan 18-02
 * wrote on the page are the ones the builder works out for the Shortboard (D-23).
 */

const rocker = readGuideWordsPage().pages.find((p) => p.page === "rocker")!;

describe("ROCKER's words module equals the words page", () => {
  it("card for card, in order: id, group, name, is, does, info and how", () => {
    expect(ROCKER_GUIDE_WORDS.map((card) => [card.id, card.page, card.group, card.name, card.is, card.does, card.info, card.how])).toEqual(
      rocker.cards.map((card) => [
        guideCardId("rocker", card.group, card.name),
        "rocker",
        card.group,
        card.name,
        card.is,
        card.does,
        card.info,
        card.how,
      ]),
    );
    expect(ROCKER_GUIDE_WORDS).toHaveLength(14);
  });

  it("its intro, with the Shortboard's name and its blank's filled in, is the page's intro", () => {
    expect(guideIntro(ROCKER_GUIDE_INTRO, "imperial", { board: "Shortboard", blank: `US Blanks 6'3"RP` })).toBe(rocker.intro);
  });

  it("its four groups and the Rocker qualifier are the page's headings", () => {
    expect(ROCKER_GUIDE_GROUPS).toEqual(rocker.groups);
    expect(ROCKER_GUIDE_GROUPS.map((g) => g.name)).toEqual(["Inputs", "Blank", "Rocker", "Foil"]);
  });

  it("its ids are the builder's fourteen, in order", () => {
    expect(ROCKER_GUIDE_WORDS.map((card) => card.id)).toEqual(ROCKER_GUIDE_CARD_ORDER);
  });

  it("the Shortboard in Imperial gives exactly the page's tag and every one of its eleven captions", () => {
    const built = buildRockerGuide(guideRockerInput("shortboard"), "imperial");
    let tags = 0;
    let captions = 0;
    for (const card of rocker.cards) {
      const model = built.get(guideCardId("rocker", card.group, card.name))!;
      if (card.tag !== null) {
        expect(model.tag.text, `${card.name} tag`).toBe(card.tag);
        tags++;
      } else {
        expect(model.tag.kind, `${card.name} tag`).toBe("none");
      }
      expect(guideCaptionText(model.caption), `${card.name} caption`).toBe(card.caption ?? "");
      if (card.caption !== null) captions++;
    }
    expect(tags).toBe(13);
    expect(captions).toBe(11);
  });
});
