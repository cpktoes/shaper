import { expect, test, type Locator, type Page } from "@playwright/test";
import { THREE_D_COPY } from "../components/3d/three-d-copy";
import { AT_REST, BAY, BOTTOM_UP, rackAngles, rackTurn, REST_VIEWER, shownAngles } from "../lib/geometry/shaping-bay";
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

  test("4. Swing turns the board and its racks together, and no button ever does", async ({ page }) => {
    test.setTimeout(240_000);
    await page.goto("/design/3d");
    const host = await waitForBoard(page);
    const room = await host.getAttribute("data-room");
    await setSlider(page, THREE_D_COPY.swing, 90);
    await expect(host).toHaveAttribute("data-racks", "90.00");
    expect(await host.getAttribute("data-room")).toBe(room);
    // Nose, Tail and Side stand you where the board's ends and rail are, and move neither it nor the racks.
    for (const name of ["side", "nose", "tail"] as const) {
      await view(page, THREE_D_COPY.views[name]).click();
      await expect.poll(async () => (await viewerOf(host))[0], { timeout: 10_000 }).not.toBe(REST_VIEWER.azimuthDeg);
      await settled(host);
      await expect(host).toHaveAttribute("data-racks", "90.00");
    }
    // Deck brings it back to rest, and every slider with it.
    await view(page, THREE_D_COPY.views.deck).click();
    await expect.poll(async () => isTurn(await turnOf(host), rackTurn(AT_REST)), { timeout: 10_000 }).toBe(true);
    await expect(host).toHaveAttribute("data-racks", "0.00");
    await expect(slider(page, THREE_D_COPY.swing)).toHaveValue("0");
  });

  test("5. a drag and the controls stay in step, and a control moves its own plane alone", async ({ page }, testInfo) => {
    await page.goto("/design/3d");
    const host = await waitForBoard(page);
    await dragBoard(page, testInfo.project.name, 40, 30);
    await settled(host);
    const turn = (await turnOf(host)) as unknown as Quat;
    const shown = shownAngles(turn, false);
    expect(Math.abs(Number(await slider(page, THREE_D_COPY.rotateOnSide).inputValue()) - shown.roll)).toBeLessThanOrEqual(1);
    expect(Math.abs(Number(await slider(page, THREE_D_COPY.swing).inputValue()) - shown.swing)).toBeLessThanOrEqual(1);
    // The roll's move changes the roll: the swing and the lift stay what they exactly were, not what the thumbs round to.
    await setSlider(page, THREE_D_COPY.rotateOnSide, Math.round(shown.roll) + 7);
    await expect.poll(async () => Math.abs(rackAngles((await turnOf(host)) as unknown as Quat).roll - Math.round(shown.roll) - 7)).toBeLessThan(0.05);
    const after = rackAngles((await turnOf(host)) as unknown as Quat);
    expect(Math.abs(after.swing - shown.swing)).toBeLessThan(0.05);
    expect(Math.abs(after.lift - shown.lift)).toBeLessThan(0.05);
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
    await setSlider(page, THREE_D_COPY.sightAlong, 3);
    await view(page, THREE_D_COPY.views.bottom).click();
    await expect.poll(async () => isTurn(await turnOf(host), rackTurn(BOTTOM_UP)), { timeout: 10_000 }).toBe(true);
    for (const name of [THREE_D_COPY.raiseNose, THREE_D_COPY.raiseTail, THREE_D_COPY.rotateOnSide, THREE_D_COPY.swing, THREE_D_COPY.sightAlong]) {
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

  test("8. Sight Along moves the eye a little either way, and neither the board nor the strips", async ({ page }) => {
    await page.goto("/design/3d");
    const host = await waitForBoard(page);
    await view(page, THREE_D_COPY.views.tail).click();
    await expect.poll(async () => (await viewerOf(host))[1], { timeout: 10_000 }).toBeCloseTo(0, 1);
    await settled(host);
    const turn = await host.getAttribute("data-turn");
    const before = JSON.parse((await host.getAttribute("data-room")) ?? "{}");
    await setSlider(page, THREE_D_COPY.sightAlong, 6);
    await expect.poll(async () => (await viewerOf(host))[2]).toBe(6);
    await settled(host);
    const after = JSON.parse((await host.getAttribute("data-room")) ?? "{}");
    expect(await host.getAttribute("data-turn")).toBe(turn);
    expect(after.lights).toEqual(before.lights);
    expect(after.camera).not.toEqual(before.camera);
    await expect(page.getByText(`${THREE_D_COPY.sightAlong} — 6° right`, { exact: true })).toBeVisible();
  });

  test("9. on a coarse pointer each control has 44 dots of touch", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "a mouse doesn't need it");
    await page.goto("/design/3d");
    await waitForBoard(page);
    const flip = await touchSize(button(page, THREE_D_COPY.flip));
    expect(flip.height).toBeGreaterThanOrEqual(44);
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
});
