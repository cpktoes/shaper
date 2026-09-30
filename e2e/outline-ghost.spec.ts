import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * Phase 13 optional item 9b (quick task 260930-lia): TEMPLATE's last-edit ghost — after a drag or
 * a slider move, the outline as it was one edit ago stays on screen as a faint dashed line behind
 * the live board, so a shaper can judge an edit as a side-by-side comparison rather than having to
 * remember the old shape. This file is built up across the quick task's three commits: Task 1
 * proves the ghost itself appears and never blocks a grab; Task 2 adds the toolbar button that
 * hides and shows it; Task 3 proves it off paper, off every other screen, and through undo/redo
 * and rotation, on all three projects.
 *
 * iPhone uses a slider nudge (ArrowRight on the Nose Angle thumb) instead of a drag, the same
 * substitution `e2e/undo-redo.spec.ts` makes: Playwright's WebKit has no trusted touch drag
 * (`e2e/slider-touch.spec.ts`'s own header comment explains why).
 *
 * The banner/toolbar-tip dismissal helper and `thumbInputFor` are local copies of
 * `e2e/undo-redo.spec.ts`'s own — every spec in this suite copies them rather than sharing an
 * import, so no spec depends on another spec's file surviving unchanged.
 */

const BANNER_DISMISSAL_KEY = "shaper-sign-in-banner-dismissed";
const TOOLBAR_TIP_DISMISSAL_KEY = "shaper-toolbar-tip-dismissed";

async function dismissSignInBanner(page: Page) {
  await page.addInitScript((key) => {
    window.sessionStorage.setItem(key, "true");
  }, BANNER_DISMISSAL_KEY);
  await page.addInitScript((key) => {
    window.localStorage.setItem(key, "true");
  }, TOOLBAR_TIP_DISMISSAL_KEY);
}

/** A value label's own text ("Nose Angle — 60°") sits in a plain div that is the immediate
 * previous sibling of the Slider it labels — `SliderRow`'s own layout (copied from
 * `e2e/undo-redo.spec.ts`'s own `rowFor`). */
function rowFor(label: Locator): Locator {
  return label.locator("xpath=..");
}

/** Base UI's slider thumb renders a `<div data-slot="slider-thumb">` with a nested, real
 * `<input type="range">` — that hidden input is what actually receives keyboard focus. Copied
 * from `e2e/undo-redo.spec.ts`'s own `thumbInputFor`. */
function thumbInputFor(label: Locator): Locator {
  return rowFor(label).locator('[data-slot="slider-thumb"] input[type="range"]');
}

test.describe("TEMPLATE's last-edit ghost", () => {
  test.beforeEach(async ({ page }) => {
    await dismissSignInBanner(page);
  });

  test("desktop: a freshly loaded TEMPLATE has no ghost and no ink-line copy", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "fresh-load assertion, desktop project only");

    await page.goto("/design/outline");
    await expect(page.locator("[data-board-silhouette='outline']")).toBeVisible();
    await expect(page.locator("[data-outline-ghost]")).toHaveCount(0);
    await expect(page.locator("[data-board-ink-line]")).toHaveCount(0);
  });

  test("desktop: a mouse drag leaves a dashed ghost with the pre-drag shape, and the ghost cannot catch the mouse", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "mouse-drag path, desktop project only");

    await page.goto("/design/outline");
    await page.getByRole("button", { name: "Show construction lines" }).click();

    const offsetLabel = page.getByText(/^Offset — /);
    await expect(offsetLabel).toBeVisible();
    const before = await offsetLabel.textContent();

    const silhouette = page.locator("[data-board-silhouette='outline']");
    await expect(silhouette).toBeVisible();
    const dBeforeDrag = await silhouette.getAttribute("d");

    const widepoint = page.locator('[data-drag-target="widepoint"]');
    await expect(widepoint).toBeVisible();
    const box = await widepoint.boundingBox();
    if (!box) throw new Error("widepoint drag target has no bounding box");
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx, cy - 40, { steps: 4 });
    await page.mouse.move(cx, cy - 80, { steps: 4 });
    await page.mouse.up();

    await expect(offsetLabel).not.toHaveText(before ?? "");

    const ghost = page.locator("[data-outline-ghost]");
    await expect(ghost).toHaveCount(1);
    await expect(ghost).toHaveAttribute("d", dBeforeDrag ?? "");

    // The hooked silhouette's own `d` has moved on — it is still painting the live fill, but no
    // longer the pre-drag shape.
    const dAfterDrag = await silhouette.getAttribute("d");
    expect(dAfterDrag).not.toBe(dBeforeDrag);

    // pointer-events: none — a grab on or near the ghost line still shapes the board, never the
    // ghost.
    const pointerEvents = await ghost.evaluate((el) => getComputedStyle(el).pointerEvents);
    expect(pointerEvents).toBe("none");

    // (b2) A second drag, starting from the widepoint's new position, still moves Offset — the
    // ghost never catches the mouse.
    const afterFirstDrag = await offsetLabel.textContent();
    const box2 = await widepoint.boundingBox();
    if (!box2) throw new Error("widepoint drag target has no bounding box after the first drag");
    const cx2 = box2.x + box2.width / 2;
    const cy2 = box2.y + box2.height / 2;
    await page.mouse.move(cx2, cy2);
    await page.mouse.down();
    await page.mouse.move(cx2, cy2 - 40, { steps: 4 });
    await page.mouse.up();
    await expect(offsetLabel).not.toHaveText(afterFirstDrag ?? "");
  });
});

test.describe("the ghost button", () => {
  test.beforeEach(async ({ page }) => {
    await dismissSignInBanner(page);
  });

  test("desktop: on a freshly loaded TEMPLATE no button's name matches /ghost of the last edit/", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "fresh-load assertion, desktop project only");

    await page.goto("/design/outline");
    await expect(page.getByRole("button", { name: /ghost of the last edit/ })).toHaveCount(0);
  });

  test("desktop: after one edit the ghost button appears last in the toolbar row, with Export Template and Rotate unmoved", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop button-layout assertion");

    await page.goto("/design/outline");
    await page.getByRole("button", { name: "Show construction lines" }).click();

    const exportButton = page.getByRole("button", { name: "Export Template" });
    const rotateButton = page.getByRole("button", { name: "Rotate the board to horizontal" });
    const exportBoxBefore = await exportButton.boundingBox();
    const rotateBoxBefore = await rotateButton.boundingBox();
    if (!exportBoxBefore || !rotateBoxBefore) throw new Error("toolbar button missing a bounding box");

    const widepoint = page.locator('[data-drag-target="widepoint"]');
    await expect(widepoint).toBeVisible();
    const box = await widepoint.boundingBox();
    if (!box) throw new Error("widepoint drag target has no bounding box");
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx, cy - 40, { steps: 4 });
    await page.mouse.up();

    const ghostButton = page.getByRole("button", { name: "Hide the ghost of the last edit" });
    await expect(ghostButton).toBeVisible();
    await expect(ghostButton).toHaveAttribute("aria-pressed", "true");

    // It is the LAST visible button of the row, in DOM order.
    const row = page.locator("[data-viewer-toolbar]:visible");
    const visibleButtons = row.locator("button:visible");
    const lastButton = visibleButtons.last();
    await expect(lastButton).toHaveAttribute("aria-label", "Hide the ghost of the last edit");

    // Its right edge sits one button width plus 6px left of the previous visible button's left edge.
    const ghostBox = await ghostButton.boundingBox();
    const count = await visibleButtons.count();
    const previousButton = visibleButtons.nth(count - 2);
    const previousBox = await previousButton.boundingBox();
    if (!ghostBox || !previousBox) throw new Error("toolbar button missing a bounding box");
    const gap = previousBox.x - (ghostBox.x + ghostBox.width);
    expect(Math.abs(gap - 6)).toBeLessThanOrEqual(1);

    // Export Template and Rotate have not moved.
    const exportBoxAfter = await exportButton.boundingBox();
    const rotateBoxAfter = await rotateButton.boundingBox();
    if (!exportBoxAfter || !rotateBoxAfter) throw new Error("toolbar button missing a bounding box");
    expect(Math.abs(exportBoxAfter.x - exportBoxBefore.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(rotateBoxAfter.x - rotateBoxBefore.x)).toBeLessThanOrEqual(1);
  });

  test("desktop: pressing the ghost button hides the ghost, pressing again brings back the same ghost", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop toggle assertion");

    await page.goto("/design/outline");
    await page.getByRole("button", { name: "Show construction lines" }).click();

    const widepoint = page.locator('[data-drag-target="widepoint"]');
    await expect(widepoint).toBeVisible();
    const box = await widepoint.boundingBox();
    if (!box) throw new Error("widepoint drag target has no bounding box");
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx, cy - 40, { steps: 4 });
    await page.mouse.up();

    const ghostButton = page.getByRole("button", { name: "Hide the ghost of the last edit" });
    await expect(ghostButton).toBeVisible();
    const ghostPath = page.locator("[data-outline-ghost]");
    await expect(ghostPath).toHaveCount(1);
    const dBeforeHide = await ghostPath.getAttribute("d");
    const silhouette = page.locator("[data-board-silhouette='outline']");
    const dSilhouetteBefore = await silhouette.getAttribute("d");

    await ghostButton.click();

    await expect(page.locator("[data-outline-ghost]")).toHaveCount(0);
    await expect(page.locator("[data-board-ink-line]")).toHaveCount(0);
    const showButton = page.getByRole("button", { name: "Show the ghost of the last edit" });
    await expect(showButton).toBeVisible();
    await expect(showButton).toHaveAttribute("aria-pressed", "false");
    await expect(silhouette).toHaveAttribute("d", dSilhouetteBefore ?? "");

    await showButton.click();
    const ghostButtonAgain = page.getByRole("button", { name: "Hide the ghost of the last edit" });
    await expect(ghostButtonAgain).toBeVisible();
    await expect(page.locator("[data-outline-ghost]")).toHaveAttribute("d", dBeforeHide ?? "");
  });

  test("desktop: the choice is not remembered — a reload brings the button back on", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop reload assertion");

    await page.goto("/design/outline");
    await page.getByRole("button", { name: "Show construction lines" }).click();

    const widepoint = page.locator('[data-drag-target="widepoint"]');
    await expect(widepoint).toBeVisible();
    const box = await widepoint.boundingBox();
    if (!box) throw new Error("widepoint drag target has no bounding box");
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx, cy - 40, { steps: 4 });
    await page.mouse.up();

    const ghostButton = page.getByRole("button", { name: "Hide the ghost of the last edit" });
    await expect(ghostButton).toBeVisible();
    await ghostButton.click();
    await expect(page.getByRole("button", { name: "Show the ghost of the last edit" })).toBeVisible();

    await page.reload();
    await page.getByRole("button", { name: "Show construction lines" }).click();
    const widepoint2 = page.locator('[data-drag-target="widepoint"]');
    await expect(widepoint2).toBeVisible();
    const box2 = await widepoint2.boundingBox();
    if (!box2) throw new Error("widepoint drag target has no bounding box");
    const cx2 = box2.x + box2.width / 2;
    const cy2 = box2.y + box2.height / 2;
    await page.mouse.move(cx2, cy2);
    await page.mouse.down();
    await page.mouse.move(cx2, cy2 - 40, { steps: 4 });
    await page.mouse.up();

    const ghostButtonAfterReload = page.getByRole("button", { name: "Hide the ghost of the last edit" });
    await expect(ghostButtonAfterReload).toBeVisible();
    await expect(ghostButtonAfterReload).toHaveAttribute("aria-pressed", "true");
  });

  test("iphone: a slider nudge reveals the ghost button, which hides and shows the ghost, with Export Template unmoved", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "iphone", "one-armed-nudge path, iPhone project only");

    await page.goto("/design/outline");
    const exportButton = page.getByRole("button", { name: "Export Template" });
    const exportBoxBefore = await exportButton.boundingBox();
    if (!exportBoxBefore) throw new Error("Export Template has no bounding box");

    const noseAngleLabel = page.getByText(/^Nose Angle — /);
    await expect(noseAngleLabel).toBeVisible();
    const before = await noseAngleLabel.textContent();
    await thumbInputFor(noseAngleLabel).focus();
    await page.keyboard.press("ArrowRight");
    await expect(noseAngleLabel).not.toHaveText(before ?? "");

    const ghostButton = page.getByRole("button", { name: "Hide the ghost of the last edit" });
    await expect(ghostButton).toBeVisible();
    await expect(ghostButton).toHaveAttribute("aria-pressed", "true");

    const row = page.locator("[data-viewer-toolbar]:visible");
    const visibleButtons = row.locator("button:visible");
    await expect(visibleButtons.last()).toHaveAttribute("aria-label", "Hide the ghost of the last edit");

    const exportBoxAfter = await exportButton.boundingBox();
    if (!exportBoxAfter) throw new Error("Export Template has no bounding box after the edit");
    expect(Math.abs(exportBoxAfter.x - exportBoxBefore.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(exportBoxAfter.y - exportBoxBefore.y)).toBeLessThanOrEqual(1);

    await ghostButton.tap();
    const showButton = page.getByRole("button", { name: "Show the ghost of the last edit" });
    await expect(showButton).toBeVisible();
    await expect(showButton).toHaveAttribute("aria-pressed", "false");

    await showButton.tap();
    await expect(page.getByRole("button", { name: "Hide the ghost of the last edit" })).toBeVisible();
  });

  test("android: a touch drag reveals the ghost button, which hides and shows the ghost, with Export Template unmoved", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "android", "CDP touch dispatch is Chromium-only");

    await page.goto("/design/outline");
    const exportButton = page.getByRole("button", { name: "Export Template" });
    const exportBoxBefore = await exportButton.boundingBox();
    if (!exportBoxBefore) throw new Error("Export Template has no bounding box");

    // The construction overlay is already on for a touch screen (D-02).
    const widepoint = page.locator('[data-drag-target="widepoint"]');
    await expect(widepoint).toBeVisible();
    const box = await widepoint.boundingBox();
    if (!box) throw new Error("widepoint drag target has no bounding box");
    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;

    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: startX, y: startY }] });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: startX, y: startY - 40 }],
    });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });

    const ghostButton = page.getByRole("button", { name: "Hide the ghost of the last edit" });
    await expect(ghostButton).toBeVisible();
    await expect(ghostButton).toHaveAttribute("aria-pressed", "true");

    const exportBoxAfter = await exportButton.boundingBox();
    if (!exportBoxAfter) throw new Error("Export Template has no bounding box after the drag");
    expect(Math.abs(exportBoxAfter.x - exportBoxBefore.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(exportBoxAfter.y - exportBoxBefore.y)).toBeLessThanOrEqual(1);

    await ghostButton.tap();
    const showButton = page.getByRole("button", { name: "Show the ghost of the last edit" });
    await expect(showButton).toBeVisible();
    await expect(showButton).toHaveAttribute("aria-pressed", "false");

    await showButton.tap();
    await expect(page.getByRole("button", { name: "Hide the ghost of the last edit" })).toBeVisible();
  });
});
