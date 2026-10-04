import { expect, test, type Locator, type Page } from "@playwright/test";
import { DEFAULT_FIT_DEFAULTS, FIT_DEFAULTS_MM_KEYS } from "../lib/fit-defaults-preference";
import { formatMark } from "../lib/geometry/measure-display";
import { appSettingsDialog, appSettingsRow, openAppSettings, openSettingsMenu, settled } from "./helpers/settings";

/**
 * 11-08 (D-09): the fit and tip defaults, proved in a real browser on all three projects. Since
 * quick 261003-uwi they are the fit part of App Default Settings — the pop-up the one "App Default
 * Settings" row opens from the desktop gear (`Settings`) or the phone top bar's single `Menu`
 * (e2e/helpers/settings.ts reaches it either way). Phase 12 (12-03)
 * replaced Phase 11's extra-centre-thickness rule with Planer Max Depth and added Deck Skin to the
 * number rows; 12-04 added the Tip Style default (Pin deck / Bottom) as the last row.
 *
 * This suite runs signed out on fake Clerk keys (Clerk never settles, so nothing sign-in-gated is
 * reachable), so what it proves is the browser path: a committed value is remembered by the
 * browser (localStorage plus the cookie the server reads for the next first paint) and is back
 * after a reload. The account round-trip is covered by the unit tests of the handoff and the
 * Server Action, and by the end-of-phase walk-through signed in.
 */

const BANNER_DISMISSAL_KEY = "shaper-sign-in-banner-dismissed";
const TOOLBAR_TIP_DISMISSAL_KEY = "shaper-toolbar-tip-dismissed";
const UNITS_STORAGE_KEY = "shaper-units";

/** The dialog's six number rows, in order (12-UI-SPEC §6): the three fit rules, then Deck Skin and
 * the two tips. Planer Max Depth sits in the retired centre-thickness rule's old place. */
const FIELD_LABELS = [
  "Extra Length",
  "Planer Max Depth",
  "Width Margin",
  "Deck Skin",
  "Nose Tip Thickness",
  "Tail Tip Thickness",
] as const;

/** The decided defaults, in the dialog's row order: the fit rules and the 1/8" pass and skin
 * (Phase 11 D-04/D-05/D-09, Phase 12 D-02/D-03), then the founder's 1/2" nose tip and 5/8" tail tip
 * (2026-09-26, quick task 260926-uub). Read from `DEFAULT_FIT_DEFAULTS` through the same formatter
 * the dialog itself uses, so a changed default moves these with it rather than leaving them stale. */
const IMPERIAL_DEFAULTS = FIT_DEFAULTS_MM_KEYS.map((key) => formatMark(DEFAULT_FIT_DEFAULTS[key], "imperial"));
const METRIC_DEFAULTS = FIT_DEFAULTS_MM_KEYS.map((key) => formatMark(DEFAULT_FIT_DEFAULTS[key], "metric"));

/** The same dismissals as `touch-sizing.spec.ts`, set before navigation so neither strip ever
 * sits over the menu or the dialog. */
async function dismissBannerAndTip(page: Page) {
  await page.addInitScript((key) => {
    window.sessionStorage.setItem(key, "true");
  }, BANNER_DISMISSAL_KEY);
  await page.addInitScript((key) => {
    window.localStorage.setItem(key, "true");
  }, TOOLBAR_TIP_DISMISSAL_KEY);
}

async function setMetricUnits(page: Page) {
  await page.addInitScript((key) => {
    window.localStorage.setItem(key, "metric");
  }, UNITS_STORAGE_KEY);
}

/** A control's laid-out height. Read from `offsetHeight` rather than a bounding box: the dialog
 * is centred with a half-size translate, which can land it on a fractional pixel and read a 44px
 * field back as 43.99997px — a layout size is what "44px tall" means. */
async function layoutHeight(locator: Locator): Promise<number> {
  return locator.evaluate((el) => (el as HTMLElement).offsetHeight);
}

/** The pop-up's fit part — WHICH BLANKS FIT and NEW BOARDS START WITH — so a text lookup never
 * matches the UNITS, THEME or BLANK MAKERS rows above it. */
function fitPart(dialog: Locator): Locator {
  return dialog.locator("[data-app-settings-fit]");
}

const RESTORE = { name: "Restore Fit & Tip Defaults", exact: true } as const;

/** The Tip Style row's two pills, found through the pair's own group name (12-UI-SPEC §4/§6). */
function tipStylePills(dialog: Locator) {
  const group = dialog.getByRole("group", { name: "Tip Style" });
  return {
    group,
    pinDeck: group.getByRole("button", { name: "Pin deck", exact: true }),
    bottom: group.getByRole("button", { name: "Bottom", exact: true }),
  };
}

/** Exactly one pill is on, and it is the one named. */
async function expectTipStyle(dialog: Locator, shown: "Pin deck" | "Bottom") {
  const { pinDeck, bottom } = tipStylePills(dialog);
  await expect(pinDeck).toHaveAttribute("aria-pressed", shown === "Pin deck" ? "true" : "false");
  await expect(bottom).toHaveAttribute("aria-pressed", shown === "Bottom" ? "true" : "false");
}

async function expectFieldValues(dialog: Locator, values: string[]) {
  for (const [index, label] of FIELD_LABELS.entries()) {
    await expect(dialog.getByRole("textbox", { name: label, exact: true })).toHaveValue(values[index]);
  }
}

test.describe("Fit & Tip Defaults — the fit part of App Default Settings", () => {
  test.beforeEach(async ({ page }) => {
    await dismissBannerAndTip(page);
  });

  test("the App Default Settings row opens the pop-up, whose fit part shows every group, hint and default", async ({
    page,
  }) => {
    await page.goto("/design/outline");
    await openSettingsMenu(page);
    const row = appSettingsRow(page);
    await expect(row).toContainText("Units, theme, blank makers, fit and tips");
    await row.click();

    const dialog = appSettingsDialog(page);
    await expect(dialog).toBeVisible();
    // The menu closed behind it — the row is one tap, not a second menu level.
    await expect(appSettingsRow(page)).toBeHidden();

    const fit = fitPart(dialog);
    await expect(fit.getByText("WHICH BLANKS FIT")).toBeVisible();
    await expect(fit.getByText("NEW BOARDS START WITH")).toBeVisible();
    await expect(fit.getByText("Boards you've already started keep their own.")).toBeVisible();
    await expectFieldValues(dialog, IMPERIAL_DEFAULTS);
    // Tip Style is the last row of NEW BOARDS START WITH, and nothing chosen reads Pin deck (D-04).
    await expect(fit.getByText("Pin deck takes the tips' extra off the bottom; Bottom takes it off the deck.")).toBeVisible();
    await expect(tipStylePills(dialog).group).toBeVisible();
    await expectTipStyle(dialog, "Pin deck");
    // The retired rule is gone from everything a shaper can read (D-10).
    await expect(dialog.getByText("Extra Center Thickness")).toHaveCount(0);
    await expect(dialog.getByRole("button", RESTORE)).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Done" })).toBeVisible();
  });

  test("a committed value applies at once, survives a reload, and Restore Fit & Tip Defaults brings back the default", async ({
    page,
  }) => {
    await page.goto("/design/outline");
    let dialog = await openAppSettings(page);

    const extraLength = dialog.getByRole("textbox", { name: "Extra Length", exact: true });
    await extraLength.fill("3");
    await extraLength.press("Enter");
    await expect(extraLength).toHaveValue('3"');
    // Only that field moved; the other five still read their defaults.
    await expectFieldValues(dialog, ['3"', ...IMPERIAL_DEFAULTS.slice(1)]);

    await dialog.getByRole("button", { name: "Done" }).click();
    await expect(dialog).toBeHidden();

    // Remembered by the browser in both places: localStorage for this tab, and the cookie the
    // server reads so the next page draws the right value from its very first frame.
    const cookie = (await page.context().cookies()).find((c) => c.name === "shaper-fit-defaults");
    expect(cookie, "the shaper-fit-defaults cookie was written").toBeDefined();
    expect(JSON.parse(decodeURIComponent(cookie!.value)).extraLength).toBeCloseTo(76.2, 6);

    await page.reload();
    dialog = await openAppSettings(page);
    await expect(dialog.getByRole("textbox", { name: "Extra Length", exact: true })).toHaveValue('3"');

    await dialog.getByRole("button", RESTORE).click();
    await expectFieldValues(dialog, IMPERIAL_DEFAULTS);

    // Restored means "not chosen" everywhere — a second reload still reads the default.
    await dialog.getByRole("button", { name: "Done" }).click();
    await page.reload();
    dialog = await openAppSettings(page);
    await expectFieldValues(dialog, IMPERIAL_DEFAULTS);
  });

  test("a typed Planer Max Depth and Deck Skin survive a reload, and Restore Fit & Tip Defaults returns both to 1/8\"", async ({
    page,
  }) => {
    await page.goto("/design/outline");
    let dialog = await openAppSettings(page);

    const planer = () => dialog.getByRole("textbox", { name: "Planer Max Depth", exact: true });
    const skin = () => dialog.getByRole("textbox", { name: "Deck Skin", exact: true });
    await planer().fill("3/16");
    await planer().press("Enter");
    await expect(planer()).toHaveValue('3/16"');
    await skin().fill("1/4");
    await skin().press("Enter");
    await expect(skin()).toHaveValue('1/4"');
    await dialog.getByRole("button", { name: "Done" }).click();
    await expect(dialog).toBeHidden();

    await page.reload();
    dialog = await openAppSettings(page);
    await expect(planer()).toHaveValue('3/16"');
    await expect(skin()).toHaveValue('1/4"');

    await dialog.getByRole("button", RESTORE).click();
    await expectFieldValues(dialog, IMPERIAL_DEFAULTS);
    await expect(planer()).toHaveValue('1/8"');
    await expect(skin()).toHaveValue('1/8"');
  });

  test("Tip Style: a tap on Bottom applies at once, survives a reload, and Restore Fit & Tip Defaults returns Pin deck", async ({
    page,
  }) => {
    await page.goto("/design/outline");
    let dialog = await openAppSettings(page);
    await expectTipStyle(dialog, "Pin deck");

    await tipStylePills(dialog).bottom.click();
    await expectTipStyle(dialog, "Bottom");
    // Only Tip Style moved; every number still reads its default.
    await expectFieldValues(dialog, IMPERIAL_DEFAULTS);

    await dialog.getByRole("button", { name: "Done" }).click();
    await expect(dialog).toBeHidden();

    // Remembered by the browser: the cookie the server reads for the next first paint holds it.
    const cookie = (await page.context().cookies()).find((c) => c.name === "shaper-fit-defaults");
    expect(cookie, "the shaper-fit-defaults cookie was written").toBeDefined();
    expect(JSON.parse(decodeURIComponent(cookie!.value)).tipStyle).toBe("bottom");

    await page.reload();
    dialog = await openAppSettings(page);
    await expectTipStyle(dialog, "Bottom");

    await dialog.getByRole("button", RESTORE).click();
    await expectTipStyle(dialog, "Pin deck");

    // Restored means "not chosen" — a second reload still reads Pin deck.
    await dialog.getByRole("button", { name: "Done" }).click();
    await page.reload();
    dialog = await openAppSettings(page);
    await expectTipStyle(dialog, "Pin deck");
  });

  test("in Metric every default reads in whole millimetres", async ({ page }) => {
    await setMetricUnits(page);
    await page.goto("/design/outline");
    const dialog = await openAppSettings(page);
    await expectFieldValues(dialog, METRIC_DEFAULTS);

    // Restore Fit & Tip Defaults resets only the seven fit and tip values — Metric stays chosen.
    const extraLength = dialog.getByRole("textbox", { name: "Extra Length", exact: true });
    await extraLength.fill("80");
    await extraLength.press("Enter");
    await expect(extraLength).not.toHaveValue(METRIC_DEFAULTS[0]);
    await dialog.getByRole("button", RESTORE).click();
    await expectFieldValues(dialog, METRIC_DEFAULTS);
    const units = dialog.getByRole("group", { name: "Units" });
    await expect(units.getByRole("button", { name: /^Metric/ })).toHaveAttribute("aria-pressed", "true");
    expect(await page.evaluate(() => window.localStorage.getItem("shaper-units"))).toBe("metric");
  });

  test("passing through a field without changing it stores nothing", async ({ page }) => {
    // Metric is the case that matters: a field only shows whole millimetres, so re-committing the
    // 2" default it shows as 51 mm would store 51 mm where nobody chose anything.
    await setMetricUnits(page);
    await page.goto("/design/outline");
    const dialog = await openAppSettings(page);
    for (const label of FIELD_LABELS) {
      await dialog.getByRole("textbox", { name: label, exact: true }).click();
    }
    // Tapping the Tip Style already shown (Pin deck, nothing chosen) stores nothing either.
    await tipStylePills(dialog).pinDeck.click();
    await expectTipStyle(dialog, "Pin deck");
    await dialog.getByRole("button", { name: "Done" }).click();
    await expect(dialog).toBeHidden();

    expect(await page.evaluate(() => window.localStorage.getItem("shaper-fit-defaults"))).toBeNull();
    const cookies = await page.context().cookies();
    expect(cookies.find((cookie) => cookie.name === "shaper-fit-defaults")).toBeUndefined();
  });

  test("on a phone the App Default Settings row, every field, both Tip Style pills and Restore Fit & Tip Defaults are at least 44px tall", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "touch-only sizing assertions");
    await page.goto("/design/outline");

    await openSettingsMenu(page);
    const row = appSettingsRow(page);
    expect(await layoutHeight(row), "menu row height").toBeGreaterThanOrEqual(44);

    await row.click();
    const dialog = appSettingsDialog(page);
    await expect(dialog).toBeVisible();
    await settled(dialog);

    for (const label of FIELD_LABELS) {
      const field = dialog.getByRole("textbox", { name: label, exact: true });
      expect(await layoutHeight(field), `${label} field height`).toBeGreaterThanOrEqual(44);
    }
    const { pinDeck, bottom } = tipStylePills(dialog);
    expect(await layoutHeight(pinDeck), "Pin deck pill height").toBeGreaterThanOrEqual(44);
    expect(await layoutHeight(bottom), "Bottom pill height").toBeGreaterThanOrEqual(44);
    const restore = dialog.getByRole("button", RESTORE);
    expect(await layoutHeight(restore), "Restore Fit & Tip Defaults height").toBeGreaterThanOrEqual(44);

    // Done stays reachable inside the viewport — the dialog scrolls rather than running off it.
    const done = dialog.getByRole("button", { name: "Done" });
    await done.scrollIntoViewIfNeeded();
    await expect(done).toBeInViewport();
  });
});
