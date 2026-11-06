import { expect, test, type Locator, type Page } from "@playwright/test";
import { THREE_D_COPY } from "../components/3d/three-d-copy";
import { AT_REST, BAY, BOTTOM_UP, rackAngles, rackTurn, REST_VIEWER, shownAngles, WALK_VIEWS } from "../lib/geometry/shaping-bay";
import { type Quat } from "../lib/geometry/view-3d";
import { BANNER_DISMISSAL_KEY } from "../lib/models/banner-dismissal";
import { TOOLBAR_TIP_DISMISSAL_KEY } from "../lib/models/toolbar-tip";
import { decodePng } from "./helpers/canvas-pixels";

/**
 * The shaping bay (Phase 16, plan 18, D-43, D-44): a drawn room, the board on its racks, one control per plane in the
 * panel, and two ways a drag can go.
 *
 * The host reports what the tests read: `data-turn` (the board's turn), `data-room` (the camera and the strips' ends,
 * read back from the scene after every frame), `data-place` (the board's centre in the room), `data-racks` (the racks'
 * own turn, read back from the scene: always none), `data-viewer` (azimuth, elevation, sight), `data-mode` and `data-bay`.
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

/** Sets a slider to a value on its own scale, as a drag of its thumb would. */
async function setSlider(page: Page, name: string, value: number) {
  await slider(page, name).evaluate((el, v) => {
    const input = el as HTMLInputElement;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, String(v));
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
}

function button(page: Page, name: string) {
  return page.getByRole("button", { name, exact: true });
}

function view(page: Page, name: string) {
  return page.getByRole("group", { name: THREE_D_COPY.viewsGroup, exact: true }).getByRole("button", { name, exact: true });
}

/** What the hidden live region says. */
function spoken(page: Page) {
  return page.locator("[data-three-d-spoken]");
}

async function viewerOf(host: Locator): Promise<number[]> {
  return ((await host.getAttribute("data-viewer")) ?? "").split(" ").map(Number);
}

/** Waits until nothing is moving: the same turn and the same viewer across a quarter second. */
async function settled(host: Locator) {
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

/** A drag across the canvas by (dx, dy) from its centre: a finger on the Android phone, the mouse elsewhere. */
async function dragBoard(page: Page, projectName: string, dx: number, dy: number, steps = 8) {
  const box = await boardHost(page).boundingBox();
  if (!box) throw new Error("the 3D canvas has no box");
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  if (projectName === "android") {
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

/** A control's touch size, by e2e/rocker-custom.spec.ts's house rule. */
async function touchSize(control: Locator): Promise<{ width: number; height: number }> {
  return control.evaluate((el) => {
    const b = el as HTMLElement;
    const after = getComputedStyle(b, "::after");
    const grow = after.content === "none" || after.position !== "absolute" ? 0 : -parseFloat(after.left || "0");
    return { width: b.offsetWidth + 2 * grow, height: b.offsetHeight + 2 * grow };
  });
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

  test("2. Flip the Board turns it over on the racks, keeps every reading, and a screen reader hears which face is up", async ({ page }) => {
    await page.goto("/design/3d");
    const host = await waitForBoard(page);
    await setSlider(page, THREE_D_COPY.rotateOnSide, 20);
    await expect(slider(page, THREE_D_COPY.rotateOnSide)).toHaveValue("20");
    await button(page, THREE_D_COPY.flip).click();
    await expect(spoken(page)).toHaveText(THREE_D_COPY.flipSpoken.bottom);
    await expect.poll(async () => isTurn(await turnOf(host), rackTurn({ ...AT_REST, roll: 200 })), { timeout: 10_000 }).toBe(true);
    await settled(host);
    await expect(slider(page, THREE_D_COPY.rotateOnSide)).toHaveValue("20");
    await button(page, THREE_D_COPY.flip).click();
    await expect(spoken(page)).toHaveText(THREE_D_COPY.flipSpoken.deck);
    await expect.poll(async () => isTurn(await turnOf(host), rackTurn({ ...AT_REST, roll: 20 })), { timeout: 10_000 }).toBe(true);
    await settled(host);
    await expect(slider(page, THREE_D_COPY.rotateOnSide)).toHaveValue("20");
  });

  test("3. Raise the Nose lifts that end with the other on its rack, and Raise the Tail brings the nose back down", async ({ page }) => {
    await page.goto("/design/3d");
    const host = await waitForBoard(page);
    const room = await host.getAttribute("data-room");
    const rest = await placeOf(host);
    const nose = slider(page, THREE_D_COPY.raiseNose);
    const tail = slider(page, THREE_D_COPY.raiseTail);
    await setSlider(page, THREE_D_COPY.raiseNose, 12);
    await expect.poll(async () => (await placeOf(host))[1]).toBeGreaterThan(rest[1]);
    const up = rackAngles((await turnOf(host)) as unknown as Quat);
    expect(up.lift).toBeGreaterThan(0);
    await expect(page.locator("[data-three-d-racks]").getByText(`${THREE_D_COPY.raiseNose} — 12"`, { exact: true })).toBeVisible();
    expect(await host.getAttribute("data-room")).toBe(room);
    // One at a time: moving the other brings this one back to rest.
    await setSlider(page, THREE_D_COPY.raiseTail, 6);
    await expect(page.locator("[data-three-d-racks]").getByText(`${THREE_D_COPY.raiseNose} — ${THREE_D_COPY.onTheRack}`, { exact: true })).toBeVisible();
    await expect(nose).toHaveValue("0");
    await expect.poll(async () => rackAngles((await turnOf(host)) as unknown as Quat).lift).toBeLessThan(0);
    await expect(tail).toHaveValue("6");
  });

  test("4. the racks never move: there is no Swing, and neither a sideways drag nor a button shifts them", async ({ page }, testInfo) => {
    test.setTimeout(240_000);
    await page.goto("/design/3d");
    const host = await waitForBoard(page);
    await expect(page.getByRole("slider", { name: "Swing", exact: true })).toHaveCount(0);
    await expect(page.locator("[data-three-d-controls]").getByText("Swing", { exact: false })).toHaveCount(0);
    const room = await host.getAttribute("data-room");
    const box = await host.boundingBox();
    if (!box) throw new Error("no canvas");

    // A sideways drag from behind the tail rotates the board on its side, at a drag's full rate. No swing reaches the turn.
    // The iPhone's suite browser has no real finger to give, so there the arrow key takes the same road (`rackKey`).
    if (testInfo.project.name === "iphone") {
      await host.focus();
      await page.keyboard.press("ArrowRight");
    } else {
      await dragBoard(page, testInfo.project.name, Math.min(box.width, box.height) / 4, 0);
    }
    await settled(host);
    const dragged = rackAngles((await turnOf(host)) as unknown as Quat);
    expect(dragged.roll).toBeGreaterThan(10);
    expect(Math.abs(dragged.swing)).toBeLessThan(0.05);
    expect(Math.abs(dragged.lift)).toBeLessThan(0.05);
    await expect(host).toHaveAttribute("data-racks", "0.00");
    expect((await placeOf(host))[2]).toBe(0);
    expect(await host.getAttribute("data-room")).toBe(room);

    // Nor does any button.
    for (const name of ["side", "nose", "tail", "bottom", "deck"] as const) {
      await view(page, THREE_D_COPY.views[name]).click();
      await page.waitForTimeout(500);
      await settled(host);
      await expect(host).toHaveAttribute("data-racks", "0.00");
      expect((await placeOf(host))[2]).toBe(0);
    }
  });

  test("5. a drag and the controls stay in step, and a control moves its own plane alone", async ({ page }, testInfo) => {
    await page.goto("/design/3d");
    const host = await waitForBoard(page);
    await setSlider(page, THREE_D_COPY.raiseNose, 6);
    await expect.poll(async () => rackAngles((await turnOf(host)) as unknown as Quat).lift).toBeGreaterThan(1);
    if (testInfo.project.name === "iphone") {
      await host.focus();
      await page.keyboard.press("ArrowRight");
    } else {
      await dragBoard(page, testInfo.project.name, 40, 0);
    }
    await settled(host);
    const turn = (await turnOf(host)) as unknown as Quat;
    const shown = shownAngles(turn, false);
    expect(Math.abs(Number(await slider(page, THREE_D_COPY.rotateOnSide).inputValue()) - shown.roll)).toBeLessThanOrEqual(1);
    // The roll's move changes the roll: the lift stays what it exactly was, not what a thumb rounds to.
    await setSlider(page, THREE_D_COPY.rotateOnSide, Math.round(shown.roll) + 7);
    await expect.poll(async () => Math.abs(rackAngles((await turnOf(host)) as unknown as Quat).roll - Math.round(shown.roll) - 7)).toBeLessThan(0.05);
    const after = rackAngles((await turnOf(host)) as unknown as Quat);
    expect(Math.abs(after.lift - shown.lift)).toBeLessThan(0.05);
    expect(Math.abs(after.swing)).toBeLessThan(0.05);
  });

  test("6. a drag past the limit stops with the nose at 60°", async ({ page }, testInfo) => {
    await page.goto("/design/3d");
    const host = await waitForBoard(page);
    const box = await host.boundingBox();
    if (!box) throw new Error("no canvas");
    // From the tail, dragging down the picture tips the nose up. Half a turn in short strokes: far past the limit.
    // The iPhone's suite browser has no real finger to give, so there the arrow keys take the same road (`heldTurn`).
    if (testInfo.project.name === "iphone") {
      await host.focus();
      for (let i = 0; i < 6; i++) await page.keyboard.press("ArrowDown");
    } else {
      for (let i = 0; i < 3; i++) {
        await dragBoard(page, testInfo.project.name, 0, Math.min(box.width, box.height) * 0.4, 12);
        await settled(host);
      }
    }
    const { lift } = rackAngles((await turnOf(host)) as unknown as Quat);
    expect(Math.abs(lift)).toBeLessThanOrEqual(BAY.liftLimitDeg + 0.05);
    expect(Math.abs(lift)).toBeGreaterThan(BAY.liftLimitDeg - 1);
  });

  test("7. the buttons do what the founder said: Deck and Bottom on the racks, Nose and Tail zoomed to the board, Reset View home", async ({ page }) => {
    test.setTimeout(240_000);
    await page.goto("/design/3d");
    const host = await waitForBoard(page);
    await setSlider(page, THREE_D_COPY.raiseNose, 8);
    await setSlider(page, THREE_D_COPY.rotateOnSide, 30);
    await setSlider(page, THREE_D_COPY.lookDownRail, 3);
    await view(page, THREE_D_COPY.views.bottom).click();
    await expect.poll(async () => isTurn(await turnOf(host), rackTurn(BOTTOM_UP)), { timeout: 10_000 }).toBe(true);
    for (const name of [THREE_D_COPY.raiseNose, THREE_D_COPY.raiseTail, THREE_D_COPY.rotateOnSide, THREE_D_COPY.lookDownRail]) {
      await expect(slider(page, name)).toHaveValue("0");
    }
    // Turn the Board: the viewer stayed where it stood.
    await expect.poll(async () => (await viewerOf(host))[0]).toBe(REST_VIEWER.azimuthDeg);
    expect((await viewerOf(host))[1]).toBe(REST_VIEWER.elevationDeg);

    const turned = await host.getAttribute("data-turn");
    await view(page, THREE_D_COPY.views.nose).click();
    await expect.poll(async () => (await viewerOf(host))[0], { timeout: 10_000 }).toBeCloseTo(180, 1);
    await settled(host);
    expect(await host.getAttribute("data-turn")).toBe(turned);
    const level = Number(((await host.getAttribute("data-crop")) ?? "").split(" ")[0]);
    expect(level).toBeGreaterThan(1);
    // The zoom row reads the true level.
    await expect(page.locator("[data-viewer-zoom]")).toBeAttached();

    await view(page, THREE_D_COPY.views.side).click();
    await expect.poll(async () => (await viewerOf(host))[0], { timeout: 10_000 }).toBeCloseTo(90, 1);
    await expect(host).toHaveAttribute("data-crop", "1 0.0000 0.0000");

    await view(page, THREE_D_COPY.resetView).click();
    await expect.poll(async () => isTurn(await turnOf(host), rackTurn(AT_REST)), { timeout: 10_000 }).toBe(true);
    await expect.poll(async () => viewerOf(host)).toEqual([REST_VIEWER.azimuthDeg, REST_VIEWER.elevationDeg, 0]);
  });

  test("8. Look Down the Rail moves the eye a little either way, and neither the board nor the strips", async ({ page }) => {
    await page.goto("/design/3d");
    const host = await waitForBoard(page);
    await view(page, THREE_D_COPY.views.tail).click();
    await expect.poll(async () => (await viewerOf(host))[1], { timeout: 10_000 }).toBeCloseTo(WALK_VIEWS.tail.elevationDeg, 1);
    await settled(host);
    const turn = await host.getAttribute("data-turn");
    const before = JSON.parse((await host.getAttribute("data-room")) ?? "{}");
    await setSlider(page, THREE_D_COPY.lookDownRail, 6);
    await expect.poll(async () => (await viewerOf(host))[2]).toBe(6);
    await settled(host);
    const after = JSON.parse((await host.getAttribute("data-room")) ?? "{}");
    expect(await host.getAttribute("data-turn")).toBe(turn);
    expect(after.lights).toEqual(before.lights);
    expect(after.camera).not.toEqual(before.camera);
    await expect(page.getByText(`${THREE_D_COPY.lookDownRail} — 6° right`, { exact: true })).toBeVisible();
  });

  test("8b. a slider moved while a view is on its way finishes that move, and never strands the viewer halfway", async ({ page }) => {
    await page.goto("/design/3d");
    const host = await waitForBoard(page);
    await view(page, THREE_D_COPY.views.side).click();
    await expect.poll(async () => (await viewerOf(host))[0], { timeout: 10_000 }).toBeCloseTo(WALK_VIEWS.side.azimuthDeg, 1);
    await settled(host);
    // Both in one go, inside the page: Reset View has only just begun when the slider moves.
    await page.evaluate((name) => {
      const reset = [...document.querySelectorAll("[role=group] button")].find((b) => b.textContent === "Reset View");
      (reset as HTMLButtonElement).click();
      const input = document.querySelector(`input[aria-label="${name}"]`) as HTMLInputElement;
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, "45");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }, THREE_D_COPY.rotateOnSide);
    await settled(host);
    expect(await viewerOf(host)).toEqual([REST_VIEWER.azimuthDeg, REST_VIEWER.elevationDeg, 0]);
    expect(isTurn(await turnOf(host), rackTurn({ ...AT_REST, roll: 45 }))).toBe(true);
  });

  test("9. on a coarse pointer each control has 44 dots of touch", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "a mouse doesn't need it");
    await page.goto("/design/3d");
    await waitForBoard(page);
    const flip = await touchSize(button(page, THREE_D_COPY.flip));
    expect(flip.height).toBeGreaterThanOrEqual(44);
    const thumbs = page.locator("[data-three-d-racks] [data-slot='slider-thumb']");
    await expect(thumbs).toHaveCount(3);
    for (const thumb of await thumbs.all()) {
      const size = await touchSize(thumb);
      expect(size.height).toBeGreaterThanOrEqual(44);
      expect(size.width).toBeGreaterThanOrEqual(44);
    }
    for (const pill of await page.getByRole("group", { name: THREE_D_COPY.modeGroup, exact: true }).getByRole("button").all()) {
      expect((await touchSize(pill)).height).toBeGreaterThanOrEqual(44);
    }
  });
});

function modeButton(page: Page, name: string) {
  return page.getByRole("group", { name: THREE_D_COPY.modeGroup, exact: true }).getByRole("button", { name, exact: true });
}

function cornerSwitch(page: Page, name: string) {
  return page.locator("[data-viewer-toolbar]").getByRole("button", { name, exact: true });
}

test.describe("Walk Around (D-43)", () => {
  test("11. the switch moves nothing, and then a drag moves the viewer, never the board or the strips", async ({ page }, testInfo) => {
    await page.goto("/design/3d");
    const host = await waitForBoard(page);
    await expect(modeButton(page, THREE_D_COPY.modeTurn)).toHaveAttribute("aria-pressed", "true");
    await expect(host).toHaveAttribute("data-mode", "turn");
    const turn = await host.getAttribute("data-turn");
    const room = JSON.parse((await host.getAttribute("data-room")) ?? "{}");
    const frames = await host.getAttribute("data-frames");

    await modeButton(page, THREE_D_COPY.modeWalk).click();
    await expect(host).toHaveAttribute("data-mode", "walk");
    await expect(modeButton(page, THREE_D_COPY.modeWalk)).toHaveAttribute("aria-pressed", "true");
    await page.waitForTimeout(300);
    expect(await host.getAttribute("data-frames")).toBe(frames);
    expect(await host.getAttribute("data-turn")).toBe(turn);

    const box = await host.boundingBox();
    if (!box) throw new Error("no canvas");
    await dragBoard(page, testInfo.project.name, Math.min(box.width, box.height) / 4, 0);
    await settled(host);
    const walked = JSON.parse((await host.getAttribute("data-room")) ?? "{}");
    expect(await host.getAttribute("data-turn")).toBe(turn);
    expect(walked.lights).toEqual(room.lights);
    expect(walked.camera).not.toEqual(room.camera);
    expect((await viewerOf(host))[0]).not.toBe(REST_VIEWER.azimuthDeg);

    // The sliders still move the board in this mode: the mode decides only what a drag does.
    await setSlider(page, THREE_D_COPY.rotateOnSide, 30);
    await expect.poll(async () => isTurn(await turnOf(host), rackTurn({ ...AT_REST, roll: 30 })), { timeout: 10_000 }).toBe(true);
  });

  test("12. a long walk stops at the floor and overhead, and the room's walls hold the eye", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "iphone", "a real drag is proven on the other two; the limits are the maths' own");
    await page.goto("/design/3d");
    const host = await waitForBoard(page);
    await modeButton(page, THREE_D_COPY.modeWalk).click();
    const box = await host.boundingBox();
    if (!box) throw new Error("no canvas");
    const short = Math.min(box.width, box.height);
    // Dragging up the picture brings the eye down: past the floor's limit it stays there.
    for (let i = 0; i < 2; i++) {
      await dragBoard(page, testInfo.project.name, 0, -short * 0.4, 8);
      await settled(host);
    }
    const low = (await viewerOf(host))[1];
    expect(low).toBeLessThan(0);
    const { camera } = JSON.parse((await host.getAttribute("data-room")) ?? "{}");
    expect(camera[1]).toBeGreaterThanOrEqual(BAY.viewerFloorMm - 1);
    // And dragging down lifts it to straight overhead, no further.
    for (let i = 0; i < 4; i++) {
      await dragBoard(page, testInfo.project.name, 0, short * 0.4, 8);
      await settled(host);
    }
    expect((await viewerOf(host))[1]).toBeCloseTo(WALK_VIEWS.deck.elevationDeg, 1);
  });

  test("13. each view walks to its place, Bottom flips the board, Deck flips it back, and Reset View keeps the mode", async ({ page }) => {
    test.setTimeout(240_000);
    await page.goto("/design/3d");
    const host = await waitForBoard(page);
    await modeButton(page, THREE_D_COPY.modeWalk).click();

    await view(page, THREE_D_COPY.views.bottom).click();
    await expect.poll(async () => isTurn(await turnOf(host), rackTurn(BOTTOM_UP)), { timeout: 10_000 }).toBe(true);
    await expect.poll(async () => viewerOf(host)).toEqual([WALK_VIEWS.bottom.azimuthDeg, WALK_VIEWS.bottom.elevationDeg, 0]);

    await view(page, THREE_D_COPY.views.deck).click();
    await expect.poll(async () => isTurn(await turnOf(host), rackTurn(AT_REST)), { timeout: 10_000 }).toBe(true);

    for (const name of ["side", "nose", "tail"] as const) {
      await view(page, THREE_D_COPY.views[name]).click();
      await expect.poll(async () => viewerOf(host), { timeout: 10_000 }).toEqual([WALK_VIEWS[name].azimuthDeg, WALK_VIEWS[name].elevationDeg, 0]);
    }

    await view(page, THREE_D_COPY.resetView).click();
    await expect.poll(async () => viewerOf(host), { timeout: 10_000 }).toEqual([REST_VIEWER.azimuthDeg, REST_VIEWER.elevationDeg, 0]);
    await expect(host).toHaveAttribute("data-mode", "walk");
    await expect(host).toHaveAttribute("data-crop", "1 0.0000 0.0000");
  });

  test("14. Turn the Board from a walked place: a drag turns the board like a ball under the hand from where you stand", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "iphone", "a real drag is proven on the other two");
    await page.goto("/design/3d");
    const host = await waitForBoard(page);
    await view(page, THREE_D_COPY.views.side).click();
    await expect.poll(async () => (await viewerOf(host))[0], { timeout: 10_000 }).toBeCloseTo(WALK_VIEWS.side.azimuthDeg, 1);
    await settled(host);
    const room = await host.getAttribute("data-room");
    const box = await host.boundingBox();
    if (!box) throw new Error("no canvas");
    // From the rail, dragging down the picture rolls the near rail down: all roll, no lift and no swing.
    await dragBoard(page, testInfo.project.name, 0, Math.min(box.width, box.height) / 6);
    await settled(host);
    const a = rackAngles((await turnOf(host)) as unknown as Quat);
    expect(Math.abs(a.roll)).toBeGreaterThan(5);
    expect(Math.abs(a.swing)).toBeLessThan(0.5);
    expect(Math.abs(a.lift)).toBeLessThan(0.5);
    expect(await host.getAttribute("data-room")).toBe(room);
  });
});

test.describe("the Room switch (the founder, 2026-11-05)", () => {
  test("15. off, the bay goes, the board reads the same on a plain ground, and it spins freely; on, it settles back on its racks", async ({ page }) => {
    await page.goto("/design/3d");
    const host = await waitForBoard(page);
    const room = cornerSwitch(page, THREE_D_COPY.room);
    await expect(room).toHaveAttribute("aria-pressed", "true");
    const place = await host.getAttribute("data-place");
    const turn = await host.getAttribute("data-turn");

    await room.click();
    await expect(host).toHaveAttribute("data-bay", "off");
    await expect(room).toHaveAttribute("aria-pressed", "false");
    await expect(host).toHaveAttribute("data-place", place ?? "");
    expect(await host.getAttribute("data-turn")).toBe(turn);
    // Walk Around has no meaning without the room.
    await expect(modeButton(page, THREE_D_COPY.modeWalk)).toBeDisabled();

    // No rack and no limit: the keys take the board past 60°.
    await host.focus();
    for (let i = 0; i < 5; i++) await page.keyboard.press("ArrowDown");
    await expect.poll(async () => Math.abs(rackAngles((await turnOf(host)) as unknown as Quat).lift)).toBeGreaterThan(BAY.liftLimitDeg + 5);
    await expect(host).toHaveAttribute("data-place", place ?? "");

    await room.click();
    await expect(host).toHaveAttribute("data-bay", "on");
    await expect.poll(async () => Math.abs(rackAngles((await turnOf(host)) as unknown as Quat).lift), { timeout: 10_000 }).toBeLessThanOrEqual(BAY.liftLimitDeg + 0.05);
    await settled(host);
    await expect(modeButton(page, THREE_D_COPY.modeWalk)).toBeEnabled();
    expect(await host.getAttribute("data-place")).not.toBe(place);
  });

  test("16. the Room switch changes nothing but the picture: VOLUME's litres read the same", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "one computer reads the litres");
    await page.goto("/design/volume");
    const litres = page.getByText(/\d+\.\d+ ?L/).first();
    await expect(litres).toBeVisible({ timeout: FIRST_FRAME_MS });
    const before = await litres.innerText();
    await page.goto("/design/3d");
    await waitForBoard(page);
    await cornerSwitch(page, THREE_D_COPY.room).click();
    await button(page, THREE_D_COPY.flip).click();
    await page.goto("/design/volume");
    await expect(page.getByText(/\d+\.\d+ ?L/).first()).toHaveText(before, { timeout: FIRST_FRAME_MS });
  });
});

test.describe("the shaping bay under reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("10. Flip the Board lands at once, with no frame between", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "one computer proves the rule");
    await page.goto("/design/3d");
    const host = await waitForBoard(page);
    await settled(host);
    const seen = await host.evaluate(async (el) => {
      const turns: (string | null)[] = [];
      const watch = new MutationObserver(() => turns.push(el.getAttribute("data-turn")));
      watch.observe(el, { attributes: true, attributeFilter: ["data-turn"] });
      const flip = [...document.querySelectorAll("[data-three-d-racks] button")].find((b) => b.textContent === "Flip the Board");
      (flip as HTMLButtonElement).click();
      await new Promise((resolve) => setTimeout(resolve, 800));
      watch.disconnect();
      return turns;
    });
    expect(new Set(seen).size).toBe(1);
    expect(isTurn(await turnOf(host), rackTurn(BOTTOM_UP))).toBe(true);
  });

  test("17. no walk glide, and the views land at once", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "one computer proves the rule");
    await page.goto("/design/3d");
    const host = await waitForBoard(page);
    await modeButton(page, THREE_D_COPY.modeWalk).click();
    const moves = await host.evaluate(async (el) => {
      const places: (string | null)[] = [];
      const watch = new MutationObserver(() => places.push(el.getAttribute("data-viewer")));
      watch.observe(el, { attributes: true, attributeFilter: ["data-viewer"] });
      const side = [...document.querySelectorAll("[role=group] button")].find((b) => b.textContent === "Side");
      (side as HTMLButtonElement).click();
      await new Promise((resolve) => setTimeout(resolve, 800));
      watch.disconnect();
      return places;
    });
    expect(new Set(moves).size).toBe(1);
    await expect.poll(async () => viewerOf(host)).toEqual([WALK_VIEWS.side.azimuthDeg, WALK_VIEWS.side.elevationDeg, 0]);
  });
});
