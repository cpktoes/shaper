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
