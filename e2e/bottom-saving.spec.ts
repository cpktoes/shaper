import { expect, test, type Page } from "@playwright/test";
import { BOTTOM_COPY } from "../components/bottom/bottom-copy";
import { BOARD_FILE_COPY } from "../components/setup/board-file-copy";
import { RACK_COPY } from "../components/setup/rack-config";
import { DEFAULT_BOTTOM, pickCut, startingChannels, type BoardBottom, type BottomSectionKey, type BottomWingRule } from "../lib/geometry/bottom";
import { LIVE_DESIGN_RULES, designBottomBoard, designFinPlacement, designSideProfile } from "../lib/geometry/design";
import { buildOutline } from "../lib/geometry/outline";
import { BOARD_PRESETS } from "../lib/geometry/presets";
import { BANNER_DISMISSAL_KEY } from "../lib/models/banner-dismissal";
import { boardFileName, boardFileText, buildBoardFile } from "../lib/models/board-file";
import { parseSnapshot, type DesignSnapshotFields } from "../lib/models/design-snapshot";
import { IN_PROGRESS_KEY } from "../lib/models/rack-order";
import { RACK_STAND_IN_ROUTE, standInRackRows } from "../lib/models/rack-stand-in";
import { TOOLBAR_TIP_DISMISSAL_KEY } from "../lib/models/toolbar-tip";
import { showBottomSection } from "./helpers/bottom";
import { storedOpenBoard } from "./helpers/open-board";
import { freshPracticeRack } from "./helpers/practice-rack";
import { goToScreen } from "./helpers/screens";

/**
 * The bottom rides with the board (Phase 17, plan 17-12, D-24): a board's cuts, its channels and its wing rule are part
 * of what is kept — in the copy this browser keeps of the open board, in a board file, and in every Undo step — and a
 * board saved before BOTTOM existed opens flat with nothing rewritten.
 *
 * What this file can and cannot walk. The suite runs signed out with no database: the practice rack (`/test-rack`)
 * keeps orders, names and locks, never a board's own numbers, and signed out there is no Save. So the board "saved and
 * reopened" here is the one this browser keeps — written by the very writer a save uses (`buildSnapshot`) and read back
 * by the very reader a saved board takes (`parseSnapshot`) — reopened three ways: by a reload, from the Board Rack's
 * unsaved board, and from a board file. The save itself (the server's read-then-write) and a saved rack row turned into
 * a file are held at unit level in `lib/models/design-snapshot.test.ts`, `board-file.test.ts` and `rack-models.test.ts`.
 *
 * No figure is typed: every number the page is held to is read off the page before, and again after.
 */

const SECTION_WORD: Record<BottomSectionKey, string> = { nose: "Nose", center: "Center", tail: "Tail" };
const RULE_MENU = BOTTOM_COPY.wingRuleLabel;
/** How long a board may take to come back after a load: the stock board draws first (e2e/open-board-reload.spec.ts). */
const COMES_BACK_MS = 30_000;

async function dismissStrips(page: Page) {
  await page.addInitScript((key) => window.sessionStorage.setItem(key, "true"), BANNER_DISMISSAL_KEY);
  await page.addInitScript((key) => window.localStorage.setItem(key, "true"), TOOLBAR_TIP_DISMISSAL_KEY);
}

/** Opens a preset from the home page, landing on TEMPLATE. A computer's preset card says `Start Shaping`; a phone's
 * carries the board's litres. */
async function openPreset(page: Page, presetId: string) {
  const preset = BOARD_PRESETS.find((p) => p.id === presetId);
  if (!preset) throw new Error(`no ${presetId} preset`);
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

/** On TEMPLATE: adds one wing with the page's own button (`e2e/bottom-wings.spec.ts`'s steps). */
async function addWing(page: Page) {
  await expect(async () => {
    await page.getByRole("tab", { name: "ADD WINGS" }).click({ timeout: 2_000 });
    await expect(page.getByRole("tab", { name: "ADD WINGS" })).toHaveAttribute("aria-selected", "true", { timeout: 2_000 });
  }).toPass({ timeout: 60_000 });
  await page.getByRole("button", { name: "+ Add a wing" }).filter({ visible: true }).first().click();
  const dialog = page.getByRole("dialog", { name: "Dial in your wing placement" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Got it" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("tab", { name: "WINGS · 1" })).toBeVisible();
}

const echo = (page: Page, section: BottomSectionKey) => page.locator(`[data-bottom-card="${section}"] [data-bottom-cut-echo]`);
const channelsEcho = (page: Page) => page.locator("[data-bottom-channels] [data-bottom-channels-echo]");
const selected = (page: Page, menu: string) => page.getByRole("combobox", { name: menu, exact: true }).locator("[data-slot=select-value]");

/** Picks a name from a section's Cut menu, retried until React owns the menu so a click before hydration is never lost. */
async function pick(page: Page, section: BottomSectionKey, name: string) {
  // On an upright phone only the section picked on the NOSE · CENTER · TAIL row is drawn (17-14): tap it first.
  await showBottomSection(page, section);
  await expect(async () => {
    await page.getByRole("combobox", { name: `${SECTION_WORD[section]} Cut` }).click();
    await page.getByRole("option", { name, exact: true }).click({ timeout: 2_000 });
    await expect(echo(page, section)).toHaveText(name, { timeout: 2_000 });
  }).toPass({ timeout: 60_000 });
}

/** Picks an option from one of BOTTOM's other menus by its spoken name, the same way. */
async function pickFrom(page: Page, menu: string, option: string) {
  // A menu that is not drawn is one of the channels', which are TAIL's: on an upright phone they show only while
  // TAIL is the section picked (17-14).
  if (!(await page.getByRole("combobox", { name: menu, exact: true }).isVisible())) await showBottomSection(page, "tail");
  await expect(async () => {
    await page.getByRole("combobox", { name: menu, exact: true }).click();
    await page.getByRole("option", { name: option, exact: true }).click({ timeout: 2_000 });
    await expect(selected(page, menu)).toHaveText(option, { timeout: 2_000 });
  }).toPass({ timeout: 60_000 });
}

const pickRule = (page: Page, rule: BottomWingRule) => pickFrom(page, RULE_MENU, BOTTOM_COPY.wingRuleOptions[rule]);

/** Everything BOTTOM's panel holds a board to, read off the page: each section's cut, every slider's place, every
 * menu's choice and every tick box — the three sections, the channels inside TAIL and the WINGS row. */
async function panelReading(page: Page) {
  return page.evaluate(() => {
    const squash = (text: string | null | undefined) => (text ?? "").replace(/\s+/g, " ").trim();
    const roots = [...document.querySelectorAll("[data-bottom-wings], [data-bottom-card]")];
    return roots.map((root) => ({
      part: root.getAttribute("data-bottom-card") ?? "wings",
      cut: squash(root.querySelector("[data-bottom-cut-echo]")?.textContent),
      channels: squash(root.querySelector("[data-bottom-channels-echo]")?.textContent),
      sliders: [...root.querySelectorAll<HTMLInputElement>('input[type="range"]')].map(
        (el) => `${el.getAttribute("aria-label")} = ${el.getAttribute("aria-valuenow") ?? el.value}`,
      ),
      menus: [...root.querySelectorAll('[role="combobox"]')].map(
        (el) => `${el.getAttribute("aria-label")} = ${squash(el.querySelector("[data-slot=select-value]")?.textContent)}`,
      ),
      ticks: [...root.querySelectorAll('[role="checkbox"], input[type="checkbox"]')].map(
        (el) => `${el.getAttribute("aria-label") ?? ""} = ${el.getAttribute("aria-checked") ?? String((el as HTMLInputElement).checked)}`,
      ),
    }));
  });
}

/** The bottom in the copy this browser keeps of the open board, or `undefined` when the copy has none. */
async function keptBottom(page: Page): Promise<unknown> {
  const kept = await storedOpenBoard(page);
  return (kept?.snapshot.design as { bottom?: unknown } | undefined)?.bottom;
}

/** A winged Fish on BOTTOM with a Spiral Vee, six channels and Natural. */
async function shapeTheBottom(page: Page) {
  await openPreset(page, "fish");
  await addWing(page);
  await goToScreen(page, "BOTTOM");
  await pick(page, "tail", "Spiral Vee");
  await pickFrom(page, "Channels", "6 channels");
  await pickRule(page, "natural");
}

test.describe("the bottom is kept with the board", () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(300_000);
    await dismissStrips(page);
  });

  test("a Spiral Vee, six channels and Natural on a winged Fish come back exact — after a reload, and from the Board Rack", async ({ page }) => {
    await shapeTheBottom(page);

    // The copy this browser keeps is what a save stores: it carries the cut, the count and the rule.
    await expect
      .poll(async () => {
        const bottom = (await keptBottom(page)) as BoardBottom | undefined;
        return bottom ? [bottom.tail.name, bottom.channels.count, bottom.wingRule] : null;
      })
      .toEqual(["Spiral Vee", 6, "natural"]);
    const before = (await keptBottom(page)) as BoardBottom;
    // The reader a saved board takes reads that bottom whole: nothing is dropped, nothing is rounded.
    const kept = await storedOpenBoard(page);
    expect(parseSnapshot(kept!.snapshot).bottom).toEqual(before);
    const reading = await panelReading(page);
    expect(reading.map((part) => part.part)).toEqual(["wings", "nose", "center", "tail"]);
    expect(reading[3].sliders.length, "the Spiral Vee's rows and the channels'").toBeGreaterThan(8);

    // A reload: the same page, every slider where it was.
    await page.reload();
    await expect(echo(page, "tail")).toHaveText("Spiral Vee", { timeout: COMES_BACK_MS });
    await expect.poll(() => panelReading(page), { timeout: COMES_BACK_MS }).toEqual(reading);
    expect(await keptBottom(page)).toEqual(before);

    // The home page: the Board Rack shows the board in progress, and opening it brings the same bottom back.
    await page.goto("/");
    const caption = page.locator(`[data-rack-caption="${IN_PROGRESS_KEY}"]`);
    await expect(caption).toBeVisible({ timeout: COMES_BACK_MS });
    await expect(caption.getByText(RACK_COPY.unsavedTag)).toBeVisible();
    const open = caption.getByRole("button", { name: RACK_COPY.continueBoard });
    await expect(async () => {
      if (!/\/design\/outline$/.test(page.url())) await open.click({ timeout: 2_000 });
      await expect(page).toHaveURL(/\/design\/outline$/, { timeout: 5_000 });
    }).toPass({ timeout: 90_000 });
    await goToScreen(page, "BOTTOM");
    await expect(echo(page, "tail")).toHaveText("Spiral Vee", { timeout: COMES_BACK_MS });
    await expect.poll(() => panelReading(page), { timeout: COMES_BACK_MS }).toEqual(reading);
    expect(await keptBottom(page)).toEqual(before);
  });

  test("Undo and Redo walk a cut pick, one slider drag, a channel count and a wing rule, one step each", async ({ page }, testInfo) => {
    await openPreset(page, "fish");
    await addWing(page);
    await goToScreen(page, "BOTTOM");
    // The slider is found by its own spoken name on its own input, not by what is drawn: on an upright phone CENTER's
    // sliders are off the screen while TAIL is the section picked (17-14), and the walk reads the Depth all the way.
    const depth = page.locator('input[type="range"][aria-label="Center Depth"]');
    const valueOf = async () => Number((await depth.getAttribute("aria-valuenow")) ?? (await depth.inputValue()));

    // 1. A cut.
    await pick(page, "center", "Deep Single Concave");
    const picked = await valueOf();

    const undo = page.getByRole("button", { name: "Undo", exact: true });
    const redo = page.getByRole("button", { name: "Redo", exact: true });
    const rule = (which: BottomWingRule) => BOTTOM_COPY.wingRuleOptions[which];

    // 2. One drag of its Depth — several moves, one step. A mouse drags the thumb on a computer; on the Android phone
    //    the same slider is run along with three presses of an arrow key (a real thumb drag is
    //    e2e/slider-touch.spec.ts's). The iPhone profile makes ONE press: against this test server its browser takes
    //    longer than the app's half second to redraw BOTTOM after each press (measured: three presses never landed
    //    inside one step there, three tries out of three), so the folding of several moves into one step is walked on
    //    the other two profiles and the iPhone walks the same four steps with a one-move slider edit.
    const severalMoves = testInfo.project.name !== "iphone";
    const towardFarEnd = picked <= (Number(await depth.getAttribute("min")) + Number(await depth.getAttribute("max"))) / 2;
    const oneDrag = async () => {
      if (testInfo.project.name === "desktop") {
        const thumb = depth.locator('xpath=ancestor::*[@data-slot="slider-thumb"]');
        await thumb.scrollIntoViewIfNeeded();
        const track = await depth.locator('xpath=ancestor::*[@data-slot="slider"]').boundingBox();
        const grip = await thumb.boundingBox();
        if (!track || !grip) throw new Error("the Depth slider has no box");
        const y = grip.y + grip.height / 2;
        await page.mouse.move(grip.x + grip.width / 2, y);
        await page.mouse.down();
        await page.mouse.move(track.x + track.width * (towardFarEnd ? 0.9 : 0.1), y, { steps: 4 });
        await page.mouse.up();
      } else {
        await depth.focus();
        for (let i = 0; i < (severalMoves ? 3 : 1); i += 1) await page.keyboard.press(towardFarEnd ? "ArrowRight" : "ArrowLeft");
      }
    };
    // The app folds a drag's moves into one step when each lands within half a second of the one before
    // (`COALESCE_WINDOW_MS`, held in lib/design-history.test.ts) — its rule for every slider, so a shaper who stops
    // mid-drag and goes on gets two steps on purpose. This test server redraws BOTTOM in a sixth to a third of a second
    // per notch (measured), so a run under load can stretch one drag past the half second. A stretched drag is taken
    // back and made again, three tries in all; a drag whose moves never fold fails every one of them.
    let dragged = picked;
    for (let attempt = 1; ; attempt += 1) {
      await oneDrag();
      dragged = await valueOf();
      expect(dragged, "the drag moved the Depth").not.toBe(picked);
      if (severalMoves) {
        expect(Math.abs(dragged - picked), "by more than one notch, so one Undo taking it all back means one step").toBeGreaterThan(
          Number((await depth.getAttribute("step")) ?? 0),
        );
      }
      await undo.click();
      await expect.poll(valueOf).not.toBe(dragged);
      if ((await valueOf()) === picked) break;
      expect(attempt, "one drag is one Undo step (three tries, for a test server under load)").toBeLessThan(3);
      while ((await valueOf()) !== picked) {
        const was = await valueOf();
        await undo.click();
        await expect.poll(valueOf).not.toBe(was);
      }
    }
    await expect(echo(page, "center"), "the Undo took the drag back and left the cut").toHaveText("Deep Single Concave");
    await redo.click();
    await expect.poll(valueOf, { message: "one Redo puts the whole drag back" }).toBe(dragged);

    // 3. A channel count. 4. The wing rule.
    await pickFrom(page, "Channels", "6 channels");
    await pickRule(page, "natural");

    await undo.click();
    await expect(selected(page, RULE_MENU)).toHaveText(rule("narrowest"));
    await expect(selected(page, "Channels")).toHaveText("6 channels");
    await undo.click();
    await expect(selected(page, "Channels")).toHaveText("None");
    expect(await valueOf()).toBe(dragged);
    await undo.click();
    await expect.poll(valueOf, { message: "one Undo takes the whole drag back" }).toBe(picked);
    await expect(echo(page, "center")).toHaveText("Deep Single Concave");
    await undo.click();
    await expect(echo(page, "center")).toHaveText("Flat Center");

    await redo.click();
    await expect(echo(page, "center")).toHaveText("Deep Single Concave");
    expect(await valueOf()).toBe(picked);
    await redo.click();
    await expect.poll(valueOf, { message: "one Redo puts the whole drag back" }).toBe(dragged);
    await expect(selected(page, "Channels")).toHaveText("None");
    await redo.click();
    await expect(selected(page, "Channels")).toHaveText("6 channels");
    await expect(selected(page, RULE_MENU)).toHaveText(rule("narrowest"));
    await redo.click();
    await expect(selected(page, RULE_MENU)).toHaveText(rule("natural"));

    // What the browser keeps after the walk is the board on the page.
    await expect
      .poll(async () => {
        const bottom = (await keptBottom(page)) as BoardBottom | undefined;
        return bottom ? [bottom.center.name, bottom.channels.count, bottom.wingRule] : null;
      })
      .toEqual(["Deep Single Concave", 6, "natural"]);
  });

  test("a board file carries the bottom: a friend's Fish with cuts and channels opens with every one of them", async ({ page }) => {
    // The file a shaper would send: the practice Fish with a Deep Single Concave, a Spiral Vee and six channels, written
    // by the app's own file writer. (Signed out there is no saved board with a bottom to press Save board as file… on.)
    const fish = parseSnapshot(standInRackRows(4)[1].snapshot);
    const board = designBottomBoard(
      fish.outline,
      buildOutline(fish.outline),
      designSideProfile(fish, LIVE_DESIGN_RULES),
      designFinPlacement(fish),
    );
    const cuts = pickCut(pickCut(DEFAULT_BOTTOM, "center", "Deep Single Concave", board), "tail", "Spiral Vee", board);
    const bottom: BoardBottom = { ...cuts, channels: startingChannels(6, board, cuts.channels) };
    const fields: DesignSnapshotFields = { ...fish, bottom };
    const name = "Friend's Fish";
    const text = boardFileText(buildBoardFile(name, fields, new Date()));
    const inFile = JSON.parse(text).board.design.design;
    expect(inFile.bottom).toEqual(JSON.parse(JSON.stringify(bottom)));

    await freshPracticeRack(page);
    await page.goto("/");
    const [chooser] = await Promise.all([
      page.waitForEvent("filechooser"),
      page.getByRole("button", { name: BOARD_FILE_COPY.button }).click(),
    ]);
    await chooser.setFiles({ name: boardFileName(name), mimeType: "application/json", buffer: Buffer.from(text, "utf8") });
    await expect(page).toHaveURL(/\/design\/outline$/);
    // The board that opened is the file's, number for number — its bottom with it.
    await expect.poll(async () => (await storedOpenBoard(page))?.snapshot.design, { timeout: COMES_BACK_MS }).toEqual(inFile);

    await goToScreen(page, "BOTTOM");
    await expect(echo(page, "nose")).toHaveText("Flat Entry");
    await expect(echo(page, "center")).toHaveText("Deep Single Concave");
    await expect(echo(page, "tail")).toHaveText("Spiral Vee");
    // On an upright phone the channels are TAIL's, drawn only while TAIL is the section picked (17-14).
    await showBottomSection(page, "tail");
    await expect(selected(page, "Channels")).toHaveText("6 channels");
    await expect(channelsEcho(page)).toHaveText(/^6, /);
    // The Fish in the file has no wing, so there is no WINGS row to show.
    await expect(page.locator("[data-bottom-wings]")).toHaveCount(0);
    await page.getByRole("tab", { name: "DATA", exact: true }).click();
    await expect(page.locator("[data-bottom-litres]")).not.toHaveText(/^Foam off 0\.00 L/);
  });

  test("a board saved before BOTTOM opens flat, and nothing is added to it", async ({ page }) => {
    // The practice rack's boards are stored the way every board was before this: no bottom in them.
    const [saved] = standInRackRows(2);
    expect("bottom" in (saved.snapshot as { design: object }).design).toBe(false);
    await freshPracticeRack(page);
    await page.goto(`${RACK_STAND_IN_ROUTE}?boards=2`);
    await expect(page.locator("[data-rack-board]")).toHaveCount(2);
    const open = page.getByRole("group", { name: RACK_COPY.captionGroup(saved.name) }).getByRole("button", { name: RACK_COPY.open });
    await expect(async () => {
      if (!/\/design\/outline$/.test(page.url())) await open.click({ timeout: 2_000 });
      await expect(page).toHaveURL(/\/design\/outline$/, { timeout: 5_000 });
    }).toPass({ timeout: 90_000 });
    await goToScreen(page, "BOTTOM");
    await expect(echo(page, "nose")).toHaveText("Flat Entry");
    await expect(echo(page, "center")).toHaveText("Flat Center");
    await expect(echo(page, "tail")).toHaveText("Flat Exit");
    // On an upright phone the channels are TAIL's, drawn only while TAIL is the section picked (17-14).
    await showBottomSection(page, "tail");
    await expect(selected(page, "Channels")).toHaveText("None");
    await page.getByRole("tab", { name: "DATA", exact: true }).click();
    await expect(page.locator("[data-bottom-litres]")).toHaveText(/^Foam off 0\.00 L · /);

    // The copy this browser keeps of it — what a save would store — still has no bottom in it.
    await expect.poll(() => storedOpenBoard(page), { timeout: COMES_BACK_MS }).not.toBeNull();
    const kept = await storedOpenBoard(page);
    expect("bottom" in kept!.snapshot.design).toBe(false);
    expect(kept!.dirty).toBe(false);
  });
});
