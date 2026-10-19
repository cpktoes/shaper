import { expect, test, type Locator, type Page } from "@playwright/test";
import { openRocker, pickFirstFittingBlank } from "./helpers/blank-picker";
import { expectReadout, importedReadout } from "./helpers/imported-readout";
import { openFoilAdvanced } from "./helpers/rocker-sidebar";

/**
 * The browser proof of ROCKER's side panel as the founder's copy-edit canvas drew it (quick 261017-vdh,
 * plan 02, 2026-10-17):
 *
 * - INPUTS is the first section, under the title and subtitle: a ruled, non-collapsible heading, the
 *   `From TEMPLATE` readout card (sketch 017 C, quick 261018-fg1: the template's length and width in
 *   large figures with their names under them) and three thickness sliders, each value in its label:
 *   Center Thickness, then (since quick 261019-gqo, 2026-10-19) Nose Tip and Tail Tip, with or without a
 *   blank. The separate CENTER THICKNESS section is gone.
 * - With no blank picked, the old ROCKER and THICKNESS sections are ONE `Rocker & Foil` section: the intro
 *   `Hand-set until you pick a blank.` and a grid — a ROCKER and a THICKNESS column, a NOSE group (Tip, then
 *   @ 12") and a TAIL group (@ 12", then Tip) — each cell a value box over its own named slider; since
 *   261019-gqo the two Tip rows have a rocker cell only, six cells in all.
 * - With a blank picked, THICKNESS is simply `Foil`: the intro, `Pin tip to`, the two Thinning Starts and a
 *   closed `Advanced` fold holding `Fine tune from`, the two 12" fine-tunes and Reset Fine-Tune; Placement and
 *   Deck Skin sit in the Blank section; the grid is not there.
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
  "nose-12-rocker",
  "nose-12-thickness",
  "tail-12-rocker",
  "tail-12-thickness",
  "tail-tip-rocker",
] as const;

test.describe("ROCKER's side panel on a computer (quick 261017-vdh)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the computer's own layout; the phones have their own describe");
    await dismissChrome(page);
  });

  test("with no blank: Inputs first with three thickness sliders, then one Rocker & Foil table of six named, boxed sliders", async ({ page }) => {
    await openRocker(page);
    const side = aside(page);

    // INPUTS: the heading, the TEMPLATE line, Center Thickness, Nose Tip and Tail Tip — and nothing of the old sections.
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
    await expect(inputs.getByText('Nose Tip — 1/2"', { exact: true })).toBeVisible();
    await expect(inputs.getByText('Tail Tip — 5/8"', { exact: true })).toBeVisible();
    await expect(sliderNamed(page, "Center Thickness")).toHaveCount(1);
    await expect(sliderNamed(page, "Nose Tip Thickness")).toHaveCount(1);
    await expect(sliderNamed(page, "Tail Tip Thickness")).toHaveCount(1);
    await expect(inputs.locator('[data-slot="slider-thumb"] input[type="range"]')).toHaveCount(3);
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

    // Six sliders by name, with the default board's value boxes; the tip thicknesses are INPUTS' sliders now.
    const expected: Array<[string, string, string]> = [
      ["Nose tip rocker", "nose-tip-rocker", '4 1/2"'],
      ['Nose 12" rocker', "nose-12-rocker", '1 1/4"'],
      ['Nose 12" thickness', "nose-12-thickness", '1 5/16"'],
      ['Tail 12" rocker', "tail-12-rocker", '3/8"'],
      ['Tail 12" thickness', "tail-12-thickness", '1 9/16"'],
      ["Tail tip rocker", "tail-tip-rocker", '2"'],
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
    const rockerCell = await cellBox(page, "nose-12-rocker").boundingBox();
    const thicknessCell = await cellBox(page, "nose-12-thickness").boundingBox();
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
    // The tip thicknesses are not grid cells any more.
    await expect(page.locator('[data-hand-set-cell$="tip-thickness"]')).toHaveCount(0);
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
    await expect(page.locator("[data-rocker-inputs]").getByText("Nose Tip — 13 mm", { exact: true })).toBeVisible();
    await expect(sliderNamed(page, "Nose 30.5 cm rocker")).toHaveCount(1);
    await expect(sliderNamed(page, "Tail 30.5 cm thickness")).toHaveCount(1);
  });

  test("with a blank: Blank holds the picker, Placement, Deck Skin and the passes line; Foil is Pin tip to, the two starts and a closed Advanced fold", async ({
    page,
  }) => {
    await openRocker(page);
    await pickFirstFittingBlank(page);
    const side = aside(page);

    await expect(side.getByRole("button", { name: /^Foil\s*[▾▸]$/ })).toBeVisible();
    await expect(side.getByRole("button", { name: /^Rocker & Foil\s*[▾▸]$/ })).toHaveCount(0);
    await expect(side.getByRole("button", { name: /^Thickness\s*[▾▸]$/ })).toHaveCount(0);
    await expect(side.getByRole("button", { name: /^Board on Blank\s*[▾▸]$/ })).toHaveCount(0);
    await expect(side.getByText("Board on Blank", { exact: true })).toHaveCount(0);
    await expect(sliderNamed(page, "Nose tip rocker")).toHaveCount(0);
    await expect(page.locator("[data-hand-set-cell]")).toHaveCount(0);
    // INPUTS is still first, with its line and the three thickness sliders.
    await expect(page.locator("[data-rocker-inputs]").getByText("Inputs", { exact: true })).toBeVisible();

    // Top to bottom: the three INPUTS thicknesses, the Blank section (picker, Placement, Deck Skin, the
    // full-passes line), then Foil's heading, Pin tip to, the two starts and the Advanced fold heading.
    const foilHeading = side.getByRole("button", { name: /^Foil\s*[▾▸]$/ });
    const order = [
      side.getByText(/^Center Thickness — /),
      side.getByText(/^Nose Tip — /),
      side.getByText(/^Tail Tip — /),
      page.locator("[data-blank-button]"),
      side.getByText(/^Placement — /),
      side.getByText(/^Deck Skin — /),
      page.locator("[data-full-passes]"),
      foilHeading,
      side.getByText("Pin tip to", { exact: true }),
      side.getByText(/^Nose Thinning Starts — /),
      side.getByText(/^Tail Thinning Starts — /),
      side.getByRole("button", { name: /^Advanced\s*[▾▸]$/ }),
    ];
    let previous = -Infinity;
    for (const label of order) {
      await expect(label).toBeVisible();
      const box = await label.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.y).toBeGreaterThan(previous);
      previous = box!.y;
    }

    // Pin tip to: Deck is pressed on a new board.
    const pinGroup = side.getByRole("group", { name: "Pin tip to" });
    await expect(pinGroup.getByRole("button", { name: "Deck", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(pinGroup.getByRole("button", { name: "Bottom", exact: true })).toHaveAttribute("aria-pressed", "false");

    // Advanced is closed on arrival: no Fine tune from pair, no 12" fine-tune rows.
    const advanced = side.getByRole("button", { name: /^Advanced\s*[▾▸]$/ });
    await expect(advanced).toContainText("▸");
    await expect(side.getByRole("group", { name: "Fine tune from" })).toHaveCount(0);
    await expect(side.getByText(/^Nose @ 12" — /)).toHaveCount(0);

    // One click opens it: Fine tune from (Deck by default), Nose @ 12", Tail @ 12", then Reset Fine-Tune.
    await advanced.click();
    await expect(advanced).toContainText("▾");
    const fineGroup = side.getByRole("group", { name: "Fine tune from" });
    await expect(fineGroup.getByRole("button", { name: "Deck", exact: true })).toHaveAttribute("aria-pressed", "true");
    const fold = [
      fineGroup,
      side.getByText(/^Nose @ 12" — /),
      side.getByText(/^Tail @ 12" — /),
      side.getByRole("button", { name: "↺ Reset Fine-Tune" }),
    ];
    previous = (await advanced.boundingBox())!.y;
    for (const row of fold) {
      await expect(row).toBeVisible();
      const box = await row.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.y).toBeGreaterThan(previous);
      previous = box!.y;
    }

    // A second click hides them again.
    await advanced.click();
    await expect(side.getByRole("group", { name: "Fine tune from" })).toHaveCount(0);
    await expect(side.getByText(/^Nose @ 12" — /)).toHaveCount(0);

    // The shared helper opens it, and does not close it when called on an open fold.
    await openFoilAdvanced(page);
    await openFoilAdvanced(page);
    await expect(side.getByText(/^Nose @ 12" — /)).toBeVisible();
  });
});

test.describe("ROCKER's Rocker & Foil table on a phone (quick 261017-vdh)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "the phone projects, at their own viewports");
    await dismissChrome(page);
  });

  test("all six thumbs can be reached and the side panel never scrolls sideways", async ({ page }) => {
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
