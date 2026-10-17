import { expect, test, type Page } from "@playwright/test";
import {
  blankRockerLine,
  customizeRockerButton,
  customRockerDialog,
  openCustomizeRocker,
  openRocker,
  pickFirstFittingBlank,
} from "./helpers/blank-picker";

/**
 * ROCKER's Customize Rocker popup (quick 261016-mkb, sketch 016 D — the founder's pick, 2026-10-16):
 * the button under the blank card opens a popup where a shaper sets the blank's rocker the way they
 * order it from the maker, sees what each change does to the foam, and keeps it as a starred blank
 * of their own; the BLANK button then names the blank on two lines, its rocker under its name.
 *
 * Every browser test is signed out (Clerk never settles on the suite's fake keys), so the saved
 * blanks are this browser's own list; the account's path is proved by the unit tests. Never types a
 * catalogue name or figure: every one is read off the page.
 */

const SAVED_BLANKS_KEY = "shaper-saved-blanks";
const STARRED_BLANKS_KEY = "shaper-starred-blanks";
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

/** A localStorage value parsed, or null. */
async function stored(page: Page, key: string): Promise<unknown> {
  return page.evaluate((k) => {
    const raw = window.localStorage.getItem(k);
    return raw === null ? null : JSON.parse(raw);
  }, key);
}

test.describe("Customize Rocker on a computer", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the computer's own window");
    await dismissChrome(page);
  });

  test("one nose slider bends the blank; Use and save as a new blank keeps it, stars it and names it under the blank", async ({ page }) => {
    await openRocker(page);
    const name = await pickFirstFittingBlank(page);
    await expect(blankRockerLine(page)).toHaveText("Natural");
    await expect(customizeRockerButton(page)).toContainText("Customize Rocker");

    const dialog = await openCustomizeRocker(page);
    await expect(dialog.getByRole("heading", { name: "Customize Rocker" })).toBeVisible();
    // The maker, read off the header: everything before ` {name} · Natural`.
    const note = (await dialog.locator("[data-customize-rocker-note]").innerText()).trim();
    const suffix = ` ${name} · Natural`;
    expect(note.endsWith(suffix)).toBe(true);
    const vendor = note.slice(0, note.length - suffix.length);
    expect(vendor.length).toBeGreaterThan(0);

    const thumb = dialog.getByRole("slider", { name: "Nose rocker change" });
    await thumb.focus();
    for (let i = 0; i < 8; i++) await page.keyboard.press("ArrowRight");
    await dialog.getByRole("button", { name: "Use and save as a new blank" }).click();

    await expect(customRockerDialog(page)).toBeHidden();
    await expect(blankRockerLine(page)).toHaveText('+1/2"N');
    await expect(customizeRockerButton(page)).toContainText("Edit Custom Rocker");
    const saved = (await stored(page, SAVED_BLANKS_KEY)) as unknown[];
    expect(saved).toHaveLength(1);
    expect(await stored(page, STARRED_BLANKS_KEY)).toEqual([[vendor, `${name} +1/2"N`]]);
  });
});
