import { expect, test, type Locator, type Page } from "@playwright/test";
import { automaticButtonLabel, thicknessIntroWithBlank } from "../lib/geometry/blank-reasons";
import { BOARD_LENGTH_RANGE_IN } from "../lib/geometry/board";
import { formatLength, stationLabel } from "../lib/geometry/measure-display";
import { inchesToMm } from "../lib/geometry/units";

/**
 * Phase 12's ROCKER cut, proven in real browsers (12-05; 12-08 extends it): with a blank picked,
 * BOARD ON BLANK shows the board's own Deck Skin, the foam off the bottom at every station and the
 * planer passes at the center, all live, with nothing sent to the server.
 *
 * The helpers below are copies of `e2e/rocker-blanks.spec.ts`'s own (`dismissChrome`, `blankList`,
 * `firstFittingRow`, `pickedCard`, `openRocker` with its hydration wait, `pickFirstFittingBlank`,
 * `sliderUnder`, `undoOnce` at the foot of the file) — spec files do not import each other, the repo's existing per-spec
 * helper pattern. Like that spec, this one has no database: the list reads the committed catalogue
 * CSVs (`SHAPER_BLANKS_SOURCE=seed-csv`), and no blank name, depth or pass count is ever typed here —
 * each test reads a value off the page, moves a control, and checks the value changed.
 */

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

/** The list, once the streamed catalogue has arrived and been judged. */
function blankList(page: Page): Locator {
  return page.getByRole("list", { name: "Blanks" });
}

/** The first blank under FITS THIS BOARD. */
function firstFittingRow(page: Page): Locator {
  return blankList(page).locator('li[data-group="fits"] button').first();
}

/** The picked-blank card (state C). */
function pickedCard(page: Page): Locator {
  return page.locator("[data-picked-blank]");
}

async function openRocker(page: Page) {
  await page.goto("/design/rocker");
  await expect(blankList(page)).toBeVisible({ timeout: 30_000 });
  // The list streams in server-rendered, inside its own Suspense boundary, and becomes live only
  // once React hydrates that boundary. A keystroke or tap before then is lost, so wait until React
  // owns the first row and the search box.
  await page.waitForFunction(() => {
    const owned = (el: Element | null) => !!el && Object.keys(el).some((key) => key.startsWith("__reactFiber"));
    return (
      owned(document.querySelector('ul[aria-label="Blanks"] button')) &&
      owned(document.querySelector('input[aria-label="Search blanks"]'))
    );
  });
}

/** Picks the first fitting blank and returns its name as the page shows it. */
async function pickFirstFittingBlank(page: Page): Promise<string> {
  const row = firstFittingRow(page);
  const name = (await row.locator("[data-blank-name]").innerText()).trim();
  expect(name.length).toBeGreaterThan(0);
  await row.click();
  await expect(pickedCard(page)).toContainText(name);
  return name;
}

/** A `SliderRow`'s slider, found by the start of its label line. */
function sliderUnder(page: Page, label: RegExp): Locator {
  return page.getByText(label).locator("xpath=..").getByRole("slider");
}

/** The Deck Skin row's label line. */
function deckSkinLabel(page: Page): Locator {
  return page.getByText(/^Deck Skin — /);
}

/**
 * An Imperial mark as the page prints it — `1/8"`, `+3/16"`, `-1/16"`, `1 1/4"`, `0"` — read back to
 * inches, so a test can compare two values it read off the page without typing either.
 */
function readInches(text: string): number {
  const match = text.match(/([+-]?)(?:(\d+) )?(?:(\d+)\/(\d+)|(\d+))"/);
  if (!match) throw new Error(`no inch mark in "${text}"`);
  const [, sign, whole, num, den, bare] = match;
  const value = bare !== undefined ? Number(bare) : Number(whole ?? 0) + Number(num) / Number(den);
  return sign === "-" ? -value : value;
}

/** A named two-way pill pair (`TwoOptionToggle` with an `ariaLabel`). */
function pillGroup(page: Page, name: string): Locator {
  return page.getByRole("group", { name });
}

/** One pill inside a named pair. */
function pill(page: Page, group: string, label: string): Locator {
  return pillGroup(page, group).getByRole("button", { name: label, exact: true });
}

test.describe("ROCKER — the board's Deck Skin, the foam off the bottom and the planer passes (Phase 12)", () => {
  test.beforeEach(async ({ page }) => {
    await dismissChrome(page);
  });

  test("with a blank picked, BOARD ON BLANK shows Deck Skin, OFF BOTTOM and the planer passes, and a Deck Skin drag moves the center's foam off the bottom and the passes with no request", async ({
    page,
  }) => {
    await openRocker(page);
    await pickFirstFittingBlank(page);

    await expect(deckSkinLabel(page)).toBeVisible();
    const readouts = page.locator("[data-readouts]");
    await expect(readouts.getByText("OFF BOTTOM", { exact: true })).toBeVisible();
    await expect(readouts.locator("[data-readout-row]")).toHaveCount(5);
    const passesLine = page.locator("[data-bottom-passes]");
    await expect(passesLine).toBeVisible();
    await expect(passesLine).toContainText("Planer passes at the center");
    await expect(page.getByText(/ a pass — your Planer Max Depth\.$/)).toBeVisible();

    const skinBefore = await deckSkinLabel(page).innerText();
    const centerRow = readouts.locator('[data-readout-row="center"]');
    const centerBefore = await centerRow.innerText();
    const passesBefore = await passesLine.innerText();

    // R14: the skin is store state and the numbers come off the side profile the page already
    // holds — nothing goes to any server, this site's or anyone else's. Two things a drag cannot
    // cause are left out: Clerk's own sign-in boot traffic (its script blob and its environment /
    // client fetches, which never settle under the suite's fake key and retry on their own clock —
    // under the main checkout's dev server they landed inside this window 1 run in 2), and
    // browser-internal blob: loads, which never leave the page. Everything else is listed on
    // failure so a stray request names itself.
    const requests: string[] = [];
    page.on("request", (request) => {
      const url = request.url();
      if (url.startsWith("blob:") || /clerk\.accounts\.dev|\/__clerk\//.test(url)) return;
      requests.push(`${request.method()} ${url}`);
    });

    const skin = sliderUnder(page, /^Deck Skin — /);
    await skin.focus();
    await skin.press("ArrowRight");
    await skin.press("ArrowRight");

    await expect(deckSkinLabel(page)).not.toHaveText(skinBefore);
    await expect(centerRow).not.toHaveText(centerBefore);
    await expect(passesLine).not.toHaveText(passesBefore);
    await expect(readouts.locator("[data-readout-row]")).toHaveCount(5);
    // Never clears the pick.
    await expect(pickedCard(page)).toHaveCount(1);
    expect(requests, `requests during the drag: ${requests.join(", ")}`).toHaveLength(0);
  });

  test("with no blank picked, there is no Deck Skin, no OFF BOTTOM and no planer passes line", async ({ page }) => {
    await openRocker(page);
    // D-12: hidden, not disabled — the sidebar is Phase 11's fallback column exactly.
    await expect(page.getByText("Placement — pick a blank first")).toBeVisible();
    await expect(page.getByText(/^Deck Skin/)).toHaveCount(0);
    await expect(page.locator("[data-readouts]")).toHaveCount(0);
    await expect(page.getByText("OFF BOTTOM", { exact: true })).toHaveCount(0);
    await expect(page.locator("[data-bottom-passes]")).toHaveCount(0);
    await expect(page.getByText(/ a pass — your Planer Max Depth\.$/)).toHaveCount(0);
  });

  test("in Metric the Deck Skin, the OFF BOTTOM cells and the passes hint read whole millimetres", async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem("shaper-units", "metric"));
    await openRocker(page);
    await pickFirstFittingBlank(page);

    await expect(deckSkinLabel(page)).toHaveText(/^Deck Skin — \d+ mm$/);
    const readouts = page.locator("[data-readouts]");
    await expect(readouts.locator("[data-readout-row]")).toHaveCount(5);
    const readoutText = await readouts.innerText();
    expect(readoutText).toContain("mm");
    expect(readoutText).not.toContain('"');
    await expect(page.getByText(/^At \d+ mm a pass — your Planer Max Depth\.$/)).toBeVisible();

    // A drag keeps every one of them in millimetres.
    const skin = sliderUnder(page, /^Deck Skin — /);
    await skin.focus();
    await skin.press("ArrowRight");
    await expect(deckSkinLabel(page)).toHaveText(/^Deck Skin — \d+ mm$/);
    expect(await readouts.innerText()).not.toContain('"');
    expect(await page.locator("[data-bottom-passes]").innerText()).not.toContain('"');
  });

  test("Remove This Blank, then one undo, brings the blank back with its own Deck Skin", async ({ page }, testInfo) => {
    await openRocker(page);
    const name = await pickFirstFittingBlank(page);

    // Move the skin off where the pick put it, so there is something of the board's own to lose.
    const labelAtPick = await deckSkinLabel(page).innerText();
    const skin = sliderUnder(page, /^Deck Skin — /);
    await skin.focus();
    await skin.press("ArrowRight");
    await expect(deckSkinLabel(page)).not.toHaveText(labelAtPick);
    const ownSkin = await deckSkinLabel(page).innerText();

    await page.getByRole("button", { name: "Remove This Blank" }).click();
    await expect(pickedCard(page)).toHaveCount(0);
    await expect(deckSkinLabel(page)).toHaveCount(0);

    await undoOnce(page, testInfo.project.name);

    await expect(pickedCard(page).locator("[data-blank-name]")).toHaveText(name);
    await expect(deckSkinLabel(page)).toHaveText(ownSkin);
  });

  test("switching to another blank keeps the board's Deck Skin", async ({ page }) => {
    await openRocker(page);
    const first = await pickFirstFittingBlank(page);

    const labelAtPick = await deckSkinLabel(page).innerText();
    const skin = sliderUnder(page, /^Deck Skin — /);
    await skin.focus();
    await skin.press("ArrowRight");
    await expect(deckSkinLabel(page)).not.toHaveText(labelAtPick);
    const ownSkin = await deckSkinLabel(page).innerText();

    await page.getByRole("button", { name: "Change Blank" }).click();
    // The first fitting row that is not the board's blank already.
    const other = blankList(page).locator('li[data-group="fits"] button[aria-pressed="false"]').first();
    const otherName = (await other.locator("[data-blank-name]").innerText()).trim();
    expect(otherName).not.toBe(first);
    await other.click();
    await expect(pickedCard(page).locator("[data-blank-name]")).toHaveText(otherName);

    await expect(deckSkinLabel(page)).toHaveText(ownSkin);
  });

  test(`a Tip Style tap changes a tip's rocker reading and leaves both 12" readings exactly as they were`, async ({
    page,
  }, testInfo) => {
    await openRocker(page);
    await pickFirstFittingBlank(page);

    // A new board's Tip Style is the account default — Pin deck out of the box (D-04).
    await expect(pillGroup(page, "Tip Style")).toBeVisible();
    await expect(pill(page, "Tip Style", "Pin deck")).toHaveAttribute("aria-pressed", "true");
    await expect(pill(page, "Tip Style", "Bottom")).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByText(/^The deck stays put and the extra comes off the bottom/)).toBeVisible();

    const readouts = page.locator("[data-readouts]");
    const row = (key: string) => readouts.locator(`[data-readout-row="${key}"]`);
    const noseTip = await row("noseTip").textContent();
    const tailTip = await row("tailTip").textContent();
    const nose12 = await row("nose12").textContent();
    const tail12 = await row("tail12").textContent();

    await pill(page, "Tip Style", "Bottom").click();
    await expect(pill(page, "Tip Style", "Bottom")).toHaveAttribute("aria-pressed", "true");
    await expect(pill(page, "Tip Style", "Pin deck")).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByText(/^The bottom stays put and the extra comes off the deck/)).toBeVisible();

    // Each tip re-derives from its tip to its Thinning Starts point (Phase 14, D-07): at least one tip
    // reads differently...
    await expect
      .poll(async () => (await row("noseTip").textContent()) !== noseTip || (await row("tailTip").textContent()) !== tailTip)
      .toBe(true);
    // ...and, on the first fitting blank, where both tips start on Automatic at the 12" station,
    // nothing at the 12" stations moves.
    expect(await row("nose12").textContent()).toBe(nose12);
    expect(await row("tail12").textContent()).toBe(tail12);
    // Under Bottom the Deck Skin's hint says the tips take more off the deck.
    await expect(page.getByText("Off the deck — more at the tips", { exact: true })).toBeVisible();
    // Never clears the pick.
    await expect(pickedCard(page)).toHaveCount(1);

    // One undo step brings Pin deck back.
    await undoOnce(page, testInfo.project.name);
    await expect(pill(page, "Tip Style", "Pin deck")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText("Off the deck at every station", { exact: true })).toBeVisible();
  });

  test(`Fine-tune off starts on Deck, and on Bottom a 12" tweak re-levels the rocker instead of taking foam off the deck`, async ({
    page,
  }, testInfo) => {
    await openRocker(page);
    await pickFirstFittingBlank(page);

    // THICKNESS says how the foil now comes off: each tip is thinned from its own Thinning Starts
    // point (Phase 14, D-07) — the app's own sentence, built in Node, so no wording is typed twice.
    await expect(page.getByText(thicknessIntroWithBlank("imperial"), { exact: true })).toBeVisible();

    // A new board's 12" tweaks come off the deck (D-13).
    await expect(pill(page, "Fine-tune off", "Deck")).toHaveAttribute("aria-pressed", "true");
    await expect(pill(page, "Fine-tune off", "Bottom")).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByText("Tweaks add or take foam on the deck; the rocker stays the blank's.", { exact: true })).toBeVisible();

    // Nudge Nose @ 12" four steps — a quarter inch, far more than one printed step. DOWN, not up:
    // an upward Deck tweak larger than the Deck Skin lifts the deck above every blank's deck, so the
    // whole list re-judges with nothing fitting anywhere, and each step then stalls the page (about
    // 2 s on Chromium, about 40 s on Playwright's WebKit — recorded in 12-08-SUMMARY.md). A quarter
    // inch down moves the same surfaces the same distance and keeps the board in its blank.
    const nose12Label = page.getByText(/^Nose @ 12" — /);
    const labelBefore = await nose12Label.innerText();
    const nose12 = sliderUnder(page, /^Nose @ 12" — /);
    await nose12.focus();
    for (let i = 0; i < 4; i++) await nose12.press("ArrowLeft");
    await expect(nose12Label).not.toHaveText(labelBefore);
    const tweakedLabel = await nose12Label.innerText();
    // A tweak off the Deck changes the foam off the deck there, and the Deck Skin's hint says so.
    await expect(
      page.getByText(`Off the deck — a 12" fine-tune changes it there; see the DATASHEET's Deck row`, { exact: true }),
    ).toBeVisible();

    // The ROCKER column of the readouts (the second cell of each row).
    const rockerCells = page.locator("[data-readouts] [data-readout-row] > :nth-child(2)");
    await expect(rockerCells).toHaveCount(5);
    const rockerBefore = await rockerCells.allTextContents();

    await pill(page, "Fine-tune off", "Bottom").click();
    await expect(pill(page, "Fine-tune off", "Bottom")).toHaveAttribute("aria-pressed", "true");
    await expect(pill(page, "Fine-tune off", "Deck")).toHaveAttribute("aria-pressed", "false");
    await expect(
      page.getByText("Tweaks move the bottom, so the rocker re-levels and its numbers can shift.", { exact: true }),
    ).toBeVisible();

    // Off the Bottom the deck comes off evenly again.
    await expect(page.getByText("Off the deck at every station", { exact: true })).toBeVisible();
    // The tweak's amount is the same, so the 12" thickness reads the same...
    await expect(nose12Label).toHaveText(tweakedLabel);
    // ...but it now comes off the bottom, so the rocker re-levels and at least one reading moves.
    await expect.poll(async () => (await rockerCells.allTextContents()).join("|")).not.toBe(rockerBefore.join("|"));
    // Never clears the pick.
    await expect(pickedCard(page)).toHaveCount(1);

    // One undo step goes back to Deck, and the rocker with it.
    await undoOnce(page, testInfo.project.name);
    await expect(pill(page, "Fine-tune off", "Deck")).toHaveAttribute("aria-pressed", "true");
    await expect.poll(async () => (await rockerCells.allTextContents()).join("|")).toBe(rockerBefore.join("|"));
  });

  test(`a 12" fine-tune on the Deck bigger than the Deck Skin says why nothing fits and offers Reset Fine-Tune, not Change Fit Rules`, async ({
    page,
  }) => {
    await openRocker(page);
    await pickFirstFittingBlank(page);
    await expect(pill(page, "Fine-tune off", "Deck")).toHaveAttribute("aria-pressed", "true");

    // The board's own Deck Skin, read off its label.
    const skin = readInches(await deckSkinLabel(page).innerText());
    const flag = page.locator('[data-flag="tweak-over-skin"]');
    await expect(flag).toHaveCount(0);

    // Nudge Nose @ 12" UP one step at a time until its tweak reads more than the skin (at the
    // default 1/8" skin that is three 1/16" steps). Each step waits for the row to change.
    const nose12Row = page.getByText(/^Nose @ 12" — /).locator("xpath=..");
    const nose12 = nose12Row.getByRole("slider");
    await nose12.focus();
    let tweak = 0;
    for (let step = 0; step < 12 && tweak <= skin; step++) {
      const before = await nose12Row.innerText();
      await nose12.press("ArrowRight");
      await expect(nose12Row).not.toHaveText(before);
      await expect(async () => {
        const hint = (await nose12Row.innerText()).match(/Tweak ([+-][^"]*")/);
        expect(hint, "the row reads a Tweak").not.toBeNull();
        tweak = readInches(hint![1]);
      }).toPass();
    }
    expect(tweak).toBeGreaterThan(skin);

    // The flag names the cause and the one way out that can fix it.
    await expect(flag).toBeVisible();
    await expect(flag).toContainText("more than this board's");
    const reset = flag.getByRole("button", { name: "↺ Reset Fine-Tune" });
    await expect(reset).toHaveCount(1);
    await expect(flag.getByRole("button", { name: "Change Fit Rules" })).toHaveCount(0);

    await reset.click();
    await expect(flag).toHaveCount(0);
    await expect(nose12Row).toContainText("No tweak");
    // Never clears the pick.
    await expect(pickedCard(page)).toHaveCount(1);
  });

  test("with no blank there is no Tip Style and no Fine-tune off", async ({ page }) => {
    await openRocker(page);
    // D-12: hidden, not disabled — THICKNESS is Phase 11's fallback column exactly.
    await expect(page.getByText("Hand-set until you pick a blank.", { exact: true })).toBeVisible();
    await expect(page.getByRole("group", { name: "Tip Style" })).toHaveCount(0);
    await expect(page.getByRole("group", { name: "Fine-tune off" })).toHaveCount(0);
    await expect(page.getByText("Tip Style", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Fine-tune off", { exact: true })).toHaveCount(0);
    await expect(page.getByText(/^Deck and bottom follow your blank's/)).toHaveCount(0);
  });
});

/** `Nose` / `Tail` — a tip's name at the start of its Thinning Starts label. */
type Tip = "nose" | "tail";
const TIP_NAME: Record<Tip, string> = { nose: "Nose", tail: "Tail" };

/** A Thinning Starts row's label line. */
function startLabel(page: Page, end: Tip): Locator {
  return page.getByText(new RegExp(`^${TIP_NAME[end]} Thinning Starts — `));
}

/** The whole `SliderRow` (label, slider, hint line) of one tip's Thinning Starts. */
function startRow(page: Page, end: Tip): Locator {
  return startLabel(page, end).locator("xpath=..");
}

/** The state text on the left of a Thinning Starts row's hint line. */
function startHint(page: Page, end: Tip): Locator {
  return startRow(page, end).locator(":scope > div:last-child > span").first();
}

/** The Automatic button on one tip's row, by the accessible name the app gives it. */
function automaticButton(page: Page, end: Tip): Locator {
  return page.getByRole("button", { name: automaticButtonLabel(end), exact: true });
}

/** The too-close line under one tip's row, a sibling of the row inside its wrapper. */
function tooCloseLine(page: Page, end: Tip): Locator {
  return startRow(page, end).locator("xpath=following-sibling::p");
}

/** The distance a label line carries after its ` — `. */
function distanceOf(label: string): string {
  const at = label.indexOf(" — ");
  if (at < 0) throw new Error(`no distance in "${label}"`);
  return label.slice(at + 3);
}

/** The station name in a `Nose @ 12" — …` / `Nose @ 30.5 cm — …` label. */
function stationOf(label: string): string {
  const match = label.match(/^(?:Nose|Tail) @ (.+?) — /);
  if (!match) throw new Error(`no station in "${label}"`);
  return match[1];
}

/** Waits for the streamed blank list to arrive and be owned by React, without navigating. */
async function waitForLiveBlankList(page: Page) {
  await expect(blankList(page)).toBeVisible({ timeout: 30_000 });
  await page.waitForFunction(() => {
    const owned = (el: Element | null) => !!el && Object.keys(el).some((key) => key.startsWith("__reactFiber"));
    return (
      owned(document.querySelector('ul[aria-label="Blanks"] button')) &&
      owned(document.querySelector('input[aria-label="Search blanks"]'))
    );
  });
}

/** The gear menu (desktop) or the phone top bar's Menu — whichever this project shows. */
function menuTrigger(page: Page, projectName: string): Locator {
  return projectName === "desktop"
    ? page.getByRole("button", { name: "Settings", exact: true })
    : page.getByRole("banner").getByRole("button", { name: "Menu" });
}

/** Picks Imperial or Metric in the menu, then closes it — an in-session switch, nothing reloaded. */
async function chooseUnits(page: Page, projectName: string, label: "Imperial" | "Metric") {
  const trigger = menuTrigger(page, projectName);
  const item = page.getByRole("menuitemradio", { name: new RegExp(`^${label}`) });
  await expect(async () => {
    if (!(await item.isVisible())) await trigger.click();
    await expect(item).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 20_000 });
  await item.click();
  await expect(item).toHaveAttribute("aria-checked", "true");
  await page.keyboard.press("Escape");
  await expect(item).toBeHidden();
}

test.describe("ROCKER — where each tip's thinning starts (Phase 14, D-09 to D-11, D-27)", () => {
  test.beforeEach(async ({ page }) => {
    await dismissChrome(page);
  });

  test("a picked blank shows Nose then Tail Thinning Starts after Tip Style; with no blank neither row is there", async ({
    page,
  }) => {
    await openRocker(page);
    // D-09: hidden, not disabled.
    await expect(page.getByText(/Thinning Starts — /)).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Use Automatic for the / })).toHaveCount(0);

    await pickFirstFittingBlank(page);
    await expect(startLabel(page, "nose")).toBeVisible();
    await expect(startLabel(page, "tail")).toBeVisible();
    // A board that stores no start reads Automatic on both tips (UI E01 Empty).
    for (const end of ["nose", "tail"] as const) {
      await expect(automaticButton(page, end)).toHaveAttribute("aria-pressed", "true");
      await expect(automaticButton(page, end)).toHaveAttribute("aria-disabled", "true");
    }

    // D-10's order: Tip Style, then the nose, then the tail — the last three things in THICKNESS.
    const top = async (locator: Locator) => {
      const box = await locator.boundingBox();
      if (!box) throw new Error("no bounding box");
      return box.y;
    };
    const tipStyle = await top(pillGroup(page, "Tip Style"));
    const nose = await top(startLabel(page, "nose"));
    const tail = await top(startLabel(page, "tail"));
    expect(nose).toBeGreaterThan(tipStyle);
    expect(tail).toBeGreaterThan(nose);
  });

  test("a nose drag sets its start by hand with no request, and one undo puts it back", async ({ page }, testInfo) => {
    await openRocker(page);
    await pickFirstFittingBlank(page);

    const labelBefore = await startLabel(page, "nose").innerText();
    const hintBefore = await startHint(page, "nose").innerText();
    const automaticDistance = distanceOf(labelBefore);

    // The same filter as the Deck Skin drag above: Clerk's fake-key boot traffic and blob: loads are
    // not caused by a drag; anything else is named on failure.
    const requests: string[] = [];
    page.on("request", (request) => {
      const url = request.url();
      if (url.startsWith("blob:") || /clerk\.accounts\.dev|\/__clerk\//.test(url)) return;
      requests.push(`${request.method()} ${url}`);
    });

    const slider = startRow(page, "nose").getByRole("slider");
    await slider.focus();
    await slider.press("ArrowRight");

    await expect(startLabel(page, "nose")).not.toHaveText(labelBefore);
    await expect(startHint(page, "nose")).toHaveText(`Automatic would be ${automaticDistance}`);
    await expect(automaticButton(page, "nose")).toHaveAttribute("aria-pressed", "false");
    // Each tip is its own: the tail stays on Automatic (UI E01 Partial).
    await expect(automaticButton(page, "tail")).toHaveAttribute("aria-pressed", "true");
    expect(requests, `requests during the drag: ${requests.join(", ")}`).toHaveLength(0);

    await undoOnce(page, testInfo.project.name);
    await expect(startLabel(page, "nose")).toHaveText(labelBefore);
    await expect(startHint(page, "nose")).toHaveText(hintBefore);
    await expect(automaticButton(page, "nose")).toHaveAttribute("aria-pressed", "true");
  });

  test("Automatic puts a hand-set start back in one undo step, and pressing it again does nothing", async ({
    page,
  }, testInfo) => {
    await openRocker(page);
    await pickFirstFittingBlank(page);

    const automaticLabel = await startLabel(page, "nose").innerText();
    const slider = startRow(page, "nose").getByRole("slider");
    await slider.focus();
    await slider.press("ArrowRight");
    await expect(startLabel(page, "nose")).not.toHaveText(automaticLabel);
    const handSetLabel = await startLabel(page, "nose").innerText();

    const button = automaticButton(page, "nose");
    await expect(button).toHaveText("Automatic");
    await button.click();
    await expect(startLabel(page, "nose")).toHaveText(automaticLabel);
    await expect(button).toHaveAttribute("aria-pressed", "true");

    // One undo step: back to the start set by hand.
    await undoOnce(page, testInfo.project.name);
    await expect(startLabel(page, "nose")).toHaveText(handSetLabel);
    await expect(button).toHaveAttribute("aria-pressed", "false");

    // Back to Automatic, then a second press on a tip already on Automatic: the button is inert, so
    // the press is fired straight at it — it writes nothing and records no step.
    await button.click();
    await expect(startLabel(page, "nose")).toHaveText(automaticLabel);
    await expect(button).toHaveAttribute("aria-disabled", "true");
    await button.dispatchEvent("click");
    await expect(startLabel(page, "nose")).toHaveText(automaticLabel);

    // So the next undo still lands on the start set by hand, not on an empty step.
    await undoOnce(page, testInfo.project.name);
    await expect(startLabel(page, "nose")).toHaveText(handSetLabel);
  });

  test(`the fixture board: a 10'0" on the Arctic Foam 10'9" LB at the tail end starts its tail further in, and a hand-set 12" start says where it is thinnest until Automatic clears it`, async ({
    page,
  }) => {
    // TEMPLATE: the longest board the app makes (10'0"), with the default 2 1/2" centre and tips.
    await page.goto("/design/outline");
    const tenFoot = `Board Length — ${formatLength(inchesToMm(BOARD_LENGTH_RANGE_IN.max), "imperial")}`;
    const lengthLabel = page.getByText(/^Board Length — /);
    const lengthSlider = lengthLabel.locator("xpath=..").getByRole("slider");
    // Retried, because a key pressed before React owns the slider is lost.
    await expect(async () => {
      await lengthSlider.focus();
      await lengthSlider.press("End");
      await expect(lengthLabel).toHaveText(tenFoot, { timeout: 1_000 });
    }).toPass({ timeout: 30_000 });

    // ROCKER, client-side, so the board in progress comes along.
    await page.getByRole("link", { name: "ROCKER", exact: true }).filter({ visible: true }).first().dispatchEvent("click");
    await page.waitForURL("**/design/rocker");
    await waitForLiveBlankList(page);

    await page.getByRole("searchbox", { name: "Search blanks" }).fill(`Arctic Foam 10'9"`);
    const arctic = blankList(page).getByRole("button", { name: /^Use Arctic Foam 10'9" LB\b/ });
    await expect(arctic).toHaveCount(1);
    await arctic.click();
    await expect(pickedCard(page)).toContainText(`10'9" LB`);

    // Slid to the tail end.
    const placement = sliderUnder(page, /^Placement — /);
    await placement.focus();
    await placement.press("End");
    await expect(page.getByText(/^Placement — .+ toward tail$/)).toBeVisible();

    // On Automatic the tail cannot run down steadily from 12", so it starts further in.
    await expect(startHint(page, "tail")).toHaveText(`Automatic: ${stationLabel("imperial")} is too short`);
    await expect(automaticButton(page, "tail")).toHaveAttribute("aria-pressed", "true");
    const automaticLabel = await startLabel(page, "tail").innerText();
    const automaticDistance = distanceOf(automaticLabel);
    expect(readInches(automaticDistance)).toBeGreaterThan(12);
    // ...so the Tail @ 12" thickness belongs to the taper (D-07).
    const tail12Row = page.getByText(/^Tail @ 12" — /).locator("xpath=..");
    await expect(tail12Row.getByText(/^From the tip taper /)).toBeVisible();
    await expect(tooCloseLine(page, "tail")).toHaveCount(0);

    // Set the tail's start by hand to 12": all the way to the tip, then a half inch at a time.
    const slider = startRow(page, "tail").getByRole("slider");
    await slider.focus();
    await slider.press("Home");
    await expect(automaticButton(page, "tail")).toHaveAttribute("aria-pressed", "false");
    const twelve = `Tail Thinning Starts — ${stationLabel("imperial")}`;
    for (let step = 0; step < 40 && (await startLabel(page, "tail").innerText()) !== twelve; step++) {
      const before = await startLabel(page, "tail").innerText();
      await slider.press("ArrowRight");
      await expect(startLabel(page, "tail")).not.toHaveText(before);
    }
    await expect(startLabel(page, "tail")).toHaveText(twelve);
    await expect(startHint(page, "tail")).toHaveText(`Automatic would be ${automaticDistance}`);

    // The thin spot is named under the row that caused it, with where Automatic would start instead.
    const line = tooCloseLine(page, "tail");
    await expect(line).toHaveCount(1);
    await expect(line).toHaveText(/^The board is thinnest /);
    await expect(line).toContainText(`Automatic would start the thinning ${automaticDistance} from the tip`);
    // No box, no live region, no button of its own (UI-SPEC §4).
    await expect(line).not.toHaveAttribute("role", /.+/);
    await expect(line).not.toHaveAttribute("aria-live", /.+/);
    await expect(line.getByRole("button")).toHaveCount(0);

    await automaticButton(page, "tail").click();
    await expect(tooCloseLine(page, "tail")).toHaveCount(0);
    await expect(startLabel(page, "tail")).toHaveText(automaticLabel);
  });

  test("on Automatic at 12\" the nose start reads exactly the Nose @ station's name, in Metric and back in Imperial", async ({
    page,
  }, testInfo) => {
    await page.addInitScript(() => window.localStorage.setItem("shaper-units", "metric"));
    await openRocker(page);
    await pickFirstFittingBlank(page);

    // The sidebar's Nose @ fine-tune row (its label carries ` — ` and the thickness), not the
    // drawing's or the readouts' station names.
    const nose12 = page.getByText(/^Nose @ .+ — /);
    await expect(startHint(page, "nose")).toHaveText("Picked automatically");
    const metricStation = stationOf(await nose12.innerText());
    expect(metricStation).toMatch(/ cm$/);
    expect((await startLabel(page, "nose").innerText()).endsWith(metricStation)).toBe(true);

    // Switching systems rewrites nothing: the same start, read the Imperial way.
    await chooseUnits(page, testInfo.project.name, "Imperial");
    await expect(nose12).toHaveText(/^Nose @ \d+" — /);
    const imperialStation = stationOf(await nose12.innerText());
    expect((await startLabel(page, "nose").innerText()).endsWith(imperialStation)).toBe(true);
    await expect(startHint(page, "nose")).toHaveText("Picked automatically");
    await expect(automaticButton(page, "nose")).toHaveAttribute("aria-pressed", "true");
  });

  test("each Thinning Starts slider is named for its own tip, and in Metric says the distance its label shows", async ({
    page,
  }) => {
    await page.addInitScript(() => window.localStorage.setItem("shaper-units", "metric"));
    await openRocker(page);
    await pickFirstFittingBlank(page);

    for (const end of ["nose", "tail"] as const) {
      // Exactly one slider answers to each name, and it is the one in that tip's own row.
      const named = page.getByRole("slider", { name: `${TIP_NAME[end]} Thinning Starts`, exact: true });
      await expect(named).toHaveCount(1);
      await expect(startRow(page, end).getByRole("slider", { name: `${TIP_NAME[end]} Thinning Starts`, exact: true })).toHaveCount(1);

      // On Automatic, and again after a drag sets it by hand: the spoken value is the label's distance
      // (`30.5 cm`), never the bare millimetres the slider runs on.
      const label = startLabel(page, end);
      await expect(label).toHaveText(/ cm$/);
      await expect(named).toHaveAttribute("aria-valuetext", distanceOf(await label.innerText()));
      const before = await label.innerText();
      await named.focus();
      await named.press("ArrowRight");
      await expect(label).not.toHaveText(before);
      await expect(label).toHaveText(/ cm$/);
      await expect(named).toHaveAttribute("aria-valuetext", distanceOf(await label.innerText()));
    }
  });

  test("↺ Reset Fine-Tune clears a 12\" tweak and leaves a start set by hand exactly where it was", async ({ page }) => {
    await openRocker(page);
    await pickFirstFittingBlank(page);

    // The tail's start, set by hand.
    const tailSlider = startRow(page, "tail").getByRole("slider");
    const atPick = await startLabel(page, "tail").innerText();
    await tailSlider.focus();
    await tailSlider.press("ArrowRight");
    await expect(startLabel(page, "tail")).not.toHaveText(atPick);
    await expect(automaticButton(page, "tail")).toHaveAttribute("aria-pressed", "false");
    const handSet = await startLabel(page, "tail").innerText();

    // A 12" tweak — down a step, which keeps the board in its blank — so ↺ Reset Fine-Tune is live.
    const reset = page.getByRole("button", { name: "↺ Reset Fine-Tune", exact: true });
    await expect(reset).toHaveCount(1);
    await expect(reset).toHaveAttribute("aria-disabled", "true");
    const nose12Row = page.getByText(/^Nose @ 12" — /).locator("xpath=..");
    await nose12Row.getByRole("slider").focus();
    await nose12Row.getByRole("slider").press("ArrowLeft");
    await expect(nose12Row).not.toContainText("No tweak");
    await expect(reset).not.toHaveAttribute("aria-disabled", /.+/);

    await reset.click();
    await expect(nose12Row).toContainText("No tweak");
    await expect(reset).toHaveAttribute("aria-disabled", "true");

    // The start is untouched: the same label, and still set by hand — its Automatic button can still be pressed.
    await expect(startLabel(page, "tail")).toHaveText(handSet);
    await expect(automaticButton(page, "tail")).toHaveAttribute("aria-pressed", "false");
    await expect(automaticButton(page, "tail")).not.toHaveAttribute("aria-disabled", /.+/);
    await expect(automaticButton(page, "tail")).toBeEnabled();
  });

  test("switching to another blank keeps a start set by hand", async ({ page }) => {
    await openRocker(page);
    const first = await pickFirstFittingBlank(page);

    const slider = startRow(page, "nose").getByRole("slider");
    const labelAtPick = await startLabel(page, "nose").innerText();
    await slider.focus();
    await slider.press("ArrowRight");
    await expect(startLabel(page, "nose")).not.toHaveText(labelAtPick);
    const handSet = await startLabel(page, "nose").innerText();

    await page.getByRole("button", { name: "Change Blank" }).click();
    const other = blankList(page).locator('li[data-group="fits"] button[aria-pressed="false"]').first();
    const otherName = (await other.locator("[data-blank-name]").innerText()).trim();
    expect(otherName).not.toBe(first);
    await other.click();
    await expect(pickedCard(page).locator("[data-blank-name]")).toHaveText(otherName);

    await expect(startLabel(page, "nose")).toHaveText(handSet);
    await expect(automaticButton(page, "nose")).toHaveAttribute("aria-pressed", "false");
  });
});

/**
 * Undo, the way a shaper reaches it: Cmd/Ctrl+Z at a keyboard, the floating Undo button on a phone
 * (`components/design/phone-undo-bar.tsx`, shown only in the phone layout).
 */
async function undoOnce(page: Page, projectName: string) {
  if (projectName === "desktop") {
    await page.keyboard.press("ControlOrMeta+z");
  } else {
    await page.locator("[data-phone-undo-bar]").getByRole("button", { name: "Undo" }).click();
  }
}
