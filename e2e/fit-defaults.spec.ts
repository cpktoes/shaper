import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * 11-08 (D-09): the gear menu's Fit & Tip Defaults row and the dialog it opens, proved in a real
 * browser on all three projects — the desktop gear (`Settings`) and the phone top bar's single
 * `Menu` both reach it, because the phone menu renders the same settings content.
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

const FIELD_LABELS = [
  "Extra Length",
  "Extra Center Thickness",
  "Width Margin",
  "Nose Tip Thickness",
  "Tail Tip Thickness",
] as const;

const IMPERIAL_DEFAULTS = ['2"', '3/8"', '1"', '5/16"', '1/4"'];
const METRIC_DEFAULTS = ["51 mm", "10 mm", "25 mm", "8 mm", "6 mm"];

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

/** The dialog opens with a zoom-in animation; a box read mid-animation is a frame short of its
 * settled size (the same wait `phone-dialogs.spec.ts` uses). */
async function settled(locator: Locator) {
  await locator.evaluate(async (el) => {
    await Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished.catch(() => undefined)));
  });
}

/** A control's laid-out height. Read from `offsetHeight` rather than a bounding box: the dialog
 * is centred with a half-size translate, which can land it on a fractional pixel and read a 44px
 * field back as 43.99997px — a layout size is what "44px tall" means. */
async function layoutHeight(locator: Locator): Promise<number> {
  return locator.evaluate((el) => (el as HTMLElement).offsetHeight);
}

/** The desktop nav's gear, or the phone top bar's one Menu button — whichever this project shows. */
function menuTrigger(page: Page, projectName: string): Locator {
  return projectName === "desktop"
    ? page.getByRole("button", { name: "Settings" })
    : page.getByRole("banner").getByRole("button", { name: "Menu" });
}

/** Opens the menu and returns the Fit & Tip Defaults row. Retried, because a click that lands
 * before the page has hydrated does nothing — and only clicked again while the menu is still
 * closed, so a retry can never toggle an open menu shut. */
async function openMenuRow(page: Page, projectName: string): Promise<Locator> {
  const trigger = menuTrigger(page, projectName);
  const row = page.getByRole("menuitem", { name: /Fit & Tip Defaults/ });
  await expect(trigger).toBeVisible();
  await expect(async () => {
    if (!(await row.isVisible())) await trigger.click();
    await expect(row).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 20_000 });
  return row;
}

async function openDialog(page: Page, projectName: string): Promise<Locator> {
  const row = await openMenuRow(page, projectName);
  await row.click();
  const dialog = page.getByRole("dialog", { name: "Fit & Tip Defaults" });
  await expect(dialog).toBeVisible();
  await settled(dialog);
  return dialog;
}

async function expectFieldValues(dialog: Locator, values: string[]) {
  for (const [index, label] of FIELD_LABELS.entries()) {
    await expect(dialog.getByRole("textbox", { name: label, exact: true })).toHaveValue(values[index]);
  }
}

test.describe("Fit & Tip Defaults — the gear menu's BLANKS row and its dialog", () => {
  test.beforeEach(async ({ page }) => {
    await dismissBannerAndTip(page);
  });

  test("the row opens the dialog, which shows every group, hint and default", async ({ page }, testInfo) => {
    await page.goto("/design/outline");
    const row = await openMenuRow(page, testInfo.project.name);
    await expect(row).toContainText("Spare foam and tip thickness");
    await row.click();

    const dialog = page.getByRole("dialog", { name: "Fit & Tip Defaults" });
    await expect(dialog).toBeVisible();
    // The menu closed behind it — the row is one tap, not a second menu level.
    await expect(page.getByRole("menuitem", { name: /Fit & Tip Defaults/ })).toBeHidden();

    await expect(dialog.getByText("WHICH BLANKS FIT")).toBeVisible();
    await expect(dialog.getByText("NEW BOARDS START WITH")).toBeVisible();
    await expect(dialog.getByText("Boards you've already started keep their own tips.")).toBeVisible();
    await expectFieldValues(dialog, IMPERIAL_DEFAULTS);
    await expect(dialog.getByRole("button", { name: "Restore Defaults" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Done" })).toBeVisible();
  });

  test("a committed value applies at once, survives a reload, and Restore Defaults brings back the default", async ({
    page,
  }, testInfo) => {
    await page.goto("/design/outline");
    let dialog = await openDialog(page, testInfo.project.name);

    const extraLength = dialog.getByRole("textbox", { name: "Extra Length", exact: true });
    await extraLength.fill("3");
    await extraLength.press("Enter");
    await expect(extraLength).toHaveValue('3"');
    // Only that field moved; the other four still read their defaults.
    await expectFieldValues(dialog, ['3"', ...IMPERIAL_DEFAULTS.slice(1)]);

    await dialog.getByRole("button", { name: "Done" }).click();
    await expect(dialog).toBeHidden();

    // Remembered by the browser in both places: localStorage for this tab, and the cookie the
    // server reads so the next page draws the right value from its very first frame.
    const cookie = (await page.context().cookies()).find((c) => c.name === "shaper-fit-defaults");
    expect(cookie, "the shaper-fit-defaults cookie was written").toBeDefined();
    expect(JSON.parse(decodeURIComponent(cookie!.value)).extraLength).toBeCloseTo(76.2, 6);

    await page.reload();
    dialog = await openDialog(page, testInfo.project.name);
    await expect(dialog.getByRole("textbox", { name: "Extra Length", exact: true })).toHaveValue('3"');

    await dialog.getByRole("button", { name: "Restore Defaults" }).click();
    await expectFieldValues(dialog, IMPERIAL_DEFAULTS);

    // Restored means "not chosen" everywhere — a second reload still reads the default.
    await dialog.getByRole("button", { name: "Done" }).click();
    await page.reload();
    dialog = await openDialog(page, testInfo.project.name);
    await expectFieldValues(dialog, IMPERIAL_DEFAULTS);
  });

  test("in Metric every default reads in whole millimetres", async ({ page }, testInfo) => {
    await setMetricUnits(page);
    await page.goto("/design/outline");
    const dialog = await openDialog(page, testInfo.project.name);
    await expectFieldValues(dialog, METRIC_DEFAULTS);
  });

  test("passing through a field without changing it stores nothing", async ({ page }, testInfo) => {
    // Metric is the case that matters: a field only shows whole millimetres, so re-committing the
    // 2" default it shows as 51 mm would store 51 mm where nobody chose anything.
    await setMetricUnits(page);
    await page.goto("/design/outline");
    const dialog = await openDialog(page, testInfo.project.name);
    for (const label of FIELD_LABELS) {
      await dialog.getByRole("textbox", { name: label, exact: true }).click();
    }
    await dialog.getByRole("button", { name: "Done" }).click();
    await expect(dialog).toBeHidden();

    expect(await page.evaluate(() => window.localStorage.getItem("shaper-fit-defaults"))).toBeNull();
    const cookies = await page.context().cookies();
    expect(cookies.find((cookie) => cookie.name === "shaper-fit-defaults")).toBeUndefined();
  });

  test("on a phone the menu row, every field and Restore Defaults are at least 44px tall", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "touch-only sizing assertions");
    await page.goto("/design/outline");

    const row = await openMenuRow(page, testInfo.project.name);
    expect(await layoutHeight(row), "menu row height").toBeGreaterThanOrEqual(44);

    await row.click();
    const dialog = page.getByRole("dialog", { name: "Fit & Tip Defaults" });
    await expect(dialog).toBeVisible();
    await settled(dialog);

    for (const label of FIELD_LABELS) {
      const field = dialog.getByRole("textbox", { name: label, exact: true });
      expect(await layoutHeight(field), `${label} field height`).toBeGreaterThanOrEqual(44);
    }
    const restore = dialog.getByRole("button", { name: "Restore Defaults" });
    expect(await layoutHeight(restore), "Restore Defaults height").toBeGreaterThanOrEqual(44);

    // Done stays reachable inside the viewport — the dialog scrolls rather than running off it.
    const done = dialog.getByRole("button", { name: "Done" });
    await done.scrollIntoViewIfNeeded();
    await expect(done).toBeInViewport();
  });
});
