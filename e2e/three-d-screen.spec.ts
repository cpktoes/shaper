import { expect, test, type Locator, type Page } from "@playwright/test";
import { THREE_D_COPY } from "../components/3d/three-d-copy";
import { BOARD_NAME_COPY } from "../components/design/board-name-copy";
import { presetDesignFields } from "../lib/blanks/preset-blanks";
import { BOARD_PRESETS } from "../lib/geometry/presets";
import { BAY_PAINT } from "../lib/geometry/shaping-bay";
import { inchesToMm } from "../lib/geometry/units";
import { DEFAULT_VOLUME_SPEC } from "../lib/geometry/volume";
import { BANNER_DISMISSAL_KEY } from "../lib/models/banner-dismissal";
import type { DesignSnapshotFields } from "../lib/models/design-snapshot";
import { OPEN_BOARD_STORAGE_KEY, openBoardCopyJson } from "../lib/models/open-board";
import { TOOLBAR_TIP_DISMISSAL_KEY } from "../lib/models/toolbar-tip";
import { THEME_STORAGE_KEY } from "../lib/theme";
import { countDifferent, countUnlike, decodePng, hexToRgb } from "./helpers/canvas-pixels";
import { storedOpenBoard } from "./helpers/open-board";
import { appSettingsDialog, openAppSettings } from "./helpers/settings";

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
  // It covers the drawing edge to edge: the two share one box (the founder, 2026-11-06).
  const [messageBox, hostBox] = await Promise.all([box.boundingBox(), host.boundingBox()]);
  expect(messageBox).toEqual(hostBox);
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

/** The ground the 3D board is drawn on: the theme's `--surf-3d-ground`. */
async function threeDGround(page: Page) {
  return page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--surf-3d-ground").trim());
}

/** A colour token as the page holds it now, in the theme on screen. */
async function token(page: Page, name: string) {
  return page.evaluate((property) => getComputedStyle(document.documentElement).getPropertyValue(property).trim(), name);
}

/**
 * Whether a pixel of a wall or the ceiling reads as `hex`. It never reads its exact hex: the scene's tone mapping takes a
 * dark colour's smallest channel out almost entirely, so blue paint (10, 47, 102) reads (0, 44, 100). So every channel
 * must sit within 8 levels of the paint, except the paint's smallest, which need only read no higher than the paint.
 * Chalk and Slate cannot be told apart this way, and need not be: their walls are three levels apart.
 */
function isPaint(read: readonly number[], hex: string) {
  const paint = hexToRgb(hex);
  const smallest = Math.min(...paint);
  return paint.every((level, k) => (level === smallest ? read[k] <= level : Math.abs(read[k] - level) <= 8));
}

/** A pixel a little in from the canvas's top-left corner (its clear colour, clear of the rounded edge) is `hex`. */
async function expectCornerIs(host: Locator, hex: string) {
  const { rgba, width } = await hostPixels(host);
  const at = 4 * (10 * width + 10);
  const [r, g, b] = hexToRgb(hex);
  expect(Math.abs(rgba[at] - r)).toBeLessThanOrEqual(2);
  expect(Math.abs(rgba[at + 1] - g)).toBeLessThanOrEqual(2);
  expect(Math.abs(rgba[at + 2] - b)).toBeLessThanOrEqual(2);
}

/** The dots of the picture at a share of its width and height, with the corner's buttons out of the way. */
async function dotAt(host: Locator, shareX: number, shareY: number) {
  const { rgba, width, height } = decodePng(
    await host.screenshot({ style: "[data-viewer-zoom], [data-viewer-toolbar] { visibility: hidden !important; }" }),
  );
  const i = 4 * (Math.round(height * shareY) * width + Math.round(width * shareX));
  return [rgba[i], rgba[i + 1], rgba[i + 2]];
}

/** The wall the first view faces, clear of the line logo and above the board. */
const wallRead = (host: Locator) => dotAt(host, 0.5, 0.3);

/** The ceiling, in Walk Around's Side view, the only view that shows it: a band across the top of the canvas. */
const ceilingRead = (host: Locator) => dotAt(host, 0.5, 0.04);

/** Waits until nothing is moving: the same turn and the same viewer across a quarter second. */
async function settle(host: Locator) {
  let last = "";
  await expect
    .poll(
      async () => {
        const now = `${await host.getAttribute("data-turn")} ${await host.getAttribute("data-viewer")}`;
        const same = now === last;
        last = now;
        return same;
      },
      { intervals: [250], timeout: 10_000 },
    )
    .toBe(true);
}

function roomIcon(page: Page) {
  return page.locator("[data-viewer-toolbar]").getByRole("button", { name: THREE_D_COPY.room, exact: true });
}

function dragModeButton(page: Page, name: string) {
  return page.getByRole("group", { name: THREE_D_COPY.modeGroup, exact: true }).getByRole("button", { name, exact: true });
}

/** Picks a theme through App Default Settings with the 3D screen open, and shuts the box so it no longer dims the picture. */
async function pickTheme(page: Page, theme: string) {
  const dialog = await openAppSettings(page);
  await dialog.locator(`[data-theme-tile="${theme}"]`).click();
  await expect(page.locator("html")).toHaveClass(new RegExp(`(^|\\s)theme-${theme}(\\s|$)`));
  await page.keyboard.press("Escape");
  await expect(appSettingsDialog(page)).toBeHidden();
}

/**
 * Where the drawing and the corner's two rows sit, in dots from the card's inner edges: inside its faint line. Read from
 * the page rather than from a picture, so a row that moved by one dot says so.
 */
async function viewerEdges(page: Page) {
  return page.evaluate(() => {
    const card = document.querySelector("[data-viewer-panel]") as HTMLElement;
    const box = card.getBoundingClientRect();
    const left = box.left + card.clientLeft;
    const top = box.top + card.clientTop;
    const right = left + card.clientWidth;
    const bottom = top + card.clientHeight;
    const from = (selector: string) => {
      const r = document.querySelector(selector)!.getBoundingClientRect();
      return { top: r.top - top, right: right - r.right, left: r.left - left, bottom: bottom - r.bottom };
    };
    return { host: from("[data-board-3d]"), toolbar: from("[data-viewer-toolbar]"), zoom: from("[data-viewer-zoom]") };
  });
}

/**
 * The drawing meets the card's inner edges to within a dot, and the corner's rows are where they were before the drawing
 * grew, `inset` dots in from the top and the right: the card's own pad, measured on 2026-11-06 before the change at 12 on
 * a computer, 4 in Wide view, and 0 on a phone and a short window. The zoom row always sits 40 dots under the icons.
 * `bottomWithin` is for the upright phone, whose canvas box has its own fixed height and has always stopped up to 1.3 dots
 * short of the card's foot; that is the phone's own rounding, and this change does not touch it.
 */
async function expectViewerEdges(page: Page, inset: number, bottomWithin = 1) {
  await expect(async () => {
    const { host, toolbar, zoom } = await viewerEdges(page);
    expect(Math.abs(host.top)).toBeLessThanOrEqual(1);
    expect(Math.abs(host.right)).toBeLessThanOrEqual(1);
    expect(Math.abs(host.left)).toBeLessThanOrEqual(1);
    expect(Math.abs(host.bottom)).toBeLessThanOrEqual(bottomWithin);
    expect(Math.abs(toolbar.top - inset)).toBeLessThanOrEqual(1);
    expect(Math.abs(toolbar.right - inset)).toBeLessThanOrEqual(1);
    expect(Math.abs(zoom.top - (inset + 40))).toBeLessThanOrEqual(1);
    expect(Math.abs(zoom.right - inset)).toBeLessThanOrEqual(1);
  }).toPass({ timeout: 5_000 });
}

/** The room off, by the Room switch's own path, for a case that measures the board against a plain ground. */
async function bareRoom(page: Page) {
  await page.addInitScript(() => {
    (globalThis as { __shaper3dBareRoom?: boolean }).__shaper3dBareRoom = true;
  });
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
    await bareRoom(page);
    await page.goto("/design/3d");
    const host = await waitForBoard(page);
    const ground = await threeDGround(page);
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
    // A message sits on the canvas's own ground, where its muted second line keeps the contract's contrast — not on
    // the darker ground behind the board.
    const [messageGround, canvasToken] = await page.evaluate(() => {
      const probe = document.createElement("div");
      probe.style.background = "var(--surf-canvas)";
      document.body.appendChild(probe);
      const token = getComputedStyle(probe).backgroundColor;
      probe.remove();
      return [getComputedStyle(document.querySelector("[data-canvas-message]")!).backgroundColor, token];
    });
    expect(messageGround).toBe(canvasToken);
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

  test("10. the room's walls take the theme's colour; its floor and strips are its own, and the fins stay dark", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "one computer proves the paint");
    test.setTimeout(240_000);
    const pictures: { name: string; paint: string; wall: number[]; floor: number[]; strip: number[] }[] = [];
    for (const theme of ["daylight", "chalk", "slate", "phosphor"]) {
      await page.addInitScript(([key, value]) => window.localStorage.setItem(key, value), [THEME_STORAGE_KEY, theme] as const);
      await page.goto("/design/3d");
      const host = await waitForBoard(page);
      const { rgba, width, height } = decodePng(
        await host.screenshot({ style: "[data-viewer-zoom], [data-viewer-toolbar] { visibility: hidden !important; }" }),
      );
      const at = (x: number, y: number) => {
        const i = 4 * (Math.round(y) * width + Math.round(x));
        return [rgba[i], rgba[i + 1], rgba[i + 2]];
      };
      pictures.push({
        name: theme,
        paint: await token(page, "--surf-3d-room-wall"),
        wall: at(width / 2, height * 0.3),
        floor: at(width * 0.2, height * 0.9),
        strip: at(width * 0.06, height * 0.455),
      });
    }
    // The fins are the bay's own dark paint: what Fins takes away from the picture reads the same in every theme.
    const finColours: number[][] = [];
    for (const theme of ["daylight", "phosphor"]) {
      await page.addInitScript(([key, value]) => window.localStorage.setItem(key, value), [THEME_STORAGE_KEY, theme] as const);
      await page.goto("/design/3d");
      const host = await waitForBoard(page);
      const style = "[data-viewer-zoom], [data-viewer-toolbar] { visibility: hidden !important; }";
      await page.getByRole("group", { name: THREE_D_COPY.modeGroup, exact: true }).getByRole("button", { name: THREE_D_COPY.modeWalk, exact: true }).click();
      await page.getByRole("group", { name: THREE_D_COPY.viewsGroup, exact: true }).getByRole("button", { name: THREE_D_COPY.views.side, exact: true }).click();
      await page.waitForTimeout(1_000);
      const on = decodePng(await host.screenshot({ style }));
      await page.locator("[data-viewer-toolbar]").getByRole("button", { name: THREE_D_COPY.fins, exact: true }).click();
      await page.waitForTimeout(500);
      const off = decodePng(await host.screenshot({ style }));
      const sum = [0, 0, 0];
      let count = 0;
      for (let i = 0; i < on.rgba.length; i += 4) {
        if ([0, 1, 2].some((k) => Math.abs(on.rgba[i + k] - off.rgba[i + k]) > 12)) {
          for (let k = 0; k < 3; k++) sum[k] += on.rgba[i + k];
          count += 1;
        }
      }
      expect(count).toBeGreaterThan(100);
      finColours.push(sum.map((v) => v / count));
    }
    for (let k = 0; k < 3; k++) expect(Math.abs(finColours[0][k] - finColours[1][k])).toBeLessThanOrEqual(3);

    for (const { name, paint, wall } of pictures) {
      expect(isPaint(wall, paint), `${name} wall ${wall} against ${paint}`).toBe(true);
      expect(isPaint(wall, BAY_PAINT.wall), `${name} wall ${wall} is the blue room's`).toBe(false);
    }
    for (const { floor, strip } of pictures.slice(1)) {
      for (const [got, want] of [
        [floor, pictures[0].floor],
        [strip, pictures[0].strip],
      ]) {
        for (let k = 0; k < 3; k++) expect(Math.abs(got[k] - want[k])).toBeLessThanOrEqual(2);
      }
    }
  });

  test("10b. each step of the Room icon paints the room: the theme's, then the bright blue, then no room, then the theme's", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "one computer proves the paint");
    await page.addInitScript(([key, value]) => window.localStorage.setItem(key, value), [THEME_STORAGE_KEY, "daylight"] as const);
    await page.goto("/design/3d");
    const host = await waitForBoard(page);
    const paintOf = async (name: string) => token(page, name);
    await expect(host).toHaveAttribute("data-bay-look", "theme");
    const wallPaint = await paintOf("--surf-3d-room-wall");
    expect(isPaint(await wallRead(host), wallPaint), `${await wallRead(host)}`).toBe(true);

    await dragModeButton(page, THREE_D_COPY.modeWalk).click();
    await page.getByRole("group", { name: THREE_D_COPY.viewsGroup, exact: true }).getByRole("button", { name: THREE_D_COPY.views.side, exact: true }).click();
    await settle(host);
    const ceilingTheme = await ceilingRead(host);
    expect(isPaint(ceilingTheme, await paintOf("--surf-3d-room-ceiling")), `${ceilingTheme}`).toBe(true);

    await roomIcon(page).click();
    await expect(host).toHaveAttribute("data-bay-look", "blue");
    await expect.poll(async () => isPaint(await ceilingRead(host), BAY_PAINT.ceiling)).toBe(true);

    await dragModeButton(page, THREE_D_COPY.modeTurn).click();
    await settle(host);
    const wallBlue = await wallRead(host);
    expect(isPaint(wallBlue, BAY_PAINT.wall), `${wallBlue}`).toBe(true);

    await roomIcon(page).click();
    await expect(host).toHaveAttribute("data-bay", "off");
    await expect(host).toHaveAttribute("data-bay-look", "none");
    await settle(host);
    await expectCornerIs(host, await threeDGround(page));

    await roomIcon(page).click();
    await expect(host).toHaveAttribute("data-bay-look", "theme");
    await settle(host);
    await expect.poll(async () => isPaint(await wallRead(host), wallPaint)).toBe(true);
  });

  test("10c. a theme change repaints a theme room at once, the view kept, and leaves the bright blue room blue", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "one computer switches the theme through App Default Settings");
    await page.addInitScript(([key, value]) => window.localStorage.setItem(key, value), [THEME_STORAGE_KEY, "daylight"] as const);
    await page.goto("/design/3d");
    const host = await waitForBoard(page);
    // Turn it a little first, so "kept" means something.
    await host.focus();
    await page.keyboard.press("ArrowLeft");
    await settle(host);
    const turn = await host.getAttribute("data-turn");

    // Daylight to Chalk is the hard pair: the two share their ground, foam and muted ink, so only the room's own two
    // colours tell the screen the theme has changed at all.
    await pickTheme(page, "chalk");
    const chalkPaint = await token(page, "--surf-3d-room-wall");
    await expect.poll(async () => isPaint(await wallRead(host), chalkPaint), { timeout: 10_000 }).toBe(true);
    expect(await host.getAttribute("data-turn")).toBe(turn);
    expect(await host.getAttribute("data-board-state")).toBe("ready");

    await roomIcon(page).click();
    await expect(host).toHaveAttribute("data-bay-look", "blue");
    await expect.poll(async () => isPaint(await wallRead(host), BAY_PAINT.wall)).toBe(true);

    const framesBefore = await frames(host);
    await pickTheme(page, "phosphor");
    await expect.poll(async () => frames(host)).toBeGreaterThan(framesBefore);
    const stillBlue = await wallRead(host);
    expect(isPaint(stillBlue, BAY_PAINT.wall), `${stillBlue}`).toBe(true);

    await roomIcon(page).click();
    await expect(host).toHaveAttribute("data-bay-look", "none");
    await roomIcon(page).click();
    await expect(host).toHaveAttribute("data-bay-look", "theme");
    await settle(host);
    const phosphorPaint = await token(page, "--surf-3d-room-wall");
    await expect.poll(async () => isPaint(await wallRead(host), phosphorPaint)).toBe(true);
  });

  test("11. with the room off the board sits on the theme's plain ground, and the light themes' ground is the darker one", async ({ page }) => {
    await bareRoom(page);
    await page.addInitScript(([key, theme]) => window.localStorage.setItem(key, theme), [THEME_STORAGE_KEY, "daylight"] as const);
    await page.goto("/design/3d");
    const host = await waitForBoard(page);
    const [ground, canvas] = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement);
      return [style.getPropertyValue("--surf-3d-ground").trim(), style.getPropertyValue("--surf-canvas").trim()];
    });
    const sum = (hex: string) => hexToRgb(hex).reduce((a, b) => a + b, 0);
    expect(sum(ground)).toBeLessThan(sum(canvas));
    await expectCornerIs(host, ground);
  });

  test("12. the drawing reaches the faint line on every layout, and the corner's icons stay where they have always been", async ({ page }, testInfo) => {
    await page.goto("/design/3d");
    const host = await waitForBoard(page);
    // Zoomed, or a finger's zoom row hides at 1x and there is nothing to measure.
    await host.focus();
    await page.keyboard.press("+");
    await page.keyboard.press("+");
    await expect(host).toHaveAttribute("data-crop", /^2 /);
    // The keyboard's ring goes round the card, since the drawing's own edge would clip it, and never over the picture.
    const card = page.locator("[data-viewer-panel]");
    expect(await card.evaluate((el) => getComputedStyle(el).boxShadow)).toContain("0px 0px 0px 3px");
    expect(await host.evaluate((el) => getComputedStyle(el, "::after").content)).toBe("none");

    const wide = page.getByRole("button", { name: "Hide the sidebar for a wider view", exact: true });
    if (testInfo.project.name === "desktop") {
      await expectViewerEdges(page, 12);
      await wide.click();
      await expectViewerEdges(page, 4);
      await page.getByRole("button", { name: "Show the sidebar", exact: true }).click();
      await page.setViewportSize({ width: 1000, height: 450 });
      await expectViewerEdges(page, 0);
      return;
    }
    await expectViewerEdges(page, 0, 1.5);
    // Held sideways: the phone's own pad of nothing, and Wide view's 4 dots, which hold on a short screen too.
    await page.setViewportSize(testInfo.project.name === "iphone" ? { width: 844, height: 390 } : { width: 863, height: 393 });
    await expectViewerEdges(page, 0);
    await wide.click();
    await expectViewerEdges(page, 4);
  });

  test("9. moving Hard Edge Ends At on RAILS changes the 3D board (D-30: one value, read by both)", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "one computer proves the redraw");
    await bareRoom(page);
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
    const slider = page.getByRole("slider", { name: "Tail Rail ends at", exact: true });
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
