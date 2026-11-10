import { expect, test, type Page } from "@playwright/test";
import { GUIDE_COPY } from "../components/guide/guide-copy";
import { FINS_GUIDE_GROUPS, FINS_GUIDE_WORDS } from "../components/guide/words/fins";
import { guideSlug } from "../lib/geometry/guide-card";
import { FINS_GUIDE_CARD_IDS } from "../lib/geometry/guide-fins";
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
 * FINS' GUIDE tab (Phase 18, plan 18-06): VIEWER · DATA · GUIDE — MODEL INFO is gone, its notes now on the cards —
 * and 23 cards setup by setup, each setup and model drawn on the open board's own tail.
 *
 * Every word is read from the module the page itself reads (`components/guide/words/fins.ts`, held to the founder's
 * words page by a unit test), never typed here.
 */

const COUNT = FINS_GUIDE_WORDS.length;
const ids = FINS_GUIDE_CARD_IDS;
const tagOf = (page: Page, id: string) => guideCard(page, id).locator("[data-guide-tag]");
const captionOf = (page: Page, id: string) => guideCard(page, id).locator("[data-guide-caption]");

/** Every card's fin lines in its tail detail, above or below the stringer: a pair is one each side. */
async function finSides(page: Page) {
  return guideCards(page).evaluateAll((cards) =>
    cards.map((card) => {
      const detail = card.querySelector("svg[data-guide-cartoon] g[clip-path]")!;
      const stringer = detail.querySelector('line[stroke-dasharray="12 3 3 3"]')!;
      const y = Number(stringer.getAttribute("y1"));
      const fins = [...detail.querySelectorAll('line[stroke="var(--color-surf-accent-ink)"]')].map((line) => Number(line.getAttribute("y1")));
      return {
        card: card.getAttribute("data-guide-card"),
        above: fins.filter((v) => v < y - 0.01).length,
        below: fins.filter((v) => v > y + 0.01).length,
        on: fins.filter((v) => Math.abs(v - y) <= 0.01).length,
      };
    }),
  );
}

test.describe("FINS' GUIDE on a computer (18-06)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the computer's GUIDE; the phones' is the next block");
    await dismissStrips(page);
    await forgetOpenBoardOnEveryLoad(page);
  });

  test("the strip reads VIEWER · DATA · GUIDE, no MODEL INFO, and GUIDE opens 23 cards in eight groups", async ({ page }) => {
    test.setTimeout(240_000);
    await openPreset(page, "shortboard", "FINS");
    const tabs = page.getByRole("tablist").getByRole("tab");
    await expect(tabs).toHaveText(["VIEWER", "DATA", GUIDE_COPY.tab]);
    await expect(page.getByRole("tab", { name: "MODEL INFO" })).toHaveCount(0);

    await openGuide(page, COUNT);
    await expect(guide(page)).toHaveAttribute("aria-label", GUIDE_COPY.regionLabel("fins"));
    await expect(guide(page).locator("[data-guide-group]")).toHaveCount(FINS_GUIDE_GROUPS.length);
    const sizes: number[] = [];
    for (const group of FINS_GUIDE_GROUPS) {
      const inGroup = guide(page).locator(`[data-guide-group="${guideSlug(group.name)}"]`);
      const expected = FINS_GUIDE_WORDS.filter((card) => card.group === group.name);
      await expect(inGroup.getByRole("heading", { level: 4 })).toHaveText(expected.map((card) => card.name));
      sizes.push(expected.length);
    }
    expect(sizes).toEqual([1, 1, 1, 4, 5, 1, 6, 4]);
    await expect(guideCards(page).locator("svg[data-guide-cartoon]")).toHaveCount(COUNT);

    // Fourteen Model info notes, each between its card's two sentences and its How to shape.
    const withInfo = FINS_GUIDE_WORDS.filter((card) => card.info !== null);
    expect(withInfo).toHaveLength(14);
    await expect(guideCards(page).locator("[data-guide-info]")).toHaveCount(14);
    for (const card of withInfo) {
      const order = await guideCard(page, card.id).evaluate((el) => {
        const top = (sel: string) => el.querySelector(sel)!.getBoundingClientRect().top;
        return [top("svg"), top("[data-guide-text]"), top("[data-guide-info]"), top("[data-guide-how]")];
      });
      expect([...order].sort((a, b) => a - b), card.name).toEqual(order);
      await expect(guideCard(page, card.id).locator("[data-guide-info]")).toHaveText(`${GUIDE_COPY.modelInfo}${card.info}`);
    }

    // The Shortboard's tags and captions, as the words page shows them.
    await expect(tagOf(page, ids.importDesignedBoard)).toHaveText("On this board");
    await expect(tagOf(page, ids.convention)).toHaveText('to 1/16"');
    await expect(tagOf(page, ids.thruster)).toHaveText("On this board");
    await expect(tagOf(page, ids.thrusterBasic)).toHaveText("On this board");
    await expect(tagOf(page, ids.quadMcKeeLB)).toHaveText(`Needs 8'0"`);
    await expect(captionOf(page, ids.quadMcKeeLB)).toHaveText("drawn as · Quad — McKee SB/Gun");
    await expect(captionOf(page, ids.thrusterBasic)).toHaveText("drawn as · Thruster — Basic (Half Rate)");
    await expect(tagOf(page, ids.finBase)).toHaveText('4 1/2"');
    await expect(captionOf(page, ids.finBase)).toHaveText('dashed · 5 1/2" base');
    await expect(tagOf(page, ids.finForward)).toHaveText('11"');
    await expect(captionOf(page, ids.finForward)).toHaveText('dashed · 1" forward');
    await expect(tagOf(page, ids.finOffRail)).toHaveText('1 3/16"');
    await expect(captionOf(page, ids.finOffRail)).toHaveText('dashed · 7/8" off the rail');
    await expect(tagOf(page, ids.finToe)).toHaveText('1/4"');
    await expect(captionOf(page, ids.finToe)).toHaveText('dashed · 1/2" toe-in');

    // Every pair of fins is one each side of the stringer, on every card.
    for (const card of await finSides(page)) expect(card.above, `${card.card}`).toBe(card.below);
  });

  test("the Fish: On this board on Twin and Modern/Upright", async ({ page }) => {
    test.setTimeout(240_000);
    await openPreset(page, "fish", "FINS");
    await openGuide(page, COUNT);
    await expect(tagOf(page, ids.twin)).toHaveText("On this board");
    await expect(tagOf(page, ids.twinUpright)).toHaveText("On this board");
    await expect(tagOf(page, ids.thruster)).toHaveCount(0);
    for (const card of await finSides(page)) expect(card.above, `${card.card}`).toBe(card.below);
  });

  test("a Metric shaper reads whole millimetres, the Convention to 1 mm, and no inch mark on a tag, caption or drawing", async ({
    page,
  }) => {
    test.setTimeout(240_000);
    await setMetricUnits(page);
    await openPreset(page, "shortboard", "FINS");
    await openGuide(page, COUNT);
    await expect(tagOf(page, ids.finBase)).toHaveText("114 mm");
    await expect(tagOf(page, ids.convention)).toHaveText("to 1 mm");
    await expect(tagOf(page, ids.quadMcKeeLB)).toHaveText("Needs 243.8 cm");
    const marked = await guideCards(page).evaluateAll((cards) =>
      cards.flatMap((card) =>
        [...card.querySelectorAll("[data-guide-tag], [data-guide-caption], svg text")]
          .map((el) => el.textContent ?? "")
          .filter((text) => /\d\s*["″]|\d'/.test(text)),
      ),
    );
    expect(marked).toEqual([]);
  });

  test("on the narrowest cards a computer draws, the Five-fin caption and the longest Model info read whole", async ({ page }) => {
    test.setTimeout(240_000);
    await openPreset(page, "shortboard", "FINS");
    await openGuide(page, COUNT);
    // Narrow the window until three cards across measure 236 to 245 dots, the narrowest a computer gives them.
    let width = 0;
    for (let w = 1100; w >= 820; w -= 4) {
      await page.setViewportSize({ width: w, height: 900 });
      const { columns, cardWidth } = await columnsAcross(page, guideSlug("Quad"));
      if (columns >= 2 && cardWidth >= 236 && cardWidth <= 245) {
        width = cardWidth;
        break;
      }
    }
    expect(width, "a window where the cards measure 236 to 245 dots").toBeGreaterThan(0);

    for (const card of await readGuideCards(page)) {
      expect(card.clipped, `${card.card}: text cut off`).toEqual([]);
      expect(card.outside, `${card.card}: a part outside the card`).toEqual([]);
      expect(card.nameMeetsTag, `${card.card}: the name runs into its tag`).toBe(false);
    }
    const fiveFin = captionOf(page, ids.quadCenter);
    await expect(fiveFin).toHaveText("drawn as · Quad — McKee SB/Gun + Center (Five-fin)");
    await fiveFin.scrollIntoViewIfNeeded();
    await expect(fiveFin).toBeInViewport({ ratio: 0.99 });
    const offRail = guideCard(page, ids.quadBasicOffRail).locator("[data-guide-info]");
    await offRail.scrollIntoViewIfNeeded();
    await expect(offRail).toBeInViewport({ ratio: 0.99 });
    const fits = await offRail.evaluate((el) => el.scrollHeight <= el.clientHeight + 1 && el.scrollWidth <= el.clientWidth + 1);
    expect(fits).toBe(true);
  });
});

test.describe("FINS' GUIDE on a phone (18-06)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "the phones' GUIDE; the computer's is the block above");
    await dismissStrips(page);
    await forgetOpenBoardOnEveryLoad(page);
  });

  test("upright: one card across, the page never scrolls with GUIDE open, and VIEWER pins 55dvh again", async ({ page }, testInfo) => {
    test.setTimeout(240_000);
    const upright = testInfo.project.name === "android" ? { width: 412, height: 915 } : { width: 390, height: 844 };
    await page.setViewportSize(upright);
    await openPreset(page, "shortboard", "FINS");
    await openGuide(page, COUNT);

    expect((await columnsAcross(page, guideSlug("Quad"))).columns).toBe(1);
    for (const card of await readGuideCards(page)) {
      expect(card.clipped, `${card.card}: text cut off`).toEqual([]);
      expect(card.outside, `${card.card}: a part outside the card`).toEqual([]);
      expect(card.width, card.card).toBeGreaterThanOrEqual(236);
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
    expect(pinned.scrollHeight).toBe(pinned.innerHeight);
    expect(pinned.scrollWidth).toBeLessThanOrEqual(pinned.innerWidth);
    expect(pinned.main).toBeLessThanOrEqual(0.66 * pinned.innerHeight + 1);
    expect(pinned.main).toBeGreaterThan(0.55 * pinned.innerHeight + 1);

    const last = guideCard(page, FINS_GUIDE_WORDS[COUNT - 1].id).locator("[data-guide-how]");
    await last.scrollIntoViewIfNeeded();
    await expect(last).toBeInViewport({ ratio: 0.99 });
    expect((await measure()).scrollHeight).toBe(pinned.innerHeight);

    // Back to VIEWER: the drawing pins at 55dvh as it always has.
    await page.getByRole("tab", { name: "VIEWER", exact: true }).click();
    await expect(guide(page)).toHaveCount(0);
    const viewer = await measure();
    expect(viewer.main).toBeLessThanOrEqual(0.55 * viewer.innerHeight + 1);
    expect(viewer.main).toBeGreaterThan(0.5 * viewer.innerHeight);
  });
});
