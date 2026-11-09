import { expect, test, type Locator, type Page } from "@playwright/test";
import { THREE_D_COPY } from "../components/3d/three-d-copy";
import { AT_REST, BAY, BOTTOM_UP, rackAngles, rackTurn, REST_VIEWER, shownAngles, WALK_VIEWS } from "../lib/geometry/shaping-bay";
import { type Quat } from "../lib/geometry/view-3d";
import { BANNER_DISMISSAL_KEY } from "../lib/models/banner-dismissal";
import { TOOLBAR_TIP_DISMISSAL_KEY } from "../lib/models/toolbar-tip";
import { countDifferent, decodePng } from "./helpers/canvas-pixels";

/**
 * The shaping bay (Phase 16, plan 18, D-43, D-44): a drawn room, the board on its racks, one control per plane in the
 * panel, and two ways a drag can go.
 *
 * The host reports what the tests read: `data-turn` (the board's turn), `data-room` (the camera and the strips' ends,
 * read back from the scene after every frame), `data-place` (the board's centre in the room), `data-racks` (the racks'
 * own turn, read back from the scene: always none), `data-viewer` (azimuth, elevation, sight), `data-mode`, `data-bay`
 * (on or off) and `data-bay-look` (which step of the Room icon: theme, blue or none).
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

/**
 * Presses a button whose move takes 400 ms, then, two frames into that move, presses something else: a button by its
 * spoken name, a key on the drawing, a key on a slider (the arrow a shaper's keyboard presses), a slider set to a value, or
 * pointers coming down on the drawing and lifting again.
 * Both inside the page, so the first move is certainly still under way however loaded the machine is.
 */
async function pressDuringMove(
  page: Page,
  first: string,
  second: {
    button?: string;
    key?: string;
    sliderKey?: { name: string; key: string };
    slider?: { name: string; value: number };
    pointers?: readonly { id: number; pointerType: "mouse" | "touch"; button: number }[];
  },
) {
  await page.evaluate(
    async ({ first, second }) => {
      const press = (name: string) => {
        const buttons = [...document.querySelectorAll<HTMLButtonElement>("button")];
        const found = buttons.find((b) => b.textContent === name || b.getAttribute("aria-label") === name);
        if (!found) throw new Error(`no button ${name}`);
        found.click();
      };
      const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
      const host = document.querySelector("[data-board-3d]") as HTMLElement;
      press(first);
      await frame();
      await frame();
      if (second.button) press(second.button);
      if (second.key) host.dispatchEvent(new KeyboardEvent("keydown", { key: second.key, bubbles: true, cancelable: true }));
      if (second.sliderKey) {
        const input = document.querySelector(`input[aria-label="${second.sliderKey.name}"]`) as HTMLInputElement;
        input.focus({ preventScroll: true });
        input.dispatchEvent(new KeyboardEvent("keydown", { key: second.sliderKey.key, bubbles: true, cancelable: true }));
      }
      if (second.slider) {
        const input = document.querySelector(`input[aria-label="${second.slider.name}"]`) as HTMLInputElement;
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, String(second.slider.value));
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }
      const box = host.getBoundingClientRect();
      const x = box.left + box.width / 2;
      const y = box.top + box.height / 2;
      const pointers = second.pointers ?? [];
      const pointer = (type: string, p: (typeof pointers)[number], i: number) =>
        new PointerEvent(type, {
          clientX: x + i * 40,
          clientY: y,
          pointerId: p.id,
          pointerType: p.pointerType,
          button: p.button,
          isPrimary: i === 0,
          bubbles: true,
          cancelable: true,
        });
      pointers.forEach((p, i) => host.dispatchEvent(pointer("pointerdown", p, i)));
      pointers.forEach((p, i) => host.dispatchEvent(pointer("pointerup", p, i)));
    },
    { first, second },
  );
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
    // The canvas's upper middle is the room's deep green wall in the default Daylight theme, not the theme's grey ground.
    const [wr, wg, wb] = at(width / 2, height * 0.16);
    expect(wg).toBeGreaterThan(2 * wr);
    expect(wg).toBeGreaterThan(wb);
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

  test("2. there is no Flip the Board: Bottom and Deck set each face up on the racks, and a screen reader hears which", async ({ page }) => {
    await page.goto("/design/3d");
    const host = await waitForBoard(page);
    await expect(button(page, "Flip the Board")).toHaveCount(0);
    await view(page, THREE_D_COPY.views.bottom).click();
    await expect(spoken(page)).toHaveText(THREE_D_COPY.viewSpoken.bottom);
    await expect.poll(async () => isTurn(await turnOf(host), rackTurn(BOTTOM_UP)), { timeout: 10_000 }).toBe(true);
    await settled(host);
    await expect(slider(page, THREE_D_COPY.rotateOnSide)).toHaveValue("0");
    await view(page, THREE_D_COPY.views.deck).click();
    await expect(spoken(page)).toHaveText(THREE_D_COPY.viewSpoken.deck);
    await expect.poll(async () => isTurn(await turnOf(host), rackTurn(AT_REST)), { timeout: 10_000 }).toBe(true);
    await settled(host);
    await expect(slider(page, THREE_D_COPY.rotateOnSide)).toHaveValue("0");
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
    const racks = page.locator("[data-three-d-racks]");
    await expect(racks.getByText('12"', { exact: true })).toBeVisible();
    expect(await host.getAttribute("data-room")).toBe(room);
    // One at a time: moving the other brings this one back to rest.
    await setSlider(page, THREE_D_COPY.raiseTail, 6);
    await expect(racks.getByText(THREE_D_COPY.onTheRack, { exact: true })).toHaveCount(1);
    await expect(racks.getByText('6"', { exact: true })).toBeVisible();
    await expect(nose).toHaveValue("0");
    await expect.poll(async () => rackAngles((await turnOf(host)) as unknown as Quat).lift).toBeLessThan(0);
    await expect(tail).toHaveValue("6");
  });

  test("4. Turn the Board has one view: no drag, slider or button moves the viewer, the room or the racks, only the board", async ({ page }, testInfo) => {
    test.setTimeout(240_000);
    await page.goto("/design/3d");
    const host = await waitForBoard(page);
    await expect(page.getByRole("slider", { name: "Swing", exact: true })).toHaveCount(0);
    const room = await host.getAttribute("data-room");
    const viewer = await host.getAttribute("data-viewer");
    const box = await host.boundingBox();
    if (!box) throw new Error("no canvas");
    const stillTheOneView = async () => {
      await settled(host);
      expect(await host.getAttribute("data-room")).toBe(room);
      expect(await host.getAttribute("data-viewer")).toBe(viewer);
      await expect(host).toHaveAttribute("data-racks", "0.00");
    };

    // A sideways drag from behind the tail rotates the board on its side, at a drag's full rate. The heading stays.
    // The iPhone's suite browser has no real finger to give, so there the arrow key takes the same road (`rackKey`).
    if (testInfo.project.name === "iphone") {
      await host.focus();
      await page.keyboard.press("ArrowRight");
    } else {
      await dragBoard(page, testInfo.project.name, Math.min(box.width, box.height) / 4, 0);
    }
    await stillTheOneView();
    const dragged = rackAngles((await turnOf(host)) as unknown as Quat);
    expect(dragged.roll).toBeGreaterThan(10);
    expect(Math.abs(dragged.swing)).toBeLessThan(0.05);
    expect(Math.abs(dragged.lift)).toBeLessThan(0.05);

    for (const name of ["nose", "tail", "bottom", "deck"] as const) {
      await view(page, THREE_D_COPY.views[name]).click();
      await page.waitForTimeout(500);
      await stillTheOneView();
    }
    await setSlider(page, THREE_D_COPY.lookDownRail, 6);
    await stillTheOneView();
    await setSlider(page, THREE_D_COPY.raiseNose, 8);
    await stillTheOneView();
  });

  test("4b. Turn the Board: Nose turns the board end for end so the nose is nearer you, Tail turns it back, and neither zooms", async ({ page }) => {
    await page.goto("/design/3d");
    const host = await waitForBoard(page);
    await view(page, THREE_D_COPY.views.nose).click();
    await expect(spoken(page)).toHaveText(THREE_D_COPY.endTowardYou.nose);
    await expect.poll(async () => isTurn(await turnOf(host), rackTurn({ ...AT_REST, swing: 180 })), { timeout: 10_000 }).toBe(true);
    await expect(host).toHaveAttribute("data-crop", "1 0.0000 0.0000");
    await expect(host).toHaveAttribute("data-racks", "0.00");
    // Raise the Nose still raises the nose, now the end nearer you, over the rack at the far end of the board.
    await setSlider(page, THREE_D_COPY.raiseNose, 8);
    await expect.poll(async () => rackAngles((await turnOf(host)) as unknown as Quat).lift).toBeGreaterThan(1);
    await setSlider(page, THREE_D_COPY.raiseNose, 0);
    await view(page, THREE_D_COPY.views.tail).click();
    await expect(spoken(page)).toHaveText(THREE_D_COPY.endTowardYou.tail);
    await expect.poll(async () => isTurn(await turnOf(host), rackTurn(AT_REST)), { timeout: 10_000 }).toBe(true);
    await expect(host).toHaveAttribute("data-crop", "1 0.0000 0.0000");
  });

  test("4c. Side is dimmed on Turn the Board with its reason, does nothing there, and works on Walk Around", async ({ page }) => {
    await page.goto("/design/3d");
    const host = await waitForBoard(page);
    const side = view(page, THREE_D_COPY.views.side);
    await expect(side).toHaveAttribute("aria-disabled", "true");
    await expect(side).toHaveAttribute("title", THREE_D_COPY.sideNeedsWalk);
    const viewer = await host.getAttribute("data-viewer");
    const turn = await host.getAttribute("data-turn");
    await side.evaluate((el) => (el as HTMLButtonElement).click());
    await expect(spoken(page)).toHaveText(THREE_D_COPY.sideNeedsWalk);
    await page.waitForTimeout(600);
    expect(await host.getAttribute("data-viewer")).toBe(viewer);
    expect(await host.getAttribute("data-turn")).toBe(turn);

    await modeButton(page, THREE_D_COPY.modeWalk).click();
    await expect(side).not.toHaveAttribute("aria-disabled", "true");
    await expect(side).not.toHaveAttribute("title", /.*/);
    await side.click();
    await expect.poll(async () => viewerOf(host), { timeout: 10_000 }).toEqual([WALK_VIEWS.side.azimuthDeg, WALK_VIEWS.side.elevationDeg, 0]);
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

  test("7. Deck, Bottom and Reset View bring every slider to rest, in the one view", async ({ page }) => {
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
    await view(page, THREE_D_COPY.views.nose).click();
    await expect.poll(async () => isTurn(await turnOf(host), rackTurn({ ...BOTTOM_UP, swing: 180 })), { timeout: 10_000 }).toBe(true);
    // Deck keeps the end you turned toward you, and Reset View goes home.
    await view(page, THREE_D_COPY.views.deck).click();
    await expect.poll(async () => isTurn(await turnOf(host), rackTurn({ ...AT_REST, swing: 180 })), { timeout: 10_000 }).toBe(true);
    await view(page, THREE_D_COPY.resetView).click();
    await expect.poll(async () => isTurn(await turnOf(host), rackTurn(AT_REST)), { timeout: 10_000 }).toBe(true);
    await expect.poll(async () => viewerOf(host)).toEqual([REST_VIEWER.azimuthDeg, REST_VIEWER.elevationDeg, 0]);
  });

  test("8. Look Down the Rail: on Turn the Board it turns the board a few degrees; on Walk Around it moves your eye", async ({ page }) => {
    await page.goto("/design/3d");
    const host = await waitForBoard(page);
    const room = await host.getAttribute("data-room");
    const viewer = await host.getAttribute("data-viewer");
    await setSlider(page, THREE_D_COPY.lookDownRail, 6);
    await expect.poll(async () => isTurn(await turnOf(host), rackTurn({ ...AT_REST, swing: 6 }))).toBe(true);
    await expect(page.getByText(`${THREE_D_COPY.lookDownRail} — 6° right`, { exact: true })).toBeVisible();
    // The reading is the nearest half degree; the turn keeps the slider's exact stop.
    await setSlider(page, THREE_D_COPY.lookDownRail, 6.25);
    await expect(page.getByText(`${THREE_D_COPY.lookDownRail} — 6.5° right`, { exact: true })).toBeVisible();
    await expect.poll(async () => isTurn(await turnOf(host), rackTurn({ ...AT_REST, swing: 6.25 }))).toBe(true);
    // A turned board has both ends on their racks, and reads so.
    await setSlider(page, THREE_D_COPY.rotateOnSide, 30);
    await expect(page.locator("[data-three-d-racks]").getByText(THREE_D_COPY.onTheRack, { exact: true })).toHaveCount(2);
    await setSlider(page, THREE_D_COPY.rotateOnSide, 0);
    expect(await host.getAttribute("data-room")).toBe(room);
    expect(await host.getAttribute("data-viewer")).toBe(viewer);
    await expect(host).toHaveAttribute("data-racks", "0.00");

    // Walk Around takes it over: the board straightens first, then the slider moves the eye and nothing else.
    await modeButton(page, THREE_D_COPY.modeWalk).click();
    await expect.poll(async () => isTurn(await turnOf(host), rackTurn(AT_REST)), { timeout: 10_000 }).toBe(true);
    await expect(slider(page, THREE_D_COPY.lookDownRail)).toHaveValue("0");
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
  });

  test("8b. a slider moved while a view is on its way finishes that move, and never strands the viewer halfway", async ({ page }) => {
    await page.goto("/design/3d");
    const host = await waitForBoard(page);
    await modeButton(page, THREE_D_COPY.modeWalk).click();
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

  test("8c. a second button pressed during a move lands the first: Bottom then Nose keeps the bottom up", async ({ page }) => {
    await page.goto("/design/3d");
    const host = await waitForBoard(page);
    const noseNearBottomUp = rackTurn({ swing: 180, lift: 0, roll: 180 });
    await pressDuringMove(page, THREE_D_COPY.views.bottom, { button: THREE_D_COPY.views.nose });
    await expect.poll(async () => isTurn(await turnOf(host), noseNearBottomUp), { timeout: 10_000 }).toBe(true);
    await settled(host);
    expect(isTurn(await turnOf(host), noseNearBottomUp)).toBe(true);
    // Bottom's face landed too, so Rotate on Side reads from the bottom: nothing left to show.
    await expect(slider(page, THREE_D_COPY.rotateOnSide)).toHaveValue("0");
  });

  test("8d. and Nose then Deck keeps the nose toward you", async ({ page }) => {
    await page.goto("/design/3d");
    const host = await waitForBoard(page);
    await pressDuringMove(page, THREE_D_COPY.views.nose, { button: THREE_D_COPY.views.deck });
    await settled(host);
    expect(isTurn(await turnOf(host), rackTurn({ ...AT_REST, swing: 180 }))).toBe(true);
  });

  test("8e. a slide, a second finger, a zoom key or the Room switch during a move lands the move, and the zoom it was undoing", async ({
    page,
  }) => {
    await page.goto("/design/3d");
    const host = await waitForBoard(page);
    const bottomUp = rackTurn({ ...AT_REST, roll: 180 });
    const zoomIn = async () => {
      await host.focus();
      await page.keyboard.press("+");
      await page.keyboard.press("+");
      await expect(host).toHaveAttribute("data-crop", /^2 /);
    };
    const backToDeck = async () => {
      await view(page, THREE_D_COPY.views.deck).click();
      await expect.poll(async () => isTurn(await turnOf(host), rackTurn(AT_REST)), { timeout: 10_000 }).toBe(true);
      await settled(host);
    };

    // A right-drag's press.
    await zoomIn();
    await pressDuringMove(page, THREE_D_COPY.views.bottom, { pointers: [{ id: 21, pointerType: "mouse", button: 2 }] });
    await settled(host);
    expect(isTurn(await turnOf(host), bottomUp)).toBe(true);
    await expect(host).toHaveAttribute("data-crop", "1 0.0000 0.0000");
    await backToDeck();

    // A second finger coming down.
    await zoomIn();
    await pressDuringMove(page, THREE_D_COPY.views.bottom, {
      pointers: [
        { id: 22, pointerType: "touch", button: 0 },
        { id: 23, pointerType: "touch", button: 0 },
      ],
    });
    await settled(host);
    expect(isTurn(await turnOf(host), bottomUp)).toBe(true);
    await expect(host).toHaveAttribute("data-crop", "1 0.0000 0.0000");
    await backToDeck();

    // A zoom key: the move lands first, so the press isn't thrown away when it does.
    await zoomIn();
    await pressDuringMove(page, THREE_D_COPY.views.bottom, { key: "+" });
    await settled(host);
    expect(isTurn(await turnOf(host), bottomUp)).toBe(true);
    await expect(host).toHaveAttribute("data-crop", /^1\.5 /);
    await host.focus();
    await page.keyboard.press("0");
    await backToDeck();

    // The Room icon, from the theme room: the blue step only repaints, so the move carries on and lands.
    await pressDuringMove(page, THREE_D_COPY.views.bottom, { button: THREE_D_COPY.room });
    await expect(host).toHaveAttribute("data-bay-look", "blue");
    await expect(host).toHaveAttribute("data-bay", "on");
    await settled(host);
    expect(isTurn(await turnOf(host), bottomUp)).toBe(true);
    await backToDeck();

    // And from the blue room, to no room: this one lands the move.
    await pressDuringMove(page, THREE_D_COPY.views.bottom, { button: THREE_D_COPY.room });
    await expect(host).toHaveAttribute("data-bay", "off");
    await settled(host);
    expect(isTurn(await turnOf(host), bottomUp)).toBe(true);
  });

  test("8f. a slider touched while Deck is still turning back from Bottom reads from the deck: Rotate on Side moves one step from flat, and never rolls the board back bottom up", async ({
    page,
  }) => {
    await page.goto("/design/3d");
    const host = await waitForBoard(page);
    await view(page, THREE_D_COPY.views.bottom).click();
    await expect.poll(async () => isTurn(await turnOf(host), rackTurn(BOTTOM_UP)), { timeout: 10_000 }).toBe(true);
    await settled(host);
    await expect(slider(page, THREE_D_COPY.rotateOnSide)).toHaveValue("0");
    await pressDuringMove(page, THREE_D_COPY.views.deck, { sliderKey: { name: THREE_D_COPY.rotateOnSide, key: "ArrowRight" } });
    await settled(host);
    await expect(slider(page, THREE_D_COPY.rotateOnSide)).toHaveValue("1");
    await expect(page.locator("[data-three-d-racks]").getByText(`${THREE_D_COPY.rotateOnSide} — 1° right`, { exact: true })).toBeVisible();
    expect(isTurn(await turnOf(host), rackTurn({ ...AT_REST, roll: 1 }))).toBe(true);
  });

  test("8g. and Look Down the Rail touched while Tail is still turning back from Nose turns from the tail, not the nose", async ({ page }) => {
    await page.goto("/design/3d");
    const host = await waitForBoard(page);
    await view(page, THREE_D_COPY.views.nose).click();
    await expect.poll(async () => isTurn(await turnOf(host), rackTurn({ ...AT_REST, swing: 180 })), { timeout: 10_000 }).toBe(true);
    await settled(host);
    await expect(slider(page, THREE_D_COPY.lookDownRail)).toHaveValue("0");
    await pressDuringMove(page, THREE_D_COPY.views.tail, { slider: { name: THREE_D_COPY.lookDownRail, value: 6 } });
    await settled(host);
    await expect(slider(page, THREE_D_COPY.lookDownRail)).toHaveValue("6");
    expect(isTurn(await turnOf(host), rackTurn({ ...AT_REST, swing: 6 }))).toBe(true);
  });

  test("9. on a coarse pointer each control has 44 dots of touch", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "a mouse doesn't need it");
    await page.goto("/design/3d");
    await waitForBoard(page);
    expect((await touchSize(page.getByRole("button", { name: new RegExp(THREE_D_COPY.railBlendHeading) }))).height).toBeGreaterThanOrEqual(44);
    const thumbs = page.locator("[data-three-d-racks] [data-slot='slider-thumb']");
    await expect(thumbs).toHaveCount(4);
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

/** Two presses of the Room icon, from the theme room to no room: the first stops at the bright blue room. */
async function toNoRoom(page: Page, host: Locator) {
  const room = cornerSwitch(page, THREE_D_COPY.room);
  await room.click();
  await expect(host).toHaveAttribute("data-bay-look", "blue");
  await room.click();
  await expect(host).toHaveAttribute("data-bay-look", "none");
}

test.describe("the panel, in the founder's order, on every device", () => {
  test("18. VIEW, then the four sliders, then Rail Blend Controls folded, then Export", async ({ page }) => {
    await page.goto("/design/3d");
    await waitForBoard(page);
    const panel = page.locator("[data-three-d-controls]");
    const top = async (at: Locator) => (await at.boundingBox())?.y ?? Number.NaN;
    const order = [
      panel.getByRole("group", { name: THREE_D_COPY.modeGroup, exact: true }),
      panel.getByRole("group", { name: THREE_D_COPY.viewsGroup, exact: true }),
      panel.getByRole("slider", { name: THREE_D_COPY.raiseNose, exact: true }),
      panel.getByRole("slider", { name: THREE_D_COPY.raiseTail, exact: true }),
      panel.getByRole("slider", { name: THREE_D_COPY.rotateOnSide, exact: true }),
      panel.getByRole("slider", { name: THREE_D_COPY.lookDownRail, exact: true }),
      panel.getByRole("button", { name: new RegExp(THREE_D_COPY.railBlendHeading) }),
      panel.getByRole("button", { name: THREE_D_COPY.exportButton, exact: true }),
    ];
    const tops: number[] = [];
    for (const at of order) tops.push(await top(at));
    expect(tops.every(Number.isFinite)).toBe(true);
    expect([...tops].sort((a, b) => a - b)).toEqual(tops);
    // Raise the Nose and Raise the Tail share a row, the nose on the left (the founder, 2026-11-06).
    const [nose, tail] = await Promise.all([order[2].boundingBox(), order[3].boundingBox()]);
    expect(nose?.y).toBeCloseTo(tail?.y ?? Number.NaN, 0);
    expect(nose?.x ?? Number.NaN).toBeLessThan(tail?.x ?? Number.NaN);
  });

  test("19. Rail Blend Controls is folded when the screen opens, opens on a press, and is folded again next visit", async ({ page }) => {
    await page.goto("/design/3d");
    await waitForBoard(page);
    const fold = page.getByRole("button", { name: new RegExp(THREE_D_COPY.railBlendHeading) });
    await expect(fold).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByRole("slider", { name: THREE_D_COPY.tailRailEndsAtSlider, exact: true })).toHaveCount(0);
    await expect(page.getByText(THREE_D_COPY.railBlendNote, { exact: true })).toHaveCount(0);
    await fold.click();
    await expect(fold).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByRole("slider", { name: THREE_D_COPY.tailRailEndsAtSlider, exact: true })).toHaveCount(1);
    await expect(page.getByText(THREE_D_COPY.railBlendNote, { exact: true })).toBeVisible();
    await page.reload();
    await waitForBoard(page);
    await expect(fold).toHaveAttribute("aria-expanded", "false");
  });
});

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

  test("14. going back to Turn the Board brings you home to the one view, and a drag there moves only the board", async ({ page }, testInfo) => {
    await page.goto("/design/3d");
    const host = await waitForBoard(page);
    await modeButton(page, THREE_D_COPY.modeWalk).click();
    await view(page, THREE_D_COPY.views.side).click();
    await expect.poll(async () => (await viewerOf(host))[0], { timeout: 10_000 }).toBeCloseTo(WALK_VIEWS.side.azimuthDeg, 1);
    await settled(host);
    await modeButton(page, THREE_D_COPY.modeTurn).click();
    await expect.poll(async () => viewerOf(host), { timeout: 10_000 }).toEqual([REST_VIEWER.azimuthDeg, REST_VIEWER.elevationDeg, 0]);
    await settled(host);
    const room = await host.getAttribute("data-room");
    const box = await host.boundingBox();
    if (!box) throw new Error("no canvas");
    if (testInfo.project.name === "iphone") {
      await host.focus();
      await page.keyboard.press("ArrowDown");
    } else {
      await dragBoard(page, testInfo.project.name, 0, Math.min(box.width, box.height) / 6);
    }
    await settled(host);
    expect(rackAngles((await turnOf(host)) as unknown as Quat).lift).toBeGreaterThan(5);
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

    // The first press only repaints: the bright blue room, with the board where it was and Walk Around still there.
    await room.click();
    await expect(host).toHaveAttribute("data-bay-look", "blue");
    await expect(host).toHaveAttribute("data-place", place ?? "");
    expect(await host.getAttribute("data-turn")).toBe(turn);
    await expect(modeButton(page, THREE_D_COPY.modeWalk)).toBeEnabled();

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

  for (const [what, press] of [
    ["an arrow key", { key: "ArrowDown" }],
    ["a slider", { slider: { name: THREE_D_COPY.rotateOnSide, value: 20 } }],
    ["a press to drag", { pointers: [{ id: 24, pointerType: "mouse", button: 0 }] }],
  ] as const) {
    test(`15b. ${what} while the board settles back on its racks leaves it on them, neither sunk into the pads nor floating off`, async ({
      page,
    }) => {
      await page.goto("/design/3d");
      const host = await waitForBoard(page);
      await toNoRoom(page, host);
      await expect(host).toHaveAttribute("data-bay", "off");
      // Off the racks, the nose raised, so the two places the board can stand are well apart.
      await host.focus();
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("ArrowDown");
      await expect.poll(async () => Math.abs(rackAngles((await turnOf(host)) as unknown as Quat).lift)).toBeGreaterThan(20);

      await pressDuringMove(page, THREE_D_COPY.room, press);
      await expect(host).toHaveAttribute("data-bay", "on");
      await settled(host);
      const interrupted = await placeOf(host);
      const turn = await turnOf(host);

      // The truth: the same lie, settled with nothing pressed.
      await toNoRoom(page, host);
      await expect(host).toHaveAttribute("data-bay", "off");
      await cornerSwitch(page, THREE_D_COPY.room).click();
      await expect(host).toHaveAttribute("data-bay", "on");
      // This settle moves the place alone, so it is the place that is waited for.
      await expect
        .poll(async () => Math.max(...(await placeOf(host)).map((value, i) => Math.abs(value - interrupted[i]))), { timeout: 5_000 })
        .toBeLessThanOrEqual(0.15);
      expect(isTurn(await turnOf(host), turn as unknown as Quat)).toBe(true);
    });
  }

  test("16. the Room switch changes nothing but the picture: VOLUME's litres read the same", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "one computer reads the litres");
    await page.goto("/design/volume");
    const litres = page.getByText(/\d+\.\d+ ?L/).first();
    await expect(litres).toBeVisible({ timeout: FIRST_FRAME_MS });
    const before = await litres.innerText();
    await page.goto("/design/3d");
    await toNoRoom(page, await waitForBoard(page));
    await view(page, THREE_D_COPY.views.bottom).click();
    await page.goto("/design/volume");
    await expect(page.getByText(/\d+\.\d+ ?L/).first()).toHaveText(before, { timeout: FIRST_FRAME_MS });
  });
});

test.describe("the shaping bay under reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("10. Bottom lands at once, with no frame between", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "one computer proves the rule");
    await page.goto("/design/3d");
    const host = await waitForBoard(page);
    await settled(host);
    const seen = await host.evaluate(async (el) => {
      const turns: (string | null)[] = [];
      const watch = new MutationObserver(() => turns.push(el.getAttribute("data-turn")));
      watch.observe(el, { attributes: true, attributeFilter: ["data-turn"] });
      const bottom = [...document.querySelectorAll("[role=group] button")].find((b) => b.textContent === "Bottom");
      (bottom as HTMLButtonElement).click();
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

  test("20. the back wall's line logo shows in the theme room, in the blue room and with no room", async ({ page }) => {
    await page.goto("/design/3d");
    const host = await waitForBoard(page);
    await expect(host).toHaveAttribute("data-bay-logos", "ready", { timeout: FIRST_FRAME_MS });
    // Up high in the middle of the picture, where the first view faces the line logo and nothing else is white.
    const whiteUpHigh = async () => {
      const { width, height, rgba } = decodePng(await host.screenshot());
      let white = 0;
      for (let y = 0; y < height * 0.35; y++) {
        for (let x = Math.round(width * 0.3); x < width * 0.7; x++) {
          const i = 4 * (y * width + x);
          if (rgba[i] > 245 && rgba[i + 1] > 245 && rgba[i + 2] > 245) white++;
        }
      }
      return white;
    };
    await expect.poll(whiteUpHigh).toBeGreaterThan(100);
    await cornerSwitch(page, THREE_D_COPY.room).click();
    await expect(host).toHaveAttribute("data-bay-look", "blue");
    await expect.poll(whiteUpHigh).toBeGreaterThan(100);
    await cornerSwitch(page, THREE_D_COPY.room).click();
    await expect(host).toHaveAttribute("data-bay", "off");
    await expect.poll(whiteUpHigh).toBeGreaterThan(100);
  });

  test("20b. the other three logos go with the room", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "one computer has the dots to count a logo by");
    await page.goto("/design/3d");
    const host = await waitForBoard(page);
    await expect(host).toHaveAttribute("data-bay-logos", "ready", { timeout: FIRST_FRAME_MS });
    /** White dots in a share of the picture, with the corner's buttons out of the way. */
    const whiteIn = async (x0: number, x1: number, y0: number, y1: number) => {
      const { width, height, rgba } = decodePng(
        await host.screenshot({ style: "[data-viewer-zoom], [data-viewer-toolbar] { visibility: hidden !important; }" }),
      );
      let white = 0;
      for (let y = Math.round(height * y0); y < height * y1; y++) {
        for (let x = Math.round(width * x0); x < width * x1; x++) {
          const i = 4 * (y * width + x);
          if (rgba[i] > 245 && rgba[i + 1] > 245 && rgba[i + 2] > 245) white++;
        }
      }
      return white;
    };
    await modeButton(page, THREE_D_COPY.modeWalk).click();

    // Nose faces the far end wall, and its line logo, high above the board.
    await view(page, THREE_D_COPY.views.nose).click();
    await settled(host);
    const farLogo = () => whiteIn(0.3, 0.7, 0, 0.3);
    const farWithRoom = await farLogo();
    await toNoRoom(page, host);
    await settled(host);
    const farNoRoom = await farLogo();

    await cornerSwitch(page, THREE_D_COPY.room).click();
    await expect(host).toHaveAttribute("data-bay-look", "theme");
    await settled(host);
    await view(page, THREE_D_COPY.views.side).click();
    await settled(host);
    const circle = () => whiteIn(0.4, 0.6, 0.15, 0.4);
    const circleWithRoom = await circle();
    await toNoRoom(page, host);
    await settled(host);
    const circleNoRoom = await circle();

    expect(farWithRoom).toBeGreaterThan(100);
    expect(farNoRoom).toBeLessThan(farWithRoom / 10);
    expect(circleWithRoom).toBeGreaterThan(100);
    expect(circleNoRoom).toBeLessThan(circleWithRoom / 10);
  });

  test("21. the Room icon's three steps: what it says, what it presses, and when Walk Around is there", async ({ page }) => {
    await page.goto("/design/3d");
    const host = await waitForBoard(page);
    const room = cornerSwitch(page, THREE_D_COPY.room);
    const walk = modeButton(page, THREE_D_COPY.modeWalk);
    for (const [index, look] of (["theme", "blue", "none", "theme"] as const).entries()) {
      if (index > 0) await room.click();
      await expect(host).toHaveAttribute("data-bay-look", look);
      await expect(host).toHaveAttribute("data-bay", look === "none" ? "off" : "on");
      await expect(room).toHaveAttribute("aria-pressed", String(look !== "none"));
      await expect(room).toHaveAttribute("title", THREE_D_COPY.roomTip[look]);
      if (look === "none") await expect(walk).toBeDisabled();
      else await expect(walk).toBeEnabled();
    }
  });

  test("22. going from the theme room to the blue room moves nothing", async ({ page }) => {
    await page.goto("/design/3d");
    const host = await waitForBoard(page);
    await host.focus();
    await page.keyboard.press("+");
    await expect(host).toHaveAttribute("data-crop", /^1\.5 /);
    await modeButton(page, THREE_D_COPY.modeWalk).click();
    await host.focus();
    await page.keyboard.press("ArrowLeft");
    await expect(host).not.toHaveAttribute("data-viewer", /^0\.00 /);
    await settled(host);
    const attributes = ["data-turn", "data-place", "data-viewer", "data-crop", "data-mode", "data-room", "data-racks"];
    const read = () => Promise.all(attributes.map((name) => host.getAttribute(name)));
    const before = await read();
    for (const value of before) expect(value).not.toBeNull();
    const frames = Number(await host.getAttribute("data-frames"));

    await cornerSwitch(page, THREE_D_COPY.room).click();
    await expect(host).toHaveAttribute("data-bay-look", "blue");
    await expect.poll(async () => Number(await host.getAttribute("data-frames"))).toBeGreaterThan(frames);
    expect(await read()).toEqual(before);
  });

  test("22b. the walls change but the board's shading does not: the middle of the foam differs by no more than a level", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "one computer proves the shading");
    await page.goto("/design/3d");
    const host = await waitForBoard(page);
    /** The foam patch in the middle of the first view, as its own little picture. */
    const foam = async () => {
      const { width, height, rgba } = decodePng(
        await host.screenshot({ style: "[data-viewer-zoom], [data-viewer-toolbar] { visibility: hidden !important; }" }),
      );
      const x0 = Math.round(width * 0.45);
      const x1 = Math.round(width * 0.55);
      const patch: number[] = [];
      for (let y = Math.round(height * 0.55); y < Math.round(height * 0.75); y++) {
        patch.push(...rgba.subarray(4 * (y * width + x0), 4 * (y * width + x1)));
      }
      return Uint8Array.from(patch);
    };
    const themeRoom = await foam();
    const frames = Number(await host.getAttribute("data-frames"));
    await cornerSwitch(page, THREE_D_COPY.room).click();
    await expect(host).toHaveAttribute("data-bay-look", "blue");
    await expect.poll(async () => Number(await host.getAttribute("data-frames"))).toBeGreaterThan(frames);
    expect(countDifferent(themeRoom, await foam(), 1)).toBe(0);
  });
});
