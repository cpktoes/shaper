import { expect, test } from "@playwright/test";

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
});
