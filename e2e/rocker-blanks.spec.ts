import { expect, test, type Locator, type Page } from "@playwright/test";
import { goToScreen } from "./helpers/screens";
import { openAppSettings } from "./helpers/settings";

/**
 * The finished ROCKER screen's browser proof (Phase 11, 11-11): pick a real blank from the list,
 * slide the board along it, read the numbers, keep a pick through a change that stops it fitting,
 * and go back to a hand-set rocker.
 *
 * This suite has no database: `playwright.config.ts` sets `SHAPER_BLANKS_SOURCE=seed-csv` for its
 * own dev server, so the list reads the committed catalogue CSVs through the same tested reader the
 * database seed uses (11-05). No expected blank name or catalogue number is ever typed here — the
 * tests pick "the first row under FITS THIS BOARD" and read its name off the page, and compare the
 * offer to the offer line's own text.
 *
 * The sign-in banner and the toolbar tip are dismissed before navigation, as in
 * `touch-sizing.spec.ts`, so neither shifts anything under a tap.
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
  // once React hydrates that boundary. A keystroke or tap before then is lost (WebKit showed it: a
  // search typed too early came back empty), so wait until React owns the first row and the box.
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

test.describe("ROCKER — a real blank from the list", () => {
  test.beforeEach(async ({ page }) => {
    await dismissChrome(page);
  });

  test("tapping the first blank that fits puts the board in it on the drawing", async ({ page }) => {
    await openRocker(page);
    // Nothing behind the board until a blank is picked.
    await expect(page.locator("[data-blank-silhouette]")).toHaveCount(0);
    await pickFirstFittingBlank(page);
    await expect(page.locator("[data-blank-silhouette]")).toBeVisible();
  });

  test("the thinning marks cross the board at both tips with a blank, and nowhere without one", async ({ page }) => {
    await openRocker(page);
    const marks = page.locator("[data-thinning-mark]");
    // No blank: no mark, and the drawing's name is unchanged.
    await expect(marks).toHaveCount(0);
    await expect(page.getByRole("img", { name: "Side profile of the board, showing the rocker line and deck thickness" })).toBeVisible();

    await pickFirstFittingBlank(page);
    // One dashed line at each tip's thinning start (phones draw the board nose-up, the desktop
    // nose-left — the marks turn with it either way).
    await expect(marks).toHaveCount(2);
    await expect(page.locator('[data-thinning-mark="nose"]')).toHaveCount(1);
    await expect(page.locator('[data-thinning-mark="tail"]')).toHaveCount(1);
    for (const end of ["nose", "tail"]) {
      const box = await page.locator(`[data-thinning-mark="${end}"]`).boundingBox();
      expect(box).not.toBeNull();
      // It crosses the board: a real length on screen, not a dot.
      expect(Math.max(box!.width, box!.height)).toBeGreaterThan(4);
    }
    // A screen reader hears where the two marks are.
    const drawing = page.getByRole("img", { name: /where each tip's thinning starts/ });
    await expect(drawing).toBeVisible();
    await expect(drawing).toHaveAttribute("aria-label", /: .+ from the nose tip and .+ from the tail tip$/);

    // The order form's compact drawing is never handed the blank, so it draws no mark.
    await goToScreen(page, "SUMMARY");
    // The first visit builds the page on the test's dev server, which can take longer than 5 s.
    await expect(page).toHaveURL(/\/design\/summary/, { timeout: 30_000 });
    await expect(
      page.getByRole("img", { name: "Side profile of the board, showing the rocker line and deck thickness" }).first(),
    ).toBeAttached({ timeout: 30_000 });
    await expect(page.locator("[data-thinning-mark]")).toHaveCount(0);
  });

  test("the search narrows the list, says when nothing matches, and Clear Search brings it back", async ({ page }) => {
    await openRocker(page);
    const search = page.getByRole("searchbox", { name: "Search blanks" });

    await search.fill("Marko");
    const rows = blankList(page).locator("li[data-group] button");
    // Polled: the list is already on screen before the keystrokes land, so wait for the filter.
    await expect
      .poll(async () => {
        const labels = await rows.evaluateAll((buttons) => buttons.map((b) => b.getAttribute("aria-label") ?? ""));
        return labels.length > 0 && labels.every((label) => label.includes("Marko"));
      })
      .toBe(true);

    await search.fill("zzz");
    await expect(page.getByText('No blanks match "zzz".')).toBeVisible();
    await expect(blankList(page)).toHaveCount(0);
    await page.getByRole("button", { name: "Clear Search" }).click();
    await expect(search).toHaveValue("");
    await expect(firstFittingRow(page)).toBeVisible();
  });

  test("a pick that stops fitting stays picked, with a flag and the closest blank that does fit", async ({ page }) => {
    await openRocker(page);
    const name = await pickFirstFittingBlank(page);
    await expect(page.locator("[data-blank-flag]")).toHaveCount(0);

    await raiseCenterThickness(page);

    const flag = page.locator("[data-blank-flag]");
    await expect(flag).toContainText("This blank doesn't fit your board");
    // F4 (Phase 12 D-10): too thin at the centre now means no room for the board's deck skin and
    // one bottom pass of the planer.
    await expect(flag).toContainText("too thin at the center");
    await expect(flag).toContainText("deck skin");
    await expect(flag).toContainText("bottom pass");
    // Never cleared on its own (D-08): the same blank is still the board's blank.
    await expect(pickedCard(page).locator("[data-blank-name]")).toHaveText(name);

    const offer = flag.locator("[data-blank-offer]");
    await expect(offer).toHaveText(/^Closest blank that fits: /);
    const offerText = await offer.innerText();

    await flag.getByRole("button", { name: "Switch to This Blank" }).click();
    const switchedTo = (await pickedCard(page).locator("[data-blank-name]").innerText()).trim();
    expect(switchedTo).not.toBe(name);
    expect(offerText).toContain(` ${switchedTo}, `);
    await expect(page.locator("[data-blank-flag]")).toHaveCount(0);

    await page.getByRole("button", { name: "Remove This Blank" }).click();
    await expect(page.getByText("Hand-set until you pick a blank").first()).toBeVisible();
    await expect(page.locator("[data-blank-silhouette]")).toHaveCount(0);
    await expect(pickedCard(page)).toHaveCount(0);
  });

  test("with no blank picked, the list intro quotes the Deck Skin default from App Default Settings", async ({
    page,
  }) => {
    await openRocker(page);
    const intro = page.getByText(/^Shortest first\./);
    await expect(intro).toContainText("deck skin");
    await expect(intro).toContainText("bottom pass");

    // D-01: a board with no blank follows the live account default, and the list's words quote
    // the skin its verdicts use — so changing the default re-words the intro at once.
    const dialog = await openAppSettings(page);
    const skin = dialog.getByRole("textbox", { name: "Deck Skin", exact: true });
    await skin.fill("1/2");
    await skin.press("Enter");
    await expect(skin).toHaveValue('1/2"');
    await dialog.getByRole("button", { name: "Done" }).click();
    await expect(dialog).toBeHidden();

    await expect(intro).toContainText('1/2" deck skin');
  });
});

/** The page's first control: the board's one centre thickness, typed. */
async function typeCenterThickness(page: Page, value: string) {
  const field = page.getByRole("textbox", { name: "Center Thickness" });
  await field.click();
  await field.fill(value);
  await field.press("Enter");
}

/**
 * Raises the board's one centre thickness from the default 2 1/2" to 3 1/2" — thicker than the
 * shortest fitting blank can carry with room for the default deck skin and one bottom pass, so that
 * pick stops fitting.
 */
async function raiseCenterThickness(page: Page) {
  await typeCenterThickness(page, "3 1/2");
  await expect(page.getByRole("textbox", { name: "Center Thickness" })).toHaveValue('3 1/2"');
}

/** A `SliderRow`'s slider, found by the start of its label line. */
function sliderUnder(page: Page, label: RegExp): Locator {
  return page.getByText(label).locator("xpath=..").getByRole("slider");
}

test.describe("ROCKER — centre, placement, live numbers and the 12\" fine-tune", () => {
  test.beforeEach(async ({ page }) => {
    await dismissChrome(page);
  });

  test("the placement slider waits for a blank, then slides the board toward the nose with no network request", async ({
    page,
  }) => {
    await openRocker(page);
    await expect(page.getByText("Placement — pick a blank first")).toBeVisible();
    await expect(page.locator("[data-readouts]")).toHaveCount(0);

    await pickFirstFittingBlank(page);
    await expect(page.getByText("Placement — centered")).toBeVisible();
    const readouts = page.locator("[data-readouts]");
    await expect(readouts.locator("[data-readout-row]")).toHaveCount(5);
    const noseTipBefore = await readouts.locator('[data-readout-row="noseTip"]').innerText();

    // R14: sliding the board samples the prepared fit in the browser — nothing goes to the server.
    const origin = new URL(page.url()).origin;
    let requests = 0;
    page.on("request", (request) => {
      if (request.url().startsWith(origin)) requests += 1;
    });

    const placement = sliderUnder(page, /^Placement — /);
    await placement.focus();
    await placement.press("ArrowLeft");
    await placement.press("ArrowLeft");
    await expect(page.getByText(/^Placement — .+ toward nose$/)).toBeVisible();
    await expect(readouts.locator('[data-readout-row="noseTip"]')).not.toHaveText(noseTipBefore);
    await expect(readouts.locator("[data-readout-row]")).toHaveCount(5);
    expect(requests).toBe(0);
  });

  test("a 12\" fine-tune reads From blank and Tweak, and Reset Fine-Tune brings back No tweak", async ({ page }) => {
    await openRocker(page);
    await pickFirstFittingBlank(page);
    // With a blank picked the hand-set ROCKER section steps aside (the rocker comes off the blank).
    await expect(page.getByRole("button", { name: /^Rocker\s*[▾▸]$/ })).toHaveCount(0);

    const nose12Row = page.getByText(/^Nose @ 12" — /).locator("xpath=..");
    await expect(nose12Row).toContainText("From blank ");
    await expect(nose12Row).toContainText("No tweak");
    const reset = page.getByRole("button", { name: "↺ Reset Fine-Tune" });
    await expect(reset).toHaveAttribute("aria-disabled", "true");

    await nose12Row.getByRole("slider").focus();
    await nose12Row.getByRole("slider").press("ArrowRight");
    await expect(nose12Row).toContainText('Tweak +1/16"');
    await expect(reset).not.toHaveAttribute("aria-disabled", "true");

    await reset.click();
    await expect(nose12Row).toContainText("No tweak");
    await expect(reset).toHaveAttribute("aria-disabled", "true");
  });

  test("Center Thickness is the board's one centre — RAILS reads the typed value", async ({ page }) => {
    await openRocker(page);
    await typeCenterThickness(page, "2 3/4");
    await expect(page.getByRole("textbox", { name: "Center Thickness" })).toHaveValue('2 3/4"');

    await goToScreen(page, "RAILS");
    // The first visit builds the page on the test's dev server, which can take longer than 5 s.
    await expect(page).toHaveURL(/\/design\/rails/, { timeout: 30_000 });
    // On an upright phone RAILS shows one rail at a time and only that rail's controls under it
    // (quick 261005-big), so the centre's Board Thickness sits behind the CENTER tab there; a
    // computer shows every rail's controls and has no such tab. The controls' title is drawn with
    // the tab row, so waiting for it first means the tab's visibility is read on the finished screen.
    await expect(page.getByText("Rail Band Calculator", { exact: true })).toBeVisible();
    const centerTab = page.locator('[data-rail-plot-row="phone"]').getByRole("tab", { name: "CENTER" });
    if (await centerTab.isVisible()) await centerTab.click();
    await expect(page.getByText('Board Thickness — 2 3/4"')).toBeVisible();
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

/**
 * The two thinning starts as the drawing's accessible name says them (`… 12" from the nose tip and
 * 12" from the tail tip`), read off the page so no expected distance is typed into a test.
 */
async function thinningStartsFromDrawing(page: Page): Promise<{ nose: string; tail: string }> {
  const drawing = page.getByRole("img", { name: /where each tip's thinning starts/ });
  await expect(drawing).toBeVisible();
  const name = (await drawing.getAttribute("aria-label")) ?? "";
  const match = /thinning starts: (.+) from the nose tip and (.+) from the tail tip$/.exec(name);
  expect(match).not.toBeNull();
  return { nose: match![1], tail: match![2] };
}

/** The DATASHEET's From tip row: its label, then its five cells in the sheet's nose-to-tail order. */
async function thinningRowCells(page: Page): Promise<string[]> {
  const row = page.locator("[data-datasheet-thinning]");
  await expect(row).toBeVisible();
  return (await row.locator(":scope > div").allInnerTexts()).map((text) => text.trim());
}

/**
 * Where the DATASHEET's NOSE TIP and TAIL TIP columns sit, read off its own header row (an empty label
 * cell, then the five station names), so a cell is checked against the column it is drawn under.
 */
async function tipColumns(page: Page): Promise<{ nose: number; tail: number }> {
  const table = page.locator("main .overflow-x-auto").filter({ hasText: "FOAM OFF" });
  const header = table.getByText(/^nose tip$/i).locator("xpath=..");
  const names = (await header.locator(":scope > div").allTextContents()).map((text) => text.trim().toLowerCase());
  const nose = names.indexOf("nose tip");
  const tail = names.indexOf("tail tip");
  expect(nose, `header cells: ${names.join(" | ")}`).toBeGreaterThan(0);
  expect(tail, `header cells: ${names.join(" | ")}`).toBeGreaterThan(0);
  return { nose, tail };
}

/** A Thinning Starts row's label line in the sidebar (`Tail Thinning Starts — 12"`). */
function startLabel(page: Page, end: "nose" | "tail"): Locator {
  return page.getByText(new RegExp(`^${end === "nose" ? "Nose" : "Tail"} Thinning Starts — `));
}

/** The distance a label line carries after its ` — `. */
function distanceOf(label: string): string {
  const at = label.indexOf(" — ");
  if (at < 0) throw new Error(`no distance in "${label}"`);
  return label.slice(at + 3);
}

/**
 * Sets the tail's start by hand to the far end of its slider (the board's centre), so the two starts
 * differ, and returns both distances as the sidebar's labels print them.
 */
async function tailStartToFarEnd(page: Page): Promise<{ nose: string; tail: string }> {
  const label = startLabel(page, "tail");
  const before = await label.innerText();
  const slider = label.locator("xpath=..").getByRole("slider");
  await slider.focus();
  await slider.press("End");
  await expect(label).not.toHaveText(before);
  const nose = distanceOf(await startLabel(page, "nose").innerText());
  const tail = distanceOf(await label.innerText());
  expect(tail, "the two starts differ, so a swap cannot pass").not.toBe(nose);
  return { nose, tail };
}

test.describe("ROCKER — the DATASHEET beside a blank, one undo after Remove, and Metric in millimetres (11-12)", () => {
  test.beforeEach(async ({ page }) => {
    await dismissChrome(page);
  });

  test("with a blank picked the DATASHEET shows the blank's block, the board's block, FOAM OFF off the deck and the bottom, and the catalogue footnote", async ({
    page,
  }) => {
    await openRocker(page);
    await pickFirstFittingBlank(page);
    // The drawing tells a screen reader both bands are shaded (Phase 12 D-06).
    // Phase 14 D-12: the same name now goes on to say where each tip's thinning starts.
    await expect(page.getByRole("img", { name: /with the foam to come off the deck and the bottom shaded, and / })).toBeVisible();
    await page.getByRole("tab", { name: "DATASHEET" }).click();

    const sheet = page.locator("main");
    await expect(sheet.getByText(/^BLANK — /)).toBeVisible();
    await expect(sheet.getByText("YOUR BOARD", { exact: true })).toBeVisible();
    // The single Foam Off row split into a FOAM OFF block with a Deck row and a Bottom row. Scoped
    // to the table so the sidebar's Deck Skin row and its Bottom pills are never matched.
    const table = sheet.locator(".overflow-x-auto").filter({ hasText: "FOAM OFF" });
    await expect(table.getByText("FOAM OFF", { exact: true })).toBeVisible();
    await expect(table.getByText(/^Deck( \(mm\))?$/)).toBeVisible();
    await expect(table.getByText(/^Bottom( \(mm\))?$/)).toBeVisible();
    await expect(sheet.getByText(/^Foam Off/)).toHaveCount(0);
    await expect(sheet.getByText(/catalog, page \d+/)).toBeVisible();
  });

  test("with a blank picked the DATASHEET's THINNING STARTS row puts each start under its tip, the same distances the drawing names", async ({
    page,
  }) => {
    await openRocker(page);
    await pickFirstFittingBlank(page);
    // The tail set by hand to the far end of its slider, so the two starts differ.
    const sidebar = await tailStartToFarEnd(page);
    // The drawing names each tip's own start.
    await expect(async () => expect(await thinningStartsFromDrawing(page)).toEqual(sidebar)).toPass();
    const { nose, tail } = await thinningStartsFromDrawing(page);
    await page.getByRole("tab", { name: "DATASHEET" }).click();

    const table = page.locator("main .overflow-x-auto").filter({ hasText: "FOAM OFF" });
    const group = table.getByText("THINNING STARTS", { exact: true });
    await expect(group).toBeVisible();
    // The new block follows FOAM OFF.
    const foamOffBox = await table.getByText("FOAM OFF", { exact: true }).boundingBox();
    const groupBox = await group.boundingBox();
    expect(groupBox!.y).toBeGreaterThan(foamOffBox!.y);

    const cells = await thinningRowCells(page);
    expect(cells).toEqual(["From tip", nose, "", "", "", tail]);
    // The nose's start under NOSE TIP and the tail's under TAIL TIP, by the header's own columns.
    const columns = await tipColumns(page);
    expect(cells[columns.nose]).toBe(sidebar.nose);
    expect(cells[columns.tail]).toBe(sidebar.tail);
  });

  test("in Metric the THINNING STARTS row reads From tip (cm) and the two starts in bare centimetres", async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem("shaper-units", "metric"));
    await openRocker(page);
    await pickFirstFittingBlank(page);
    const sidebar = await tailStartToFarEnd(page);
    // The drawing names each start in centimetres (a dim, never `305 mm`), each tip its own.
    await expect(async () => expect(await thinningStartsFromDrawing(page)).toEqual(sidebar)).toPass();
    const { nose, tail } = await thinningStartsFromDrawing(page);
    expect(nose).toMatch(/^\d+\.\d cm$/);
    expect(tail).toMatch(/^\d+\.\d cm$/);
    await page.getByRole("tab", { name: "DATASHEET" }).click();

    const cells = await thinningRowCells(page);
    expect(cells).toEqual(["From tip (cm)", nose.replace(/ cm$/, ""), "", "", "", tail.replace(/ cm$/, "")]);
    const columns = await tipColumns(page);
    expect(cells[columns.nose]).toBe(sidebar.nose.replace(/ cm$/, ""));
    expect(cells[columns.tail]).toBe(sidebar.tail.replace(/ cm$/, ""));
  });

  test("with no blank the DATASHEET has no THINNING STARTS block", async ({ page }) => {
    await openRocker(page);
    await page.getByRole("tab", { name: "DATASHEET" }).click();
    const main = page.locator("main");
    await expect(main.getByText(/^Your board's own blank datasheet/)).toBeVisible();
    await expect(main.getByText("THINNING STARTS", { exact: true })).toHaveCount(0);
    await expect(page.locator("[data-datasheet-thinning]")).toHaveCount(0);
  });

  // Fast task, 2026-10-03 (the founder's request): the box's sideways-scroll fade covers its last
  // 24px, and every cell is right-aligned, so the TAIL TIP column used to end under it — faded on a
  // computer, where nothing scrolls, and on a phone even scrolled to the end. The table now ends in
  // 24px of empty room, so with the box scrolled as far right as it goes (no scroll at all on a
  // computer) the TAIL TIP heading and the BLANK rocker's tail-tip cell both stop where the fade
  // starts.
  test("the sideways fade never covers the TAIL TIP column, on a computer or scrolled to the end on a phone", async ({
    page,
  }) => {
    await openRocker(page);
    await pickFirstFittingBlank(page);
    await page.getByRole("tab", { name: "DATASHEET" }).click();
    const tableBox = page.locator("main .overflow-x-auto").first();
    await expect(tableBox).toBeVisible();
    await tableBox.evaluate((el) => {
      el.scrollLeft = el.scrollWidth;
    });
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));

    const fadeStarts = await tableBox.evaluate((el) => el.getBoundingClientRect().right - 24);
    const heading = tableBox.getByText("Tail Tip", { exact: true }).first();
    const tailTipCell = page.locator('[data-datasheet-blank-row="rocker"] > div').last();
    for (const [what, cell] of [
      ["the TAIL TIP heading", heading],
      ["the BLANK rocker's tail-tip cell", tailTipCell],
    ] as const) {
      const right = await cell.evaluate((el) => el.getBoundingClientRect().right);
      expect(right, `${what} runs under the fade`).toBeLessThanOrEqual(fadeStarts + 0.5);
    }
  });

  test("Remove This Blank, then one undo, brings back the same blank, its placement and its fine-tune", async ({
    page,
  }, testInfo) => {
    await openRocker(page);
    const name = await pickFirstFittingBlank(page);

    // Slide the board off centre and fine-tune the nose 12" station, so there is something to lose.
    const placement = sliderUnder(page, /^Placement — /);
    await placement.focus();
    await placement.press("ArrowLeft");
    await placement.press("ArrowLeft");
    const placementLabel = page.getByText(/^Placement — .+ toward nose$/);
    await expect(placementLabel).toBeVisible();
    const placementText = await placementLabel.innerText();

    const nose12Row = page.getByText(/^Nose @ 12" — /).locator("xpath=..");
    await nose12Row.getByRole("slider").focus();
    await nose12Row.getByRole("slider").press("ArrowRight");
    await expect(nose12Row).toContainText('Tweak +1/16"');

    await page.getByRole("button", { name: "Remove This Blank" }).click();
    await expect(pickedCard(page)).toHaveCount(0);
    await expect(page.getByText("Placement — pick a blank first")).toBeVisible();

    await undoOnce(page, testInfo.project.name);

    await expect(pickedCard(page).locator("[data-blank-name]")).toHaveText(name);
    await expect(page.getByText(placementText, { exact: true })).toBeVisible();
    await expect(page.getByText(/^Nose @ 12" — /).locator("xpath=..")).toContainText('Tweak +1/16"');
    await expect(page.locator("[data-blank-silhouette]")).toBeVisible();
  });

  test("in Metric the readouts, the placement label and the fine-tune read in whole millimetres", async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem("shaper-units", "metric"));
    await openRocker(page);
    await pickFirstFittingBlank(page);

    const readouts = page.locator("[data-readouts]");
    await expect(readouts.locator("[data-readout-row]")).toHaveCount(5);
    const readoutText = await readouts.innerText();
    expect(readoutText).toContain("mm");
    expect(readoutText).not.toContain('"');

    const placement = sliderUnder(page, /^Placement — /);
    await placement.focus();
    await placement.press("ArrowLeft");
    await expect(page.getByText(/^Placement — \d+ mm toward nose$/)).toBeVisible();
    expect(await readouts.innerText()).not.toContain('"');

    // The 12" fine-tune's hint reads in millimetres too.
    const nose12Row = page.getByText(/^Nose @ .+ — /).first().locator("xpath=..");
    await nose12Row.getByRole("slider").focus();
    await nose12Row.getByRole("slider").press("ArrowRight");
    await expect(nose12Row).toContainText(/Tweak \+\d+ mm/);
    expect(await nose12Row.innerText()).not.toContain('"');
  });
});
