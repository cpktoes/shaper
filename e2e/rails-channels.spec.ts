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
 *
 * The founder's answers of 2026-11-11, "Draw the concave" (at his look at 17-21) and "Always draw it" (on 17-22's
 * plan): RAILS draws every concave, on the nose, centre and tail sections, channels or not, and cuts the channels last
 * into it. A concave runs out to nothing at the rail, so the rail RAILS bands is the flat board's own. On the
 * Shortboard with a Deep Single Concave and no channels, the centre plot's planed bottom stands on the concave's hollow
 * — never below the flat board's straight bottom, and above it by more than a drawing unit somewhere — while every band
 * line but that bottom, every mark dot and the readout card (`From ROCKER & FOIL`) are the flat board's. On the Fish
 * with an Extending Single Concave and eight channels, the tail's planed bottom stands on the concave at the same
 * points the flat tail's does, never lower and higher somewhere, its channel walls straight up on both lines, and the
 * rail, its marks and its readout are the flat tail's.
 */

async function dismissStrips(page: Page) {
  await page.addInitScript((key) => window.sessionStorage.setItem(key, "true"), BANNER_DISMISSAL_KEY);
  await page.addInitScript((key) => window.localStorage.setItem(key, "true"), TOOLBAR_TIP_DISMISSAL_KEY);
}

/** Opens a stock board from the home page (by its `BOARD_PRESETS` id) and walks to BOTTOM by the top row, so the board
 * stays the one opened. */
async function openOnBottom(page: Page, presetId: string) {
  const preset = BOARD_PRESETS.find((p) => p.id === presetId)!;
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

interface SectionPlot {
  /** How many vertical drops the Finished Rail and the thin planed bottom hold. */
  finished: number;
  planed: number;
  /** The x of every drop on each line, rounded to 0.01 of a drawing unit. */
  finishedDropXs: number[];
  planedDropXs: number[];
  /** Every band line's four coordinates (`x1,y1,x2,y2`), and every mark dot's centre (`cx,cy`). */
  bandLines: string[];
  dots: string[];
  /** The planed bottom's points, in order (each rounded to 0.01 of a drawing unit) — none where it is not drawn. */
  planedPoints: { x: number; y: number }[];
  /** The text of RAILS' readout card, `From ROCKER & FOIL`. */
  readout: string;
}

/**
 * On RAILS, with one section's plot and the finished rail both drawn: the vertical drops each line holds, where they
 * stand, the planed bottom's points, the band lines, the mark dots and the readout card. `planedBottoms` is how many
 * planed-bottom lines the plot draws — 1 where the bottom is drawn under the rail, 0 where the bottom connector is the
 * straight line it always was.
 */
async function sectionPlot(
  page: Page,
  planedBottoms: 0 | 1 = 1,
  section: "tail" | "center" | "nose" = "tail",
): Promise<SectionPlot> {
  await goToScreen(page, "RAILS");
  const plot = page.locator(`[data-rail-plot-row="desktop"] [data-rail-section-plot="${section}"]`);
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
    const round = (v: number) => Math.round(v * 100) / 100;
    const planedPoints = planed.map((p) => ({ x: round(p.x), y: round(p.y) }));
    return { finishedDropXs: dropXs(pathPoints), planedDropXs: dropXs(planed), planedPoints, bandLines, dots };
  });
  return { ...drawn, finished: drawn.finishedDropXs.length, planed: drawn.planedDropXs.length, readout };
}

/** How many vertical drops each line holds, on a plot that draws its planed bottom (the Rolled Vee test below). */
async function tailDrops(page: Page): Promise<{ finished: number; planed: number }> {
  const { finished, planed } = await sectionPlot(page, 1);
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
    await openOnBottom(page, "fish");
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
    await openOnBottom(page, "fish");
    // Only the channels: the tail stays Flat Exit.
    await pickFrom(page, "Channels", "8 channels");
    const withChannels = await sectionPlot(page, 1);
    await expect(importedReadout(page.locator("aside"), "From ROCKER & FOIL")).toBeVisible();

    await goToScreen(page, "BOTTOM");
    await pickFrom(page, "Channels", "None");
    const without = await sectionPlot(page, 0);

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

/** A straight line's height at `x`, from its four coordinates `x1,y1,x2,y2`. */
function lineAt(line: string, x: number): number {
  const [x1, y1, x2, y2] = line.split(",").map(Number);
  return x2 === x1 ? y1 : y1 + ((y2 - y1) * (x - x1)) / (x2 - x1);
}

test.describe('RAILS draws every concave (the founder, 2026-11-11: "Always draw it")', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the desktop plots are the ones the founder saw");
    await dismissStrips(page);
    await forgetOpenBoardOnEveryLoad(page);
  });

  test("the Shortboard's Deep Single Concave, no channels: the centre plot stands on the concave's hollow and its rail is the flat board's", async ({
    page,
  }) => {
    test.setTimeout(240_000);
    await openOnBottom(page, "shortboard");
    await pickFrom(page, "Center Cut", "Deep Single Concave");
    const concave = await sectionPlot(page, 1, "center");
    await expect(importedReadout(page.locator("aside"), "From ROCKER & FOIL")).toBeVisible();

    await goToScreen(page, "BOTTOM");
    await pickFrom(page, "Center Cut", "Flat Center");
    const flat = await sectionPlot(page, 0, "center");

    // The rail: every band line is one of the flat board's, one fewer (the straight bottom connector, drawn as the
    // planed bottom instead); every mark dot stands where it stands (no Shortboard mark is inside the concave); the
    // readout reads the same and never names BOTTOM.
    const concaveLines = new Set(concave.bandLines);
    for (const line of concave.bandLines) expect(flat.bandLines, `band line ${line}`).toContain(line);
    expect(concave.bandLines).toHaveLength(flat.bandLines.length - 1);
    expect(concave.dots).toEqual(flat.dots);
    expect(concave.readout).toBe(flat.readout);
    expect(concave.readout).not.toMatch(/BOTTOM/i);
    await expect(importedReadout(page.locator("aside"), "From ROCKER & FOIL")).toBeVisible();

    // The hollow: the flat board's bottom connector is the one line the concave board does not draw; every point of the
    // planed bottom stands no lower than it at the same x (a drawing's y grows downward), and one well above it.
    const connector = flat.bandLines.filter((line) => !concaveLines.has(line));
    expect(connector).toHaveLength(1);
    expect(concave.planedPoints.length).toBeGreaterThan(2);
    let highest = 0;
    for (const p of concave.planedPoints) {
      const straight = lineAt(connector[0], p.x);
      expect(p.y, `the planed bottom at ${p.x}`).toBeLessThanOrEqual(straight + 0.01);
      highest = Math.max(highest, straight - p.y);
    }
    expect(highest).toBeGreaterThan(1);
  });

  test("the Fish's Extending Single Concave with eight channels: the concave under the channels, walls on both lines", async ({
    page,
  }) => {
    test.setTimeout(240_000);
    await openOnBottom(page, "fish");
    await pickFrom(page, "Tail Cut", "Extending Single Concave");
    await pickFrom(page, "Channels", "8 channels");
    const concave = await sectionPlot(page, 1, "tail");
    await expect(importedReadout(page.locator("aside"), "From ROCKER & FOIL")).toBeVisible();

    await goToScreen(page, "BOTTOM");
    await pickFrom(page, "Tail Cut", "Flat Exit");
    const flat = await sectionPlot(page, 1, "tail");

    // The walls: the planed bottom holds vertical drops, each with a drop on the Finished Rail at the same place.
    expect(concave.planed).toBeGreaterThan(0);
    const thick = new Set(concave.finishedDropXs);
    for (const x of concave.planedDropXs) expect(thick.has(x), `the Finished Rail drops at ${x} too`).toBe(true);

    // The concave under them: the planed bottom stands at the flat tail's own points, none lower, one well higher.
    expect(concave.planedPoints.map((p) => p.x)).toEqual(flat.planedPoints.map((p) => p.x));
    let highest = 0;
    concave.planedPoints.forEach((p, i) => {
      expect(p.y, `the planed bottom at ${p.x}`).toBeLessThanOrEqual(flat.planedPoints[i].y + 0.01);
      highest = Math.max(highest, flat.planedPoints[i].y - p.y);
    });
    expect(highest).toBeGreaterThan(1);

    // The rail: the band lines and mark dots are the flat tail's, the readout the same and never naming BOTTOM.
    expect(concave.bandLines).toEqual(flat.bandLines);
    expect(concave.dots).toEqual(flat.dots);
    expect(concave.readout).toBe(flat.readout);
    expect(concave.readout).not.toMatch(/BOTTOM/i);
    await expect(importedReadout(page.locator("aside"), "From ROCKER & FOIL")).toBeVisible();
  });
});
