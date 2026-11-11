import { expect, test, type Page } from "@playwright/test";
import { BANNER_DISMISSAL_KEY } from "../lib/models/banner-dismissal";
import { TOOLBAR_TIP_DISMISSAL_KEY } from "../lib/models/toolbar-tip";
import { BOARD_PRESETS } from "../lib/geometry/presets";
import { forgetOpenBoardOnEveryLoad } from "./helpers/open-board";
import { goToScreen } from "./helpers/screens";

/**
 * Channels on RAILS, cut straight up (Phase 17, gap G-17-6 — 17-UAT.md test 6).
 *
 * What the founder saw: on RAILS' tail section of a fish with a Rolled Vee and channels, the thick Finished Rail line
 * was drawn as two dozen straight pieces about a quarter inch long, so it cut a slanted chord across every channel wall,
 * and the thin bottom line ramped over an eighth of an inch at each wall ("the finished rail messes with channel
 * shape … the finished rail should not round them"). His ruling of 2026-11-10: channels are the last cut, made after
 * the rail is shaped.
 *
 * What this proves: on the Fish with a Rolled Vee and eight channels, both lines on RAILS' tail plot hold vertical
 * drops — two points one above the other at the same x — and more of them than the same board with the channels set
 * back to None. No figure is typed: the drops are counted off the page's own drawing.
 */

const FISH = BOARD_PRESETS.find((p) => p.id === "fish")!;

async function dismissStrips(page: Page) {
  await page.addInitScript((key) => window.sessionStorage.setItem(key, "true"), BANNER_DISMISSAL_KEY);
  await page.addInitScript((key) => window.localStorage.setItem(key, "true"), TOOLBAR_TIP_DISMISSAL_KEY);
}

/** Opens the Fish from the home page and walks to BOTTOM by the top row, so the board stays the one opened. */
async function openFishOnBottom(page: Page) {
  await page.goto("/");
  const card = page
    .getByRole("button")
    .filter({ hasText: FISH.name })
    .filter({ hasText: /Start Shaping|\d\.\d L/ })
    .first();
  await expect(async () => {
    if (!/\/design\/outline$/.test(page.url()) && (await card.count()) > 0) {
      await card.scrollIntoViewIfNeeded({ timeout: 2_000 });
      await card.click({ timeout: 2_000 });
    }
    await expect(page).toHaveURL(/\/design\/outline$/, { timeout: 5_000 });
  }).toPass({ timeout: 90_000 });
  await goToScreen(page, "BOTTOM");
}

/** Picks an option from one of BOTTOM's menus by its spoken name, retried until React owns the menu. */
async function pickFrom(page: Page, menu: string, option: string) {
  const trigger = page.getByRole("combobox", { name: menu, exact: true });
  await expect(async () => {
    await trigger.click();
    await page.getByRole("option", { name: option, exact: true }).click({ timeout: 2_000 });
    await expect(trigger.locator("[data-slot=select-value]")).toHaveText(option, { timeout: 2_000 });
  }).toPass({ timeout: 60_000 });
}

/** On RAILS, with the tail's plot and the finished rail both drawn, how many vertical drops each line holds. */
async function tailDrops(page: Page): Promise<{ finished: number; planed: number }> {
  await goToScreen(page, "RAILS");
  const plot = page.locator('[data-rail-plot-row="desktop"] [data-rail-section-plot="tail"]');
  await expect(plot).toBeVisible({ timeout: 60_000 });
  const button = page.locator("[data-viewer-toolbar]").getByRole("button", { name: /finished rail$/ });
  if ((await button.getAttribute("aria-pressed")) !== "true") await button.click();
  await expect(button).toHaveAttribute("aria-pressed", "true");
  await expect(plot.locator("[data-finished-rail]")).toHaveCount(1);
  await expect(plot.locator("[data-rail-planed-bottom]")).toHaveCount(1);
  return plot.evaluate((svg) => {
    const drops = (points: { x: number; y: number }[]) => {
      let n = 0;
      for (let i = 1; i < points.length; i++) {
        if (Math.abs(points[i].x - points[i - 1].x) < 0.01 && Math.abs(points[i].y - points[i - 1].y) >= 1) n++;
      }
      return n;
    };
    // The finished rail's path: every command's end point, in order (M, L, Q and C all end on their last pair).
    const d = svg.querySelector("[data-finished-rail]")!.getAttribute("d") ?? "";
    const pathPoints = (d.match(/[MLQC][^MLQCZ]*/g) ?? []).map((command) => {
      const numbers = command.slice(1).trim().split(/[\s,]+/).map(Number);
      return { x: numbers[numbers.length - 2], y: numbers[numbers.length - 1] };
    });
    const planed = (svg.querySelector("[data-rail-planed-bottom]")!.getAttribute("points") ?? "")
      .trim()
      .split(/\s+/)
      .map((pair) => {
        const [x, y] = pair.split(",").map(Number);
        return { x, y };
      });
    return { finished: drops(pathPoints), planed: drops(planed) };
  });
}

test.describe("RAILS cuts the channels straight up (G-17-6)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the desktop tail plot is the one the founder saw");
    await dismissStrips(page);
    await forgetOpenBoardOnEveryLoad(page);
  });

  test("on the Fish with a Rolled Vee and eight channels, both the thin bottom line and the Finished Rail hold vertical walls", async ({
    page,
  }) => {
    test.setTimeout(240_000);
    await openFishOnBottom(page);
    await pickFrom(page, "Tail Cut", "Rolled Vee");
    await pickFrom(page, "Channels", "8 channels");
    const withChannels = await tailDrops(page);

    await goToScreen(page, "BOTTOM");
    await pickFrom(page, "Channels", "None");
    const without = await tailDrops(page);

    expect(withChannels.finished).toBeGreaterThan(without.finished);
    expect(withChannels.planed).toBeGreaterThan(without.planed);
  });
});
