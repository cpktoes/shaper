import { devices, expect, test, type Page } from "@playwright/test";

/**
 * 260909-hd9's own proof: the founder's report was "The buttons in the phone viewer should live
 * in the corner and grow from there when more than 1. Currently it appears buttons don't display
 * are still taking up room." The numbers measured below are what replaces "it looks right" — a
 * phone's corner-most icon sits flush with the drawing panel's own corner, the row is exactly as
 * wide as its visible icons plus the gap between them (a hidden icon costs the row nothing), and
 * on a desktop nothing has moved off the identical hand-picked spacing it has always had.
 */

const BANNER_DISMISSAL_KEY = "shaper-sign-in-banner-dismissed";
// 260909-hny insurance: today this changes no measurement, because the toolbar tip is already
// `display: none` in every Playwright project (see e2e/phone-toolbar-tip.spec.ts's header
// comment). It's dismissed here anyway so that if Playwright's WebKit ever implements
// `-webkit-touch-callout`, a strip does not silently appear above every pinned-height and
// bounding-box assertion in this file.
const TOOLBAR_TIP_DISMISSAL_KEY = "shaper-toolbar-tip-dismissed";

/** Matches this suite's own approach: dismiss the sign-in banner via sessionStorage, set before
 * navigation, so its own height never confuses a layout assertion. */
async function dismissSignInBanner(page: Page) {
  await page.addInitScript((key) => {
    window.sessionStorage.setItem(key, "true");
  }, BANNER_DISMISSAL_KEY);
  await page.addInitScript((key) => {
    window.localStorage.setItem(key, "true");
  }, TOOLBAR_TIP_DISMISSAL_KEY);
}

/** The gap `ViewerToolbar` puts between buttons — see components/viewer/toolbar-button.tsx's own
 * `VIEWER_TOOLBAR_ROW_CLASS` comment for the 34px-button + 6px-gap = 40px arithmetic this mirrors. */
const TOOLBAR_GAP_PX = 6;
/** The desktop step between buttons the old hand-picked slots produced (0, 40, 80, 120 in from
 * the corner) — hard-coded ONLY in the desktop describe below, on purpose: the desktop contract
 * is the identical line-up, not merely "some consistent spacing". */
const DESKTOP_STEP_PX = 40;

type Box = { x: number; y: number; width: number; height: number };
type ButtonInfo = { name: string; box: Box };

/**
 * Given a page, returns the visible viewer toolbar row's own bounding box plus the bounding boxes
 * (and accessible names) of only its VISIBLE buttons, in DOM order. Because the row is
 * `flex-row-reverse` (components/viewer/toolbar-button.tsx), a hidden button is excluded by real
 * visibility rather than by name — the whole point being that a hidden button occupies nothing —
 * and the remaining visible buttons stay in DOM order, which is corner-first: index 0 is always
 * the corner-most button.
 */
async function measureToolbar(page: Page): Promise<{ rowBox: Box; buttons: ButtonInfo[] }> {
  const row = page.locator("[data-viewer-toolbar]:visible");
  const rowBox = await row.boundingBox();
  if (!rowBox) throw new Error("toolbar row is missing a bounding box");

  const visibleButtons = row.locator("button:visible");
  const count = await visibleButtons.count();
  const buttons: ButtonInfo[] = [];
  for (let i = 0; i < count; i++) {
    const button = visibleButtons.nth(i);
    const box = await button.boundingBox();
    if (!box) throw new Error("visible toolbar button is missing a bounding box");
    const name = (await button.getAttribute("aria-label")) ?? "";
    buttons.push({ name, box });
  }
  return { rowBox, buttons };
}

/** The founder's complaint, stated as a number: the corner-most visible button's right edge sits
 * within 1px of the row's own right edge — no gap where a hidden button's slot used to be. */
function assertCornerFlush(rowBox: Box, cornerButton: ButtonInfo) {
  const distance = Math.abs(cornerButton.box.x + cornerButton.box.width - (rowBox.x + rowBox.width));
  expect(distance, "corner-most button's right edge should sit flush with the row's right edge").toBeLessThanOrEqual(1);
}

/** Proves a hidden button costs the row nothing: the row is exactly as wide as its visible
 * buttons' own measured widths plus one 6px gap for each space between them. */
function assertRowWidthMatchesVisibleButtons(rowBox: Box, buttons: ButtonInfo[]) {
  const totalButtonWidth = buttons.reduce((sum, b) => sum + b.box.width, 0);
  const expectedWidth = totalButtonWidth + TOOLBAR_GAP_PX * (buttons.length - 1);
  expect(
    Math.abs(rowBox.width - expectedWidth),
    "row width should equal the visible buttons' own widths plus one gap per space between them",
  ).toBeLessThanOrEqual(1);
}

/** The visible buttons are contiguous with no overlap: each one's right edge sits one measured
 * button width plus one gap left of the previous (more-corner) one's right edge. Derived from the
 * measured widths rather than a hard-coded step, so this survives a future icon-size change. */
function assertButtonsContiguous(buttons: ButtonInfo[]) {
  for (let i = 1; i < buttons.length; i++) {
    const prev = buttons[i - 1];
    const curr = buttons[i];
    const prevRightEdge = prev.box.x + prev.box.width;
    const currRightEdge = curr.box.x + curr.box.width;
    const expectedCurrRightEdge = prevRightEdge - prev.box.width - TOOLBAR_GAP_PX;
    expect(
      Math.abs(currRightEdge - expectedCurrRightEdge),
      `button ${i} should sit one button width plus one gap left of button ${i - 1}`,
    ).toBeLessThanOrEqual(1);
  }
}

test.describe("phone, upright — the corner icons pack tight with no gap where a hidden one used to be", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "phone-only corner-packing assertions");
    await dismissSignInBanner(page);
  });

  test("TEMPLATE (/design/outline): two icons pack into the corner, Export Template in it", async ({ page }) => {
    await page.goto("/design/outline");

    const { rowBox, buttons } = await measureToolbar(page);
    expect(buttons.length).toBe(2);
    expect(buttons[0].name).toBe("Export Template");
    assertCornerFlush(rowBox, buttons[0]);
    assertRowWidthMatchesVisibleButtons(rowBox, buttons);
    assertButtonsContiguous(buttons);
  });

  test("ROCKER (/design/rocker): one icon sits alone in the corner", async ({ page }) => {
    await page.goto("/design/rocker");

    const { rowBox, buttons } = await measureToolbar(page);
    expect(buttons.length).toBe(1);
    // The construction overlay is on by default on a touch device, so the surviving button's
    // label reads "Hide construction lines" — matched by pattern, not the whole string, so this
    // is not also a test of that default.
    expect(buttons[0].name).toMatch(/construction lines$/);
    assertCornerFlush(rowBox, buttons[0]);
    assertRowWidthMatchesVisibleButtons(rowBox, buttons);
    assertButtonsContiguous(buttons);
  });
});

// 10-05 (was 260909-h3g): a real iPhone held sideways reports about 844 CSS px and a real Pixel 7
// about 863, and the shaper's own decision (10-SWEEP.md, 2026-09-11) is that BOTH now stay in the
// phone stack — a phone on its side is a phone. So 863 x 360 is no longer "a width wide enough for
// the desktop layout"; it is a phone-stack case, and this file's own subject — Rotate gone on a
// TOUCH device even where a sidebar survives to hide — needs a screen that genuinely still keeps
// the desktop shell under the new width-and-height rule. `iPad Mini landscape` (1024 x 768, WebKit)
// is that screen: a tablet-sized touch viewport, wide and tall enough to stay on the desktop side.
// Copied verbatim from e2e/phone-layout.spec.ts's own re-pointed describe rather than inventing a
// second pattern.
const { defaultBrowserType: ipadMiniLandscapeBrowserType, ...ipadMiniLandscapeViewport } =
  devices["iPad Mini landscape"];
void ipadMiniLandscapeBrowserType;

test.describe("touch tablet, sideways — the corner still packs tight even though the screen keeps the desktop layout", () => {
  test.use({ ...ipadMiniLandscapeViewport });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "iphone",
      "this describe supplies its own device (iPad Mini landscape, WebKit)",
    );
    await dismissSignInBanner(page);
  });

  test("TEMPLATE (/design/outline): three icons pack into the corner, Export Template in it", async ({
    page,
  }) => {
    await page.goto("/design/outline");

    // Load-bearing precondition: a coarse pointer AND a screen at least 820 wide AND at least 500
    // tall — the exact bed the desktop-side variant's negation keeps in the desktop shell. Without
    // all three, this proves nothing about the pointer-driven case.
    const preconditions = await page.evaluate(() => ({
      coarsePointer: window.matchMedia("(pointer: coarse)").matches,
      wideEnoughForDesktopShell: window.matchMedia("(min-width: 820px)").matches,
      tallEnoughForDesktopShell: window.matchMedia("(min-height: 500px)").matches,
    }));
    expect(preconditions.coarsePointer).toBe(true);
    expect(preconditions.wideEnoughForDesktopShell).toBe(true);
    expect(preconditions.tallEnoughForDesktopShell).toBe(true);

    const { rowBox, buttons } = await measureToolbar(page);
    // Rotate is gone on a touch screen at any width; Wide view survives because the viewport
    // stays on the desktop side of the shell switch and still has a sidebar to hide — this is the
    // case no phone-width-only fix could ever have reached.
    expect(buttons.length).toBe(3);
    expect(buttons[0].name).toBe("Export Template");
    assertCornerFlush(rowBox, buttons[0]);
  });
});

test.describe("desktop — the icons sit at the identical spacing they have always had", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop-only spacing assertions");
    await dismissSignInBanner(page);
  });

  const DESKTOP_CASES = [
    { path: "/design/outline", label: "TEMPLATE", expectedCount: 4 },
    { path: "/design/rocker", label: "ROCKER", expectedCount: 3 },
    { path: "/design/rails", label: "RAILS", expectedCount: 1 },
  ] as const;

  for (const { path, label, expectedCount } of DESKTOP_CASES) {
    test(`${label} (${path}): ${expectedCount} icon(s), each at the old 0/40/80/120px line-up`, async ({
      page,
    }) => {
      await page.goto(path);

      const { rowBox, buttons } = await measureToolbar(page);
      expect(buttons.length).toBe(expectedCount);

      // Hard-coded on purpose: on the desktop the contract is not "some consistent spacing", it
      // is "the identical line-up the hand-written positions produced" — the desktop baseline
      // screenshots alone cannot say which button is which.
      buttons.forEach((button, i) => {
        const distanceFromCorner = rowBox.x + rowBox.width - (button.box.x + button.box.width);
        expect(
          Math.abs(distanceFromCorner - i * DESKTOP_STEP_PX),
          `button ${i} should sit ${i * DESKTOP_STEP_PX}px in from the row's right edge`,
        ).toBeLessThanOrEqual(1);
      });
    });
  }
});
