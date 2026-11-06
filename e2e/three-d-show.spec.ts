import { expect, test, type Locator, type Page } from "@playwright/test";
import { THREE_D_COPY } from "../components/3d/three-d-copy";
import { presetDesignFields } from "../lib/blanks/preset-blanks";
import { BOARD_PRESETS } from "../lib/geometry/presets";
import { AT_REST, BOTTOM_UP, rackTurn, WALK_VIEWS } from "../lib/geometry/shaping-bay";
import { type Quat, type ViewName } from "../lib/geometry/view-3d";
import { DEFAULT_VOLUME_SPEC } from "../lib/geometry/volume";
import { BANNER_DISMISSAL_KEY } from "../lib/models/banner-dismissal";
import type { DesignSnapshotFields } from "../lib/models/design-snapshot";
import { OPEN_BOARD_STORAGE_KEY, openBoardCopyJson } from "../lib/models/open-board";
import { TOOLBAR_TIP_DISMISSAL_KEY } from "../lib/models/toolbar-tip";
import { countDifferent, countUnlike, decodePng, hexToRgb } from "./helpers/canvas-pixels";
import { appSettingsDialog, openAppSettings } from "./helpers/settings";

/**
 * The 3D corner's switches (Phase 16, plans 10, 11 and 17, UI-SPEC §1, §3 "Fins", "The blank ghost", "Contour Stripes",
 * §6, §9, §16, D-35): the board's fins stand on its bottom at their FINS placement; the picked blank shows as a
 * see-through ghost round the board; Contour Stripes swaps the shading for bands fixed in the room; each press keeps the
 * view. The scene follows the theme while the screen is open, and a quiet picture of the board stands in while it loads.
 */

/** WebKit draws its first frame more slowly on the suite's development server (about 5 s measured). */
const FIRST_FRAME_MS = 30_000;

async function dismissStrips(page: Page) {
  await page.addInitScript(
    ([bannerKey, tipKey]) => {
      window.sessionStorage.setItem(bannerKey, "true");
      window.localStorage.setItem(tipKey, "true");
      // These measure the board against a plain ground, so the room is off (the Room switch's own path, 16-18).
      (globalThis as { __shaper3dBareRoom?: boolean }).__shaper3dBareRoom = true;
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
  // React owns the corner's buttons (they draw from the first paint, and a click before hydration is lost).
  await page.waitForFunction(() => {
    const el = document.querySelector("[data-viewer-toolbar] button");
    return !!el && Object.keys(el).some((key) => key.startsWith("__reactFiber"));
  });
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
        const now = `${await host.getAttribute("data-turn")} ${await host.getAttribute("data-viewer")} ${await frames(host)}`;
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
  if (name === "deck" || name === "bottom") {
    const want = rackTurn(name === "deck" ? AT_REST : BOTTOM_UP);
    await expect.poll(async () => isTurn(await turnOf(host), want), { timeout: 10_000 }).toBe(true);
  } else {
    const azimuth = () => host.getAttribute("data-viewer").then((v) => Number((v ?? "").split(" ")[0]));
    await expect.poll(azimuth, { timeout: 10_000 }).toBeCloseTo(WALK_VIEWS[name].azimuthDeg, 1);
  }
  await settled(host);
}

/** A canvas screenshot covers the corner: these keep a button's pressed fill out of every comparison. */
const HIDE_THE_CORNER = "[data-viewer-zoom], [data-viewer-toolbar] { visibility: hidden !important; }";

/** The canvas as drawn now, once the scene has drawn every frame asked of it. */
async function picture(host: Locator) {
  await settled(host);
  return decodePng(await host.screenshot({ style: HIDE_THE_CORNER }));
}

/** A preset, kept in this browser as the open board, so /design/3d opens on it (fins as the preset sets them). */
async function keepPreset(
  page: Page,
  name: string,
  { handSet = false, locked = false }: { handSet?: boolean; locked?: boolean } = {},
) {
  const preset = BOARD_PRESETS.find((p) => p.name === name);
  if (!preset) throw new Error(`no ${name} preset`);
  const fields: DesignSnapshotFields = {
    ...presetDesignFields(preset),
    // A hand-set board: the preset with its blank removed, as ROCKER's Remove This Blank leaves it (D-02).
    ...(handSet ? { blank: null } : {}),
    volume: DEFAULT_VOLUME_SPEC,
    finsImportTemplate: true,
    railsImportFoilThickness: true,
    boardName: "",
    finSystem: "fcs2",
  };
  // A lock belongs to a saved board of an account (e2e/three-d-view.spec.ts keeps one the same way).
  const raw = locked
    ? openBoardCopyJson(fields, { modelId: "three-d-locked-board", ownerId: "three-d-test-account", locked: true, dirty: false })
    : openBoardCopyJson(fields, { modelId: null, ownerId: null, locked: false, dirty: true });
  await page.addInitScript(([key, value]) => window.localStorage.setItem(key, value), [OPEN_BOARD_STORAGE_KEY, raw] as const);
}

/** How many rows of the canvas the fins cover: the rows that change when Fins is switched off, top to bottom. */
async function finsDrawnHeight(page: Page, host: Locator): Promise<{ rows: number; canvas: number }> {
  const on = await picture(host);
  await finsSwitch(page).click();
  const off = await picture(host);
  await finsSwitch(page).click();
  let top = Infinity;
  let bottom = -Infinity;
  for (let y = 0; y < on.height; y++) {
    for (let x = 0; x < on.width; x++) {
      const i = 4 * (y * on.width + x);
      if ([0, 1, 2].some((k) => Math.abs(on.rgba[i + k] - off.rgba[i + k]) > 2)) {
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
        break;
      }
    }
  }
  return { rows: bottom - top + 1, canvas: on.height };
}

function cornerSwitch(page: Page, name: string) {
  return page.locator("[data-viewer-toolbar]").getByRole("button", { name, exact: true });
}

function finsSwitch(page: Page) {
  return cornerSwitch(page, THREE_D_COPY.fins);
}

function blankSwitch(page: Page) {
  return cornerSwitch(page, THREE_D_COPY.blank);
}

function stripesSwitch(page: Page) {
  return cornerSwitch(page, THREE_D_COPY.contourStripes);
}

const expectPressed = (button: Locator, pressed: boolean) => expect(button).toHaveAttribute("aria-pressed", String(pressed));

/** A theme token's colour as the page holds it now (each of these is a plain `#rrggbb` ramp value). */
async function tokenRgb(page: Page, name: string): Promise<[number, number, number]> {
  return hexToRgb(await page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name));
}

/** Of the board's pixels (everything not the ground), the share within `tolerance` of `rgb`. */
function shareOfBoardNear(
  pic: { rgba: Uint8Array; width: number; height: number },
  ground: readonly [number, number, number],
  rgb: readonly [number, number, number],
  tolerance: number,
) {
  const board = countUnlike(pic.rgba, ground, 6);
  const near = pic.width * pic.height - countUnlike(pic.rgba, rgb, tolerance);
  return { board, share: board > 0 ? near / board : 0 };
}

/** The ground's colour on the canvas: a dot near its bottom-left corner, clear of the board and the corner buttons. */
function groundDot(pic: { rgba: Uint8Array; width: number; height: number }): [number, number, number] {
  const i = 4 * ((pic.height - 12) * pic.width + 12);
  return [pic.rgba[i], pic.rgba[i + 1], pic.rgba[i + 2]];
}

function near(a: readonly number[], b: readonly number[], tolerance: number) {
  return a.every((v, k) => Math.abs(v - b[k]) <= tolerance);
}

/** The share of the canvas's pixels that differ between two pictures by more than `tolerance`. */
function shareDifferent(a: { rgba: Uint8Array; width: number; height: number }, b: { rgba: Uint8Array }, tolerance = 2) {
  return countDifferent(a.rgba, b.rgba, tolerance) / (a.width * a.height);
}

/** The same picture again: pixel for pixel on a computer, all but a few edge dots on the phones' emulated GPUs. */
function expectSamePicture(
  a: { rgba: Uint8Array; width: number; height: number },
  b: { rgba: Uint8Array },
  project: string,
) {
  if (project === "desktop") expect(countDifferent(a.rgba, b.rgba, 0)).toBe(0);
  else expect(shareDifferent(a, b)).toBeLessThan(0.0005);
}

test.beforeEach(async ({ page }) => {
  test.setTimeout(120_000);
  await dismissStrips(page);
});

test.describe("the 3D board's fins", () => {
  test("1. the thruster's fins stand on the board, and the Fins switch hides and shows them without moving the view", async ({
    page,
  }, testInfo) => {
    await page.goto("/design/3d");
    const host = await waitForBoard(page);
    await expectPressed(finsSwitch(page), true);
    await expect(finsSwitch(page)).toBeEnabled();

    await showView(page, host, "bottom");
    const turn = await host.getAttribute("data-turn");
    const crop = await host.getAttribute("data-crop");
    const withFins = await picture(host);

    await finsSwitch(page).click();
    await expectPressed(finsSwitch(page), false);
    const without = await picture(host);
    // Seen from straight below, each fin is edge-on — a thin dark line, about a thousandth of the canvas for the
    // three of them (the plan's 0.2% assumed more; measured 0.14% on a computer).
    const share = countDifferent(withFins.rgba, without.rgba, 2) / (without.width * without.height);
    expect(share).toBeGreaterThan(0.0005);
    // The view stays exactly as it was.
    expect(await host.getAttribute("data-turn")).toBe(turn);
    expect(await host.getAttribute("data-crop")).toBe(crop);

    await finsSwitch(page).click();
    await expectPressed(finsSwitch(page), true);
    const again = await picture(host);
    expect(await host.getAttribute("data-turn")).toBe(turn);
    if (testInfo.project.name === "desktop") {
      expect(countDifferent(withFins.rgba, again.rgba, 0)).toBe(0);
    } else {
      expect(countDifferent(withFins.rgba, again.rgba, 2) / (again.width * again.height)).toBeLessThan(0.0005);
    }
  });

  test("2. a Longboard's single, as deep as the board is long in feet, hangs lower than a Shortboard's thruster fins", async ({
    browser,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "one computer compares the two boards");
    const heights: Record<string, { rows: number; canvas: number }> = {};
    for (const name of ["Longboard", "Shortboard"]) {
      const context = await browser.newContext(testInfo.project.use);
      const page = await context.newPage();
      await dismissStrips(page);
      await keepPreset(page, name);
      await page.goto("/design/3d");
      const host = await waitForBoard(page);
      await showView(page, host, "side");
      heights[name] = await finsDrawnHeight(page, host);
      await context.close();
    }
    // A 9" single on the 9'0" board against 4.5" side fins on the 6'2", each board framed to its own length: the
    // single still stands taller on the canvas.
    expect(heights.Longboard.rows).toBeGreaterThan(heights.Shortboard.rows);
    expect(heights.Shortboard.rows).toBeGreaterThan(0);
  });
});

test.describe("the 3D board's blank (plan 11, D-08)", () => {
  test("3. on a board in a blank, Blank shows the blank as a see-through ghost round it and hides it again, the view kept", async ({
    page,
  }, testInfo) => {
    // Every preset opens in a blank: the Fish, kept as the open board.
    await keepPreset(page, "Fish");
    await page.goto("/design/3d");
    const host = await waitForBoard(page);
    await expectPressed(blankSwitch(page), false);
    await expect(blankSwitch(page)).not.toHaveAttribute("aria-disabled", "true");
    await expect(blankSwitch(page)).not.toHaveAccessibleDescription(THREE_D_COPY.noBlankHint);

    const turn = await host.getAttribute("data-turn");
    const crop = await host.getAttribute("data-crop");
    const before = await picture(host);

    await blankSwitch(page).click();
    await expectPressed(blankSwitch(page), true);
    const ghosted = await picture(host);
    // The veil over the board and the blank's foam past its rails and tips.
    expect(shareDifferent(before, ghosted)).toBeGreaterThan(0.005);
    expect(await host.getAttribute("data-turn")).toBe(turn);
    expect(await host.getAttribute("data-crop")).toBe(crop);

    await blankSwitch(page).click();
    await expectPressed(blankSwitch(page), false);
    const again = await picture(host);
    expect(await host.getAttribute("data-turn")).toBe(turn);
    expectSamePicture(before, again, testInfo.project.name);
  });

  test("4. on a hand-set board, Blank is dimmed, a press does nothing, and its tooltip says where to pick a blank", async ({
    page,
  }, testInfo) => {
    await keepPreset(page, "Fish", { handSet: true });
    await page.goto("/design/3d");
    const host = await waitForBoard(page);
    const blank = blankSwitch(page);
    await expect(blank).toHaveAttribute("aria-disabled", "true");
    await expectPressed(blank, false);
    await expect(blank).toHaveAttribute("title", THREE_D_COPY.noBlankHint);
    await expect(blank).toHaveAccessibleDescription(THREE_D_COPY.noBlankHint);

    const before = await picture(host);
    await blank.click({ force: true });
    await expectPressed(blank, false);
    expectSamePicture(before, await picture(host), testInfo.project.name);
    // Fins stays live on the same board.
    await expect(finsSwitch(page)).toBeEnabled();
  });
});

test.describe("Contour Stripes, the theme and the loading picture (plan 11)", () => {
  test("5. Contour Stripes lays dark and light bands over the foam that slide as the board turns, and the shading comes back", async ({
    page,
  }) => {
    await keepPreset(page, "Fish");
    await page.goto("/design/3d");
    const host = await waitForBoard(page);
    await expectPressed(stripesSwitch(page), false);
    await expect(stripesSwitch(page)).toBeEnabled();
    // What it does, in its tooltip and spoken description; the panel says nothing about it.
    await expect(stripesSwitch(page)).toHaveAttribute("title", THREE_D_COPY.contourStripesTip);
    await expect(stripesSwitch(page)).toHaveAccessibleDescription(THREE_D_COPY.contourStripesTip);
    await expect(page.locator("[data-three-d-controls]").getByText("kink at a bump")).toHaveCount(0);
    const ground = await tokenRgb(page, "--surf-3d-ground");
    const dark = await tokenRgb(page, "--surf-on-foam");

    const shaded = await picture(host);
    const before = shareOfBoardNear(shaded, ground, dark, 24);
    expect(before.board).toBeGreaterThan(0);

    await stripesSwitch(page).click();
    await expectPressed(stripesSwitch(page), true);
    const turn = await host.getAttribute("data-turn");
    const striped = await picture(host);
    // Half the bands are the stringer's dark: far more of the board than the stringer alone (more than 10%).
    expect(shareOfBoardNear(striped, ground, dark, 24).share).toBeGreaterThan(0.1);
    expect(await host.getAttribute("data-turn")).toBe(turn);

    // A little drag turns the board under the room's tubes: the bands move over it.
    const box = (await host.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    for (let i = 1; i <= 6; i++) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 6 * i);
    await page.mouse.up();
    await expect.poll(async () => host.getAttribute("data-turn")).not.toBe(turn);
    const turned = await picture(host);
    expect(shareDifferent(striped, turned)).toBeGreaterThan(0.01);

    // Off: the foam's own shading is back — the dark is the stringer's (and the fins') alone again.
    await stripesSwitch(page).click();
    await expectPressed(stripesSwitch(page), false);
    const again = await picture(host);
    expect(shareOfBoardNear(again, ground, dark, 24).share).toBeLessThan(Math.max(0.05, before.share * 2));
  });

  test("6. switching the theme with the 3D board open repaints it at once, the view kept", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "one computer switches the theme through App Default Settings");
    await keepPreset(page, "Fish");
    await page.goto("/design/3d");
    const host = await waitForBoard(page);
    // Turn it a little first, so "kept" means something.
    await host.focus();
    await page.keyboard.press("ArrowLeft");
    await settled(host);
    const turn = await host.getAttribute("data-turn");
    const daylight = await picture(host);
    expect(near(groundDot(daylight), await tokenRgb(page, "--surf-3d-ground"), 2)).toBe(true);

    const dialog = await openAppSettings(page);
    await dialog.locator('[data-theme-tile="slate"]').click();
    await expect(page.locator("html")).toHaveClass(/(^|\s)theme-slate(\s|$)/);
    await page.keyboard.press("Escape");
    await expect(appSettingsDialog(page)).toBeHidden();

    const slateGround = await tokenRgb(page, "--surf-3d-ground");
    expect(near(slateGround, groundDot(daylight), 2)).toBe(false);
    await expect.poll(async () => near(groundDot(await picture(host)), slateGround, 2), { timeout: 10_000 }).toBe(true);
    // Repainted in place: the same board, the same turn, no reload of the drawing.
    expect(await host.getAttribute("data-turn")).toBe(turn);
    expect(await host.getAttribute("data-board-state")).toBe("ready");
  });

  test("7. while the drawing's code is on its way, the first view's own outline stands in, then the lit board lands on it", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "one computer holds the drawing's code back");
    await keepPreset(page, "Fish");
    // Learn which script carries the drawing: the one the screen fetches for its scene.
    const scripts: string[] = [];
    page.on("request", (request) => {
      if (request.resourceType() === "script") scripts.push(request.url());
    });
    await page.goto("/design/3d");
    await waitForBoard(page);
    const scene = scripts.filter((url) => url.includes("board-scene"));
    expect(scene.length).toBeGreaterThan(0);

    // Hold it back for 2.5 s, and load the screen again.
    for (const url of scene) {
      await page.route(url, async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 2500));
        await route.continue();
      });
    }
    await page.reload();
    const host = boardHost(page);
    const loading = page.locator("[data-loading-picture]");
    await expect(loading.locator("svg path")).toHaveCount(2);
    await expect(host).toHaveAttribute("aria-busy", "true");
    await expect(host).toHaveAttribute("data-board-state", "loading");
    // The line comes a second later, under the picture.
    await expect(page.getByText(THREE_D_COPY.gettingReady, { exact: true })).toBeVisible({ timeout: 5_000 });
    const svg = (await loading.locator("svg").boundingBox())!;
    const line = (await page.getByText(THREE_D_COPY.gettingReady, { exact: true }).boundingBox())!;
    expect(line.y).toBeGreaterThan(svg.y + svg.height / 2);
    expect(line.y + line.height).toBeLessThanOrEqual(svg.y + svg.height);
    const outlineBox = (await loading.locator("svg path").first().boundingBox())!;
    expect(line.y).toBeGreaterThan(outlineBox.y + outlineBox.height - 1);

    // Then the lit board, and the picture and its line are gone.
    await waitForBoard(page);
    await expect(loading).toHaveCount(0);
    await expect(page.getByText(THREE_D_COPY.gettingReady, { exact: true })).toHaveCount(0);
    await expect(host).not.toHaveAttribute("aria-busy", "true");

    // The lit board lands where the outline was, to 3 dots, Fins off so only the foam counts.
    await finsSwitch(page).click();
    const lit = await picture(host);
    const ground = groundDot(lit);
    const canvas = (await host.boundingBox())!;
    let [x0, x1, y0, y1] = [Infinity, -Infinity, Infinity, -Infinity];
    for (let y = 0; y < lit.height; y++) {
      for (let x = 0; x < lit.width; x++) {
        const i = 4 * (y * lit.width + x);
        if ([0, 1, 2].some((k) => Math.abs(lit.rgba[i + k] - ground[k]) > 12)) {
          const inCorner = (x < 8 || x >= lit.width - 8) && (y < 8 || y >= lit.height - 8);
          if (inCorner) continue;
          x0 = Math.min(x0, x);
          x1 = Math.max(x1, x);
          y0 = Math.min(y0, y);
          y1 = Math.max(y1, y);
        }
      }
    }
    const scale = lit.width / canvas.width;
    expect(Math.abs(x0 / scale - (outlineBox.x - canvas.x))).toBeLessThanOrEqual(3);
    expect(Math.abs((x1 + 1) / scale - (outlineBox.x + outlineBox.width - canvas.x))).toBeLessThanOrEqual(3);
    expect(Math.abs(y0 / scale - (outlineBox.y - canvas.y))).toBeLessThanOrEqual(3);
    expect(Math.abs((y1 + 1) / scale - (outlineBox.y + outlineBox.height - canvas.y))).toBeLessThanOrEqual(3);
  });

  test("8. a locked board keeps all five switches, since they only change the picture", async ({ page }) => {
    await keepPreset(page, "Fish", { locked: true });
    await page.goto("/design/3d");
    await waitForBoard(page);
    for (const button of [finsSwitch(page), blankSwitch(page), stripesSwitch(page), cornerSwitch(page, THREE_D_COPY.wireView), cornerSwitch(page, THREE_D_COPY.room)]) {
      await expect(button).toBeEnabled();
      await expect(button).not.toHaveAttribute("aria-disabled", "true");
    }
    await blankSwitch(page).click();
    await expectPressed(blankSwitch(page), true);
    await stripesSwitch(page).click();
    await expectPressed(stripesSwitch(page), true);
  });
});

test.describe("the corner over the board and the panel without SHOW (D-35)", () => {
  test("9. the panel holds no tick box, and reads On the Racks, Tail Rail, View and Export", async ({ page }) => {
    await page.goto("/design/3d");
    await waitForBoard(page);
    const panel = page.locator("[data-three-d-controls]");
    await expect(panel.getByRole("checkbox")).toHaveCount(0);
    const headings = [THREE_D_COPY.racksHeading, THREE_D_COPY.tailRailHeading, THREE_D_COPY.viewHeading, THREE_D_COPY.exportHeading];
    const tops: number[] = [];
    for (const heading of headings) {
      const box = await panel.getByText(heading, { exact: true }).boundingBox();
      tops.push(box!.y);
    }
    expect([...tops].sort((a, b) => a - b)).toEqual(tops);
  });

  /** No board dot under `rect` (in canvas dots), outside the canvas's rounded corner. */
  async function boardDotsUnder(host: Locator, rect: { x: number; y: number; width: number; height: number }) {
    await settled(host);
    const pic = decodePng(await host.screenshot({ scale: "css", style: HIDE_THE_CORNER }));
    const ground = groundDot(pic);
    let dots = 0;
    for (let y = Math.max(0, Math.floor(rect.y)); y < Math.min(pic.height, Math.ceil(rect.y + rect.height)); y++) {
      for (let x = Math.max(0, Math.floor(rect.x)); x < Math.min(pic.width, Math.ceil(rect.x + rect.width)); x++) {
        const inCorner = (x < 8 || x >= pic.width - 8) && (y < 8 || y >= pic.height - 8);
        if (inCorner) continue;
        const i = 4 * (y * pic.width + x);
        if ([0, 1, 2].some((k) => Math.abs(pic.rgba[i + k] - ground[k]) > 12)) dots += 1;
      }
    }
    return dots;
  }

  async function expectCornerClear(page: Page) {
    await page.goto("/design/3d");
    const host = await waitForBoard(page);
    const views: (ViewName | null)[] = [null, "deck", "bottom", "side", "nose", "tail"];
    for (const view of views) {
      if (view) await showView(page, host, view);
      const canvas = (await host.boundingBox())!;
      const row = (await page.locator("[data-viewer-toolbar]").boundingBox())!;
      const zoom = await page.locator("[data-viewer-zoom]").boundingBox();
      for (const box of zoom ? [row, zoom] : [row]) {
        const rect = { x: box.x - canvas.x, y: box.y - canvas.y, width: box.width, height: box.height };
        expect(await boardDotsUnder(host, rect), `${view ?? "first view"}: board dots under the corner`).toBe(0);
      }
    }
  }

  test("10. at 1x, in the first view and each of the five views, no board dot lies under the corner's rows", async ({ page }) => {
    await expectCornerClear(page);
  });

  for (const [width, height, where] of [
    [320, 568, "a 320-dot phone"],
    [844, 390, "a sideways iPhone"],
  ] as const) {
    test(`10. the same on ${where}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "iphone", "one phone at this size");
      await page.setViewportSize({ width, height });
      await expectCornerClear(page);
    });
  }
});
