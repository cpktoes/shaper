import { expect, test, type Locator, type Page } from "@playwright/test";
import { BANNER_DISMISSAL_KEY } from "../lib/models/banner-dismissal";
import { TOOLBAR_TIP_DISMISSAL_KEY } from "../lib/models/toolbar-tip";
import { countDifferent, decodePng } from "./helpers/canvas-pixels";

/**
 * Turning the 3D board (Phase 16, plan 07, UI-SPEC §3 and §5): a drag turns the board like a ball under the hand
 * while the camera and the room's lights stay where they are, a let-go board glides to rest (never under reduced
 * motion), and nothing ever turns it by itself.
 *
 * The host reports what the tests read: `data-turn` (the board's turn, four numbers), `data-room` (where the camera
 * and the four lights are, read back from the scene after every frame) and `data-frames` (how many frames it drew).
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
