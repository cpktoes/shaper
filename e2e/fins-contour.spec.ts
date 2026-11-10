import { expect, test, type Locator, type Page } from "@playwright/test";
import { BANNER_DISMISSAL_KEY } from "../lib/models/banner-dismissal";
import { TOOLBAR_TIP_DISMISSAL_KEY } from "../lib/models/toolbar-tip";
import { BOARD_PRESETS } from "../lib/geometry/presets";
import type { BoardBottom, BottomSectionKey } from "../lib/geometry/bottom";
import { formatBottomStation } from "../lib/geometry/blank-reasons";
import { designFinPlacement } from "../lib/geometry/design";
import { frontFinStation } from "../lib/geometry/fins";
import { inchesToMm, mm, mmToInches } from "../lib/geometry/units";
import { forgetOpenBoardOnEveryLoad, storedOpenBoard } from "./helpers/open-board";
import { goToScreen } from "./helpers/screens";

/**
 * FINS and the bottom (Phase 17, plan 17-13; D-03, D-23, D-36, D-37).
 *
 * FINS' tail drawing shows the bottom's contours under the fins — BOTTOM's own shade, 1/16" lines and pencil lines,
 * read-only — only while the bottom has a cut and FINS is drawing this board's tail (Import Designed Board ticked). A
 * flat board's FINS gains no element at all.
 *
 * And the fins carry the bottom: a Tail cut's Deepest At and the channels' Start and Deepest At are measured from the
 * front fins, so moving the fins on FINS moves them on BOTTOM — worked out when the bottom is read, with nothing
 * written to the board until a BOTTOM slider moves.
 *
 * No figure is typed: where the fins sit is the app's own maths (`designFinPlacement`, `frontFinStation`), every
 * station is read off the page's sliders, and every label is the app's own formatting.
 */

const SECTION_WORD: Record<BottomSectionKey, string> = { nose: "Nose", center: "Center", tail: "Tail" };
const SHORTBOARD = BOARD_PRESETS.find((p) => p.id === "shortboard")!;
/** How far the front fins are moved toward the nose on FINS: sixteen of the slider's own 1/16" steps. */
const FIN_STEPS = 16;

async function dismissStrips(page: Page) {
  await page.addInitScript((key) => window.sessionStorage.setItem(key, "true"), BANNER_DISMISSAL_KEY);
  await page.addInitScript((key) => window.localStorage.setItem(key, "true"), TOOLBAR_TIP_DISMISSAL_KEY);
}

/** Opens the Shortboard from the home page and walks to BOTTOM by the top row, so the board stays the one opened. */
async function openShortboardOnBottom(page: Page) {
  await page.goto("/");
  const card = page
    .getByRole("button")
    .filter({ hasText: SHORTBOARD.name })
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
}

/** Picks a name from a section's Cut menu, retried until React owns the menu so a click before hydration is never lost. */
async function pick(page: Page, section: BottomSectionKey, name: string) {
  const echo = page.locator(`[data-bottom-card="${section}"] [data-bottom-cut-echo]`);
  await expect(async () => {
    await page.getByRole("combobox", { name: `${SECTION_WORD[section]} Cut` }).click();
    await page.getByRole("option", { name, exact: true }).click({ timeout: 2_000 });
    await expect(echo).toHaveText(name, { timeout: 2_000 });
  }).toPass({ timeout: 60_000 });
}

/** Picks an option from one of BOTTOM's other menus by its spoken name, the same way. */
async function pickFrom(page: Page, menu: string, option: string) {
  const trigger = page.getByRole("combobox", { name: menu, exact: true });
  await expect(async () => {
    await trigger.click();
    await page.getByRole("option", { name: option, exact: true }).click({ timeout: 2_000 });
    await expect(trigger.locator("[data-slot=select-value]")).toHaveText(option, { timeout: 2_000 });
  }).toPass({ timeout: 60_000 });
}

const slider = (page: Page, name: string) => page.getByRole("slider", { name, exact: true });

/** A slider's value as its track holds it (a BOTTOM station slider: inches from the nose). */
async function sliderValue(locator: Locator): Promise<number> {
  const now = await locator.getAttribute("aria-valuenow");
  return Number(now ?? (await locator.inputValue()));
}

/** What a slider says for its value, every kind of space read as one plain space. */
async function sliderWords(locator: Locator): Promise<string> {
  return ((await locator.getAttribute("aria-valuetext")) ?? "").replace(/\s+/g, " ").trim();
}

/** The bottom in the copy this browser keeps of the open board. */
async function keptBottom(page: Page): Promise<BoardBottom | undefined> {
  const kept = await storedOpenBoard(page);
  return (kept?.snapshot.design as { bottom?: BoardBottom } | undefined)?.bottom;
}

/** How far forward the front fins are set in the copy this browser keeps (millimetres). */
async function keptFinOffset(page: Page): Promise<number | undefined> {
  const kept = await storedOpenBoard(page);
  const design = kept?.snapshot.design as { fins?: { advanced?: { forwardPositionOffset?: number } } } | undefined;
  return design?.fins?.advanced?.forwardPositionOffset;
}

/** FINS' Aft/Forward position slider for the front pair, in the open Advanced fold. */
async function frontFinSlider(page: Page): Promise<Locator> {
  const button = page.getByRole("button", { name: /^Advanced/ });
  await expect(button).toBeVisible();
  await expect.poll(() => button.evaluate((el) => Object.keys(el).some((key) => key.startsWith("__reactFiber")))).toBe(true);
  if ((await page.getByRole("button", { name: /Reset Advanced Settings/ }).count()) === 0) await button.click();
  await expect(page.getByRole("button", { name: /Reset Advanced Settings/ })).toBeVisible();
  const label = page.getByText(/^Aft\/Forward position — /).filter({ visible: true }).first();
  await expect(label).toBeVisible();
  return label.locator("xpath=..").getByRole("slider");
}

/** On FINS: moves the front fins toward the nose by `FIN_STEPS` of the slider's own steps, and returns how far the
 * slider says it went (inches). */
async function moveFrontFinsForward(page: Page): Promise<number> {
  const fins = await frontFinSlider(page);
  const before = await sliderValue(fins);
  await fins.focus();
  for (let i = 0; i < FIN_STEPS; i += 1) await page.keyboard.press("ArrowRight");
  await expect.poll(async () => (await sliderValue(fins)) - before).toBeGreaterThan(0);
  return (await sliderValue(fins)) - before;
}

/** Where the Shortboard's front fins sit, by the app's own maths, with the front pair moved `offsetIn` toward the nose. */
function frontFinsAt(offsetIn: number) {
  const fins = {
    ...SHORTBOARD.fins,
    advanced: {
      ...SHORTBOARD.fins.advanced,
      forwardPositionOffset: mm(SHORTBOARD.fins.advanced.forwardPositionOffset + inchesToMm(offsetIn)),
    },
  };
  return frontFinStation(designFinPlacement({ outline: SHORTBOARD.outline, fins }));
}

/** The app's own words for a station measured from the tail, every kind of space read as one plain space. */
const fromTheTail = (station: ReturnType<typeof frontFinsAt>) =>
  `${formatBottomStation(station, "imperial")} from the tail`.replace(/\s+/g, " ");

const contour = (page: Page) => page.locator("[data-fin-plot] [data-fins-contour]");
const finLines = (page: Page) => page.locator('[data-fin-plot] svg line[stroke*="surf-accent-ink"]');

test.describe("FINS and the bottom: the contours under the fins, and the fins carrying the tail cut and the channels", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "BOTTOM's panel is the computer's here; BOTTOM on a phone is 17-14's");
    test.setTimeout(300_000);
    await dismissStrips(page);
    await forgetOpenBoardOnEveryLoad(page);
  });

  test("a flat board's FINS gains nothing; a Spiral Vee and six channels show under the fins, and go when Import Designed Board is unticked", async ({ page }) => {
    await openShortboardOnBottom(page);

    // Flat: FINS as it has always been — no contour group, and nothing else added for it.
    await goToScreen(page, "FINS");
    await expect(finLines(page).first()).toBeVisible();
    await expect(contour(page)).toHaveCount(0);
    await expect(page.locator("[data-fin-plot] svg defs")).toHaveCount(0);
    await expect(page.locator("[data-fin-plot] svg clipPath")).toHaveCount(0);
    const flatFinLines = await finLines(page).count();
    const flatChildren = await page.locator("[data-fin-plot] svg > *").count();

    // A Spiral Vee and six channels on BOTTOM.
    await goToScreen(page, "BOTTOM");
    await pick(page, "tail", "Spiral Vee");
    await pickFrom(page, "Channels", "6 channels");

    // FINS draws them under the fins.
    await goToScreen(page, "FINS");
    await expect(contour(page)).toHaveCount(1);
    expect(await contour(page).locator("[data-fins-contour-shade] path").count(), "the shade, level by level").toBeGreaterThan(0);
    expect(await contour(page).locator("[data-fins-contour-line]").count(), 'the 1/16" lines').toBeGreaterThan(0);
    expect(await contour(page).locator('[data-fins-contour-pencil="wall"]').count(), "the channel walls").toBeGreaterThan(0);
    // exactly the group and its clip were added; the fins are the same fins
    expect(await page.locator("[data-fin-plot] svg > *").count()).toBe(flatChildren + 2);
    expect(await finLines(page).count()).toBe(flatFinLines);

    const facts = await contour(page).evaluate((group) => {
      const svg = (group as SVGGElement).ownerSVGElement!;
      const fill = svg.querySelector('path[fill="var(--outline-board-fill)"]')!;
      const firstFin = svg.querySelector('line[stroke*="surf-accent-ink"]')!;
      const clip = /url\(#(.+)\)/.exec(group.getAttribute("clip-path") ?? "")?.[1];
      const clipPath = clip ? svg.querySelector(`[id="${clip}"] path`) : null;
      const box = group.getBoundingClientRect();
      return {
        afterFill: Boolean(fill.compareDocumentPosition(group) & Node.DOCUMENT_POSITION_FOLLOWING),
        beforeFins: Boolean(group.compareDocumentPosition(firstFin) & Node.DOCUMENT_POSITION_FOLLOWING),
        clippedToTheTail: clipPath !== null && clipPath.getAttribute("d") === fill.getAttribute("d"),
        strokes: [...new Set([...group.querySelectorAll("[stroke]")].map((el) => el.getAttribute("stroke")))],
        pointerEvents: group.getAttribute("pointer-events"),
        text: group.querySelectorAll("text").length,
        drawn: box.width > 0 && box.height > 0,
      };
    });
    expect(facts.afterFill, "over the board's fill").toBe(true);
    expect(facts.beforeFins, "under the fins").toBe(true);
    expect(facts.clippedToTheTail, "clipped to the tail as FINS draws it").toBe(true);
    // nothing here is live: one pencil grey for every line, no names, no control
    expect(facts.strokes).toEqual(["var(--outline-pencil-line)"]);
    expect(facts.pointerEvents).toBe("none");
    expect(facts.text).toBe(0);
    expect(facts.drawn).toBe(true);

    // Import Designed Board unticked: FINS' tail is no longer this board's, so nothing of its bottom is drawn (D-37).
    const box = page.getByRole("checkbox", { name: "Import Designed Board" });
    await box.click();
    await expect(box).toHaveAttribute("aria-checked", "false");
    await expect(contour(page)).toHaveCount(0);
    await expect(page.locator("[data-fin-plot] svg clipPath")).toHaveCount(0);
    await box.click();
    await expect(box).toHaveAttribute("aria-checked", "true");
    await expect(contour(page)).toHaveCount(1);
  });

  test("moving the front fins 1\" toward the nose on FINS moves the tail cut's Deepest At and the channels' Start and Deepest At with them; a Center cut stays", async ({ page }) => {
    // The app's own maths: sixteen 1/16" steps move the front fins this far.
    const before = frontFinsAt(0);
    const after = frontFinsAt(FIN_STEPS / 16);
    const movedIn = mmToInches(mm(after - before));
    expect(movedIn).toBeCloseTo(FIN_STEPS / 16, 6);

    await openShortboardOnBottom(page);
    await pick(page, "center", "Deep Single Concave");
    await pick(page, "tail", "Spiral Vee");
    await pickFrom(page, "Channels", "6 channels");

    const follows = ["Tail Deepest At", "Channels Start", "Channels Deepest At"];
    const stays = ["Tail Start", "Tail End", "Channels End", "Center Start", "Center Deepest At", "Center End"];
    const read = async (names: string[]) => {
      const values: Record<string, number> = {};
      for (const name of names) values[name] = await sliderValue(slider(page, name));
      return values;
    };
    const was = await read([...follows, ...stays]);
    // The Spiral Vee opens deepest at the front fins: the slider says where the app's own maths put them.
    expect(await sliderWords(slider(page, "Tail Deepest At"))).toBe(fromTheTail(before));
    await expect.poll(async () => (await keptBottom(page))?.channels.count).toBe(6);
    const keptBefore = await keptBottom(page);
    const offsetBefore = await keptFinOffset(page);

    await goToScreen(page, "FINS");
    expect(await moveFrontFinsForward(page)).toBeCloseTo(movedIn, 6);
    // the fin move is kept with the board; the bottom in that copy is word for word what it was
    await expect.poll(() => keptFinOffset(page)).not.toBe(offsetBefore);
    expect(await keptBottom(page)).toEqual(keptBefore);

    await goToScreen(page, "BOTTOM");
    // A station slider's track is the distance from the nose, so toward the nose is that much less.
    for (const name of follows) {
      await expect.poll(() => sliderValue(slider(page, name)), { message: name }).toBeCloseTo(was[name] - movedIn, 4);
    }
    const now = await read(stays);
    for (const name of stays) expect(now[name], name).toBe(was[name]);
    expect(await sliderWords(slider(page, "Tail Deepest At"))).toBe(fromTheTail(after));
    // still nothing written to the bottom
    expect(await keptBottom(page)).toEqual(keptBefore);
  });

  test("a fin move past the tail cut's Start shows Start pushed to Deepest At, and the board is written only when a BOTTOM slider moves", async ({ page }) => {
    await openShortboardOnBottom(page);
    await pick(page, "tail", "Spiral Vee");
    const start = slider(page, "Tail Start");
    const deepest = slider(page, "Tail Deepest At");
    const deepestWas = await sliderValue(deepest);

    // Bring Start down to within one of its own steps of Deepest At, by the keyboard (toward the tail is to the right).
    const step = Number(await start.getAttribute("step"));
    expect(step).toBeGreaterThan(0);
    await start.focus();
    for (let i = 0; i < 80 && (await sliderValue(start)) + step < deepestWas - 1e-6; i += 1) await page.keyboard.press("ArrowRight");
    const startWas = await sliderValue(start);
    expect(deepestWas - startWas, "Start just ahead of Deepest At").toBeGreaterThanOrEqual(0);
    expect(deepestWas - startWas).toBeLessThanOrEqual(step + 1e-6);
    expect(await sliderValue(deepest), "Deepest At is where it was").toBe(deepestWas);
    // wait for the copy this browser keeps to hold the Start just set, and to stop changing
    await expect.poll(async () => (await keptBottom(page))?.tail.name).toBe("Spiral Vee");
    let settled = Number.NaN;
    await expect
      .poll(async () => {
        const kept = (await keptBottom(page))!.tail.start;
        const same = kept === settled;
        settled = kept;
        return same;
      })
      .toBe(true);
    const keptBefore = await keptBottom(page);
    const offsetBefore = await keptFinOffset(page);

    // The fins go 1" toward the nose: Deepest At follows them past the Start that was set.
    await goToScreen(page, "FINS");
    const movedIn = await moveFrontFinsForward(page);
    expect(movedIn).toBeGreaterThan(step);
    await expect.poll(() => keptFinOffset(page)).not.toBe(offsetBefore);

    await goToScreen(page, "BOTTOM");
    await expect.poll(() => sliderValue(deepest)).toBeCloseTo(deepestWas - movedIn, 4);
    // Start is shown pushed to Deepest At (D-36): the same place on the track, the same words.
    expect(await sliderValue(start)).toBeCloseTo(deepestWas - movedIn, 4);
    expect(await sliderWords(start)).toBe(await sliderWords(deepest));
    // ...and the board itself still holds the Start that was set: nothing is written by the fins moving.
    expect(await keptBottom(page)).toEqual(keptBefore);

    // A BOTTOM slider moves: now the pushed Start is written.
    await deepest.focus();
    await page.keyboard.press("ArrowLeft");
    await expect.poll(async () => (await keptBottom(page))?.tail.start).not.toBe(keptBefore!.tail.start);
    expect((await keptBottom(page))!.tail.start).toBeGreaterThan(keptBefore!.tail.start);
    expect(await sliderValue(start)).toBeLessThanOrEqual(await sliderValue(deepest));
  });
});
