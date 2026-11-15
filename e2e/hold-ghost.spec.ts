import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * A HELD control (quick 261114-vwy, the founder's ruling of 2026-11-14 on the to-do of 2026-10-02: "one hold is
 * one Undo step"). From the press to the release, however slowly the hand moves and however long it pauses:
 *
 * - TEMPLATE's ghost stays exactly the shape the board had at the press — even while the live line passes back
 *   through it (the to-do's cause 2, where the old rule made the ghost vanish for an instant);
 * - the whole hold is ONE Undo step, so one Cmd+Z (or one tap of the phone's Undo) puts the board back where it was
 *   before the hold, not one notch back.
 *
 * Every pause below is longer than COALESCE_WINDOW_MS (500 ms, lib/design-history.ts) — exactly the slow drag the
 * to-do measured splitting into five steps with the ghost one notch behind the live line. The rule itself is proved
 * with controlled timestamps in lib/design-history.test.ts and lib/outline-ghost.test.ts; this file proves it
 * reaches a real mouse on a computer and a real touch on a phone, on TEMPLATE's drag points and on the sliders
 * every design screen shares (TEMPLATE's and ROCKER's here).
 *
 * The sign-in banner and the toolbar tip are dismissed up front the way e2e/outline-ghost.spec.ts does.
 */

const BANNER_DISMISSAL_KEY = "shaper-sign-in-banner-dismissed";
const TOOLBAR_TIP_DISMISSAL_KEY = "shaper-toolbar-tip-dismissed";

/** Longer than the half-second coalescing window, so without the hold rule each movement would be its own step. */
const PAUSE_MS = 700;

async function dismissSignInBanner(page: Page) {
  await page.addInitScript((key) => {
    window.sessionStorage.setItem(key, "true");
  }, BANNER_DISMISSAL_KEY);
  await page.addInitScript((key) => {
    window.localStorage.setItem(key, "true");
  }, TOOLBAR_TIP_DISMISSAL_KEY);
}

/** A value label's own div is the immediate previous sibling of the Slider it labels — `SliderRow`'s layout. */
function rowFor(label: Locator): Locator {
  return label.locator("xpath=..");
}

/** The slider's visible dot, the thing a mouse presses and drags. */
function thumbFor(label: Locator): Locator {
  return rowFor(label).locator('[data-slot="slider-thumb"]');
}

async function centreOf(locator: Locator): Promise<{ x: number; y: number }> {
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  if (!box) throw new Error("the element has no bounding box");
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/**
 * A slow mouse drag of a slider's dot: press, then several moves to the right with a pause longer than the
 * coalescing window between them, then release. Checks the label moved after the first movement, so the pauses are
 * proved to fall inside a hold that is really changing the board.
 */
async function slowSliderDrag(page: Page, label: Locator): Promise<void> {
  const dot = await centreOf(thumbFor(label));
  const before = await label.textContent();
  await page.mouse.move(dot.x, dot.y);
  await page.mouse.down();
  await page.mouse.move(dot.x + 24, dot.y, { steps: 4 });
  await expect(label).not.toHaveText(before ?? "");
  await page.waitForTimeout(PAUSE_MS);
  await page.mouse.move(dot.x + 48, dot.y, { steps: 4 });
  await page.waitForTimeout(PAUSE_MS);
  await page.mouse.move(dot.x + 72, dot.y, { steps: 4 });
  await page.mouse.up();
}

test.describe("a held control — the ghost holds still and one hold is one Undo step", () => {
  test.beforeEach(async ({ page }) => {
    await dismissSignInBanner(page);
  });

  test("desktop: a slow widepoint drag with pauses, back through its start, keeps the ghost on the pre-drag shape; one Undo takes the whole drag back", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "mouse-drag path, desktop project only");

    await page.goto("/design/outline");
    await expect(page.getByRole("button", { name: "Hide drag points" })).toHaveAttribute("aria-pressed", "true");

    const silhouette = page.locator("[data-board-silhouette='outline']");
    await expect(silhouette).toBeVisible();
    const dBefore = await silhouette.getAttribute("d");
    const ghost = page.locator("[data-outline-ghost]");
    await expect(ghost).toHaveCount(0);

    const offsetLabel = page.getByText(/^Offset — /);
    const offsetBefore = await offsetLabel.textContent();

    const start = await centreOf(page.locator('[data-drag-target="widepoint"]'));
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();

    // First movement: the board moves, the ghost appears as the pre-drag shape.
    await page.mouse.move(start.x, start.y - 30, { steps: 4 });
    await expect(silhouette).not.toHaveAttribute("d", dBefore ?? "");
    await expect(ghost).toHaveAttribute("d", dBefore ?? "");

    // A pause longer than the coalescing window, then on: the old rule would have jumped the ghost here.
    await page.waitForTimeout(PAUSE_MS);
    await page.mouse.move(start.x, start.y - 60, { steps: 4 });
    const dMid = await silhouette.getAttribute("d");
    expect(dMid).not.toBe(dBefore);
    await expect(ghost).toHaveAttribute("d", dBefore ?? "");

    // Back through the start, slowly: the live line lands on the ghost. The ghost is still there, still the
    // pre-drag shape (the old rule made it vanish for this instant).
    await page.waitForTimeout(PAUSE_MS);
    await page.mouse.move(start.x, start.y, { steps: 4 });
    await expect(offsetLabel).toHaveText(offsetBefore ?? "");
    await expect(ghost).toHaveCount(1);
    await expect(ghost).toHaveAttribute("d", dBefore ?? "");

    // And on again, then release.
    await page.waitForTimeout(PAUSE_MS);
    await page.mouse.move(start.x, start.y - 90, { steps: 4 });
    await expect(ghost).toHaveAttribute("d", dBefore ?? "");
    await page.mouse.up();

    // After the release: the ghost is the pre-drag shape, the board has moved.
    await expect(ghost).toHaveAttribute("d", dBefore ?? "");
    const dAfter = await silhouette.getAttribute("d");
    expect(dAfter).not.toBe(dBefore);
    await expect(offsetLabel).not.toHaveText(offsetBefore ?? "");

    // ONE Undo takes back the whole hold — four movements and three long pauses — to the pre-drag board. On a fresh
    // board that was the only edit, so there is nothing left to compare against and the ghost goes.
    await page.keyboard.press("ControlOrMeta+KeyZ");
    await expect(silhouette).toHaveAttribute("d", dBefore ?? "");
    await expect(offsetLabel).toHaveText(offsetBefore ?? "");
    await expect(ghost).toHaveCount(0);

    // Redo puts the whole hold back in one step.
    await page.keyboard.press("Shift+ControlOrMeta+KeyZ");
    await expect(silhouette).toHaveAttribute("d", dAfter ?? "");
    await expect(ghost).toHaveAttribute("d", dBefore ?? "");
  });

  test("desktop: a slow slider drag on TEMPLATE keeps the ghost on the pre-drag shape and is one Undo step", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "mouse-drag path, desktop project only");

    await page.goto("/design/outline");
    const silhouette = page.locator("[data-board-silhouette='outline']");
    await expect(silhouette).toBeVisible();
    const dBefore = await silhouette.getAttribute("d");
    const ghost = page.locator("[data-outline-ghost]");

    const noseAngleLabel = page.getByText(/^Nose Angle — /);
    const before = await noseAngleLabel.textContent();

    const dot = await centreOf(thumbFor(noseAngleLabel));
    await page.mouse.move(dot.x, dot.y);
    await page.mouse.down();
    await page.mouse.move(dot.x + 24, dot.y, { steps: 4 });
    await expect(noseAngleLabel).not.toHaveText(before ?? "");
    await expect(ghost).toHaveAttribute("d", dBefore ?? "");
    await page.waitForTimeout(PAUSE_MS);
    await page.mouse.move(dot.x + 48, dot.y, { steps: 4 });
    await expect(ghost).toHaveAttribute("d", dBefore ?? "");
    await page.waitForTimeout(PAUSE_MS);
    await page.mouse.move(dot.x + 72, dot.y, { steps: 4 });
    await page.mouse.up();

    await expect(ghost).toHaveAttribute("d", dBefore ?? "");
    const after = await noseAngleLabel.textContent();
    expect(after).not.toBe(before);

    await page.keyboard.press("ControlOrMeta+KeyZ");
    await expect(noseAngleLabel).toHaveText(before ?? "");
    await expect(silhouette).toHaveAttribute("d", dBefore ?? "");
    await expect(ghost).toHaveCount(0);

    await page.keyboard.press("Shift+ControlOrMeta+KeyZ");
    await expect(noseAngleLabel).toHaveText(after ?? "");
  });

  test("desktop: a slow slider drag on ROCKER is one Undo step", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "mouse-drag path, desktop project only");

    await page.goto("/design/rocker");
    const label = page.getByText(/^Center Thickness — /);
    await expect(label).toBeVisible();
    const before = await label.textContent();

    await slowSliderDrag(page, label);
    const after = await label.textContent();
    expect(after).not.toBe(before);

    await page.keyboard.press("ControlOrMeta+KeyZ");
    await expect(label).toHaveText(before ?? "");

    await page.keyboard.press("Shift+ControlOrMeta+KeyZ");
    await expect(label).toHaveText(after ?? "");
  });

  test("desktop: a press on a slider's dot that never moves it leaves nothing to undo", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "mouse path, desktop project only");

    await page.goto("/design/outline");
    const noseAngleLabel = page.getByText(/^Nose Angle — /);
    const before = await noseAngleLabel.textContent();
    const dot = await centreOf(thumbFor(noseAngleLabel));
    await page.mouse.move(dot.x, dot.y);
    await page.mouse.down();
    await page.waitForTimeout(PAUSE_MS);
    await page.mouse.up();
    await expect(noseAngleLabel).toHaveText(before ?? "");

    // A keyboard nudge right after is its own edit, and one Undo takes exactly it back — the hold left no step
    // of its own in between.
    await page.keyboard.press("ArrowRight");
    await expect(noseAngleLabel).not.toHaveText(before ?? "");
    await page.keyboard.press("ControlOrMeta+KeyZ");
    await expect(noseAngleLabel).toHaveText(before ?? "");
    await expect(page.locator("[data-outline-ghost]")).toHaveCount(0);
  });

  test("android: a slow touch drag with a pause keeps the ghost on the pre-drag shape; one tap of Undo takes the whole drag back", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "android", "a real CDP touch drag, Chromium's phone profile only");

    await page.goto("/design/outline");
    await expect(page.getByRole("button", { name: "Hide drag points" })).toHaveAttribute("aria-pressed", "true");

    const silhouette = page.locator("[data-board-silhouette='outline']");
    await expect(silhouette).toBeVisible();
    const dBefore = await silhouette.getAttribute("d");
    const ghost = page.locator("[data-outline-ghost]");

    const start = await centreOf(page.locator('[data-drag-target="widepoint"]'));
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: start.x, y: start.y }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: start.x, y: start.y - 20 }] });
    await expect(silhouette).not.toHaveAttribute("d", dBefore ?? "");
    await expect(ghost).toHaveAttribute("d", dBefore ?? "");

    await page.waitForTimeout(PAUSE_MS);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: start.x, y: start.y - 40 }] });
    await expect(ghost).toHaveAttribute("d", dBefore ?? "");

    await page.waitForTimeout(PAUSE_MS);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: start.x, y: start.y - 60 }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });

    await expect(ghost).toHaveAttribute("d", dBefore ?? "");
    const dAfter = await silhouette.getAttribute("d");
    expect(dAfter).not.toBe(dBefore);

    const bar = page.locator("[data-phone-undo-bar]");
    await expect(bar).toBeVisible();
    await bar.getByRole("button", { name: "Undo" }).tap();
    await expect(silhouette).toHaveAttribute("d", dBefore ?? "");
    await expect(ghost).toHaveCount(0);
  });
});
