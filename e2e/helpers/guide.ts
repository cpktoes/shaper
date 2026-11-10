import { expect, type Locator, type Page } from "@playwright/test";
import { BOARD_PRESETS } from "../../lib/geometry/presets";
import { BANNER_DISMISSAL_KEY } from "../../lib/models/banner-dismissal";
import { TOOLBAR_TIP_DISMISSAL_KEY } from "../../lib/models/toolbar-tip";
import { UNITS_STORAGE_KEY } from "../../lib/units-preference";
import { goToScreen, type ScreenLabel } from "./screens";

/**
 * What every page's GUIDE spec shares (Phase 18; copied from Phase 17's `bottom-guide.spec.ts`, never
 * imported from it): opening a preset on a page, opening its GUIDE once React owns the tab, and reading the
 * cards off the page. Every word a spec checks comes from the words module the page itself reads, never
 * typed into the spec.
 */

/** Keeps the welcome banner and the Hide Toolbar tip out of the way, as every desktop spec does. */
export async function dismissStrips(page: Page): Promise<void> {
  await page.addInitScript((key) => window.sessionStorage.setItem(key, "true"), BANNER_DISMISSAL_KEY);
  await page.addInitScript((key) => window.localStorage.setItem(key, "true"), TOOLBAR_TIP_DISMISSAL_KEY);
}

/** Arrives as a Metric shaper does: the chooser's own saved pick, set before the page loads. */
export async function setMetricUnits(page: Page): Promise<void> {
  await page.addInitScript((key) => window.localStorage.setItem(key, "metric"), UNITS_STORAGE_KEY);
}

/**
 * Opens a preset from the home page — a fresh `/design/outline` is the stock board, not a preset — and walks
 * to a design page by the top row (or ☰ and its tile on a phone). A computer's preset card says `Start
 * Shaping`; a phone's carries the board's litres. Retried until a tap lands after hydration.
 */
export async function openPreset(page: Page, presetId: string, screen: ScreenLabel): Promise<void> {
  const preset = BOARD_PRESETS.find((p) => p.id === presetId);
  if (!preset) throw new Error(`no ${presetId} preset`);
  await page.goto("/");
  const card = page
    .getByRole("button")
    .filter({ hasText: preset.name })
    .filter({ hasText: /Start Shaping|\d\.\d L/ })
    .first();
  await expect(async () => {
    if (!/\/design\/outline$/.test(page.url()) && (await card.count()) > 0) {
      await card.scrollIntoViewIfNeeded({ timeout: 2_000 });
      await card.click({ timeout: 2_000 });
    }
    await expect(page).toHaveURL(/\/design\/outline$/, { timeout: 5_000 });
  }).toPass({ timeout: 90_000 });
  await goToScreen(page, screen);
}

/** The GUIDE's one scroller. */
export const guide = (page: Page): Locator => page.locator("[data-guide]");
/** Every card in the open GUIDE. */
export const guideCards = (page: Page): Locator => guide(page).locator("[data-guide-card]");
/** One card, by its id (page + group + name, D-27). */
export const guideCard = (page: Page, id: string): Locator => guide(page).locator(`[data-guide-card="${id}"]`);

/** Opens the GUIDE tab, retried until React owns the tab so a tap before hydration is never lost, then
 * waits for the page's cards. */
export async function openGuide(page: Page, count: number): Promise<void> {
  const tab = page.getByRole("tab", { name: "GUIDE", exact: true });
  await expect(async () => {
    await tab.click({ timeout: 2_000 });
    await expect(guide(page)).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 90_000 });
  await expect(guideCards(page)).toHaveCount(count);
}

/** How many cards sit side by side in a group: the number of different left edges. */
export async function columnsAcross(page: Page, group: string): Promise<{ columns: number; cardWidth: number }> {
  return guide(page)
    .locator(`[data-guide-group="${group}"] [data-guide-card]`)
    .evaluateAll((els) => {
      const boxes = els.map((el) => el.getBoundingClientRect());
      return { columns: new Set(boxes.map((box) => Math.round(box.left))).size, cardWidth: Math.round(boxes[0].width) };
    });
}

/**
 * Every card read off the page: its size, any line of text wider or taller than its own box, any part
 * outside the card's own edge, whether the name runs into its tag, and the drawing's size.
 */
export async function readGuideCards(page: Page) {
  return guideCards(page).evaluateAll((els) =>
    els.map((card) => {
      const box = card.getBoundingClientRect();
      const parts = [...card.querySelectorAll<HTMLElement | SVGElement>("h4, p, [data-guide-tag], svg")];
      const clipped = parts
        .filter((part): part is HTMLElement => part instanceof HTMLElement)
        .filter((part) => part.scrollWidth > part.clientWidth + 1 || part.scrollHeight > part.clientHeight + 1)
        .map((part) => part.tagName);
      const outside = parts
        .map((part) => ({ tag: part.tagName, rect: part.getBoundingClientRect() }))
        .filter(
          ({ rect }) =>
            rect.left < box.left - 0.5 || rect.right > box.right + 0.5 || rect.top < box.top - 0.5 || rect.bottom > box.bottom + 0.5,
        )
        .map(({ tag }) => tag);
      const name = card.querySelector("h4")!.getBoundingClientRect();
      const tag = card.querySelector("[data-guide-tag]")?.getBoundingClientRect() ?? null;
      const art = card.querySelector("svg")!.getBoundingClientRect();
      // A tag that wrapped under a long name sits on its own line, so only a tag on the name's line can meet it.
      const sameLine = tag !== null && tag.top < name.bottom - 0.5;
      return {
        card: card.getAttribute("data-guide-card") ?? "",
        width: box.width,
        height: box.height,
        clipped,
        outside,
        nameMeetsTag: sameLine && name.right > tag!.left + 0.5,
        artWidth: art.width,
        artHeight: art.height,
      };
    }),
  );
}
