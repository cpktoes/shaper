import { expect, test, type Locator, type Page } from "@playwright/test";
import { openRocker, pickFirstFittingBlank } from "./helpers/blank-picker";
import { expectReadout, importedReadout } from "./helpers/imported-readout";

/**
 * The browser proof of ROCKER's side panel as the founder's copy-edit canvas drew it (quick 261017-vdh,
 * plan 02, 2026-10-17):
 *
 * - INPUTS is the first section, under the title and subtitle: a ruled, non-collapsible heading, the
 *   `From TEMPLATE` readout card (sketch 017 C, quick 261018-fg1: the template's length and width in
 *   large figures with their names under them) and the Center Thickness
 *   slider, its value in its label. The separate CENTER THICKNESS section is gone.
 * - With no blank picked, the old ROCKER and THICKNESS sections are ONE `Rocker & Foil` section: the intro
 *   `Hand-set until you pick a blank.` and a grid — a ROCKER and a THICKNESS column, a NOSE group (Tip, then
 *   @ 12") and a TAIL group (@ 12", then Tip) — each cell a value box over its own named slider.
 * - With a blank picked, THICKNESS is simply `Foil`, its rows in today's order, and the grid is not there.
 *
 * Helpers are copied locally, as every spec in this suite does (`rocker-live-controls.spec.ts` for the
 * chrome dismissal). The tab rule (what stays live on DATASHEET and TOP VIEW) is proved in
 * `rocker-live-controls.spec.ts`.
 */

const BANNER_DISMISSAL_KEY = "shaper-sign-in-banner-dismissed";
const TOOLBAR_TIP_DISMISSAL_KEY = "shaper-toolbar-tip-dismissed";

async function dismissChrome(page: Page) {
  await page.addInitScript((key) => {
    window.sessionStorage.setItem(key, "true");
  }, BANNER_DISMISSAL_KEY);
  await page.addInitScript((key) => {
    window.localStorage.setItem(key, "true");
  }, TOOLBAR_TIP_DISMISSAL_KEY);
}

function aside(page: Page): Locator {
  return page.locator("aside");
}

/** A grid cell's value box and its slider thumb, by the cell's test hook. */
function cellBox(page: Page, cell: string): Locator {
  return page.locator(`[data-hand-set-cell="${cell}"] [data-slider-value-box]`);
}

/** A slider by its screen-reader name (the thumb's range input). */
function sliderNamed(page: Page, name: string): Locator {
  return aside(page).getByRole("slider", { name, exact: true });
}

const GRID_CELLS = [
  "nose-tip-rocker",
  "nose-tip-thickness",
  "nose-12-rocker",
  "nose-12-thickness",
  "tail-12-rocker",
  "tail-12-thickness",
  "tail-tip-rocker",
  "tail-tip-thickness",
] as const;

test.describe("ROCKER's side panel on a computer (quick 261017-vdh)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the computer's own layout; the phones have their own describe");
    await dismissChrome(page);
  });

  test("with no blank: Inputs first, then one Rocker & Foil table of eight named, boxed sliders", async ({ page }) => {
    await openRocker(page);
    const side = aside(page);

    // INPUTS: the heading, the TEMPLATE line, Center Thickness — and nothing of the old sections.
    const inputs = page.locator("[data-rocker-inputs]");
    await expect(inputs.getByText("Inputs", { exact: true })).toBeVisible();
    const card = importedReadout(inputs, "From TEMPLATE");
    await expect(card).toBeVisible();
    await expectReadout(card, [
      ["Length", `6'0"`],
      ["Width", `19"`],
    ]);
    await expect(inputs.getByText(/are imported/)).toHaveCount(0);
    await expect(inputs.getByText('Center Thickness — 2 1/2"', { exact: true })).toBeVisible();
    await expect(inputs.getByRole("textbox")).toHaveCount(0);
    await expect(sliderNamed(page, "Center Thickness")).toHaveCount(1);
    await expect(inputs.locator('[data-slot="slider-thumb"] input[type="range"]')).toHaveCount(1);
    await expect(side.getByRole("button", { name: /^Center Thickness/ })).toHaveCount(0);
    await expect(side.getByRole("button", { name: /^Rocker\s*[▾▸]$/ })).toHaveCount(0);
    await expect(side.getByRole("button", { name: /^Thickness\s*[▾▸]$/ })).toHaveCount(0);

    // Inputs sits above the Blank section.
    const inputsBox = await inputs.boundingBox();
    const blankBox = await page.locator("[data-blank-button]").boundingBox();
    expect(inputsBox).not.toBeNull();
    expect(blankBox).not.toBeNull();
    expect(inputsBox!.y).toBeLessThan(blankBox!.y);

    // One Rocker & Foil section with its intro.
    const heading = side.getByRole("button", { name: /^Rocker & Foil\s*[▾▸]$/ });
    await expect(heading).toBeVisible();
    await expect(side.getByText("Hand-set until you pick a blank.", { exact: true })).toBeVisible();

    // Eight sliders by name, with the default board's value boxes.
    const expected: Array<[string, string, string]> = [
      ["Nose tip rocker", "nose-tip-rocker", '4 1/2"'],
      ["Nose tip thickness", "nose-tip-thickness", '1/2"'],
      ['Nose 12" rocker', "nose-12-rocker", '1 1/4"'],
      ['Nose 12" thickness', "nose-12-thickness", '1 5/16"'],
      ['Tail 12" rocker', "tail-12-rocker", '3/8"'],
      ['Tail 12" thickness', "tail-12-thickness", '1 9/16"'],
      ["Tail tip rocker", "tail-tip-rocker", '2"'],
      ["Tail tip thickness", "tail-tip-thickness", '5/8"'],
    ];
    for (const [name, cell, box] of expected) {
      await expect(sliderNamed(page, name)).toHaveCount(1);
      await expect(cellBox(page, cell)).toHaveText(box);
    }

    // Nose to tail, top to bottom: NOSE Tip, NOSE @ 12", TAIL @ 12", TAIL Tip.
    const ys: number[] = [];
    for (const cell of ["nose-tip-rocker", "nose-12-rocker", "tail-12-rocker", "tail-tip-rocker"]) {
      const box = await cellBox(page, cell).boundingBox();
      expect(box, cell).not.toBeNull();
      ys.push(box!.y);
    }
    expect(ys[0]).toBeLessThan(ys[1]);
    expect(ys[1]).toBeLessThan(ys[2]);
    expect(ys[2]).toBeLessThan(ys[3]);
    // The thickness column sits to the right of the rocker column on the same row.
    const rockerCell = await cellBox(page, "nose-tip-rocker").boundingBox();
    const thicknessCell = await cellBox(page, "nose-tip-thickness").boundingBox();
    expect(thicknessCell!.x).toBeGreaterThan(rockerCell!.x);
    expect(Math.abs(thicknessCell!.y - rockerCell!.y)).toBeLessThanOrEqual(1);

    // A nudge moves the number: ArrowRight on the nose tip rocker changes its box.
    const noseTipRocker = sliderNamed(page, "Nose tip rocker");
    await noseTipRocker.focus();
    await page.keyboard.press("ArrowRight");
    await expect(cellBox(page, "nose-tip-rocker")).not.toHaveText('4 1/2"');

    // The heading closes the grid and opens it again.
    await heading.click();
    await expect(page.locator("[data-hand-set-cell]")).toHaveCount(0);
    await expect(side.getByText("Hand-set until you pick a blank.", { exact: true })).toHaveCount(0);
    await heading.click();
    await expect(page.locator("[data-hand-set-cell]")).toHaveCount(GRID_CELLS.length);
  });

  test("in Metric the card, the station and the boxes read in centimetres and whole millimetres", async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem("shaper-units", "metric"));
    await openRocker(page);
    const side = aside(page);

    await expectReadout(importedReadout(page.locator("[data-rocker-inputs]"), "From TEMPLATE"), [
      ["Length", "182.9 cm"],
      ["Width", "48.3 cm"],
    ]);
    await expect(page.locator("[data-rocker-inputs]").getByText("Center Thickness — 64 mm", { exact: true })).toBeVisible();
    await expect(side.getByText("@ 30.5 cm", { exact: true })).toHaveCount(2);
    await expect(cellBox(page, "nose-tip-rocker")).toHaveText("114 mm");
    await expect(cellBox(page, "nose-tip-thickness")).toHaveText("13 mm");
    await expect(sliderNamed(page, "Nose 30.5 cm rocker")).toHaveCount(1);
    await expect(sliderNamed(page, "Tail 30.5 cm thickness")).toHaveCount(1);
  });

  test("with a blank: Thickness is called Foil, its rows keep their order, and the grid is gone", async ({ page }) => {
    await openRocker(page);
    await pickFirstFittingBlank(page);
    const side = aside(page);

    await expect(side.getByRole("button", { name: /^Foil\s*[▾▸]$/ })).toBeVisible();
    await expect(side.getByRole("button", { name: /^Rocker & Foil\s*[▾▸]$/ })).toHaveCount(0);
    await expect(side.getByRole("button", { name: /^Thickness\s*[▾▸]$/ })).toHaveCount(0);
    await expect(sliderNamed(page, "Nose tip rocker")).toHaveCount(0);
    await expect(page.locator("[data-hand-set-cell]")).toHaveCount(0);
    // INPUTS is still first, with its line and Center Thickness.
    await expect(page.locator("[data-rocker-inputs]").getByText("Inputs", { exact: true })).toBeVisible();

    // Foil's rows, top to bottom, then Tip Style and the two Thinning Starts.
    const labels = [
      side.getByText(/^Nose Tip — /),
      side.getByText(/^Nose @ 12" — /),
      side.getByText(/^Tail @ 12" — /),
      side.getByText(/^Tail Tip — /),
      side.getByText("Tip Style", { exact: true }),
      side.getByText(/^Nose Thinning Starts — /),
      side.getByText(/^Tail Thinning Starts — /),
    ];
    let previous = -Infinity;
    for (const label of labels) {
      await expect(label).toBeVisible();
      const box = await label.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.y).toBeGreaterThan(previous);
      previous = box!.y;
    }
  });
});

test.describe("ROCKER's Rocker & Foil table on a phone (quick 261017-vdh)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "the phone projects, at their own viewports");
    await dismissChrome(page);
  });

  test("all eight thumbs can be reached and the side panel never scrolls sideways", async ({ page }) => {
    await openRocker(page);
    const thumbs = page.locator('[data-hand-set-cell] [data-slot="slider-thumb"]');
    await expect(thumbs).toHaveCount(GRID_CELLS.length);
    for (let i = 0; i < GRID_CELLS.length; i += 1) {
      await thumbs.nth(i).scrollIntoViewIfNeeded();
      await expect(thumbs.nth(i)).toBeVisible();
    }
    const overflow = await aside(page).evaluate((el) => ({ scroll: el.scrollWidth, client: el.clientWidth }));
    expect(overflow.scroll).toBeLessThanOrEqual(overflow.client);
  });
});
