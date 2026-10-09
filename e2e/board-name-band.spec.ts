import { expect, test, type Page } from "@playwright/test";
import { BOARD_LOCK_COPY } from "../components/design/board-lock-copy";
import { RACK_COPY } from "../components/setup/rack-config";
import { BANNER_DISMISSAL_KEY } from "../lib/models/banner-dismissal";
import { RACK_STAND_IN_ROUTE, STAND_IN_LONG_NAME, standInRackRows } from "../lib/models/rack-stand-in";
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

// ---------------------------------------------------------------------------------------------
// Measured proof at every width the app supports (quick 261008-raw, Task 3).
//
// The long name (the practice rack's 45-character board, 279 dots at 12px) is put on the open board
// by renaming it from the band itself, which also proves a tap or a click opens the popup and saves.
// ---------------------------------------------------------------------------------------------

const SCREEN_ORDER: ScreenLabel[] = ["TEMPLATE", "ROCKER", "RAILS", "VOLUME", "FINS"];
/** Screens whose tab strip is tappable, so on a phone carries the tabs' 44-dot touch box. */
const TAPPABLE: ScreenLabel[] = ["ROCKER", "RAILS", "FINS"];

interface BandMeasure {
  stripHeight: number;
  stripLeft: number;
  stripRight: number;
  tabs: { left: number; right: number; height: number; paddingLeft: number; paddingRight: number }[];
  name: { left: number; right: number; top: number; bottom: number; height: number; title: string };
  textOverflowing: boolean;
  ellipsis: string;
  innerWidth: number;
  pageScrollWidth: number;
}

async function measureBand(page: Page): Promise<BandMeasure> {
  return page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll<HTMLElement>("[data-board-name-band]")).filter(
      (el) => el.offsetParent !== null,
    );
    if (buttons.length !== 1) throw new Error(`expected one visible band name, found ${buttons.length}`);
    const button = buttons[0];
    const strip = button.parentElement!.parentElement!;
    const tabsRow = strip.firstElementChild!;
    const rect = (el: Element) => el.getBoundingClientRect();
    const text = button.querySelector<HTMLElement>("span.truncate")!;
    const sr = rect(strip);
    const nr = rect(button);
    return {
      stripHeight: sr.height,
      stripLeft: sr.left,
      stripRight: sr.right,
      tabs: Array.from(tabsRow.children).map((tab) => {
        const r = rect(tab);
        const cs = getComputedStyle(tab);
        return {
          left: r.left,
          right: r.right,
          height: r.height,
          paddingLeft: parseFloat(cs.paddingLeft),
          paddingRight: parseFloat(cs.paddingRight),
        };
      }),
      name: { left: nr.left, right: nr.right, top: nr.top, bottom: nr.bottom, height: nr.height, title: button.title },
      textOverflowing: text.scrollWidth > text.clientWidth,
      ellipsis: getComputedStyle(text).textOverflow,
      innerWidth: window.innerWidth,
      pageScrollWidth: document.documentElement.scrollWidth,
    };
  });
}

/** The band's geometry rules, true at every width: every tab whole inside the strip and the window,
 * the name right of the last tab (by `gap` dots at least) and inside the strip, on one line, the page
 * not scrolling sideways. */
function expectBandSound(m: BandMeasure, gap: number, where: string) {
  const last = m.tabs[m.tabs.length - 1];
  console.log(
    `[board-name] ${where}: strip ${m.stripHeight.toFixed(1)} tall, last tab ends ${last.right.toFixed(1)}, ` +
      `name ${m.name.left.toFixed(1)}-${m.name.right.toFixed(1)} (gap ${(m.name.left - last.right).toFixed(1)}), ` +
      `tab padding ${last.paddingLeft}, ${m.textOverflowing ? "shortened with …" : "whole"}`,
  );
  for (const tab of m.tabs) {
    expect(tab.left, `${where}: a tab starts inside the strip`).toBeGreaterThanOrEqual(m.stripLeft - 0.5);
    expect(tab.right, `${where}: a tab ends inside the window`).toBeLessThanOrEqual(m.innerWidth + 0.5);
    expect(tab.right, `${where}: a tab ends inside the strip`).toBeLessThanOrEqual(m.stripRight + 0.5);
  }
  const lastTab = m.tabs[m.tabs.length - 1];
  expect(m.name.left - lastTab.right, `${where}: name starts clear of the last tab`).toBeGreaterThanOrEqual(gap - 0.5);
  expect(m.name.right, `${where}: name ends inside the strip`).toBeLessThanOrEqual(m.stripRight + 0.5);
  expect(m.name.right, `${where}: name ends inside the window`).toBeLessThanOrEqual(m.innerWidth + 0.5);
  expect(Math.abs(m.name.height - m.tabs[0].height), `${where}: name is one line, as tall as a tab`).toBeLessThanOrEqual(1);
  expect(m.pageScrollWidth, `${where}: no sideways page scroll`).toBeLessThanOrEqual(m.innerWidth);
}

/** Opens the practice rack's first board on the editor (rack caption on a computer, the swipe rack's
 * Open This Board on a phone) and gives it the long name through the band's own popup. */
async function openFirstBoardWithLongName(page: Page) {
  const first = board(1);
  await openRack(page);
  await openFromCaption(page, first.name);
  await renameFromBand(page, STAND_IN_LONG_NAME, "tap");
}

async function renameFromBand(page: Page, to: string, how: "tap" | "click") {
  const name = bandName(page);
  if (how === "tap") await name.tap();
  else await name.click();
  const dialog = page.getByRole("dialog", { name: "Rename board" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("textbox", { name: "Board name" }).fill(to);
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog).toBeHidden();
  await expect(bandName(page)).toHaveAccessibleName(`Board name: ${to} — rename`);
}

async function boundsForTouch(page: Page) {
  const bar = await page.getByRole("banner").boundingBox();
  const drawing = await page.locator("[data-viewer-panel]").evaluate((el) => {
    const rect = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return rect.y + parseFloat(cs.borderTopWidth) + parseFloat(cs.paddingTop);
  });
  if (!bar) throw new Error("no top bar");
  return { topBarBottom: bar.y + bar.height, drawingTop: drawing };
}

/** The name's touch box. On ROCKER, RAILS and FINS it is the tabs' own 44 dots (10 reach above and
 * below, never into the top bar or the drawing); on TEMPLATE and VOLUME it reaches 2 dots past the band
 * each way (a point 1 dot out still hits it) and still never touches the top bar or the drawing. */
async function expectNameTouchBox(page: Page, label: ScreenLabel) {
  const bounds = await boundsForTouch(page);
  const name = bandName(page);
  const afterHeight = await name.evaluate((el) => parseFloat(getComputedStyle(el, "::after").height));
  const outcome = await name.evaluate(
    (el, args) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const hits = (y: number) => {
        const hit = document.elementFromPoint(cx, y);
        return !!hit && (hit === el || el.contains(hit));
      };
      return {
        above: hits(rect.top - args.reach),
        below: hits(rect.bottom + args.reach),
        aboveTopBar: hits(args.topBarBottom - 1),
        intoDrawing: hits(args.drawingTop + 1),
      };
    },
    { reach: TAPPABLE.includes(label) ? 10 : 1, ...bounds },
  );
  if (TAPPABLE.includes(label)) expect(Math.abs(afterHeight - 44), `${label}: the tabs' 44-dot box`).toBeLessThanOrEqual(0.5);
  expect(outcome.above, `${label}: the touch box reaches above the name`).toBe(true);
  expect(outcome.below, `${label}: the touch box reaches below the name`).toBe(true);
  expect(outcome.aboveTopBar, `${label}: not 1 dot above the top bar's bottom edge`).toBe(false);
  expect(outcome.intoDrawing, `${label}: not 1 dot into the drawing`).toBe(false);
}

async function expectPopupFits(page: Page) {
  await bandName(page).tap();
  const dialog = page.getByRole("dialog", { name: "Rename board" });
  await expect(dialog).toBeVisible();
  const box = await dialog.boundingBox();
  const viewport = page.viewportSize()!;
  if (!box) throw new Error("no dialog box");
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 0.5);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 0.5);
  const fontSize = await dialog.getByRole("textbox", { name: "Board name" }).evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(fontSize, "no zoom on focus").toBeGreaterThanOrEqual(16);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
}

const stripHeightOn = (label: ScreenLabel) => (TAPPABLE.includes(label) || label === "RAILS" ? 31 : 21);

test.describe("the name in the band on a phone (quick 261008-raw)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "the phones' swipe rack, band and touch boxes");
    await startPracticeRack(page);
  });

  test("p1. upright: on every screen the name fits beside the tabs, shortens with …, is one line, and is tappable", async ({
    page,
  }, testInfo) => {
    test.setTimeout(240_000);
    const sizes =
      testInfo.project.name === "iphone"
        ? [{ width: 390, height: 844 }]
        : [
            { width: 412, height: 915 },
            { width: 360, height: 780 },
            { width: 375, height: 667 },
          ];
    await page.setViewportSize(sizes[0]);
    await openFirstBoardWithLongName(page);

    for (const label of SCREEN_ORDER) {
      await goToScreen(page, label);
      for (const size of sizes) {
        await page.setViewportSize(size);
        const where = `${label} at ${size.width}x${size.height}`;
        await expect(bandName(page)).toHaveCount(1);
        const m = await measureBand(page);
        expect(Math.round(m.stripHeight), `${where}: the band's height is unchanged`).toBe(stripHeightOn(label));
        expectBandSound(m, 6, where);
        expect(m.name.title).toBe(STAND_IN_LONG_NAME);
        if (label === "ROCKER") {
          expect(m.ellipsis).toBe("ellipsis");
          expect(m.textOverflowing, `${where}: the long name is shortened`).toBe(true);
        }
        await expectNameTouchBox(page, label);
      }
      await page.setViewportSize(sizes[0]);
      await expectPopupFits(page);
    }
  });

  test("p1b. a board with no name yet reads Untitled whole on ROCKER, even at 360 wide", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto("/design/rocker");
    await expect(bandName(page)).toHaveText("Untitled");
    const m = await measureBand(page);
    expect(m.textOverflowing, "Untitled fits whole").toBe(false);
    expectBandSound(m, 6, "ROCKER Untitled at 360");
    expect(Math.round(m.stripHeight)).toBe(31);
  });

  test("p2. held sideways: the same on every screen, and the tap opens the popup", async ({ page }, testInfo) => {
    test.setTimeout(240_000);
    const size = testInfo.project.name === "iphone" ? { width: 844, height: 390 } : { width: 863, height: 360 };
    await openFirstBoardWithLongName(page);
    await page.setViewportSize(size);

    for (const label of SCREEN_ORDER) {
      await goToScreen(page, label);
      const where = `${label} sideways ${size.width}x${size.height}`;
      await expect(bandName(page)).toHaveCount(1);
      const m = await measureBand(page);
      expect(Math.round(m.stripHeight), `${where}: the band's height is unchanged`).toBe(stripHeightOn(label));
      expectBandSound(m, 6, where);
      expect(m.name.title).toBe(STAND_IN_LONG_NAME);
      await expectNameTouchBox(page, label);
      await expectPopupFits(page);
    }
  });
});

test.describe("the name in the band on a computer, at every width (quick 261008-raw)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the computer's rack and band");
    await startPracticeRack(page);
  });

  test("d1. 1280, 1024 and 820 wide: the tabs keep their 18 dots, the name sits clear of them on one line and shortens when it must", async ({
    page,
  }) => {
    test.setTimeout(240_000);
    await page.setViewportSize({ width: 1280, height: 800 });
    await openRack(page);
    await openFromCaption(page, board(1).name);
    await renameFromBand(page, STAND_IN_LONG_NAME, "click");

    for (const label of SCREEN_ORDER) {
      await goToScreen(page, label);
      for (const size of [
        { width: 1280, height: 800 },
        { width: 1024, height: 768 },
        { width: 820, height: 800 },
      ]) {
        await page.setViewportSize(size);
        const where = `${label} at ${size.width}`;
        await expect(bandName(page)).toHaveCount(1);
        const m = await measureBand(page);
        expect([29, 30], `${where}: the band's height is unchanged`).toContain(Math.round(m.stripHeight));
        for (const tab of m.tabs) {
          expect(tab.paddingLeft, `${where}: tab side padding`).toBe(18);
          expect(tab.paddingRight, `${where}: tab side padding`).toBe(18);
        }
        expectBandSound(m, 6, where);
        expect(m.name.title).toBe(STAND_IN_LONG_NAME);
        if (label === "RAILS" && size.width === 820) {
          expect(m.ellipsis).toBe("ellipsis");
          expect(m.textOverflowing, `${where}: shortened with an ellipsis`).toBe(true);
        }
      }
    }
  });
});
