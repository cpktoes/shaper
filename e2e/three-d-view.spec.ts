import { expect, test, type Locator, type Page } from "@playwright/test";
import { THREE_D_COPY } from "../components/3d/three-d-copy";
import { presetDesignFields } from "../lib/blanks/preset-blanks";
import { BOARD_PRESETS } from "../lib/geometry/presets";
import { AT_REST, BOTTOM_UP, rackTurn, WALK_VIEWS } from "../lib/geometry/shaping-bay";
import { VIEW_NAMES, type Quat } from "../lib/geometry/view-3d";
import { DEFAULT_VOLUME_SPEC } from "../lib/geometry/volume";
import { BANNER_DISMISSAL_KEY } from "../lib/models/banner-dismissal";
import type { DesignSnapshotFields } from "../lib/models/design-snapshot";
import { OPEN_BOARD_STORAGE_KEY, openBoardCopyJson } from "../lib/models/open-board";
import { TOOLBAR_TIP_DISMISSAL_KEY } from "../lib/models/toolbar-tip";
import { countDifferent, decodePng } from "./helpers/canvas-pixels";

/**
 * Turning the 3D board (Phase 16, plan 07, UI-SPEC §3 and §5): a drag turns the board like a ball under the hand
 * while the camera and the room's lights stay where they are, a let-go board glides to rest (never under reduced
 * motion), and nothing ever turns it by itself.
 *
 * The host reports what the tests read: `data-turn` (the board's turn, four numbers), `data-viewer` (where the viewer
 * stands), `data-room` (where the camera and the strips' ends are, read back from the scene after every frame) and
 * `data-frames` (how many frames it drew).
 */

/** WebKit draws its first frame more slowly on the suite's development server (about 5 s measured). */
const FIRST_FRAME_MS = 30_000;

async function dismissStrips(page: Page) {
  await page.addInitScript(
    ([bannerKey, tipKey]) => {
      window.sessionStorage.setItem(bannerKey, "true");
      window.localStorage.setItem(tipKey, "true");
    },
    [BANNER_DISMISSAL_KEY, TOOLBAR_TIP_DISMISSAL_KEY] as const,
  );
}

function boardHost(page: Page) {
  return page.locator("[data-board-3d]");
}

async function frames(host: Locator) {
  return Number((await host.getAttribute("data-frames")) ?? 0);
}

async function waitForBoard(page: Page) {
  const host = boardHost(page);
  await expect(host).toHaveAttribute("data-board-state", "ready", { timeout: FIRST_FRAME_MS });
  await expect.poll(async () => frames(host), { timeout: FIRST_FRAME_MS }).toBeGreaterThanOrEqual(1);
  return host;
}

async function turnOf(host: Locator): Promise<number[]> {
  return ((await host.getAttribute("data-turn")) ?? "").split(" ").map(Number);
}

/** How far round the room the viewer stands. */
async function azimuthOf(host: Locator): Promise<number> {
  return Number(((await host.getAttribute("data-viewer")) ?? "").split(" ")[0]);
}

/** An azimuth as the screen reports it. */
const wrapped = (deg: number) => (deg > 180 ? deg - 360 : deg);

/** The canvas host's centre and its shorter side, in page dots. */
async function hostGeometry(host: Locator) {
  const box = await host.boundingBox();
  if (!box) throw new Error("the 3D canvas has no box");
  return { x: box.x + box.width / 2, y: box.y + box.height / 2, short: Math.min(box.width, box.height) };
}

/** A drag across the canvas by (dx, dy) from its centre: a finger on the Android phone, the mouse elsewhere. */
async function dragBoard(page: Page, projectName: string, dx: number, dy: number, steps = 8) {
  const { x, y } = await hostGeometry(boardHost(page));
  if (projectName === "android") {
    // A trusted touch through the browser's own input pipeline (e2e/touch-drag.spec.ts): one finger turns the board.
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    for (let i = 1; i <= steps; i++) {
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: x + (dx * i) / steps, y: y + (dy * i) / steps }],
      });
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await cdp.detach();
    return;
  }
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps });
  await page.mouse.up();
}

/**
 * A quick flick to the right, delivered inside the page in one go, and when `data-turn` changed afterwards (ms
 * after the release). The suite's browsers draw the board without a graphics card, so each frame takes a few
 * hundred milliseconds and a driven mouse's moves arrive that far apart — far slower than any hand. Firing the
 * flick's events from the page itself is the only way to hand the screen a drag as fast as a real one; case 1
 * proves the same handlers with a real mouse and a real finger.
 */
async function flick(page: Page): Promise<{ changesAfterRelease: number[] }> {
  return boardHost(page).evaluate(async (host) => {
    const box = host.getBoundingClientRect();
    const x = box.left + box.width / 2;
    const y = box.top + box.height / 2;
    const fire = (type: string, at: number) =>
      host.dispatchEvent(
        new PointerEvent(type, {
          pointerId: 41,
          pointerType: "touch",
          isPrimary: true,
          clientX: x + at,
          clientY: y,
          bubbles: true,
          cancelable: true,
        }),
      );
    const changes: number[] = [];
    let released = 0;
    let atRelease = "";
    // The observer is told after the fact, so it compares values: only a turn unlike the one at the release counts.
    const watch = new MutationObserver(() => {
      const now = host.getAttribute("data-turn") ?? "";
      if (released && now !== atRelease) {
        changes.push(performance.now() - released);
        atRelease = now;
      }
    });
    watch.observe(host, { attributes: true, attributeFilter: ["data-turn"] });
    fire("pointerdown", 0);
    for (let i = 1; i <= 6; i++) fire("pointermove", (i * box.height) / 30);
    fire("pointerup", box.height / 5);
    released = performance.now();
    atRelease = host.getAttribute("data-turn") ?? "";
    await new Promise((resolve) => setTimeout(resolve, 2_500));
    watch.disconnect();
    return { changesAfterRelease: changes };
  });
}

/** Waits until the board has stopped turning: the same turn across a quarter second. */
async function settled(host: Locator) {
  let last = "";
  await expect
    .poll(
      async () => {
        const now = (await host.getAttribute("data-turn")) ?? "";
        const same = now === last;
        last = now;
        return same;
      },
      { intervals: [250], timeout: 10_000 },
    )
    .toBe(true);
}

test.beforeEach(async ({ page }) => {
  test.setTimeout(120_000);
  await dismissStrips(page);
});

test.describe("turning the 3D board", () => {
  test("1. a drag turns the board under the room's fixed camera and lights, and the picture changes", async ({ page }, testInfo) => {
    await page.goto("/design/3d");
    const host = await waitForBoard(page);
    await settled(host);
    const turnBefore = await turnOf(host);
    expect(turnBefore).toEqual([0, 0, 0, 1]);
    const roomBefore = await host.getAttribute("data-room");
    expect(roomBefore).toBeTruthy();
    const before = decodePng(await host.screenshot());

    const { short } = await hostGeometry(host);
    await dragBoard(page, testInfo.project.name, short / 4, 0);
    await settled(host);

    const turnAfter = await turnOf(host);
    expect(turnAfter.some((v, i) => Math.abs(v - turnBefore[i]) > 1e-3)).toBe(true);
    // The camera and the lights are where they were: only the board turned (D-10).
    expect(await host.getAttribute("data-room")).toBe(roomBefore);
    const after = decodePng(await host.screenshot());
    expect(countDifferent(before.rgba, after.rgba, 2) / (after.width * after.height)).toBeGreaterThan(0.01);
    // The page never scrolled from inside the drawing.
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  });

  test("3. let go of a moving drag and the board glides on, then comes to rest", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "one computer proves the glide");
    await page.goto("/design/3d");
    const host = await waitForBoard(page);
    await settled(host);
    const before = await host.getAttribute("data-turn");
    const { changesAfterRelease } = await flick(page);
    // It kept turning after the release, for at least 100 ms, and stopped within the glide (600 ms) plus the
    // last frame's own wait.
    expect(changesAfterRelease.length).toBeGreaterThan(0);
    const lastChange = Math.max(...changesAfterRelease);
    expect(lastChange).toBeGreaterThanOrEqual(100);
    expect(lastChange).toBeLessThan(2_000);
    expect(await host.getAttribute("data-turn")).not.toBe(before);
    const rest = await host.getAttribute("data-turn");
    await page.waitForTimeout(300);
    expect(await host.getAttribute("data-turn")).toBe(rest);
  });

  test("4. an idle board draws nothing: the board never turns by itself", async ({ page }) => {
    await page.goto("/design/3d");
    const host = await waitForBoard(page);
    await settled(host);
    await page.waitForTimeout(500);
    const before = await frames(host);
    const turn = await host.getAttribute("data-turn");
    await page.waitForTimeout(2_000);
    expect(await frames(host)).toBe(before);
    expect(await host.getAttribute("data-turn")).toBe(turn);
  });
});

test.describe("turning the 3D board under reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("2. with reduced motion the board stops dead where it was let go", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "one computer proves the rule");
    await page.goto("/design/3d");
    const host = await waitForBoard(page);
    await settled(host);
    const before = await host.getAttribute("data-turn");
    // The same flick as case 3: the drag turned the board, and nothing changed after the release — read 100 ms and
    // 800 ms on, and every change in between.
    const { changesAfterRelease } = await flick(page);
    expect(changesAfterRelease).toEqual([]);
    const soon = await host.getAttribute("data-turn");
    expect(soon).not.toBe(before);
    await page.waitForTimeout(100);
    expect(await host.getAttribute("data-turn")).toBe(soon);
    await page.waitForTimeout(700);
    expect(await host.getAttribute("data-turn")).toBe(soon);
  });
});

/** The same turn to `tol`, either way round: a quaternion and its negative turn a board identically. */
function isTurn(got: number[], want: Quat, tol = 1e-3) {
  const same = got.every((v, i) => Math.abs(v - want[i]) <= tol);
  const opposite = got.every((v, i) => Math.abs(v + want[i]) <= tol);
  return same || opposite;
}

function viewsGroup(page: Page) {
  return page.getByRole("group", { name: THREE_D_COPY.viewsGroup, exact: true });
}

function viewButton(page: Page, label: string) {
  return viewsGroup(page).getByRole("button", { name: label, exact: true });
}

/** What the hidden live region says. */
function spoken(page: Page) {
  return page.locator("[data-three-d-spoken]");
}

/** The default board, kept in this browser as a saved board of an account that is locked (a lock belongs to a saved
 * board), as e2e/rails-advanced.spec.ts keeps one. */
async function keepLockedBoard(page: Page) {
  const preset = BOARD_PRESETS.find((p) => p.name === "Shortboard");
  if (!preset) throw new Error("no Shortboard preset");
  const fields: DesignSnapshotFields = {
    ...presetDesignFields(preset),
    volume: DEFAULT_VOLUME_SPEC,
    finsImportTemplate: true,
    railsImportFoilThickness: true,
    boardName: "",
    finSystem: "fcs2",
  };
  const raw = openBoardCopyJson(fields, {
    modelId: "three-d-locked-board",
    ownerId: "three-d-test-account",
    locked: true,
    dirty: false,
  });
  await page.addInitScript(([key, value]) => window.localStorage.setItem(key, value), [OPEN_BOARD_STORAGE_KEY, raw] as const);
}

test.describe("the five views, Reset View and the keys", () => {
  test("5. on Turn the Board the buttons move the board, on Walk Around you, and a screen reader hears which", async ({ page }) => {
    // Twelve moves on browsers that draw without a graphics card.
    test.setTimeout(300_000);
    await page.goto("/design/3d");
    const host = await waitForBoard(page);
    const land = async (want: Quat, words: string) => {
      await expect.poll(async () => isTurn(await turnOf(host), want), { timeout: 10_000 }).toBe(true);
      await expect(spoken(page)).toHaveText(words);
      await settled(host);
    };
    await viewButton(page, THREE_D_COPY.views.bottom).click();
    await land(rackTurn(BOTTOM_UP), THREE_D_COPY.viewSpoken.bottom);
    await viewButton(page, THREE_D_COPY.views.deck).click();
    await land(rackTurn(AT_REST), THREE_D_COPY.viewSpoken.deck);
    await viewButton(page, THREE_D_COPY.views.nose).click();
    await land(rackTurn({ ...AT_REST, swing: 180 }), THREE_D_COPY.endTowardYou.nose);
    await viewButton(page, THREE_D_COPY.views.tail).click();
    await land(rackTurn(AT_REST), THREE_D_COPY.endTowardYou.tail);
    expect(await azimuthOf(host)).toBeCloseTo(0, 1);

    await page.getByRole("group", { name: THREE_D_COPY.modeGroup, exact: true }).getByRole("button", { name: THREE_D_COPY.modeWalk, exact: true }).click();
    for (const name of VIEW_NAMES) {
      await viewButton(page, THREE_D_COPY.views[name]).click();
      await expect.poll(async () => azimuthOf(host), { timeout: 10_000 }).toBeCloseTo(wrapped(WALK_VIEWS[name].azimuthDeg), 1);
      await expect(spoken(page)).toHaveText(THREE_D_COPY.viewSpoken[name]);
      await settled(host);
    }
  });

  test("6. Reset View brings back the first view", async ({ page }) => {
    await page.goto("/design/3d");
    const host = await waitForBoard(page);
    await viewButton(page, THREE_D_COPY.views.bottom).click();
    await expect.poll(async () => isTurn(await turnOf(host), rackTurn(BOTTOM_UP)), { timeout: 10_000 }).toBe(true);
    await viewButton(page, THREE_D_COPY.views.nose).click();
    await expect.poll(async () => isTurn(await turnOf(host), rackTurn({ ...BOTTOM_UP, swing: 180 })), { timeout: 10_000 }).toBe(true);
    await viewButton(page, THREE_D_COPY.resetView).click();
    await expect.poll(async () => isTurn(await turnOf(host), [0, 0, 0, 1]), { timeout: 10_000 }).toBe(true);
    await expect(host).toHaveAttribute("data-crop", "1 0.0000 0.0000");
    await expect(spoken(page)).toHaveText(THREE_D_COPY.resetSpoken);
  });

  test("7. with the keyboard: the arrows turn the board without scrolling the page, Home resets, Tab leaves", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "a keyboard is a computer's");
    await page.goto("/design/3d");
    const host = await waitForBoard(page);
    await host.focus();
    const scrollBefore = await page.evaluate(() => [window.scrollY, document.scrollingElement?.scrollTop ?? 0]);
    for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowDown");
    expect(isTurn(await turnOf(host), [0, 0, 0, 1])).toBe(false);
    expect(await page.evaluate(() => [window.scrollY, document.scrollingElement?.scrollTop ?? 0])).toEqual(scrollBefore);
    await page.keyboard.press("Home");
    await expect.poll(async () => isTurn(await turnOf(host), [0, 0, 0, 1])).toBe(true);
    await expect(spoken(page)).toHaveText(THREE_D_COPY.resetSpoken);
    // One Tab stop: the next Tab leaves the canvas.
    await expect(host).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(host).not.toBeFocused();
    // The canvas is described by the hidden instructions.
    const describedBy = await host.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    await expect(page.locator(`[id="${describedBy}"]`)).toHaveText(THREE_D_COPY.canvasDescription);
  });

  test("8. the view buttons are one-shot actions in a group named Views, one line each at the narrowest panel", async ({ page }, testInfo) => {
    if (testInfo.project.name === "desktop") await page.setViewportSize({ width: 820, height: 800 });
    await page.goto("/design/3d");
    await waitForBoard(page);
    await expect(viewsGroup(page)).toBeVisible();
    const buttons = viewsGroup(page).getByRole("button");
    await expect(buttons).toHaveCount(6);
    for (let i = 0; i < 6; i++) await expect(buttons.nth(i)).not.toHaveAttribute("aria-pressed", /.*/);
    for (const label of [THREE_D_COPY.views.bottom, THREE_D_COPY.resetView]) {
      const fits = await viewButton(page, label).evaluate((el) => {
        const range = document.createRange();
        range.selectNodeContents(el);
        const lines = new Set([...range.getClientRects()].map((r) => Math.round(r.top)));
        return { lines: lines.size, overflow: el.scrollWidth > el.clientWidth };
      });
      expect(fits).toEqual({ lines: 1, overflow: false });
    }
  });

  test("9. with no 3D drawing the view buttons have nothing to turn and are dimmed", async ({ page }) => {
    await page.addInitScript(() => {
      HTMLCanvasElement.prototype.getContext = function () {
        return null;
      } as typeof HTMLCanvasElement.prototype.getContext;
    });
    await page.goto("/design/3d");
    await expect(boardHost(page)).toHaveAttribute("data-board-state", "no-webgl", { timeout: FIRST_FRAME_MS });
    for (const label of [...VIEW_NAMES.map((n) => THREE_D_COPY.views[n]), THREE_D_COPY.resetView]) {
      await expect(viewButton(page, label)).toBeDisabled();
    }
    // The bay's controls dim with them, and the switch.
    const racks = page.locator("[data-three-d-racks]");
    for (const name of [THREE_D_COPY.raiseNose, THREE_D_COPY.raiseTail, THREE_D_COPY.rotateOnSide]) {
      await expect(racks.getByRole("slider", { name, exact: true })).toBeDisabled();
    }
    await expect(racks.getByRole("slider", { name: THREE_D_COPY.lookDownRail, exact: true })).toBeDisabled();
    const mode = page.getByRole("group", { name: THREE_D_COPY.modeGroup, exact: true }).getByRole("button");
    await expect(mode).toHaveCount(2);
    for (const button of await mode.all()) await expect(button).toBeDisabled();
  });

  test("10. a locked board can still be turned: the view buttons are never greyed by the lock", async ({ page }) => {
    await keepLockedBoard(page);
    await page.goto("/design/3d");
    const host = await waitForBoard(page);
    // Side alone is dimmed, by the mode rather than the lock.
    for (const label of [THREE_D_COPY.views.deck, THREE_D_COPY.views.bottom, THREE_D_COPY.views.nose, THREE_D_COPY.views.tail, THREE_D_COPY.resetView]) {
      await expect(viewButton(page, label)).toBeEnabled();
    }
    // The bay's controls only change the picture, so a locked board keeps them too.
    const racks = page.locator("[data-three-d-racks]");
    for (const name of [THREE_D_COPY.raiseNose, THREE_D_COPY.raiseTail, THREE_D_COPY.rotateOnSide, THREE_D_COPY.lookDownRail]) {
      await expect(racks.getByRole("slider", { name, exact: true })).toBeEnabled();
    }
    await viewButton(page, THREE_D_COPY.views.bottom).click();
    await expect.poll(async () => isTurn(await turnOf(host), rackTurn(BOTTOM_UP)), { timeout: 10_000 }).toBe(true);
  });
});
