import { describe, expect, it } from "vitest";
import { guideTemplateInput } from "@/lib/geometry/__fixtures__/guide-template-input";
import { guideCaptionText, guideCardId } from "@/lib/geometry/guide-card";
import { buildTemplateGuide, TEMPLATE_GUIDE_CARD_ORDER } from "@/lib/geometry/guide-outline";
import { guideIntro } from "../guide-copy";
import { readGuideWordsPage } from "./read-words-page";
import { TEMPLATE_GUIDE_GROUPS, TEMPLATE_GUIDE_INTRO, TEMPLATE_GUIDE_WORDS } from "./template";

/**
 * TEMPLATE's words are the founder's, line for line (Phase 18, D-09, R6): the module the page reads is held
 * to `18-GUIDE-WORDS.md` by exact string equality, card by card in order. TEMPLATE's two Fullness and two
 * Depth cards are told apart by their group (D-27).
 */

const template = readGuideWordsPage().pages.find((p) => p.page === "template")!;

describe("TEMPLATE's words module equals the words page", () => {
  it("card for card, in order: id, group, name, is, does, info and how", () => {
    expect(
      TEMPLATE_GUIDE_WORDS.map((card) => [card.id, card.page, card.group, card.name, card.is, card.does, card.info, card.how]),
    ).toEqual(
      template.cards.map((card) => [
        guideCardId("template", card.group, card.name),
        "template",
        card.group,
        card.name,
        card.is,
        card.does,
        card.info,
        card.how,
      ]),
    );
    expect(TEMPLATE_GUIDE_WORDS).toHaveLength(22);
  });

  it("its intro, with the Shortboard's name filled in, is the page's intro", () => {
    expect(guideIntro(TEMPLATE_GUIDE_INTRO, "imperial", { board: "Shortboard" })).toBe(template.intro);
  });

  it("its five groups and the Wings qualifier are the page's headings", () => {
    expect(TEMPLATE_GUIDE_GROUPS).toEqual(template.groups);
    expect(TEMPLATE_GUIDE_GROUPS.map((group) => group.name)).toEqual([
      ...new Set(TEMPLATE_GUIDE_WORDS.map((card) => card.group)),
    ]);
  });

  it("its ids are the builder's 22, in order, with four distinct ids for the two Fullness and two Depth cards", () => {
    expect(TEMPLATE_GUIDE_WORDS.map((card) => card.id)).toEqual(TEMPLATE_GUIDE_CARD_ORDER);
    const repeated = TEMPLATE_GUIDE_WORDS.filter((card) => card.name === "Fullness" || card.name === "Depth");
    expect(repeated).toHaveLength(4);
    expect(new Set(repeated.map((card) => card.id)).size).toBe(4);
  });

  it("the Shortboard in Imperial gives exactly the page's tag and caption on every card that shows one", () => {
    const built = buildTemplateGuide(guideTemplateInput("shortboard"), "imperial");
    let tags = 0;
    let captions = 0;
    for (const card of template.cards) {
      const model = built.get(guideCardId("template", card.group, card.name))!;
      if (card.tag !== null) {
        expect(model.tag.text, `${card.group} ${card.name} tag`).toBe(card.tag);
        tags++;
      } else {
        expect(model.tag.kind, `${card.group} ${card.name} tag`).toBe("none");
      }
      expect(guideCaptionText(model.caption), `${card.group} ${card.name} caption`).toBe(card.caption ?? "");
      if (card.caption !== null) captions++;
    }
    expect(tags).toBe(18);
    expect(captions).toBe(17);
  });

  it("the Depth card's words say it belongs to a diamond or a swallow alone (D-11)", () => {
    const depth = TEMPLATE_GUIDE_WORDS.find((card) => card.group === "Tail Controls" && card.name === "Depth")!;
    expect(depth.is).toMatch(/^Only a diamond or swallow tail has a depth/);
    expect(depth.does).toMatch(/On a pin, round or squash tail the slider is greyed out/);
  });
});
