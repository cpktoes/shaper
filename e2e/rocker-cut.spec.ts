import { expect, test, type Locator, type Page } from "@playwright/test";
import { thicknessIntroWithBlank } from "../lib/geometry/blank-reasons";

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
