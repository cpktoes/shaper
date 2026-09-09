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
 */
async function findEmptyCanvasProbe(page: Page): Promise<{
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
  const candidates: { x: number; y: number }[] = [];
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

test.describe("touch drag on the outline viewer (android/CDP only)", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "android", "CDP touch dispatch is Chromium-only");
  });

  test("a real touch drag on the widepoint moves Offset, shows the readout while it moves, and leaves no text selection", async ({
    page,
  }) => {
    await page.goto("/design/outline");

    // D-02 on a touch device: the construction overlay (and its five drag targets) is already on
    // — no tap needed to reveal it. Width/Offset themselves are folded behind the phone-only
    // "Fine adjust" disclosure (D-03) — open it to read them from the sidebar.
    await page.getByRole("button", { name: "Fine adjust" }).click();

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
    // Every one of these five labels is folded behind the phone-only "Fine adjust" disclosure
    // (D-03) — open it so a real shaper (not just this test) could read the value that changed.
    await page.getByRole("button", { name: "Fine adjust" }).click();

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
    await page.getByRole("button", { name: "Fine adjust" }).click();

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
    await page.getByRole("button", { name: "Fine adjust" }).click();

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
    await page.getByRole("button", { name: "Fine adjust" }).click();

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
    await page.getByRole("button", { name: "Fine adjust" }).click();

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
    // (D-02) — no toggle needed. Nose Angle itself is folded behind the phone-only "Fine adjust"
    // disclosure (rocker-controls.tsx's own D-03) — open it to read it from the sidebar.
    await page.getByRole("button", { name: "Fine adjust" }).click();

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
});
