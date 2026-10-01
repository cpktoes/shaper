import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * Phase 13 optional item 9b (quick task 260930-lia): TEMPLATE's last-edit ghost — after a drag or
 * a slider move, the outline as it was one edit ago stays on screen as a faint solid line behind
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

/** The construction overlay (and its five drag targets) is already on for a touch screen (D-02),
 * so only desktop needs its own toolbar button pressed before a widepoint drag is possible. */
async function ensureConstructionOverlay(page: Page, projectName: string) {
  if (projectName === "desktop") {
    await page.getByRole("button", { name: "Show construction lines" }).click();
  }
}

/**
 * One outline edit, driven the way each project actually shapes a board (Task 3's own cross-
 * project cases): a real mouse drag on the widepoint (desktop), a real CDP touch drag on the
 * widepoint (android, copied from `e2e/touch-drag.spec.ts`), or one ArrowRight nudge of the Nose
 * Angle slider (iphone — Playwright's WebKit has no trusted touch drag). Call
 * `ensureConstructionOverlay` first on desktop/android; the slider needs no overlay at all.
 */
async function performEdit(page: Page, projectName: string) {
  if (projectName === "iphone") {
    const noseAngleLabel = page.getByText(/^Nose Angle — /);
    await expect(noseAngleLabel).toBeVisible();
    const before = await noseAngleLabel.textContent();
    await thumbInputFor(noseAngleLabel).focus();
    await page.keyboard.press("ArrowRight");
    await expect(noseAngleLabel).not.toHaveText(before ?? "");
    return;
  }

  const widepoint = page.locator('[data-drag-target="widepoint"]');
  await expect(widepoint).toBeVisible();
  const box = await widepoint.boundingBox();
  if (!box) throw new Error("widepoint drag target has no bounding box");
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  if (projectName === "android") {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: cx, y: cy }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: cx, y: cy - 40 }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    return;
  }

  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx, cy - 40, { steps: 4 });
  await page.mouse.up();
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

  test("desktop: a mouse drag leaves a faint solid ghost with the pre-drag shape, and the ghost cannot catch the mouse", async ({
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

test.describe("the ghost rule, on every project — O-1, off paper, off every other screen", () => {
  test.beforeEach(async ({ page }) => {
    await dismissSignInBanner(page);
  });

  test("(a) a freshly loaded TEMPLATE has no ghost, no ink-line copy, and no ghost button", async ({ page }) => {
    await page.goto("/design/outline");
    await expect(page.locator("[data-board-silhouette='outline']")).toBeVisible();
    await expect(page.locator("[data-outline-ghost]")).toHaveCount(0);
    await expect(page.locator("[data-board-ink-line]")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /ghost of the last edit/ })).toHaveCount(0);
  });

  test("(b) after one edit the ghost matches the pre-edit shape and the live shape has moved on", async ({
    page,
  }, testInfo) => {
    await page.goto("/design/outline");
    await ensureConstructionOverlay(page, testInfo.project.name);
    const silhouette = page.locator("[data-board-silhouette='outline']");
    await expect(silhouette).toBeVisible();
    const dBefore = await silhouette.getAttribute("d");

    await performEdit(page, testInfo.project.name);

    const ghost = page.locator("[data-outline-ghost]");
    await expect(ghost).toHaveCount(1);
    await expect(ghost).toHaveAttribute("d", dBefore ?? "");
    const dAfter = await silhouette.getAttribute("d");
    expect(dAfter).not.toBe(dBefore);
  });

  test("(d) printing hides the ghost while the board stays visible; back to screen it returns", async ({
    page,
  }, testInfo) => {
    await page.goto("/design/outline");
    await ensureConstructionOverlay(page, testInfo.project.name);
    await performEdit(page, testInfo.project.name);

    const ghost = page.locator("[data-outline-ghost]");
    await expect(ghost).toBeVisible();
    const silhouette = page.locator("[data-board-silhouette='outline']");

    await page.emulateMedia({ media: "print" });
    await expect(ghost).toBeHidden();
    await expect(silhouette).toBeVisible();

    await page.emulateMedia({ media: "screen" });
    await expect(ghost).toBeVisible();
  });

  test("(e) SUMMARY, the home screen's cards and ROCKER never show a ghost; TEMPLATE keeps its own", async ({
    page,
  }, testInfo) => {
    await page.goto("/design/outline");
    await ensureConstructionOverlay(page, testInfo.project.name);
    await performEdit(page, testInfo.project.name);

    const ghost = page.locator("[data-outline-ghost]");
    await expect(ghost).toBeVisible();
    const dOnTemplate = await ghost.getAttribute("d");

    // Never `page.goto` — that reloads and wipes the in-memory board, which would make this proof
    // empty. Walk by the app's own visible links instead, the way e2e/summary-blank.spec.ts does.
    // `dispatchEvent("click")`, not `.click()` (the same substitution e2e/phone-trip.spec.ts makes
    // and explains at length): under `next dev` only, the `<nextjs-portal>` dev-mode indicator
    // sits bottom-left of the viewport and can physically intercept a real pointer click at that
    // screen position on a phone-width layout — a dev-server-only artifact, never present in the
    // production build. `dispatchEvent` fires the DOM `click` event straight on the `<a>` itself,
    // which is what Next's own `<Link>` listens for, so this still proves the link's own handler
    // navigates, just without racing a dev-only overlay.
    await page
      .getByRole("link", { name: "SUMMARY", exact: true })
      .filter({ visible: true })
      .first()
      .dispatchEvent("click");
    await page.waitForURL(/\/design\/summary$/);
    await expect(page.locator("[data-board-silhouette='outline']").first()).toBeVisible();
    await expect(page.locator("[data-outline-ghost]")).toHaveCount(0);

    // The board kept it: the ghost is back, with the same shape, proof its absence on SUMMARY was
    // real and not merely "the page hasn't rendered a ghost yet."
    await page
      .getByRole("link", { name: "TEMPLATE", exact: true })
      .filter({ visible: true })
      .first()
      .dispatchEvent("click");
    await page.waitForURL(/\/design\/outline$/);
    await expect(page.locator("[data-outline-ghost]")).toHaveAttribute("d", dOnTemplate ?? "");

    await page
      .getByRole("link", { name: "ROCKER", exact: true })
      .filter({ visible: true })
      .first()
      .dispatchEvent("click");
    await page.waitForURL(/\/design\/rocker$/);
    await expect(page.locator("[data-outline-ghost]")).toHaveCount(0);

    await page.locator('a[href="/"]').filter({ visible: true }).first().dispatchEvent("click");
    await expect(page.locator("[data-board-silhouette='outline']").first()).toBeVisible();
    await expect(page.locator("[data-outline-ghost]")).toHaveCount(0);
  });
});

test.describe("the ghost rule — one edit ago, undo/redo and rotation (desktop)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "keyboard-shortcut and rotation assertions, desktop project only");
    await dismissSignInBanner(page);
  });

  test("(f) one edit ago: a second nudge moves the ghost on to the shape after the first nudge, not the original", async ({
    page,
  }) => {
    await page.goto("/design/outline");
    const silhouette = page.locator("[data-board-silhouette='outline']");
    await expect(silhouette).toBeVisible();
    const dOriginal = await silhouette.getAttribute("d");

    const noseAngleLabel = page.getByText(/^Nose Angle — /);
    await expect(noseAngleLabel).toBeVisible();
    await thumbInputFor(noseAngleLabel).focus();
    await page.keyboard.press("ArrowRight");
    await expect(silhouette).not.toHaveAttribute("d", dOriginal ?? "");
    const d1 = await silhouette.getAttribute("d");

    // Longer than COALESCE_WINDOW_MS (500ms, lib/design-history.ts) so this nudge records as its
    // OWN step rather than folding into the first one.
    await page.waitForTimeout(700);
    await page.keyboard.press("ArrowRight");
    await expect(silhouette).not.toHaveAttribute("d", d1 ?? "");

    await expect(page.locator("[data-outline-ghost]")).toHaveAttribute("d", d1 ?? "");
  });

  test("(g) Undo/Redo step the ghost back and forward with the board; one Undo on a fresh board's only edit leaves no ghost and no button", async ({
    page,
  }) => {
    await page.goto("/design/outline");
    const silhouette = page.locator("[data-board-silhouette='outline']");
    await expect(silhouette).toBeVisible();
    const dOriginal = await silhouette.getAttribute("d");

    const noseAngleLabel = page.getByText(/^Nose Angle — /);
    await expect(noseAngleLabel).toBeVisible();
    await thumbInputFor(noseAngleLabel).focus();
    await page.keyboard.press("ArrowRight");
    const d1 = await silhouette.getAttribute("d");
    await page.waitForTimeout(700);
    await page.keyboard.press("ArrowRight");

    await page.keyboard.press("ControlOrMeta+KeyZ");
    await expect(silhouette).toHaveAttribute("d", d1 ?? "");
    await expect(page.locator("[data-outline-ghost]")).toHaveAttribute("d", dOriginal ?? "");

    await page.keyboard.press("Shift+ControlOrMeta+KeyZ");
    await expect(page.locator("[data-outline-ghost]")).toHaveAttribute("d", d1 ?? "");

    // A fresh board, one drag, one Undo: back to nothing to compare against.
    await page.reload();
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
    await expect(page.locator("[data-outline-ghost]")).toHaveCount(1);

    await page.keyboard.press("ControlOrMeta+KeyZ");
    await expect(page.locator("[data-outline-ghost]")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /ghost of the last edit/ })).toHaveCount(0);
  });

  test("(h) rotation: the ghost turns with the board, in the same rotated group as the hooked silhouette", async ({
    page,
  }) => {
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
    await expect(page.locator("[data-outline-ghost]")).toBeVisible();

    await page.getByRole("button", { name: "Rotate the board to horizontal" }).click();

    // `local-name()='g'`, not a bare `g` tag test: SVG elements sit in the SVG XML namespace, and
    // an unprefixed XPath tag-name test never matches a namespaced element in a mixed HTML/SVG
    // document — `local-name()` compares the tag's own local name regardless of namespace.
    const ghostGroupTransform = await page
      .locator("[data-outline-ghost]")
      .locator("xpath=ancestor::*[local-name()='g'][@transform][1]")
      .getAttribute("transform");
    const silhouetteGroupTransform = await page
      .locator("[data-board-silhouette='outline']")
      .locator("xpath=ancestor::*[local-name()='g'][@transform][1]")
      .getAttribute("transform");
    expect(ghostGroupTransform).toBe("rotate(-90)");
    expect(ghostGroupTransform).toBe(silhouetteGroupTransform);
  });
});

test.describe("the ghost rule — Undo on a phone (D-02's on-screen control)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "the on-screen undo control, phone projects only");
    await dismissSignInBanner(page);
  });

  test("(g2) tapping the phone undo bar's Undo button after one edit leaves no ghost", async ({
    page,
  }, testInfo) => {
    await page.goto("/design/outline");
    await ensureConstructionOverlay(page, testInfo.project.name);
    await performEdit(page, testInfo.project.name);
    await expect(page.locator("[data-outline-ghost]")).toHaveCount(1);

    const bar = page.locator("[data-phone-undo-bar]");
    await expect(bar).toBeVisible();
    await bar.getByRole("button", { name: "Undo" }).tap();

    await expect(page.locator("[data-outline-ghost]")).toHaveCount(0);
  });
});
