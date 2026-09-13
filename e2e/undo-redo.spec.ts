import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * Quick task 260913-k5k's own proof: a shaper who moves a slider, drags a point on the drawing, or
 * types a number can take that change back with Cmd/Ctrl+Z and put it back with
 * Shift+Cmd/Ctrl+Z — and on a phone, with a pair of round arrow buttons above the tab bar.
 *
 * Follows `e2e/desktop-regression.spec.ts` closely for the mouse-drag pattern and
 * `e2e/touch-sizing.spec.ts` for the metric-units and banner-dismissal helpers, copied locally
 * rather than imported, as every spec in this suite does.
 *
 * `page.keyboard.press("ControlOrMeta+KeyZ")` and `"Shift+ControlOrMeta+KeyZ"` — Playwright 1.63
 * resolves `ControlOrMeta` to the right modifier for the host running the test, so this file never
 * has to branch on platform itself.
 */

const BANNER_DISMISSAL_KEY = "shaper-sign-in-banner-dismissed";
const UNITS_STORAGE_KEY = "shaper-units";
// 260909-hny insurance, matching every sibling spec: the toolbar tip is already display:none in
// every Playwright project, but dismissed anyway so a future WebKit change can't grow a strip
// under any of this file's bounding-box or label assertions.
const TOOLBAR_TIP_DISMISSAL_KEY = "shaper-toolbar-tip-dismissed";

async function dismissSignInBanner(page: Page) {
  await page.addInitScript((key) => {
    window.sessionStorage.setItem(key, "true");
  }, BANNER_DISMISSAL_KEY);
  await page.addInitScript((key) => {
    window.localStorage.setItem(key, "true");
  }, TOOLBAR_TIP_DISMISSAL_KEY);
}

/** Board Length only renders as a typed `MeasureField` in Metric — Imperial shows a pair of
 * feet/inches `Select` combos instead (D-08). Setting the browser preference before navigation is
 * how this spec reaches a real typed field without clicking through the phone menu. */
async function setMetricUnits(page: Page) {
  await page.addInitScript((key) => {
    window.localStorage.setItem(key, "metric");
  }, UNITS_STORAGE_KEY);
}

/** A value label's own text ("Nose Angle — 60°") sits in a plain div that is the immediate
 * previous sibling of the Slider it labels — `SliderRow`'s own layout (`e2e/slider-touch.spec.ts`'s
 * own `rowFor` helper, copied here). */
function rowFor(label: Locator): Locator {
  return label.locator("xpath=..");
}

/** Base UI's slider thumb renders a `<div data-slot="slider-thumb">` with a nested, real
 * `<input type="range">` — that hidden input is what actually receives keyboard focus
 * (`e2e/keyboard-focus.spec.ts`'s own header comment). Focusing the wrapper div does nothing for
 * ArrowRight; this focuses the input directly, bypassing native Tab order entirely, so it works
 * the same way on every project including the two where Playwright's WebKit never Tabs onto a
 * slider at all. */
function thumbInputFor(label: Locator): Locator {
  return rowFor(label).locator('[data-slot="slider-thumb"] input[type="range"]');
}

test.describe("undo/redo — taking a design change back", () => {
  test.beforeEach(async ({ page }) => {
    await dismissSignInBanner(page);
  });

  test("desktop: one drag is one step back, and redo puts it forward again", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "mouse-drag path, desktop project only");

    await page.goto("/design/outline");
    await page.getByRole("button", { name: "Show construction lines" }).click();

    const offsetLabel = page.getByText(/^Offset — /);
    await expect(offsetLabel).toBeVisible();
    const before = await offsetLabel.textContent();

    const widepoint = page.locator('[data-drag-target="widepoint"]');
    await expect(widepoint).toBeVisible();
    const box = await widepoint.boundingBox();
    if (!box) throw new Error("widepoint drag target has no bounding box");
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    // A real mouse drag, exactly as desktop-regression.spec.ts drives it — several intermediate
    // pointermove events, not one jump. Every one of those moves fires the store's updateOutline,
    // which is exactly what this test proves collapses into a single undo step: a mid-drag stall
    // longer than COALESCE_WINDOW_MS (500ms, lib/design-history.ts) would legitimately split this
    // into two steps, but a fast synthetic drag like this one never pauses that long. The rule
    // itself — coalescing, the 500ms window, the cap — is proved with controlled timestamps in
    // lib/design-history.test.ts; this case only proves it reaches a real browser.
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx, cy - 40, { steps: 4 });
    await page.mouse.move(cx, cy - 80, { steps: 4 });
    await page.mouse.up();

    await expect(offsetLabel).not.toHaveText(before ?? "");
    const afterDrag = await offsetLabel.textContent();

    // One press of Cmd/Ctrl+Z undoes the whole drag, not one pixel of it — the single assertion
    // that is the whole coalescing promise: the drag fired dozens of store updates and one
    // keypress undid all of them.
    await page.keyboard.press("ControlOrMeta+KeyZ");
    await expect(offsetLabel).toHaveText(before ?? "");

    // Shift+Cmd/Ctrl+Z puts the dragged value back.
    await page.keyboard.press("Shift+ControlOrMeta+KeyZ");
    await expect(offsetLabel).toHaveText(afterDrag ?? "");
  });

  test("desktop: typing in a measurement box is left to the browser, and the shortcut still reaches the board once focus leaves it", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "keyboard focus semantics, desktop project only");

    await setMetricUnits(page);
    await page.goto("/design/outline");

    // Make a design edit first: focus the Nose Angle slider's thumb and nudge it once.
    const noseAngleLabel = page.getByText(/^Nose Angle — /);
    await expect(noseAngleLabel).toBeVisible();
    const beforeAngle = await noseAngleLabel.textContent();
    await thumbInputFor(noseAngleLabel).focus();
    await page.keyboard.press("ArrowRight");
    await expect(noseAngleLabel).not.toHaveText(beforeAngle ?? "");
    const afterSliderEdit = await noseAngleLabel.textContent();

    // Click into the Board Length typed field (Metric renders it as a real text input, D-08),
    // type a digit, then press the shortcut WHILE STILL FOCUSED THERE.
    const boardLengthField = page.getByLabel("Board Length");
    await boardLengthField.click();
    await boardLengthField.type("9");
    await page.keyboard.press("ControlOrMeta+KeyZ");

    // The shortcut did not reach the board — the slider's own label is untouched.
    await expect(noseAngleLabel).toHaveText(afterSliderEdit ?? "");

    // Move focus off the text box — a click on the sidebar's own plain heading text, a
    // non-interactive element that cannot itself trigger a design edit or a drag — then press the
    // same keys again. This time the shortcut reaches the board: proof the guard SUPPRESSED it a
    // moment ago rather than breaking it outright.
    //
    // Blurring ANY typed measurement field re-parses its rounded DISPLAY text back into a stored
    // value (D-08) — a pre-existing property of MeasureField's commit path, not something this
    // task changed. Board Length's default (72in = 1828.8mm) displays as "182.9 cm" and re-parses
    // to exactly 1829mm: a real, if imperceptible, 0.2mm change, so this blur can legitimately file
    // its OWN tiny undo step on top of the nose-angle edit. Pressing the shortcut repeatedly (never
    // more than twice in practice) is what makes this assertion true regardless of that quirk,
    // without asserting a specific step count that a rounding coincidence could silently flip.
    await page.getByText("Template Builder").click();
    for (let attempt = 0; attempt < 3; attempt++) {
      if ((await noseAngleLabel.textContent()) === beforeAngle) break;
      await page.keyboard.press("ControlOrMeta+KeyZ");
    }
    await expect(noseAngleLabel).toHaveText(beforeAngle ?? "");
  });

  test("desktop: the shortcut still works right after a slider move", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "keyboard focus semantics, desktop project only");

    await page.goto("/design/outline");
    const noseAngleLabel = page.getByText(/^Nose Angle — /);
    await expect(noseAngleLabel).toBeVisible();
    const before = await noseAngleLabel.textContent();

    // Focus stays ON the slider's own real, focused `<input type="range">` — the case a naive
    // "never while any input is focused" guard would fail, since Base UI renders a slider thumb
    // as exactly that.
    const thumbInput = thumbInputFor(noseAngleLabel);
    await thumbInput.focus();
    await page.keyboard.press("ArrowRight");
    await expect(noseAngleLabel).not.toHaveText(before ?? "");

    await page.keyboard.press("ControlOrMeta+KeyZ");
    await expect(noseAngleLabel).toHaveText(before ?? "");
  });

  test("iphone: the on-screen undo/redo control appears once there is something to take back", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "iphone", "on-screen control, iPhone project only");

    await page.goto("/design/outline");

    // At rest, on a freshly loaded screen, the control does not exist at all.
    await expect(page.locator("[data-phone-undo-bar]")).toHaveCount(0);

    const noseAngleLabel = page.getByText(/^Nose Angle — /);
    await expect(noseAngleLabel).toBeVisible();
    const before = await noseAngleLabel.textContent();
    await thumbInputFor(noseAngleLabel).focus();
    await page.keyboard.press("ArrowRight");
    await expect(noseAngleLabel).not.toHaveText(before ?? "");

    const bar = page.locator("[data-phone-undo-bar]");
    await expect(bar).toBeVisible();

    const undoButton = bar.getByRole("button", { name: "Undo" });
    const redoButton = bar.getByRole("button", { name: "Redo" });
    await expect(undoButton).toBeVisible();
    await expect(redoButton).toBeVisible();

    const undoBox = await undoButton.boundingBox();
    const redoBox = await redoButton.boundingBox();
    if (!undoBox || !redoBox) throw new Error("undo/redo button is missing a bounding box");
    console.log(
      `PhoneUndoBar measured boxes — Undo: ${undoBox.width}x${undoBox.height}, Redo: ${redoBox.width}x${redoBox.height}`,
    );
    expect(undoBox.width).toBeGreaterThanOrEqual(44);
    expect(undoBox.height).toBeGreaterThanOrEqual(44);
    expect(redoBox.width).toBeGreaterThanOrEqual(44);
    expect(redoBox.height).toBeGreaterThanOrEqual(44);

    await undoButton.tap();
    await expect(noseAngleLabel).toHaveText(before ?? "");

    const afterUndo = await noseAngleLabel.textContent();
    await redoButton.tap();
    await expect(noseAngleLabel).not.toHaveText(afterUndo ?? "");
  });
});
