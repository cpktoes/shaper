import { describe, expect, it } from "vitest";
import { guideRailsInput } from "@/lib/geometry/__fixtures__/guide-rails-input";
import { guideCaptionText, guideCardId } from "@/lib/geometry/guide-card";
import { buildRailsGuide, RAILS_GUIDE_CARD_IDS, RAILS_GUIDE_CARD_ORDER } from "@/lib/geometry/guide-rails";
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

/**
 * The one figure where the app's own maths and the words page differ, and why: the words page was written from
 * the sketch, which took Tail Rail Ends At as L/6 + 18" unrounded (30 5/16" on the Shortboard); RAILS' own
 * reader, `hardEdgeEndsAt`, rounds the default to the slider's 1/2" step (30 1/2"), and the card reads the board
 * as the slider does. The words page is left as the founder wrote it; this is listed for his look.
 */
const APP_READS: Record<string, { tag?: string; caption?: string }> = {
  [RAILS_GUIDE_CARD_IDS.blends]: { tag: '18" · 30 1/2"', caption: 'dashed · 24" · 36 1/2"' },
};

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

  it("the Shortboard in Imperial gives exactly the page's tag and caption on every card, but the one listed", () => {
    const built = buildRailsGuide(guideRailsInput("shortboard"), "imperial");
    let tags = 0;
    let captions = 0;
    for (const card of rails.cards) {
      const id = guideCardId("rails", card.group, card.name);
      const model = built.get(id)!;
      const app = APP_READS[id] ?? {};
      if (card.tag !== null) {
        expect(model.tag.text, `${card.name} tag`).toBe(app.tag ?? card.tag);
        tags++;
      } else {
        expect(model.tag.kind, `${card.name} tag`).toBe("none");
      }
      expect(guideCaptionText(model.caption), `${card.name} caption`).toBe(app.caption ?? card.caption ?? "");
      if (card.caption !== null) captions++;
    }
    expect(tags).toBe(14);
    expect(captions).toBe(16);
  });

  it("lists only a card whose words-page figure truly differs from what the app reads", () => {
    for (const [id, app] of Object.entries(APP_READS)) {
      const words = rails.cards.find((card) => guideCardId("rails", card.group, card.name) === id)!;
      expect(app.tag, id).not.toBe(words.tag);
      expect(app.caption, id).not.toBe(words.caption);
    }
  });
});
