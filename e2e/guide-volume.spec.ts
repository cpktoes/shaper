import { expect, test } from "@playwright/test";
import { GUIDE_COPY } from "../components/guide/guide-copy";
import { VOLUME_GUIDE_GROUPS, VOLUME_GUIDE_WORDS } from "../components/guide/words/volume";
import { guideSlug } from "../lib/geometry/guide-card";
import { VOLUME_GUIDE_CARD_IDS } from "../lib/geometry/guide-volume";
import { formatLength } from "../lib/geometry/measure-display";
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
 * VOLUME's GUIDE tab (Phase 18, plan 18-01 — the tracer): ESTIMATE · GUIDE, and eight cards about the page's
 * controls and the figures its ESTIMATE card reads, each drawn from the board that is open.
 *
 * Every word is read from the module the page itself reads (`components/guide/words/volume.ts`, held to the
 * founder's words page by a unit test), never typed here.
 */

const COUNT = VOLUME_GUIDE_WORDS.length;

test.describe("VOLUME's GUIDE on a computer (18-01)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the computer's GUIDE; the phones' is the next block");
    await dismissStrips(page);
    await forgetOpenBoardOnEveryLoad(page);
  });

  test("the strip reads ESTIMATE · GUIDE, and GUIDE opens eight cards in two groups, each with its drawing", async ({ page }) => {
    test.setTimeout(240_000);
    await openPreset(page, "shortboard", "VOLUME");
    const tabs = page.getByRole("tablist").getByRole("tab");
    await expect(tabs).toHaveText(["ESTIMATE", GUIDE_COPY.tab]);

    await openGuide(page, COUNT);
    await expect(guide(page)).toHaveAttribute("aria-label", GUIDE_COPY.regionLabel("volume"));
    await expect(guide(page).locator("[data-guide-group]")).toHaveCount(VOLUME_GUIDE_GROUPS.length);
    for (const group of VOLUME_GUIDE_GROUPS) {
      const inGroup = guide(page).locator(`[data-guide-group="${guideSlug(group.name)}"]`);
      const expected = VOLUME_GUIDE_WORDS.filter((card) => card.group === group.name);
      await expect(inGroup.getByRole("listitem")).toHaveCount(expected.length);
      await expect(inGroup.getByRole("heading", { level: 4 })).toHaveText(expected.map((card) => card.name));
    }
    // A drawing on every card, hidden from a screen reader (the words say it).
    const art = guideCards(page).locator("svg[data-guide-cartoon]");
    await expect(art).toHaveCount(COUNT);
    for (const card of VOLUME_GUIDE_WORDS) await expect(guideCard(page, card.id).locator("svg[data-guide-cartoon]")).toHaveCount(1);
    expect(new Set(await art.evaluateAll((els) => els.map((el) => el.getAttribute("aria-hidden"))))).toEqual(new Set(["true"]));

    // Board Length's push is drawn in the push's own muted dashes.
    const pushed = guideCard(page, VOLUME_GUIDE_CARD_IDS.boardLength).locator('path[stroke="var(--outline-push-line)"]');
    await expect(pushed).toHaveCount(1);
    expect(await pushed.evaluate((el) => getComputedStyle(el).stroke)).not.toBe("none");

    // The words are the module's, in order.
    await expect(guideCards(page).locator("[data-guide-text]")).toHaveText(VOLUME_GUIDE_WORDS.map((card) => `${card.is} ${card.does}`));
    await expect(guideCards(page).locator("[data-guide-how]")).toHaveText(
      VOLUME_GUIDE_WORDS.map((card) => `${GUIDE_COPY.howToShape}${card.how}`),
    );
  });

  test("a card is never a control: nothing on it can be pressed, and pressing it changes nothing", async ({ page }) => {
    test.setTimeout(240_000);
    await openPreset(page, "shortboard", "VOLUME");
    await openGuide(page, COUNT);

    await expect(guideCards(page).locator('button, a, input, select, [role="button"], [tabindex]')).toHaveCount(0);
    const tags = () => guideCards(page).locator("[data-guide-tag]").allInnerTexts();
    const before = await tags();
    const estimate = guideCard(page, VOLUME_GUIDE_CARD_IDS.estimatedVolume).locator("[data-guide-tag]");
    const quoted = await estimate.innerText();
    for (const card of VOLUME_GUIDE_WORDS) {
      await guideCard(page, card.id).click();
      await guideCard(page, card.id).locator("svg").click();
    }
    expect(await tags()).toEqual(before);
    await expect(page.getByRole("checkbox", { name: "Import Designed Board" })).toBeChecked();

    // ESTIMATE reads as it always has, quoting the very litres the GUIDE's tag shows.
    await page.getByRole("tab", { name: "ESTIMATE", exact: true }).click();
    await expect(guide(page)).toHaveCount(0);
    await expect(page.locator("main")).toContainText(quoted);
  });

  test("a Metric shaper reads Board Length in centimetres, its push a whole centimetre, and no inch mark on any card", async ({
    page,
  }) => {
    test.setTimeout(240_000);
    await setMetricUnits(page);
    await openPreset(page, "shortboard", "VOLUME");
    await openGuide(page, COUNT);
    const shortboard = BOARD_PRESETS.find((preset) => preset.id === "shortboard")!;
    const length = guideCard(page, VOLUME_GUIDE_CARD_IDS.boardLength);
    await expect(length.locator("[data-guide-tag]")).toHaveText(formatLength(shortboard.outline.length, "metric"));
    expect(await length.locator("[data-guide-caption]").innerText()).toMatch(/^DASHED · \d+\.[05] cm → \d+\.\d L QUICK ESTIMATE$/);
    expect(await guide(page).innerText()).not.toMatch(/\d\s*["″]|\d'/);
  });
});

/**
 * On a phone (D-15, D-28): the GUIDE pins the drawing area at two thirds of the screen and its cards scroll
 * inside it — the page itself never scrolls — and leaving GUIDE for ESTIMATE gives back the one scrolling
 * column ESTIMATE has always had. Held sideways, a phone gets the desktop shell by width alone, and on that
 * short screen the drawing column is the one scroller.
 */
test.describe("VOLUME's GUIDE on a phone (18-01)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "the phones' GUIDE; the computer's is the block above");
    await dismissStrips(page);
    await forgetOpenBoardOnEveryLoad(page);
  });

  test("upright: one card across, the page never scrolls, the pinned area holds 66dvh", async ({ page }, testInfo) => {
    test.setTimeout(240_000);
    const upright = testInfo.project.name === "android" ? { width: 412, height: 915 } : { width: 390, height: 844 };
    await page.setViewportSize(upright);
    await openPreset(page, "shortboard", "VOLUME");
    await openGuide(page, COUNT);

    expect((await columnsAcross(page, guideSlug(VOLUME_GUIDE_GROUPS[0].name))).columns).toBe(1);
    const read = await readGuideCards(page);
    for (const card of read) {
      expect(card.clipped, `${card.card}: text cut off`).toEqual([]);
      expect(card.outside, `${card.card}: a part outside the card`).toEqual([]);
      expect(card.nameMeetsTag, `${card.card}: the name runs into its tag`).toBe(false);
      expect(card.width, card.card).toBeGreaterThanOrEqual(236);
    }

    const measure = () =>
      page.evaluate(() => {
        const main = document.querySelector("main")!.getBoundingClientRect();
        const panel = document.querySelector("[data-viewer-panel]")!.getBoundingClientRect();
        return {
          innerHeight: window.innerHeight,
          innerWidth: window.innerWidth,
          scrollHeight: document.documentElement.scrollHeight,
          scrollWidth: document.documentElement.scrollWidth,
          main: main.height,
          panel: panel.height,
          pageScroller: document.querySelector("[data-design-page-scroll]") !== null,
        };
      });
    const pinned = await measure();
    test.info().annotations.push({ type: "pinned", description: JSON.stringify(pinned) });
    expect(pinned.scrollHeight).toBe(pinned.innerHeight);
    expect(pinned.scrollWidth).toBeLessThanOrEqual(pinned.innerWidth);
    expect(pinned.main).toBeLessThanOrEqual(0.66 * pinned.innerHeight + 1);
    expect(pinned.panel).toBeGreaterThanOrEqual(0.66 * pinned.innerHeight - 41);
    expect(pinned.pageScroller).toBe(false);

    // Every note can be brought into view by scrolling the cards alone.
    for (const card of VOLUME_GUIDE_WORDS) {
      const note = guideCard(page, card.id).locator("[data-guide-how]");
      await note.scrollIntoViewIfNeeded();
      await expect(note, `${card.name}: the note is not wholly in view`).toBeInViewport({ ratio: 0.99 });
    }
    expect((await measure()).scrollHeight).toBe(pinned.innerHeight);

    // Back to ESTIMATE: the one scrolling column it has always had.
    await page.getByRole("tab", { name: "ESTIMATE", exact: true }).click();
    await expect(guide(page)).toHaveCount(0);
    const unpinned = await measure();
    expect(unpinned.pageScroller).toBe(true);
    expect(unpinned.main).toBeGreaterThan(0);
  });

  test("held sideways: the desktop shell, and the drawing column scrolls the cards", async ({ page }, testInfo) => {
    test.setTimeout(240_000);
    const sideways = testInfo.project.name === "android" ? { width: 863, height: 360 } : { width: 844, height: 390 };
    await page.setViewportSize(sideways);
    await openPreset(page, "shortboard", "VOLUME");
    await openGuide(page, COUNT);

    const read = await readGuideCards(page);
    for (const card of read) {
      expect(card.clipped, `${card.card}: text cut off`).toEqual([]);
      expect(card.outside, `${card.card}: a part outside the card`).toEqual([]);
      expect(card.width, card.card).toBeGreaterThanOrEqual(236);
    }
    // The desktop shell: the sidebar beside the drawing column, not under it.
    const side = await page.evaluate(() => {
      const aside = document.querySelector("aside")!.getBoundingClientRect();
      const main = document.querySelector("main")!.getBoundingClientRect();
      return { besides: aside.right <= main.left + 1, scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth };
    });
    expect(side.besides).toBe(true);
    expect(side.scrollWidth).toBeLessThanOrEqual(side.innerWidth);
    // The column scrolls (on a short screen the folder grows with its cards), and the last note is reachable.
    const last = guideCard(page, VOLUME_GUIDE_WORDS[COUNT - 1].id).locator("[data-guide-how]");
    await last.scrollIntoViewIfNeeded();
    await expect(last).toBeInViewport({ ratio: 0.99 });
  });
});
