import { expect, test, type Page } from "@playwright/test";

/**
 * TEST-01's automated proof that a real touch drag moves the board (PHON-04): the touchscreen
 * helper Playwright ships can only tap, not drag, so it cannot exercise this path at all, and a
 * synthetic `dispatchEvent('pointerdown', { pointerType: 'touch' })` is an untrusted DOM event
 * (`isTrusted: false`) that does not reliably interact with real `setPointerCapture()` redirection
 * or the `touch-action: none` / coarse-pointer CSS the app's own drag wiring depends on. Chrome
 * DevTools Protocol's `Input.dispatchTouchEvent` is trusted, native-pipeline input — the standard
 * way to prove this in Playwright (RESEARCH.md's own Code Examples) — and it is Chromium-only, no
 * WebKit equivalent is exposed through Playwright, which is why this spec runs on the `android`
 * project only. TEST-01 only requires the touch drag on at least the outline viewer.
 */

/**
 * A point on the panel that is genuinely "nowhere near" any drag point (260909-ktq) — a probe for
 * the remote-drag cases, derived at run time from the drawing's own rendered layout, never a
 * hardcoded coordinate. Reused by every case in this file that needs one.
 *
 * Candidates sit inset 14px from the drawing's left, right and bottom edges — at 50%, 85% and 96%
 * of the panel's height on the two side edges, and at 15%, 50% and 85% of its width along the
 * bottom edge — and deliberately never in the top 20%, where the viewer toolbar row sits. The
 * candidate whose distance to the NEAREST drag-point centre is largest wins.
 *
 * `avoidPathSelector` (quick task 260909-oge) additionally drops any candidate that lands inside
 * the named board silhouette's own fill, checked the same way `findInteriorBoardPoint` below does
 * (`isPointInFill`, off the path's OWN `getScreenCTM()`). On TEMPLATE, staying clear of the five
 * drag-target handles has always also meant staying clear of the board, since the handles ring
 * its own edge — but ROCKER's side-profile silhouette is a thin band running the board's FULL
 * length, so a candidate near a panel edge but far from any handle can still land squarely inside
 * it. Callers that never pass this (every one before 260909-oge) get byte-for-byte the same
 * candidates and the same answer as before.
 */
async function findEmptyCanvasProbe(
  page: Page,
  avoidPathSelector?: string,
): Promise<{
  x: number;
  y: number;
  distanceToNearestHandle: number;
  handleCentres: { target: string; x: number; y: number }[];
}> {
  const svg = page.locator("svg:has([data-drag-target])").first();
  const svgBox = await svg.boundingBox();
  if (!svgBox) throw new Error("drag-target svg has no bounding box");

  const handles = page.locator("[data-drag-target]");
  const handleCount = await handles.count();
  const handleCentres: { target: string; x: number; y: number }[] = [];
  for (let i = 0; i < handleCount; i++) {
    const handle = handles.nth(i);
    const box = await handle.boundingBox();
    if (!box) continue;
    const target = (await handle.getAttribute("data-drag-target")) ?? `handle-${i}`;
    handleCentres.push({ target, x: box.x + box.width / 2, y: box.y + box.height / 2 });
  }

  const INSET = 14;
  let candidates: { x: number; y: number }[] = [];
  for (const x of [svgBox.x + INSET, svgBox.x + svgBox.width - INSET]) {
    for (const heightFraction of [0.5, 0.85, 0.96]) {
      candidates.push({ x, y: svgBox.y + svgBox.height * heightFraction });
    }
  }
  for (const widthFraction of [0.15, 0.5, 0.85]) {
    candidates.push({
      x: svgBox.x + svgBox.width * widthFraction,
      y: svgBox.y + svgBox.height - INSET,
    });
  }

  if (avoidPathSelector) {
    const path = page.locator(avoidPathSelector);
    const insideFill: boolean[] = await path.evaluate(
      (el: SVGPathElement, points: { x: number; y: number }[]) => {
        const ctm = el.getScreenCTM();
        if (!ctm) return points.map(() => false);
        const inverse = ctm.inverse();
        return points.map((p) => el.isPointInFill(new DOMPoint(p.x, p.y).matrixTransform(inverse)));
      },
      candidates,
    );
    const clear = candidates.filter((_, i) => !insideFill[i]);
    if (clear.length > 0) candidates = clear;
  }

  let best = candidates[0];
  let bestDistance = -Infinity;
  for (const candidate of candidates) {
    const nearest = Math.min(
      ...handleCentres.map((h) => Math.hypot(h.x - candidate.x, h.y - candidate.y)),
    );
    if (nearest > bestDistance) {
      bestDistance = nearest;
      best = candidate;
    }
  }

  return { x: best.x, y: best.y, distanceToNearestHandle: bestDistance, handleCentres };
}

/**
 * A screen point genuinely deep inside a drawn board silhouette (quick task 260909-oge), found by
 * sampling a grid across the path's own client rect and asking the path itself — `isPointInFill`,
 * mapped into the path's own user space through `getScreenCTM().inverse()` — never a hardcoded
 * coordinate, since the drawing's own frame changes with every board and every orientation.
 */
async function findInteriorBoardPoint(page: Page, selector: string): Promise<{ x: number; y: number }> {
  const path = page.locator(selector);
  const box = await path.boundingBox();
  if (!box) throw new Error(`${selector} has no bounding box`);
  const result = await path.evaluate((el: SVGPathElement, rect) => {
    // The CTM must come off the PATH itself, never `el.ownerSVGElement`: a viewer that draws
    // its content inside a rotated `<g>` (ROCKER, when the phone's own orientation flips it
    // vertical) has a root-SVG CTM that stops at the viewBox and omits that group's own
    // rotation — mapping a screen point through it lands outside the path's own `d`
    // coordinates entirely. The element's OWN `getScreenCTM()` composes every ancestor
    // transform, so its inverse always lands back in the exact space `isPointInFill` expects.
    const ctm = el.getScreenCTM();
    if (!ctm) return null;
    const inverse = ctm.inverse();
    const GRID = 9;
    for (let gy = 1; gy < GRID; gy++) {
      for (let gx = 1; gx < GRID; gx++) {
        const screenX = rect.x + (rect.width * gx) / GRID;
        const screenY = rect.y + (rect.height * gy) / GRID;
        const point = new DOMPoint(screenX, screenY).matrixTransform(inverse);
        if (el.isPointInFill(point)) {
          return { x: screenX, y: screenY };
        }
      }
    }
    return null;
  }, box);
  if (!result) throw new Error(`no interior point found inside ${selector}`);
  return result;
}

/**
 * Whether the drag readout chip sits clear of a drawn board silhouette (quick task 260909-oge,
 * D-09): samples a 5x5 grid across the chip's own client rect and asks the board PATH itself —
 * `isPointInFill`/`isPointInStroke`, mapped into the path's own user space — rather than comparing
 * two rectangles. An outline's bounding box is a rectangle and the outline is not, so a box
 * comparison would fail a card that is honestly clear of the curve.
 */
async function sampleChipAgainstPath(
  page: Page,
  chipSelector: string,
  pathSelector: string,
): Promise<{ inFill: boolean; inStroke: boolean }[]> {
  const chipBox = await page.locator(chipSelector).boundingBox();
  if (!chipBox) throw new Error(`${chipSelector} has no bounding box`);
  const path = page.locator(pathSelector);
  return path.evaluate((el: SVGPathElement, rect) => {
    // Same reasoning as `findInteriorBoardPoint` above: the CTM must come off the path itself.
    const ctm = el.getScreenCTM();
    if (!ctm) throw new Error("board path has no screen CTM");
    const inverse = ctm.inverse();
    const SAMPLES = 5;
    const results: { inFill: boolean; inStroke: boolean }[] = [];
    for (let gy = 0; gy < SAMPLES; gy++) {
      for (let gx = 0; gx < SAMPLES; gx++) {
        const screenX = rect.x + (rect.width * gx) / (SAMPLES - 1);
        const screenY = rect.y + (rect.height * gy) / (SAMPLES - 1);
        const point = new DOMPoint(screenX, screenY).matrixTransform(inverse);
        results.push({ inFill: el.isPointInFill(point), inStroke: el.isPointInStroke(point) });
      }
    }
    return results;
  }, chipBox);
}

test.describe("touch drag on the outline viewer (android/CDP only)", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "android", "CDP touch dispatch is Chromium-only");
  });

  test("a real touch drag on the widepoint moves Offset, shows the readout while it moves, and leaves no text selection", async ({
    page,
  }) => {
    await page.goto("/design/outline");

    // D-02 on a touch device: the construction overlay (and its five drag targets) is already on
    // — no tap needed to reveal it.
    const widthLabel = page.getByText(/^Width — /);
    await expect(widthLabel).toBeVisible();
    const widthBefore = await widthLabel.textContent();

    const offsetLabel = page.getByText(/^Offset — /);
    await expect(offsetLabel).toBeVisible();
    const offsetBefore = await offsetLabel.textContent();

    const widepoint = page.locator('[data-drag-target="widepoint"]');
    await expect(widepoint).toBeVisible();
    const box = await widepoint.boundingBox();
    if (!box) throw new Error("widepoint drag target has no bounding box");
    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;

    // The readout chip's own combined "Offset — value" text run (D-17) — distinct from the
    // drawing's always-present "WP OFFSET" callout chip, whose name and value are two separate
    // text lines that never combine into one "Offset — …" string.
    const offsetChip = page.locator("svg text").filter({ hasText: /^Offset — / });

    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: startX, y: startY }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: startX, y: startY - 40 }],
    });

    // Mid-drag: the chip is present while the finger is still down.
    await expect(offsetChip).toBeVisible();

    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: startX, y: startY - 80 }],
    });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });

    // The board changed: the widepoint's own drag solve (lib/geometry/outline-drag.ts's
    // "widepoint" case) reads only the along-the-board component and always moves Offset, never
    // Width — the same assertion e2e/desktop-regression.spec.ts makes for the mouse path on this
    // exact point.
    await expect(offsetLabel).not.toHaveText(offsetBefore ?? "");
    await expect(widthLabel).toHaveText(widthBefore ?? "");

    // The chip is gone the instant the finger lifts.
    await expect(offsetChip).not.toBeVisible();

    // No text selection survived the gesture (PHON-04): the iOS long-press callout suppression's
    // own proof, which only a real (trusted) touch sequence can exercise at all.
    const selection = await page.evaluate(() => window.getSelection()?.toString() ?? "");
    expect(selection).toBe("");
  });

  test("nearest-point-wins: a touch measurably nearer one drag point moves that points own field, not its neighbours", async ({
    page,
  }) => {
    await page.goto("/design/outline");

    // Every one of these five labels is on screen in the sidebar, so the value that changes is
    // one a real shaper can read.

    // Every drag target's own field, tracked by a label unique on the page (so an ambiguous
    // duplicate — both Nose and Tail Fullness read "Fullness — …%" — is never used as the probe).
    const uniqueLabelByTarget: Record<string, string> = {
      widepoint: "Offset",
      tailRailHandle: "Tail Rail",
      noseRailHandle: "Nose Rail",
      tailHandle: "Tail Angle",
      noseHandle: "Nose Angle",
    };

    // Every drag target's own rendered centre, read from the DOM — never a hardcoded coordinate.
    const centres: { target: string; x: number; y: number }[] = [];
    for (const target of Object.keys(uniqueLabelByTarget)) {
      const locator = page.locator(`[data-drag-target="${target}"]`);
      const box = await locator.boundingBox();
      if (!box) throw new Error(`${target} drag target has no bounding box`);
      centres.push({ target, x: box.x + box.width / 2, y: box.y + box.height / 2 });
    }

    // The closest pair by on-screen distance, derived at run time.
    let near = centres[0];
    let far = centres[1];
    let bestDist = Infinity;
    for (let i = 0; i < centres.length; i++) {
      for (let j = i + 1; j < centres.length; j++) {
        const dist = Math.hypot(centres[i].x - centres[j].x, centres[i].y - centres[j].y);
        if (dist < bestDist) {
          bestDist = dist;
          near = centres[i];
          far = centres[j];
        }
      }
    }

    // A touch a quarter of the way from `near` toward `far` — measurably nearer `near`s own
    // centre than `far`s, and well inside `near`s own coarse hit radius.
    const touchX = near.x + (far.x - near.x) * 0.25;
    const touchY = near.y + (far.y - near.y) * 0.25;

    const before: Record<string, string | null> = {};
    for (const label of [uniqueLabelByTarget[near.target], uniqueLabelByTarget[far.target]]) {
      before[label] = await page.getByText(new RegExp(`^${label} — `)).textContent();
    }

    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: touchX, y: touchY }],
    });
    // A generous diagonal move — big enough to clear every field's own slider step regardless of
    // which target was actually picked.
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: touchX + 50, y: touchY - 80 }],
    });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });

    const nearLabel = uniqueLabelByTarget[near.target];
    const farLabel = uniqueLabelByTarget[far.target];

    // Playwright's own retrying `toHaveText`/`not.toHaveText` (not a bare `.textContent()` read)
    // so this settles after React's post-touchend re-render rather than racing it.
    await expect(page.getByText(new RegExp(`^${nearLabel} — `))).not.toHaveText(before[nearLabel] ?? "");
    await expect(page.getByText(new RegExp(`^${farLabel} — `))).toHaveText(before[farLabel] ?? "");
  });

  test("a tap picks the widepoint, then a thumb at the edge of the panel moves it one-for-one", async ({
    page,
  }) => {
    await page.goto("/design/outline");

    const offsetLabel = page.getByText(/^Offset — /);
    await expect(offsetLabel).toBeVisible();
    const offsetBeforeTap = await offsetLabel.textContent();

    const widepoint = page.locator('[data-drag-target="widepoint"]');
    await expect(widepoint).toBeVisible();
    const tapBox = await widepoint.boundingBox();
    if (!tapBox) throw new Error("widepoint drag target has no bounding box");
    const tapX = tapBox.x + tapBox.width / 2;
    const tapY = tapBox.y + tapBox.height / 2;

    const cdp = await page.context().newCDPSession(page);

    // A tap: touchStart then touchEnd at the same coordinates, no movement in between.
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: tapX, y: tapY }],
    });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });

    // A tap picks the point — it does not shape it (D-02).
    await expect(widepoint).toHaveAttribute("data-selected", "true");
    await expect(offsetLabel).toHaveText(offsetBeforeTap ?? "");

    // A probe genuinely nowhere near the point: more than 60px from every drag target's centre.
    const probe = await findEmptyCanvasProbe(page);
    expect(probe.distanceToNearestHandle).toBeGreaterThan(60);

    const offsetChip = page.locator("svg text").filter({ hasText: /^Offset — / });

    const pointBeforeDrag = await widepoint.boundingBox();
    if (!pointBeforeDrag) throw new Error("widepoint drag target has no bounding box");
    const pointStartY = pointBeforeDrag.y + pointBeforeDrag.height / 2;

    // A remote drag: thumb down at the probe, then four 10px steps toward the nose (40px total —
    // sized in the measured baseline above so the +/-12in Offset clamp cannot saturate).
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: probe.x, y: probe.y }],
    });
    let fingerY = probe.y;
    for (let step = 0; step < 4; step++) {
      fingerY -= 10;
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: probe.x, y: fingerY }],
      });
    }

    // Mid-gesture: the readout card rides out with the thumb and is visible from the panel edge.
    await expect(offsetChip).toBeVisible();

    // Before lifting: the widepoint moved in the same direction the thumb travelled (its centre y
    // decreased, since the thumb moved toward the nose), and by within about seven slider steps of
    // the thumb's own travel — one-for-one. A half-speed gain would miss by 20px; passing the
    // finger's absolute board point to the solver instead of the delta would teleport the point
    // hundreds of pixels.
    const pointDuringDrag = await widepoint.boundingBox();
    if (!pointDuringDrag) throw new Error("widepoint drag target has no bounding box");
    const pointEndY = pointDuringDrag.y + pointDuringDrag.height / 2;
    const deltaFingerY = fingerY - probe.y;
    const deltaPointY = pointEndY - pointStartY;
    expect(deltaPointY).toBeLessThan(0);
    expect(Math.abs(deltaPointY - deltaFingerY)).toBeLessThanOrEqual(15);

    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });

    // The card is gone the instant the thumb lifts, and the pick survives a remote drag (D-05).
    await expect(offsetChip).not.toBeVisible();
    await expect(widepoint).toHaveAttribute("data-selected", "true");
  });

  test("a tap on empty canvas lets the picked point go", async ({ page }) => {
    await page.goto("/design/outline");

    const offsetLabel = page.getByText(/^Offset — /);
    await expect(offsetLabel).toBeVisible();
    const offsetBefore = await offsetLabel.textContent();

    const widepoint = page.locator('[data-drag-target="widepoint"]');
    await expect(widepoint).toBeVisible();
    const tapBox = await widepoint.boundingBox();
    if (!tapBox) throw new Error("widepoint drag target has no bounding box");
    const tapX = tapBox.x + tapBox.width / 2;
    const tapY = tapBox.y + tapBox.height / 2;

    const cdp = await page.context().newCDPSession(page);

    // Tap the widepoint: it picks.
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: tapX, y: tapY }],
    });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect(widepoint).toHaveAttribute("data-selected", "true");

    // Tap empty canvas — zero travel, same coordinates for touchStart and touchEnd: it lets go.
    const probe = await findEmptyCanvasProbe(page);
    expect(probe.distanceToNearestHandle).toBeGreaterThan(60);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: probe.x, y: probe.y }],
    });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });

    // React omits `data-selected` entirely once nothing is picked (rather than "false").
    await expect(widepoint).not.toHaveAttribute("data-selected", "true");
    // Letting a point go shapes nothing.
    await expect(offsetLabel).toHaveText(offsetBefore ?? "");
  });

  test("a direct drag leaves its point picked, so the next move can come from the edge", async ({
    page,
  }) => {
    await page.goto("/design/outline");

    const offsetLabel = page.getByText(/^Offset — /);
    await expect(offsetLabel).toBeVisible();
    const offsetBefore = await offsetLabel.textContent();

    const widepoint = page.locator('[data-drag-target="widepoint"]');
    await expect(widepoint).toBeVisible();
    const box = await widepoint.boundingBox();
    if (!box) throw new Error("widepoint drag target has no bounding box");
    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;

    const cdp = await page.context().newCDPSession(page);

    // A direct drag — thumb on the point itself, exactly as the very first case in this file.
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: startX, y: startY }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: startX, y: startY - 40 }],
    });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });

    // The founder's own working rhythm: one direct drag to get close leaves the point picked.
    await expect(widepoint).toHaveAttribute("data-selected", "true");
    const offsetAfterDirect = await offsetLabel.textContent();
    expect(offsetAfterDirect).not.toBe(offsetBefore);

    // Then refine it from the edge — a remote drag moves it again.
    const probe = await findEmptyCanvasProbe(page);
    expect(probe.distanceToNearestHandle).toBeGreaterThan(60);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: probe.x, y: probe.y }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: probe.x, y: probe.y - 40 }],
    });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });

    await expect(offsetLabel).not.toHaveText(offsetAfterDirect ?? "");
  });

  test("a touch on empty canvas with nothing picked still does nothing", async ({ page }) => {
    await page.goto("/design/outline");

    const targets = ["widepoint", "tailRailHandle", "noseRailHandle", "tailHandle", "noseHandle"];
    const boxesBefore: Record<string, { x: number; y: number; width: number; height: number }> = {};
    for (const target of targets) {
      const box = await page.locator(`[data-drag-target="${target}"]`).boundingBox();
      if (!box) throw new Error(`${target} drag target has no bounding box`);
      boxesBefore[target] = box;
    }

    const offsetChip = page.locator("svg text").filter({ hasText: /^Offset — / });

    const probe = await findEmptyCanvasProbe(page);
    expect(probe.distanceToNearestHandle).toBeGreaterThan(60);

    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: probe.x, y: probe.y }],
    });
    let fingerY = probe.y;
    for (let step = 0; step < 4; step++) {
      fingerY -= 10;
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: probe.x, y: fingerY }],
      });
      // No card ever appears — nothing is picked, so nothing is being shaped.
      await expect(offsetChip).not.toBeVisible();
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });

    for (const target of targets) {
      const box = await page.locator(`[data-drag-target="${target}"]`).boundingBox();
      if (!box) throw new Error(`${target} drag target has no bounding box`);
      expect(box.x).toBeCloseTo(boxesBefore[target].x, 0);
      expect(box.y).toBeCloseTo(boxesBefore[target].y, 0);
    }
    await expect(offsetChip).not.toBeVisible();
  });

  test("the readout card steps clear of the outline while shaping a point in the middle of the board (260909-oge)", async ({
    page,
  }) => {
    await page.goto("/design/outline");

    const boardPath = page.locator('[data-board-silhouette="outline"]');
    await expect(boardPath).toBeVisible();

    const widepoint = page.locator('[data-drag-target="widepoint"]');
    await expect(widepoint).toBeVisible();
    const box = await widepoint.boundingBox();
    if (!box) throw new Error("widepoint drag target has no bounding box");
    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;

    // A point genuinely deep inside the board — not the widepoint's own rail-edge position — so
    // the card, anchored on the finger, has to step around real board fill to clear it.
    const interior = await findInteriorBoardPoint(page, '[data-board-silhouette="outline"]');

    const chip = page.locator("[data-readout-chip]");

    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: startX, y: startY }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: interior.x, y: interior.y }],
    });

    await expect(chip).toBeVisible();

    // The proof itself: 25 samples across the card, every one of them outside the outline's own
    // fill and stroke (D-09) — sampling the path rather than comparing bounding rectangles, since
    // an outline's bounding box is a rectangle and the outline is not.
    const samples = await sampleChipAgainstPath(page, "[data-readout-chip]", '[data-board-silhouette="outline"]');
    expect(samples).toHaveLength(25);
    for (const sample of samples) {
      expect(sample.inFill).toBe(false);
      expect(sample.inStroke).toBe(false);
    }

    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect(chip).not.toBeVisible();
  });
});

test.describe("touch drag on the rocker viewer (android/CDP only)", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "android", "CDP touch dispatch is Chromium-only");
  });

  test("a tap picks the nose tip handle, then a thumb at the edge of the panel moves it", async ({
    page,
  }) => {
    await page.goto("/design/rocker");
    // The construction overlay (and its four drag targets) is already on for a coarse pointer
    // (D-02) — no toggle needed.
    const noseAngleLabel = page.getByText(/^Nose Angle — /);
    await expect(noseAngleLabel).toBeVisible();
    const noseAngleBeforeTap = await noseAngleLabel.textContent();

    const noseTip = page.locator('[data-drag-target="noseTipHandle"]');
    await expect(noseTip).toBeVisible();
    const tapBox = await noseTip.boundingBox();
    if (!tapBox) throw new Error("noseTipHandle drag target has no bounding box");
    const tapX = tapBox.x + tapBox.width / 2;
    const tapY = tapBox.y + tapBox.height / 2;

    const cdp = await page.context().newCDPSession(page);

    // A tap: touchStart then touchEnd at the same coordinates, no movement in between.
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: tapX, y: tapY }],
    });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });

    // A tap picks the handle — it does not shape it (D-02).
    await expect(noseTip).toHaveAttribute("data-selected", "true");
    await expect(noseAngleLabel).toHaveText(noseAngleBeforeTap ?? "");

    // A probe genuinely nowhere near the handle. The rocker's own drag targets sit closer
    // together than the outline's (40.2px on the tightest board at iPhone SE scale, per the
    // measured baseline) — 60px still clears them on a Pixel 7's own rendered scale.
    const probe = await findEmptyCanvasProbe(page);
    expect(probe.distanceToNearestHandle).toBeGreaterThan(60);

    const noseTipBeforeDrag = await noseTip.boundingBox();
    if (!noseTipBeforeDrag) throw new Error("noseTipHandle drag target has no bounding box");

    // A remote drag: thumb down at the probe, then four 10px steps.
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: probe.x, y: probe.y }],
    });
    let fingerY = probe.y;
    for (let step = 0; step < 4; step++) {
      fingerY -= 10;
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: probe.x, y: fingerY }],
      });
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });

    // Nose Angle changed and the handle moved in the thumb's own direction.
    await expect(noseAngleLabel).not.toHaveText(noseAngleBeforeTap ?? "");
    const noseTipAfterDrag = await noseTip.boundingBox();
    if (!noseTipAfterDrag) throw new Error("noseTipHandle drag target has no bounding box");
    expect(noseTipAfterDrag.y).not.toBeCloseTo(noseTipBeforeDrag.y, 0);

    // The pick survives a remote drag (D-05).
    await expect(noseTip).toHaveAttribute("data-selected", "true");
  });

  test("the readout card clears the side profile while shaping the nose tip toward the middle of the board (260909-oge)", async ({
    page,
  }) => {
    await page.goto("/design/rocker");

    const profilePath = page.locator('[data-board-silhouette="profile"]');
    await expect(profilePath).toBeVisible();

    const noseTip = page.locator('[data-drag-target="noseTipHandle"]');
    await expect(noseTip).toBeVisible();
    const box = await noseTip.boundingBox();
    if (!box) throw new Error("noseTipHandle drag target has no bounding box");
    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;

    // A point genuinely deep inside the drawn side profile, found the same way as the outline's
    // own case above.
    const interior = await findInteriorBoardPoint(page, '[data-board-silhouette="profile"]');

    const chip = page.locator("[data-readout-chip]");

    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: startX, y: startY }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: interior.x, y: interior.y }],
    });

    await expect(chip).toBeVisible();

    // All 25 samples across the card land outside the profile's own fill and stroke.
    const samples = await sampleChipAgainstPath(page, "[data-readout-chip]", '[data-board-silhouette="profile"]');
    expect(samples).toHaveLength(25);
    for (const sample of samples) {
      expect(sample.inFill).toBe(false);
      expect(sample.inStroke).toBe(false);
    }

    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect(chip).not.toBeVisible();
  });

  test("a card settled beside the board stays put as the thumb keeps moving away from it (260909-oge)", async ({
    page,
  }) => {
    await page.goto("/design/rocker");

    // MEASURED at execution time (Pixel 7, this drawing's own scale): the profile's cross band
    // sits close enough to the middle of the viewBox, and the nose-flatness card is wide enough
    // relative to that viewBox, that literally no cross position is both off the board AND clear
    // of the pre-existing viewBox-edge clamp — the clamp and the board's own reach overlap for
    // every reachable finger position. So "a card already clear, centred exactly on the finger"
    // (the plan's own literal scenario) is not reachable here the way it is on TEMPLATE (D-07's
    // note that ROCKER needed the wider "visible drawing" bounds already flagged this drawing as
    // tight; this is the sharper edge of that same tightness). What IS reachable, and what this
    // test proves instead: once the finger has pushed the card into its settled, board-clear
    // resting spot on one side, further finger travel deeper into that SAME side must not nudge
    // the card any further — the new rule's own degrade-to-flush behaviour is a function of the
    // BOARD and the BOUNDS, not of exactly where in that region the finger happens to be, so two
    // different finger positions on the same settled side must render byte-for-byte the same
    // card. That is "the new rule only fires when it is needed" in the only form this drawing's
    // own numbers can actually exercise.
    const noseFlat = page.locator('[data-drag-target="noseFlatHandle"]');
    await expect(noseFlat).toBeVisible();
    const tapBox = await noseFlat.boundingBox();
    if (!tapBox) throw new Error("noseFlatHandle drag target has no bounding box");
    const tapX = tapBox.x + tapBox.width / 2;
    const tapY = tapBox.y + tapBox.height / 2;

    const cdp = await page.context().newCDPSession(page);

    // A tap picks the handle (D-02).
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: tapX, y: tapY }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect(noseFlat).toHaveAttribute("data-selected", "true");

    const chip = page.locator("[data-readout-chip]");

    // A probe far from every handle AND clear of the profile's own fill (260909-oge's
    // `avoidPathSelector`) — the starting finger position for the remote drag.
    const probe = await findEmptyCanvasProbe(page, '[data-board-silhouette="profile"]');
    expect(probe.distanceToNearestHandle).toBeGreaterThan(60);

    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: probe.x, y: probe.y }] });
    await expect(chip).toBeVisible();
    const firstBox = await chip.boundingBox();
    if (!firstBox) throw new Error("readout chip has no bounding box");

    // The card must be clear of the board at this settled position — proving it is a genuine
    // resting spot, not a still-overlapping bug.
    const firstSamples = await sampleChipAgainstPath(page, "[data-readout-chip]", '[data-board-silhouette="profile"]');
    for (const sample of firstSamples) {
      expect(sample.inFill).toBe(false);
      expect(sample.inStroke).toBe(false);
    }

    // Now slide the SAME finger further in the same direction it is already inset from the
    // drawing's edge — deeper into the identical settled region, several more CSS px, in small
    // steps (as every other remote drag in this file does).
    const svgBox = await page.locator("svg:has([data-drag-target])").first().boundingBox();
    if (!svgBox) throw new Error("drag-target svg has no bounding box");
    const towardEdge = probe.x < svgBox.x + svgBox.width / 2 ? -1 : 1;
    let fingerX = probe.x;
    for (let step = 0; step < 4; step++) {
      fingerX += towardEdge * 5;
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: fingerX, y: probe.y }] });
    }
    await expect(chip).toBeVisible();
    const secondBox = await chip.boundingBox();
    if (!secondBox) throw new Error("readout chip has no bounding box");

    // Byte-for-byte the same card: the new rule's own settled placement does not drift with the
    // finger once it has already found its resting spot beside the board.
    expect(secondBox.x).toBeCloseTo(firstBox.x, 0);
    expect(secondBox.y).toBeCloseTo(firstBox.y, 0);
    expect(secondBox.width).toBeCloseTo(firstBox.width, 0);
    expect(secondBox.height).toBeCloseTo(firstBox.height, 0);

    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect(chip).not.toBeVisible();
  });
});
