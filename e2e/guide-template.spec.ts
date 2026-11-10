import { expect, test, type Page } from "@playwright/test";
import { GUIDE_COPY } from "../components/guide/guide-copy";
import { TEMPLATE_GUIDE_GROUPS, TEMPLATE_GUIDE_WORDS } from "../components/guide/words/template";
import { guideTemplateInput } from "../lib/geometry/__fixtures__/guide-template-input";
import { guideSlug } from "../lib/geometry/guide-card";
import { buildTemplateGuide, TEMPLATE_GUIDE_CARD_IDS } from "../lib/geometry/guide-outline";
import { formatDim, formatLength } from "../lib/geometry/measure-display";
import { BOARD_PRESETS } from "../lib/geometry/presets";
import { forgetOpenBoardOnEveryLoad } from "./helpers/open-board";
import {
  columnsAcross,
  dismissStrips,
  guide,
  guideCard,
  guideCards,
  openGuide,
  openPreset,
  readGuideCards,
  setMetricUnits,
} from "./helpers/guide";

/**
 * TEMPLATE's GUIDE tab (Phase 18, plan 18-03): VIEWER · ADD WINGS · GUIDE, and 22 cards about the page's
 * controls and the WINGS tab's, each drawn from the board that is open.
 *
 * Every word is read from the module the page itself reads (`components/guide/words/template.ts`, held to
 * the founder's words page by a unit test), and every tag from the builder the page itself calls, worked out
 * from the preset's board — never typed here.
 */

const COUNT = TEMPLATE_GUIDE_WORDS.length;
const ids = TEMPLATE_GUIDE_CARD_IDS;
const tagOf = (page: Page, id: string) => guideCard(page, id).locator("[data-guide-tag]");

test.describe("TEMPLATE's GUIDE on a computer (18-03)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the computer's GUIDE; the phones' is the next block");
    await dismissStrips(page);
    await forgetOpenBoardOnEveryLoad(page);
  });

  test("the strip reads VIEWER · ADD WINGS · GUIDE, and GUIDE opens 22 cards in five groups, each with its drawing", async ({ page }) => {
    test.setTimeout(240_000);
    await openPreset(page, "shortboard", "TEMPLATE");
    const tabs = page.getByRole("tablist").getByRole("tab");
    await expect(tabs).toHaveText(["VIEWER", "ADD WINGS", GUIDE_COPY.tab]);

    await openGuide(page, COUNT);
    await expect(guide(page)).toHaveAttribute("aria-label", GUIDE_COPY.regionLabel("template"));
    await expect(guide(page).locator("[data-guide-group]")).toHaveCount(TEMPLATE_GUIDE_GROUPS.length);
    expect(await guide(page).locator("[data-guide-group]").evaluateAll((els) => els.map((el) => el.getAttribute("data-guide-group")))).toEqual(
      TEMPLATE_GUIDE_GROUPS.map((group) => guideSlug(group.name)),
    );
    for (const group of TEMPLATE_GUIDE_GROUPS) {
      const inGroup = guide(page).locator(`[data-guide-group="${guideSlug(group.name)}"]`);
      const expected = TEMPLATE_GUIDE_WORDS.filter((card) => card.group === group.name);
      await expect(inGroup.getByRole("listitem")).toHaveCount(expected.length);
      await expect(inGroup.getByRole("heading", { level: 4 })).toHaveText(expected.map((card) => card.name));
    }
    for (const card of TEMPLATE_GUIDE_WORDS) await expect(guideCard(page, card.id).locator("svg[data-guide-cartoon]")).toHaveCount(1);
    await expect(guideCards(page).locator("[data-guide-text]")).toHaveText(TEMPLATE_GUIDE_WORDS.map((card) => `${card.is} ${card.does}`));
    await expect(guideCards(page).locator("[data-guide-how]")).toHaveText(
      TEMPLATE_GUIDE_WORDS.map((card) => `${GUIDE_COPY.howToShape}${card.how}`),
    );

    // TEMPLATE's two Fullness and two Depth cards are four cards with four ids (D-27).
    const repeated = TEMPLATE_GUIDE_WORDS.filter((card) => card.name === "Fullness" || card.name === "Depth");
    for (const card of repeated) await expect(guideCard(page, card.id)).toHaveCount(1);
    expect(new Set(repeated.map((card) => card.id)).size).toBe(4);

    // The sidebar is still the outline's own controls while GUIDE is open.
    await expect(page.locator("aside").getByText("Template Builder")).toBeVisible();
  });

  test("the Shortboard's tags, and its Depth saying it is a diamond's or a swallow's alone", async ({ page }) => {
    test.setTimeout(240_000);
    await openPreset(page, "shortboard", "TEMPLATE");
    await openGuide(page, COUNT);
    const built = buildTemplateGuide(guideTemplateInput("shortboard"), "imperial");
    for (const card of built.values()) {
      if (card.tag.kind === "none") await expect(guideCard(page, card.id).locator("[data-guide-tag]"), card.id).toHaveCount(0);
      else await expect(tagOf(page, card.id), card.id).toHaveText(card.tag.text, { ignoreCase: true });
    }
    await expect(tagOf(page, ids.squash)).toHaveAttribute("data-guide-tag", "on");
    await expect(guideCard(page, ids.squash)).toHaveAttribute("data-guide-on", "true");
    await expect(tagOf(page, ids.tailDepth)).toHaveAttribute("data-guide-tag", "na");
    // The note sits inside the Depth drawing; the board is drawn as a swallow in the push's dashes.
    const depth = guideCard(page, ids.tailDepth);
    await expect(depth.locator("svg text").filter({ hasText: "no depth on a squash tail" })).toHaveCount(1);
    await expect(depth.locator('path[stroke="var(--outline-push-line)"]')).toHaveCount(1);
    await expect(depth.locator("[data-guide-caption]")).toHaveText(/as a swallow, 3" deep/i);
  });

  test("the Fish: Swallow is on this board, and Depth reads its own crotch depth", async ({ page }) => {
    test.setTimeout(240_000);
    await openPreset(page, "fish", "TEMPLATE");
    await openGuide(page, COUNT);
    const built = buildTemplateGuide(guideTemplateInput("fish"), "imperial");
    await expect(tagOf(page, ids.swallow)).toHaveAttribute("data-guide-tag", "on");
    await expect(tagOf(page, ids.tailDepth)).toHaveAttribute("data-guide-tag", "value");
    await expect(tagOf(page, ids.tailDepth)).toHaveText(built.get(ids.tailDepth)!.tag.text);
    await expect(guideCard(page, ids.tailDepth).locator("svg text").filter({ hasText: "no depth" })).toHaveCount(0);
  });

  test("a Metric shaper reads Board Length and Width in centimetres, and no inch mark on any card", async ({ page }) => {
    test.setTimeout(240_000);
    await setMetricUnits(page);
    await openPreset(page, "shortboard", "TEMPLATE");
    await openGuide(page, COUNT);
    const shortboard = BOARD_PRESETS.find((preset) => preset.id === "shortboard")!;
    await expect(tagOf(page, ids.boardLength)).toHaveText(formatLength(shortboard.outline.length, "metric"));
    await expect(tagOf(page, ids.width)).toHaveText(formatDim(shortboard.outline.widePointWidth, "metric"));
    // Names, tags, captions and drawing labels: no inch or foot mark (the cards' sentences are 18-07's).
    const figures = await guide(page)
      .locator("[data-guide-tag], [data-guide-caption], svg text")
      .evaluateAll((els) => els.map((el) => el.textContent ?? ""));
    for (const text of figures) expect(text).not.toMatch(/\d\s*["″]|\d'/);
  });

  test("where the cards are narrowest, Diamond & swallow only wraps under the name with nothing cut off", async ({ page }) => {
    test.setTimeout(240_000);
    await openPreset(page, "shortboard", "TEMPLATE");
    await openGuide(page, COUNT);
    // The grid's narrowest cards: step the window until the three-across cards measure 236-245 dots.
    let width = 0;
    let cardWidth = 0;
    for (let w = 1180; w <= 1240; w += 5) {
      await page.setViewportSize({ width: w, height: 800 });
      const across = await columnsAcross(page, guideSlug(TEMPLATE_GUIDE_GROUPS[3].name));
      if (across.columns === 3 && across.cardWidth >= 236 && across.cardWidth <= 245) {
        width = w;
        cardWidth = across.cardWidth;
        break;
      }
    }
    test.info().annotations.push({ type: "narrowest", description: `${width} wide, cards ${cardWidth}` });
    expect(width, "a width between 1180 and 1240 where the cards are 236-245 dots").toBeGreaterThan(0);

    const card = guideCard(page, ids.tailDepth);
    await card.scrollIntoViewIfNeeded();
    const m = await card.evaluate((el) => {
      const tag = el.querySelector<HTMLElement>("[data-guide-tag]")!;
      const name = el.querySelector("h4")!.getBoundingClientRect();
      const t = tag.getBoundingClientRect();
      const box = el.getBoundingClientRect();
      const line = parseFloat(getComputedStyle(tag).lineHeight) || 15;
      return {
        width: Math.round(t.width),
        room: Math.round(box.width - parseFloat(getComputedStyle(el).paddingLeft) - parseFloat(getComputedStyle(el).paddingRight)),
        lines: Math.round(t.height / line),
        clipped: tag.scrollWidth > tag.clientWidth + 1 || tag.scrollHeight > tag.clientHeight + 1,
        inside: t.left >= box.left - 0.5 && t.right <= box.right + 0.5,
        under: t.top >= name.bottom - 0.5,
        textAlign: getComputedStyle(tag).textAlign,
      };
    });
    test.info().annotations.push({ type: "depth tag", description: JSON.stringify(m) });
    // The words drop under the name, right-aligned, and wrap within the card if they must: never cut off,
    // never more than two lines. (Measured at 1200 wide: the tag needs fewer dots than the card has, so it
    // sits on the one line under the name.)
    expect(m.lines).toBeGreaterThanOrEqual(1);
    expect(m.lines).toBeLessThanOrEqual(2);
    expect(m.width).toBeLessThanOrEqual(m.room);
    expect(m.clipped).toBe(false);
    expect(m.inside).toBe(true);
    expect(m.under).toBe(true);
    expect(m.textAlign).toBe("right");
    const read = await readGuideCards(page);
    for (const c of read) {
      expect(c.clipped, `${c.card}: text cut off`).toEqual([]);
      expect(c.outside, `${c.card}: a part outside the card`).toEqual([]);
      expect(c.nameMeetsTag, `${c.card}: the name runs into its tag`).toBe(false);
    }
  });
});

/**
 * On a phone (D-15): TEMPLATE already pins its drawing area at two thirds of the screen; with GUIDE open the
 * cards scroll inside it, one across, and the page never scrolls. The board's name keeps its room in the
 * strip beside the three tabs.
 */
test.describe("TEMPLATE's GUIDE on a phone (18-03)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "the phones' GUIDE; the computer's is the block above");
    await dismissStrips(page);
    await forgetOpenBoardOnEveryLoad(page);
  });

  test("upright: one card across, the page never scrolls, and every note can be scrolled into view", async ({ page }, testInfo) => {
    test.setTimeout(240_000);
    const upright = testInfo.project.name === "android" ? { width: 412, height: 915 } : { width: 390, height: 844 };
    await page.setViewportSize(upright);
    await openPreset(page, "shortboard", "TEMPLATE");
    await openGuide(page, COUNT);

    expect((await columnsAcross(page, guideSlug(TEMPLATE_GUIDE_GROUPS[3].name))).columns).toBe(1);
    for (const card of await readGuideCards(page)) {
      expect(card.clipped, `${card.card}: text cut off`).toEqual([]);
      expect(card.outside, `${card.card}: a part outside the card`).toEqual([]);
      expect(card.nameMeetsTag, `${card.card}: the name runs into its tag`).toBe(false);
    }
    const measure = () =>
      page.evaluate(() => ({
        innerHeight: window.innerHeight,
        innerWidth: window.innerWidth,
        scrollHeight: document.documentElement.scrollHeight,
        scrollWidth: document.documentElement.scrollWidth,
        main: document.querySelector("main")!.getBoundingClientRect().height,
      }));
    const pinned = await measure();
    test.info().annotations.push({ type: "pinned", description: JSON.stringify(pinned) });
    expect(pinned.scrollHeight).toBe(pinned.innerHeight);
    expect(pinned.scrollWidth).toBeLessThanOrEqual(pinned.innerWidth);
    expect(pinned.main).toBeLessThanOrEqual(0.66 * pinned.innerHeight + 1);

    for (const id of [ids.boardLength, ids.tailDepth, ids.wingLock]) {
      const note = guideCard(page, id).locator("[data-guide-how]");
      await note.scrollIntoViewIfNeeded();
      await expect(note, `${id}: the note is not wholly in view`).toBeInViewport({ ratio: 0.99 });
    }
    expect((await measure()).scrollHeight).toBe(pinned.innerHeight);
  });

  test("at 360 wide the board's name stays whole in the strip beside VIEWER · ADD WINGS · GUIDE", async ({ page }) => {
    test.setTimeout(240_000);
    await page.setViewportSize({ width: 360, height: 780 });
    await openPreset(page, "shortboard", "TEMPLATE");
    await openGuide(page, COUNT);
    const name = page.locator("[data-board-name-band]").filter({ visible: true });
    await expect(name).toHaveCount(1);
    const m = await name.evaluate((button) => {
      const text = button.querySelector<HTMLElement>("span.truncate")!;
      const tabs = [...document.querySelectorAll<HTMLElement>('[role="tab"]')].filter((tab) => tab.getClientRects().length > 0);
      const last = tabs[tabs.length - 1].getBoundingClientRect();
      return {
        whole: text.scrollWidth <= text.clientWidth,
        clearOfTabs: button.getBoundingClientRect().left >= last.right - 0.5,
        words: tabs.map((tab) => tab.innerText.trim()),
        pageScrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      };
    });
    test.info().annotations.push({ type: "name at 360", description: JSON.stringify(m) });
    expect(m.words).toEqual(["VIEWER", "ADD WINGS", GUIDE_COPY.tab]);
    expect(m.whole).toBe(true);
    expect(m.clearOfTabs).toBe(true);
    expect(m.pageScrollWidth).toBeLessThanOrEqual(m.innerWidth);
  });
});
