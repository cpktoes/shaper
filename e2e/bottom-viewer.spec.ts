import { expect, test, type Locator, type Page } from "@playwright/test";
import { BOTTOM_COPY } from "../components/bottom/bottom-copy";
import { BANNER_DISMISSAL_KEY } from "../lib/models/banner-dismissal";
import { TOOLBAR_TIP_DISMISSAL_KEY } from "../lib/models/toolbar-tip";
import { BOARD_PRESETS } from "../lib/geometry/presets";
import type { BottomSectionKey } from "../lib/geometry/bottom";
import { forgetOpenBoardOnEveryLoad } from "./helpers/open-board";
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
