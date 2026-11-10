import { expect, test, type Locator, type Page } from "@playwright/test";
import { BOTTOM_COPY } from "../components/bottom/bottom-copy";
import { BANNER_DISMISSAL_KEY } from "../lib/models/banner-dismissal";
import { TOOLBAR_TIP_DISMISSAL_KEY } from "../lib/models/toolbar-tip";
import { BOARD_PRESETS } from "../lib/geometry/presets";
import { bottomPhoneRow, bottomPhoneTab, showBottomSection, type BottomSection } from "./helpers/bottom";
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
