import { expect, test, type Locator, type Page } from "@playwright/test";
import { goToScreen } from "./helpers/screens";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DEFAULT_FOIL_SPEC } from "../lib/geometry/foil";
import { formatDimBare, formatMark, formatMarkBare } from "../lib/geometry/measure-display";
import { mm } from "../lib/geometry/units";

/**
 * 11-10: how a new board starts.
 *
 * 1. D-19 — a brand-new board nobody has touched follows the gear menu's Fit & Tip Defaults: set
 *    Nose Tip Thickness there and the ROCKER screen's Nose Tip reads it at once. The first edit
 *    (here, one keyboard nudge of the Tail Tip slider) makes the tips the board's own, so a later
 *    change to the default leaves the board alone (D-09).
 * 2. D-03 — a preset opens sitting in its blank: after Shortboard, the ROCKER drawing shows the
 *    blank's silhouette and the DATASHEET has a `BLANK — …` group.
 * 3. Quick 261003-n52 — the Longboard's DATASHEET reads its blank's own catalogue numbers (page 61
 *    of the US Blanks catalogue — the 9'4"B, the Longboard's blank since 2026-10-03), and its Your
 *    Board and Foam Off rows read the app's own figures for that board.
 * 4. Quick 261003-n52 — the same BLANK rows in Metric: whole millimetres for Rocker and Thickness,
 *    centimetres to one decimal for Width.
 *
 * Helpers are copied locally, as every spec in this suite does (`fit-defaults.spec.ts` for the
 * dialog, `undo-redo.spec.ts` for keyboard slider input, `phone-trip.spec.ts` for tapping the tab
 * bar). The store lives in memory, so every move between screens after a preset pick is a
 * client-side link click — a `goto` would reload the page and lose the board.
 */

const BANNER_DISMISSAL_KEY = "shaper-sign-in-banner-dismissed";
const TOOLBAR_TIP_DISMISSAL_KEY = "shaper-toolbar-tip-dismissed";

async function dismissBannerAndTip(page: Page) {
  await page.addInitScript((key) => {
    window.sessionStorage.setItem(key, "true");
  }, BANNER_DISMISSAL_KEY);
  await page.addInitScript((key) => {
    window.localStorage.setItem(key, "true");
  }, TOOLBAR_TIP_DISMISSAL_KEY);
}

/** The desktop nav's gear, or the phone top bar's one Menu button — whichever this project shows. */
function menuTrigger(page: Page, projectName: string): Locator {
  return projectName === "desktop"
    ? page.getByRole("button", { name: "Settings" })
    : page.getByRole("banner").getByRole("button", { name: "Menu" });
}

/** Opens Fit & Tip Defaults from the menu. The menu click is retried until the row shows, because
 * a click that lands before hydration does nothing — never clicked again while the row is open. */
async function openFitDefaults(page: Page, projectName: string): Promise<Locator> {
  const trigger = menuTrigger(page, projectName);
  const row = page.getByRole("menuitem", { name: /Fit & Tip Defaults/ });
  await expect(trigger).toBeVisible();
  await expect(async () => {
    if (!(await row.isVisible())) await trigger.click();
    await expect(row).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 20_000 });
  await row.click();
  const dialog = page.getByRole("dialog", { name: "Fit & Tip Defaults" });
  await expect(dialog).toBeVisible();
  return dialog;
}

/** Types a Nose Tip Thickness default, commits it with Enter, and closes the dialog with Done. */
async function setNoseTipDefault(page: Page, projectName: string, value: string) {
  const dialog = await openFitDefaults(page, projectName);
  const field = dialog.getByRole("textbox", { name: "Nose Tip Thickness", exact: true });
  await field.fill(value);
  await field.press("Enter");
  await expect(field).toHaveValue(`${value}"`);
  await dialog.getByRole("button", { name: "Done" }).click();
  await expect(dialog).toBeHidden();
}

/** The ROCKER sidebar's THICKNESS section (its heading button's parent). */
function thicknessSection(page: Page): Locator {
  return page.getByRole("button", { name: /^Thickness\s*[▾▸]$/ }).locator("xpath=..");
}

/** The real `<input type="range">` inside a slider row's thumb — what takes keyboard focus. */
function thumbInputFor(label: Locator): Locator {
  return label.locator("xpath=..").locator('[data-slot="slider-thumb"] input[type="range"]');
}

/** From the setup screen: start the Longboard preset, go client-side to ROCKER, open the DATASHEET.
 * The Start Shaping click is retried until the outline URL shows (a click before hydration does
 * nothing); the move to ROCKER is a client-side link click because a `goto` would lose the board. */
async function openLongboardDatasheet(page: Page) {
  await page.goto("/");
  const longboard = page.getByRole("button").filter({ hasText: "Longboard" }).filter({ hasText: "Start Shaping" });
  await expect(async () => {
    await longboard.first().click();
    await page.waitForURL("**/design/outline", { timeout: 2_000 });
  }).toPass({ timeout: 20_000 });
  await goToScreen(page, "ROCKER");
  await page.getByRole("tab", { name: "DATASHEET" }).click();
}

test.describe("a new board", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "iphone", "desktop and android only (11-10's plan)");
    await dismissBannerAndTip(page);
  });

  test("an untouched board follows the tip defaults in the gear menu, until the shaper touches it (D-19)", async ({
    page,
  }, testInfo) => {
    await page.goto("/design/rocker");
    const thickness = thicknessSection(page);
    const noseTip = thickness.getByText(/^Nose Tip — /);
    const tailTip = thickness.getByText(/^Tail Tip — /);
    await expect(noseTip).toHaveText(`Nose Tip — ${formatMark(DEFAULT_FOIL_SPEC.noseTip, "imperial")}`);

    // Nobody has touched this board: a new Nose Tip default shows on it straight away.
    await setNoseTipDefault(page, testInfo.project.name, "3/8");
    await expect(noseTip).toHaveText('Nose Tip — 3/8"');

    // The first edit — one keyboard step of the Tail Tip thickness slider — starts the board.
    const tailBefore = await tailTip.textContent();
    await thumbInputFor(tailTip).focus();
    await page.keyboard.press("ArrowRight");
    await expect(tailTip).not.toHaveText(tailBefore ?? "");

    // From now on the board keeps its own tips: a new default does not reach it. 3/4" is neither
    // the board's own 3/8" nor the out-of-the-box 1/2", so typing it is plainly a new choice
    // rather than a return to the default.
    await setNoseTipDefault(page, testInfo.project.name, "3/4");
    await expect(noseTip).toHaveText('Nose Tip — 3/8"');
  });

  test("a preset opens sitting in its blank: the drawing shows the blank and the DATASHEET lists it (D-03)", async ({
    page,
  }) => {
    await page.goto("/");
    const shortboard = page.getByRole("button").filter({ hasText: "Shortboard" }).filter({ hasText: "Start Shaping" });
    await expect(async () => {
      await shortboard.first().click();
      await page.waitForURL("**/design/outline", { timeout: 2_000 });
    }).toPass({ timeout: 20_000 });

    // Client-side, the way this layout's shaper moves (the desktop nav, or the phone menu's ROCKER
    // tile), so the board in progress comes along.
    await goToScreen(page, "ROCKER");

    await expect(page.locator("[data-blank-silhouette]").first()).toBeAttached();

    await page.getByRole("tab", { name: "DATASHEET" }).click();
    await expect(page.getByText(/^BLANK — /)).toBeVisible();
  });

  test("the Longboard's DATASHEET reads its blank's own catalogue numbers, and Your Board and Foam Off are unchanged (quick 261003-n52)", async ({
    page,
  }) => {
    await openLongboardDatasheet(page);

    // The group label says which stations its rows are; the footnotes say what Foam Off is read
    // under, and the dash note stays away because the 9'4"B's file holds every value (its nose-tip
    // width is stored as 0, with the catalogue's own note that the page prints none).
    await expect(page.getByText(/^BLANK — /)).toHaveText(
      /^BLANK — US BLANKS 9'4"B\s*\(catalog's N0 · N12 · C · T12 · T0\)$/,
    );
    await expect(page.locator("[data-datasheet-foam-off-note]")).toBeVisible();
    await expect(page.locator("[data-datasheet-dash-note]")).toHaveCount(0);

    // Page 61 of the US Blanks June 2025 catalogue (the 9'4"B), nose tip to tail tip, read by eye
    // against the page on 2026-10-03. This began as the founder's own report (quick 261003-n52, on
    // the 9'3"Y) and is the one place a page's printed numbers are pinned: a 9'0" board centred in
    // this blank must not move them.
    await expect(page.locator('[data-datasheet-blank-row="rocker"] > div')).toHaveText([
      "Rocker",
      '4 3/4"',
      '2 1/2"',
      '0"',
      '2 1/8"',
      '3 1/2"',
    ]);
    await expect(page.locator('[data-datasheet-blank-row="thickness"] > div')).toHaveText([
      "Thickness",
      '1 5/16"',
      '2"',
      '3 5/16"',
      '2 1/8"',
      '1 1/2"',
    ]);
    await expect(page.locator('[data-datasheet-blank-row="width"] > div')).toHaveText([
      "Width",
      '0"',
      '20 5/16"',
      '24 7/8"',
      '16 5/16"',
      '7 1/2"',
    ]);

    // Your Board and Foam Off: the app's own figures for the 9'0" Longboard cut from the 9'4"B
    // (worked out with the app's own functions on 2026-10-03), so a change that moves them shows here.
    await expect(page.locator('[data-datasheet-board-row="rocker"] > div')).toHaveText([
      "Rocker",
      '4 5/8"',
      '2 1/4"',
      '0"',
      '1 15/16"',
      '3 5/8"',
    ]);
    await expect(page.locator('[data-datasheet-foam-off="bottom"] > div')).toHaveText([
      "Bottom",
      '7/16"',
      '3/16"',
      '3/16"',
      '3/16"',
      '9/16"',
    ]);
  });

  test("in Metric the Longboard's BLANK rows read the catalogue's numbers in millimetres and centimetres (quick 261003-n52)", async ({
    page,
  }) => {
    await page.addInitScript(() => window.localStorage.setItem("shaper-units", "metric"));
    await openLongboardDatasheet(page);

    // The expected cells are computed from the preset's own copy of the blank, never typed.
    const generated = JSON.parse(
      readFileSync(join(__dirname, "..", "lib", "blanks", "preset-blanks.generated.json"), "utf8"),
    ) as {
      picks: Record<string, { vendor: string; name: string }>;
      blanks: {
        vendor: string;
        name: string;
        stations: { label: string; rockerMm: number | null; thicknessMm: number | null; widthMm: number | null }[];
      }[];
    };
    const pick = generated.picks.longboard;
    const blank = generated.blanks.find((b) => b.vendor === pick.vendor && b.name === pick.name)!;
    const stationsNoseToTail = ["N0", "N12", "C", "T12", "T0"].map((label) => blank.stations.find((s) => s.label === label)!);

    const rocker = stationsNoseToTail.map((s) => formatMarkBare(mm(s.rockerMm!), "metric"));
    const thickness = stationsNoseToTail.map((s) => formatMarkBare(mm(s.thicknessMm!), "metric"));
    const width = stationsNoseToTail.map((s) => formatDimBare(mm(s.widthMm!), "metric"));

    await expect(page.locator('[data-datasheet-blank-row="rocker"] > div')).toHaveText(["Rocker (mm)", ...rocker]);
    await expect(page.locator('[data-datasheet-blank-row="thickness"] > div')).toHaveText([
      "Thickness (mm)",
      ...thickness,
    ]);
    await expect(page.locator('[data-datasheet-blank-row="width"] > div')).toHaveText(["Width (cm)", ...width]);

    // A unit slip cannot pass: whole millimetres for the marks, centimetres to one decimal for the width.
    for (const cell of [...rocker, ...thickness]) expect(cell).toMatch(/^\d+$/);
    for (const cell of width) expect(cell).toMatch(/^\d+\.\d$/);
  });
});
