import { expect, test, type Locator, type Page } from "@playwright/test";
import { THREE_D_COPY } from "../components/3d/three-d-copy";
import { BOARD_NAME_COPY } from "../components/design/board-name-copy";
import { presetDesignFields } from "../lib/blanks/preset-blanks";
import { BOARD_PRESETS } from "../lib/geometry/presets";
import { inchesToMm } from "../lib/geometry/units";
import { DEFAULT_VOLUME_SPEC } from "../lib/geometry/volume";
import { BANNER_DISMISSAL_KEY } from "../lib/models/banner-dismissal";
import type { DesignSnapshotFields } from "../lib/models/design-snapshot";
import { OPEN_BOARD_STORAGE_KEY, openBoardCopyJson } from "../lib/models/open-board";
import { TOOLBAR_TIP_DISMISSAL_KEY } from "../lib/models/toolbar-tip";
import { THEME_STORAGE_KEY } from "../lib/theme";
import { countDifferent, countUnlike, decodePng, hexToRgb } from "./helpers/canvas-pixels";
import { storedOpenBoard } from "./helpers/open-board";

/**
 * The 3D screen (Phase 16, plan 06): the shaper's board drawn as a lit solid from the litres' own surface, on its
 * own route, with honest messages when it can't be drawn.
 *
 * Every word comes from `THREE_D_COPY`. The canvas reports what it is doing on its host: `data-board-state`,
 * `data-frames` (how many times the scene has drawn) and `data-triangles` (the surface's triangle count). All
 * three projects draw with no browser flags (research §B); the iPhone's WebKit draws on the Mac's own graphics.
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

async function waitForBoard(page: Page) {
  const host = boardHost(page);
  await expect(host).toHaveAttribute("data-board-state", "ready", { timeout: FIRST_FRAME_MS });
  await expect.poll(async () => frames(host), { timeout: FIRST_FRAME_MS }).toBeGreaterThanOrEqual(1);
  return host;
}

async function frames(host: Locator) {
  return Number((await host.getAttribute("data-frames")) ?? 0);
}

/** A canvas message's two lines are on screen and no board is drawn. */
async function expectMessage(page: Page, message: { line1: string; line2: string }, state: string) {
  const host = boardHost(page);
  await expect(host).toHaveAttribute("data-board-state", state, { timeout: FIRST_FRAME_MS });
  const box = page.locator("[data-canvas-message]");
  await expect(box.getByText(message.line1, { exact: true })).toBeVisible();
  await expect(box.getByText(message.line2, { exact: true })).toBeVisible();
  // The box is the contract's: centred, at most 280 dots wide.
  const width = await box.locator("div").first().evaluate((el) => el.getBoundingClientRect().width);
  expect(width).toBeLessThanOrEqual(280);
}

/** A preset as its card opens it, kept in this browser as an earlier visit would have left it. */
async function keepBoard(page: Page, presetName: string, lengthMm?: number) {
  const preset = BOARD_PRESETS.find((p) => p.name === presetName);
  if (!preset) throw new Error(`no ${presetName} preset`);
  const base = presetDesignFields(preset);
  const fields: DesignSnapshotFields = {
    ...base,
    outline: lengthMm === undefined ? base.outline : { ...base.outline, length: lengthMm as typeof base.outline.length },
    volume: DEFAULT_VOLUME_SPEC,
    finsImportTemplate: true,
    railsImportFoilThickness: true,
    boardName: "",
    finSystem: "fcs2",
  };
  const raw = openBoardCopyJson(fields, { modelId: null, ownerId: null, locked: false, dirty: true });
  await page.addInitScript(([key, value]) => window.localStorage.setItem(key, value), [OPEN_BOARD_STORAGE_KEY, raw] as const);
}

/** The canvas host's picture, decoded. */
async function hostPixels(host: Locator) {
  return decodePng(await host.screenshot());
}

test.beforeEach(async ({ page }) => {
  test.setTimeout(120_000);
  await dismissStrips(page);
});

test.describe("the 3D screen", () => {
  test("1. /design/3d draws the board lit, under its tab and the panel's title", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the tracer runs on the computer");
    await page.goto("/design/3d");
    // One read-only tab is drawn as the band's label (TabbedPanel), not as a tab control.
    await expect(page.getByRole("main").getByText(THREE_D_COPY.tab, { exact: true })).toBeVisible();
    await expect(page.getByText(THREE_D_COPY.title, { exact: true })).toBeVisible();
    await expect(page.getByText(THREE_D_COPY.subtitle, { exact: true })).toBeVisible();
    const host = await waitForBoard(page);
    expect(Number(await host.getAttribute("data-triangles"))).toBeGreaterThan(0);
    await expect(page).toHaveTitle(THREE_D_COPY.pageTitle);
  });

  test("2. the board is really drawn: much of the canvas is unlike its ground", async ({ page }) => {
    await page.goto("/design/3d");
    const host = await waitForBoard(page);
    const ground = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--surf-canvas").trim());
    const { rgba, width, height } = await hostPixels(host);
    const unlike = countUnlike(rgba, hexToRgb(ground), 6);
    expect(unlike / (width * height)).toBeGreaterThan(0.02);
  });

  test("3. a browser with no 3D drawing says so in plain words, and draws no board", async ({ page }) => {
    await page.addInitScript(() => {
      HTMLCanvasElement.prototype.getContext = function () {
        return null;
      } as typeof HTMLCanvasElement.prototype.getContext;
    });
    await page.goto("/design/3d");
    await expectMessage(page, THREE_D_COPY.browserCantDraw, "no-webgl");
    await expect(boardHost(page).locator("canvas")).toHaveCount(0);
  });

  test("4. if the drawing code never arrives, the screen says it didn't load", async ({ page, context }) => {
    // First learn which script carries the drawing code: the one whose text holds three.js's renderer.
    const scene: string[] = [];
    page.on("response", async (response) => {
      if (response.request().resourceType() !== "script") return;
      const body = await response.text().catch(() => "");
      if (body.includes("THREE.WebGLRenderer")) scene.push(response.url());
    });
    await page.goto("/design/3d");
    await waitForBoard(page);
    await expect.poll(() => scene.length, { timeout: 10_000 }).toBeGreaterThan(0);
    await page.close();

    const fresh = await context.newPage();
    for (const url of scene) await fresh.route(url, (route) => route.abort());
    const errors: string[] = [];
    fresh.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await fresh.goto("/design/3d");
    await expectMessage(fresh, THREE_D_COPY.didntLoad, "didnt-load");
    await expect(boardHost(fresh).locator("canvas")).toHaveCount(0);
    expect(errors.some((text) => text.includes("did not load"))).toBe(true);
  });

  test("5. a board the surface can't be built for shows the can't-build message and no board", async ({ page }) => {
    // 40" is a length a saved board may hold (30"–240") but outside the app's 60"–120", so the builder refuses it.
    await keepBoard(page, "Fish", inchesToMm(40));
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.goto("/design/3d");
    await expectMessage(page, THREE_D_COPY.boardCantBeDrawn, "cant-build");
    await expect(boardHost(page).locator("canvas")).toHaveCount(0);
    expect(errors.some((text) => text.includes("could not be built"))).toBe(true);
  });

  test("6. a drawing context lost for a moment comes back with the board; one that never comes back says so", async ({ page }) => {
    await page.goto("/design/3d");
    const host = await waitForBoard(page);
    const loseContext = (restore: boolean) =>
      page.evaluate(async (restoreIt) => {
        const canvas = document.querySelector("[data-board-3d] canvas") as HTMLCanvasElement;
        const gl = canvas.getContext("webgl2");
        const ext = gl?.getExtension("WEBGL_lose_context");
        if (!ext) throw new Error("no WEBGL_lose_context");
        const lost = new Promise((resolve) => canvas.addEventListener("webglcontextlost", resolve, { once: true }));
        ext.loseContext();
        await lost;
        if (restoreIt) setTimeout(() => ext.restoreContext(), 300);
      }, restore);

    const before = await frames(host);
    await loseContext(true);
    await expect(host).toHaveAttribute("data-board-state", "ready", { timeout: FIRST_FRAME_MS });
    await expect.poll(() => frames(host), { timeout: FIRST_FRAME_MS }).toBeGreaterThan(before);
    await expect(page.locator("[data-canvas-message]")).toHaveCount(0);

    await loseContext(false);
    await expect(host).toHaveAttribute("data-board-state", "lost");
    // The scene waits 5 s for the context before it gives up.
    await expectMessage(page, THREE_D_COPY.browserCantDraw, "no-webgl");
  });

  test("7. upright phones: the drawing column stays within 66dvh and the canvas takes all of it but the rims", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "the stacked layout is a phone's");
    await page.goto("/design/3d");
    const host = await waitForBoard(page);
    const { column, canvas, dvh } = await host.evaluate((el) => {
      const probe = document.createElement("div");
      probe.style.cssText = "position:fixed;top:0;height:100dvh;width:0;visibility:hidden";
      document.body.appendChild(probe);
      const full = probe.getBoundingClientRect().height;
      probe.remove();
      return {
        column: (el.closest("main") as HTMLElement).getBoundingClientRect().height,
        canvas: el.getBoundingClientRect().height,
        dvh: full / 100,
      };
    });
    expect(column).toBeLessThanOrEqual(66 * dvh + 0.5);
    expect(canvas).toBeGreaterThanOrEqual(66 * dvh - 32 - 0.5);
  });

  test("8. a screen reader hears the board's name in 3D, as a 3D view it can focus", async ({ page }) => {
    await page.goto("/design/3d");
    await waitForBoard(page);
    const canvas = page.getByRole("application", { name: THREE_D_COPY.canvasName(BOARD_NAME_COPY.untitled), exact: true });
    await expect(canvas).toBeVisible();
    await expect(canvas).toHaveAttribute("aria-roledescription", THREE_D_COPY.canvasRole);
    await expect(canvas).toHaveAttribute("tabindex", "0");
    await expect(canvas).not.toHaveAttribute("aria-busy", "true");
    await expect(canvas.locator("canvas")).toHaveAttribute("aria-hidden", "true");
  });

  test("10. in a dark theme the board is drawn on that theme's ground, not Daylight's", async ({ page }) => {
    await page.addInitScript(([key, theme]) => window.localStorage.setItem(key, theme), [THEME_STORAGE_KEY, "slate"] as const);
    await page.goto("/design/3d");
    const host = await waitForBoard(page);
    const ground = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--surf-canvas").trim());
    const { rgba, width } = await hostPixels(host);
    // A pixel a little in from the top-left corner: the canvas's clear colour, clear of the rounded edge.
    const at = 4 * (10 * width + 10);
    const [r, g, b] = hexToRgb(ground);
    expect(Math.abs(rgba[at] - r)).toBeLessThanOrEqual(2);
    expect(Math.abs(rgba[at + 1] - g)).toBeLessThanOrEqual(2);
    expect(Math.abs(rgba[at + 2] - b)).toBeLessThanOrEqual(2);
  });

  test("9. moving Hard Edge Ends At on RAILS changes the 3D board (D-30: one value, read by both)", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "one computer proves the redraw");
    await page.goto("/design/3d");
    const before = await hostPixels(await waitForBoard(page));
    const trianglesBefore = await boardHost(page).getAttribute("data-triangles");

    await page.goto("/design/rails");
    const tail = page.locator('[data-rail-group="tail"]');
    const heading = tail.getByRole("button", { name: /^Advanced [▾▸]$/ });
    const body = heading.locator("xpath=following-sibling::div[1]");
    await expect(async () => {
      if ((await body.count()) === 0) await heading.click();
      await expect(body.getByRole("button", { name: /Reset Advanced Settings/ })).toBeVisible({ timeout: 1_000 });
    }).toPass({ timeout: 30_000 });
    const slider = page.getByRole("slider", { name: "Tail Rail hard edge ends at", exact: true });
    const valueBefore = await slider.getAttribute("aria-valuenow");
    await slider.press("Home");
    await expect(slider).not.toHaveAttribute("aria-valuenow", valueBefore ?? "");
    // The board in progress is kept in this browser, so the new address opens the same board.
    await expect
      .poll(async () => JSON.stringify((await storedOpenBoard(page))?.snapshot ?? null), { timeout: 10_000 })
      .toContain("tailHardEdgeEndsAt");

    await page.goto("/design/3d");
    const after = await hostPixels(await waitForBoard(page));
    const trianglesAfter = await boardHost(page).getAttribute("data-triangles");
    const changed = countDifferent(before.rgba, after.rgba, 2);
    expect(trianglesAfter !== trianglesBefore || changed > 0).toBe(true);
    expect(changed).toBeGreaterThan(0);
  });
});
