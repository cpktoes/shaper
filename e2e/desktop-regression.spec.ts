import { expect, test } from "@playwright/test";

/**
 * PHON-05's standing automated proof: a real mouse drag on the TEMPLATE widepoint still reaches the
 * solver, run against today's untouched pointer-event wiring. Desktop project only — this is the
 * mouse path, not the touch path a later plan in this phase adds. Every later plan re-runs this
 * spec and must leave it passing exactly as it does today.
 *
 * ROCKER used to have its own drag case here (the nose tip handle moving Nose Angle). Phase 11
 * (D-14) retired the rocker drawing's handles, and the drag solver behind them
 * (`lib/geometry/rocker-drag.ts`, deleted with its test), along with the three-knot Bezier they
 * steered; shaping a rocker happens in the sidebar now. The ROCKER case below proves the opposite
 * of what it used to: a mouse drag across that drawing changes nothing.
 *
 * Uses `page.mouse` throughout, never a Chrome DevTools Protocol touch-event session — that is
 * the touch path a later plan owns; this file proves the mouse path only.
 *
 * The TEMPLATE assertion is on the label TEXT changing (`Offset — …`), not on an exact number: the
 * point is that a mouse drag still reaches the solver, not what the solver computes — that is
 * already covered by the geometry test suite (lib/geometry/outline-drag.test.ts). TEMPLATE
 * asserts on WP Offset rather than Width: the
 * widepoint's own drag solve (lib/geometry/outline-drag.ts's "widepoint" case) reads only the
 * along-the-board component of the drag and discards the cross-board one entirely — quick task
 * 260822-lg3's "widepoint drag constrained to offset only" — so dragging the widepoint always
 * moves WP Offset; Width stays a slider-only input by design and never moves from a drag.
 *
 * Each drag target is located by its own `data-drag-target` attribute — a test-only hook added to
 * outline-viewer.tsx's transparent hit circles alongside this spec (rocker-viewer.tsx carried it
 * too until Phase 11 retired its handles; the ROCKER case now asserts it is absent). It
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

  test("ROCKER: a mouse drag across the drawing changes nothing — shaping moved to the sidebar", async ({ page }) => {
    await page.goto("/design/rocker");

    // With the measuring points showing too, so the drag happens over the drawing's busiest state:
    // they are plain dots, never grab targets.
    await page.getByRole("button", { name: "Show measuring points" }).click();
    await expect(page.locator("[data-measuring-points]")).toBeVisible();
    expect(await page.locator("[data-drag-target]").count()).toBe(0);

    const profilePath = page.locator('[data-board-silhouette="profile"]');
    await expect(profilePath).toBeVisible();
    const dBefore = await profilePath.getAttribute("d");
    const box = await profilePath.boundingBox();
    if (!box) throw new Error("rocker profile has no bounding box");

    // From the nose end of the board (nose left, desktop's default reading) across to its tail,
    // wandering up and down off the board on the way — every place a handle used to sit.
    const y = box.y + box.height / 2;
    await page.mouse.move(box.x + 4, y);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.3, y - 40, { steps: 4 });
    await page.mouse.move(box.x + box.width * 0.6, y + 40, { steps: 4 });
    await page.mouse.move(box.x + box.width - 4, y, { steps: 4 });
    await page.mouse.up();

    await expect(profilePath).toHaveAttribute("d", dBefore ?? "");
  });

  // Plan 11-12 (R14, R3): the mouse twin of e2e/touch-drag.spec.ts's placement thumb drag. Signed
  // out (the suite's default) so autosave cannot fire (RESEARCH Pitfall 9); the counter is attached
  // only once a blank is picked and the thumb has held still, and counts every request to any host
  // between the press and the release.
  test("ROCKER: a mouse drag of the placement slider moves the board toward the nose with no network request", async ({
    page,
  }) => {
    await page.addInitScript(() => window.sessionStorage.setItem("shaper-sign-in-banner-dismissed", "true"));
    await page.addInitScript(() => window.localStorage.setItem("shaper-toolbar-tip-dismissed", "true"));
    await page.goto("/design/rocker");

    // The streamed blank list, once React owns its first row (a click before hydration is lost).
    const list = page.getByRole("list", { name: "Blanks" });
    await expect(list).toBeVisible({ timeout: 30_000 });
    await page.waitForFunction(() => {
      const el = document.querySelector('ul[aria-label="Blanks"] li[data-group="fits"] button');
      return !!el && Object.keys(el).some((key) => key.startsWith("__reactFiber"));
    });
    const firstFit = list.locator('li[data-group="fits"] button').first();
    const name = (await firstFit.locator("[data-blank-name]").innerText()).trim();
    await firstFit.click();
    await expect(page.locator("[data-picked-blank]")).toContainText(name);
    await expect(page.getByText("Placement — centered")).toBeVisible();

    const noseTip = page.locator('[data-readouts] [data-readout-row="noseTip"]');
    const noseTipBefore = await noseTip.innerText();

    // The thumb's centre once it has held still for ten frames (picking a blank reflows the sidebar).
    const thumb = page.getByText(/^Placement — /).locator("xpath=..").locator('[data-slot="slider-thumb"]');
    await thumb.scrollIntoViewIfNeeded();
    let centre: { x: number; y: number } | null = null;
    let previous = "";
    let steady = 0;
    for (let attempt = 0; attempt < 120 && !centre; attempt++) {
      await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => setTimeout(resolve, 16))));
      const box = await thumb.boundingBox();
      const key = box ? `${box.x.toFixed(2)},${box.y.toFixed(2)},${box.width},${box.height}` : "";
      steady = box && key === previous ? steady + 1 : 0;
      previous = key;
      if (box && steady >= 10) centre = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    }
    if (!centre) throw new Error("the placement thumb never held still");

    const requests: string[] = [];
    page.on("request", (request) => requests.push(request.url()));

    await page.mouse.move(centre.x, centre.y);
    await page.mouse.down();
    await page.mouse.move(centre.x - 20, centre.y, { steps: 4 });
    await page.mouse.move(centre.x - 40, centre.y, { steps: 4 });
    await page.mouse.up();

    expect(requests, `requests during the drag: ${requests.join(", ")}`).toHaveLength(0);
    expect(requests.length).toBe(0);

    // The slider's left end is the nose (R3), and the rocker numbers moved with the board.
    await expect(page.getByText(/^Placement — .+ toward nose$/)).toBeVisible();
    await expect(noseTip).not.toHaveText(noseTipBefore);
    await expect(page.locator("[data-readouts] [data-readout-row]")).toHaveCount(5);
  });
});
