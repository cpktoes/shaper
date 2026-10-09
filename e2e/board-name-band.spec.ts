import { expect, test, type Page } from "@playwright/test";
import { BOARD_LOCK_COPY } from "../components/design/board-lock-copy";
import { RACK_COPY } from "../components/setup/rack-config";
import { BANNER_DISMISSAL_KEY } from "../lib/models/banner-dismissal";
import { RACK_STAND_IN_ROUTE, standInRackRows } from "../lib/models/rack-stand-in";
import { TOOLBAR_TIP_DISMISSAL_KEY } from "../lib/models/toolbar-tip";
import { freshPracticeRack } from "./helpers/practice-rack";
import { goToScreen, type ScreenLabel } from "./helpers/screens";

/**
 * The board's name in the tab band (quick 261008-raw — the founder, 2026-10-08: "we need to know what
 * board we're on"): right-aligned beside the VIEWER / DATA tabs on TEMPLATE, ROCKER, RAILS, VOLUME and
 * FINS; "Untitled" until the board is saved; pressing it renames a saved board (or names and saves a
 * never-saved one); a locked board shows its padlock and can still be renamed; and on every width the
 * app supports it never pushes a tab off screen, wraps, or makes the band taller.
 *
 * Saved boards only exist on the practice rack (`/test-rack`), because this suite runs signed out with
 * no database; the practice rack keeps each test's renames and locks in the dev server's memory, per
 * session cookie (lib/rack-stand-in-server.ts), so a rename here goes through the real `renameModel`
 * action and the rack reads it back; only the database write is replaced.
 */

const STAND_INS = standInRackRows(6);
const board = (n: number) => STAND_INS[n - 1];

/** A fresh practice rack of the test's own, the sign-in banner and the toolbar tip out of the way. */
async function startPracticeRack(page: Page, save?: "fail" | "slow") {
  await page.addInitScript(
    ([bannerKey, tipKey]) => {
      window.sessionStorage.setItem(bannerKey, "true");
      window.localStorage.setItem(tipKey, "true");
    },
    [BANNER_DISMISSAL_KEY, TOOLBAR_TIP_DISMISSAL_KEY] as const,
  );
  await freshPracticeRack(page, save);
}

/** Opens the practice rack with `count` boards and waits until it has drawn them all. */
async function openRack(page: Page, count = 3) {
  await page.goto(`${RACK_STAND_IN_ROUTE}?boards=${count}`);
  await expect(page.locator("[data-rack-board]")).toHaveCount(count);
  await expect(page.locator("[data-rack-art][data-turn]")).toHaveCount(count);
}

const captionFor = (page: Page, name: string) => page.getByRole("group", { name: RACK_COPY.captionGroup(name) });

/** Opens the turned board with its caption's Open This Board and waits for the editor. */
async function openFromCaption(page: Page, name: string) {
  await captionFor(page, name).getByRole("button", { name: RACK_COPY.open }).click();
  await page.waitForURL("**/design/outline");
}

/** The turned board's ⋯ menu, opened. */
async function openBoardMenu(page: Page, name: string) {
  await page.getByRole("button", { name: `Board actions for ${name}` }).click();
  const menu = page.getByRole("menu");
  await expect(menu).toBeVisible();
  return menu;
}

/** Locks the turned board from its ⋯ menu and waits for the menu to close. */
async function lockFromMenu(page: Page, name: string) {
  const menu = await openBoardMenu(page, name);
  await menu.getByRole("menuitemcheckbox", { name: BOARD_LOCK_COPY.lockBoard }).click();
  await expect(page.getByRole("menu")).toHaveCount(0);
}

/** The band's name button, whatever it reads (found by what it is, visible one only). */
const bandName = (page: Page) => page.locator("[data-board-name-band]").filter({ visible: true });

test.describe("the board's name in the tab band on a computer (quick 261008-raw)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the computer's rack and band; the phones have their own tests");
    await startPracticeRack(page);
  });

  test("t1. a saved board's name sits at the right end of TEMPLATE's band, and renaming it there reaches the rack", async ({
    page,
  }) => {
    const first = board(1);
    await openRack(page);
    await openFromCaption(page, first.name);

    const name = bandName(page);
    await expect(name).toHaveCount(1);
    await expect(name).toHaveText(first.name);
    await expect(name).toHaveAccessibleName(`Board name: ${first.name} — rename`);

    // On the band: the strip is the VIEWER label's row, the name is right of the label and ends at
    // the strip's right edge, and the band is the computer's measured height.
    const geometry = await page.evaluate(() => {
      const button = document.querySelector<HTMLElement>("[data-board-name-band]")!;
      const strip = button.parentElement!.parentElement!;
      const label = Array.from(strip.querySelectorAll<HTMLElement>("span")).find((el) => el.textContent === "VIEWER")!;
      const b = button.getBoundingClientRect();
      const s = strip.getBoundingClientRect();
      const l = label.getBoundingClientRect();
      return { nameLeft: b.left, nameRight: b.right, stripRight: s.right, stripHeight: s.height, labelRight: l.right };
    });
    expect(geometry.nameLeft).toBeGreaterThan(geometry.labelRight);
    expect(Math.abs(geometry.nameRight - geometry.stripRight)).toBeLessThanOrEqual(1);
    expect(Math.round(geometry.stripHeight)).toBe(29);

    await name.click();
    const dialog = page.getByRole("dialog", { name: "Rename board" });
    await expect(dialog).toBeVisible();
    const field = dialog.getByRole("textbox", { name: "Board name" });
    await expect(field).toHaveValue(first.name);
    await field.fill("Tracer Fish");
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(dialog).toBeHidden();
    await expect(bandName(page)).toHaveText("Tracer Fish");

    // Back on the rack the caption carries the new name, and opening it again reads it.
    await page.goBack();
    await page.waitForURL((url) => url.pathname === RACK_STAND_IN_ROUTE);
    await expect(page.locator("[data-rack-board]")).toHaveCount(3);
    await expect(captionFor(page, "Tracer Fish")).toBeVisible();
    await openFromCaption(page, "Tracer Fish");
    await expect(bandName(page)).toHaveText("Tracer Fish");
  });
  test("e1. the name is in the band on all five drawing screens, SUMMARY has none, and a rename from FINS reaches TEMPLATE and SUMMARY", async ({
    page,
  }) => {
    const first = board(1);
    await openRack(page);
    await openFromCaption(page, first.name);

    const screens: ScreenLabel[] = ["TEMPLATE", "ROCKER", "RAILS", "VOLUME", "FINS"];
    for (const label of screens) {
      await goToScreen(page, label);
      await expect(bandName(page), label).toHaveCount(1);
      await expect(bandName(page), label).toHaveText(first.name);
    }

    await goToScreen(page, "SUMMARY");
    await expect(bandName(page)).toHaveCount(0);
    await expect(page.locator("[data-order-form-page]").getByRole("textbox", { name: /Board Name/ })).toHaveValue(
      first.name,
    );

    await goToScreen(page, "FINS");
    await bandName(page).click();
    const dialog = page.getByRole("dialog", { name: "Rename board" });
    await dialog.getByRole("textbox", { name: "Board name" }).fill("Every Screen");
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(dialog).toBeHidden();
    await expect(bandName(page)).toHaveText("Every Screen");

    await goToScreen(page, "TEMPLATE");
    await expect(bandName(page)).toHaveText("Every Screen");
    await goToScreen(page, "SUMMARY");
    await expect(page.locator("[data-order-form-page]").getByRole("textbox", { name: /Board Name/ })).toHaveValue(
      "Every Screen",
    );
  });

  test("e2. a board that has never been saved reads Untitled, and pressing it opens the same sign-in step the top bar's Save does", async ({
    page,
  }) => {
    await page.goto("/design/outline");
    const name = bandName(page);
    await expect(name).toHaveCount(1);
    await expect(name).toHaveText("Untitled");
    await expect(name).toHaveAccessibleName("Board name: Untitled — name and save");

    await name.click();
    const signIn = page.getByRole("dialog", { name: "Sign in to save your boards" });
    await expect(signIn).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(signIn).toBeHidden();

    // The top bar's Save opens the very same dialog.
    await page.getByRole("button", { name: "Save Board" }).filter({ visible: true }).click();
    await expect(page.getByRole("dialog", { name: "Sign in to save your boards" })).toBeVisible();
  });

  test("e3. a locked board shows its padlock beside the name and can still be renamed, staying locked", async ({
    page,
  }) => {
    const first = board(1);
    await openRack(page);
    await lockFromMenu(page, first.name);
    await openFromCaption(page, first.name);

    const name = bandName(page);
    await expect(name).toHaveText(first.name);
    await expect(name).toHaveAccessibleName(`Board name: ${first.name}, locked — rename`);
    const padlock = name.locator("[data-board-name-padlock]");
    await expect(padlock).toBeVisible();
    await expect(padlock).toHaveAttribute("title", BOARD_LOCK_COPY.padlock);

    await name.click();
    const dialog = page.getByRole("dialog", { name: "Rename board" });
    await dialog.getByRole("textbox", { name: "Board name" }).fill("Locked Fish");
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(dialog).toBeHidden();
    await expect(bandName(page)).toHaveText("Locked Fish");
    await expect(bandName(page).locator("[data-board-name-padlock]")).toBeVisible();
    await expect(page.getByRole("button", { name: BOARD_LOCK_COPY.unlockLabel }).filter({ visible: true })).toHaveCount(1);

    await page.goBack();
    await page.waitForURL((url) => url.pathname === RACK_STAND_IN_ROUTE);
    await expect(page.locator("[data-rack-board]")).toHaveCount(3);
    const caption = captionFor(page, "Locked Fish");
    await expect(caption).toBeVisible();
    await expect(caption.getByRole("img", { name: BOARD_LOCK_COPY.padlock })).toBeVisible();
  });
});

test.describe("a rename that cannot be saved (quick 261008-raw)", () => {
  test("e4. when the save fails the popup says so and stays open, and the band keeps the old name", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the computer's rack and band");
    await startPracticeRack(page, "fail");
    const first = board(1);
    await openRack(page);
    await openFromCaption(page, first.name);

    await bandName(page).click();
    const dialog = page.getByRole("dialog", { name: "Rename board" });
    await dialog.getByRole("textbox", { name: "Board name" }).fill("Will Not Save");
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(dialog.getByText("Couldn't save — check your connection and try again.")).toBeVisible();
    await expect(dialog).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(bandName(page)).toHaveText(first.name);
  });
});
