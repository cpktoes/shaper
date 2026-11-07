import { expect, test, type Locator, type Page } from "@playwright/test";
import { THREE_D_COPY } from "../components/3d/three-d-copy";
import { presetDesignFields } from "../lib/blanks/preset-blanks";
import { BOARD_PRESETS } from "../lib/geometry/presets";
import { mmToInches } from "../lib/geometry/units";
import { DEFAULT_VOLUME_SPEC } from "../lib/geometry/volume";
import { BANNER_DISMISSAL_KEY } from "../lib/models/banner-dismissal";
import type { DesignSnapshotFields } from "../lib/models/design-snapshot";
import { OPEN_BOARD_STORAGE_KEY, openBoardCopyJson } from "../lib/models/open-board";
import { TOOLBAR_TIP_DISMISSAL_KEY } from "../lib/models/toolbar-tip";
import { countDifferent, countUnlike, decodePng, hexToRgb } from "./helpers/canvas-pixels";
import { appSettingsDialog, openAppSettings } from "./helpers/settings";

/**
 * The wire view (Phase 16, D-42, the founder's Shape3D picture): a # switch in the 3D corner draws the board as very thin
 * black lines across and along it on a plain foam, near side only, one look at a time with Contour Stripes, and changes
 * nothing but the picture. The lines' counts and places are proven in lib/geometry/board-surface.test.ts; the zip with
 * the switch on is proven byte for byte in e2e/three-d-export.spec.ts, and the corner in e2e/viewer-toolbar.spec.ts and
 * e2e/three-d-show.spec.ts.
 */

/** WebKit draws its first frame more slowly on the suite's development server (about 5 s measured). */
const FIRST_FRAME_MS = 30_000;
/** A canvas screenshot covers the corner: this keeps a button's pressed fill out of every comparison. */
const HIDE_THE_CORNER = "[data-viewer-zoom], [data-viewer-toolbar] { visibility: hidden !important; }";

const BLACK = [0, 0, 0] as const;

async function frames(host: Locator) {
  return Number((await host.getAttribute("data-frames")) ?? 0);
}

async function waitForBoard(page: Page) {
  const host = page.locator("[data-board-3d]");
  await expect(host).toHaveAttribute("data-board-state", "ready", { timeout: FIRST_FRAME_MS });
  await expect.poll(async () => frames(host), { timeout: FIRST_FRAME_MS }).toBeGreaterThanOrEqual(1);
  await page.waitForFunction(() => {
    const el = document.querySelector("[data-viewer-toolbar] button");
    return !!el && Object.keys(el).some((key) => key.startsWith("__reactFiber"));
  });
  return host;
}

/** Waits until the board has stopped drawing: the same turn and frame count across a beat. */
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

async function picture(host: Locator) {
  await settled(host);
  return decodePng(await host.screenshot({ scale: "css", style: HIDE_THE_CORNER }));
}

type Picture = Awaited<ReturnType<typeof picture>>;

const corner = (page: Page, name: string) => page.locator("[data-viewer-toolbar]").getByRole("button", { name, exact: true });
const wireSwitch = (page: Page) => corner(page, THREE_D_COPY.wireView);
const stripesSwitch = (page: Page) => corner(page, THREE_D_COPY.contourStripes);
const expectPressed = (button: Locator, pressed: boolean) => expect(button).toHaveAttribute("aria-pressed", String(pressed));

async function tokenRgb(page: Page, name: string): Promise<[number, number, number]> {
  return hexToRgb(await page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name));
}

/** A preset, kept in this browser as the open board, so /design/3d opens on it. */
async function keepPreset(page: Page, name: string) {
  const preset = BOARD_PRESETS.find((p) => p.name === name);
  if (!preset) throw new Error(`no ${name} preset`);
  const fields: DesignSnapshotFields = {
    ...presetDesignFields(preset),
    volume: DEFAULT_VOLUME_SPEC,
    finsImportTemplate: true,
    railsImportFoilThickness: true,
    boardName: "",
    finSystem: "fcs2",
  };
  const raw = openBoardCopyJson(fields, { modelId: null, ownerId: null, locked: false, dirty: true });
  await page.addInitScript(([key, value]) => window.localStorage.setItem(key, value), [OPEN_BOARD_STORAGE_KEY, raw] as const);
}

/** How many dark lines a column of the picture crosses, from the board's edge to its edge. */
function linesCrossed(pic: Picture, x: number, dark: readonly number[]) {
  let lines = 0;
  let on = false;
  for (let y = 0; y < pic.height; y++) {
    const i = 4 * (y * pic.width + x);
    const isDark = [0, 1, 2].every((k) => Math.abs(pic.rgba[i + k] - dark[k]) < 90);
    if (isDark && !on) lines += 1;
    on = isDark;
  }
  return lines;
}

test.beforeEach(async ({ page }) => {
  test.setTimeout(120_000);
  await page.addInitScript(
    ([bannerKey, tipKey]) => {
      window.sessionStorage.setItem(bannerKey, "true");
      window.localStorage.setItem(tipKey, "true");
      // These measure the board against a plain ground, so the room is off (the Room switch's own path, 16-18).
      (globalThis as { __shaper3dBareRoom?: boolean }).__shaper3dBareRoom = true;
    },
    [BANNER_DISMISSAL_KEY, TOOLBAR_TIP_DISMISSAL_KEY] as const,
  );
});

test.describe("the wire view (D-42)", () => {
  test("0. every line is one real pixel of the screen, and pure black", async ({ page }) => {
    await keepPreset(page, "Fish");
    await page.goto("/design/3d");
    const host = await waitForBoard(page);
    const density = () =>
      host.evaluate((el) => {
        const canvas = el.querySelector("canvas") as HTMLCanvasElement;
        return { drawn: canvas.width / canvas.clientWidth, screen: window.devicePixelRatio };
      });
    const before = await density();
    expect(before.drawn).toBeCloseTo(Math.min(before.screen, 2), 1);

    await wireSwitch(page).click();
    await expectPressed(wireSwitch(page), true);
    await expect.poll(async () => (await density()).drawn).toBeCloseTo(before.screen, 1);
    await settled(host);
    // At the screen's own pixels: the lines reach black, at any theme's foam.
    const pic = decodePng(await host.screenshot({ style: HIDE_THE_CORNER }));
    expect(pic.width * pic.height - countUnlike(pic.rgba, BLACK, 40)).toBeGreaterThan(100);

    await wireSwitch(page).click();
    await expect.poll(async () => (await density()).drawn).toBeCloseTo(before.drawn, 1);
  });

  test("0b. a switch pressed while the drawing context is gone draws at the right density when it comes back", async ({ page }) => {
    await page.goto("/design/3d");
    const host = await waitForBoard(page);
    const density = () =>
      host.evaluate((el) => {
        const canvas = el.querySelector("canvas") as HTMLCanvasElement;
        return { drawn: canvas.width / canvas.clientWidth, screen: window.devicePixelRatio };
      });
    const lit = (await density()).drawn;
    // A lost context hands out no extensions, so the one that lost it is kept to bring it back.
    const loseContext = () =>
      page.evaluate(async () => {
        const canvas = document.querySelector("[data-board-3d] canvas") as HTMLCanvasElement;
        const ext = canvas.getContext("webgl2")?.getExtension("WEBGL_lose_context");
        if (!ext) throw new Error("no WEBGL_lose_context");
        (window as unknown as { contextHandle: typeof ext }).contextHandle = ext;
        const lost = new Promise((resolve) => canvas.addEventListener("webglcontextlost", resolve, { once: true }));
        ext.loseContext();
        await lost;
      });
    const restoreContext = () =>
      page.evaluate(() => (window as unknown as { contextHandle: WEBGL_lose_context }).contextHandle.restoreContext());

    for (const on of [true, false]) {
      await loseContext();
      await expect(host).toHaveAttribute("data-board-state", "lost");
      await wireSwitch(page).click();
      await expectPressed(wireSwitch(page), on);
      await restoreContext();
      await expect(host).toHaveAttribute("data-board-state", "ready", { timeout: FIRST_FRAME_MS });
      const { screen } = await density();
      await expect.poll(async () => (await density()).drawn).toBeCloseTo(on ? screen : lit, 1);
    }
  });

  test("1. the # switch draws dark lines on a plain foam, keeps the view, and gives the same frame back", async ({ page }, testInfo) => {
    await keepPreset(page, "Fish");
    await page.goto("/design/3d");
    const host = await waitForBoard(page);
    const wire = wireSwitch(page);
    await expectPressed(wire, false);
    await expect(wire).toBeEnabled();
    await expect(wire).toHaveAttribute("data-lock-exempt");
    await expect(wire).toHaveAttribute("data-three-d-show", "wire");
    await expect(wire).toHaveAttribute("title", THREE_D_COPY.wireViewTip);
    await expect(wire).toHaveAccessibleDescription(THREE_D_COPY.wireViewTip);

    const turn = await host.getAttribute("data-turn");
    const crop = await host.getAttribute("data-crop");
    const shaded = await picture(host);
    const foam = await tokenRgb(page, "--surf-foam");
    const ground = await tokenRgb(page, "--surf-3d-ground");

    await wire.click();
    await expectPressed(wire, true);
    const drawn = await picture(host);
    expect(await host.getAttribute("data-turn")).toBe(turn);
    expect(await host.getAttribute("data-crop")).toBe(crop);

    // A plain foam: the board's dots are now the foam's own colour or the lines', with no lit shading between them.
    const board = countUnlike(drawn.rgba, ground, 6);
    const onFoam = drawn.width * drawn.height - countUnlike(drawn.rgba, foam, 4);
    const onBlack = drawn.width * drawn.height - countUnlike(drawn.rgba, BLACK, 90);
    expect(onFoam / board).toBeGreaterThan(0.25);
    expect(onBlack / board).toBeGreaterThan(0.01);

    await wire.click();
    await expectPressed(wire, false);
    const again = await picture(host);
    if (testInfo.project.name === "desktop") expect(countDifferent(shaded.rgba, again.rgba, 0)).toBe(0);
    else expect(countDifferent(shaded.rgba, again.rgba, 2) / (again.width * again.height)).toBeLessThan(0.0005);
  });

  test("2. near side only: the foam hides the lines behind it", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "one computer has the dots to count lines by");
    await keepPreset(page, "Fish");
    await page.goto("/design/3d");
    const host = await waitForBoard(page);
    await wireSwitch(page).click();
    // Straight overhead, from Walk Around's Deck, then back on the plain ground.
    await corner(page, THREE_D_COPY.room).click();
    await page.getByRole("group", { name: THREE_D_COPY.modeGroup, exact: true }).getByRole("button", {
      name: THREE_D_COPY.modeWalk,
      exact: true,
    }).click();
    await page.getByRole("group", { name: THREE_D_COPY.viewsGroup, exact: true }).getByRole("button", {
      name: THREE_D_COPY.views.deck,
      exact: true,
    }).click();
    await settled(host);
    // Overhead stands nose to the back wall; a quarter walk lays the board across the picture, nose left.
    await host.focus();
    for (let i = 0; i < 6; i++) await page.keyboard.press("ArrowRight");
    await settled(host);
    // Two presses back to no room: the first stops at the bright blue room.
    await corner(page, THREE_D_COPY.room).click();
    await corner(page, THREE_D_COPY.room).click();
    await settled(host);
    // Tipped a little, so the bottom's lines would land between the deck's if the foam let them through.
    await host.focus();
    await page.keyboard.press("ArrowUp");
    await settled(host);
    const pic = await picture(host);
    // A column across the board away from the middle: only the deck's lines, the stringer and the rail's own loop.
    const deckLines = Math.floor(mmToInches(BOARD_PRESETS.find((p) => p.name === "Fish")!.outline.widePointWidth));
    const crossed = linesCrossed(pic, Math.round(pic.width * 0.42), BLACK);
    expect(crossed).toBeGreaterThan(deckLines / 2);
    expect(crossed).toBeLessThanOrEqual(deckLines + 4);
  });

  test("3. one look at a time: Wire View and Contour Stripes each turn the other off", async ({ page }) => {
    await keepPreset(page, "Fish");
    await page.goto("/design/3d");
    await waitForBoard(page);
    await stripesSwitch(page).click();
    await expectPressed(stripesSwitch(page), true);
    await wireSwitch(page).click();
    await expectPressed(wireSwitch(page), true);
    await expectPressed(stripesSwitch(page), false);
    await stripesSwitch(page).click();
    await expectPressed(stripesSwitch(page), true);
    await expectPressed(wireSwitch(page), false);
  });

  test("4. the fins and the blank draw as they do, and Wire View is live on them", async ({ page }) => {
    await keepPreset(page, "Fish");
    await page.goto("/design/3d");
    const host = await waitForBoard(page);
    await wireSwitch(page).click();
    await expectPressed(wireSwitch(page), true);
    const drawn = await picture(host);
    await corner(page, THREE_D_COPY.blank).click();
    await expectPressed(corner(page, THREE_D_COPY.blank), true);
    const ghosted = await picture(host);
    expect(countDifferent(drawn.rgba, ghosted.rgba, 2)).toBeGreaterThan(0);
    await expectPressed(wireSwitch(page), true);
  });

  test("5. nothing else changes: the litres stay, nothing can be undone, and the switch is off on the next visit", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "one computer walks the top row");
    await page.goto("/design/volume");
    const litres = page.getByText(/^\d+\.\d\d L$/).first();
    await expect(litres).toBeVisible({ timeout: FIRST_FRAME_MS });
    const reading = await litres.innerText();

    await page.getByRole("link", { name: "3D", exact: true }).first().click();
    await waitForBoard(page);
    const undo = page.getByRole("button", { name: "Undo", exact: true });
    const undoable = async () => ((await undo.count()) > 0 ? undo.isEnabled() : false);
    const before3d = await undoable();
    await wireSwitch(page).click();
    await expectPressed(wireSwitch(page), true);
    expect(await undoable()).toBe(before3d);

    await page.getByRole("link", { name: "VOLUME", exact: true }).first().click();
    await expect(litres).toHaveText(reading);
    await page.getByRole("link", { name: "3D", exact: true }).first().click();
    await waitForBoard(page);
    await expectPressed(wireSwitch(page), false);
  });

  test("6. a theme change repaints the wire view's foam in place, and it stays black lines on a light board", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "one computer switches the theme through App Default Settings");
    await keepPreset(page, "Fish");
    await page.goto("/design/3d");
    const host = await waitForBoard(page);
    await wireSwitch(page).click();
    await expectPressed(wireSwitch(page), true);
    const turn = await host.getAttribute("data-turn");

    const dialog = await openAppSettings(page);
    await dialog.locator('[data-theme-tile="slate"]').click();
    await expect(page.locator("html")).toHaveClass(/(^|\s)theme-slate(\s|$)/);
    await page.keyboard.press("Escape");
    await expect(appSettingsDialog(page)).toBeHidden();

    const foam = await tokenRgb(page, "--surf-foam");
    expect(foam[0] + foam[1] + foam[2]).toBeGreaterThan(3 * 128);
    await expect
      .poll(
        async () => {
          const pic = await picture(host);
          return pic.width * pic.height - countUnlike(pic.rgba, foam, 4);
        },
        { timeout: 10_000 },
      )
      .toBeGreaterThan(1000);
    expect(await host.getAttribute("data-turn")).toBe(turn);
    const pic = await picture(host);
    expect(pic.width * pic.height - countUnlike(pic.rgba, BLACK, 90)).toBeGreaterThan(100);
  });
});
