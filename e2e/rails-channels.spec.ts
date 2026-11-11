import { expect, test, type Page } from "@playwright/test";
import { BANNER_DISMISSAL_KEY } from "../lib/models/banner-dismissal";
import { TOOLBAR_TIP_DISMISSAL_KEY } from "../lib/models/toolbar-tip";
import { BOARD_PRESETS } from "../lib/geometry/presets";
import { importedReadout } from "./helpers/imported-readout";
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
 *
 * The founder's answer of 2026-11-11, "Show channels too": a board with no vee or belly shows its channels on RAILS
 * as well. On the Fish with a flat tail and eight channels, RAILS' tail plot now draws the flat planed bottom with every
 * channel wall cut straight up on the thin line and on the Finished Rail, each wall on both lines at the same place,
 * while the rail it bands is the rail it bands with no channels: the readout card reads the same and never names
 * BOTTOM, every band line but the bottom connector (now drawn as the planed bottom) and every mark dot stand where they
 * stand with None.
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

interface TailPlot {
  /** How many vertical drops the Finished Rail and the thin planed bottom hold. */
  finished: number;
  planed: number;
  /** The x of every drop on each line, rounded to 0.01 of a drawing unit. */
  finishedDropXs: number[];
  planedDropXs: number[];
  /** Every band line's four coordinates (`x1,y1,x2,y2`), and every mark dot's centre (`cx,cy`). */
  bandLines: string[];
  dots: string[];
  /** The text of RAILS' readout card, `From ROCKER & FOIL`. */
  readout: string;
}

/**
 * On RAILS, with the tail's plot and the finished rail both drawn: the vertical drops each line holds, where they stand,
 * the band lines, the mark dots and the readout card. `planedBottoms` is how many planed-bottom lines the plot draws —
 * 1 where the bottom is drawn under the rail, 0 where the bottom connector is the straight line it always was.
 */
async function tailPlot(page: Page, planedBottoms: 0 | 1 = 1): Promise<TailPlot> {
  await goToScreen(page, "RAILS");
  const plot = page.locator('[data-rail-plot-row="desktop"] [data-rail-section-plot="tail"]');
  await expect(plot).toBeVisible({ timeout: 60_000 });
  const button = page.locator("[data-viewer-toolbar]").getByRole("button", { name: /finished rail$/ });
  if ((await button.getAttribute("aria-pressed")) !== "true") await button.click();
  await expect(button).toHaveAttribute("aria-pressed", "true");
  await expect(plot.locator("[data-finished-rail]")).toHaveCount(1);
  await expect(plot.locator("[data-rail-planed-bottom]")).toHaveCount(planedBottoms);
  // RAILS' readout card: captioned `From ROCKER & FOIL`, or `From ROCKER, FOIL & BOTTOM` where a vee or belly lifts the
  // rail (the Rolled Vee test below).
  const card = page.locator("aside").getByRole("group", { name: /^From ROCKER/i });
  await expect(card).toBeVisible();
  const readout = ((await card.textContent()) ?? "").replace(/\s+/g, " ").trim();
  const drawn = await plot.evaluate((svg) => {
    const dropXs = (points: { x: number; y: number }[]) => {
      const xs: number[] = [];
      for (let i = 1; i < points.length; i++) {
        if (Math.abs(points[i].x - points[i - 1].x) < 0.01 && Math.abs(points[i].y - points[i - 1].y) >= 1) {
          xs.push(Math.round(points[i].x * 100) / 100);
        }
      }
      return xs;
    };
    // The finished rail's path: every command's end point, in order (M, L, Q and C all end on their last pair).
    const d = svg.querySelector("[data-finished-rail]")!.getAttribute("d") ?? "";
    const pathPoints = (d.match(/[MLQC][^MLQCZ]*/g) ?? []).map((command) => {
      const numbers = command.slice(1).trim().split(/[\s,]+/).map(Number);
      return { x: numbers[numbers.length - 2], y: numbers[numbers.length - 1] };
    });
    const planed = (svg.querySelector("[data-rail-planed-bottom]")?.getAttribute("points") ?? "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((pair) => {
        const [x, y] = pair.split(",").map(Number);
        return { x, y };
      });
    const bandLines = [...svg.querySelectorAll("[data-rail-bands] line")].map((line) =>
      ["x1", "y1", "x2", "y2"].map((a) => line.getAttribute(a)).join(","),
    );
    const dots = [...svg.querySelectorAll("circle")].map((c) => `${c.getAttribute("cx")},${c.getAttribute("cy")}`);
    return { finishedDropXs: dropXs(pathPoints), planedDropXs: dropXs(planed), bandLines, dots };
  });
  return { ...drawn, finished: drawn.finishedDropXs.length, planed: drawn.planedDropXs.length, readout };
}

/** How many vertical drops each line holds, on a plot that draws its planed bottom (the Rolled Vee test below). */
async function tailDrops(page: Page): Promise<{ finished: number; planed: number }> {
  const { finished, planed } = await tailPlot(page, 1);
  return { finished, planed };
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

  test("on the Fish with a flat tail and eight channels, RAILS draws the walls on both lines, and its rail is the rail it bands with no channels", async ({
    page,
  }) => {
    test.setTimeout(240_000);
    await openFishOnBottom(page);
    // Only the channels: the tail stays Flat Exit.
    await pickFrom(page, "Channels", "8 channels");
    const withChannels = await tailPlot(page, 1);
    await expect(importedReadout(page.locator("aside"), "From ROCKER & FOIL")).toBeVisible();

    await goToScreen(page, "BOTTOM");
    await pickFrom(page, "Channels", "None");
    const without = await tailPlot(page, 0);

    // The walls: the planed bottom holds vertical drops, and the finished line stands at more places than with None (a
    // hard edge's face, split into pieces, stays one place).
    expect(withChannels.planed).toBeGreaterThan(0);
    expect(new Set(withChannels.finishedDropXs).size).toBeGreaterThan(new Set(without.finishedDropXs).size);
    // every wall on the thin line has a wall on the thick line at the same place
    const thick = new Set(withChannels.finishedDropXs);
    for (const x of withChannels.planedDropXs) expect(thick.has(x), `the Finished Rail drops at ${x} too`).toBe(true);

    // The rail itself: every band line is one of None's, one fewer (the bottom connector, drawn as the planed bottom
    // instead); every mark dot stands where it stands; the readout card reads the same and never names BOTTOM.
    const noneLines = new Set(without.bandLines);
    for (const line of withChannels.bandLines) expect(noneLines.has(line), `band line ${line}`).toBe(true);
    expect(withChannels.bandLines).toHaveLength(without.bandLines.length - 1);
    expect(withChannels.dots).toEqual(without.dots);
    expect(withChannels.readout).toBe(without.readout);
    expect(withChannels.readout).not.toMatch(/BOTTOM/i);
    await expect(importedReadout(page.locator("aside"), "From ROCKER & FOIL")).toBeVisible();
  });
});
