import { expect, test, type Page } from "@playwright/test";
import { PHONE_MOVE_VIA_MENU, RACK_COPY, rackHeadingLine } from "../components/setup/rack-config";
import { SWIPE_SLOT } from "../lib/geometry/rack-layout";
import { BANNER_DISMISSAL_KEY } from "../lib/models/banner-dismissal";
import { IN_PROGRESS_KEY } from "../lib/models/rack-order";
import { RACK_STAND_IN_ROUTE, standInRackRows } from "../lib/models/rack-stand-in";
import { TOOLBAR_TIP_DISMISSAL_KEY } from "../lib/models/toolbar-tip";
import { freshPracticeRack } from "./helpers/practice-rack";

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

/** Every test's setup: the sign-in banner and the toolbar tip dismissed, and a practice rack of the
 * test's own, never arranged (its saves land in the dev server's memory — e2e/helpers/practice-rack.ts). */
async function dismissBannerAndTip(page: Page) {
  await page.addInitScript(
    ([bannerKey, tipKey]) => {
      window.sessionStorage.setItem(bannerKey, "true");
      window.localStorage.setItem(tipKey, "true");
    },
    [BANNER_DISMISSAL_KEY, TOOLBAR_TIP_DISMISSAL_KEY] as const,
  );
  await freshPracticeRack(page);
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
  // How long a finger rests on the glass for a tap — a gesture's own timing, by design (IN-08).
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

    // Polled until the rack has come to rest — the track still for two frames on a snap point, one
    // board turned, the one on that point — rather than a fixed wait (IN-08).
    await expect
      .poll(
        async () => {
          const first = await rackFigures(page);
          const turnsNow = await turnsNextFrame(page);
          const second = await rackFigures(page);
          const turned = STAND_INS.filter((row) => turnsNow[row.id] === 90);
          if (first.scrollLeft !== second.scrollLeft || first.scrollLeft % first.slot !== 0 || turned.length !== 1) return false;
          return turned[0].id === STAND_INS[first.scrollLeft / first.slot]?.id;
        },
        { timeout: 10_000 },
      )
      .toBe(true);
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

  test("5. coming home from a board finds it already in the middle, turned and marked as the open one (D-07)", async ({
    page,
  }, testInfo) => {
    await openRack(page, RACK_STAND_IN_ROUTE, 15);
    await tapBoard(page, testInfo.project.name, board(5).id);
    await expect(boardArt(page, board(5).id)).toHaveAttribute("data-turn", "90");
    await expect(captionFor(page, board(5).name)).toBeVisible();
    await tapBoard(page, testInfo.project.name, board(5).id);
    await page.waitForURL("**/design/outline");

    await page.goBack();
    await page.waitForURL((url) => url.pathname === RACK_STAND_IN_ROUTE);
    await expect(page.locator("[data-rack-art][data-turn]")).toHaveCount(15);
    // Read at once, with no wait for any animation: the board is in place from the first paint.
    const first = await page.evaluate((key) => {
      const root = document.querySelector("[data-rack-kind]");
      const box = document.querySelector("[data-rack-scroller]");
      return {
        turn: document.querySelector(`[data-rack-art="${key}"]`)?.getAttribute("data-turn"),
        scrollLeft: box ? box.scrollLeft : -1,
        slot: Number(root?.getAttribute("data-rack-slot")),
      };
    }, board(5).id);
    expect(first.turn).toBe("90");
    expect(first.scrollLeft).toBe(4 * first.slot);
    await expect(boardButton(page, board(5).id)).toHaveAttribute("aria-current", "true");
  });

  test("6. thirty boards make a longer track at the same height", async ({ page }) => {
    await openRack(page, RACK_STAND_IN_ROUTE, 15);
    const fifteen = await rackFigures(page);
    await openRack(page, `${RACK_STAND_IN_ROUTE}?boards=30`, 30);
    const thirty = await rackFigures(page);
    expect(thirty.drawn).toBe(fifteen.drawn);
    expect(thirty.slot).toBe(fifteen.slot);
    expect(thirty.trackWidth - fifteen.trackWidth).toBeCloseTo(15 * fifteen.slot, 1);
  });

  test("7. an iPad's size with a finger (1024 x 768) still swipes, drawn to the desktop shell's sum", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "android", "the iPad's size runs on the android project's touch pointer");
    await page.setViewportSize({ width: 1024, height: 768 });
    await openRack(page, RACK_STAND_IN_ROUTE, 15);
    await expect(page.locator('[data-rack-kind="swipe"]')).toHaveCount(1);
    const { drawn } = await rackFigures(page);
    expect(drawn).toBe(Math.min(420, Math.max(220, 768 - 419)));
  });

  for (const sideways of [
    { width: 863, height: 360, label: "a real Pixel 7 held sideways" },
    { width: 750, height: 340, label: "Playwright's sideways iPhone" },
  ]) {
    test(`8. ${sideways.label} (${sideways.width} x ${sideways.height}): the rack takes the short screen, Shape a New Board a scroll below (D-06)`, async ({
      page,
    }, testInfo) => {
      test.skip(testInfo.project.name !== "android", "the sideways phone runs on the android project's touch pointer");
      await page.setViewportSize({ width: sideways.width, height: sideways.height });
      await openRack(page, RACK_STAND_IN_ROUTE, 15);
      await expect(page.locator('[data-rack-kind="swipe"]')).toHaveCount(1);
      const { drawn } = await rackFigures(page);
      expect(drawn).toBe(Math.min(280, Math.max(220, sideways.height - 128)));
      const gutters = await page
        .locator("[data-setup-content]")
        .evaluate((el) => {
          const style = getComputedStyle(el);
          return [style.paddingTop, style.paddingLeft, style.paddingBottom];
        });
      expect(gutters).toEqual(["8px", "16px", "32px"]);
      const heading = await page.getByRole("heading", { name: "Shape a New Board" }).boundingBox();
      if (!heading) throw new Error("no box for Shape a New Board");
      expect(heading.y).toBeGreaterThanOrEqual(sideways.height);
      // The page itself never scrolls sideways; only the track does.
      expect(await page.evaluate(() => document.scrollingElement?.scrollWidth ?? 0)).toBe(sideways.width);
    });
  }

  test("10. the keyboard walks the rack: the arrow brings the next board to the middle, turned, and Enter opens it", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "android", "one keyboard pass is enough; it runs on the android project");
    await openRack(page, RACK_STAND_IN_ROUTE, 15);
    await expect(page.getByRole("group", { name: RACK_COPY.groupName })).toHaveAccessibleDescription(RACK_COPY.swipeInstructions);
    await expect(boardButton(page, board(1).id)).toHaveAttribute("tabindex", "0");
    await expect(boardButton(page, board(2).id)).toHaveAttribute("tabindex", "-1");
    await boardButton(page, board(1).id).focus();
    await page.keyboard.press("ArrowRight");
    await expect(boardButton(page, board(2).id)).toBeFocused();
    await expect(boardArt(page, board(2).id)).toHaveAttribute("data-turn", "90");
    await expect(captionFor(page, board(2).name)).toBeVisible();
    const { slot, scrollLeft } = await rackFigures(page);
    expect(scrollLeft).toBe(slot);
    await expect(boardButton(page, board(2).id)).toHaveAttribute("tabindex", "0");

    await page.keyboard.press("End");
    await expect(boardArt(page, board(15).id)).toHaveAttribute("data-turn", "90");
    await page.keyboard.press("Home");
    await expect(boardArt(page, board(1).id)).toHaveAttribute("data-turn", "90");
    await page.keyboard.press("ArrowRight");
    await expect(boardArt(page, board(2).id)).toHaveAttribute("data-turn", "90");
    await page.keyboard.press("Enter");
    await page.waitForURL("**/design/outline");
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

/** D-11: with the prepared switch on, phones move boards from the ⋯ menu and never by holding. */
const HOLD_OFF_REASON = "D-11 fallback on: phones move boards with ⋯";

/** The board keys in the rack's order, as the page lists them. */
async function rackKeys(page: Page) {
  return page.locator("[data-rack-board]").evaluateAll((buttons) => buttons.map((button) => button.getAttribute("data-rack-board") ?? ""));
}

/** The status pill's live region. */
const statusRegion = (page: Page) => page.locator("[data-rack-status]");

/** True for the practice rack's order save: a Server Action call (a POST carrying `Next-Action`). */
const isRackSave = (response: { request(): { method(): string; headers(): Record<string, string> } }) =>
  response.request().method() === "POST" && "next-action" in response.request().headers();

/** A board's button centre on the screen. */
async function centreOf(page: Page, key: string) {
  const box = await boardButton(page, key).boundingBox();
  if (!box) throw new Error(`no box for board ${key}`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** A real finger, held still on `point` for `holdMs` (a CDP touch session, android only). Returns the
 * session so the caller can go on moving, lifting or cancelling the same touch. */
async function touchHold(page: Page, point: { x: number; y: number }, holdMs: number) {
  const client = await page.context().newCDPSession(page);
  await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: point.x, y: point.y }] });
  // The finger held still through the 420 ms hold — the gesture's own timer, by design (IN-08).
  await page.waitForTimeout(holdMs);
  return client;
}

/** Moves a touch already down from `from` to `to` in `steps` even steps. */
async function touchMoveTo(
  client: Awaited<ReturnType<typeof touchHold>>,
  from: { x: number; y: number },
  to: { x: number; y: number },
  steps: number,
) {
  for (let step = 1; step <= steps; step++) {
    const x = from.x + ((to.x - from.x) * step) / steps;
    const y = from.y + ((to.y - from.y) * step) / steps;
    await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y }] });
  }
}

/** The rack's order with `key` moved to place `to`. */
function movedOrder(keys: readonly string[], key: string, to: number) {
  const rest = keys.filter((other) => other !== key);
  rest.splice(to, 0, key);
  return rest;
}

test.describe("the Board Rack on a phone — hold, slide and let go (15-09, sketch 011 A)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "android", "real touch input is only available on the android (Chromium) project");
    await dismissBannerAndTip(page);
  });

  test("13. hold a board until it lifts, slide it three places and let go: the new order shows at once, it comes to the middle turned, and the pill says so", async ({
    page,
  }) => {
    test.skip(PHONE_MOVE_VIA_MENU, HOLD_OFF_REASON);
    await openRack(page, RACK_STAND_IN_ROUTE, 15);
    const before = await rackKeys(page);
    const { slot } = await rackFigures(page);
    const third = board(3);
    // Bring the third board to the middle first, so three slots to the right stays clear of the
    // screen's edge (where the rack would scroll along — case 16).
    await tapBoard(page, "android", third.id);
    await expect(boardArt(page, third.id)).toHaveAttribute("data-turn", "90");
    await expect.poll(async () => (await rackFigures(page)).scrollLeft).toBe(2 * slot);
    const start = await centreOf(page, third.id);

    const client = await touchHold(page, start, 520);
    await expect(boardArt(page, third.id)).toHaveAttribute("data-carrying", "true");
    await expect(page.locator("[data-rack-art][data-carrying]")).toHaveCount(1);
    // While it is carried the caption becomes the carrying line.
    await expect(page.locator("[data-rack-carrying]")).toHaveText(
      `${RACK_COPY.carryingPrefix}${third.name}${RACK_COPY.carryingSuffix}`,
    );
    await touchMoveTo(client, start, { x: start.x + 3 * slot, y: start.y }, 15);
    await expect(page.locator("[data-drop-mark]")).toHaveAttribute("opacity", "1");
    const saved = page.waitForResponse(isRackSave);
    await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect(page.locator("[data-rack-carrying]")).toHaveCount(0);
    await expect(page.locator("[data-drop-mark]")).toHaveAttribute("opacity", "0");

    await expect(statusRegion(page)).toHaveText(RACK_COPY.moved(third.name));
    const expected = movedOrder(before, third.id, 5);
    await expect.poll(() => rackKeys(page)).toEqual(expected);
    await expect(page.locator("[data-rack-art][data-carrying]")).toHaveCount(0);
    await expect(boardArt(page, third.id)).toHaveAttribute("data-turn", "90");
    await expect(captionFor(page, third.name)).toBeVisible();
    await expect.poll(async () => (await rackFigures(page)).scrollLeft).toBe(5 * slot);
    const figures = await rackFigures(page);
    expect(figures.scrollLeft % figures.slot).toBe(0);
    const middle = await centreOf(page, third.id);
    expect(Math.abs(middle.x - figures.width / 2)).toBeLessThanOrEqual(1);
    // The tap at the end of the carry never opened the board.
    expect(new URL(page.url()).pathname).toBe(RACK_STAND_IN_ROUTE);

    // The practice rack's save lands (its stand-in account, e2e/helpers/practice-rack.ts): the order
    // stays and nothing says it failed — waited for as the save itself, not a fixed time (IN-08).
    await saved;
    await expect.poll(() => rackKeys(page)).toEqual(expected);
    await expect(statusRegion(page)).not.toHaveText(RACK_COPY.saveFailed);

    // The resting rack after the move: still no word across any board.
    const rest = await wordsAcrossBoards(page);
    expect(rest.turns[third.id]).toBe(90);
    expect.soft(rest.crossings, "at rest after the move").toEqual([]);
  });

  test("13b. a board held and slid stays where it was let go after opening a board and going Back (code review CR-01)", async ({
    page,
  }) => {
    test.skip(PHONE_MOVE_VIA_MENU, HOLD_OFF_REASON);
    await openRack(page, RACK_STAND_IN_ROUTE, 15);
    const before = await rackKeys(page);
    const { slot } = await rackFigures(page);
    const third = board(3);
    await tapBoard(page, "android", third.id);
    await expect(boardArt(page, third.id)).toHaveAttribute("data-turn", "90");
    await expect.poll(async () => (await rackFigures(page)).scrollLeft).toBe(2 * slot);
    const start = await centreOf(page, third.id);

    const saved = page.waitForResponse(isRackSave);
    const client = await touchHold(page, start, 520);
    await expect(boardArt(page, third.id)).toHaveAttribute("data-carrying", "true");
    await touchMoveTo(client, start, { x: start.x + 3 * slot, y: start.y }, 15);
    await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    const expected = movedOrder(before, third.id, 5);
    await expect.poll(() => rackKeys(page)).toEqual(expected);
    await expect(statusRegion(page)).toHaveText(RACK_COPY.moved(third.name));
    // The save has landed on the practice rack's stand-in account before the board is opened.
    await saved;

    // The dropped board stands in the middle, turned: a tap on it opens it. (A tap inside the half
    // second after a drop is swallowed as the end of the carry, so the tap is tried until it opens.)
    await expect.poll(async () => (await rackFigures(page)).scrollLeft).toBe(5 * slot);
    await expect(async () => {
      await tapBoard(page, "android", third.id);
      await page.waitForURL("**/design/outline", { timeout: 2_000 });
    }).toPass({ timeout: 20_000 });

    await page.goBack();
    await page.waitForURL((url) => url.pathname === RACK_STAND_IN_ROUTE);
    await expect(page.locator("[data-rack-art][data-turn]")).toHaveCount(15);
    await expect.poll(() => rackKeys(page)).toEqual(expected);
  });

  test("14. a quick swipe only moves the rack: nothing lifts and the order stays", async ({ page }) => {
    test.skip(PHONE_MOVE_VIA_MENU, HOLD_OFF_REASON);
    await openRack(page, RACK_STAND_IN_ROUTE, 15);
    const before = await rackKeys(page);
    const start = await centreOf(page, board(2).id);
    const client = await page.context().newCDPSession(page);
    await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: start.x, y: start.y }] });
    const carriedAtSomeSample: number[] = [];
    for (let step = 1; step <= 12; step++) {
      await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: start.x - 10 * step, y: start.y }] });
      carriedAtSomeSample.push(await page.locator("[data-rack-art][data-carrying]").count());
    }
    await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    expect(carriedAtSomeSample.every((count) => count === 0), JSON.stringify(carriedAtSomeSample)).toBe(true);
    // Well past the hold's time, still nothing has lifted, and the rack has moved. The wait outlasts
    // the 420 ms hold timer by design: a board that wrongly lifted would have had the time to (IN-08).
    await page.waitForTimeout(700);
    await expect(page.locator("[data-rack-art][data-carrying]")).toHaveCount(0);
    expect(await rackKeys(page)).toEqual(before);
    await expect.poll(async () => (await rackFigures(page)).scrollLeft).toBeGreaterThan(0);
    await expect(statusRegion(page)).toHaveText("");
  });

  test("15. the unsaved board stays first: holding it never lifts it, and a board carried to the far left lands right behind it", async ({
    page,
  }) => {
    test.skip(PHONE_MOVE_VIA_MENU, HOLD_OFF_REASON);
    await openRack(page, RACK_STAND_IN_ROUTE, 15);
    await expect(async () => {
      await page.getByRole("button").filter({ hasText: "Start Shaping" }).first().click();
      await page.waitForURL("**/design/outline", { timeout: 2_000 });
    }).toPass({ timeout: 20_000 });
    await page.goBack();
    await page.waitForURL((url) => url.pathname === RACK_STAND_IN_ROUTE);
    await expect(page.locator("[data-rack-art][data-turn]")).toHaveCount(16);
    const before = await rackKeys(page);
    expect(before[0]).toBe(IN_PROGRESS_KEY);
    await expect(boardArt(page, IN_PROGRESS_KEY)).toHaveAttribute("data-turn", "90");

    // Holding the unsaved board: it never lifts, the pill says why, and lifting the finger opens nothing.
    const unsaved = await centreOf(page, IN_PROGRESS_KEY);
    const hold = await touchHold(page, unsaved, 520);
    await expect(statusRegion(page)).toHaveText(RACK_COPY.unsavedStaysFirst);
    await expect(page.locator("[data-rack-art][data-carrying]")).toHaveCount(0);
    await hold.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    // A check that nothing happens: the wait gives a wrong tap's navigation the time to show (IN-08
    // keeps this one — there is nothing to wait for when the rack is right).
    await page.waitForTimeout(300);
    expect(new URL(page.url()).pathname).toBe(RACK_STAND_IN_ROUTE);
    expect(await rackKeys(page)).toEqual(before);

    // A saved board carried to the far left lands at the second place, right behind the unsaved board,
    // and the drop mark shows that place, never the unsaved board's.
    const { slot, width } = await rackFigures(page);
    const mover = before[2];
    const start = await centreOf(page, mover);
    const carry = await touchHold(page, start, 520);
    await expect(boardArt(page, mover)).toHaveAttribute("data-carrying", "true");
    await touchMoveTo(carry, start, { x: start.x - 5 * slot, y: start.y }, 15);
    const mark = await page.locator("[data-drop-mark]").evaluate((line) => (Number(line.getAttribute("x1")) + Number(line.getAttribute("x2"))) / 2);
    const secondPlace = (width - slot) / 2 + 1.5 * slot;
    expect(Math.abs(mark - secondPlace)).toBeLessThanOrEqual(0.5);
    await carry.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect.poll(() => rackKeys(page)).toEqual(movedOrder(before, mover, 1));
    const moverName = STAND_INS.find((row) => row.id === mover)?.name ?? "";
    await expect(statusRegion(page)).toHaveText(RACK_COPY.moved(moverName));
  });

  test("16. carried to the screen's edge, the rack scrolls along with the board", async ({ page }) => {
    test.skip(PHONE_MOVE_VIA_MENU, HOLD_OFF_REASON);
    await openRack(page, `${RACK_STAND_IN_ROUTE}?boards=30`, 30);
    const { width } = await rackFigures(page);
    const first = standInRackRows(30)[0];
    const start = await centreOf(page, first.id);
    const client = await touchHold(page, start, 520);
    await expect(boardArt(page, first.id)).toHaveAttribute("data-carrying", "true");
    const edge = { x: width - 20, y: start.y };
    await touchMoveTo(client, start, edge, 10);
    const before = (await rackFigures(page)).scrollLeft;
    // Polled until the rack has scrolled along under the board held at the edge (IN-08).
    await expect
      .poll(async () => (await rackFigures(page)).scrollLeft, { message: "the rack scrolled while the board sat at the edge" })
      .toBeGreaterThan(before + 40);
    await expect(boardArt(page, first.id)).toHaveAttribute("data-carrying", "true");
    await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect(page.locator("[data-rack-art][data-carrying]")).toHaveCount(0);
    // It dropped further along than the screen could show at the start, on an exact slot.
    await expect.poll(async () => (await rackFigures(page)).scrollLeft % (await rackFigures(page)).slot).toBe(0);
    expect((await rackKeys(page)).indexOf(first.id)).toBeGreaterThan(5);
  });

  test("17. a system cancel mid-carry puts the board back where it was, with nothing said", async ({ page }) => {
    test.skip(PHONE_MOVE_VIA_MENU, HOLD_OFF_REASON);
    await openRack(page, RACK_STAND_IN_ROUTE, 15);
    const before = await rackKeys(page);
    const { slot } = await rackFigures(page);
    const second = board(2);
    const start = await centreOf(page, second.id);
    const client = await touchHold(page, start, 520);
    await expect(boardArt(page, second.id)).toHaveAttribute("data-carrying", "true");
    await touchMoveTo(client, start, { x: start.x + 2 * slot, y: start.y }, 8);
    await client.send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] });
    await expect(page.locator("[data-rack-art][data-carrying]")).toHaveCount(0);
    await expect(page.locator("[data-rack-carrying]")).toHaveCount(0);
    // The board stands on its own slot again (its button centred on it) — polled until the track has
    // settled there rather than a fixed wait (IN-08) — and the page still scrolls.
    await expect.poll(async () => {
      const { scrollLeft, slot: settledSlot } = await rackFigures(page);
      return scrollLeft % settledSlot;
    }).toBe(0);
    expect(await rackKeys(page)).toEqual(before);
    await expect(statusRegion(page)).toHaveText("");
    const scrolling = await scroller(page).evaluate((box) => getComputedStyle(box).scrollSnapType);
    expect(scrolling).toContain("mandatory");
  });

  test("20. on an iPhone-sized page (390 x 664) the status pill reads clear of the caption's Open This Board (UI E09)", async ({
    page,
  }) => {
    test.skip(PHONE_MOVE_VIA_MENU, HOLD_OFF_REASON);
    await page.setViewportSize({ width: 390, height: 664 });
    await openRack(page, RACK_STAND_IN_ROUTE, 15);
    const { slot } = await rackFigures(page);
    const mover = board(1);
    const start = await centreOf(page, mover.id);
    const client = await touchHold(page, start, 520);
    await expect(boardArt(page, mover.id)).toHaveAttribute("data-carrying", "true");
    await touchMoveTo(client, start, { x: start.x + 2 * slot, y: start.y }, 8);
    await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect(statusRegion(page)).toHaveText(RACK_COPY.moved(mover.name));
    await expect(captionFor(page, mover.name)).toBeVisible();
    const figures = await page.evaluate((name) => {
      const box = (element: Element | null | undefined) => {
        if (!element) throw new Error("missing element");
        const rect = element.getBoundingClientRect();
        return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right };
      };
      const caption = document.querySelector("[data-rack-caption]");
      const open = Array.from(caption?.querySelectorAll("button") ?? []).find((button) => button.textContent === name);
      return {
        pill: box(document.querySelector("[data-rack-status]")),
        open: box(open),
        controls: Array.from(caption?.querySelectorAll("button") ?? []).map((button) => box(button)),
        firstLine: box(caption?.firstElementChild),
        floor: box(document.querySelector("[data-rack-scroller]")).bottom - 24,
      };
    }, RACK_COPY.open);
    const { pill, open, controls, firstLine, floor } = figures;
    // The pill is one line tall and never covers any of the caption's controls (Open This Board, ⋯).
    expect(pill.bottom - pill.top).toBeLessThanOrEqual(26);
    for (const control of controls) {
      const overlaps =
        control.left < pill.right && control.right > pill.left && control.top < pill.bottom && control.bottom > pill.top;
      expect(overlaps, `the pill (${pill.top.toFixed(1)}-${pill.bottom.toFixed(1)}) covers a caption control (${control.top.toFixed(1)}-${control.bottom.toFixed(1)})`).toBe(false);
    }
    // On this page its usual place (24 above the bottom edge) would sit on Open This Board, so it
    // stands in the empty band under the floor, clear of the floor line and the caption's first line.
    expect(pill.top).toBeGreaterThan(floor + 1);
    expect(pill.bottom).toBeLessThan(firstLine.top);
    console.log(
      `E09: Open This Board's tap box ${open.top.toFixed(1)}-${open.bottom.toFixed(1)}; the usual pill place would be ${(664 - 24 - (pill.bottom - pill.top)).toFixed(1)}-${(664 - 24).toFixed(1)}; ` +
        `the pill stands ${pill.top.toFixed(1)}-${pill.bottom.toFixed(1)}, ${(pill.top - floor).toFixed(1)} under the floor and ${(firstLine.top - pill.bottom).toFixed(1)} above the caption`,
    );
  });

  test("18. with D-11's switch on, holding a board lifts nothing and the hint says to use ⋯", async ({ page }) => {
    test.skip(!PHONE_MOVE_VIA_MENU, "D-11's switch is off: phones hold a board to move it");
    await openRack(page, RACK_STAND_IN_ROUTE, 15);
    const start = await centreOf(page, board(2).id);
    const client = await touchHold(page, start, 600);
    await expect(page.locator("[data-rack-art][data-carrying]")).toHaveCount(0);
    await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect(page.getByText(rackHeadingLine(15, "swipe"), { exact: true })).toBeVisible();
    expect(rackHeadingLine(15, "swipe")).toBe("15 boards · tap ⋯ to move");
  });
});

test.describe("the Board Rack on an iPhone — the status pill's live region", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "iphone", "one WebKit pass of the live region");
    await dismissBannerAndTip(page);
  });

  test("19. the rack's one live region is on the page from the start, empty, and never in the way", async ({ page }) => {
    await openRack(page, RACK_STAND_IN_ROUTE, 15);
    const region = statusRegion(page);
    await expect(region).toHaveCount(1);
    await expect(region).toHaveAttribute("role", "status");
    await expect(region).toHaveAttribute("aria-live", "polite");
    await expect(region).toHaveText("");
    await expect(page.getByRole("status")).toHaveCount(1);
  });
});

test.describe("the Board Rack on a phone — reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "android", "the reduced-motion swipe runs on the android project");
    await dismissBannerAndTip(page);
  });

  test("9. a board is only ever edge-on or fully turned: swiping turns nothing in passing", async ({ page }) => {
    await openRack(page, RACK_STAND_IN_ROUTE, 15);
    await holdScrollAt(page, 2.5);
    const during = await turnsNextFrame(page);
    for (const turn of Object.values(during)) expect([0, 90]).toContain(turn);
    await releaseScroll(page);
    // Polled until the rack has settled one board turned, rather than a fixed wait (IN-08).
    await expect.poll(async () => Object.values(await turnsNextFrame(page)).filter((turn) => turn === 90).length).toBe(1);
    const after = await turnsNextFrame(page);
    expect(Object.values(after).filter((turn) => turn === 90)).toHaveLength(1);
    for (const turn of Object.values(after)) expect([0, 90]).toContain(turn);
  });
});

test.describe("the Board Rack in a narrow computer window", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "a mouse is the desktop project's pointer");
    await dismissBannerAndTip(page);
  });

  test("11. a 600-dot-wide window with a mouse still gets the hover rack (D-04: the pointer decides, never the width)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 600, height: 800 });
    await openRack(page, RACK_STAND_IN_ROUTE, 15);
    await expect(page.locator('[data-rack-kind="hover"]')).toHaveCount(1);
    await expect(page.locator('[data-rack-kind="swipe"]')).toHaveCount(0);
  });
});

test.describe("the Board Rack on a phone — the ⋯ menu's rows and a keyboard's moves (15-11, D-12)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "the swipe rack is a touch screen's (D-04)");
    await dismissBannerAndTip(page);
  });

  test("19p. with D-11's switch off, the swipe rack's ⋯ is Rename, Duplicate and Delete — no Move rows, and no Move button anywhere", async ({
    page,
  }) => {
    test.skip(PHONE_MOVE_VIA_MENU, "D-11's switch is on: the swipe rack's ⋯ offers the moves (20p)");
    await openRack(page, RACK_STAND_IN_ROUTE, 15);
    await page.getByRole("button", { name: `Board actions for ${board(1).name}` }).click();
    const menu = page.getByRole("menu");
    await expect(menu).toBeVisible();
    await expect(menu.getByRole("menuitem")).toHaveText(["Rename", "Duplicate", "Delete"]);
    await expect(menu.getByRole("separator")).toHaveCount(0);
    await expect(page.getByRole("menuitem", { name: /Move/ })).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("menu")).toHaveCount(0);
    // No Arrange mode and no ‹ Move › buttons on the phone (the SPEC's prohibition).
    await expect(page.getByRole("button", { name: /Move/ })).toHaveCount(0);
  });

  test("20p. with D-11's switch on, ⋯ → Move right moves the middle board one place", async ({ page }) => {
    test.skip(!PHONE_MOVE_VIA_MENU, "D-11's switch is off: phones hold a board to move it (13)");
    await openRack(page, RACK_STAND_IN_ROUTE, 15);
    const before = await rackKeys(page);
    const middle = board(1);
    await page.getByRole("button", { name: `Board actions for ${middle.name}` }).click();
    const menu = page.getByRole("menu");
    await expect(menu.getByRole("menuitem", { name: RACK_COPY.moveLeft })).toBeDisabled();
    await menu.getByRole("menuitem", { name: RACK_COPY.moveRight }).click();
    await expect(statusRegion(page)).toHaveText(RACK_COPY.moved(middle.name));
    await expect.poll(() => rackKeys(page)).toEqual(movedOrder(before, middle.id, 1));
  });

  test("21p. a keyboard on a touch screen: Alt + → on the focused middle board moves it one place, and it keeps the middle and the focus", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "android", "one keyboard pass is enough; it runs on the android project");
    await openRack(page, RACK_STAND_IN_ROUTE, 15);
    const before = await rackKeys(page);
    const third = board(3);
    // A keyboard's focus brings the board to the middle and turns it.
    await boardButton(page, third.id).focus();
    await expect(boardArt(page, third.id)).toHaveAttribute("data-turn", "90");
    await expect(captionFor(page, third.name)).toBeVisible();

    await page.keyboard.press("Alt+ArrowRight");
    await expect(statusRegion(page)).toHaveText(RACK_COPY.moved(third.name));
    await expect.poll(() => rackKeys(page)).toEqual(movedOrder(before, third.id, 3));
    await expect(boardButton(page, third.id)).toBeFocused();
    await expect(boardArt(page, third.id)).toHaveAttribute("data-turn", "90");
    const { slot } = await rackFigures(page);
    await expect.poll(async () => (await rackFigures(page)).scrollLeft).toBe(3 * slot);
    expect(new URL(page.url()).pathname).toBe(RACK_STAND_IN_ROUTE);
  });
});
