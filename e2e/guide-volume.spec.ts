import { expect, test } from "@playwright/test";
import { GUIDE_COPY } from "../components/guide/guide-copy";
import { VOLUME_GUIDE_GROUPS, VOLUME_GUIDE_WORDS } from "../components/guide/words/volume";
import { guideSlug } from "../lib/geometry/guide-card";
import { VOLUME_GUIDE_CARD_IDS } from "../lib/geometry/guide-volume";
import { forgetOpenBoardOnEveryLoad } from "./helpers/open-board";
import { dismissStrips, guide, guideCard, guideCards, openGuide, openPreset } from "./helpers/guide";

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
});
