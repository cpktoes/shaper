import { expect, test, type Page } from "@playwright/test";
import { BOARD_LOCK_COPY } from "../components/design/board-lock-copy";
import { RACK_COPY } from "../components/setup/rack-config";
import { BANNER_DISMISSAL_KEY } from "../lib/models/banner-dismissal";
import { RACK_STAND_IN_ROUTE, STAND_IN_LONG_NAME, standInRackRows } from "../lib/models/rack-stand-in";
import { TOOLBAR_TIP_DISMISSAL_KEY } from "../lib/models/toolbar-tip";
import { freshPracticeRack } from "./helpers/practice-rack";
import { goToScreen, screenHref, type ScreenLabel } from "./helpers/screens";

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

    // On the band: the strip is the VIEWER tab's row, the name is right of the tabs and ends at the
    // strip's right edge, and the band is the computer's measured height. Quick 261014-wii gave
    // TEMPLATE a second tab (ADD WINGS), so VIEWER is a button now and the strip measures 30, not 29.
    const geometry = await page.evaluate(() => {
      const button = document.querySelector<HTMLElement>("[data-board-name-band]")!;
      // The name sits in the strip's trailing slot (a size container since Phase 18 D-21); the strip
      // is the row around the slot.
      const strip = button.closest('[class~="@container"]')!.parentElement!;
      const label = Array.from(strip.querySelectorAll<HTMLElement>("span, button")).find(
        (el) => el.textContent === "VIEWER",
      )!;
      const b = button.getBoundingClientRect();
      const s = strip.getBoundingClientRect();
      const l = label.getBoundingClientRect();
      return { nameLeft: b.left, nameRight: b.right, stripRight: s.right, stripHeight: s.height, labelRight: l.right };
    });
    expect(geometry.nameLeft).toBeGreaterThan(geometry.labelRight);
    expect(Math.abs(geometry.nameRight - geometry.stripRight)).toBeLessThanOrEqual(1);
    expect(Math.round(geometry.stripHeight)).toBe(30);

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
// Measured proof at every width the app supports (quick 261008-raw, Task 3), restated by Phase 18
// (18-02) to the founder's D-21: he named the tabs, so every tab word stays whole and on one line,
// and the board's name is the one thing in a strip that gives way. It is drawn only when the strip's
// trailing slot has at least 50 dots of room (a 44-dot box after the 6-dot gap); with less it is not
// drawn at all, never a stub, and the page never scrolls sideways.
//
// These tests assert that RULE, not a fixed outcome, so they hold on today's strips (every one has the
// room, so the name always shows) and keep holding when the GUIDE tabs arrive and ROCKER and RAILS run
// out of room on a narrow phone. Whether a strip is tappable (a real `role="tab"` in it, so on a phone
// it is 31 dots tall and carries the 44-dot touch box) is read from the page, never from a list.
//
// The long name (the practice rack's 45-character board, 279 dots at 12px) is put on the open board
// by renaming it from the band itself, which also proves a tap or a click opens the popup and saves.
// ---------------------------------------------------------------------------------------------

const SCREEN_ORDER: ScreenLabel[] = ["TEMPLATE", "ROCKER", "RAILS", "VOLUME", "FINS"];

/** D-21's line: the slot needs this much room for the name to be drawn — a 44-dot box after the 6-dot gap. */
const NAME_ROOM = 50;
const NAME_BOX = 44;
const NAME_GAP = 6;

/** The upright phone widths D-21 was measured at (18-RESEARCH Finding 5), each with a phone's height. */
const PHONE_SIZES = [
  { width: 360, height: 780 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
  { width: 430, height: 932 },
];

/** Every awkward kind of name text at once: emoji (one a joined sequence), right-to-left words, and long. */
const ODD_NAME = "🌊🏄🏽‍♀️ لوح ركوب الأمواج الطويل Big Wednesday Gun";

interface StripMeasure {
  stripHeight: number;
  stripLeft: number;
  stripRight: number;
  /** A real tab button (`role="tab"`) is in the strip: on a phone it is 31 tall and carries the 44-dot touch box. */
  tappable: boolean;
  tabs: { left: number; right: number; top: number; height: number; paddingLeft: number; paddingRight: number }[];
  /** The tab words as drawn, for the log. */
  words: string[];
  /** The room after the last tab: the strip's right edge less the last tab's right edge. */
  room: number;
  /** The trailing slot's own width — what the hiding rule asks. */
  slotWidth: number;
  /** The name's button when it is drawn; null when the room rule has hidden it. */
  name: null | {
    left: number;
    right: number;
    top: number;
    bottom: number;
    height: number;
    width: number;
    title: string;
    textOverflowing: boolean;
    ellipsis: string;
  };
  innerWidth: number;
  pageScrollWidth: number;
}

/** Measures the one visible strip that carries the board's name slot, whether or not the name is drawn. */
async function measureStrip(page: Page): Promise<StripMeasure> {
  return page.evaluate(() => {
    const strips = new Set<HTMLElement>();
    for (const button of document.querySelectorAll<HTMLElement>("[data-board-name-band]")) {
      const strip = button.closest<HTMLElement>('[class~="@container"]')?.parentElement;
      if (strip && strip.getClientRects().length > 0 && strip.getBoundingClientRect().width > 0) strips.add(strip);
    }
    if (strips.size !== 1) throw new Error(`expected one visible strip with a name slot, found ${strips.size}`);
    const strip = [...strips][0];
    const tabsRow = strip.firstElementChild!;
    const slot = strip.lastElementChild!;
    const rect = (el: Element) => el.getBoundingClientRect();
    const sr = rect(strip);
    const tabs = Array.from(tabsRow.children).map((tab) => {
      const r = rect(tab);
      const cs = getComputedStyle(tab);
      return {
        left: r.left,
        right: r.right,
        top: r.top,
        height: r.height,
        paddingLeft: parseFloat(cs.paddingLeft),
        paddingRight: parseFloat(cs.paddingRight),
      };
    });
    const button = slot.querySelector<HTMLElement>("[data-board-name-band]");
    let name = null;
    if (button && button.getClientRects().length > 0) {
      const nr = rect(button);
      const text = button.querySelector<HTMLElement>("span.truncate")!;
      name = {
        left: nr.left,
        right: nr.right,
        top: nr.top,
        bottom: nr.bottom,
        height: nr.height,
        width: nr.width,
        title: button.title,
        textOverflowing: text.scrollWidth > text.clientWidth,
        ellipsis: getComputedStyle(text).textOverflow,
      };
    }
    return {
      stripHeight: sr.height,
      stripLeft: sr.left,
      stripRight: sr.right,
      tappable: tabsRow.querySelector('[role="tab"]') !== null,
      tabs,
      words: Array.from(tabsRow.children).map((tab) => (tab as HTMLElement).innerText.trim()),
      room: sr.right - tabs[tabs.length - 1].right,
      slotWidth: rect(slot).width,
      name,
      innerWidth: window.innerWidth,
      pageScrollWidth: document.documentElement.scrollWidth,
    };
  });
}

/** Narrows the visible name strip to `width` dots by hand (null puts it back), so a test can set the
 * room after the last tab either side of D-21's line on a page that is not yet crowded. */
async function crowdStrip(page: Page, width: number | null) {
  await page.evaluate(
    ({ width }) => {
      for (const button of document.querySelectorAll<HTMLElement>("[data-board-name-band]")) {
        const strip = button.closest<HTMLElement>('[class~="@container"]')?.parentElement;
        if (strip && strip.getClientRects().length > 0) strip.style.width = width === null ? "" : `${width}px`;
      }
    },
    { width },
  );
}

/** Resizes the window and lets the page settle before it is measured: two frames for the layout, then
 * the sideways-scroll check polled for a moment, because WebKit under load can report the page's width
 * from the size before (seen once, 18-02: VOLUME read 390 at 360 and passed alone). A page that really
 * scrolls sideways still fails here, and `expectRoomRule` checks it again. */
async function resizeTo(page: Page, size: { width: number; height: number }) {
  await page.setViewportSize(size);
  await page.evaluate(() => new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done()))));
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), {
      message: `no sideways page scroll at ${size.width}x${size.height}`,
      timeout: 5_000,
    })
    .toBeLessThanOrEqual(0);
}

/** The strip's rules at any width (D-21): every tab whole inside the strip and the window, all on one
 * line; the page never scrolling sideways; and the name drawn only with 50 dots of room — then at least
 * 44 dots wide, at least 6 clear of the last tab, inside the strip, one line, shortened with "…" — and
 * not drawn at all with less. */
function expectRoomRule(m: StripMeasure, where: string) {
  const last = m.tabs[m.tabs.length - 1];
  console.log(
    `[board-name] ${where}: strip ${m.stripHeight.toFixed(1)} tall, ${m.words.join(" · ")} end ${last.right.toFixed(1)}, ` +
      `room ${m.room.toFixed(1)}, ` +
      (m.name
        ? `name drawn ${m.name.left.toFixed(1)}-${m.name.right.toFixed(1)} (box ${m.name.width.toFixed(1)}, ` +
          `gap ${(m.name.left - last.right).toFixed(1)}, ${m.name.textOverflowing ? "shortened with …" : "whole"})`
        : "name not drawn") +
      `, tab padding ${last.paddingLeft}`,
  );
  for (const tab of m.tabs) {
    expect(tab.left, `${where}: a tab starts inside the strip`).toBeGreaterThanOrEqual(m.stripLeft - 0.5);
    expect(tab.right, `${where}: a tab ends inside the window`).toBeLessThanOrEqual(m.innerWidth + 0.5);
    expect(tab.right, `${where}: a tab ends inside the strip`).toBeLessThanOrEqual(m.stripRight + 0.5);
    expect(Math.abs(tab.top - m.tabs[0].top), `${where}: every tab on one line`).toBeLessThanOrEqual(0.5);
    expect(Math.abs(tab.height - m.tabs[0].height), `${where}: no tab word wraps`).toBeLessThanOrEqual(0.5);
  }
  expect(m.pageScrollWidth, `${where}: no sideways page scroll`).toBeLessThanOrEqual(m.innerWidth);
  expect(Math.abs(m.slotWidth - m.room), `${where}: the name's slot is the room after the last tab`).toBeLessThanOrEqual(0.5);
  if (m.room < NAME_ROOM) {
    expect(m.name, `${where}: under ${NAME_ROOM} dots of room the name is not drawn at all`).toBeNull();
    return;
  }
  expect(m.name, `${where}: with ${NAME_ROOM} dots of room or more the name is drawn`).not.toBeNull();
  const name = m.name!;
  expect(name.width, `${where}: the name's box is at least ${NAME_BOX} dots, never a stub`).toBeGreaterThanOrEqual(NAME_BOX - 0.5);
  expect(name.left - last.right, `${where}: name starts clear of the last tab`).toBeGreaterThanOrEqual(NAME_GAP - 0.5);
  expect(name.right, `${where}: name ends inside the strip`).toBeLessThanOrEqual(m.stripRight + 0.5);
  expect(name.right, `${where}: name ends inside the window`).toBeLessThanOrEqual(m.innerWidth + 0.5);
  expect(Math.abs(name.height - m.tabs[0].height), `${where}: name is one line, as tall as a tab`).toBeLessThanOrEqual(1);
  expect(name.ellipsis, `${where}: a name too long for its box shortens with …`).toBe("ellipsis");
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

/** The name's touch box. On a tappable strip it is the tabs' own 44 dots (10 reach above and below,
 * never into the top bar or the drawing); beside a lone read-only label it reaches 2 dots past the band
 * each way (a point 1 dot out still hits it) and still never touches the top bar or the drawing. */
async function expectNameTouchBox(page: Page, label: ScreenLabel, tappable: boolean) {
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
    { reach: tappable ? 10 : 1, ...bounds },
  );
  if (tappable) expect(Math.abs(afterHeight - 44), `${label}: the tabs' 44-dot box`).toBeLessThanOrEqual(0.5);
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

/** A phone strip is 31 dots tall when it holds real tabs (their touch box's 9 dots of clearance above), 21 beside a lone label. */
const phoneStripHeight = (m: StripMeasure) => (m.tappable ? 31 : 21);

/** Waits until the band's name slot holds a name reading `text` (drawn or hidden by the room rule). */
async function expectSlotName(page: Page, text: string) {
  await expect(page.locator("[data-board-name-band]").first()).toHaveText(text);
}

test.describe("the name in the band on a phone (quick 261008-raw; Phase 18 D-21)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "the phones' swipe rack, band and touch boxes");
    await startPracticeRack(page);
  });

  test("p1. upright at 360, 375, 390, 412 and 430: every tab word whole on one line, no sideways scroll, and the long name drawn — 44 dots or more, clear of the tabs, shortened with … — only where the strip has 50 dots of room", async ({
    page,
  }) => {
    test.setTimeout(420_000);
    await page.setViewportSize(PHONE_SIZES[2]);
    await openFirstBoardWithLongName(page);

    for (const label of SCREEN_ORDER) {
      await page.setViewportSize(PHONE_SIZES[2]);
      await goToScreen(page, label);
      for (const size of PHONE_SIZES) {
        await resizeTo(page, size);
        const where = `${label} at ${size.width}x${size.height}`;
        const m = await measureStrip(page);
        expect(Math.round(m.stripHeight), `${where}: the band's height is unchanged`).toBe(phoneStripHeight(m));
        expectRoomRule(m, where);
        if (!m.name) continue;
        expect(m.name.title).toBe(STAND_IN_LONG_NAME);
        if (label === "ROCKER") expect(m.name.textOverflowing, `${where}: the long name is shortened`).toBe(true);
        await expectNameTouchBox(page, label, m.tappable);
      }
      // The popup, from the widest phone, where the name has the most room to be drawn.
      const widest = await measureStrip(page);
      if (widest.name) await expectPopupFits(page);
      else console.log(`[board-name] ${label}: no name drawn even at 430, so no popup to open from the band`);
    }
  });

  test("p1b. a board with no name yet: Untitled whole on TEMPLATE, VOLUME and FINS at 360 wide; on ROCKER and RAILS it follows the room rule", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    for (const label of SCREEN_ORDER) {
      await page.goto(screenHref(label));
      await expectSlotName(page, "Untitled");
      const where = `${label} Untitled at 360`;
      const m = await measureStrip(page);
      expect(Math.round(m.stripHeight), `${where}: the band's height`).toBe(phoneStripHeight(m));
      expectRoomRule(m, where);
      if (label === "ROCKER" || label === "RAILS") continue;
      expect(m.name, `${where}: drawn`).not.toBeNull();
      expect(m.name!.textOverflowing, `${where}: Untitled fits whole`).toBe(false);
    }
  });

  test("p2. held sideways: the same room rule on every screen, and where the name is drawn the tap opens the popup", async ({ page }, testInfo) => {
    test.setTimeout(240_000);
    const size = testInfo.project.name === "iphone" ? { width: 844, height: 390 } : { width: 863, height: 360 };
    await openFirstBoardWithLongName(page);
    await page.setViewportSize(size);

    let drawn = 0;
    for (const label of SCREEN_ORDER) {
      await goToScreen(page, label);
      const where = `${label} sideways ${size.width}x${size.height}`;
      // The name's slot is in the page whether or not the name is drawn, so wait for the slot, not the name.
      await expect(page.locator("[data-board-name-band]").first()).toBeAttached();
      await resizeTo(page, size);
      const m = await measureStrip(page);
      expect(Math.round(m.stripHeight), `${where}: the band's height is unchanged`).toBe(phoneStripHeight(m));
      expectRoomRule(m, where);
      // The room rule holds sideways too. With GUIDE on every page ROCKER's five tabs leave an iPhone
      // held sideways about 42 dots after the last tab, so the name gives way there (D-21); every
      // other page, and ROCKER on the wider Android, still shows it.
      console.log(`[board-name] ${where}: room ${m.room.toFixed(1)}, name ${m.name ? "drawn" : "not drawn"}`);
      if (label !== "ROCKER") expect(m.name, `${where}: a sideways phone has the room for the name`).not.toBeNull();
      if (!m.name) continue;
      drawn += 1;
      expect(m.name.title).toBe(STAND_IN_LONG_NAME);
      await expectNameTouchBox(page, label, m.tappable);
      await expectPopupFits(page);
    }
    expect(drawn, "the name is drawn, and its popup opened, on at least four of the five screens").toBeGreaterThanOrEqual(4);
  });

  test("p3. a long, emoji and right-to-left name gives way at exactly the widths Untitled does: the room is the strip's, never the name's", async ({
    page,
  }) => {
    test.setTimeout(420_000);
    // One board, two names, so the tabs are the very same (ROCKER's own tab set depends on the board).
    await page.setViewportSize(PHONE_SIZES[2]);
    await openRack(page);
    await openFromCaption(page, board(1).name);

    const runs = new Map<string, { room: number; drawn: boolean }>();
    for (const name of ["Untitled", ODD_NAME]) {
      await page.setViewportSize(PHONE_SIZES[2]);
      await renameFromBand(page, name, "tap");
      const called = name === "Untitled" ? "Untitled" : "odd name";
      for (const label of SCREEN_ORDER) {
        await page.setViewportSize(PHONE_SIZES[2]);
        await goToScreen(page, label);
        for (const size of PHONE_SIZES) {
          await resizeTo(page, size);
          const where = `${label} ${called} at ${size.width}`;
          const m = await measureStrip(page);
          expectRoomRule(m, where);
          if (m.name) expect(m.name.title).toBe(name);
          const key = `${label}@${size.width}`;
          const was = runs.get(key);
          if (!was) {
            runs.set(key, { room: m.room, drawn: m.name !== null });
            continue;
          }
          expect(Math.abs(m.room - was.room), `${where}: the same room as Untitled had`).toBeLessThanOrEqual(0.5);
          expect(m.name !== null, `${where}: drawn exactly where Untitled was`).toBe(was.drawn);
        }

        // Where the narrowest phone's strip still has the room, narrow it by hand either side of the
        // line: the odd name and Untitled must give way at the same 50 dots. ROCKER and RAILS are under
        // the line there already now that GUIDE is on them (the loop above proved both names give way),
        // and a strip cannot be narrowed to more room than it has.
        await resizeTo(page, PHONE_SIZES[0]);
        const before = await measureStrip(page);
        for (const target of before.room >= 51 ? [49, 51] : []) {
          await crowdStrip(page, before.stripRight - before.room - before.stripLeft + target);
          const m = await measureStrip(page);
          expectRoomRule(m, `${label} ${called} crowded to ${target}`);
          expect(m.name === null, `${label} ${called} crowded to ${target}`).toBe(target < NAME_ROOM);
        }
        await crowdStrip(page, null);
      }
    }
  });
});

test.describe("the name in the band on a computer, at every width (quick 261008-raw; Phase 18 D-21)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the computer's rack and band");
    await startPracticeRack(page);
  });

  test("d1. 1280, 1024 and 820 wide: the tabs keep their 18 dots and their words whole, and the name follows the room rule, shortening when it must", async ({
    page,
  }) => {
    test.setTimeout(240_000);
    await page.setViewportSize({ width: 1280, height: 800 });
    await openRack(page);
    await openFromCaption(page, board(1).name);
    await renameFromBand(page, STAND_IN_LONG_NAME, "click");

    for (const label of SCREEN_ORDER) {
      await page.setViewportSize({ width: 1280, height: 800 });
      await goToScreen(page, label);
      for (const size of [
        { width: 1280, height: 800 },
        { width: 1024, height: 768 },
        { width: 820, height: 800 },
      ]) {
        await resizeTo(page, size);
        const where = `${label} at ${size.width}`;
        const m = await measureStrip(page);
        expect([29, 30], `${where}: the band's height is unchanged`).toContain(Math.round(m.stripHeight));
        for (const tab of m.tabs) {
          expect(tab.paddingLeft, `${where}: tab side padding`).toBe(18);
          expect(tab.paddingRight, `${where}: tab side padding`).toBe(18);
        }
        expectRoomRule(m, where);
        if (!m.name) continue;
        expect(m.name.title).toBe(STAND_IN_LONG_NAME);
        if (label === "RAILS" && size.width === 820) {
          expect(m.name.textOverflowing, `${where}: shortened with an ellipsis`).toBe(true);
        }
      }
    }
  });
});

// ---------------------------------------------------------------------------------------------
// The room rule itself, on a strip crowded by hand (18-02). ROCKER and RAILS are crowded for real on a
// narrow phone now that GUIDE is on them (p1 and p3 above), so this narrows VOLUME's real strip in the
// browser to put the room either side of the line, proving the hiding rule really ships in the page's
// CSS and that Chromium and WebKit both honour it.
// ---------------------------------------------------------------------------------------------

test.describe("the room rule on a strip crowded by hand (Phase 18 D-21)", () => {
  test("c1. narrowed to 40 or 49 dots of room the name is not drawn, gap and all; at 51 or 60 it is drawn, 44 dots or more", async ({
    page,
  }, testInfo) => {
    await startPracticeRack(page);
    await page.setViewportSize(testInfo.project.name === "desktop" ? { width: 1280, height: 800 } : { width: 360, height: 780 });
    await page.goto("/design/volume");
    await expectSlotName(page, "Untitled");

    const shipsRule = await page.evaluate(() => {
      const found: string[] = [];
      const walk = (rules: CSSRuleList) => {
        for (const rule of Array.from(rules)) {
          if (typeof CSSContainerRule !== "undefined" && rule instanceof CSSContainerRule) {
            if (rule.cssText.includes("50px") && rule.cssText.includes("hidden")) found.push(rule.cssText);
          }
          if ("cssRules" in rule) walk((rule as CSSGroupingRule).cssRules);
        }
      };
      for (const sheet of Array.from(document.styleSheets)) {
        try {
          walk(sheet.cssRules);
        } catch {
          // a sheet from another origin cannot be read; the app's own CSS is same-origin
        }
      }
      return found;
    });
    console.log(`[board-name] the hiding rule as shipped: ${shipsRule.join(" | ").replace(/\s+/g, " ")}`);
    expect(shipsRule.length, "the page's CSS carries the name slot's container query").toBeGreaterThan(0);

    const before = await measureStrip(page);
    expectRoomRule(before, `VOLUME ${testInfo.project.name} as it stands`);
    expect(before.name, "VOLUME's two-tab strip has the room at every width").not.toBeNull();
    const lastTabFromLeft = before.stripRight - before.room - before.stripLeft;

    for (const target of [40, 49, 51, 60]) {
      await crowdStrip(page, lastTabFromLeft + target);
      const m = await measureStrip(page);
      expect(Math.abs(m.room - target), `crowded to ${target}: the room is what was set`).toBeLessThanOrEqual(0.5);
      expectRoomRule(m, `VOLUME ${testInfo.project.name} crowded to ${target} dots of room`);
      expect(m.name === null, `crowded to ${target}`).toBe(target < NAME_ROOM);
    }
  });
});
