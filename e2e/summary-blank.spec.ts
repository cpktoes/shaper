import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  blankPicker,
  blankRockerLine,
  cardButton,
  customRockerDialog,
  firstFittingCard,
  openBlankPicker,
  openCustomizeRocker,
  openRocker,
  pickedCard,
} from "./helpers/blank-picker";
import { goToScreen } from "./helpers/screens";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseCsv } from "../lib/blanks/csv";
import { placementRange } from "../lib/geometry/blank-fit";
import { formatPlacement, placementSlider } from "../lib/geometry/blank-reasons";
import { BOARD_LENGTH_RANGE_IN } from "../lib/geometry/board";
import { blankDisplayName, formatRockerNote } from "../lib/geometry/custom-rocker";
import { inchesToMm, mm } from "../lib/geometry/units";

/**
 * The Summary order form's Blank field (quick 260926-wkh). Page 2 of the order form, the Shaper
 * Reference sheet, ends with a shaded Shaper Use Only box — the shop's own record of the job. Its
 * Blank field has two states:
 *
 * - The board has no blank (a fresh board, or one whose blank was removed on ROCKER): an empty
 *   ruled line the shop writes the blank on by hand.
 * - The board was designed on a blank picked on ROCKER: that blank prints there, read-only, as
 *   vendor, name and rocker — `Natural`, or the note as ordered (quick 261016-mkb, D-02), read here
 *   off ROCKER's own BLANK button so the two are proved to agree — then where the board's
 *   centre sits on the blank, in ROCKER's own words (quick 260927-0fq): `— centered` at the
 *   starting spot, or `— center 1/16" toward nose` and the like once the board has been slid.
 *
 * Like `rocker-blanks.spec.ts`, this runs signed out with no database: `playwright.config.ts` sets
 * `SHAPER_BLANKS_SOURCE=seed-csv` for its own dev server, so ROCKER's list reads the committed
 * catalogue CSVs. No blank name is ever typed here — the expected name is read off ROCKER's card
 * before it's picked.
 *
 * The Summary's design lives in memory and resets on a full page load, so the picked blank has to
 * reach the Summary by the app's own SUMMARY link, never a fresh `page.goto`.
 *
 * The helpers below are copied from `rocker-blanks.spec.ts` rather than imported: each spec in this
 * repo carries its own.
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

/** The slider sitting under a label — ROCKER's Placement slider shares a parent with its
 * `Placement — ...` caption. */
function sliderUnder(page: Page, label: RegExp): Locator {
  return page.getByText(label).locator("xpath=..").getByRole("slider");
}

/** Pick the first blank under FITS THIS BOARD in the PICK A BLANK popup and return its maker. */
async function pickFirstFittingBlank(page: Page): Promise<string> {
  await openBlankPicker(page);
  const card = firstFittingCard(page);
  const vendor = (await card.getAttribute("data-vendor")) ?? "";
  expect(vendor.length).toBeGreaterThan(0);
  await cardButton(card).click();
  await expect(blankPicker(page)).toBeHidden();
  await expect(pickedCard(page)).toBeVisible();
  return vendor;
}

/**
 * The blank as ROCKER names it right now — `vendor name rocker` — read off the BLANK button's name
 * and rocker lines (quick 261016-mkb, D-02), so the order form is proved to agree with ROCKER.
 */
async function rockerBlankName(page: Page, vendor: string): Promise<string> {
  const name = (await pickedCard(page).locator("[data-blank-name]").innerText()).trim();
  const rocker = (await blankRockerLine(page).innerText()).trim();
  expect(name.length).toBeGreaterThan(0);
  expect(rocker.length).toBeGreaterThan(0);
  return `${vendor} ${name} ${rocker}`;
}

/** Walk to SUMMARY by the app's own link — a full page load would reset the design in memory. */
async function goToSummary(page: Page) {
  await goToScreen(page, "SUMMARY");
  await expect(page).toHaveURL(/\/design\/summary$/);
}

/** Every unique `vendor name` in the committed catalogue CSVs — everything the Blank field could
 * ever be asked to print — and the longest blank among them, in inches. Read straight from
 * `db/seed/blanks/*.csv` with the same tested reader the seed uses, so no blank name or length is
 * typed here either. */
function readCatalogue(): { names: string[]; longestBlankIn: number } {
  const dir = join(__dirname, "..", "db", "seed", "blanks");
  const names = new Set<string>();
  let longestBlankIn = 0;
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".csv"))) {
    const [header, ...rows] = parseCsv(readFileSync(join(dir, file), "utf8"));
    const vendorCol = header.indexOf("vendor");
    const nameCol = header.indexOf("blank_name");
    const lengthCol = header.indexOf("length_in");
    expect(vendorCol, `${file} has a vendor column`).toBeGreaterThanOrEqual(0);
    expect(nameCol, `${file} has a blank_name column`).toBeGreaterThanOrEqual(0);
    expect(lengthCol, `${file} has a length_in column`).toBeGreaterThanOrEqual(0);
    for (const row of rows) {
      const vendor = (row[vendorCol] ?? "").trim();
      const name = (row[nameCol] ?? "").trim();
      // Named as the order form names a natural blank — its rocker, `Natural`, after its name
      // (quick 261016-mkb, D-02).
      if (vendor && name) names.add(blankDisplayName({ vendor, name }, undefined, { vendor: true }));
      const length = Number.parseFloat(row[lengthCol] ?? "");
      if (Number.isFinite(length)) longestBlankIn = Math.max(longestBlankIn, length);
    }
  }
  return { names: [...names], longestBlankIn };
}

/** Every placement note the order form can print after a blank's name — ` — centered`, or
 * ` — center {ROCKER's words}` — for the shortest board the app allows on a blank of the given
 * length, in both systems. Walks every stop ROCKER's own Placement slider has, through the app's
 * own helpers, so no placement or unit conversion is worked out here. */
function everyPlacementNote(blankLengthIn: number): string[] {
  const range = placementRange(inchesToMm(blankLengthIn), inchesToMm(BOARD_LENGTH_RANGE_IN.min));
  const notes = new Set<string>();
  for (const system of ["imperial", "metric"] as const) {
    const slider = placementSlider(mm(0), range, system);
    const stops = Math.round((slider.max - slider.min) / slider.step);
    for (let k = 0; k <= stops; k++) {
      const words = formatPlacement(slider.toMm(slider.min + k * slider.step), system);
      notes.add(words === "centered" ? " — centered" : ` — center ${words}`);
    }
  }
  return [...notes];
}

/** The order form's Blank field —the `<label>` holding the `Blank:` caption. */
function blankField(page: Page): Locator {
  return page.getByText("Blank:", { exact: true }).locator("xpath=..");
}

/** What the Blank field prints: its last span, a ruled line holding the value or a single space. */
function blankFieldValue(page: Page): Locator {
  return blankField(page).locator("span").last();
}

test.describe("Summary — the Shaper Use Only box's Blank field", () => {
  test.beforeEach(async ({ page }) => {
    await dismissChrome(page);
  });

  test("with no blank picked, the Blank field is a ruled line for the shop to write in", async ({ page }) => {
    await page.goto("/design/summary");
    await expect(blankField(page)).toHaveCount(1);
    // The empty rule holds one non-breaking space, which `\s` matches.
    await expect(blankFieldValue(page)).toHaveText(/^\s*$/);
  });

  test("a blank picked on ROCKER prints on the order form as vendor, name, Natural, then — centered", async ({ page }) => {
    await openRocker(page);
    const vendor = await pickFirstFittingBlank(page);
    await expect(blankRockerLine(page)).toHaveText("Natural");
    const expected = await rockerBlankName(page, vendor);
    // A freshly picked blank puts the board's centre at the blank's centre, and ROCKER says so.
    await expect(page.getByText("Placement — centered", { exact: true })).toBeVisible();

    await goToSummary(page);
    await expect(blankFieldValue(page)).toHaveText(`${expected} — centered`);
  });

  test("a blank with a custom rocker prints its note where Natural would be, as ROCKER names it (D-02)", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the Customize Rocker popup's own phone layouts are proved in rocker-custom.spec.ts");
    await openRocker(page);
    const vendor = await pickFirstFittingBlank(page);
    const dialog = await openCustomizeRocker(page);
    const thumb = dialog.getByRole("slider", { exact: true, name: "Nose rocker change" });
    await thumb.focus();
    for (let i = 0; i < 8; i++) await page.keyboard.press("ArrowRight");
    await expect(thumb).toHaveAttribute("aria-valuetext", '+1/2"');
    await dialog.getByRole("button", { name: "Use and save as a new blank" }).click();
    await expect(customRockerDialog(page)).toBeHidden();
    await expect(blankRockerLine(page)).toHaveText('+1/2"N');
    const expected = await rockerBlankName(page, vendor);
    expect(expected.endsWith(' +1/2"N')).toBe(true);

    await goToSummary(page);
    await expect(blankFieldValue(page)).toHaveText(`${expected} — centered`);
  });

  for (const system of ["imperial", "metric"] as const) {
    test(`after sliding the board along its blank on ROCKER, the Blank line says where its centre sits, in ROCKER's own words (${system})`, async ({
      page,
    }) => {
      if (system === "metric") {
        await page.addInitScript(() => window.localStorage.setItem("shaper-units", "metric"));
      }
      await openRocker(page);
      const expected = await rockerBlankName(page, await pickFirstFittingBlank(page));

      // One step toward the nose — the slider's left end is the nose. No placement is typed here:
      // the words are read off ROCKER's own label and must reach the Summary unchanged.
      const placement = sliderUnder(page, /^Placement — /);
      await placement.focus();
      await placement.press("ArrowLeft");
      const label = page.getByText(/^Placement — .+ toward nose$/);
      await expect(label).toBeVisible();
      const words = ((await label.textContent()) ?? "").replace(/^Placement — /, "");
      if (system === "imperial") {
        expect(words).toContain('"');
      } else {
        // A changed units key must never quietly turn this into a second Imperial run.
        expect(words).toMatch(/ mm /);
        expect(words).not.toContain('"');
      }

      await goToSummary(page);
      await expect(blankFieldValue(page)).toHaveText(`${expected} — center ${words}`);
    });
  }

  test("every blank in the catalogue prints whole in the Blank field with the widest placement note, on screen and on paper", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "measures the printed sheet; one engine is enough");

    const { names, longestBlankIn } = readCatalogue();
    // Never a vacuous pass: the four catalogues hold over two hundred blanks, and the longest
    // is a long board (the 12'6" blank at the time of writing).
    expect(names.length).toBeGreaterThan(200);
    expect(longestBlankIn).toBeGreaterThan(100);

    // The widest note any blank can carry comes from the shortest board the app allows on the
    // longest blank in the catalogue — the most room to slide — so no real board ever prints a
    // longer one.
    const notes = everyPlacementNote(longestBlankIn);
    expect(notes.length).toBeGreaterThan(1000);
    expect(notes).toContain(" — centered");

    await page.goto("/design/summary");
    const value = blankFieldValue(page);
    await expect(value).toHaveCount(1);
    await page.evaluate(() => document.fonts.ready.then(() => undefined));

    // The names go straight into the field rather than being picked one at a time on ROCKER, on
    // purpose. No single board's ROCKER list offers every blank — the default board lists 141 of
    // the catalogue's blanks and none of the widest — and the question here is only whether the
    // field has room for a name, which doesn't depend on how that blank got picked.
    const measure = () =>
      value.evaluate(
        (span, { all, suffixes }) => {
          // The widest note by its real drawn width — `scrollWidth` never reports less than the
          // box, so it can't rank strings that all fit.
          const range = document.createRange();
          let widestNote = "";
          let widestPx = -1;
          for (const note of suffixes) {
            span.textContent = note;
            range.selectNodeContents(span);
            const px = range.getBoundingClientRect().width;
            if (px > widestPx) {
              widestPx = px;
              widestNote = note;
            }
          }
          const isCutOff = (text: string) => {
            span.textContent = text;
            return span.scrollWidth > span.clientWidth;
          };
          const clipped = all.map((name) => name + widestNote).filter(isCutOff);
          // The check itself must be able to fail: every name run together is far too long.
          const catchesOverflow = isCutOff(all.join(" "));
          span.textContent = "\u00a0";
          return { widestNote, widestPx, clipped, catchesOverflow };
        },
        { all: names, suffixes: notes },
      );

    const onScreen = await measure();
    await page.emulateMedia({ media: "print" });
    const onPaper = await measure();
    await page.emulateMedia({ media: "screen" });

    const report =
      `widest note on screen: "${onScreen.widestNote}" (${onScreen.widestPx.toFixed(1)}px); ` +
      `in print: "${onPaper.widestNote}" (${onPaper.widestPx.toFixed(1)}px); ` +
      `${notes.length} notes, ${names.length} names`;
    console.log(report);
    await testInfo.attach("widest placement note", { body: report, contentType: "text/plain" });

    expect(onScreen.catchesOverflow).toBe(true);
    expect(onPaper.catchesOverflow).toBe(true);
    // A failure names every blank that would print with a "…" instead of its full name and note.
    expect(onScreen.clipped).toEqual([]);
    expect(onPaper.clipped).toEqual([]);
  });

  test("a custom rocker's note in the Blank field: the room it has, measured on screen and on paper (quick 261016-mkb)", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "measures the printed sheet; one engine is enough");
    const { names, longestBlankIn } = readCatalogue();
    const notes = everyPlacementNote(longestBlankIn);
    // Every catalogue name without its `Natural`, so a note can take its place.
    const bases = names.map((n) => n.replace(/ Natural$/, ""));
    expect(bases.every((b, i) => b !== names[i])).toBe(true);
    // The founder's own example, and the widest note the popup can write: two changes on each end,
    // each the widest amount the slider reaches, bending from two-digit inches.
    const inch = (n: number) => inchesToMm(n);
    const founders = formatRockerNote({
      changes: [
        { end: "nose", amount: inch(-1 / 4), fromTip: inch(18) },
        { end: "tail", amount: inch(1 / 8), fromTip: inch(36) },
        { end: "tail", amount: inch(1 / 8), fromTip: inch(18) },
      ],
    });
    expect(founders).toBe(`-1/4"N18" +1/8"T36" +1/8"T18"`);
    const widest = formatRockerNote({
      changes: [
        { end: "nose", amount: inch(-1 - 15 / 16), fromTip: inch(44) },
        { end: "nose", amount: inch(-1 - 15 / 16), fromTip: inch(43) },
        { end: "tail", amount: inch(-1 - 15 / 16), fromTip: inch(44) },
        { end: "tail", amount: inch(-1 - 15 / 16), fromTip: inch(43) },
      ],
    });

    await page.goto("/design/summary");
    const value = blankFieldValue(page);
    await expect(value).toHaveCount(1);
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    const clippedWith = (lines: string[]) =>
      value.evaluate((span, all) => {
        const out = all.filter((text) => {
          span.textContent = text;
          return span.scrollWidth > span.clientWidth;
        });
        span.textContent = " ";
        return out;
      }, lines);

    /** The widest placement note by its real drawn width, as the test above finds it. */
    const widestPlacementNote = () =>
      value.evaluate((span, suffixes) => {
        const range = document.createRange();
        let widestNote = "";
        let widestPx = -1;
        for (const note of suffixes) {
          span.textContent = note;
          range.selectNodeContents(span);
          const px = range.getBoundingClientRect().width;
          if (px > widestPx) {
            widestPx = px;
            widestNote = note;
          }
        }
        span.textContent = " ";
        return widestNote;
      }, notes);

    const centred = (note: string) => bases.map((b) => `${b} ${note} — centered`);
    const results: Record<string, number> = {};
    for (const media of ["screen", "print"] as const) {
      await page.emulateMedia({ media });
      const far = await widestPlacementNote();
      results[`${media}: founder's note, centered`] = (await clippedWith(centred(founders))).length;
      results[`${media}: founder's note, widest placement`] = (
        await clippedWith(bases.map((b) => `${b} ${founders}${far}`))
      ).length;
      results[`${media}: widest note, centered`] = (await clippedWith(centred(widest))).length;
    }
    await page.emulateMedia({ media: "screen" });
    const report = `custom-note lines cut off (of ${bases.length} blanks): ${JSON.stringify(results)}; widest note "${widest}"`;
    console.log(report);
    await testInfo.attach("custom rocker note room", { body: report, contentType: "text/plain" });
    // The founder's own note with the board centred prints whole on every blank, on screen and on paper.
    // A longer note, or the same note once the board is slid along a long-named blank, can run past
    // the line and end in "…" — measured and reported here for the founder's decision (plan 03's
    // SUMMARY), not asserted, because widening or wrapping the shop's line is a sheet layout change.
    expect(results["screen: founder's note, centered"]).toBe(0);
    expect(results["print: founder's note, centered"]).toBe(0);
  });
});
