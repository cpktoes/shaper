import { expect, test, type Page } from "@playwright/test";
import { RACK_COPY, rackHeadingLine } from "../components/setup/rack-config";
import { SWIPE_SLOT } from "../lib/geometry/rack-layout";
import { BANNER_DISMISSAL_KEY } from "../lib/models/banner-dismissal";
import { RACK_STAND_IN_ROUTE, standInRackRows } from "../lib/models/rack-stand-in";
import { TOOLBAR_TIP_DISMISSAL_KEY } from "../lib/models/toolbar-tip";

/**
 * The Board Rack on a phone or an iPad (Phase 15, 15-07): a finger gets the swipe rack (D-04) — the
 * device's own sideways scroller that settles one board in the middle, every board turning as it
 * passes the middle, the middle board's caption under the rack, a tap at the side bringing a board to
 * the middle and a tap on the middle board opening it. Saved boards only exist on the practice rack
 * (`/test-rack`, 15-05) because this suite runs signed out with no database.
 *
 * Real touch input exists only on the `android` project (CDP `Input.dispatchTouchEvent`, the
 * `slider-touch.spec.ts` recipe); the `iphone` project (WebKit) checks the layout, `tap()` and
 * programmatic scrolling. A viewport change inside the android project keeps its touch pointer,
 * which is how the iPad and the sideways-phone cases run.
 *
 * The frame loop writes each board's current angle, in whole degrees, onto its drawing as
 * `data-turn`, and the rack writes its slot (40 dots, or wider on a tall screen — `swipeSlotFor`) as
 * `data-rack-slot`, so these checks read what the shaper sees rather than any internal state.
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
const scroller = (page: Page) => page.locator("[data-rack-scroller]");

/** Opens a rack page and waits until the rack has drawn every board. */
async function openRack(page: Page, path: string, count: number) {
  await page.goto(path);
  await expect(page.locator("[data-rack-board]")).toHaveCount(count);
  await expect(page.locator("[data-rack-art][data-turn]")).toHaveCount(count);
}

/** What the rack measures: its slot, the scroller's width, height and scroll, the drawn height. */
async function rackFigures(page: Page) {
  return page.evaluate(() => {
    const root = document.querySelector<HTMLElement>("[data-rack-kind]");
    const box = document.querySelector<HTMLElement>("[data-rack-scroller]");
    if (!root || !box) throw new Error("no rack on the page");
    const track = box.firstElementChild as HTMLElement | null;
    return {
      slot: Number(root.getAttribute("data-rack-slot")),
      width: box.clientWidth,
      height: box.clientHeight,
      drawn: box.clientHeight - 40,
      scrollLeft: box.scrollLeft,
      trackWidth: track ? track.getBoundingClientRect().width : 0,
    };
  });
}

/** Every board's turn, read two frames after now — after the frame the last scroll scheduled. */
async function turnsNextFrame(page: Page) {
  return page.evaluate(
    () =>
      new Promise<Record<string, number>>((resolve) =>
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            const turns: Record<string, number> = {};
            for (const group of Array.from(document.querySelectorAll("[data-rack-art]"))) {
              turns[group.getAttribute("data-rack-art") ?? ""] = Number(group.getAttribute("data-turn"));
            }
            resolve(turns);
          }),
        ),
      ),
  );
}

/** Scrolls the track to `slots` slots along with its snapping held off, so the middle can sit
 * between two boards (a mandatory snap would otherwise land it on one), then puts the snapping back
 * once the read is done. */
async function holdScrollAt(page: Page, slots: number) {
  await page.evaluate((along) => {
    const root = document.querySelector<HTMLElement>("[data-rack-kind]");
    const box = document.querySelector<HTMLElement>("[data-rack-scroller]");
    if (!root || !box) throw new Error("no rack on the page");
    box.style.scrollSnapType = "none";
    box.scrollLeft = along * Number(root.getAttribute("data-rack-slot"));
  }, slots);
}

async function releaseScroll(page: Page) {
  await page.evaluate(() => {
    const box = document.querySelector<HTMLElement>("[data-rack-scroller]");
    if (box) box.style.scrollSnapType = "";
  });
}

/** A real finger tap via a CDP touch session (android only). */
async function touchTap(page: Page, point: { x: number; y: number }) {
  const client = await page.context().newCDPSession(page);
  await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: point.x, y: point.y }] });
  await page.waitForTimeout(50);
  await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}

/** Taps a board the way the project's own finger does: a CDP touch on android, `tap()` on WebKit. */
async function tapBoard(page: Page, projectName: string, key: string) {
  const box = await boardButton(page, key).boundingBox();
  if (!box) throw new Error(`no box for board ${key}`);
  const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  if (projectName === "android") await touchTap(page, point);
  else await page.touchscreen.tap(point.x, point.y);
}

/** How many boards' centres stand on the screen right now. */
async function boardsOnScreen(page: Page) {
  return page.evaluate(() => {
    const width = window.innerWidth;
    return Array.from(document.querySelectorAll("[data-rack-board]")).filter((button) => {
      const rect = button.getBoundingClientRect();
      const centre = rect.left + rect.width / 2;
      return centre > 0 && centre < width;
    }).length;
  });
}

/**
 * Two frames after now: every place a board's vertical words (any still visible, opacity above
 * 0.05) cross ANOTHER board's drawn body — each words' box against each body's box, crossing when
 * they share more than half a dot both across and up — and every board's turn at that same moment.
 * The same check as the computer rack's case 12 (`e2e/board-rack.spec.ts`).
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

test.describe("the Board Rack on a phone — the swipe rack", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "the swipe rack is a touch screen's (D-04)");
    await dismissBannerAndTip(page);
  });

  test("1. a finger gets the swipe rack: its hint, the first board turned with its caption, and Shape a New Board on the first screen", async ({
    page,
  }, testInfo) => {
    await openRack(page, RACK_STAND_IN_ROUTE, 15);
    await expect(page.locator('[data-rack-kind="swipe"]')).toHaveCount(1);
    await expect(page.getByText(rackHeadingLine(15, "swipe"), { exact: true })).toBeVisible();
    await expect(page.getByText(rackHeadingLine(15, "hover"), { exact: true })).toBeHidden();
    await expect(boardArt(page, board(1).id)).toHaveAttribute("data-turn", "90");
    await expect(captionFor(page, board(1).name)).toBeVisible();

    const viewport = page.viewportSize();
    if (!viewport) throw new Error("no viewport");
    const heading = await page.getByRole("heading", { name: "Shape a New Board" }).boundingBox();
    if (!heading) throw new Error("no box for Shape a New Board");
    expect(heading.y + heading.height).toBeLessThanOrEqual(viewport.height);

    if (testInfo.project.name === "iphone") {
      // The standing guard (UI-SPEC §3): on the iPhone 14 page the drawn height is the first screen
      // less the named chrome, and the real stack — everything down to Shape a New Board's bottom,
      // less the drawn height — is that same chrome, so a drift in either the 306 or the page fails.
      const chrome = await page.evaluate(() =>
        parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--rack-swipe-chrome-phone")),
      );
      expect(chrome).toBe(306);
      const figures = await rackFigures(page);
      expect(Math.abs(viewport.height - figures.drawn - chrome)).toBeLessThanOrEqual(1.5);
      expect(Math.abs(heading.y + heading.height - figures.drawn - chrome)).toBeLessThanOrEqual(1.5);
      // The practice quiver keeps the 40-dot slot here: about 5 boards at the start, 9 mid-rack.
      expect(figures.slot).toBe(SWIPE_SLOT);
      expect(await boardsOnScreen(page)).toBe(5);
      await scroller(page).evaluate((box, along) => {
        box.scrollLeft = along;
      }, 7 * SWIPE_SLOT);
      await expect(boardArt(page, board(8).id)).toHaveAttribute("data-turn", "90");
      await expect(captionFor(page, board(8).name)).toBeVisible();
      await expect.poll(() => boardsOnScreen(page)).toBe(9);
    }
  });

  test("2. a real swipe turns every board as it passes the middle, then settles one board turned on a snap point", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "android", "real touch input is only available on the android (Chromium) project");
    await openRack(page, RACK_STAND_IN_ROUTE, 15);
    const { slot } = await rackFigures(page);
    const box = await scroller(page).boundingBox();
    if (!box) throw new Error("no box for the scroller");
    const y = box.y + box.height / 2;
    const startX = box.x + box.width * 0.75;
    const endX = startX - 3 * slot;

    const client = await page.context().newCDPSession(page);
    await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: startX, y }] });
    let partTurned = false;
    for (let step = 1; step <= 30; step++) {
      const x = startX + ((endX - startX) * step) / 30;
      await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y }] });
      const turns = await turnsNextFrame(page);
      const { scrollLeft } = await rackFigures(page);
      const nearest = STAND_INS[Math.min(14, Math.max(0, Math.round(scrollLeft / slot)))];
      const turn = turns[nearest.id];
      if (turn > 0 && turn < 90) partTurned = true;
    }
    await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    expect(partTurned, "some board near the middle was part-way through its turn mid-swipe").toBe(true);

    await page.waitForTimeout(800);
    await expect
      .poll(async () => Object.values(await turnsNextFrame(page)).filter((turn) => turn === 90).length)
      .toBe(1);
    const turns = await turnsNextFrame(page);
    const settled = STAND_INS.find((row) => turns[row.id] === 90);
    if (!settled) throw new Error("no board settled");
    await expect(captionFor(page, settled.name)).toBeVisible();
    const after = await rackFigures(page);
    expect(after.scrollLeft % after.slot).toBe(0);
    expect(STAND_INS[after.scrollLeft / after.slot].id).toBe(settled.id);
  });

  test("3. a tap on a board at the side brings it to the middle and turns it; a tap on the middle board opens it", async ({
    page,
  }, testInfo) => {
    await openRack(page, RACK_STAND_IN_ROUTE, 15);
    await tapBoard(page, testInfo.project.name, board(3).id);
    await expect(boardArt(page, board(3).id)).toHaveAttribute("data-turn", "90");
    await expect(boardArt(page, board(1).id)).toHaveAttribute("data-turn", "0");
    await expect(captionFor(page, board(3).name)).toBeVisible();
    const { slot, scrollLeft } = await rackFigures(page);
    expect(scrollLeft).toBe(2 * slot);
    expect(new URL(page.url()).pathname).toBe(RACK_STAND_IN_ROUTE);

    await tapBoard(page, testInfo.project.name, board(3).id);
    await page.waitForURL("**/design/outline");
  });

  test("4. one board alone: centred, turned, captioned", async ({ page }) => {
    await openRack(page, `${RACK_STAND_IN_ROUTE}?boards=1`, 1);
    const only = standInRackRows(1)[0];
    await expect(boardArt(page, only.id)).toHaveAttribute("data-turn", "90");
    await expect(captionFor(page, only.name)).toBeVisible();
    const button = await boardButton(page, only.id).boundingBox();
    const figures = await rackFigures(page);
    if (!button) throw new Error("no box for the board");
    expect(Math.abs(button.x + button.width / 2 - figures.width / 2)).toBeLessThanOrEqual(1);
  });

  test("12. no word ever crosses a board: on arrival, and with the middle between two boards", async ({ page }) => {
    await openRack(page, RACK_STAND_IN_ROUTE, 15);
    const arrival = await wordsAcrossBoards(page);
    expect(arrival.turns[board(1).id]).toBe(90);
    expect.soft(arrival.crossings, "on arrival, board 1 turned").toEqual([]);

    await holdScrollAt(page, 2.5);
    const between = await wordsAcrossBoards(page);
    const half = (turn: number) => Math.abs(turn - 45) <= 2;
    expect(half(between.turns[board(3).id]) && half(between.turns[board(4).id]), JSON.stringify(between.turns)).toBe(true);
    expect.soft(between.crossings, "the middle halfway between boards 3 and 4").toEqual([]);

    await holdScrollAt(page, 6.25);
    const quarter = await wordsAcrossBoards(page);
    expect.soft(quarter.crossings, "the middle a quarter of the way from board 7 to board 8").toEqual([]);
    await releaseScroll(page);
  });

  test("12a. no word ever crosses a board on an iPad held upright (810 x 1080, the 420 cap)", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "android", "the iPad's size runs on the android project's touch pointer");
    await page.setViewportSize({ width: 810, height: 1080 });
    await openRack(page, RACK_STAND_IN_ROUTE, 15);
    const figures = await rackFigures(page);
    expect(figures.drawn).toBe(420);
    expect(figures.slot).toBeGreaterThan(SWIPE_SLOT);

    const arrival = await wordsAcrossBoards(page);
    expect(arrival.turns[board(1).id]).toBe(90);
    expect.soft(arrival.crossings, "on arrival, board 1 turned").toEqual([]);

    await holdScrollAt(page, 2.5);
    const between = await wordsAcrossBoards(page);
    expect.soft(between.crossings, "the middle halfway between boards 3 and 4").toEqual([]);
    await holdScrollAt(page, 9.375);
    const eighth = await wordsAcrossBoards(page);
    expect.soft(eighth.crossings, "the middle three-eighths of the way from board 10 to board 11").toEqual([]);
    await releaseScroll(page);
  });
});
