import { expect, test, type Page } from "@playwright/test";
import { BANNER_DISMISSAL_KEY } from "../lib/models/banner-dismissal";
import { TOOLBAR_TIP_DISMISSAL_KEY } from "../lib/models/toolbar-tip";
import { BOARD_PRESETS } from "../lib/geometry/presets";
import { forgetOpenBoardOnEveryLoad } from "./helpers/open-board";
import { goToScreen } from "./helpers/screens";

/**
 * RAILS' three cross-sections share one scale and one right edge (quick 261116-tqs follow-up, the founder's
 * long-standing rule: "shared scale, aligned x-axes").
 *
 * What went wrong: since D-12 each plot stops at its own stringer, so the three drawings' boxes are different widths —
 * yet every plot was still stretched to the same width on the page, so an inch was a different length on each (on the
 * stock Shortboard about 63, 46 and 50 pixels on the Nose, Centre and Tail) and the fit-to-height sum left about 90
 * pixels of empty room under the plots.
 *
 * What this proves: on the stock Shortboard, with no figure typed, the three plots' own tick marks are the same
 * distance apart (one inch = the same number of pixels on all three), the rail (the `0` tick, x = 0) lines up across
 * the three to within a pixel, their right edges line up, and the plots really are different widths (so this test could
 * not pass by the boxes being identical). It is measured off the page's own drawing: the small vertical tick marks on
 * each plot's bottom axis (the `0` mark at the rail and the `1` mark an inch in), never off the code's own constants.
 * On a short screen — a phone held sideways, where the drawing column scrolls — the same holds.
 */

async function dismissStrips(page: Page) {
  await page.addInitScript((key) => window.sessionStorage.setItem(key, "true"), BANNER_DISMISSAL_KEY);
  await page.addInitScript((key) => window.localStorage.setItem(key, "true"), TOOLBAR_TIP_DISMISSAL_KEY);
}

async function openRailsOnShortboard(page: Page) {
  const preset = BOARD_PRESETS.find((p) => p.id === "shortboard")!;
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
  await goToScreen(page, "RAILS");
  await page.waitForFunction(() => !!document.querySelector('[data-rail-plot-row="desktop"][data-rail-plot-fit="measured"]'));
}

interface PlotMeasure {
  key: string;
  /** Pixels between the `0` tick (the rail) and the `1` tick (an inch in) on the plot's bottom axis. */
  pxPerInch: number;
  /** Where the rail (the `0` tick) stands on the page, and where the plot's box ends on its right. */
  railX: number;
  right: number;
  width: number;
  /** The plot's own box in drawing units (its viewBox width): what each plot's stringer set. */
  boxUnits: number;
  bottom: number;
}

async function measurePlots(page: Page): Promise<{ plots: PlotMeasure[]; rowBottom: number }> {
  return page.evaluate(() => {
    const row = document.querySelector<HTMLElement>('[data-rail-plot-row="desktop"]')!;
    const plots = Array.from(row.querySelectorAll<SVGSVGElement>("[data-rail-section-plot]")).map((svg) => {
      const box = svg.getBoundingClientRect();
      // The bottom axis's tick marks: short vertical lines (8 drawing units long, x1 = x2), one per inch.
      const ticks = Array.from(svg.querySelectorAll<SVGLineElement>("line"))
        .filter((l) => {
          const x1 = Number(l.getAttribute("x1"));
          const x2 = Number(l.getAttribute("x2"));
          const y1 = Number(l.getAttribute("y1"));
          const y2 = Number(l.getAttribute("y2"));
          return x1 === x2 && Math.abs(y2 - y1 - 8) < 1e-6;
        })
        .map((l) => l.getBoundingClientRect().left)
        .sort((a, b) => b - a);
      return {
        key: svg.getAttribute("data-rail-section-plot")!,
        pxPerInch: ticks[0] - ticks[1],
        railX: ticks[0],
        right: box.right,
        width: box.width,
        boxUnits: svg.viewBox.baseVal.width,
        bottom: box.bottom,
      };
    });
    return { plots, rowBottom: row.getBoundingClientRect().bottom };
  });
}

function expectOneScale(plots: PlotMeasure[]) {
  if (process.env.PW_SHOW_MEASURES) console.log(JSON.stringify(plots));
  expect(plots.map((p) => p.key)).toEqual(["nose", "center", "tail"]);
  const [nose, center, tail] = plots;
  // The plots' boxes are different widths in drawing units (each stops at its own stringer), or this would prove nothing.
  expect(
    Math.min(nose.boxUnits, tail.boxUnits),
    `boxes: nose ${nose.boxUnits}, centre ${center.boxUnits}, tail ${tail.boxUnits}`,
  ).toBeLessThan(center.boxUnits - 20);
  for (const p of plots) {
    expect(p.pxPerInch, `${p.key}: an inch measured ${p.pxPerInch}px`).toBeGreaterThan(20);
    expect(Math.abs(p.pxPerInch - center.pxPerInch), `${p.key} reads ${p.pxPerInch}px an inch, centre ${center.pxPerInch}`).toBeLessThanOrEqual(0.5);
    expect(Math.abs(p.railX - center.railX), `${p.key}'s rail is at ${p.railX}, centre's at ${center.railX}`).toBeLessThanOrEqual(1);
    expect(Math.abs(p.right - center.right), `${p.key}'s right edge is at ${p.right}, centre's at ${center.right}`).toBeLessThanOrEqual(1);
  }
}

test.describe("RAILS' three cross-sections share one scale (D-12 follow-up)", () => {
  test.beforeEach(async ({ page }) => {
    await dismissStrips(page);
    await forgetOpenBoardOnEveryLoad(page);
  });

  test("a computer window: an inch is the same length on Nose, Center and Tail, the rail lines up, and the stack fills the column", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "a computer window — the phone projects are upright, where one rail shows at a time");
    for (const size of [
      { width: 1280, height: 800 },
      { width: 1280, height: 560 },
    ]) {
      await page.setViewportSize(size);
      await openRailsOnShortboard(page);
      await page.waitForTimeout(500);
      const { plots, rowBottom } = await measurePlots(page);
      expectOneScale(plots);
      // The widest plot is fitted to the column, so the stack reaches near the bottom of its row: no band of empty room
      // under the third plot (it was about 90 pixels at 1280x800).
      const room = rowBottom - plots[2].bottom;
      expect(room, `${size.width}x${size.height}: ${room}px of empty room under the plots`).toBeLessThan(24);
    }
  });

  test("a phone held sideways, the column scrolling: the same one scale", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "the phone projects only — the desktop project has its own test above");
    await page.setViewportSize({ width: 844, height: 340 });
    await openRailsOnShortboard(page);
    await page.waitForTimeout(500);
    const { plots } = await measurePlots(page);
    expectOneScale(plots);
  });
});
