import { describe, expect, it } from "vitest";
import { guideRailsInput } from "@/lib/geometry/__fixtures__/guide-rails-input";
import { guideCaptionText, guideCardId } from "@/lib/geometry/guide-card";
import { buildRailsGuide, RAILS_GUIDE_CARD_ORDER } from "@/lib/geometry/guide-rails";
import { guideIntro } from "../guide-copy";
import { readGuideWordsPage } from "./read-words-page";
import { RAILS_GUIDE_GROUPS, RAILS_GUIDE_INTRO, RAILS_GUIDE_WORDS } from "./rails";

/**
 * RAILS' words are the founder's, line for line (Phase 18, D-09, R6): the module the page reads is held to
 * `18-GUIDE-WORDS.md` by exact string equality, card by card in order. RAILS is the page's third section, read by
 * order as `volume.test.ts` reads VOLUME.
 */

const page = readGuideWordsPage();
const rails = page.pages[2];

describe("RAILS' words module equals the words page", () => {
  it("is the page's third section: RAILS, with its seventeen cards", () => {
    expect(rails.page).toBe("rails");
    expect(rails.cards).toHaveLength(17);
  });

  it("card for card, in order: id, group, name, is, does, info and how", () => {
    expect(RAILS_GUIDE_WORDS.map((card) => [card.id, card.page, card.group, card.name, card.is, card.does, card.info, card.how])).toEqual(
      rails.cards.map((card) => [guideCardId("rails", card.group, card.name), "rails", card.group, card.name, card.is, card.does, card.info, card.how]),
    );
  });

  it("its intro, with the Shortboard's name filled in, is the page's intro", () => {
    expect(guideIntro(RAILS_GUIDE_INTRO, "imperial", { board: "Shortboard" })).toBe(rails.intro);
  });

  it("its three groups and their qualifiers are the page's headings", () => {
    expect(RAILS_GUIDE_GROUPS).toEqual(rails.groups);
  });

  it("its ids are the builder's seventeen, in order", () => {
    expect(RAILS_GUIDE_WORDS.map((card) => card.id)).toEqual(RAILS_GUIDE_CARD_ORDER);
  });

  it("the Shortboard in Imperial gives exactly the page's tag and caption on every card", () => {
    const built = buildRailsGuide(guideRailsInput("shortboard"), "imperial");
    let tags = 0;
    let captions = 0;
    for (const card of rails.cards) {
      const id = guideCardId("rails", card.group, card.name);
      const model = built.get(id)!;
      if (card.tag !== null) {
        expect(model.tag.text, `${card.name} tag`).toBe(card.tag);
        tags++;
      } else {
        expect(model.tag.kind, `${card.name} tag`).toBe("none");
      }
      expect(guideCaptionText(model.caption), `${card.name} caption`).toBe(card.caption ?? "");
      if (card.caption !== null) captions++;
    }
    expect(tags).toBe(14);
    expect(captions).toBe(16);
  });
});
