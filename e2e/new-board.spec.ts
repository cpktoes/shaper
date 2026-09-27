import { expect, test, type Locator, type Page } from "@playwright/test";
import { DEFAULT_FOIL_SPEC } from "../lib/geometry/foil";
import { formatMark } from "../lib/geometry/measure-display";

/**
 * 11-10: how a new board starts.
 *
 * 1. D-19 — a brand-new board nobody has touched follows the gear menu's Fit & Tip Defaults: set
 *    Nose Tip Thickness there and the ROCKER screen's Nose Tip reads it at once. The first edit
 *    (here, one keyboard nudge of the Tail Tip slider) makes the tips the board's own, so a later
 *    change to the default leaves the board alone (D-09).
 * 2. D-03 — a preset opens sitting in its (provisional) blank: after Shortboard, the ROCKER drawing
 *    shows the blank's silhouette and the DATASHEET has a `BLANK — …` group.
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

    // Client-side, through whichever ROCKER link this layout shows (the desktop nav or the phone
    // tab bar); dispatchEvent sidesteps the dev server's own corner overlay (phone-trip.spec.ts).
    const rockerLink = page.getByRole("link", { name: "ROCKER", exact: true }).filter({ visible: true }).first();
    await rockerLink.dispatchEvent("click");
    await page.waitForURL("**/design/rocker");

    await expect(page.locator("[data-blank-silhouette]").first()).toBeAttached();

    await page.getByRole("tab", { name: "DATASHEET" }).click();
    await expect(page.getByText(/^BLANK — /)).toBeVisible();
  });
});
