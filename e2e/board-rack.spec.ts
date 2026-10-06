import { expect, test, type Page } from "@playwright/test";
import { RACK_COPY, rackHeadingLine } from "../components/setup/rack-config";
import { HOVER_MULTI_ROW_HEIGHT, HOVER_ROW_BAND, HOVER_ROW_TOP_ROOM, HOVER_SLOT } from "../lib/geometry/rack-layout";
import { BANNER_DISMISSAL_KEY } from "../lib/models/banner-dismissal";
import { IN_PROGRESS_KEY } from "../lib/models/rack-order";
import { RACK_STAND_IN_ROUTE, standInRackRows } from "../lib/models/rack-stand-in";
import { TOOLBAR_TIP_DISMISSAL_KEY } from "../lib/models/toolbar-tip";
import { openAppSettings } from "./helpers/settings";

/**
 * The Board Rack on a computer (Phase 15, 15-06 — the phase's tracer): the shaper's boards standing
 * on their tails at one scale, the board under the cursor turning, the rested board's caption with
 * Open This Board, and a click opening the board exactly as the old cards did. Saved boards only
 * exist on the practice rack (`/test-rack`, 15-05) because this suite runs signed out with no
 * database; the real `/` only ever shows the unsaved board.
 *
 * The frame loop writes each board's current angle, in whole degrees, onto its drawing as
 * `data-turn`, so these checks read the turn the shaper sees rather than any internal state.
 */

/** The practice rack's boards, in the automatic order the rack shows them (newest first). */
const STAND_INS = standInRackRows(15);
/** Board `n` (1-based) on the practice rack. */
const board = (n: number) => STAND_INS[n - 1];

async function dismissBannerAndTip(page: Page) {
  await page.addInitScript(
    ([bannerKey, tipKey]) => {
      window.sessionStorage.setItem(bannerKey, "true");
      window.localStorage.setItem(tipKey, "true");
    },
    [BANNER_DISMISSAL_KEY, TOOLBAR_TIP_DISMISSAL_KEY] as const,
  );
}

const boardButton = (page: Page, key: string) => page.locator(`[data-rack-board="${key}"]`);
const boardArt = (page: Page, key: string) => page.locator(`[data-rack-art="${key}"]`);
const captionFor = (page: Page, name: string) => page.getByRole("group", { name: RACK_COPY.captionGroup(name) });

/** Opens a rack page and waits until the rack has drawn every board. */
async function openRack(page: Page, path: string, count: number) {
  await page.goto(path);
  await expect(page.locator("[data-rack-board]")).toHaveCount(count);
  await expect(page.locator("[data-rack-art][data-turn]")).toHaveCount(count);
}

/** The centre of a board's button, where the cursor goes to point at it. */
async function centreOf(page: Page, key: string) {
  const box = await boardButton(page, key).boundingBox();
  if (!box) throw new Error(`no box for board ${key}`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** Points at a board, then rests long enough for it to finish turning. */
async function restOn(page: Page, key: string) {
  const { x, y } = await centreOf(page, key);
  await page.mouse.move(x, y, { steps: 8 });
  await expect(boardArt(page, key)).toHaveAttribute("data-turn", "90");
}

/** Every board button's top edge, rounded: one value per row. */
async function boardTops(page: Page) {
  return page
    .locator("[data-rack-board]")
    .evaluateAll((buttons) => buttons.map((button) => Math.round(button.getBoundingClientRect().top)));
}

/** Several boards' turns, read together two frames after the last cursor move — well inside the
 * 180 ms the cursor has to rest before the nearest board finishes turning. */
async function readTurnsNextFrame(page: Page, keys: string[]) {
  return page.evaluate(
    (wanted) =>
      new Promise<number[]>((resolve) =>
        requestAnimationFrame(() =>
          requestAnimationFrame(() =>
            resolve(
              wanted.map((key) => Number(document.querySelector(`[data-rack-art="${key}"]`)?.getAttribute("data-turn"))),
            ),
          ),
        ),
      ),
    keys,
  );
}

/** How many points a board's drawn outline has. */
async function vertexCount(page: Page, key: string) {
  const d = (await boardArt(page, key).locator("path").first().getAttribute("d")) ?? "";
  return (d.match(/[ML]/g) ?? []).length;
}

/** Waits until no board is part-way through a turn (every drawing reads 0 or 90 degrees). */
async function waitForTurnsToFinish(page: Page) {
  await expect
    .poll(async () =>
      page
        .locator("[data-rack-art]")
        .evaluateAll((groups) => groups.filter((group) => !["0", "90"].includes(group.getAttribute("data-turn") ?? "")).length),
    )
    .toBe(0);
}

/**
 * Two frames after the last cursor move: every place a board's vertical words (any still visible,
 * opacity above 0.05) cross ANOTHER board's drawn body — each words' box against each body's box,
 * crossing when they share more than half a dot both across and up — and every board's turn at that
 * same moment, so a check can prove it measured the state it meant to. Each crossing names the two
 * boards and how far they cross, so a failure says exactly what touched what.
 */
async function wordsAcrossBoards(page: Page) {
  return page.evaluate(
    () =>
      new Promise<{ crossings: string[]; turns: Record<string, number> }>((resolve) =>
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            const drawings = Array.from(document.querySelectorAll<SVGGElement>("[data-rack-art]"));
            const bodies = drawings.map((group) => ({
              key: group.getAttribute("data-rack-art") ?? "",
              box: group.querySelector("path")?.getBoundingClientRect() ?? null,
            }));
            const crossings: string[] = [];
            const turns: Record<string, number> = {};
            for (const group of drawings) {
              const key = group.getAttribute("data-rack-art") ?? "";
              turns[key] = Number(group.getAttribute("data-turn"));
              const words = group.querySelector("text");
              if (!words || Number(getComputedStyle(words).opacity) <= 0.05) continue;
              const box = words.getBoundingClientRect();
              for (const body of bodies) {
                if (body.key === key || !body.box) continue;
                const across = Math.min(box.right, body.box.right) - Math.max(box.left, body.box.left);
                const up = Math.min(box.bottom, body.box.bottom) - Math.max(box.top, body.box.top);
                if (across > 0.5 && up > 0.5) {
                  crossings.push(`${key}'s words cross ${body.key}'s board by ${across.toFixed(1)} dots across, ${up.toFixed(1)} up`);
                }
              }
            }
            resolve({ crossings, turns });
          }),
        ),
      ),
  );
}

test.describe("the Board Rack on a computer", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the hover rack's own pointer checks are desktop-only");
    await dismissBannerAndTip(page);
  });

  test("1. the practice rack shows the heading, its line, fifteen boards and the first one turned with its caption", async ({
    page,
  }) => {
    await openRack(page, RACK_STAND_IN_ROUTE, 15);
    await expect(page.getByRole("heading", { name: RACK_COPY.heading })).toBeVisible();
    await expect(page.getByText(rackHeadingLine(15, "hover"), { exact: true })).toBeVisible();
    await expect(page.locator('[data-rack-kind="hover"]')).toHaveCount(1);

    await expect(boardArt(page, board(1).id)).toHaveAttribute("data-turn", "90");
    for (let n = 2; n <= 15; n++) await expect(boardArt(page, board(n).id)).toHaveAttribute("data-turn", "0");

    const caption = captionFor(page, board(1).name);
    await expect(caption).toBeVisible();
    await expect(caption.getByRole("button", { name: RACK_COPY.open })).toBeVisible();
  });

  test("2. resting the cursor on board 6 turns it, closes board 1 and moves the caption under it", async ({ page }) => {
    await openRack(page, RACK_STAND_IN_ROUTE, 15);
    const { x, y } = await centreOf(page, board(6).id);
    await page.mouse.move(x, y, { steps: 8 });
    await page.waitForTimeout(600);
    await expect(boardArt(page, board(6).id)).toHaveAttribute("data-turn", "90");
    await expect(boardArt(page, board(1).id)).toHaveAttribute("data-turn", "0");
    await expect(captionFor(page, board(6).name)).toBeVisible();
  });

  test("3. with the cursor between boards 3 and 4, both are part-turned", async ({ page }) => {
    await openRack(page, RACK_STAND_IN_ROUTE, 15);
    const a = await centreOf(page, board(3).id);
    const b = await centreOf(page, board(4).id);
    await page.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2, { steps: 4 });
    const turns = await readTurnsNextFrame(page, [board(3).id, board(4).id]);
    for (const turn of turns) {
      expect(turn).toBeGreaterThan(0);
      expect(turn).toBeLessThan(90);
    }
  });

  test("4. a turned board draws its whole outline and a resting board its side profile", async ({ page }) => {
    await openRack(page, RACK_STAND_IN_ROUTE, 15);
    expect(await vertexCount(page, board(1).id)).toBeGreaterThanOrEqual(300);
    expect(await vertexCount(page, board(2).id)).toBeLessThanOrEqual(140);
  });

  test("5. Open This Board opens the board, and coming back finds it turned and marked as the open one", async ({
    page,
  }) => {
    await openRack(page, RACK_STAND_IN_ROUTE, 15);
    await restOn(page, board(6).id);
    await captionFor(page, board(6).name).getByRole("button", { name: RACK_COPY.open }).click();
    await page.waitForURL("**/design/outline");

    await page.goBack();
    await page.waitForURL((url) => url.pathname === RACK_STAND_IN_ROUTE);
    await expect(page.locator("[data-rack-board]")).toHaveCount(15);
    await expect(boardArt(page, board(6).id)).toHaveAttribute("data-turn", "90");
    await expect(boardButton(page, board(6).id)).toHaveAttribute("aria-current", "true");
    await expect(boardArt(page, board(1).id)).toHaveAttribute("data-turn", "0");
  });

  test("6. the unsaved board alone: one turned board, its own caption, the singular line — and one saved board alone", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("[data-rack-board]")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: RACK_COPY.heading })).toHaveCount(0);
    await page.getByRole("button").filter({ hasText: "Start Shaping" }).first().click();
    await page.waitForURL("**/design/outline");
    await page.goBack();
    await page.waitForURL((url) => url.pathname === "/");

    await expect(page.locator("[data-rack-board]")).toHaveCount(1);
    await expect(boardArt(page, IN_PROGRESS_KEY)).toHaveAttribute("data-turn", "90");
    const caption = page.locator(`[data-rack-caption="${IN_PROGRESS_KEY}"]`);
    await expect(caption).toBeVisible();
    await expect(caption.getByText(RACK_COPY.unsavedTag)).toBeVisible();
    await expect(caption.getByRole("button", { name: RACK_COPY.continueBoard })).toBeVisible();
    await expect(page.getByRole("button", { name: /Board actions/ })).toHaveCount(0);
    await expect(page.getByText(rackHeadingLine(1, "hover"), { exact: true })).toBeVisible();

    await openRack(page, `${RACK_STAND_IN_ROUTE}?boards=1`, 1);
    await expect(boardArt(page, board(1).id)).toHaveAttribute("data-turn", "90");
    await expect(captionFor(page, board(1).name).getByRole("button", { name: RACK_COPY.open })).toBeVisible();
  });
});

test.describe("the Board Rack on a computer — rows, holding still, and touch-screen laptops", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the hover rack's own pointer checks are desktop-only");
    await dismissBannerAndTip(page);
  });

  test("7. thirty boards stand in two balanced rows of fifteen at one height, and resting on row 2 hands it the turn", async ({
    page,
  }) => {
    const rows = standInRackRows(30);
    await openRack(page, `${RACK_STAND_IN_ROUTE}?boards=30`, 30);
    const byTop = new Map<number, number>();
    for (const top of await boardTops(page)) byTop.set(top, (byTop.get(top) ?? 0) + 1);
    expect([...byTop.values()]).toEqual([15, 15]);

    const rackBox = await page.locator('[data-rack-kind="hover"]').boundingBox();
    if (!rackBox) throw new Error("no box for the rack");
    expect(rackBox.height).toBeCloseTo(2 * (HOVER_ROW_TOP_ROOM + HOVER_MULTI_ROW_HEIGHT + HOVER_ROW_BAND), 0);

    await restOn(page, rows[19].id);
    await expect(boardArt(page, rows[0].id)).toHaveAttribute("data-turn", "0");
    await expect(captionFor(page, rows[19].name)).toBeVisible();
  });

  test("8. below the floor line the rack holds still, so the cursor can reach the caption", async ({ page }) => {
    await openRack(page, RACK_STAND_IN_ROUTE, 15);
    await restOn(page, board(6).id);
    const { x } = await centreOf(page, board(6).id);
    const captionBox = await captionFor(page, board(6).name).boundingBox();
    if (!captionBox) throw new Error("no box for the caption");
    await page.mouse.move(x, captionBox.y + captionBox.height / 2, { steps: 10 });
    await page.waitForTimeout(400);
    await expect(boardArt(page, board(6).id)).toHaveAttribute("data-turn", "90");
    await expect(boardArt(page, board(5).id)).toHaveAttribute("data-turn", "0");
    await expect(boardArt(page, board(7).id)).toHaveAttribute("data-turn", "0");
  });

  test("9. in a narrow 600-dot window a mouse still gets the hover rack, in two rows", async ({ page }) => {
    await page.setViewportSize({ width: 600, height: 900 });
    await openRack(page, RACK_STAND_IN_ROUTE, 15);
    await expect(page.locator('[data-rack-kind="hover"]')).toHaveCount(1);
    expect(new Set(await boardTops(page)).size).toBe(2);
  });

  test("11. a finger on a touch-screen laptop: the first tap turns a board, the second opens it", async ({ page }) => {
    await openRack(page, RACK_STAND_IN_ROUTE, 15);
    const button = boardButton(page, board(4).id);
    const tap = async () => {
      await button.dispatchEvent("pointerdown", { pointerType: "touch", isPrimary: true, bubbles: true });
      await button.dispatchEvent("click");
    };
    await tap();
    await expect(boardArt(page, board(4).id)).toHaveAttribute("data-turn", "90");
    await expect(captionFor(page, board(4).name)).toBeVisible();
    expect(new URL(page.url()).pathname).toBe(RACK_STAND_IN_ROUTE);

    await tap();
    await page.waitForURL("**/design/outline");
  });

  test("11a. opening a saved board while a board is in progress asks first, and Keep Editing leaves the unsaved board first", async ({
    page,
  }) => {
    await openRack(page, RACK_STAND_IN_ROUTE, 15);
    await page.getByRole("button").filter({ hasText: "Start Shaping" }).first().click();
    await page.waitForURL("**/design/outline");
    await page.goBack();
    await page.waitForURL((url) => url.pathname === RACK_STAND_IN_ROUTE);
    await expect(page.locator("[data-rack-board]")).toHaveCount(16);
    await expect(page.locator("[data-rack-board]").first()).toHaveAttribute("data-rack-board", IN_PROGRESS_KEY);
    await expect(boardButton(page, IN_PROGRESS_KEY)).toHaveAttribute("aria-current", "true");

    await restOn(page, board(3).id);
    await captionFor(page, board(3).name).getByRole("button", { name: RACK_COPY.open }).click();
    const question = page.getByRole("alertdialog", { name: "Open this board?" });
    await expect(question).toBeVisible();
    await question.getByRole("button", { name: "Keep Editing" }).click();
    await expect(question).toBeHidden();
    expect(new URL(page.url()).pathname).toBe(RACK_STAND_IN_ROUTE);
    await expect(page.locator("[data-rack-board]").first()).toHaveAttribute("data-rack-board", IN_PROGRESS_KEY);
  });

  test("12. no word ever crosses a board: resting, mid-sweep, and on a second row", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openRack(page, RACK_STAND_IN_ROUTE, 15);
    // On arrival only board 1 is turned, and a turned board stands on its own slot's centre with
    // nothing left of it to move it — so every slot's centre is whole slots along from board 1's.
    const first = await centreOf(page, board(1).id);
    const slotCentre = (n: number) => first.x + (n - 1) * HOVER_SLOT;

    const arrival = await wordsAcrossBoards(page);
    expect(arrival.turns[board(1).id]).toBe(90);
    expect.soft(arrival.crossings, "on arrival, board 1 turned").toEqual([]);

    await restOn(page, board(6).id);
    await waitForTurnsToFinish(page);
    const rested = await wordsAcrossBoards(page);
    expect(rested.turns[board(6).id]).toBe(90);
    expect.soft(rested.crossings, "resting on board 6").toEqual([]);

    // Exactly between two slots both boards are half-turned (UI-SPEC §2); a quarter of the way
    // along, 67.5 and 22.5 degrees. Both read before the cursor's rest, within a degree or two of
    // a cursor position the browser may round to a whole dot.
    const near = (turn: number, degrees: number) => Math.abs(turn - degrees) <= 2;
    await page.mouse.move((slotCentre(3) + slotCentre(4)) / 2, first.y, { steps: 4 });
    const between = await wordsAcrossBoards(page);
    expect(near(between.turns[board(3).id], 45) && near(between.turns[board(4).id], 45), JSON.stringify(between.turns)).toBe(true);
    expect.soft(between.crossings, "the cursor midway between boards 3 and 4").toEqual([]);

    await page.mouse.move(slotCentre(7) + HOVER_SLOT / 4, first.y, { steps: 4 });
    const quarter = await wordsAcrossBoards(page);
    expect(near(quarter.turns[board(7).id], 67.5) && near(quarter.turns[board(8).id], 22.5), JSON.stringify(quarter.turns)).toBe(true);
    expect.soft(quarter.crossings, "the cursor a quarter of the way from board 7 to board 8").toEqual([]);

    const rows = standInRackRows(30);
    await openRack(page, `${RACK_STAND_IN_ROUTE}?boards=30`, 30);
    await restOn(page, rows[19].id);
    await waitForTurnsToFinish(page);
    const secondRow = await wordsAcrossBoards(page);
    expect(secondRow.turns[rows[19].id]).toBe(90);
    expect.soft(secondRow.crossings, "thirty boards, resting on board 20 in row 2").toEqual([]);
  });
});

/** The rack's order as the page shows it: every board button's key, in the order they stand. */
async function rackKeys(page: Page) {
  return page.locator("[data-rack-board]").evaluateAll((buttons) => buttons.map((button) => button.getAttribute("data-rack-board") ?? ""));
}

/** The rack's order with `key` moved to place `to`. */
function movedOrder(keys: readonly string[], key: string, to: number) {
  const rest = keys.filter((other) => other !== key);
  rest.splice(to, 0, key);
  return rest;
}

/** The status pill's live region. */
const statusRegion = (page: Page) => page.locator("[data-rack-status]");

/** The height-line labels of the rack's first row, the lowest line first. */
async function heightLabels(page: Page) {
  const labels = await page
    .locator('[data-rack-kind="hover"] svg > g:first-of-type text[text-anchor="end"]')
    .evaluateAll((texts) => texts.map((text) => text.textContent ?? ""));
  return labels;
}

/** One row's whole height on a rack of two or more rows: its top room, its drawing and its band. */
const MULTI_ROW_BLOCK = HOVER_ROW_TOP_ROOM + HOVER_MULTI_ROW_HEIGHT + HOVER_ROW_BAND;

/**
 * The first board's slot centre, read while it stands on its slot — on arrival, when it is the one
 * turned board (nothing left of it to move it), or when no board is turned. Every other slot's centre
 * in that row is whole slots along from it.
 */
async function firstSlotCentre(page: Page) {
  const keys = await rackKeys(page);
  return centreOf(page, keys[0]);
}

/**
 * Rests the cursor on rack place `index` (0-based) of the first row: it goes to that board's SLOT
 * centre, whole slots along from `first` (`firstSlotCentre`), never to its drawn place — next to a
 * turned wide board the neighbours stand up to about 25 dots off their slots, and the turn follows
 * the slots, so the drawn place can sit nearer the next slot along. Returns that point; a board
 * rested there stands on its own slot, so a press there is on the board's axis.
 *
 * A cursor exactly on a slot's centre turns that board fully while it is still moving, before the
 * rack has rested, so the wait is for the caption: it moves under a board only once the rack has
 * rested on it and handed it the turn.
 */
async function restOnPlace(page: Page, index: number, first?: { x: number; y: number }) {
  const origin = first ?? (await firstSlotCentre(page));
  const keys = await rackKeys(page);
  const point = { x: origin.x + index * HOVER_SLOT, y: origin.y };
  await page.mouse.move(point.x, point.y, { steps: 8 });
  await expect(page.locator(`[data-rack-caption="${keys[index]}"]`)).toBeVisible();
  await expect(boardArt(page, keys[index])).toHaveAttribute("data-turn", "90");
  await waitForTurnsToFinish(page);
  return point;
}

/** The turned board's ⋯ menu, opened: the trigger is reached in one cursor step from the drawing
 * straight into the caption band, where the rack holds still. */
async function openBoardMenu(page: Page, name: string) {
  await page.getByRole("button", { name: `Board actions for ${name}` }).click();
  const menu = page.getByRole("menu");
  await expect(menu).toBeVisible();
  return menu;
}

/** Every row of an open menu in order, by its role and words: `menuitem:Rename`, `separator:`. */
async function menuRows(page: Page) {
  return page
    .getByRole("menu")
    .locator('[role="menuitem"], [role="separator"]')
    .evaluateAll((rows) => rows.map((row) => `${row.getAttribute("role")}:${(row.textContent ?? "").trim()}`));
}

/** Puts a board in progress in front of the practice rack: Start Shaping, then Back. */
async function startABoardAndComeBack(page: Page, count: number) {
  await page.getByRole("button").filter({ hasText: "Start Shaping" }).first().click();
  await page.waitForURL("**/design/outline");
  await page.goBack();
  await page.waitForURL((url) => url.pathname === RACK_STAND_IN_ROUTE);
  await expect(page.locator("[data-rack-board]")).toHaveCount(count + 1);
  await expect(page.locator("[data-rack-art][data-turn]")).toHaveCount(count + 1);
  await expect(page.locator("[data-rack-board]").first()).toHaveAttribute("data-rack-board", IN_PROGRESS_KEY);
  await expect(boardArt(page, IN_PROGRESS_KEY)).toHaveAttribute("data-turn", "90");
  await waitForTurnsToFinish(page);
}

test.describe("the Board Rack on a computer — moving boards (15-11, sketch 010)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the hover rack's own pointer checks are desktop-only");
    await dismissBannerAndTip(page);
  });

  test("m12. press board 2 and drag it four places along: it lifts, the caption band empties, a drop mark shows the gap, and letting go puts it sixth, turned, with the pill saying so", async ({
    page,
  }) => {
    await openRack(page, RACK_STAND_IN_ROUTE, 15);
    const before = await rackKeys(page);
    const second = board(2);
    const start = await restOnPlace(page, 1);

    await page.mouse.down();
    await page.mouse.move(start.x + 4 * HOVER_SLOT, start.y, { steps: 10 });
    await expect(boardArt(page, second.id)).toHaveAttribute("data-carrying", "true");
    await expect(page.locator("[data-rack-art][data-carrying]")).toHaveCount(1);
    await expect(page.locator("[data-rack-caption]")).toHaveCount(0);
    await expect(page.locator("[data-drop-mark]")).toHaveAttribute("opacity", "1");

    await page.mouse.up();
    await expect(statusRegion(page)).toHaveText(RACK_COPY.moved(second.name));
    const expected = movedOrder(before, second.id, 5);
    await expect.poll(() => rackKeys(page)).toEqual(expected);
    expect((await rackKeys(page)).indexOf(second.id)).toBe(5);
    await expect(page.locator("[data-rack-art][data-carrying]")).toHaveCount(0);
    await expect(page.locator("[data-drop-mark]")).toHaveAttribute("opacity", "0");
    await expect(boardArt(page, second.id)).toHaveAttribute("data-turn", "90");
    await expect(captionFor(page, second.name)).toBeVisible();
    // The release at the end of the drag never opened the board.
    expect(new URL(page.url()).pathname).toBe(RACK_STAND_IN_ROUTE);

    // The practice rack's save resolves quietly signed out: the order stays.
    await page.waitForTimeout(1200);
    expect(await rackKeys(page)).toEqual(expected);
    await expect(statusRegion(page)).not.toHaveText(RACK_COPY.saveFailed);
  });

  test("m13. a press and release that moves under 6 dots is a click: it opens the board", async ({ page }) => {
    await openRack(page, RACK_STAND_IN_ROUTE, 15);
    const start = await restOnPlace(page, 2);
    await page.mouse.down();
    await page.mouse.move(start.x + 3, start.y + 2, { steps: 3 });
    await expect(page.locator("[data-rack-art][data-carrying]")).toHaveCount(0);
    await page.mouse.up();
    await page.waitForURL("**/design/outline");
  });

  test("m14. Escape mid-drag puts the board back: the order is unchanged and nothing is said", async ({ page }) => {
    await openRack(page, RACK_STAND_IN_ROUTE, 15);
    const before = await rackKeys(page);
    const start = await restOnPlace(page, 1);
    await page.mouse.down();
    await page.mouse.move(start.x + 3 * HOVER_SLOT, start.y, { steps: 8 });
    await expect(boardArt(page, board(2).id)).toHaveAttribute("data-carrying", "true");

    await page.keyboard.press("Escape");
    await expect(page.locator("[data-rack-art][data-carrying]")).toHaveCount(0);
    await expect(page.locator("[data-drop-mark]")).toHaveAttribute("opacity", "0");
    // Letting go afterwards neither moves nor opens anything.
    await page.mouse.up();
    await page.waitForTimeout(300);
    expect(await rackKeys(page)).toEqual(before);
    await expect(statusRegion(page)).toHaveText("");
    expect(new URL(page.url()).pathname).toBe(RACK_STAND_IN_ROUTE);
    // The board goes back on its own slot, and the caption comes back under the turned board.
    await expect(captionFor(page, board(2).name)).toBeVisible();
  });

  test("m15. thirty boards: a board carried from row 1 down into row 2 lands there", async ({ page }) => {
    const rows = standInRackRows(30);
    await openRack(page, `${RACK_STAND_IN_ROUTE}?boards=30`, 30);
    const before = await rackKeys(page);
    const third = rows[2];
    const start = await restOnPlace(page, 2);
    await page.mouse.down();
    await page.mouse.move(start.x, start.y + MULTI_ROW_BLOCK, { steps: 12 });
    await expect(boardArt(page, third.id)).toHaveAttribute("data-carrying", "true");
    await page.mouse.up();

    // Row 2 starts at place 15, so the same column one row down is place 17.
    await expect(statusRegion(page)).toHaveText(RACK_COPY.moved(third.name));
    await expect.poll(() => rackKeys(page)).toEqual(movedOrder(before, third.id, 17));
    // Once it has landed (a 120 ms descent) it stands in row 2, level with that row's last board.
    await expect.poll(async () => {
      const tops = await boardTops(page);
      return tops[17] > tops[0] && tops[17] === tops[29];
    }).toBe(true);
    await expect(boardArt(page, third.id)).toHaveAttribute("data-turn", "90");
    await expect(captionFor(page, third.name)).toBeVisible();
  });

  test("m16. the unsaved board can't be dragged, and a board dragged to the far left lands right behind it", async ({ page }) => {
    await openRack(page, RACK_STAND_IN_ROUTE, 15);
    await startABoardAndComeBack(page, 15);
    const before = await rackKeys(page);
    // The unsaved board is the one turned on arrival, standing on its own slot.
    const first = await firstSlotCentre(page);

    await page.mouse.move(first.x, first.y, { steps: 4 });
    await page.mouse.down();
    await page.mouse.move(first.x + 3 * HOVER_SLOT, first.y, { steps: 8 });
    await expect(statusRegion(page)).toHaveText(RACK_COPY.unsavedStaysFirst);
    await expect(page.locator("[data-rack-art][data-carrying]")).toHaveCount(0);
    await page.mouse.up();
    expect(await rackKeys(page)).toEqual(before);
    expect(new URL(page.url()).pathname).toBe(RACK_STAND_IN_ROUTE);

    // Back to the unsaved board first, so the slots are whole slots along from it again.
    await restOnPlace(page, 0, first);
    const fourth = before[4];
    const start = await restOnPlace(page, 4, first);
    await page.mouse.down();
    await page.mouse.move(start.x - 7 * HOVER_SLOT, start.y, { steps: 12 });
    await expect(boardArt(page, fourth)).toHaveAttribute("data-carrying", "true");
    await page.mouse.up();
    await expect.poll(() => rackKeys(page)).toEqual(movedOrder(before, fourth, 1));
    expect((await rackKeys(page))[0]).toBe(IN_PROGRESS_KEY);
  });

  test("m17. ⋯ on the turned board: Move left, Move right, a line, Rename, Duplicate, Delete — and each Move is dimmed where it can't move", async ({
    page,
  }) => {
    await openRack(page, RACK_STAND_IN_ROUTE, 15);
    const before = await rackKeys(page);
    const first = board(1);
    let menu = await openBoardMenu(page, first.name);
    expect(await menuRows(page)).toEqual([
      `menuitem:${RACK_COPY.moveLeft}`,
      `menuitem:${RACK_COPY.moveRight}`,
      "separator:",
      "menuitem:Rename",
      "menuitem:Duplicate",
      "menuitem:Delete",
    ]);
    // The first board can't go left; the row keeps its place, dimmed.
    await expect(menu.getByRole("menuitem", { name: RACK_COPY.moveLeft })).toBeDisabled();
    await expect(menu.getByRole("menuitem", { name: RACK_COPY.moveRight })).toBeEnabled();

    await menu.getByRole("menuitem", { name: RACK_COPY.moveRight }).click();
    await expect(page.getByRole("menu")).toHaveCount(0);
    await expect(statusRegion(page)).toHaveText(RACK_COPY.moved(first.name));
    await expect.poll(() => rackKeys(page)).toEqual(movedOrder(before, first.id, 1));
    await expect(boardArt(page, first.id)).toHaveAttribute("data-turn", "90");
    await expect(captionFor(page, first.name)).toBeVisible();

    // The last board can't go right.
    await openRack(page, RACK_STAND_IN_ROUTE, 15);
    await restOnPlace(page, 14);
    menu = await openBoardMenu(page, board(15).name);
    await expect(menu.getByRole("menuitem", { name: RACK_COPY.moveRight })).toBeDisabled();
    await expect(menu.getByRole("menuitem", { name: RACK_COPY.moveLeft })).toBeEnabled();
    await page.keyboard.press("Escape");

    // One board alone is first and last: both are dimmed.
    await openRack(page, `${RACK_STAND_IN_ROUTE}?boards=1`, 1);
    menu = await openBoardMenu(page, board(1).name);
    await expect(menu.getByRole("menuitem", { name: RACK_COPY.moveLeft })).toBeDisabled();
    await expect(menu.getByRole("menuitem", { name: RACK_COPY.moveRight })).toBeDisabled();
    await page.keyboard.press("Escape");

    // Behind the unsaved board, the first saved board can't go left either.
    await openRack(page, RACK_STAND_IN_ROUTE, 15);
    await startABoardAndComeBack(page, 15);
    await restOnPlace(page, 1);
    menu = await openBoardMenu(page, board(1).name);
    await expect(menu.getByRole("menuitem", { name: RACK_COPY.moveLeft })).toBeDisabled();
    await expect(menu.getByRole("menuitem", { name: RACK_COPY.moveRight })).toBeEnabled();
  });

  test("m18. the keyboard walks the rack: Tab lands on the turned board, the arrows turn the next, Home / End, Alt + arrow moves, Enter opens", async ({
    page,
  }) => {
    await openRack(page, RACK_STAND_IN_ROUTE, 15);
    const before = await rackKeys(page);
    const group = page.getByRole("group", { name: RACK_COPY.groupName });
    await expect(group).toHaveAccessibleDescription(RACK_COPY.hoverInstructions);
    await expect(boardButton(page, board(1).id)).toHaveAttribute("tabindex", "0");
    await expect(boardButton(page, board(2).id)).toHaveAttribute("tabindex", "-1");

    // Tab from the top of the page: the first board button it reaches is the turned one.
    let reached: string | null = null;
    for (let press = 0; press < 80 && reached === null; press++) {
      await page.keyboard.press("Tab");
      reached = await page.evaluate(() => document.activeElement?.getAttribute("data-rack-board") ?? null);
    }
    expect(reached).toBe(board(1).id);

    await page.keyboard.press("ArrowRight");
    await expect(boardButton(page, board(2).id)).toBeFocused();
    await expect(boardArt(page, board(2).id)).toHaveAttribute("data-turn", "90", { timeout: 400 });
    await expect(captionFor(page, board(2).name)).toBeVisible();
    await expect(boardButton(page, board(2).id)).toHaveAttribute("tabindex", "0");

    await page.keyboard.press("End");
    await expect(boardButton(page, board(15).id)).toBeFocused();
    await expect(boardArt(page, board(15).id)).toHaveAttribute("data-turn", "90");
    await page.keyboard.press("Alt+ArrowRight");
    await expect(statusRegion(page)).toHaveText(RACK_COPY.alreadyLast(board(15).name));
    await expect(boardButton(page, board(15).id)).toBeFocused();

    await page.keyboard.press("Home");
    await expect(boardButton(page, board(1).id)).toBeFocused();
    await expect(boardArt(page, board(1).id)).toHaveAttribute("data-turn", "90");
    await page.keyboard.press("Alt+ArrowRight");
    await expect(statusRegion(page)).toHaveText(RACK_COPY.moved(board(1).name));
    await expect.poll(() => rackKeys(page)).toEqual(movedOrder(before, board(1).id, 1));
    await expect(boardButton(page, board(1).id)).toBeFocused();
    await expect(boardArt(page, board(1).id)).toHaveAttribute("data-turn", "90");
    // The browser's own Alt + arrow never fired: still on the practice rack.
    expect(new URL(page.url()).pathname).toBe(RACK_STAND_IN_ROUTE);

    await page.keyboard.press("Enter");
    await page.waitForURL("**/design/outline");
  });

  test("m18a. with two rows, ↑ / ↓ go to the nearest board in the row above / below", async ({ page }) => {
    const rows = standInRackRows(30);
    await openRack(page, `${RACK_STAND_IN_ROUTE}?boards=30`, 30);
    await boardButton(page, rows[0].id).focus();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await expect(boardButton(page, rows[2].id)).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(boardButton(page, rows[17].id)).toBeFocused();
    await expect(boardArt(page, rows[17].id)).toHaveAttribute("data-turn", "90");
    await page.keyboard.press("ArrowUp");
    await expect(boardButton(page, rows[2].id)).toBeFocused();
    // The end of row 1 continues at the start of row 2.
    await page.keyboard.press("End");
    await page.keyboard.press("Home");
    for (let step = 0; step < 15; step++) await page.keyboard.press("ArrowRight");
    await expect(boardButton(page, rows[15].id)).toBeFocused();
  });

  test("m19. with a ⋯ menu open, the rack holds still: the cursor over another board turns nothing", async ({ page }) => {
    await openRack(page, RACK_STAND_IN_ROUTE, 15);
    const first = await firstSlotCentre(page);
    await openBoardMenu(page, board(1).name);
    await page.mouse.move(first.x + 5 * HOVER_SLOT, first.y, { steps: 10 });
    await page.waitForTimeout(600);
    await expect(boardArt(page, board(6).id)).toHaveAttribute("data-turn", "0");
    await expect(boardArt(page, board(1).id)).toHaveAttribute("data-turn", "90");
    await expect(page.getByRole("menu")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("menu")).toHaveCount(0);
  });

  test("m21. a failed duplicate says so under that board's Open This Board", async ({ page }) => {
    await openRack(page, RACK_STAND_IN_ROUTE, 15);
    const menu = await openBoardMenu(page, board(1).name);
    // The practice rack runs signed out, so Duplicate fails.
    await menu.getByRole("menuitem", { name: "Duplicate" }).click();
    const caption = captionFor(page, board(1).name);
    const error = caption.getByText(RACK_COPY.duplicateFailed, { exact: true });
    await expect(error).toBeVisible();
    const open = await caption.getByRole("button", { name: RACK_COPY.open }).boundingBox();
    const said = await error.boundingBox();
    if (!open || !said) throw new Error("no box for the caption's button or its error");
    expect(said.y).toBeGreaterThanOrEqual(open.y + open.height - 1);
  });

  test("m22. Metric on the rack: the height lines read 150, 200 ... and the card line centimetres and litres; Imperial puts them back exactly", async ({
    page,
  }) => {
    await openRack(page, RACK_STAND_IN_ROUTE, 15);
    const cardLine = captionFor(page, board(1).name).locator("span.font-semibold.text-surf-ink-muted");
    const imperialLine = (await cardLine.textContent()) ?? "";
    expect((await heightLabels(page)).slice(0, 2)).toEqual(["4′", "5′"]);

    let dialog = await openAppSettings(page);
    await dialog.getByRole("group", { name: "Units" }).getByRole("button", { name: /^Metric/ }).click();
    await dialog.getByRole("button", { name: "Done" }).click();
    await expect(dialog).toBeHidden();
    await expect.poll(async () => (await heightLabels(page)).slice(0, 2)).toEqual(["150", "200"]);
    for (const label of await heightLabels(page)) expect(Number(label) % 50).toBe(0);
    await expect(cardLine).toHaveText(/\d+\.\d × \d+\.\d × \d+\.\d cm/);
    await expect(cardLine).toHaveText(/L/);

    dialog = await openAppSettings(page);
    await dialog.getByRole("group", { name: "Units" }).getByRole("button", { name: /^Imperial/ }).click();
    await dialog.getByRole("button", { name: "Done" }).click();
    await expect(dialog).toBeHidden();
    await expect.poll(async () => (await heightLabels(page)).slice(0, 2)).toEqual(["4′", "5′"]);
    await expect(cardLine).toHaveText(imperialLine);
  });
});

test.describe("the Board Rack on a computer — moving with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the hover rack's own pointer checks are desktop-only");
    await dismissBannerAndTip(page);
  });

  test("m20. a dropped board is fully turned within 50 ms of the release — no descent, no glide", async ({ page }) => {
    await openRack(page, RACK_STAND_IN_ROUTE, 15);
    const second = board(2);
    const start = await restOnPlace(page, 1);
    await page.mouse.down();
    await page.mouse.move(start.x + 3 * HOVER_SLOT, start.y, { steps: 8 });
    await expect(boardArt(page, second.id)).toHaveAttribute("data-carrying", "true");
    // Times the release and the moment the board reads 90 degrees, both on the page's own clock.
    await page.evaluate((key) => {
      const art = document.querySelector(`[data-rack-art="${key}"]`);
      const marks: { up?: number; turned?: number } = {};
      (window as unknown as { __dropMarks: typeof marks }).__dropMarks = marks;
      window.addEventListener("pointerup", () => (marks.up ??= performance.now()), { capture: true, once: true });
      if (!art) return;
      const observer = new MutationObserver(() => {
        if (marks.up !== undefined && art.getAttribute("data-turn") === "90") {
          marks.turned ??= performance.now();
          observer.disconnect();
        }
      });
      observer.observe(art, { attributes: true, attributeFilter: ["data-turn"] });
    }, second.id);
    await page.mouse.up();
    await expect(boardArt(page, second.id)).toHaveAttribute("data-turn", "90");
    const marks = await page.evaluate(() => (window as unknown as { __dropMarks: { up?: number; turned?: number } }).__dropMarks);
    expect(marks.up).toBeDefined();
    expect(marks.turned).toBeDefined();
    expect((marks.turned ?? Infinity) - (marks.up ?? 0)).toBeLessThanOrEqual(50);
    await expect(statusRegion(page)).toHaveText(RACK_COPY.moved(second.name));
  });
});

test.describe("the Board Rack on a computer — reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the hover rack's own pointer checks are desktop-only");
    await dismissBannerAndTip(page);
  });

  test("10. a board is only ever edge-on or fully turned: sweeping changes nothing until the cursor rests", async ({
    page,
  }) => {
    await openRack(page, RACK_STAND_IN_ROUTE, 15);
    const a = await centreOf(page, board(3).id);
    const b = await centreOf(page, board(4).id);
    await page.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2, { steps: 4 });
    const during = await readTurnsNextFrame(page, [board(3).id, board(4).id]);
    for (const turn of during) expect([0, 90]).toContain(turn);

    await page.waitForTimeout(600);
    const after = await Promise.all([board(3).id, board(4).id].map((key) => boardArt(page, key).getAttribute("data-turn")));
    expect([...after].sort()).toEqual(["0", "90"]);
  });
});
