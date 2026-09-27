import { expect, test } from "@playwright/test";

/**
 * RE-RECORDED 2026-09-26 (quick task 260926-uub) — ROCKER and VOLUME only, `rocker-desktop.png` and
 * `volume-desktop.png`, for the founder's new default tips: a new board now starts with a 1/2" nose
 * tip and a 5/8" tail tip. On ROCKER the Nose Tip and Tail Tip station labels over the drawing now
 * read 1/2" and 5/8", and the foil is drawn thicker near both tips. On VOLUME the default board reads
 * 30.06 L instead of 29.94 L; that picture still passed within tolerance, but it was re-recorded
 * anyway so it shows the real number. The differences were inspected before re-recording, old
 * over new: ROCKER changed in exactly two bands, the label row and the drawing near both tips, and
 * VOLUME only in its litres figure — nothing else moved. TEMPLATE, RAILS and FINS were not
 * re-recorded and are byte-for-byte what they were (SHA-256 ef4fa37e…c0 outline, 6c2c6b2b…73 rails,
 * a925ba15…62 fins). The new PNGs were rendered by the webpack dev server (`IS_WEBPACK_TEST=1`,
 * port 3160) in the 260926-uub worktree on this Mac; if the orchestrator's Turbopack run from the
 * main checkout disagrees, it may re-record ROCKER and VOLUME once there, as the 12-03 entry says.
 *
 * RE-RECORDED 2026-09-26 (Phase 12, plan 12-03) — ROCKER only, `rocker-desktop.png`, for the blank
 * list intro's new wording: a blank now needs room at the center for a deck skin and a bottom pass
 * (Phase 12 D-10), so the intro reads "Shortest first. Each is at least 2" longer than your board,
 * with room at the center for a 1/8" deck skin and a 1/8" bottom pass. …" and wraps onto one more
 * line, pushing the search box and the list down by that line. The diff image, inspected before
 * re-recording, showed nothing else moved: the first rows are the same blanks in the same order,
 * and the drawing, the Center Thickness section and the top bar are untouched. TEMPLATE, RAILS,
 * FINS and VOLUME were not re-recorded and are byte-for-byte what they were (SHA-256 ef4fa37e…c0
 * outline, 6c2c6b2b…73 rails, a925ba15…62 fins, e6d97a8d…72 volume). The new PNG was rendered by
 * the webpack dev server (`IS_WEBPACK_TEST=1`, port 3153) in the 12-03 worktree on this Mac; if
 * the orchestrator's Turbopack run from the main checkout disagrees, it may re-record ROCKER once
 * there. (Confirmed identical under the main checkout's Turbopack run on 2026-09-26.)
 *
 * RE-RECORDED 2026-09-26 (Phase 11, plan 11-12) — two images only, `rocker-desktop.png` and
 * `volume-desktop.png`. ROCKER is a new screen: the sidebar now reads Center Thickness, the blank
 * list (the ROCKER shot waits for that streamed list, so the picture always includes it), a
 * disabled Placement slider waiting for a blank, and the hand-set rocker and thickness, beside a
 * drawing that no longer has grab handles. VOLUME's two litres figures moved when the foil moved
 * onto the new smooth curve (D-13, 29.79 → 29.94 L on the default board); a pixel check against
 * the old image, run before re-recording, proved every changed pixel sat inside the two litres
 * figures and nothing else on VOLUME moved. TEMPLATE, RAILS and FINS were not re-recorded, and
 * their images are byte-for-byte what they were.
 *
 * RE-RECORDED 2026-09-13 (quick task: a Home icon beside the settings gear) — the one deliberate
 * re-record since these were created in 09-01. The founder asked for a desktop change, so the
 * desktop changed: the five images now show a house icon beside the gear at 1280px and the six
 * screen links shifted left to make room; the diff images confirmed nothing below the nav row
 * moved. The standing rule is unchanged for everything else — phone work must never move a
 * desktop pixel, and these baselines are still the proof. Re-record only for an intended desktop
 * change, from the main checkout, after inspecting the diff.
 * PHON-05's "before" evidence: a picture of all five desktop design screens exactly as they look
 * today, before any phone work starts. Every later plan in Phase 9 re-runs this spec and must
 * leave every pixel unchanged — that is what "desktop untouched" means as a measurement rather
 * than a promise.
 *
 * `desktop` project only: phone projects (iphone, android) never take these shots, since they
 * render an intentionally different (stacked) layout by design.
 *
 * These baselines are macOS-rendered and local-only — there is no CI running them yet, so a
 * different rendering platform (a different OS, a different font-hinting engine) would
 * legitimately regenerate them from scratch. The tolerance is the config's own
 * `maxDiffPixels: 100`.
 *
 * The sign-in banner (`SignInBanner`, mounted above every /design/* screen) is put in one fixed
 * state before every shot — dismissed — via `sessionStorage`, set through `page.addInitScript`
 * before navigation, so the banner's own dismiss animation/absence never becomes part of what
 * this baseline is measuring.
 */

const BANNER_DISMISSAL_KEY = "shaper-sign-in-banner-dismissed";
// 260909-hny insurance: the toolbar tip is `display: none` at desktop width regardless of
// dismissal state (the phone-width CSS gate alone holds it there), so this changes no pixel here.
// It's dismissed anyway for the same reason every sibling spec now does: if Playwright's WebKit
// ever implements `-webkit-touch-callout`, nothing here should start depending on that to stay
// pixel-stable.
const TOOLBAR_TIP_DISMISSAL_KEY = "shaper-toolbar-tip-dismissed";

test.describe("desktop baseline screenshots", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop-only baselines");
    await page.addInitScript(
      (key) => {
        window.sessionStorage.setItem(key, "true");
      },
      BANNER_DISMISSAL_KEY,
    );
    await page.addInitScript(
      (key) => {
        window.localStorage.setItem(key, "true");
      },
      TOOLBAR_TIP_DISMISSAL_KEY,
    );
  });

  test("TEMPLATE (/design/outline)", async ({ page }) => {
    await page.goto("/design/outline");
    await expect(page.locator("svg").first()).toBeVisible();
    await expect(page).toHaveScreenshot("outline-desktop.png");
  });

  test("ROCKER (/design/rocker)", async ({ page }) => {
    await page.goto("/design/rocker");
    await expect(page.locator("svg").first()).toBeVisible();
    // The blank list streams in after the page (Phase 11): wait for it, so the picture is the
    // screen a shaper sees once it has loaded, never the "Loading blanks…" line.
    await expect(page.getByRole("list", { name: "Blanks" })).toBeVisible({ timeout: 30_000 });
    // ...and wait for React to take over the list and the search box before the screenshot. The
    // screenshot hides the text caret by touching the page; done before the list's boundary has
    // hydrated, React sees server HTML it didn't write, reports a hydration mismatch, and the dev
    // server's red "1 Issue" badge lands in the picture (seen in this plan's first recording).
    await page.waitForFunction(() => {
      const owned = (el: Element | null) => !!el && Object.keys(el).some((key) => key.startsWith("__reactFiber"));
      return (
        owned(document.querySelector('ul[aria-label="Blanks"] button')) &&
        owned(document.querySelector('input[aria-label="Search blanks"]'))
      );
    });
    await expect(page).toHaveScreenshot("rocker-desktop.png");
  });

  test("RAILS (/design/rails)", async ({ page }) => {
    await page.goto("/design/rails");
    await expect(page.locator("svg").first()).toBeVisible();
    await expect(page).toHaveScreenshot("rails-desktop.png");
  });

  test("VOLUME (/design/volume)", async ({ page }) => {
    await page.goto("/design/volume");
    await expect(page.getByText("Estimated Volume")).toBeVisible();
    await expect(page).toHaveScreenshot("volume-desktop.png");
  });

  test("FINS (/design/fins)", async ({ page }) => {
    await page.goto("/design/fins");
    await expect(page.locator("svg").first()).toBeVisible();
    await expect(page).toHaveScreenshot("fins-desktop.png");
  });
});
