import { expect, test, type Locator, type Page } from "@playwright/test";
import { THREE_D_COPY } from "../components/3d/three-d-copy";
import { rackTurn } from "../lib/geometry/shaping-bay";
import { type Quat } from "../lib/geometry/view-3d";
import { BANNER_DISMISSAL_KEY } from "../lib/models/banner-dismissal";
import { TOOLBAR_TIP_DISMISSAL_KEY } from "../lib/models/toolbar-tip";
import { decodePng } from "./helpers/canvas-pixels";

/**
 * The shaping bay (Phase 16, plan 18, D-43, D-44): a drawn room, the board on its racks, one control per plane in the
 * panel, and two ways a drag can go.
 *
 * The host reports what the tests read: `data-turn` (the board's turn), `data-room` (the camera and the strips' ends,
 * read back from the scene after every frame), `data-place` (the board's centre in the room), `data-racks` (their
 * swing), `data-viewer` (azimuth, elevation, sight), `data-mode` and `data-bay`.
 */

/** WebKit draws its first frame more slowly on the suite's development server. */
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

async function waitForBoard(page: Page) {
  const host = boardHost(page);
  await expect(host).toHaveAttribute("data-board-state", "ready", { timeout: FIRST_FRAME_MS });
  await expect
    .poll(async () => Number((await host.getAttribute("data-frames")) ?? 0), { timeout: FIRST_FRAME_MS })
    .toBeGreaterThanOrEqual(1);
  return host;
}

async function turnOf(host: Locator): Promise<number[]> {
  return ((await host.getAttribute("data-turn")) ?? "").split(" ").map(Number);
}

async function placeOf(host: Locator): Promise<number[]> {
  return ((await host.getAttribute("data-place")) ?? "").split(" ").map(Number);
}

/** The same turn to `tol`, either way round: a quaternion and its negative turn a board identically. */
function isTurn(got: number[], want: Quat, tol = 2e-3) {
  const same = got.every((v, i) => Math.abs(v - want[i]) <= tol);
  const opposite = got.every((v, i) => Math.abs(v + want[i]) <= tol);
  return same || opposite;
}

/** A slider by its spoken name. */
function slider(page: Page, name: string) {
  return page.getByRole("slider", { name, exact: true });
}

/** The canvas's picture with the corner row out of it (a screenshot of the host covers that row). */
async function canvasPicture(page: Page) {
  await page.addStyleTag({ content: "[data-viewer-zoom], [data-viewer-toolbar] { visibility: hidden !important; }" });
  return decodePng(await boardHost(page).screenshot());
}

test.beforeEach(async ({ page }) => {
  test.setTimeout(120_000);
  await dismissStrips(page);
});

test.describe("the shaping bay", () => {
  test("1. the board lies in a drawn room, and Rotate on Side rolls it under the strips with the room and the viewer still", async ({
    page,
  }) => {
    await page.goto("/design/3d");
    const host = await waitForBoard(page);

    const { rgba, width, height } = await canvasPicture(page);
    const at = (x: number, y: number) => {
      const i = 4 * (Math.round(y) * width + Math.round(x));
      return [rgba[i], rgba[i + 1], rgba[i + 2]];
    };
    // The canvas's upper middle is the room's blue wall, not the theme's ground.
    const [wr, wg, wb] = at(width / 2, height * 0.16);
    expect(wb).toBeGreaterThan(2 * wr);
    expect(wb).toBeGreaterThan(wg);
    // A run of strip-bright pixels clear of the board, in the outer quarters of the picture.
    let longest = 0;
    for (let y = 0; y < height; y++) {
      let run = 0;
      for (let x = 0; x < width * 0.28; x++) {
        const [r, g, b] = at(x, y);
        run = r > 230 && g > 230 && b > 230 ? run + 1 : 0;
        longest = Math.max(longest, run);
      }
    }
    expect(longest).toBeGreaterThanOrEqual(8);

    const roll = slider(page, THREE_D_COPY.rotateOnSide);
    await expect(page.locator("[data-three-d-racks]").getByRole("slider", { name: THREE_D_COPY.rotateOnSide })).toHaveCount(1);
    await expect(roll).toHaveValue("0");
    const room = await host.getAttribute("data-room");
    const before = await placeOf(host);
    await roll.focus();
    for (let i = 0; i < 5; i++) await roll.press("ArrowRight");
    await expect.poll(async () => isTurn(await turnOf(host), rackTurn({ swing: 0, lift: 0, roll: 5 })), { timeout: 10_000 }).toBe(true);
    await expect(page.locator("[data-three-d-racks]").getByText(`${THREE_D_COPY.rotateOnSide} — 5° right`, { exact: true })).toBeVisible();
    await expect.poll(async () => (await placeOf(host))[1]).toBeGreaterThan(before[1]);
    expect(await host.getAttribute("data-room")).toBe(room);
  });
});
