import { expect, test, type Locator, type Page } from "@playwright/test";
import { BOTTOM_COPY } from "../components/bottom/bottom-copy";
import { BANNER_DISMISSAL_KEY } from "../lib/models/banner-dismissal";
import { TOOLBAR_TIP_DISMISSAL_KEY } from "../lib/models/toolbar-tip";
import { BOARD_PRESETS } from "../lib/geometry/presets";
import { bottomFloorScanSettled, bottomPhoneRow, bottomPhoneTab, showBottomSection, type BottomSection } from "./helpers/bottom";
import { forgetOpenBoardOnEveryLoad } from "./helpers/open-board";
import { goToScreen } from "./helpers/screens";

/**
 * BOTTOM on a phone (Phase 17, plan 17-14, D-27; UI-SPEC §6).
 *
 * Upright: the drawing is pinned over the controls at two thirds of the screen, the folder's card the same height on
 * VIEWER, DATA and GUIDE; VIEWER carries RAILS' NOSE · CENTER · TAIL row and only the picked section's controls are
 * drawn beneath; the controls, DATA and GUIDE each scroll inside their own box and the page itself never moves. DATA's
 * two tables show their rows (the fault 17-13's look found: on a phone they had been squeezed to their headings), and
 * the layout-marks table with eight channels scrolls sideways with its station column staying put (E17's backstop).
 *
 * Held sideways a phone is wide enough for the computer's layout — the controls beside the drawing, all three sections
 * in them, no NOSE · CENTER · TAIL row — and short. There BOTTOM does what RAILS does: its two drawings keep a floor
 * of height between them, the card grows to hold them, and the drawing column scrolls; DATA and GUIDE grow the same
 * way and scroll with the column. The page itself still never moves.
 *
 * And one proof that is FINS' (the orchestrator's ruling 3b, from 17-13's look): the two buttons in FINS' icon row sit
 * 6 dots apart, so their 44-dot touch areas share a thin strip between them — a tap on either button's own centre
 * still presses that button and only that one.
 *
 * No figure is typed: every number here is read off the page, and the two-thirds rule is worked from the screen's own
 * height.
 */

async function dismissStrips(page: Page) {
  await page.addInitScript((key) => window.sessionStorage.setItem(key, "true"), BANNER_DISMISSAL_KEY);
  await page.addInitScript((key) => window.localStorage.setItem(key, "true"), TOOLBAR_TIP_DISMISSAL_KEY);
}

/** Opens a preset from the home page and walks to BOTTOM by ☰ and its tile, so the board stays the one opened. A
 * phone's preset card carries the board's litres; a computer's says `Start Shaping`. */
async function openBottom(page: Page, presetId: string) {
  const preset = BOARD_PRESETS.find((p) => p.id === presetId);
  if (!preset) throw new Error(`no ${presetId} preset`);
  await page.goto("/");
  const card = page
    .getByRole("button")
    .filter({ hasText: preset.name })
    .filter({ hasText: /Start Shaping|\d\.\d L/ })
    .first();
  await expect(async () => {
    if (!/\/design\/outline$/.test(page.url()) && (await card.count()) > 0) {
      await card.scrollIntoViewIfNeeded({ timeout: 2_000 });
      await card.click({ timeout: 2_000 });
    }
    await expect(page).toHaveURL(/\/design\/outline$/, { timeout: 5_000 });
  }).toPass({ timeout: 90_000 });
  await goToScreen(page, "BOTTOM");
  await expect(page.locator("[data-bottom-top-view]")).toBeVisible({ timeout: 60_000 });
}

const sectionCard = (page: Page, section: BottomSection): Locator => page.locator(`[data-bottom-card="${section}"]`);
const controls = (page: Page): Locator => page.locator("[data-design-controls-scroll]");
const live = (page: Page): Locator => page.locator("[data-bottom-live]");
const fold = (text: string | null) => (text ?? "").replace(/\s+/g, " ").trim();

/** Picks an option from a menu by its spoken name, retried until React owns the menu. */
async function pickFrom(page: Page, selectName: string, option: string) {
  const trigger = page.getByRole("combobox", { name: selectName, exact: true });
  await expect(async () => {
    await trigger.click({ timeout: 2_000 });
    await page.getByRole("option", { name: option, exact: true }).click({ timeout: 2_000 });
    await expect(trigger.locator("[data-slot=select-value]")).toHaveText(option, { timeout: 2_000 });
  }).toPass({ timeout: 60_000 });
}

/** Opens one of the folder's tabs — VIEWER, DATA, GUIDE — retried until React owns the strip. */
async function openTab(page: Page, name: string, shows: Locator) {
  const tab = page.getByRole("tab", { name, exact: true });
  await expect(async () => {
    await tab.click({ timeout: 2_000 });
    await expect(shows).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 60_000 });
}

/** Which sections' controls are drawn right now. */
async function shownSections(page: Page): Promise<string[]> {
  return page
    .locator("[data-bottom-card]")
    .evaluateAll((els) => els.filter((el) => el.getBoundingClientRect().height > 0).map((el) => el.getAttribute("data-bottom-card") ?? ""));
}

/** The screen's height, the drawing column's and the folder card's, and how far the page itself has moved. */
async function pinned(page: Page) {
  return page.evaluate(() => {
    const column = document.querySelector("main")!.getBoundingClientRect();
    const card = document.querySelector("[data-viewer-panel]")!.getBoundingClientRect();
    return {
      screen: window.innerHeight,
      columnTop: column.top,
      column: column.height,
      card: card.height,
      controlsTop: document.querySelector("[data-design-controls-scroll]")!.getBoundingClientRect().top,
      pageMoved: window.scrollY,
      pageHeight: document.documentElement.scrollHeight,
      pageWidth: document.documentElement.scrollWidth,
      screenWidth: window.innerWidth,
    };
  });
}

/** The drawing column is no taller than two thirds of the screen and the card fills it (UI-SPEC §6: 66% of the screen
 * less the column's rims, the tab strip and the folder's border — 41 dots at most). */
function expectPinned(read: Awaited<ReturnType<typeof pinned>>, where: string) {
  const twoThirds = read.screen * 0.66;
  expect(read.column, `${where}: the drawing column`).toBeLessThanOrEqual(twoThirds + 0.5);
  expect(read.card, `${where}: the card`).toBeGreaterThanOrEqual(twoThirds - 41);
  expect(read.card, `${where}: the card inside the column`).toBeLessThan(read.column);
}

/** The page itself has not moved and cannot: nothing is taller or wider than the screen, and asking it to scroll does
 * nothing. */
async function expectPageStill(page: Page, where: string) {
  const read = await pinned(page);
  expect(read.pageMoved, `${where}: the page moved`).toBe(0);
  expect(read.pageHeight, `${where}: the page is taller than the screen`).toBeLessThanOrEqual(read.screen);
  expect(read.pageWidth, `${where}: the page is wider than the screen`).toBeLessThanOrEqual(read.screenWidth);
  expect(
    await page.evaluate(() => {
      window.scrollTo(0, 400);
      return window.scrollY;
    }),
    `${where}: the page can be scrolled`,
  ).toBe(0);
}

/** Scrolls a box to its end and says how far it went and how much it holds. */
async function scrollToEnd(box: Locator): Promise<{ moved: number; holds: number; shows: number }> {
  return box.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
    return { moved: el.scrollTop, holds: el.scrollHeight, shows: el.clientHeight };
  });
}

test.describe("BOTTOM on an upright phone: the drawing pinned on top, NOSE · CENTER · TAIL, one section's controls beneath (17-14, D-27)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "the phones' layout; a computer's is every other BOTTOM spec");
    await dismissStrips(page);
    await forgetOpenBoardOnEveryLoad(page);
  });

  test("the drawing is pinned at two thirds of the screen on VIEWER, DATA and GUIDE; GUIDE is one card across and scrolls inside; the page never moves", async ({ page }) => {
    test.setTimeout(240_000);
    await openBottom(page, "shortboard");

    const viewer = await pinned(page);
    expectPinned(viewer, "VIEWER");
    await expect(bottomPhoneRow(page)).toBeVisible();
    await expectPageStill(page, "VIEWER");

    // DATA: the same card, the controls beneath it where they were, all three sections' controls there.
    await openTab(page, BOTTOM_COPY.dataTab, page.locator("[data-bottom-data]"));
    const data = await pinned(page);
    expectPinned(data, "DATA");
    expect(Math.abs(data.card - viewer.card), "DATA's card is VIEWER's height").toBeLessThan(0.6);
    expect(Math.abs(data.controlsTop - viewer.controlsTop), "DATA moved the controls").toBeLessThan(0.6);
    await expect(bottomPhoneRow(page)).toHaveCount(0);
    expect(await shownSections(page)).toEqual(["nose", "center", "tail"]);
    await expectPageStill(page, "DATA");

    // GUIDE: the same card again, one card across, and its cards scroll inside it.
    const guide = page.locator("[data-bottom-guide]");
    await openTab(page, BOTTOM_COPY.guideTab, guide);
    const guideRead = await pinned(page);
    expectPinned(guideRead, "GUIDE");
    expect(Math.abs(guideRead.card - viewer.card), "GUIDE's card is VIEWER's height").toBeLessThan(0.6);
    expect(Math.abs(guideRead.controlsTop - viewer.controlsTop), "GUIDE moved the controls").toBeLessThan(0.6);
    const lefts = await guide.locator("[data-guide-card]").evaluateAll((els) => [...new Set(els.map((el) => Math.round(el.getBoundingClientRect().left)))]);
    expect(lefts, "GUIDE's cards stand in one column").toHaveLength(1);
    const scrolled = await scrollToEnd(guide);
    expect(scrolled.holds).toBeGreaterThan(scrolled.shows);
    expect(scrolled.moved).toBeGreaterThan(0);
    await expect(guide.locator("[data-guide-card]").last()).toBeInViewport();
    expectPinned(await pinned(page), "GUIDE, scrolled to its end");
    await expectPageStill(page, "GUIDE");

    test.info().annotations.push({
      type: "pinned heights",
      description: `screen ${viewer.screen}, two thirds ${(viewer.screen * 0.66).toFixed(1)}: column ${viewer.column.toFixed(1)}, card ${viewer.card.toFixed(1)} on all three tabs`,
    });
  });

  test("NOSE · CENTER · TAIL opens on CENTER with only CENTER's controls; tapping TAIL shows only TAIL's and makes it the live cut, the rail marks following", async ({ page }) => {
    test.setTimeout(240_000);
    await openBottom(page, "shortboard");

    // The row: three tabs in the board's order, CENTER picked, and only CENTER's controls beneath.
    await expect(bottomPhoneRow(page).getByRole("tab")).toHaveText(["Nose", "Center", "Tail"]);
    await expect(bottomPhoneTab(page, "center")).toHaveAttribute("aria-selected", "true");
    await expect(live(page)).toHaveAttribute("data-bottom-live", "center");
    expect(await shownSections(page)).toEqual(["center"]);

    // A cut in CENTER and one in TAIL, each picked the way a shaper would: tap the section, open its menu.
    await showBottomSection(page, "center");
    await pickFrom(page, "Center Cut", "Deep Single Concave");
    await showBottomSection(page, "tail");
    expect(await shownSections(page)).toEqual(["tail"]);
    await expect(live(page)).toHaveAttribute("data-bottom-live", "tail");
    await pickFrom(page, "Tail Cut", "Spiral Vee");

    // The lower rail's START mark is the picked section's own Start, in the same words its slider's label says.
    const startOf = async (section: BottomSection) => {
      const label = fold(await sectionCard(page, section).getByText(/^Start\s—\s/).first().textContent());
      const match = label.match(/^Start — (.+) from the (?:nose|tail)$/);
      expect(match, label).not.toBeNull();
      return match![1];
    };
    const startMark = async () => fold(await page.locator('[data-bottom-rail-mark="start"] text').textContent());

    const tailStart = await startOf("tail");
    await expect.poll(startMark).toBe(`START ${tailStart}`);

    await bottomPhoneTab(page, "center").tap();
    await expect(bottomPhoneTab(page, "center")).toHaveAttribute("aria-selected", "true");
    await expect(bottomPhoneTab(page, "tail")).toHaveAttribute("aria-selected", "false");
    await expect(live(page)).toHaveAttribute("data-bottom-live", "center");
    expect(await shownSections(page)).toEqual(["center"]);
    const centerStart = await startOf("center");
    expect(centerStart).not.toBe(tailStart);
    await expect.poll(startMark).toBe(`START ${centerStart}`);

    await bottomPhoneTab(page, "tail").tap();
    await expect(live(page)).toHaveAttribute("data-bottom-live", "tail");
    expect(await shownSections(page)).toEqual(["tail"]);
    await expect.poll(startMark).toBe(`START ${tailStart}`);

    // NOSE the same way: its own controls, nothing cut there yet.
    await bottomPhoneTab(page, "nose").tap();
    await expect(live(page)).toHaveAttribute("data-bottom-live", "nose");
    expect(await shownSections(page)).toEqual(["nose"]);
    await expect(page.getByRole("combobox", { name: "Nose Cut", exact: true })).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Tail Cut", exact: true })).toBeHidden();
    await expectPageStill(page, "after the row's taps");
  });

  test("TAIL with six channels: the controls scroll by themselves under the pinned drawing, and the page stays put", async ({ page }) => {
    test.setTimeout(240_000);
    await openBottom(page, "shortboard");
    const before = await pinned(page);

    await showBottomSection(page, "tail");
    await pickFrom(page, "Tail Cut", "Spiral Vee");
    await pickFrom(page, "Channels", "6 channels");
    // The channels are TAIL's own block: the row still says TAIL, and only TAIL's controls are drawn.
    await expect(live(page)).toHaveAttribute("data-bottom-live", "channels");
    await expect(bottomPhoneTab(page, "tail")).toHaveAttribute("aria-selected", "true");
    expect(await shownSections(page)).toEqual(["tail"]);

    const scrolled = await scrollToEnd(controls(page));
    expect(scrolled.holds, "the controls are longer than their box").toBeGreaterThan(scrolled.shows * 2);
    expect(scrolled.moved).toBeGreaterThan(0);
    // The last of the channels' sliders is reached by scrolling the controls alone. (The slider's own input is a hidden
    // one-dot box; its thumb is what a finger sees. On the shortest phone the controls' box is shorter than what stands
    // under that slider, so the thumb is brought to the middle of the box rather than looked for at the very end.)
    const lastThumb = page.locator('[data-slot="slider-thumb"]', { has: page.getByRole("slider", { name: "Channels Smoothness", exact: true }) });
    await lastThumb.evaluate((el) => el.scrollIntoView({ block: "center" }));
    await expect(lastThumb).toBeInViewport({ ratio: 0.99 });
    const box = (await controls(page).boundingBox())!;
    const thumb = (await lastThumb.boundingBox())!;
    expect(thumb.y, "the thumb is inside the controls' own box").toBeGreaterThanOrEqual(box.y);
    expect(thumb.y + thumb.height).toBeLessThanOrEqual(box.y + box.height);

    // Nothing above the controls moved, and the page itself did not scroll.
    const after = await pinned(page);
    expectPinned(after, "VIEWER with six channels");
    expect(Math.abs(after.columnTop - before.columnTop)).toBeLessThan(0.6);
    expect(Math.abs(after.column - before.column)).toBeLessThan(0.6);
    expect(Math.abs(after.controlsTop - before.controlsTop)).toBeLessThan(0.6);
    await expect(page.locator("[data-bottom-top-view]")).toBeInViewport({ ratio: 0.99 });
    await expectPageStill(page, "six channels");
  });

  test("DATA shows both tables' rows, and with eight channels the layout marks scroll sideways with the station column staying put", async ({ page }) => {
    test.setTimeout(240_000);
    await openBottom(page, "shortboard");
    await showBottomSection(page, "center");
    await pickFrom(page, "Center Cut", "Deep Single Concave");
    await showBottomSection(page, "tail");
    await pickFrom(page, "Tail Cut", "Spiral Vee");
    await pickFrom(page, "Channels", "8 channels");

    const data = page.locator("[data-bottom-data]");
    await openTab(page, BOTTOM_COPY.dataTab, data);
    // The floor notes land a moment after the last pick and lengthen the page: it is measured once they are in.
    await bottomFloorScanSettled(page);

    // Each table's own box is as tall as its table — no row squeezed out of sight (17-13's fault) — and the rows are
    // on the page, the first of them in view as DATA opens.
    for (const table of ["[data-bottom-depths]", "[data-bottom-marks]"]) {
      const read = await data.locator(table).evaluate((el) => {
        const box = el.parentElement!.parentElement!;
        return { table: el.getBoundingClientRect().height, box: box.clientHeight, rows: el.querySelectorAll("tbody tr").length };
      });
      expect(read.rows, `${table}: rows`).toBeGreaterThan(5);
      expect(read.box, `${table}: the box holds its whole table`).toBeGreaterThanOrEqual(Math.floor(read.table));
    }
    // (A row is wider than the phone — the table scrolls sideways — so it is the row's own first cell that is asked.)
    await expect(data.locator("[data-bottom-depths] tbody tr").first().locator("th, td").first()).toBeInViewport({ ratio: 0.99 });
    await expect(data.locator("[data-bottom-depths] tbody tr").nth(1).locator("th, td").first()).toBeInViewport({ ratio: 0.99 });

    // DATA scrolls down inside the pinned card to the layout marks.
    const firstMarkRow = data.locator("[data-bottom-marks] tbody tr").first();
    await firstMarkRow.scrollIntoViewIfNeeded();
    await expect(firstMarkRow.locator("th, td").first()).toBeInViewport({ ratio: 0.99 });
    expect(await data.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);

    // E17's backstop: eight channels' columns are wider than the phone, so the table scrolls sideways inside its own
    // box — every column kept, the station column staying at the box's left edge, and the last column coming to rest
    // clear of the 24-dot fade at the right.
    const sideways = await data.locator("[data-bottom-marks]").evaluate((el) => {
      const box = el.parentElement!.parentElement!;
      const style = getComputedStyle(box);
      const station = el.querySelector("tbody tr th")!;
      const columns = el.querySelectorAll("thead th").length - 1;
      const before = { stationLeft: station.getBoundingClientRect().left, boxLeft: box.getBoundingClientRect().left };
      box.scrollLeft = box.scrollWidth;
      const lastColumn = el.querySelector("thead th:last-child")!.getBoundingClientRect();
      const lastCell = el.querySelector("tbody tr td:last-child")!.getBoundingClientRect();
      return {
        columns,
        holds: box.scrollWidth,
        shows: box.clientWidth,
        moved: box.scrollLeft,
        fade: style.maskImage || style.webkitMaskImage || "",
        before,
        stationLeftAfter: station.getBoundingClientRect().left,
        boxRight: box.getBoundingClientRect().right,
        lastRight: Math.max(lastColumn.right, lastCell.right),
      };
    });
    expect(sideways.columns, "a column a mark").toBeGreaterThan(4);
    expect(sideways.holds).toBeGreaterThan(sideways.shows);
    expect(sideways.moved).toBeGreaterThan(0);
    expect(sideways.fade).toContain("linear-gradient");
    expect(Math.abs(sideways.before.stationLeft - sideways.before.boxLeft), "the station column starts at the box's left").toBeLessThan(0.6);
    expect(Math.abs(sideways.stationLeftAfter - sideways.before.boxLeft), "the station column stayed put").toBeLessThan(0.6);
    expect(sideways.lastRight, "the last column is clear of the fade").toBeLessThanOrEqual(sideways.boxRight - 23.5);
    await expect(data.locator("[data-bottom-marks] tbody tr th").first()).toBeInViewport({ ratio: 0.99 });

    expectPinned(await pinned(page), "DATA with eight channels");
    await expectPageStill(page, "DATA with eight channels");
    test.info().annotations.push({
      type: "layout marks",
      description: `${sideways.columns} columns, ${sideways.holds} dots of table in a ${sideways.shows}-dot box`,
    });
  });
});

/** The sizes real hardware reports, never an emulator's swap (CLAUDE.md, Layout): a sideways iPhone is about 844 dots
 * wide and a Pixel 7 about 863 — both over the layout's 820, so both get the computer's layout, on a short screen.
 * Each phone is walked at its whole screen and at the shorter page its browser leaves under its own bar. */
const SIDEWAYS: Record<string, ReadonlyArray<{ width: number; height: number; what: string }>> = {
  iphone: [
    { width: 844, height: 390, what: "an iPhone's whole screen" },
    { width: 844, height: 340, what: "the page Safari leaves under its bar" },
  ],
  android: [
    { width: 863, height: 393, what: "a Pixel 7's whole screen" },
    { width: 863, height: 360, what: "the page Chrome leaves under its bar" },
  ],
};

/**
 * The least height VIEWER's three drawings, with their captions, key and `Section at`, keep between them on a short screen
 * (UI-SPEC §6, open item 2; 360 for two drawings, raised for the side view in quick 261112-ogx): measured on the sideways
 * iPhone (844 x 390) and Pixel 7 (863 x 360) at ×1, it leaves the board from below at least 150 dots and the cross-section
 * at least 100, and the side view its drawing.
 */
const DRAWINGS_FLOOR = 470;

/** Waits until the drawing column has stopped changing size — two reads a tenth of a second apart that agree — so a
 * measurement is never taken halfway through the layout a turned phone asks for. */
async function settleColumn(page: Page) {
  let previous = "";
  await expect(async () => {
    const current = await page.evaluate(() => {
      const main = document.querySelector("main")!;
      const box = main.getBoundingClientRect();
      return `${box.width}|${box.height}|${main.scrollHeight}|${window.innerWidth}|${window.innerHeight}`;
    });
    const matched = current === previous;
    previous = current;
    if (!matched) throw new Error("still settling");
  }).toPass({ timeout: 15_000, intervals: [100] });
}

/** What a sideways phone shows: the top bar, the drawing column and what it holds, the card, and the controls. */
async function sidewaysRead(page: Page) {
  return page.evaluate(() => {
    const box = (selector: string) => document.querySelector(selector)?.getBoundingClientRect();
    const main = document.querySelector("main")!;
    const column = main.getBoundingClientRect();
    return {
      screen: { width: window.innerWidth, height: window.innerHeight },
      bar: [...document.querySelectorAll("header")].map((el) => el.getBoundingClientRect().height).find((height) => height > 0) ?? 0,
      column: { top: column.top, bottom: column.bottom, left: column.left, right: column.right, shows: main.clientHeight, holds: main.scrollHeight, scrolls: getComputedStyle(main).overflowY },
      card: box("[data-viewer-panel]")?.height ?? 0,
      drawings: box("[data-bottom-live]")?.height ?? 0,
      topView: box("[data-bottom-top-view]")?.height ?? 0,
      section: box("[data-bottom-section]")?.height ?? 0,
      side: box('[data-bottom-box="side"]')?.height ?? 0,
      controls: { right: box("[data-design-controls-scroll]")?.right ?? 0, width: box("[data-design-controls-scroll]")?.width ?? 0 },
      pageMoved: window.scrollY,
      pageHeight: document.documentElement.scrollHeight,
      pageWidth: document.documentElement.scrollWidth,
    };
  });
}

/** Scrolls the drawing column to its end, the way a thumb would, and says how far it went. */
async function scrollColumnToEnd(page: Page): Promise<number> {
  return page.locator("main").evaluate((el) => {
    el.scrollTop = el.scrollHeight;
    return el.scrollTop;
  });
}

test.describe("BOTTOM on a phone held sideways: the drawings keep their height and the column scrolls (17-14, D-27)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "the phones' layout; a computer's is every other BOTTOM spec");
    await dismissStrips(page);
    await forgetOpenBoardOnEveryLoad(page);
  });

  test("turned on its side: the controls beside the drawing under the compact bar, the two drawings keeping their height, the column scrolling to the section, and DATA and GUIDE growing with the column — the page never moving", async ({ page }, testInfo) => {
    test.setTimeout(420_000);
    // The board is cut upright, as a shaper would have it in hand, and then the phone is turned.
    await openBottom(page, "shortboard");
    await showBottomSection(page, "center");
    await pickFrom(page, "Center Cut", "Deep Single Concave");
    await showBottomSection(page, "tail");
    await pickFrom(page, "Tail Cut", "Spiral Vee");
    await pickFrom(page, "Channels", "6 channels");

    const notes: string[] = [];
    for (const size of SIDEWAYS[testInfo.project.name]) {
      const where = `${size.width}x${size.height} (${size.what})`;
      await page.setViewportSize({ width: size.width, height: size.height });
      await openTab(page, BOTTOM_COPY.viewerTab, page.locator("[data-bottom-top-view]"));
      await page.locator("main").evaluate((el) => (el.scrollTop = 0));
      await settleColumn(page);

      // The computer's layout under the phone's compact bar: the controls beside the drawing, every section in them,
      // and no NOSE · CENTER · TAIL row.
      const viewer = await sidewaysRead(page);
      expect(viewer.bar, `${where}: the compact top bar is there`).toBeGreaterThan(40);
      expect(viewer.bar, `${where}: the compact top bar`).toBeLessThanOrEqual(49);
      expect(viewer.controls.width, `${where}: the controls keep a column of their own`).toBeGreaterThan(300);
      expect(viewer.controls.right, `${where}: the controls stand beside the drawing, never over it`).toBeLessThanOrEqual(viewer.column.left + 1);
      await expect(bottomPhoneRow(page)).toBeHidden();
      expect(await shownSections(page)).toEqual(["nose", "center", "tail"]);
      await expect(page.getByRole("combobox", { name: "Nose Cut", exact: true })).toBeVisible();
      await expect(page.getByRole("combobox", { name: "Tail Cut", exact: true })).toBeAttached();

      // The two drawings keep their floor, each tall enough to read, and the card holds them: the column is longer than
      // the screen and scrolls — the column, not the page.
      expect(viewer.drawings, `${where}: the three drawings' height`).toBeGreaterThanOrEqual(DRAWINGS_FLOOR);
      expect(viewer.topView, `${where}: the top view`).toBeGreaterThanOrEqual(150);
      expect(viewer.section, `${where}: the cross-section`).toBeGreaterThanOrEqual(100);
      expect(viewer.side, `${where}: the side view`).toBeGreaterThanOrEqual(30);
      expect(viewer.card, `${where}: the card holds the drawings`).toBeGreaterThanOrEqual(viewer.drawings);
      expect(viewer.column.scrolls, `${where}: the column may scroll`).toBe("auto");
      expect(viewer.column.holds, `${where}: the column holds more than it shows`).toBeGreaterThan(viewer.column.shows);
      await expect(page.locator("[data-bottom-top-view]")).toBeInViewport({ ratio: 0.5 });
      expect(await scrollColumnToEnd(page), `${where}: the column scrolled`).toBeGreaterThan(0);
      await expect(page.locator("[data-bottom-section]")).toBeInViewport({ ratio: 0.99 });
      // the side view, its key and facts and `Section at` come into view too
      await expect(page.locator("[data-bottom-side-view]")).toBeInViewport({ ratio: 0.99 });
      await expect(page.locator("[data-bottom-side-key]")).toBeInViewport({ ratio: 0.99 });
      await expect(page.locator("[data-bottom-side-facts]")).toBeInViewport({ ratio: 0.99 });
      await expect(page.getByRole("slider", { name: BOTTOM_COPY.sectionAt, exact: true }).locator('xpath=ancestor::*[@data-slot="slider-thumb"]')).toBeInViewport();
      await expectPageStill(page, `${where}, VIEWER`);

      // DATA: the card grows to hold both tables, whole — nothing scrolls inside it — and the column scrolls to the
      // last row.
      const data = page.locator("[data-bottom-data]");
      await openTab(page, BOTTOM_COPY.dataTab, data);
      await bottomFloorScanSettled(page);
      await settleColumn(page);
      const dataRead = await data.evaluate((el) => ({ holds: el.scrollHeight, shows: el.clientHeight }));
      expect(dataRead.holds, `${where}: DATA is whole inside its card`).toBeLessThanOrEqual(dataRead.shows + 1);
      for (const table of ["[data-bottom-depths]", "[data-bottom-marks]"]) {
        const read = await data.locator(table).evaluate((el) => {
          const box = el.parentElement!.parentElement!;
          return { table: el.getBoundingClientRect().height, box: box.clientHeight, rows: el.querySelectorAll("tbody tr").length };
        });
        expect(read.rows, `${where}, ${table}: rows`).toBeGreaterThan(5);
        expect(read.box, `${where}, ${table}: the box holds its whole table`).toBeGreaterThanOrEqual(Math.floor(read.table));
      }
      const dataColumn = await sidewaysRead(page);
      expect(dataColumn.column.holds, `${where}: DATA is longer than the screen`).toBeGreaterThan(dataColumn.column.shows);
      expect(await scrollColumnToEnd(page)).toBeGreaterThan(0);
      // The column's end is the last of DATA's notes; the last row of the last table stands just above them, and on the
      // shortest page it is the column, again, that brings it whole onto the screen.
      await expect(data.locator("[data-bottom-notes] p").last()).toBeInViewport({ ratio: 0.99 });
      const lastRow = data.locator("[data-bottom-marks] tbody tr").last().locator("th, td").first();
      await lastRow.scrollIntoViewIfNeeded();
      await expect(lastRow).toBeInViewport({ ratio: 0.99 });
      await expectPageStill(page, `${where}, DATA`);

      // GUIDE: the same — every card in the card, the column scrolling to the last of them.
      const guide = page.locator("[data-bottom-guide]");
      await openTab(page, BOTTOM_COPY.guideTab, guide);
      await settleColumn(page);
      const guideRead = await guide.evaluate((el) => ({ holds: el.scrollHeight, shows: el.clientHeight }));
      expect(guideRead.holds, `${where}: GUIDE is whole inside its card`).toBeLessThanOrEqual(guideRead.shows + 1);
      const guideColumn = await sidewaysRead(page);
      expect(guideColumn.column.holds, `${where}: GUIDE is longer than the screen`).toBeGreaterThan(guideColumn.column.shows);
      expect(await scrollColumnToEnd(page)).toBeGreaterThan(0);
      // A card can stand taller than a sideways screen, so the proof is its foot: the last card ends inside the column.
      const lastCard = await guide.locator("[data-guide-card]").last().evaluate((el) => {
        const card = el.getBoundingClientRect();
        const column = document.querySelector("main")!.getBoundingClientRect();
        return { foot: card.bottom, top: card.top, columnFoot: column.bottom };
      });
      expect(lastCard.foot, `${where}: the last GUIDE card's foot is on the screen`).toBeLessThanOrEqual(lastCard.columnFoot + 1);
      expect(lastCard.top, `${where}: the last GUIDE card reaches up into the column`).toBeLessThan(lastCard.columnFoot - 100);
      await expect(guide.locator("[data-guide-card]").last()).toBeInViewport({ ratio: 0.3 });
      await expectPageStill(page, `${where}, GUIDE`);

      notes.push(
        `${where}: drawings ${Math.round(viewer.drawings)} (top view ${Math.round(viewer.topView)}, section ${Math.round(viewer.section)}, side view ${Math.round(viewer.side)}), ` +
          `column shows ${viewer.column.shows} of ${viewer.column.holds}; DATA ${dataColumn.column.holds}; GUIDE ${guideColumn.column.holds}`,
      );
    }
    test.info().annotations.push({ type: "sideways", description: notes.join(" · ") });
  });
});

test.describe("FINS on a phone: the two icon buttons' touch areas (17-13's look, ruling 3b)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "a mouse's buttons take no touch area");
    await dismissStrips(page);
    await forgetOpenBoardOnEveryLoad(page);
  });

  test("a tap on either button's own centre presses that button and only that one, though their touch areas share a strip of the gap", async ({ page }) => {
    test.setTimeout(300_000);
    await openBottom(page, "shortboard");
    await showBottomSection(page, "tail");
    await pickFrom(page, "Tail Cut", "Spiral Vee");
    await goToScreen(page, "FINS");

    const contours = page.locator("[data-fins-contour-toggle]");
    const callouts = page.getByRole("button", { name: /fin placement callouts$/ });
    await expect(contours).toBeVisible({ timeout: 60_000 });
    await expect(callouts).toBeVisible();
    const pressed = async () => ({
      contours: await contours.getAttribute("aria-pressed"),
      callouts: await callouts.getAttribute("aria-pressed"),
    });
    const flip = (value: string | null) => (value === "true" ? "false" : "true");

    // Where the two stand: side by side, each with a touch area wider than it is drawn, the two areas meeting in the gap.
    const geometry = await page.evaluate(() => {
      const read = (el: Element) => {
        const box = el.getBoundingClientRect();
        const after = getComputedStyle(el, "::after");
        const grow = after.content === "none" || after.position !== "absolute" ? 0 : (parseFloat(after.width) - box.width) / 2;
        return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, grow };
      };
      const a = read(document.querySelector("[data-fins-contour-toggle]")!);
      const b = read([...document.querySelectorAll("button")].find((el) => /fin placement callouts$/.test(el.getAttribute("aria-label") ?? ""))!);
      const [first, second] = a.left < b.left ? [a, b] : [b, a];
      return {
        gap: second.left - first.right,
        shared: first.right + first.grow - (second.left - second.grow),
        drawn: first.right - first.left,
        touch: first.right - first.left + 2 * first.grow,
      };
    });
    // Measured, not assumed: a 34-dot button with a one-dot border gets a 42-dot touch area from the shared rule (its
    // five dots a side are counted from inside the border), not the 44 the rule is named for. Left as it is on the
    // orchestrator's ruling; pinned here at what is true, and raised for the founder in 17-14's summary.
    expect(geometry.touch, "each button's touch area is wider than the button is drawn").toBeGreaterThan(geometry.drawn);
    expect(geometry.touch, "each button's touch area").toBeGreaterThanOrEqual(42);
    expect(geometry.gap, "the two buttons do not touch").toBeGreaterThan(0);
    expect(geometry.shared, "the shared strip is narrower than the gap, so it never reaches either button").toBeLessThan(geometry.gap);

    // The point under each button's own centre is that button, and a finger there presses it alone.
    for (const [name, button, other] of [
      ["Bottom Contours", contours, "callouts"],
      ["the callouts", callouts, "contours"],
    ] as const) {
      const centre = await button.evaluate((el) => {
        const box = el.getBoundingClientRect();
        const x = box.left + box.width / 2;
        const y = box.top + box.height / 2;
        const hit = document.elementFromPoint(x, y);
        return { x, y, own: !!hit && (hit === el || el.contains(hit)) };
      });
      expect(centre.own, `${name}: the point under its centre is the button itself`).toBe(true);
      const own = other === "callouts" ? "contours" : "callouts";
      for (let tap = 1; tap <= 2; tap += 1) {
        const before = await pressed();
        await page.touchscreen.tap(centre.x, centre.y);
        await expect.poll(async () => (await pressed())[own], { message: `${name}: tap ${tap} pressed it` }).toBe(flip(before[own]));
        expect((await pressed())[other], `${name}: tap ${tap} left the other button alone`).toBe(before[other]);
      }
    }
    test.info().annotations.push({
      type: "FINS' two buttons",
      description: `${geometry.touch}-dot touch areas, ${geometry.gap} dots apart, sharing ${geometry.shared} dots of that gap`,
    });
  });
});
