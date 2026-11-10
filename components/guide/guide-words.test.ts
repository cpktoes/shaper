import { describe, expect, it } from "vitest";
import { GUIDE_PAGES, guideCardId, guideSlug } from "@/lib/geometry/guide-card";
import { guideIntro, guideLines } from "./guide-copy";
import { GUIDE_GROUPS, GUIDE_PAGE_WORDS, GUIDE_WORDS, guidePageWords } from "./guide-words";
import { GUIDE_IMPERIAL_FIGURE, guideImperialFigures } from "./words/metric-sayings";
import { readGuideWordsPage } from "./words/read-words-page";

/**
 * All five GUIDEs' words together (Phase 18, R13): the aggregate is the founder's words page, page by page
 * in the app's order and card by card in the page's, and every one of the 84 cards reads clean in Metric.
 * Each page's own words test already holds its module to its section line for line; this one proves the
 * five laid side by side are the whole page, in order, with nothing missing, doubled or out of place.
 */

const page = readGuideWordsPage();

describe("GUIDE_WORDS — the 84 cards in the founder's order", () => {
  it("is the five pages in the app's order: 22, 14, 17, 8 and 23 cards, 84 in all", () => {
    expect(GUIDE_PAGE_WORDS.map((p) => p.page)).toEqual([...GUIDE_PAGES]);
    expect(GUIDE_PAGES).toEqual(["template", "rocker", "rails", "volume", "fins"]);
    expect(GUIDE_PAGE_WORDS.map((p) => p.cards.length)).toEqual([22, 14, 17, 8, 23]);
    expect(GUIDE_WORDS.length).toBe(84);
    for (const p of GUIDE_PAGE_WORDS) expect(guidePageWords(p.page)).toBe(p);
  });

  it("carries every card's page as the page it sits under, and no id twice", () => {
    for (const p of GUIDE_PAGE_WORDS) for (const card of p.cards) expect(card.page, card.id).toBe(p.page);
    expect(new Set(GUIDE_WORDS.map((card) => card.id)).size).toBe(84);
    for (const card of GUIDE_WORDS) expect(card.id).toBe(guideCardId(card.page, card.group, card.name));
  });

  it("equals the words page card for card, in order, across all five pages", () => {
    expect(page.pages.map((p) => p.page)).toEqual([...GUIDE_PAGES]);
    expect(GUIDE_WORDS.map((c) => [c.page, c.group, c.name, c.is, c.does, c.info, c.how])).toEqual(
      page.pages.flatMap((p) => p.cards.map((c) => [p.page, c.group, c.name, c.is, c.does, c.info, c.how])),
    );
  });

  it("lists every page's groups in the page's order, with each card under a group its page names, groups never interleaved", () => {
    expect(GUIDE_GROUPS.map((g) => [g.page, g.name, g.note])).toEqual(
      page.pages.flatMap((p) => p.groups.map((g) => [p.page, g.name, g.note])),
    );
    for (const p of GUIDE_PAGE_WORDS) {
      const names = p.groups.map((g) => g.name);
      // The cards run group by group: once a group's cards end, that group never comes back.
      const runs = p.cards.map((card) => card.group).filter((group, i, all) => i === 0 || all[i - 1] !== group);
      expect(runs, p.page).toEqual(names);
      expect(new Set(names.map(guideSlug)).size, p.page).toBe(names.length);
    }
  });

  it("gives every card its is, does and how, and exactly fourteen Model info notes, all on FINS", () => {
    for (const card of GUIDE_WORDS) {
      for (const line of [card.is, card.does, card.how]) expect(line.trim().length, card.id).toBeGreaterThan(0);
      if (card.info !== null) expect(card.info.trim().length, card.id).toBeGreaterThan(0);
    }
    const info = GUIDE_WORDS.filter((card) => card.info !== null);
    expect(info).toHaveLength(14);
    expect(info.every((card) => card.page === "fins")).toBe(true);
  });
});

describe("GUIDE_WORDS in each system", () => {
  it("reads every Imperial line exactly as the words page writes it", () => {
    const pageCards = page.pages.flatMap((p) => p.cards);
    GUIDE_WORDS.forEach((card, i) => {
      const p = pageCards[i];
      expect(guideLines(card, "imperial"), card.id).toEqual({ is: p.is, does: p.does, info: p.info, how: p.how });
    });
  });

  it("finds no inch or foot figure in any Metric line of the 84 cards", () => {
    for (const card of GUIDE_WORDS) {
      const lines = guideLines(card, "metric");
      for (const field of ["is", "does", "info", "how"] as const) {
        const text = lines[field];
        if (text === null) continue;
        expect(GUIDE_IMPERIAL_FIGURE.test(text), `${card.id} ${field}: ${text}`).toBe(false);
        expect(guideImperialFigures(text), `${card.id} ${field}`).toEqual([]);
      }
    }
  });

  it("finds no inch or foot figure in any page's Metric intro, the blank's own name aside", () => {
    // ROCKER's intro names the board's blank, which keeps its maker's inch name in Metric (CLAUDE.md Rule 2).
    const blank = `US Blanks 6'3"RP`;
    for (const p of GUIDE_PAGE_WORDS) {
      const text = guideIntro(p.intro, "metric", { board: "Shortboard", blank }, p.page);
      expect(guideImperialFigures(text, [blank]), `${p.page} intro: ${text}`).toEqual([]);
    }
  });

  it("finds no inch or foot figure in any group heading or its qualifier", () => {
    for (const group of GUIDE_GROUPS) {
      expect(guideImperialFigures(`${group.name} ${group.note ?? ""}`), `${group.page} ${group.name}`).toEqual([]);
    }
  });
});
