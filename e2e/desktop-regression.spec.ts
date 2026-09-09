import { expect, test } from "@playwright/test";

/**
 * PHON-05's standing automated proof: a real mouse drag on the TEMPLATE widepoint and the ROCKER
 * nose tip handle still reaches the solver, run against today's untouched pointer-event wiring.
 * Desktop project only — this is the mouse path, not the touch path a later plan in this phase
 * adds. Every later plan re-runs this spec and must leave it passing exactly as it does today.
 *
 * Uses `page.mouse` throughout, never a Chrome DevTools Protocol touch-event session — that is
 * the touch path a later plan owns; this file proves the mouse path only.
 *
 * The assertion is on the label TEXT changing (`Offset — …`, `Nose Angle — …°`), not on an exact
 * number: the point is that a mouse drag still reaches the solver, not what the solver computes —
 * that is already covered by the geometry test suites (lib/geometry/outline-drag.test.ts,
 * lib/geometry/rocker-drag.test.ts). TEMPLATE asserts on WP Offset rather than Width: the
 * widepoint's own drag solve (lib/geometry/outline-drag.ts's "widepoint" case) reads only the
 * along-the-board component of the drag and discards the cross-board one entirely — quick task
 * 260822-lg3's "widepoint drag constrained to offset only" — so dragging the widepoint always
 * moves WP Offset; Width stays a slider-only input by design and never moves from a drag.
 *
 * Each drag target is located by its own `data-drag-target` attribute — a test-only hook added to
 * outline-viewer.tsx's and rocker-viewer.tsx's transparent hit circles alongside this spec. It
 * changes no pixel: it is a bare DOM attribute on an already-transparent circle, and
 * desktop-baseline.spec.ts (re-run at the end of this task) proves that with real pixels rather
 * than an assertion.
 */

test.describe("desktop mouse drag regression", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop-only, mouse-path regression proof");
  });

  test("TEMPLATE: dragging the widepoint with the mouse changes Offset", async ({ page }) => {
    await page.goto("/design/outline");

    // The construction overlay is off by default on desktop (PHON-05) — turn it on through its
    // own toolbar button, found by the exact accessible label outline-editor.tsx gives it.
    await page.getByRole("button", { name: "Show construction lines" }).click();

    // The widepoint's own drag solve (lib/geometry/outline-drag.ts's "widepoint" case) reads
    // only the station (along-the-board) component of the drag and discards the cross-board
    // component entirely — quick task 260822-lg3's "widepoint drag constrained to offset only" —
    // so a widepoint drag always moves WP Offset, never Width (Width stays a slider-only input by
    // design). The assertion below follows the code, not a paraphrase of it.
    const offsetLabel = page.getByText(/^Offset — /);
    await expect(offsetLabel).toBeVisible();
    const before = await offsetLabel.textContent();

    const widepoint = page.locator('[data-drag-target="widepoint"]');
    await expect(widepoint).toBeVisible();
    const box = await widepoint.boundingBox();
    if (!box) throw new Error("widepoint drag target has no bounding box");
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    // A real mouse drag: move to the target, press, move in a few steps (so intermediate
    // pointermove events fire, exactly as a real drag produces them), release. Along the board's
    // length axis (vertical on screen, since the widepoint's cy is drawn off station) — the axis
    // the solve actually reads.
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx, cy - 40, { steps: 4 });
    await page.mouse.move(cx, cy - 80, { steps: 4 });
    await page.mouse.up();

    await expect(offsetLabel).not.toHaveText(before ?? "");
  });

  test("ROCKER: dragging the nose tip handle with the mouse changes Nose Angle", async ({ page }) => {
    await page.goto("/design/rocker");

    await page.getByRole("button", { name: "Show construction lines" }).click();

    const noseAngleLabel = page.getByText(/^Nose Angle — /);
    await expect(noseAngleLabel).toBeVisible();
    const before = await noseAngleLabel.textContent();

    const noseTip = page.locator('[data-drag-target="noseTipHandle"]');
    await expect(noseTip).toBeVisible();
    const box = await noseTip.boundingBox();
    if (!box) throw new Error("noseTipHandle drag target has no bounding box");
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx - 15, cy - 30, { steps: 4 });
    await page.mouse.move(cx - 30, cy - 60, { steps: 4 });
    await page.mouse.up();

    await expect(noseAngleLabel).not.toHaveText(before ?? "");
  });
});
