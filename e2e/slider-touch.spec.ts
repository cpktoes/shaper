import { devices, expect, test, type Locator, type Page } from "@playwright/test";

/**
 * 260909-kyz's own proof: a shaper can set any slider on any design screen by putting a finger
 * anywhere on its BAR, not only on the little dot. Today the bar is dead — put a finger down
 * anywhere except the 12px dot and nothing happens — because every slider secretly draws two
 * dots stacked exactly on top of each other, and the slider looks up the wrong one the moment a
 * press lands somewhere else. This file drives a real finger and would fail before the fix in
 * components/ui/slider.tsx lands (see that file's own comment for the measured counts).
 *
 * `android` project only, deliberately not `iphone`: real, trusted touch input in this suite only
 * comes from a Chrome DevTools Protocol session driving `Input.dispatchTouchEvent`, which only
 * Playwright's Chromium exposes. Playwright's WebKit has no touch-drag equivalent at all, so the
 * founder's own iPhone is the closing evidence, and this file's final case records that as a
 * deferred human check (see this task's SUMMARY) — the iPhone itself cannot be driven from here.
 */

const BANNER_DISMISSAL_KEY = "shaper-sign-in-banner-dismissed";
// 260909-hny insurance: today this changes no measurement, because the toolbar tip is already
// `display: none` in every Playwright project (see e2e/phone-toolbar-tip.spec.ts's header
// comment). It's dismissed here anyway so that if Playwright's WebKit ever implements
// `-webkit-touch-callout`, a strip does not silently appear above every bounding-box assertion in
// this file.
const TOOLBAR_TIP_DISMISSAL_KEY = "shaper-toolbar-tip-dismissed";

/** Matches every sibling spec's own approach: dismiss the sign-in banner via sessionStorage and
 * the toolbar tip via localStorage, both set before navigation, so neither strip's height ever
 * confuses a bounding-box measurement. */
async function dismissSignInBanner(page: Page) {
  await page.addInitScript((key) => {
    window.sessionStorage.setItem(key, "true");
  }, BANNER_DISMISSAL_KEY);
  await page.addInitScript((key) => {
    window.localStorage.setItem(key, "true");
  }, TOOLBAR_TIP_DISMISSAL_KEY);
}

/** A value label's own text ("Width — 19"") sits in a plain div that is the immediate previous
 * sibling of the Slider it labels — `SliderRow`'s own layout. Walking up one level from the label
 * reaches that shared row, which is what lets one helper find "the bar" or "the dot" starting from
 * the same label locator a shaper would read the value off. */
function rowFor(label: Locator): Locator {
  return label.locator("xpath=..");
}

/** Reads the row's bar (the Track element a finger is meant to land anywhere on) off the DOM,
 * scrolling it into view first — never a hardcoded coordinate, always measured live. */
async function barBox(label: Locator) {
  const bar = rowFor(label).locator('[data-slot="slider-track"]');
  await bar.scrollIntoViewIfNeeded();
  const box = await bar.boundingBox();
  if (!box) throw new Error("slider bar is missing a bounding box");
  return box;
}

/** Reads the row's dot (the Thumb a drag has always worked from) off the DOM the same way. */
async function thumbCenter(label: Locator) {
  const thumb = rowFor(label).locator('[data-slot="slider-thumb"]');
  await thumb.scrollIntoViewIfNeeded();
  const box = await thumb.boundingBox();
  if (!box) throw new Error("slider thumb is missing a bounding box");
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** A point a given fraction along a measured bar box — never hardcoded, always derived from the
 * live bounding box `barBox` just read. */
function pointAtFraction(
  box: { x: number; y: number; width: number; height: number },
  fraction: number,
) {
  return { x: box.x + box.width * fraction, y: box.y + box.height / 2 };
}

/** A single real finger tap via a CDP touch session: touchStart, a short pause (matching a real
 * finger's dwell), then touchEnd. This is the "bar press" gesture every case below drives. */
async function touchTap(page: Page, point: { x: number; y: number }) {
  const client = await page.context().newCDPSession(page);
  await client.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: point.x, y: point.y }],
  });
  await page.waitForTimeout(50);
  await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}

/** A real finger drag via a CDP touch session: touchStart at `start`, `steps` touchMove events
 * walking straight to `end`, then touchEnd. Used for the dot-drag-with-wander gesture, which has
 * always worked and must keep working unchanged. */
async function touchDrag(
  page: Page,
  start: { x: number; y: number },
  end: { x: number; y: number },
  steps: number,
) {
  const client = await page.context().newCDPSession(page);
  await client.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: start.x, y: start.y }],
  });
  for (let i = 1; i <= steps; i++) {
    const x = start.x + ((end.x - start.x) * i) / steps;
    const y = start.y + ((end.y - start.y) * i) / steps;
    await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y }] });
  }
  await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}

test.describe("Case A: upright phone, Width in its own section", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "android",
      "real touch input is only available on the android (Chromium) project",
    );
    await dismissSignInBanner(page);
  });

  test("a bar press moves the value, and a wandering drag on the dot still works without scrolling the list", async ({
    page,
  }) => {
    await page.goto("/design/outline");

    const widthLabel = page.getByText(/^Width — /);
    await expect(widthLabel).toBeVisible();

    // Gesture 1: a press 75% along the bar — today this does nothing at all.
    const before = await widthLabel.textContent();
    const boxBefore = await barBox(widthLabel);
    await touchTap(page, pointAtFraction(boxBefore, 0.75));

    const afterBarPress = await widthLabel.textContent();
    expect(afterBarPress).not.toBe(before);

    // Gesture 2: the drag that has always worked, started on the dot, wandering ~48px along the
    // bar and ~30px down the screen. It must still move the value, and the controls list must not
    // scroll out from under the shaper while it does.
    const scroller = page.locator("[data-design-controls-scroll]");
    const scrollTopBefore = await scroller.evaluate((el) => el.scrollTop);

    const dot = await thumbCenter(widthLabel);
    const barMidX = boxBefore.x + boxBefore.width / 2;
    const direction = dot.x > barMidX ? -1 : 1;
    await touchDrag(page, dot, { x: dot.x + direction * 48, y: dot.y + 30 }, 6);

    const afterDrag = await widthLabel.textContent();
    expect(afterDrag).not.toBe(afterBarPress);

    const scrollTopAfter = await scroller.evaluate((el) => el.scrollTop);
    expect(scrollTopAfter).toBe(scrollTopBefore);
  });
});

test.describe("Case B: touch tablet, sideways, Width visible in the desktop-style sidebar", () => {
  // 10-05: `Pixel 7 landscape` (863 x 360) used to keep the desktop-style sidebar at this width —
  // that is exactly the assumption the sweep disproved (10-SWEEP.md, 2026-09-11): a real phone
  // held sideways now stays a phone, so this bed no longer carries "wide enough for the desktop
  // sidebar." This case's actual subject is a REAL FINGER touch bar-press and a wandering drag —
  // this file's own header explains that real touch input only comes from a CDP session driving
  // `Input.dispatchTouchEvent`, which only Playwright's Chromium exposes — so the replacement bed
  // has to stay Chromium too, ruling out the `iPad Mini landscape` (WebKit) descriptor the sibling
  // files in this plan re-point at. `Galaxy Tab S9 landscape` (1024 x 640, Chromium, touch) is a
  // genuinely tablet-sized touch screen that keeps the desktop shell under the new width-and-height
  // rule while staying on Chromium, so it is the descriptor chosen here. `defaultBrowserType` is a
  // worker-scoped option Playwright only accepts from the config file's own `projects` list, not
  // from a describe-level `test.use` — the `android` project already pins Chromium, so it is
  // dropped here (same recipe as e2e/phone-fins-landscape.spec.ts).
  const galaxyTabS9Landscape = { ...devices["Galaxy Tab S9 landscape"] };
  delete (galaxyTabS9Landscape as { defaultBrowserType?: unknown }).defaultBrowserType;
  test.use({ ...galaxyTabS9Landscape });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "android", "touch-tablet assertion runs on the chromium project only");
    await dismissSignInBanner(page);
  });

  test("a bar press moves the value and the wandering drag still works", async ({
    page,
  }) => {
    await page.goto("/design/outline");

    // Prove the bed is real before asserting anything about it: a coarse pointer AND a screen at
    // least 820 wide AND at least 500 tall — the exact bed the desktop-side variant's negation
    // keeps in the desktop shell, not the phone stack.
    const dims = await page.evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight,
      coarsePointer: window.matchMedia("(pointer: coarse)").matches,
      sidebarShell: window.matchMedia("(min-width: 820px)").matches,
      tallEnoughForDesktopShell: window.matchMedia("(min-height: 500px)").matches,
    }));
    expect(dims.width).toBe(1024);
    expect(dims.height).toBe(640);
    expect(dims.coarsePointer).toBe(true);
    expect(dims.sidebarShell).toBe(true);
    expect(dims.tallEnoughForDesktopShell).toBe(true);

    const widthLabel = page.getByText(/^Width — /);
    await expect(widthLabel).toBeVisible();

    const before = await widthLabel.textContent();
    const boxBefore = await barBox(widthLabel);
    await touchTap(page, pointAtFraction(boxBefore, 0.75));

    const afterBarPress = await widthLabel.textContent();
    expect(afterBarPress).not.toBe(before);

    const scroller = page.locator("[data-design-controls-scroll]");
    const scrollTopBefore = await scroller.evaluate((el) => el.scrollTop);

    const dot = await thumbCenter(widthLabel);
    const barMidX = boxBefore.x + boxBefore.width / 2;
    const direction = dot.x > barMidX ? -1 : 1;
    await touchDrag(page, dot, { x: dot.x + direction * 48, y: dot.y + 30 }, 6);

    const afterDrag = await widthLabel.textContent();
    expect(afterDrag).not.toBe(afterBarPress);

    const scrollTopAfter = await scroller.evaluate((el) => el.scrollTop);
    expect(scrollTopAfter).toBe(scrollTopBefore);
  });
});

test.describe("Case C: a slider that was never a drag-point mirror", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "android",
      "real touch input is only available on the android (Chromium) project",
    );
    await dismissSignInBanner(page);
  });

  test("RAILS' Deck Profile row takes a bar press too — the defect was never about the fold or the outline drag-point rows", async ({
    page,
  }) => {
    await page.goto("/design/rails");

    // All three rail sections (Nose/Center/Tail) render their own "Deck Profile — …" row by
    // default — `.first()` reaches Nose Rail's, which is enough to prove every slider on the page
    // shares the same underlying fix, not just the outline screen's own controls.
    const deckProfileLabel = page.getByText(/^Deck Profile — /).first();
    await expect(deckProfileLabel).toBeVisible();

    const before = await deckProfileLabel.textContent();
    const box = await barBox(deckProfileLabel);
    await touchTap(page, pointAtFraction(box, 0.75));

    const after = await deckProfileLabel.textContent();
    expect(after).not.toBe(before);
  });
});
