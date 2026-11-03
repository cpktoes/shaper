import { expect, test, type Page } from "@playwright/test";
import { presetDesignFields } from "../lib/blanks/preset-blanks";
import { TAIL_PRESETS } from "../lib/geometry/board";
import { LIVE_DESIGN_RULES, designSideProfile } from "../lib/geometry/design";
import { buildOutline } from "../lib/geometry/outline";
import { BOARD_PRESETS } from "../lib/geometry/presets";
import { buildRackBoardArt, type RackBoardArt } from "../lib/geometry/rack-art";
import { HOVER_SLOT } from "../lib/geometry/rack-layout";
import { BANNER_DISMISSAL_KEY } from "../lib/models/banner-dismissal";
import { IN_PROGRESS_KEY } from "../lib/models/rack-order";
import { rackBoardFigures, rackModelsFromRows } from "../lib/models/rack-models";
import { RACK_STAND_IN_ROUTE, standInRackRows } from "../lib/models/rack-stand-in";
import { TOOLBAR_TIP_DISMISSAL_KEY } from "../lib/models/toolbar-tip";
import { freshPracticeRack } from "./helpers/practice-rack";

/**
 * The Board Rack turns a swallow and a diamond tail without a jump (quick 261103-drw). The founder,
 * on the live site: "the board spins with either a nipple or square tail then jumps to the correct
 * tail." The rack used to draw a turning board from cross-sections and swap to its TEMPLATE outline
 * near 89.5 degrees; now one rule draws every angle. These checks sweep the Fish (practice board 2,
 * a swallow) and a Shortboard with OUTLINE's Diamond button through the whole turn, one dot at a
 * time — the cursor on a computer, the held scroll on both phones — and read the drawing the shaper
 * sees: each board's `data-turn` and its body path, written by the rack's own frame loop.
 *
 * Every figure is a relation (CLAUDE.md Rule 1), read off the app's own geometry for the very board
 * on the rack: the drawing keeps the same points at every step; no point moves further than the
 * board's own size allows for the change in angle; the Fish's notch shows open from 10 degrees on;
 * and the diamond's V is at least as wide, half-way up, as the V itself seen at that angle.
 */

const STAND_INS = standInRackRows(15);
const MODELS = rackModelsFromRows(STAND_INS);
/** The Fish: practice board 2 (the four presets come first). */
const FISH_KEY = STAND_INS[1].id;
const FISH = MODELS[1].snapshot;
const FISH_ART = rackBoardFigures(FISH).art;
const FISH_OUTLINE = buildOutline(FISH.outline);

/** The board the first Start Shaping opens, with OUTLINE's Diamond button pressed. */
const FIRST_PRESET = presetDesignFields(BOARD_PRESETS[0]);
const DIAMOND_FIELDS = {
  ...FIRST_PRESET,
  outline: {
    ...FIRST_PRESET.outline,
    tail: TAIL_PRESETS.diamond.tail,
    tailAngle: TAIL_PRESETS.diamond.tailAngle,
    tailFullness: TAIL_PRESETS.diamond.tailFullness,
  },
};
const DIAMOND_OUTLINE = buildOutline(DIAMOND_FIELDS.outline);
const DIAMOND_ART = buildRackBoardArt(designSideProfile(DIAMOND_FIELDS, LIVE_DESIGN_RULES), DIAMOND_OUTLINE);

const DEGREE = Math.PI / 180;

/** Every test's setup: the sign-in banner and the toolbar tip dismissed, and a practice rack of the
 * test's own (e2e/helpers/practice-rack.ts). */
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

async function openRack(page: Page, count: number) {
  await page.goto(RACK_STAND_IN_ROUTE);
  await expect(page.locator("[data-rack-board]")).toHaveCount(count);
  await expect(page.locator("[data-rack-art][data-turn]")).toHaveCount(count);
}

/** Starts a Shortboard from the first Start Shaping, presses the Diamond tail button and comes back:
 * the board in progress stands first on the rack. */
async function startADiamondAndComeBack(page: Page) {
  await page.getByRole("button").filter({ hasText: "Start Shaping" }).first().click();
  await page.waitForURL("**/design/outline");
  await page.getByRole("button", { name: "diamond", exact: true }).click();
  await page.goBack();
  await page.waitForURL((url) => url.pathname === RACK_STAND_IN_ROUTE);
  await expect(page.locator("[data-rack-board]")).toHaveCount(STAND_INS.length + 1);
  await expect(page.locator("[data-rack-art][data-turn]")).toHaveCount(STAND_INS.length + 1);
  await expect(page.locator("[data-rack-board]").first()).toHaveAttribute("data-rack-board", IN_PROGRESS_KEY);
  await expect(page.locator(`[data-rack-art="${IN_PROGRESS_KEY}"]`)).toHaveAttribute("data-turn", "90");
}

interface Frame {
  turn: number;
  points: { x: number; y: number }[];
  /** The Fish's body path, read in the same frame: every board on a rack shares one scale. */
  fishPoints: { x: number; y: number }[];
}

function parsePath(d: string) {
  const numbers = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i + 1 < numbers.length; i += 2) points.push({ x: numbers[i], y: numbers[i + 1] });
  return points;
}

/** Two frames after the last move: the board's turn and its body path, and the Fish's body path. */
async function readFrame(page: Page, key: string): Promise<Frame> {
  const read = await page.evaluate(
    ([wanted, fish]) =>
      new Promise<{ turn: number; d: string; fishD: string }>((resolve) =>
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            const group = document.querySelector(`[data-rack-art="${wanted}"]`);
            const fishGroup = document.querySelector(`[data-rack-art="${fish}"]`);
            resolve({
              turn: Number(group?.getAttribute("data-turn")),
              d: group?.querySelector("path")?.getAttribute("d") ?? "",
              fishD: fishGroup?.querySelector("path")?.getAttribute("d") ?? "",
            });
          }),
        ),
      ),
    [key, FISH_KEY] as const,
  );
  return { turn: read.turn, points: parsePath(read.d), fishPoints: parsePath(read.fishD) };
}

/** Dots per millimetre: the drawn board stands tail to nose at every angle, so its height is its length. */
function scaleOf(points: { y: number }[], lengthMm: number) {
  const ys = points.map((p) => p.y);
  return (Math.max(...ys) - Math.min(...ys)) / lengthMm;
}

/** Where a horizontal line `y` crosses the closed drawn outline. */
function crossings(points: { x: number; y: number }[], y: number) {
  const xs: number[] = [];
  points.forEach((a, i) => {
    const b = points[(i + 1) % points.length];
    if ((a.y - y) * (b.y - y) < 0) xs.push(a.x + ((y - a.y) / (b.y - a.y)) * (b.x - a.x));
  });
  return xs;
}

/**
 * The relations every swept board must keep from one step to the next: the same number of points,
 * and no point moving further than 2 x (greatest deck height + greatest half-width) x the change in
 * angle — the unit test's rule (lib/geometry/rack-art.test.ts), widened by a degree for `data-turn`'s
 * whole-degree rounding.
 */
function expectSmooth(frames: Frame[], art: RackBoardArt, scale: number, label: string) {
  for (let i = 1; i < frames.length; i++) {
    const [before, after] = [frames[i - 1], frames[i]];
    expect(after.points.length, `${label}: points at ${after.turn} degrees`).toBe(frames[0].points.length);
    const bound = 2 * (art.maxDeck + art.maxHalf) * scale * (Math.abs(after.turn - before.turn) + 1) * DEGREE;
    let moved = 0;
    after.points.forEach((p, j) => {
      moved = Math.max(moved, Math.hypot(p.x - before.points[j].x, p.y - before.points[j].y));
    });
    expect(moved, `${label}: largest move from ${before.turn} to ${after.turn} degrees (bound ${bound.toFixed(2)} dots)`).toBeLessThanOrEqual(bound);
  }
}

/** The Fish: a line a quarter of the way up its notch crosses its outline twice edge-on (the notch
 * hidden behind the far tail tip) and four times from 10 degrees on (the notch open). */
function expectFishNotch(frames: Frame[], label: string) {
  const scale = scaleOf(frames[0].points, FISH.outline.length);
  let opened = 0;
  for (const frame of frames) {
    const floor = Math.max(...frame.points.map((p) => p.y));
    const count = crossings(frame.points, floor - (FISH_OUTLINE.centreCloseStation / 4) * scale).length;
    if (frame.turn === 0) expect(count, `${label}: crossings edge-on`).toBe(2);
    if (frame.turn >= 10) {
      expect(count, `${label}: crossings at ${frame.turn} degrees`).toBe(4);
      opened++;
    }
  }
  expect(frames.some((frame) => frame.turn === 0)).toBe(true);
  expect(opened).toBeGreaterThan(frames.length / 2);
}

/** The diamond: half-way up its V the drawing is at least as wide as the V there seen at the angle,
 * less a degree for `data-turn`'s rounding and a tenth of a dot for the path's two decimals. */
function expectDiamondV(frames: Frame[], scale: number, label: string) {
  const halfWayUp = DIAMOND_OUTLINE.effectiveDiamondDepth / 2;
  // The V runs straight from its tip (on the stringer) to the tail block's corner.
  const corner = DIAMOND_OUTLINE.points[0];
  const vHalfWidth =
    (corner.halfWidth * (halfWayUp - DIAMOND_OUTLINE.centreCloseStation)) / (corner.station - DIAMOND_OUTLINE.centreCloseStation);
  let checked = 0;
  for (const frame of frames) {
    if (frame.turn < 10 || frame.turn > 80) continue;
    const floor = Math.max(...frame.points.map((p) => p.y));
    const xs = crossings(frame.points, floor - halfWayUp * scale);
    const width = Math.max(...xs) - Math.min(...xs);
    const need = 2 * vHalfWidth * Math.sin((frame.turn - 1) * DEGREE) * scale - 0.1;
    expect(width, `${label}: the V's drawn width half-way up at ${frame.turn} degrees`).toBeGreaterThanOrEqual(need);
    checked++;
  }
  expect(checked).toBeGreaterThan(frames.length / 2);
}

/** The sweep ran the whole turn: edge-on at its start, turned at its end (within the dot the
 * browser may round the cursor or the scroll by). */
function expectEdgeOnToTurned(frames: Frame[]) {
  expect(frames[0].turn).toBe(0);
  expect(frames[frames.length - 1].turn).toBeGreaterThanOrEqual(89);
}

/** The diamond really is the board these relations were worked out for: drawn at the rack's one scale,
 * its height is that preset's length. */
function expectDiamondIsTheShortboard(frame: Frame) {
  const scale = scaleOf(frame.fishPoints, FISH.outline.length);
  const drawnLength = scaleOf(frame.points, 1) / scale;
  expect(Math.abs(drawnLength / DIAMOND_FIELDS.outline.length - 1)).toBeLessThan(0.01);
  return scale;
}

test.describe("the Board Rack on a computer turns a swallow and a diamond without a jump", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the hover rack's own pointer checks are desktop-only");
    await dismissBannerAndTip(page);
  });

  /** Sweeps the cursor from `from` to `to` one dot at a time at the boards' centre height, reading
   * board `key` after each step. */
  async function sweep(page: Page, key: string, from: number, to: number, y: number) {
    const frames: Frame[] = [];
    const step = Math.sign(to - from);
    for (let x = from; step > 0 ? x <= to : x >= to; x += step) {
      await page.mouse.move(x, y);
      frames.push(await readFrame(page, key));
    }
    return frames;
  }

  test("the Fish's swallow tail: the notch opens as it turns, with no square tail and no jump", async ({ page }) => {
    await openRack(page, STAND_INS.length);
    // On arrival only board 1 is turned, on its own slot centre: every slot is whole slots along from it.
    const box = await page.locator(`[data-rack-board="${STAND_INS[0].id}"]`).boundingBox();
    if (!box) throw new Error("no box for board 1");
    const first = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    // From a dot past board 3's slot centre (the Fish edge-on) to the Fish's own (turned).
    const frames = await sweep(page, FISH_KEY, first.x + 2 * HOVER_SLOT + 1, first.x + HOVER_SLOT, first.y);
    expectEdgeOnToTurned(frames);
    expectSmooth(frames, FISH_ART, scaleOf(frames[0].points, FISH.outline.length), "the Fish");
    expectFishNotch(frames, "the Fish");
  });

  test("a diamond tail: the V stays a V as it turns, with no spike and no jump", async ({ page }) => {
    await openRack(page, STAND_INS.length);
    await startADiamondAndComeBack(page);
    const box = await page.locator(`[data-rack-board="${IN_PROGRESS_KEY}"]`).boundingBox();
    if (!box) throw new Error("no box for the board in progress");
    const first = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    // From a dot past board 2's slot centre (the diamond edge-on) to the diamond's own (turned).
    const frames = await sweep(page, IN_PROGRESS_KEY, first.x + HOVER_SLOT + 1, first.x, first.y);
    expectEdgeOnToTurned(frames);
    const scale = expectDiamondIsTheShortboard(frames[0]);
    expectSmooth(frames, DIAMOND_ART, scale, "the diamond");
    expectDiamondV(frames, scale, "the diamond");
  });
});

test.describe("the Board Rack on a phone turns a swallow and a diamond without a jump", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "the swipe rack is a touch screen's (D-04)");
    await dismissBannerAndTip(page);
  });

  /** Holds the screen's middle `f` slots from board `index` (snapping off), for f from 1 to 0 one dot
   * at a time — toward the board from its right for board 0, from its left otherwise — reading board
   * `key` after each step, then puts the snapping back. */
  async function sweep(page: Page, key: string, index: number) {
    const slot = Number(await page.locator("[data-rack-kind]").getAttribute("data-rack-slot"));
    expect(slot).toBeGreaterThan(0);
    const frames: Frame[] = [];
    // From a dot more than a slot away (edge-on) to the middle (turned).
    for (let off = Math.ceil(slot) + 1; off >= 0; off--) {
      await page.evaluate((left) => {
        const box = document.querySelector<HTMLElement>("[data-rack-scroller]");
        if (!box) throw new Error("no rack on the page");
        box.style.scrollSnapType = "none";
        box.scrollLeft = left;
      }, index === 0 ? off : index * slot - off);
      frames.push(await readFrame(page, key));
    }
    await page.evaluate(() => {
      const box = document.querySelector<HTMLElement>("[data-rack-scroller]");
      if (box) box.style.scrollSnapType = "";
    });
    return frames;
  }

  test("the Fish's swallow tail: the notch opens as it turns, with no square tail and no jump", async ({ page }) => {
    await openRack(page, STAND_INS.length);
    const frames = await sweep(page, FISH_KEY, 1);
    expectEdgeOnToTurned(frames);
    expectSmooth(frames, FISH_ART, scaleOf(frames[0].points, FISH.outline.length), "the Fish");
    expectFishNotch(frames, "the Fish");
  });

  test("a diamond tail: the V stays a V as it turns, with no spike and no jump", async ({ page }) => {
    await openRack(page, STAND_INS.length);
    await startADiamondAndComeBack(page);
    const frames = await sweep(page, IN_PROGRESS_KEY, 0);
    expectEdgeOnToTurned(frames);
    const scale = expectDiamondIsTheShortboard(frames[0]);
    expectSmooth(frames, DIAMOND_ART, scale, "the diamond");
    expectDiamondV(frames, scale, "the diamond");
  });
});
