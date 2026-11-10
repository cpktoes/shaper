import { expect, test, type Page } from "@playwright/test";
import { BOTTOM_COPY, wingWords } from "../components/bottom/bottom-copy";
import { presetDesignFields } from "../lib/blanks/preset-blanks";
import { BANNER_DISMISSAL_KEY } from "../lib/models/banner-dismissal";
import { TOOLBAR_TIP_DISMISSAL_KEY } from "../lib/models/toolbar-tip";
import { BOARD_PRESETS } from "../lib/geometry/presets";
import {
  DEFAULT_BOTTOM,
  bottomDataRows,
  bottomLayoutMarks,
  pickCut,
  resolveBottom,
  type BottomSectionKey,
  type BottomWingRule,
} from "../lib/geometry/bottom";
import { designBottomBoard, designFinPlacement, designSideProfile, LIVE_DESIGN_RULES } from "../lib/geometry/design";
import { formatDimBare, formatLength, formatMarkBare } from "../lib/geometry/measure-display";
import { buildOutline } from "../lib/geometry/outline";
import type { UnitsSystem } from "../lib/geometry/units";
import { resolveWingStations, wingFinEdges } from "../lib/geometry/wing-lock";
import { nextWing, outlineWithoutWings, placedWings } from "../lib/geometry/wings";
import { showBottomSection } from "./helpers/bottom";
import { forgetOpenBoardOnEveryLoad } from "./helpers/open-board";
import { goToScreen } from "./helpers/screens";

/**
 * BOTTOM's WINGS row (Phase 17, plan 17-12, D-19): on a board with a wing, the page asks where every cut's Off Rail is
 * measured from — the narrowest outline (the real rail behind the wing, carried forward past it) to start, or the curve
 * drawn before the wing. A board with no wing never sees the row.
 *
 * No figure is typed. The wing is the one "+ Add a wing" places (TEMPLATE's own rule: at the front fins' trailing edge),
 * and every number the page is held to — the wing's depth and place, the marks in DATA under each rule — is worked out
 * here from the app's own maths on the same board, then read off the page.
 */

const SECTION_WORD: Record<BottomSectionKey, string> = { nose: "Nose", center: "Center", tail: "Tail" };
const RULE_MENU = BOTTOM_COPY.wingRuleLabel;
const TAIL_CUT = "Extending Single Concave";

async function dismissStrips(page: Page) {
  await page.addInitScript((key) => window.sessionStorage.setItem(key, "true"), BANNER_DISMISSAL_KEY);
  await page.addInitScript((key) => window.localStorage.setItem(key, "true"), TOOLBAR_TIP_DISMISSAL_KEY);
}

function presetOf(presetId: string) {
  const preset = BOARD_PRESETS.find((p) => p.id === presetId);
  if (!preset) throw new Error(`no ${presetId} preset`);
  return preset;
}

/** Opens a preset from the home page, landing on TEMPLATE. A computer's preset card says `Start Shaping`; a phone's
 * carries the board's litres. */
async function openPreset(page: Page, presetId: string) {
  const preset = presetOf(presetId);
  await page.goto("/");
  const card = page
    .getByRole("button")
    .filter({ hasText: preset.name })
    .filter({ hasText: /Start Shaping|\d\.\d L/ })
    .first();
  await expect(async () => {
    // Tap only while the card is still on the page: under load the screen can change before the address does.
    if (!/\/design\/outline$/.test(page.url()) && (await card.count()) > 0) {
      await card.scrollIntoViewIfNeeded({ timeout: 2_000 });
      await card.click({ timeout: 2_000 });
    }
    await expect(page).toHaveURL(/\/design\/outline$/, { timeout: 5_000 });
  }).toPass({ timeout: 90_000 });
}

/** On TEMPLATE: opens the ADD WINGS tab and adds a wing with the page's own button, `count` times. The first wing asks
 * the shaper to dial it in against FINS; `Got it` closes that. Retried until React owns the tab strip. */
async function addWings(page: Page, count: number) {
  await expect(async () => {
    await page.getByRole("tab", { name: "ADD WINGS" }).click({ timeout: 2_000 });
    await expect(page.getByRole("tab", { name: "ADD WINGS" })).toHaveAttribute("aria-selected", "true", { timeout: 2_000 });
  }).toPass({ timeout: 60_000 });
  const add = page.getByRole("button", { name: "+ Add a wing" }).filter({ visible: true }).first();
  await add.click();
  const dialog = page.getByRole("dialog", { name: "Dial in your wing placement" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Got it" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("tab", { name: "WINGS · 1" })).toBeVisible();
  for (let n = 2; n <= count; n += 1) {
    await page.getByRole("button", { name: `+ Add wing ${n}` }).filter({ visible: true }).first().click();
    await expect(page.getByRole("tab", { name: `WINGS · ${n}` })).toBeVisible();
  }
}

/** Picks a name from a section's Cut menu, retried until React owns the menu so a click before hydration is never lost. */
async function pick(page: Page, section: BottomSectionKey, name: string) {
  // On an upright phone only the section picked on the NOSE · CENTER · TAIL row is drawn (17-14): tap it first.
  await showBottomSection(page, section);
  const echo = page.locator(`[data-bottom-card="${section}"] [data-bottom-cut-echo]`);
  await expect(async () => {
    await page.getByRole("combobox", { name: `${SECTION_WORD[section]} Cut` }).click();
    await page.getByRole("option", { name, exact: true }).click({ timeout: 2_000 });
    await expect(echo).toHaveText(name, { timeout: 2_000 });
  }).toPass({ timeout: 60_000 });
}

/** Picks a rule from the WINGS menu, the same way. */
async function pickRule(page: Page, rule: BottomWingRule) {
  const menu = page.getByRole("combobox", { name: RULE_MENU });
  await expect(async () => {
    await menu.click();
    await page.getByRole("option", { name: BOTTOM_COPY.wingRuleOptions[rule], exact: true }).click({ timeout: 2_000 });
    await expect(menu).toContainText(BOTTOM_COPY.wingRuleOptions[rule], { timeout: 2_000 });
  }).toPass({ timeout: 60_000 });
}

/** A preset with the wings "+ Add a wing" places on it, built from the app's own maths: the first at the front fins'
 * trailing edge, each next one where TEMPLATE's rule stands it. */
function wingedPreset(presetId: string, count: number) {
  const fields = presetDesignFields(presetOf(presetId));
  let outline = fields.outline;
  for (let n = 0; n < count; n += 1) {
    const edges = wingFinEdges(designFinPlacement({ outline, fins: fields.fins, finsImportTemplate: true }).marks);
    const wing = nextWing(outline.wings ?? [], edges, buildOutline(outlineWithoutWings(outline)), "imperial");
    outline = resolveWingStations({ ...outline, wings: [...(outline.wings ?? []), wing] }, fields.fins, true).outline;
  }
  const geometry = buildOutline(outline);
  const placement = designFinPlacement({ outline, fins: fields.fins, finsImportTemplate: true });
  const board = designBottomBoard(outline, geometry, designSideProfile({ ...fields, outline }, LIVE_DESIGN_RULES), placement);
  return { outline, geometry, board, wings: placedWings(outline.wings ?? [], geometry) };
}

const squash = (text: string) => text.replace(/\s+/g, " ").trim();

/** One column of DATA's layout marks as the maths has it: each row's station and its mark, worded the page's way. */
function mathsColumn(presetId: string, rule: BottomWingRule, system: UnitsSystem): { station: string; mark: string }[] {
  const { board } = wingedPreset(presetId, 1);
  const resolved = resolveBottom({ ...pickCut(DEFAULT_BOTTOM, "tail", TAIL_CUT, board), wingRule: rule }, board);
  const marks = bottomLayoutMarks(resolved, board);
  const rows = bottomDataRows(resolved, board);
  const at = marks.columns.findIndex((column) => column.key === "tail:edge");
  if (at < 0) throw new Error("no Tail edge column");
  return marks.rows.map((row, r) => ({
    station: squash(
      rows[r].label === "tail" ? BOTTOM_COPY.rowTail : rows[r].label === "nose" ? BOTTOM_COPY.rowNoseTip : formatDimBare(row.station, system),
    ),
    mark: squash(row.cells[at] === null ? BOTTOM_COPY.emptyCell : formatMarkBare(row.cells[at]!, system)),
  }));
}

/** The same column as the page draws it. */
async function pageColumn(page: Page): Promise<{ station: string; mark: string }[]> {
  const table = page.locator("[data-bottom-marks]");
  await expect(table.locator('th[data-bottom-mark-column="tail:edge"]')).toBeVisible();
  const read = await table.evaluate((el) => {
    const heads = [...el.querySelectorAll("thead th")];
    const at = heads.findIndex((th) => th.getAttribute("data-bottom-mark-column") === "tail:edge");
    return [...el.querySelectorAll("tbody tr")].map((tr) => ({
      station: tr.children[0]?.textContent ?? "",
      mark: tr.children[at]?.textContent ?? "",
    }));
  });
  return read.map((row) => ({ station: squash(row.station), mark: squash(row.mark) }));
}

test.describe("BOTTOM's WINGS row: where Off Rail is measured from on a winged board", () => {
  test.beforeEach(async ({ page }) => {
    await dismissStrips(page);
    await forgetOpenBoardOnEveryLoad(page);
  });

  test("a winged Fish: the row opens on Narrowest with its note, and Natural moves the Tail edge's marks behind the wing", async ({ page }, testInfo) => {
    test.setTimeout(240_000);
    await openPreset(page, "fish");
    await addWings(page, 1);
    await goToScreen(page, "BOTTOM");

    // The row: its heading, the wing it found, the menu on Narrowest, and what Narrowest means.
    const row = page.locator("[data-bottom-wings]");
    await expect(row).toBeVisible();
    await expect(row.getByText(BOTTOM_COPY.wingsHeading, { exact: true })).toBeVisible();
    const { wings, outline } = wingedPreset("fish", 1);
    expect(wings).toHaveLength(1);
    const words = wingWords(wings, "imperial");
    await expect(row.locator("[data-bottom-wings-echo]")).toHaveText(BOTTOM_COPY.wingsEcho(words));
    const menu = page.getByRole("combobox", { name: RULE_MENU });
    await expect(menu).toContainText(BOTTOM_COPY.wingRuleOptions.narrowest);
    const note = row.locator("[data-bottom-wing-note]");
    await expect(note).toHaveText(BOTTOM_COPY.wingRuleNotes.narrowest);
    // The row stands between INPUTS and the three section cards.
    // On an upright phone one section's controls are drawn at a time (17-14): NOSE is asked for.
    await showBottomSection(page, "nose");
    const rowTop = (await row.boundingBox())!.y;
    const noseTop = (await page.locator('[data-bottom-card="nose"]').boundingBox())!.y;
    expect(rowTop, "WINGS above NOSE").toBeLessThan(noseTop);

    // On a computer the top view's caption names the wing too (an upright phone has no caption row).
    if (testInfo.project.name === "desktop") {
      await expect(page.locator("[data-bottom-top-view-note]")).toHaveText(
        BOTTOM_COPY.topViewNoseLeft(formatLength(outline.length, "imperial"), words),
      );
    }

    // A single concave through the tail, and its edge's marks in DATA: the maths' own column under Narrowest.
    await pick(page, "tail", TAIL_CUT);
    await page.getByRole("tab", { name: "DATA", exact: true }).click();
    const narrowest = mathsColumn("fish", "narrowest", "imperial");
    await expect.poll(() => pageColumn(page), { message: "Tail edge, Narrowest" }).toEqual(narrowest);

    // Natural: the note changes, and so does every mark on the edge — it is measured from a wider line.
    await pickRule(page, "natural");
    await expect(note).toHaveText(BOTTOM_COPY.wingRuleNotes.natural);
    const natural = mathsColumn("fish", "natural", "imperial");
    await expect.poll(() => pageColumn(page), { message: "Tail edge, Natural" }).toEqual(natural);

    // Behind the wing (a station nearer the tail than the wing itself) the mark is not the one Narrowest gave.
    const stations = bottomLayoutMarks(resolveBottom(DEFAULT_BOTTOM, wingedPreset("fish", 1).board), wingedPreset("fish", 1).board).rows.map((r) => r.station);
    const behind = stations.findIndex((station, i) => station > 0 && station < wings[0].station && natural[i].mark !== BOTTOM_COPY.emptyCell);
    expect(behind, "a marked station behind the wing").toBeGreaterThan(0);
    expect(natural[behind].mark).not.toBe(narrowest[behind].mark);
    console.info(
      `Fish, ${BOTTOM_COPY.wingsEcho(words)}: Tail edge at ${natural[behind].station} reads ${narrowest[behind].mark} on Narrowest, ${natural[behind].mark} on Natural`,
    );

    // And back: the choice is the shaper's to change either way.
    await pickRule(page, "narrowest");
    await expect(note).toHaveText(BOTTOM_COPY.wingRuleNotes.narrowest);
    await expect.poll(() => pageColumn(page), { message: "Tail edge, Narrowest again" }).toEqual(narrowest);
  });

  test("a board with no wing: no WINGS row, and the caption reads as it always has", async ({ page }, testInfo) => {
    test.setTimeout(180_000);
    await openPreset(page, "shortboard");
    await goToScreen(page, "BOTTOM");
    // On an upright phone one section's controls are drawn at a time (17-14): NOSE is asked for.
    await showBottomSection(page, "nose");
    await expect(page.locator('[data-bottom-card="nose"]')).toBeVisible();
    await expect(page.locator("[data-bottom-wings]")).toHaveCount(0);
    await expect(page.getByText(BOTTOM_COPY.wingsHeading, { exact: true })).toHaveCount(0);
    await expect(page.getByRole("combobox", { name: RULE_MENU })).toHaveCount(0);
    if (testInfo.project.name === "desktop") {
      const length = formatLength(presetDesignFields(presetOf("shortboard")).outline.length, "imperial");
      await expect(page.locator("[data-bottom-top-view-note]")).toHaveText(BOTTOM_COPY.topViewNoseLeft(length));
    }
  });

  test("two wings are named by where they stand, and a Metric shaper reads millimetres and centimetres", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the words are the same on a phone; one walk is enough");
    test.setTimeout(240_000);
    // The chooser's own saved pick, set before the page loads — the way a returning Metric shaper arrives.
    await page.addInitScript(() => window.localStorage.setItem("shaper-units", "metric"));
    await openPreset(page, "fish");
    await addWings(page, 1);
    await goToScreen(page, "BOTTOM");
    const one = wingedPreset("fish", 1);
    const echo = page.locator("[data-bottom-wings-echo]");
    await expect(echo).toHaveText(BOTTOM_COPY.wingsEcho(wingWords(one.wings, "metric")));
    await expect(echo).toHaveText(/^\d+\smm wing at \d+\.\d\scm$/);
    await expect(page.locator("[data-bottom-top-view-note]")).toHaveText(
      BOTTOM_COPY.topViewNoseLeft(formatLength(one.outline.length, "metric"), wingWords(one.wings, "metric")),
    );

    // A second wing: the heading names both by their stations, the caption too.
    await goToScreen(page, "TEMPLATE");
    await page.getByRole("tab", { name: "WINGS · 1" }).click();
    await page.getByRole("button", { name: "+ Add wing 2" }).filter({ visible: true }).first().click();
    await expect(page.getByRole("tab", { name: "WINGS · 2" })).toBeVisible();
    await goToScreen(page, "BOTTOM");
    const two = wingedPreset("fish", 2);
    expect(two.wings).toHaveLength(2);
    await expect(echo).toHaveText(BOTTOM_COPY.wingsEcho(wingWords(two.wings, "metric")));
    await expect(echo).toHaveText(/^wings at \d+\.\d\scm and \d+\.\d\scm$/);
    await expect(page.locator("[data-bottom-top-view-note]")).toHaveText(
      BOTTOM_COPY.topViewNoseLeft(formatLength(two.outline.length, "metric"), wingWords(two.wings, "metric")),
    );
  });
});
