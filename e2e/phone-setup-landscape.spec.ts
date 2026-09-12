import { devices, expect, test, type Page } from "@playwright/test";

/**
 * The setup screen's preset grid with the phone held sideways (D-08's own closing note), now
 * covering the width the emulator reports AND the widths real hardware reported on 2026-09-11
 * (10-SWEEP.md): a real iPhone measures about 844 x 390 held sideways, a real Pixel 7 about
 * 863 x 360 — both wider than Playwright's own `iPhone 14 landscape` descriptor (750 x 340), which
 * is an emulator's number, not a phone's, kept here alongside the two hand-set hardware figures
 * (each describe below says which kind of number its own viewport is, so nobody again mistakes
 * one for the other the way the original 750px assumption was mistaken for a phone's actual
 * sideways width).
 *
 * **This file is about the BOARD and the POINTER, and deliberately says nothing about which
 * LAYOUT a width selects (10-09).** All three viewports here are touch screens, so the board
 * picture's cap (`coarse:max-h-(--setup-card-thumb-max-h)`, `card-thumbnail.tsx`) applies at all
 * three regardless of which layout their widths happen to select — the cap reads the pointer, not
 * the width. Which layout each width selects — the phone stack or the desktop shell — is a
 * separate question, answered by the switch in `app/globals.css` and asserted in
 * `e2e/phone-layout.spec.ts`; this file asserts nothing about it, which is what keeps every
 * assertion below true whichever way that switch reads at the moment it runs, including after the
 * layout decision (D-10) landing in the following wave changes what these same three widths
 * select.
 *
 * The card-height assertion itself pins the whole formula this plan introduces — the box's height
 * equals `min(width * 620/340, max(floor, share))`, with the floor and the three primitives read
 * from the page's own computed style — rather than a flat ratio band. Every number in this file's
 * own comments is one this run measured, not one carried over from a plan or an earlier SUMMARY.
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
 * hand ("two is fine"), the board picture box's height pinned against the formula this plan
 * introduces (`min(width * 620/340, max(floor, share))`) rather than a flat ratio band, every
 * outline clearing the floor's own 40x150 CSS px minimum, and the next card's top edge check made
 * conditional on which régime is actually in force — computed from the same primitives already
 * read, never from a hard-coded viewport list, so a future viewport added here gets the right
 * branch automatically. */
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
  // shaper's own "two is fine" verdict, unchanged by this plan. This comes from the setup screen's
  // own small-screen grid breakpoint, not from which layout the width selects, so it stays true on
  // both sides of the layout decision landing next.
  const distinctLeftEdges = new Set(boxes.map((box) => Math.round(box.x)));
  expect(distinctLeftEdges.size).toBe(2);

  // The régime this viewport resolves to, computed from the same three primitives the cap itself
  // reads — never from a list of viewport sizes. Above the crossover the share is the larger of
  // the two and governs; at or below it the floor is the larger and governs instead.
  const primitives = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    return {
      floor: parseFloat(style.getPropertyValue("--setup-card-thumb-min-h")),
      topBar: parseFloat(style.getPropertyValue("--phone-top-bar-h")),
      cardChrome: parseFloat(style.getPropertyValue("--setup-card-chrome-h")),
      innerHeight: window.innerHeight,
    };
  });
  const share = 0.75 * primitives.innerHeight - 0.75 * primitives.topBar - primitives.cardChrome;
  const expectedMaxH = Math.max(primitives.floor, share);
  const shareGoverns = share >= primitives.floor;

  // The board picture box's height equals the formula, at every card, and every drawn outline
  // clears the floor's own 40x150 CSS px minimum — the floor's actual purpose, measured rather
  // than inferred from the box's own height.
  const pathWidths: number[] = [];
  for (const card of cards) {
    const path = card.locator('[data-board-silhouette="outline"]');
    const pathBox = await path.boundingBox();
    if (!pathBox) throw new Error("outline path is missing a bounding box");
    expect(pathBox.width).toBeGreaterThanOrEqual(40);
    expect(pathBox.height).toBeGreaterThanOrEqual(150);
    pathWidths.push(pathBox.width);

    // Three levels up from the path: path -> <g> -> <svg> (OutlineViewer's own root) -> the
    // capped well div — same walk e2e/phone-home.spec.ts's own guard uses.
    const thumbnailBox = path.locator("xpath=../../..");
    const box = await thumbnailBox.boundingBox();
    if (!box) throw new Error("thumbnail box is missing a bounding box");
    const ratioHeight = box.width * (620 / 340);
    const expectedHeight = Math.min(ratioHeight, expectedMaxH);
    expect(Math.abs(box.height - expectedHeight)).toBeLessThanOrEqual(1);
  }
  // The first two presets specifically — the shortboard and the fish, per BOARD_PRESETS' own
  // order — must still read as visibly different boards, not just "the set of four differs
  // somewhere."
  expect(Math.round(pathWidths[0])).not.toBe(Math.round(pathWidths[1]));

  // The second card's top edge falls inside the scroller's visible box — but only where the share
  // governs, which is the whole point of three-quarters: one whole board plus the top of the next.
  // Where the floor governs, the screen is too short to show a legible board AND the next card's
  // top edge at once, and this project chose the legible board — no assertion here is the correct
  // assertion, not a gap.
  if (shareGoverns) {
    const scrollerBox = await page
      .locator("[data-setup-content]")
      .evaluate((el) => el.parentElement?.getBoundingClientRect())
      .then((rect) => {
        if (!rect) throw new Error("no scroller rect");
        return rect;
      });
    expect(boxes[1].y).toBeLessThan(scrollerBox.y + scrollerBox.height);
  }
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

  // The floor this plan adds (Task 1, 10-09): at this suite's shortest screen the old fixed-205px
  // card-chrome subtraction ate the whole budget and the board picture resolved to a sliver (about
  // 13px wide, 46px tall, measured before this fix). This pins two things at once — that a real
  // board still draws large enough to tell apart, and that the box's own height is exactly what the
  // formula says it should be, not a number this test invented — so a future change to either
  // constant is forced through the same arithmetic rather than quietly drifting back toward zero.
  test("the board never resolves to a sliver: every outline clears 40x150 CSS px, and the picture box's height equals max(floor, share)", async ({
    page,
  }) => {
    await page.goto("/");

    const primitives = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement);
      return {
        floor: parseFloat(style.getPropertyValue("--setup-card-thumb-min-h")),
        topBar: parseFloat(style.getPropertyValue("--phone-top-bar-h")),
        cardChrome: parseFloat(style.getPropertyValue("--setup-card-chrome-h")),
        innerHeight: window.innerHeight,
      };
    });
    const share = 0.75 * primitives.innerHeight - 0.75 * primitives.topBar - primitives.cardChrome;
    const expectedMaxH = Math.max(primitives.floor, share);

    const presetCards = page.getByRole("button").filter({ hasText: "Start Shaping" });
    const cards = await presetCards.all();
    expect(cards.length).toBeGreaterThan(1);

    for (const card of cards) {
      const path = card.locator('[data-board-silhouette="outline"]');
      const pathBox = await path.boundingBox();
      if (!pathBox) throw new Error("outline path is missing a bounding box");
      expect(pathBox.width).toBeGreaterThanOrEqual(40);
      expect(pathBox.height).toBeGreaterThanOrEqual(150);

      // Three levels up from the path: path -> <g> -> <svg> (OutlineViewer's own root) -> the
      // capped well div — same walk e2e/phone-home.spec.ts's own guard uses.
      const thumbnailBox = path.locator("xpath=../../..");
      const box = await thumbnailBox.boundingBox();
      if (!box) throw new Error("thumbnail box is missing a bounding box");
      const ratioHeight = box.width * (620 / 340);
      const expectedHeight = Math.min(ratioHeight, expectedMaxH);
      expect(Math.abs(box.height - expectedHeight)).toBeLessThanOrEqual(1);
    }
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
