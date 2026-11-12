import { expect, test, type Locator, type Page } from "@playwright/test";
import { BOTTOM_COPY, dataFloorNote } from "../components/bottom/bottom-copy";
import { BANNER_DISMISSAL_KEY } from "../lib/models/banner-dismissal";
import { TOOLBAR_TIP_DISMISSAL_KEY } from "../lib/models/toolbar-tip";
import { BOARD_PRESETS } from "../lib/geometry/presets";
import { BOTTOM_DATA_DEPTH_SHOWN, bottomDataRows, foamOff, type BottomFloorFlag, type BottomSectionKey } from "../lib/geometry/bottom";
import { gaugeReads } from "../lib/geometry/bottom-draw";
import { formatMark, formatMarkBare, formatMarkOrLessBare } from "../lib/geometry/measure-display";
import type { Mm } from "../lib/geometry/units";
import { RACK_COPY } from "../components/setup/rack-config";
import { RACK_STAND_IN_ROUTE, standInRackRows } from "../lib/models/rack-stand-in";
import { bottomFloorScanSettled } from "./helpers/bottom";
import { boardWithBottom, openOnBoard } from "./helpers/bottom-print";
import { forgetOpenBoardOnEveryLoad } from "./helpers/open-board";
import { freshPracticeRack } from "./helpers/practice-rack";
import { goToScreen } from "./helpers/screens";

/**
 * BOTTOM's viewer follows the shaper (Phase 17, plan 17-10; D-12, D-13, D-14, D-30; UI-SPEC §3): press, drag or tap the
 * bottom from above and the cross-section follows; `Section at` is the same station from the keyboard; Height ×1 to ×8
 * with the factor actually drawn; the ruler of the live cut's layout marks — bare from a 1024 window, captioned from
 * about 1100, none at 820 (the section's own box: 548 and 625 dots); the finished rail from RAILS when ticked; and none
 * of it saved.
 *
 * No figure is typed: every station is read off the page — the cutting line's own `data-bottom-cut-at` (the station in
 * mm from the tail), the section's caption and `Section at`'s spoken value — and checked against another.
 */

const SECTION_WORD: Record<BottomSectionKey, string> = { nose: "Nose", center: "Center", tail: "Tail" };

async function dismissStrips(page: Page) {
  await page.addInitScript((key) => window.sessionStorage.setItem(key, "true"), BANNER_DISMISSAL_KEY);
  await page.addInitScript((key) => window.localStorage.setItem(key, "true"), TOOLBAR_TIP_DISMISSAL_KEY);
}

/** Opens a preset from the home page and walks to BOTTOM by the top row (or ☰ and its tile on a phone), so the board
 * stays the one opened. A computer's preset card says `Start Shaping`; a phone's carries the board's litres. */
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
  await expect(cutLine(page)).toBeAttached({ timeout: 60_000 });
}

function card(page: Page, section: BottomSectionKey): Locator {
  return page.locator(`[data-bottom-card="${section}"]`);
}

/** Picks a name from a section's Cut menu, retried until React owns the menu so a click before hydration is never lost. */
async function pick(page: Page, section: BottomSectionKey, name: string) {
  const echo = card(page, section).locator("[data-bottom-cut-echo]");
  if ((await echo.textContent()) === name) return;
  await expect(async () => {
    await page.getByRole("combobox", { name: `${SECTION_WORD[section]} Cut` }).click();
    await page.getByRole("option", { name, exact: true }).click({ timeout: 2_000 });
    await expect(echo).toHaveText(name, { timeout: 2_000 });
  }).toPass({ timeout: 60_000 });
}

/** A Select of the CHANNELS block, by its spoken name. */
async function pickChannels(page: Page, option: string) {
  await expect(async () => {
    await page.getByRole("combobox", { name: "Channels", exact: true }).click();
    await page.getByRole("option", { name: option, exact: true }).click({ timeout: 2_000 });
    await expect(page.locator("[data-bottom-channels-echo]")).not.toHaveText("None", { timeout: 2_000 });
  }).toPass({ timeout: 60_000 });
}

const topView = (page: Page) => page.locator("[data-bottom-top-view]");
const cutLine = (page: Page) => page.locator("[data-bottom-cut-line]");
const sectionAt = (page: Page) => page.getByRole("slider", { name: BOTTOM_COPY.sectionAt, exact: true });
const heightButton = (page: Page, factor: number) => page.getByRole("button", { name: BOTTOM_COPY.heightButtonName(factor), exact: true });
const heightLabel = (page: Page) => page.locator("[data-bottom-height-label]");
const ruler = (page: Page) => page.locator("[data-bottom-ruler]");
const ghostTick = (page: Page) => page.getByRole("checkbox", { name: BOTTOM_COPY.showFinishedRail });

/** The station the section is taken at, in mm from the tail, as the cutting line carries it. */
async function cutAt(page: Page): Promise<number> {
  return Number(await page.locator("[data-bottom-cut-at]").getAttribute("data-bottom-cut-at"));
}

/** The cutting line's x on the screen. */
async function cutLineX(page: Page): Promise<number> {
  const box = await cutLine(page).boundingBox();
  if (!box) throw new Error("no cutting line");
  return box.x + box.width / 2;
}

/** The cutting line stands under the pointer, to within a dot and a half. */
async function expectLineAt(page: Page, x: number) {
  await expect.poll(async () => Math.abs((await cutLineX(page)) - x)).toBeLessThan(1.5);
}

/** The station the caption names, and the one `Section at` speaks — the same words, `36"` or `23 7/16"`. */
async function captionStation(page: Page): Promise<string> {
  const name = (await page.locator("[data-bottom-section]").getAttribute("aria-label")) ?? "";
  const match = name.match(/^Cross-section (.+) from the tail, /);
  expect(match, name).not.toBeNull();
  return match![1];
}
async function sliderStation(page: Page): Promise<string> {
  const spoken = (await sectionAt(page).getAttribute("aria-valuetext")) ?? "";
  const match = spoken.match(/^(.+) from the tail$/);
  expect(match, spoken).not.toBeNull();
  return match![1];
}

/** The caption, `Section at` and the cutting line all name one station. */
async function expectOneStation(page: Page) {
  await expect.poll(async () => (await captionStation(page)) === (await sliderStation(page))).toBe(true);
}

/** A point on the top view at a share of its width, on the stringer's height. */
async function topViewPoint(page: Page, share: number): Promise<{ x: number; y: number }> {
  const box = await topView(page).boundingBox();
  if (!box) throw new Error("no top view");
  return { x: box.x + box.width * share, y: box.y + box.height * 0.45 };
}

test.describe("BOTTOM's viewer follows the shaper (17-10)", () => {
  test.beforeEach(async ({ page }) => {
    await dismissStrips(page);
  });

  test("a drag on the top view moves the section, `Section at` and the caption with it; a tap jumps it; the arrow keys move the line", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "a mouse's drag; the phones' touch drag and tap are below");
    test.setTimeout(240_000);
    await forgetOpenBoardOnEveryLoad(page);
    await openBottom(page, "shortboard");
    await expectOneStation(page);
    const opening = await cutAt(page);

    // A drag from a third of the way along to two thirds: the section follows the pointer the whole way.
    const from = await topViewPoint(page, 0.33);
    const to = await topViewPoint(page, 0.66);
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await expectLineAt(page, from.x);
    await page.mouse.move((from.x + to.x) / 2, to.y, { steps: 6 });
    await expectLineAt(page, (from.x + to.x) / 2);
    await page.mouse.move(to.x, to.y, { steps: 6 });
    await page.mouse.up();
    await expectLineAt(page, to.x);
    const dragged = await cutAt(page);
    expect(dragged, "nose left: further right is nearer the tail").toBeLessThan(opening);
    await expectOneStation(page);

    // A tap jumps it, and a wobble under 8 dots leaves it where the tap landed.
    const tap = await topViewPoint(page, 0.5);
    await page.mouse.move(tap.x, tap.y);
    await page.mouse.down();
    await page.mouse.move(tap.x + 5, tap.y + 2);
    await page.mouse.up();
    await expectLineAt(page, tap.x);
    await expectOneStation(page);
    const tapped = await cutAt(page);

    // The keyboard: `Section at` is the line's keyboard path. Right is toward the tail (the track runs nose to tail).
    const x0 = await cutLineX(page);
    await sectionAt(page).focus();
    await page.keyboard.press("ArrowRight");
    await expect.poll(() => cutAt(page)).toBeLessThan(tapped);
    expect(await cutLineX(page)).toBeGreaterThan(x0);
    await expectOneStation(page);
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await expect.poll(() => cutLineX(page)).toBeLessThan(x0);
    await expectOneStation(page);
  });

  // The plan named the Longboard's belly here. Measured at 1280 × 800 (a section box 804 × 234 dots), its opening belly
  // is drawn at the full ×8 — a 22 1/2" board leaves room for about 14 mm of cut at ×8 — and no cut can be deeper than
  // its 1/2" Depth, so the Longboard is never fitted at this window. The Shortboard's narrower 18 3/4" is: its Deep
  // Single at 1/2" needs a factor of about 5.3 to fit, so that is the board this test fits.
  test("Height: ×4 when the page opens, TRUE HEIGHT at ×1, and the factor actually drawn when a 1/2\" Deep Single is fitted at ×8", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the computer's walk; the buttons are the same on a phone");
    test.setTimeout(240_000);
    await forgetOpenBoardOnEveryLoad(page);
    await openBottom(page, "shortboard");
    await expect(page.getByRole("group", { name: BOTTOM_COPY.height, exact: true })).toBeVisible();
    await expect(heightButton(page, 4)).toHaveAttribute("aria-pressed", "true");
    await expect(heightLabel(page)).toHaveText("HEIGHT ×4");

    await heightButton(page, 1).click();
    await expect(heightButton(page, 1)).toHaveAttribute("aria-pressed", "true");
    await expect(heightButton(page, 4)).toHaveAttribute("aria-pressed", "false");
    await expect(heightLabel(page)).toHaveText("TRUE HEIGHT");

    await pick(page, "center", "Deep Single Concave");
    await heightButton(page, 8).click();
    await expect(heightButton(page, 8)).toHaveAttribute("aria-pressed", "true");
    // At its opening 1/4" the cut is drawn at the full ×8.
    await expect(heightLabel(page)).toHaveText("HEIGHT ×8");
    // Its Depth to the top of the slider, 1/2": now it is fitted.
    const depth = page.getByRole("slider", { name: "Center Depth", exact: true });
    await depth.focus();
    await page.keyboard.press("End");
    await expect(card(page, "center").getByText(/^Depth — 1\/2"$/)).toBeVisible();
    // Fitted: the label names the factor drawn, to one decimal, and it is less than the 8 asked for.
    await expect(heightLabel(page)).toHaveText(/^HEIGHT ×\d\.\d$/);
    const drawn = Number(((await heightLabel(page).textContent()) ?? "").replace("HEIGHT ×", ""));
    expect(drawn).toBeLessThan(8);
    expect(drawn).toBeGreaterThan(1);
    expect(Number(await page.locator("[data-bottom-section]").getAttribute("data-height"))).toBeCloseTo(drawn, 1);
  });

  test("the ruler of the live cut's marks: bare at a 1024 window, captioned at 1280, none at 820", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the ruler is a computer's (D-14, D-30)");
    test.setTimeout(240_000);
    await forgetOpenBoardOnEveryLoad(page);
    await openBottom(page, "shortboard");
    // A flat board has no marks, so no ruler.
    await expect(ruler(page)).toHaveCount(0);
    await pick(page, "center", "Deep Single Concave");
    await pickChannels(page, "6 channels");
    // The channels are live: their walls are the ruler's ticks, and only from each one's own start.
    await expect(ruler(page)).toHaveAttribute("data-bottom-ruler", "captioned");
    await expect(page.locator("[data-bottom-ruler-caption]")).toHaveText("OFF THE STRINGER");
    expect(await page.locator("[data-bottom-ruler-tick]").count()).toBeGreaterThan(0);

    // CENTER live again: the Deep Single's edge alone.
    await card(page, "center").locator("[data-bottom-cut-echo]").click();
    await expect(page.locator("[data-bottom-live]")).toHaveAttribute("data-bottom-live", "center");
    await expect(page.locator("[data-bottom-ruler-tick]")).toHaveCount(1);
    await expect(page.locator('[data-bottom-ruler-tick="center:edge"]')).toHaveCount(1);

    await page.setViewportSize({ width: 1024, height: 768 });
    await expect(ruler(page)).toHaveAttribute("data-bottom-ruler", "bare");
    await expect(page.locator("[data-bottom-ruler-caption]")).toHaveCount(0);
    expect((await page.locator("[data-bottom-section]").boundingBox())!.width).toBeGreaterThanOrEqual(548);

    await page.setViewportSize({ width: 820, height: 800 });
    await expect(ruler(page)).toHaveCount(0);
    await expect(page.locator("[data-bottom-section]")).toBeVisible();

    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(ruler(page)).toHaveAttribute("data-bottom-ruler", "captioned");
  });

  test("the finished rail from RAILS: off when the page opens, drawn when ticked, gone when unticked", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the tick is in the computer's panel; a phone's stack is 17-14's");
    test.setTimeout(180_000);
    await forgetOpenBoardOnEveryLoad(page);
    await openBottom(page, "shortboard");
    await expect(ghostTick(page)).not.toBeChecked();
    await expect(page.locator("[data-bottom-ghost]")).toHaveCount(0);
    await ghostTick(page).click();
    await expect(ghostTick(page)).toBeChecked();
    await expect(page.locator("[data-bottom-ghost]")).toHaveCount(1);
    await pick(page, "tail", "Panel Vee");
    await expect(page.locator("[data-bottom-ghost]")).toHaveCount(1);
    await ghostTick(page).click();
    await expect(page.locator("[data-bottom-ghost]")).toHaveCount(0);
  });

  test("none of the view is kept: away and back the cut stays but the view opens on ×4, the tick off and the wide point; a reload the same", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the computer's walk");
    test.setTimeout(240_000);
    // No forgetting here: the open Shortboard is kept across the reload (quick 261019-ep5), so its wide point is the same.
    await openBottom(page, "shortboard");
    const wide = await captionStation(page);

    /** Height ×1, the finished rail ticked, the section moved by a tap: the view as a shaper leaves it. */
    async function changeTheView() {
      await heightButton(page, 1).click();
      await expect(heightButton(page, 1)).toHaveAttribute("aria-pressed", "true");
      await ghostTick(page).click();
      await expect(ghostTick(page)).toBeChecked();
      const p = await topViewPoint(page, 0.8);
      await page.mouse.click(p.x, p.y);
      await expect.poll(() => captionStation(page)).not.toBe(wide);
    }
    async function expectTheOpeningView() {
      await expect(heightButton(page, 4)).toHaveAttribute("aria-pressed", "true");
      await expect(ghostTick(page)).not.toBeChecked();
      await expect(page.locator("[data-bottom-ghost]")).toHaveCount(0);
      await expect.poll(() => captionStation(page)).toBe(wide);
      await expectOneStation(page);
    }

    // To RAILS and back by the top row: the board in the store keeps its cut; the view is BOTTOM's own and opens fresh.
    await pick(page, "center", "Deep Single Concave");
    await changeTheView();
    await goToScreen(page, "RAILS");
    await goToScreen(page, "BOTTOM");
    await expect(cutLine(page)).toBeAttached({ timeout: 60_000 });
    await expect(card(page, "center").locator("[data-bottom-cut-echo]")).toHaveText("Deep Single Concave");
    await expectTheOpeningView();

    // A reload: the view opens fresh again. (Whether the cut itself survives a reload is the save's, 17-12's.)
    await changeTheView();
    await page.reload();
    await expect(cutLine(page)).toBeAttached({ timeout: 60_000 });
    await expectTheOpeningView();
  });

  test("on a phone: a tap on the bottom jumps the section, and (Android) a thumb drag carries it", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "the phones' touch; the mouse's drag is above");
    test.setTimeout(240_000);
    await forgetOpenBoardOnEveryLoad(page);
    await openBottom(page, "shortboard");
    await expect(topView(page)).toBeVisible();
    const opening = await cutAt(page);

    const tap = await topViewPoint(page, 0.75);
    await page.touchscreen.tap(tap.x, tap.y);
    await expectLineAt(page, tap.x);
    expect(await cutAt(page)).toBeLessThan(opening);
    await expectOneStation(page);

    if (testInfo.project.name !== "android") return;
    // A trusted thumb drag (Chromium's own touch input, as `touch-drag.spec.ts` drives TEMPLATE).
    const from = await topViewPoint(page, 0.7);
    const to = await topViewPoint(page, 0.3);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: from.x, y: from.y }] });
    for (let i = 1; i <= 6; i++) {
      const x = from.x + ((to.x - from.x) * i) / 6;
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: from.y }] });
    }
    await expectLineAt(page, to.x);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    expect(await cutAt(page)).toBeGreaterThan(opening);
    await expectOneStation(page);
  });
});

test.describe("BOTTOM's DATA lays the bottom out station by station (17-10, D-16)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "DATA is the same page on a phone; its phone stack is 17-14's");
    await dismissStrips(page);
    await forgetOpenBoardOnEveryLoad(page);
  });

  const dataTab = (page: Page) => page.getByRole("tab", { name: BOTTOM_COPY.dataTab, exact: true });
  const notes = (page: Page) => page.locator("[data-bottom-notes] p");

  test("a flat board: Foam off 0.00 L, the depths table with nothing cut, no layout-marks table, two notes and no floor note", async ({ page }) => {
    test.setTimeout(180_000);
    await openBottom(page, "shortboard");
    await dataTab(page).click();
    await expect(page.locator("[data-bottom-litres]")).toHaveText(/^Foam off 0\.00 L · /);
    await expect(page.locator("[data-bottom-depths]")).toBeVisible();
    const deepest = await page.locator("[data-bottom-depths] tbody tr td:nth-of-type(2)").allTextContents();
    expect(deepest.length).toBeGreaterThan(5);
    expect(new Set(deepest)).toEqual(new Set([BOTTOM_COPY.emptyCell]));
    await expect(page.locator("[data-bottom-marks]")).toHaveCount(0);
    await expect(page.getByText(BOTTOM_COPY.marksHeading(false), { exact: true })).toHaveCount(0);
    // Counted once the floor scan has run, so "no floor note" is the scan's answer and not a count taken ahead of it.
    await bottomFloorScanSettled(page);
    await expect(notes(page)).toHaveCount(2);
    await expect(notes(page).first()).toHaveText(BOTTOM_COPY.depthsNote);
    await expect(notes(page).nth(1)).toHaveText(/^Wide point .+ and front fins .+ from the tail are the two rows in full ink\.$/);
    await expect(page.locator("[data-bottom-floor-note]")).toHaveCount(0);
  });

  test("a Deep Single and six channels: the marks table's columns in shop order, a wall `—` ahead of its own channel's start, and the notes", async ({ page }) => {
    test.setTimeout(240_000);
    const shortboard = BOARD_PRESETS.find((p) => p.id === "shortboard")!;
    await openBottom(page, "shortboard");
    await pick(page, "center", "Deep Single Concave");
    // The Deep Single alone: a marks table and its note, which never mentions channels (the founder, 2026-11-09).
    await dataTab(page).click();
    await expect(page.locator("[data-bottom-marks]")).toBeVisible();
    // The floor scan trails a pick by a moment: the notes are counted once it has run, so three notes and no floor note
    // is what the scan found for a Deep Single on this board, not a count read before its answer landed.
    await bottomFloorScanSettled(page);
    await expect(page.locator("[data-bottom-floor-note]")).toHaveCount(0);
    await expect(notes(page)).toHaveCount(3);
    await expect(notes(page).nth(1)).toHaveText(/^Layout marks are measured out from the stringer at each station, .+ ruled onto the blank\.$/);
    await expect(page.locator("[data-bottom-notes]")).not.toContainText("channels abut");
    await page.getByRole("tab", { name: BOTTOM_COPY.viewerTab, exact: true }).click();
    await pickChannels(page, "6 channels");
    await dataTab(page).click();
    const marks = page.locator("[data-bottom-marks]");
    await expect(marks).toBeVisible();
    await expect(page.getByText(BOTTOM_COPY.marksHeading(false), { exact: true })).toBeVisible();
    const headers = await marks.locator("thead th").allTextContents();
    expect(headers[0]).toBe("From the tail");
    const words = headers.slice(1);
    expect(words[0]).toBe("Center edge");
    expect(words).toEqual(expect.arrayContaining(["Wall 1", "Wall 2", "Wall 3"]));
    const walls = words.filter((w) => /^Wall \d$/.test(w));
    expect(walls).toEqual(["Wall 1", "Wall 2", "Wall 3"]);
    // The rows: the depths table's own stations, the same reference rows in ink.
    const depthRows = await page.locator("[data-bottom-depths] tbody th").allTextContents();
    expect(await marks.locator("tbody th").allTextContents()).toEqual(depthRows);
    // Staggered (the outer pair longest, 2" a channel): a row where an outer wall is ruled and an inner one is not yet.
    const cells = await marks.locator("tbody tr").evaluateAll((trs, wallAt) =>
      trs.map((tr) => [...tr.querySelectorAll("td")].map((td) => td.textContent ?? "").filter((_, i) => (wallAt as number[]).includes(i))),
    words.map((w, i) => (/^Wall \d$/.test(w) ? i : -1)).filter((i) => i >= 0));
    expect(
      cells.some((row) => row.includes(BOTTOM_COPY.emptyCell) && row.some((v) => v !== BOTTOM_COPY.emptyCell)),
      "a staggered wall reads — ahead of its own channel's start",
    ).toBe(true);
    // Six starting channels on the stock Shortboard run their outer walls into rail thinner than the 1/4" floor near
    // the tail, so the channels' own floor note joins the three (the founder kept the warning, 2026-11-09). It lands a
    // moment after the pick — waited for, never raced — and its words are the copy module's own sentence for a channels
    // flag at the tail, which is also the sentence under the channels' Depth row.
    const floorNote = page.locator("[data-bottom-floor-note]");
    await expect(floorNote).toHaveCount(1);
    const railsAtTheTail: BottomFloorFlag = { section: "channels", stringer: [], rails: [0 as Mm], at: 0 as Mm };
    const channelsSentence = dataFloorNote(railsAtTheTail, "", shortboard.outline, "imperial");
    expect(channelsSentence).not.toBeNull();
    await expect(floorNote).toHaveText(channelsSentence!);
    await expect(page.locator("[data-bottom-channels] [data-bottom-floor]")).toHaveText(channelsSentence!);
    await bottomFloorScanSettled(page);
    await expect(notes(page)).toHaveCount(4);
    await expect(notes(page).first()).toHaveText(BOTTOM_COPY.depthsNote);
    await expect(notes(page).nth(1)).toHaveText(/^Layout marks are measured out from the stringer at each station, .+ — the outer pair first, each channel out from it 2" shorter\.$/);
    await expect(notes(page).nth(2)).toHaveText(/^Wide point .+ and front fins .+ from the tail are the two rows in full ink\.$/);
    await expect(notes(page).nth(3)).toHaveText(channelsSentence!);
    // The reference rows are ink in both tables.
    const inkRows = await marks.locator("tbody tr[data-reference]").count();
    expect(inkRows).toBeGreaterThan(0);
    expect(inkRows).toBe(await page.locator("[data-bottom-depths] tbody tr[data-reference]").count());
  });

  test("three cuts at 1280 × 800: both tables at their full height, the DATA card the one thing that scrolls, the page still, and the last note reachable; a flat board's page is left as it was", async ({ page }) => {
    test.setTimeout(240_000);
    expect(page.viewportSize()).toEqual({ width: 1280, height: 800 });
    await openBottom(page, "shortboard");
    const data = page.locator("[data-bottom-data]");
    /** Each table's box against its table, and every box inside DATA that scrolls down (DATA itself aside). */
    const read = () =>
      data.evaluate((root) => {
        const tables = [...root.querySelectorAll("table")].map((table) => {
          const box = table.parentElement!.parentElement!;
          return { box: box.getBoundingClientRect().height, table: table.getBoundingClientRect().height, rows: table.querySelectorAll("tbody tr").length };
        });
        const innerScrollers = [...root.querySelectorAll("*")].filter((el) => el.scrollHeight > el.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(el).overflowY)).length;
        return { tables, innerScrollers, holds: root.scrollHeight, shows: root.clientHeight, overflowY: getComputedStyle(root).overflowY };
      });
    const pageStill = async (where: string) => {
      const doc = await page.evaluate(() => ({ holds: document.documentElement.scrollHeight, shows: document.documentElement.clientHeight, at: window.scrollY }));
      expect(doc.holds, `${where}: the page itself has nothing to scroll`).toBeLessThanOrEqual(doc.shows);
      expect(doc.at, `${where}: the page itself has not moved`).toBe(0);
    };

    // A flat board first: one table, and its page fits the card — nothing for the card to scroll, as before.
    await dataTab(page).click();
    await expect(data).toBeVisible();
    await bottomFloorScanSettled(page);
    const flat = await read();
    expect(flat.tables).toHaveLength(1);
    expect(flat.holds, "a flat board's DATA fits its card").toBeLessThanOrEqual(flat.shows + 1);
    await expect(notes(page).last()).toBeInViewport({ ratio: 0.99 });
    await pageStill("flat");

    // Three cuts: a Deep Single, a Spiral Vee and six channels.
    await page.getByRole("tab", { name: BOTTOM_COPY.viewerTab, exact: true }).click();
    await pick(page, "center", "Deep Single Concave");
    await pick(page, "tail", "Spiral Vee");
    await pickChannels(page, "6 channels");
    await dataTab(page).click();
    await expect(page.locator("[data-bottom-marks]")).toBeVisible();
    await bottomFloorScanSettled(page);
    const cut = await read();
    expect(cut.tables).toHaveLength(2);
    for (const [i, table] of cut.tables.entries()) {
      expect(table.rows, `table ${i + 1}: rows`).toBeGreaterThan(5);
      expect(Math.abs(table.box - table.table), `table ${i + 1}: its box is as tall as the table (${table.box} against ${table.table})`).toBeLessThan(1);
    }
    // The card is the one scroller: it holds more than it shows, and no box inside it scrolls down.
    expect(cut.overflowY).toBe("auto");
    expect(cut.holds, "DATA is longer than its card").toBeGreaterThan(cut.shows + 1);
    expect(cut.innerScrollers, "no box scrolls down inside DATA").toBe(0);
    await pageStill("three cuts");
    // Every row is on the page — the last of the layout marks comes into view by scrolling the card alone...
    const lastRow = page.locator("[data-bottom-marks] tbody tr").last().locator("th").first();
    await expect(lastRow).not.toBeInViewport();
    await lastRow.scrollIntoViewIfNeeded();
    await expect(lastRow).toBeInViewport({ ratio: 0.99 });
    // ...and so does the last note, at the card's end.
    await data.evaluate((el) => el.scrollTo(0, el.scrollHeight));
    await expect(notes(page).last()).toBeInViewport({ ratio: 0.99 });
    expect(await data.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
    expect(await data.evaluate((el) => Math.abs(el.scrollTop + el.clientHeight - el.scrollHeight))).toBeLessThan(1.5);
    await pageStill("three cuts, scrolled to the end");
  });

  test("a fresh Rolled Belly Entry on the Shortboard: the floor note is the panel's own rail sentence, in warning ink, and no stringer cell is coloured", async ({ page }) => {
    test.setTimeout(180_000);
    await openBottom(page, "shortboard");
    await pick(page, "nose", "Rolled Belly Entry");
    const panelSentence = await card(page, "nose").locator("[data-bottom-floor]").textContent();
    expect(panelSentence).toMatch(/^This cut leaves the rail under 1\/4" near the nose: /);
    await dataTab(page).click();
    const note = page.locator("[data-bottom-floor-note]");
    await bottomFloorScanSettled(page);
    await expect(note).toHaveCount(1);
    await expect(note).toHaveText(`Rolled Belly Entry: ${panelSentence}`);
    const color = (loc: Locator) => loc.evaluate((el) => getComputedStyle(el).color);
    const warning = await page.evaluate(() => {
      const probe = document.createElement("span");
      probe.className = "text-surf-warning-ink";
      document.body.append(probe);
      const c = getComputedStyle(probe).color;
      probe.remove();
      return c;
    });
    expect(await color(note)).toBe(warning);
    await expect(page.locator("[data-bottom-floor-cell]")).toHaveCount(0);
  });

  for (const system of ["imperial", "metric"] as const) {
    const less = system === "metric" ? "<1" : '<1/16"';
    test(`a depth that is there but too small for the tape reads ${less}, never a nought (${system})`, async ({ page }) => {
      test.setTimeout(180_000);
      // A Longboard with a cut in every section: its cuts thin out to almost nothing at some stations (a third to a
      // half of a millimetre), which used to read `0"` / `0` in the Deepest cut column (the founder, 2026-11-10).
      const board = boardWithBottom("longboard", {
        nose: "Teardrop Nose Concave",
        center: "Early Double Concave",
        tail: "Spiral Vee",
        channels: 8,
      });
      const rows = bottomDataRows(board.resolved, board.board);
      // The rule, spelled out: under a quarter of a millimetre nothing is cut (the dash); above it the mark, or
      // "less than the tape's smallest step" when the mark would round to nothing.
      const cell = (value: Mm) => (value < BOTTOM_DATA_DEPTH_SHOWN ? BOTTOM_COPY.emptyCell : formatMarkOrLessBare(value, system));
      const expected = rows.map((row) => [cell(row.deepest), cell(row.railLift)]);
      expect(expected.flat(), "this board has such a depth (non-vacuity)").toContain(less);
      expect(expected.flat(), "and a station where nothing is cut").toContain(BOTTOM_COPY.emptyCell);

      if (system === "metric") {
        await page.addInitScript(() => window.localStorage.setItem("shaper-units", "metric"));
        await page.context().addCookies([{ name: "shaper-units", value: "metric", domain: "localhost", path: "/" }]);
      }
      await openOnBoard(page, board); // added after the forget in beforeEach, so every load opens on this board
      await page.goto("/design/bottom");
      await expect(cutLine(page)).toBeAttached({ timeout: 60_000 });
      await expect(async () => {
        if ((await page.locator("[data-bottom-data]").count()) === 0) await dataTab(page).click({ timeout: 2_000 });
        await expect(page.locator("[data-bottom-data]")).toBeVisible({ timeout: 2_000 });
      }).toPass({ timeout: 60_000 });
      // Polled: the page draws the stock board for a moment before the kept one.
      const depthCells = () =>
        page
          .locator("[data-bottom-depths] tbody tr")
          .evaluateAll((trs) => trs.map((tr) => [...tr.querySelectorAll("td")].slice(1, 3).map((td) => (td.textContent ?? "").trim())));
      await expect.poll(depthCells, { timeout: 60_000 }).toEqual(expected);
      expect((await depthCells()).flat(), "no depth cell reads a bare nought").not.toContain(formatMarkBare(0 as Mm, system));
    });
  }

  // The founder's answer of 2026-11-11, "Match RAILS": DATA's Rail lift is the vee's or belly's lift at the rail, the
  // figure RAILS thins the rail by. A channel is cut after the rail is shaped and never counts, even one that runs out
  // through the rail — so on a flat tail with channels the tail row's Rail lift reads the dash.
  test("the Fish with a flat tail and its starting eight channels: the tail row's Rail lift reads the dash, a channel at the rail never counting", async ({ page }) => {
    test.setTimeout(180_000);
    const board = boardWithBottom("fish", { channels: 8 });
    const rows = bottomDataRows(board.resolved, board.board);
    const cell = (value: Mm) => (value < BOTTOM_DATA_DEPTH_SHOWN ? BOTTOM_COPY.emptyCell : formatMarkOrLessBare(value, "imperial"));
    const expected = rows.map((row) => [cell(row.deepest), cell(row.railLift)]);
    // the tail row: the channel at the rail is deep enough to have read as a figure, and it no longer does
    const tail = rows[0];
    expect(tail.label).toBe("tail");
    expect(foamOff(board.resolved, board.board, tail.station, board.board.railAt(tail.station))).toBeGreaterThanOrEqual(BOTTOM_DATA_DEPTH_SHOWN);
    expect(expected[0][1]).toBe(BOTTOM_COPY.emptyCell);

    await openOnBoard(page, board); // added after the forget in beforeEach, so every load opens on this board
    await page.goto("/design/bottom");
    await expect(cutLine(page)).toBeAttached({ timeout: 60_000 });
    await expect(async () => {
      if ((await page.locator("[data-bottom-data]").count()) === 0) await dataTab(page).click({ timeout: 2_000 });
      await expect(page.locator("[data-bottom-data]")).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 60_000 });
    // Polled: the page draws the stock board for a moment before the kept one.
    const depthCells = () =>
      page
        .locator("[data-bottom-depths] tbody tr")
        .evaluateAll((trs) => trs.map((tr) => [...tr.querySelectorAll("td")].slice(1, 3).map((td) => (td.textContent ?? "").trim())));
    await expect.poll(depthCells, { timeout: 60_000 }).toEqual(expected);
    expect((await depthCells())[0][1], "the tail row's Rail lift").toBe(BOTTOM_COPY.emptyCell);
  });

  // The founder's answer of 2026-11-11 at his look at 17-21, "Match DATA": the VIEWER's section reads its rail lift
  // as DATA's Rail lift column does — the vee's or belly's lift at the rail alone, held at the slab's thickness. A
  // channel running out through the rail never counts, so a flat tail with channels shows no rail lift at all.
  async function viewerAtTailRow(page: Page, board: ReturnType<typeof boardWithBottom>) {
    const tail = bottomDataRows(board.resolved, board.board)[0];
    expect(tail.label).toBe("tail");
    await openOnBoard(page, board); // added after the forget in beforeEach, so every load opens on this board
    await page.goto("/design/bottom");
    await expect(cutLine(page)).toBeAttached({ timeout: 60_000 });
    await expect(page.locator("[data-bottom-channels-echo]")).not.toHaveText("None", { timeout: 60_000 });
    const slider = sectionAt(page);
    await expect(slider).toBeVisible({ timeout: 30_000 });
    await slider.focus();
    // Right is toward the tail: step until the line stands at DATA's tail row.
    for (let i = 0; i < 400 && (await cutAt(page)) > tail.station + 0.5; i++) await page.keyboard.press("ArrowRight");
    expect(Math.abs((await cutAt(page)) - tail.station)).toBeLessThanOrEqual(0.5);
    return tail;
  }
  const railLiftGauge = (page: Page) => page.locator('[data-bottom-section] [data-gauge="railLift"]');

  test("the Fish with a flat tail and its starting eight channels: the section at the tail row draws no rail lift, a channel at the rail never counting", async ({ page }) => {
    test.setTimeout(180_000);
    const board = boardWithBottom("fish", { channels: 8 });
    const tail = await viewerAtTailRow(page, board);
    const T = board.board.thicknessAt(tail.station);
    // Non-vacuity: the channel at the rail is deep enough that a gauge would read it; DATA's Rail lift reads none.
    expect(gaugeReads(Math.min(foamOff(board.resolved, board.board, tail.station, board.board.railAt(tail.station)), T), "imperial")).toBe(true);
    expect(gaugeReads(Math.min(tail.railLift, T), "imperial")).toBe(false);
    // Polled: the page draws the stock board for a moment before the kept one — whose channel floor is gauged here.
    await expect(page.locator('[data-bottom-section] [data-gauge="channel"]')).not.toHaveCount(0, { timeout: 60_000 });
    await expect(railLiftGauge(page)).toHaveCount(0);
  });

  test("the Fish with a Rolled Vee and eight channels: the section at the tail row reads the vee's own rail lift, DATA's figure", async ({ page }) => {
    test.setTimeout(180_000);
    const board = boardWithBottom("fish", { tail: "Rolled Vee", channels: 8 });
    const tail = await viewerAtTailRow(page, board);
    const lift = Math.min(tail.railLift, board.board.thicknessAt(tail.station)) as Mm;
    expect(gaugeReads(lift, "imperial"), "the vee lifts the rail enough to read (non-vacuity)").toBe(true);
    const expected = BOTTOM_COPY.gaugeRailLift(formatMark(lift, "imperial"));
    await expect.poll(() => railLiftGauge(page).locator("text").allTextContents(), { timeout: 60_000 }).toContain(expected);
  });

  test("signed out on the practice rack, a saved board's BOTTOM reads exactly the same page", async ({ page }) => {
    test.setTimeout(180_000);
    await freshPracticeRack(page);
    await page.goto(`${RACK_STAND_IN_ROUTE}?boards=2`);
    await expect(page.locator("[data-rack-board]")).toHaveCount(2);
    const name = standInRackRows(2)[0].name;
    const open = page.getByRole("group", { name: RACK_COPY.captionGroup(name) }).getByRole("button", { name: RACK_COPY.open });
    await expect(async () => {
      if (!/\/design\/outline$/.test(page.url())) await open.click({ timeout: 2_000 });
      await expect(page).toHaveURL(/\/design\/outline$/, { timeout: 5_000 });
    }).toPass({ timeout: 90_000 });
    await goToScreen(page, "BOTTOM");
    await expect(cutLine(page)).toBeAttached({ timeout: 60_000 });
    await expect(page.getByRole("group", { name: BOTTOM_COPY.height, exact: true })).toBeVisible();
    await expect(sectionAt(page)).toBeEnabled();
    await dataTab(page).click();
    await expect(page.locator("[data-bottom-litres]")).toHaveText(/^Foam off 0\.00 L · /);
    await expect(page.getByText(BOTTOM_COPY.depthsHeading, { exact: true })).toBeVisible();
  });
});
