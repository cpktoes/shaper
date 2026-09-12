import { devices, expect, test, type Page } from "@playwright/test";

/**
 * Standing regression test for the top-nav overflow commit `5dae1f1` fixed and left unproven
 * (10-REVIEW.md WR-01). The desktop-style top row (wordmark + six screen links + settings + Save
 * + the account control) ran 51px past the viewport's right edge at 820px wide — a bug that had
 * shipped broken since before this phase — and widening the account control's tap target for
 * touch (D-05, `nav-auth-control.tsx`) pushed it another 7px over on a phone held sideways. The
 * fix (`px-12` → `px-6 lg:px-12`, `gap-5` → `gap-4 lg:gap-5` in `components/site-nav.tsx`) closed
 * both, but nothing in the suite checked it: `e2e/phone-setup-landscape.spec.ts` runs at 750px,
 * below the shell breakpoint, where this row is `max-shell:hidden` and never at risk;
 * `e2e/phone-home.spec.ts`'s 819/820px case only measures the preset-card thumbnail's height; and
 * `e2e/phone-trip.spec.ts`'s `scrollWidth` check runs on the phone projects' own portrait
 * viewports, never at a landscape/desktop-shell width. This file is that missing test.
 *
 * 820 to 870 is the band: 820px is where the fix's own commit message measured the first 51px
 * overflow, and 863px is a real Pixel 7 held sideways (10-SWEEP.md, 2026-09-11) — the touch case
 * where the account control's extra width made the overflow 7px worse.
 *
 * After 10-05, a short TOUCH screen in this band is now the phone layout (`max-shell` is
 * `width < 820px` OR `coarse pointer AND height < 500px`), where this row is hidden entirely and
 * `PhoneTopBar` renders instead. That is exactly why the touch case below uses a screen that is
 * both wide AND tall enough to keep the desktop shell, rather than a short sideways phone, which
 * would never render `SiteNav`'s full row at all and so could never prove anything about its
 * width. The device is `Galaxy Tab S9 landscape` (1024 x 640, Chromium, `hasTouch: true`) — the
 * same descriptor `e2e/slider-touch.spec.ts` Case B settled on in 10-05 for the same reason it's
 * needed here: this file must run under `--project=android` (this plan's own acceptance
 * criterion), and only a Chromium-backed device runs on that project.
 *
 * WHAT THIS FILE CANNOT PROVE (10-REVIEW-2.md WR2-01): `components/auth/nav-auth-control.test.ts`
 * (lines 13-24) and `e2e/phone-account.spec.ts` (lines 7-24) both document, as an empirically
 * confirmed fact, that under this suite's deliberately fake Clerk publishable key
 * `useUser().isLoaded` never settles `true` — confirmed by polling the DOM for over 20 seconds.
 * That means `NavAuthControl` is permanently stuck on its `!isLoaded` loading-placeholder branch
 * (`<span aria-hidden className="block size-7 coarse:size-11" />`) for the entire life of this
 * suite, on every project. Neither the real signed-out "Sign in" text button (D-06, sized by its
 * 14px text, no `coarse:` width class at all) nor Clerk's real avatar (D-05, `coarse:p-2!`) is
 * EVER the element `nav.locator("> div").last()` measures below — only the placeholder is, fixed
 * at `size-7` (28px) on the mouse-driven describe and `coarse:size-11` (44px) on the touch-driven
 * one. The 44px touch figure happens to match the avatar's target footprint by design
 * (`nav-auth-control.tsx`'s own comment), but the "Sign in" button's real width was never measured
 * anywhere in this suite and there's no reason to expect it exactly equals 28px or 44px — it's
 * plausibly wider. The slack assertion each case makes below exists specifically so a future
 * change that narrows the row's spare room fails here before the real, un-faked control (which
 * only the founder's real-device sweep ever renders) has a chance to reopen the original overflow
 * silently. Residual risk: if the real "Sign in" button or Clerk's real avatar ever renders wider
 * than the slack this file currently measures, only that real-device sweep — not this suite —
 * would catch it.
 */

const BANNER_DISMISSAL_KEY = "shaper-sign-in-banner-dismissed";

/** Matches the sibling phone specs' own approach: dismiss the sign-in banner via sessionStorage,
 * set before navigation, so its own height never confuses a layout assertion. */
async function dismissSignInBanner(page: Page) {
  await page.addInitScript((key) => {
    window.sessionStorage.setItem(key, "true");
  }, BANNER_DISMISSAL_KEY);
}

/** The three checks every case below makes, on the design route where `SiteNav`'s full row
 * (not `PhoneTabBar`/`PhoneTopBar`) actually renders: the document never scrolls sideways, the
 * nav element's own content never overflows its box, and the row's two end items — the wordmark
 * on the left, the account-control cluster on the right — both sit inside the viewport's edges.
 * The third check is the one that proves the row is provably whole, not merely "doesn't scroll":
 * a `scrollWidth`-only check can pass even while an item visually spills past the edge if a
 * sibling element happens to be shorter, so this also checks real bounding boxes. */
async function assertNavRowFitsViewport(page: Page, width: number) {
  const nav = page.locator("nav:not([aria-label])");
  await expect(nav).toBeVisible();

  // 1. The document itself never scrolls sideways.
  const scrollWidth = await page.evaluate(() => document.scrollingElement?.scrollWidth ?? 0);
  expect(scrollWidth).toBe(width);

  // 2. The nav element's own content doesn't overflow its own box.
  const navOverflow = await nav.evaluate((el) => ({
    scrollWidth: el.scrollWidth,
    clientWidth: el.clientWidth,
  }));
  expect(navOverflow.scrollWidth).toBeLessThanOrEqual(navOverflow.clientWidth);

  // 3. Both end items sit inside the viewport's edges — the wordmark on the left, the
  // right-hand chrome cluster (screen links, settings, Save, the account control) on the right.
  // This is the exact cluster the D-05 tap-target growth widened, and the exact edge that ran
  // 51px/7px past the viewport before the fix.
  const wordmark = page.getByRole("link", { name: "SHAPER ASSISTANT" });
  const cluster = nav.locator("> div").last();
  const wordmarkBox = await wordmark.boundingBox();
  const clusterBox = await cluster.boundingBox();
  if (!wordmarkBox || !clusterBox) throw new Error("missing bounding box for wordmark or cluster");
  expect(wordmarkBox.x).toBeGreaterThanOrEqual(0);
  expect(clusterBox.x + clusterBox.width).toBeLessThanOrEqual(width);

  // 4. Real headroom, not just "hasn't overflowed yet". This suite can only ever measure the
  // account control's loading placeholder (see this file's header comment) — never the real
  // "Sign in" button or Clerk's real avatar — so a bare no-overflow check above could stay green
  // right up until the real control ships wider and overflows in production. Measuring and
  // logging the actual slack is what would catch that before a shaper ever sees it.
  const slack = width - (clusterBox.x + clusterBox.width);
  console.log(`[site-nav-width] ${width}px viewport: ${slack.toFixed(1)}px of slack right of the nav cluster`);
  // 24px: the real "Sign in" button (14px text, no horizontal padding) renders roughly 20px wider
  // than the 28px placeholder this suite measures in its place; 24 leaves a little margin on top
  // of that gap, so this fails before the real control would actually overflow.
  expect(slack).toBeGreaterThanOrEqual(24);
}

test.describe("top nav row — fits without horizontal scroll, 820 to 870px wide (mouse)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "mouse-driven desktop-shell assertions");
    await dismissSignInBanner(page);
  });

  for (const width of [820, 844, 863]) {
    test(`at ${width}px wide, the row fits with no horizontal scroll and both end items on screen`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 700 });
      await page.goto("/design/outline");
      await assertNavRowFitsViewport(page, width);
    });
  }
});

// `Galaxy Tab S9 landscape` (1024 x 640, Chromium, `hasTouch: true`) — genuinely wide AND tall
// enough (>= 820, >= 500) to keep the desktop shell under the width-and-height `max-shell` rule,
// so `SiteNav`'s full row — not `PhoneTopBar` — is what renders here. This is the case the
// original bug actually bit on: the account control only grows to 44px under a touch pointer, so
// a mouse-driven viewport at the same width never exercised the wider control at all.
// `defaultBrowserType` is part of the descriptor but can't be set via `test.use` inside a
// describe (Playwright only allows it top-level or in the config file) — it's redundant here
// anyway, since the `android` project this describe is pinned to already runs Chromium.
const { defaultBrowserType: galaxyTabS9LandscapeBrowserType, ...galaxyTabS9LandscapeViewport } =
  devices["Galaxy Tab S9 landscape"];
void galaxyTabS9LandscapeBrowserType;

test.describe("top nav row — fits without horizontal scroll on a touch screen that keeps the desktop shell", () => {
  test.use({ ...galaxyTabS9LandscapeViewport });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "android",
      "this describe supplies its own device (Galaxy Tab S9 landscape, Chromium)",
    );
    await dismissSignInBanner(page);
  });

  test("the row fits with no horizontal scroll and both end items on screen, using this suite's 44px touch placeholder in place of the real widened account control", async ({
    page,
  }) => {
    await page.goto("/design/outline");

    // Load-bearing precondition: a coarse pointer, and wide/tall enough to keep the desktop
    // shell — without all three this proves nothing about the case the bug actually occurred in.
    const preconditions = await page.evaluate(() => ({
      coarsePointer: window.matchMedia("(pointer: coarse)").matches,
      wideEnoughForDesktopShell: window.matchMedia("(min-width: 820px)").matches,
      tallEnoughForDesktopShell: window.matchMedia("(min-height: 500px)").matches,
    }));
    expect(preconditions.coarsePointer).toBe(true);
    expect(preconditions.wideEnoughForDesktopShell).toBe(true);
    expect(preconditions.tallEnoughForDesktopShell).toBe(true);

    const viewportSize = page.viewportSize();
    if (!viewportSize) throw new Error("no viewport size");
    await assertNavRowFitsViewport(page, viewportSize.width);
  });
});
