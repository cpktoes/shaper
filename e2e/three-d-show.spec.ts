import { expect, test, type Locator, type Page } from "@playwright/test";
import { THREE_D_COPY } from "../components/3d/three-d-copy";
import { VIEW_TURNS, type Quat, type ViewName } from "../lib/geometry/view-3d";
import { BANNER_DISMISSAL_KEY } from "../lib/models/banner-dismissal";
import { TOOLBAR_TIP_DISMISSAL_KEY } from "../lib/models/toolbar-tip";
import { countDifferent, decodePng } from "./helpers/canvas-pixels";

/**
 * The 3D panel's SHOW section (Phase 16, plan 10, UI-SPEC §1, §3 "Fins", §6): the board's fins stand on its bottom at
 * their FINS placement, and the Fins tick box hides and shows them without moving the view.
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

/** The same turn to `tol`, either way round: a quaternion and its negative turn a board identically. */
function isTurn(got: number[], want: Quat, tol = 1e-3) {
  return got.every((v, i) => Math.abs(v - want[i]) <= tol) || got.every((v, i) => Math.abs(v + want[i]) <= tol);
}

/** Waits until the board has stopped turning and the scene has drawn its last frame. */
async function settled(host: Locator) {
  let last = "";
  await expect
    .poll(
      async () => {
        const now = `${await host.getAttribute("data-turn")} ${await frames(host)}`;
        const same = now === last;
        last = now;
        return same;
      },
      { intervals: [300], timeout: 15_000 },
    )
    .toBe(true);
}

/** Presses a view button and waits for the board to arrive and come to rest there. */
async function showView(page: Page, host: Locator, name: ViewName) {
  await page.getByRole("group", { name: THREE_D_COPY.viewsGroup, exact: true }).getByRole("button", {
    name: THREE_D_COPY.views[name],
    exact: true,
  }).click();
  await expect.poll(async () => isTurn(await turnOf(host), VIEW_TURNS[name]), { timeout: 10_000 }).toBe(true);
  await settled(host);
}

/** The canvas as drawn now, once the scene has drawn every frame asked of it. */
async function picture(host: Locator) {
  await settled(host);
  return decodePng(await host.screenshot());
}

function finsBox(page: Page) {
  return page.getByRole("checkbox", { name: THREE_D_COPY.fins, exact: true });
}

test.beforeEach(async ({ page }) => {
  test.setTimeout(120_000);
  await dismissStrips(page);
});

test.describe("the 3D board's fins", () => {
  test("1. the thruster's fins stand on the board, and the Fins box hides and shows them without moving the view", async ({
    page,
  }, testInfo) => {
    await page.goto("/design/3d");
    const host = await waitForBoard(page);
    await expect(finsBox(page)).toBeChecked();
    await expect(finsBox(page)).toBeEnabled();

    await showView(page, host, "bottom");
    const turn = await host.getAttribute("data-turn");
    const crop = await host.getAttribute("data-crop");
    const withFins = await picture(host);

    await finsBox(page).click();
    await expect(finsBox(page)).not.toBeChecked();
    const without = await picture(host);
    // Seen from straight below, each fin is edge-on — a thin dark line, about a thousandth of the canvas for the
    // three of them (the plan's 0.2% assumed more; measured 0.14% on a computer).
    const share = countDifferent(withFins.rgba, without.rgba, 2) / (without.width * without.height);
    expect(share).toBeGreaterThan(0.0005);
    // The view stays exactly as it was.
    expect(await host.getAttribute("data-turn")).toBe(turn);
    expect(await host.getAttribute("data-crop")).toBe(crop);

    await finsBox(page).click();
    await expect(finsBox(page)).toBeChecked();
    const again = await picture(host);
    expect(await host.getAttribute("data-turn")).toBe(turn);
    if (testInfo.project.name === "desktop") {
      expect(countDifferent(withFins.rgba, again.rgba, 0)).toBe(0);
    } else {
      expect(countDifferent(withFins.rgba, again.rgba, 2) / (again.width * again.height)).toBeLessThan(0.0005);
    }
  });
});
