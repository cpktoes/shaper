import { devices, expect, test, type Page } from "@playwright/test";

/**
 * The setup screen's preset grid with the phone held sideways (D-08's own closing note), now
 * covering the width the emulator reports AND the widths real hardware reported on 2026-09-11
 * (10-SWEEP.md): a real iPhone measures about 844 x 390 held sideways, a real Pixel 7 about
 * 863 x 360 — both wider than Playwright's own `iPhone 14 landscape` descriptor (750 x 340), which
 * is an emulator's number, not a phone's. Under 10-05's corrected width-and-height layout switch,
 * all three land in the phone stack anyway (the 750px one because it is under 820px, the two
 * hardware widths because they combine a coarse pointer with a screen under 500px tall), so this
 * file's own assertions hold at all three for the reason CLAUDE.md's Layout section now states.
 *
 * Each describe below says, in its own name, which kind of number its viewport is — an emulated
 * device descriptor, or a hand-set size standing in for a real hardware measurement — so nobody
 * again mistakes one for the other the way the original 750px assumption was mistaken for a
 * phone's actual sideways width.
 *
 * The card-height assertion itself is the same measured ratio `e2e/phone-home.spec.ts` introduced
 * for the upright case (10-06): the fixed 520-580px band this file used to assert was D-08's own
 * fixed cap, which the 2026-09-11 sweep disproved outright — 757px on a 237px-tall real screen,
 * more than double the "580" ceiling this file used to assert as a maximum.
 */

const BANNER_DISMISSAL_KEY = "shaper-sign-in-banner-dismissed";

/** Matches the sibling phone specs' own approach: dismiss the sign-in banner via sessionStorage,
 * set before navigation, so its own height never confuses a layout assertion. */
async function dismissSignInBanner(page: Page) {
  await page.addInitScript((key) => {
    window.sessionStorage.setItem(key, "true");
  }, BANNER_DISMISSAL_KEY);
}

/** Shared body for all three sideways viewports below: the two-up grid the shaper confirmed by
 * hand ("two is fine"), the card-to-scroller ratio in the same band as upright, the next card's
 * top edge inside the scroller's visible box, and the outline still drawing at a non-zero,
 * distinguishable size — so the cards have not become slivers at the shortest screens this suite
 * exercises. */
async function assertSidewaysGridFitsTheScreen(
  page: Page,
  expectedWidth: number,
  expectedHeight: number,
) {
  await page.goto("/");

  // Load-bearing precondition: this really is the sideways, coarse-pointer viewport the test
  // claims, before asserting anything about its layout — the house style this suite already uses
  // (e2e/phone-layout.spec.ts's sideways describes).
  const preconditions = await page.evaluate(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
    coarsePointer: window.matchMedia("(pointer: coarse)").matches,
  }));
  expect(preconditions.width).toBe(expectedWidth);
  expect(preconditions.height).toBe(expectedHeight);
  expect(preconditions.coarsePointer).toBe(true);

  const scrollerHeight = await page.locator("[data-setup-content]").evaluate((el) => {
    let node: HTMLElement | null = el.parentElement;
    while (node) {
      const style = getComputedStyle(node);
      if (style.overflowY === "auto" || style.overflowY === "scroll") return node.clientHeight;
      node = node.parentElement;
    }
    throw new Error("no scrolling ancestor found for [data-setup-content]");
  });

  const presetCards = page.getByRole("button").filter({ hasText: "Start Shaping" });
  const cards = await presetCards.all();
  expect(cards.length).toBeGreaterThan(1);

  const boxes = [];
  for (const card of cards) {
    const box = await card.boundingBox();
    if (!box) throw new Error("preset card is missing a bounding box");
    boxes.push(box);
  }

  // The two-up grid: exactly two distinct left edges, not one column and not four across — the
  // shaper's own "two is fine" verdict, unchanged by this plan.
  const distinctLeftEdges = new Set(boxes.map((box) => Math.round(box.x)));
  expect(distinctLeftEdges.size).toBe(2);

  for (const box of boxes) {
    const ratio = box.height / scrollerHeight;
    expect(ratio).toBeGreaterThanOrEqual(0.7);
    expect(ratio).toBeLessThanOrEqual(0.82);
  }

  // The second card's top edge falls inside the scroller's visible box — a shaper can see the
  // list continues, sideways as well as upright.
  const scrollerBox = await page
    .locator("[data-setup-content]")
    .evaluate((el) => el.parentElement?.getBoundingClientRect())
    .then((rect) => {
      if (!rect) throw new Error("no scroller rect");
      return rect;
    });
  expect(boxes[1].y).toBeLessThan(scrollerBox.y + scrollerBox.height);

  // The board outline still draws with real height, and the first two presets still draw at
  // different widths — the cards have not become slivers at this screen's shortest dimension.
  const pathWidths: number[] = [];
  for (const card of cards) {
    const path = card.locator('[data-board-silhouette="outline"]');
    const pathBox = await path.boundingBox();
    if (!pathBox) throw new Error("outline path is missing a bounding box");
    expect(pathBox.height).toBeGreaterThan(0);
    pathWidths.push(pathBox.width);
  }
  // The first two presets specifically — the shortboard and the fish, per BOARD_PRESETS' own
  // order — must still read as visibly different boards, not just "the set of four differs
  // somewhere."
  expect(Math.round(pathWidths[0])).not.toBe(Math.round(pathWidths[1]));
}

test.describe("the setup screen's preset grid with the phone held sideways — EMULATED: Playwright's own `iPhone 14 landscape` descriptor (750 x 340)", () => {
  // `defaultBrowserType` is a worker-scoped option Playwright only accepts from the config
  // file's own `projects` list, not from a describe-level `test.use` — the `iphone` project
  // already pins WebKit, so it is dropped here and the rest of the device descriptor (viewport,
  // touch, scale factor) is applied on top of it. Matches e2e/phone-fins-landscape.spec.ts's own
  // pattern exactly.
  const iphone14Landscape = { ...devices["iPhone 14 landscape"] };
  delete (iphone14Landscape as { defaultBrowserType?: unknown }).defaultBrowserType;
  test.use({ ...iphone14Landscape });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "iphone", "sideways-phone assertion runs on the iphone (WebKit) project only");
    await dismissSignInBanner(page);
  });

  test("the grid stays two-up and every card fits the screen, at 750 x 340", async ({ page }) => {
    await assertSidewaysGridFitsTheScreen(page, 750, 340);
  });
});

test.describe("the setup screen's preset grid with the phone held sideways — HAND-SET: standing in for a real iPhone measured sideways (844 x 390, 10-SWEEP.md, 2026-09-11)", () => {
  // Not a Playwright device descriptor — Playwright ships no "iPhone 14 landscape, hardware
  // width" preset. This is the iPhone 14 landscape descriptor's own touch/scale/user-agent
  // characteristics with only the viewport swapped for the shaper's measured figure, so the
  // browser still identifies and behaves as an iPhone while actually reporting the width a real
  // one does.
  const iphone14Landscape = { ...devices["iPhone 14 landscape"] };
  delete (iphone14Landscape as { defaultBrowserType?: unknown }).defaultBrowserType;
  test.use({ ...iphone14Landscape, viewport: { width: 844, height: 390 } });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "iphone", "sideways-phone assertion runs on the iphone (WebKit) project only");
    await dismissSignInBanner(page);
  });

  test("the grid stays two-up and every card fits the screen, at 844 x 390 (a real iPhone, sideways)", async ({
    page,
  }) => {
    await assertSidewaysGridFitsTheScreen(page, 844, 390);
  });
});

test.describe("the setup screen's preset grid with the phone held sideways — EMULATED: Playwright's own `Pixel 7 landscape` descriptor, which happens to match the shaper's measured Pixel 7 (863 x 360, 10-SWEEP.md, 2026-09-11)", () => {
  const pixel7Landscape = { ...devices["Pixel 7 landscape"] };
  delete (pixel7Landscape as { defaultBrowserType?: unknown }).defaultBrowserType;
  test.use({ ...pixel7Landscape });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "android", "sideways-phone assertion runs on the android (Chromium) project only");
    await dismissSignInBanner(page);
  });

  test("the grid stays two-up and every card fits the screen, at 863 x 360 (a Pixel 7, sideways)", async ({
    page,
  }) => {
    await assertSidewaysGridFitsTheScreen(page, 863, 360);
  });
});
