import { expect, test } from "@playwright/test";
import { openRocker } from "./helpers/blank-picker";

/**
 * RE-RECORDED 2026-11-02 (fast task 189, branch rails-v2) — RAILS and VOLUME, `rails-desktop.png` and
 * `volume-desktop.png`, for "Scaled from center by" defaulting to 1.00 instead of the sheet's 0.75 (R20, the founder:
 * "Go with 1.00 as the default"): the nose and tail cross-sections' bands now come from their own thickness with no
 * further scaling, so their Apex Thickness, Deck Mark 1 and Deck Mark 3 sit further from the apex and the finished
 * rail follows; the centre is untouched. On VOLUME the default board reads 30.33 L instead of 30.52 L and its Tail and
 * Nose Cross-Section Thickness rows move with it. Old and new were compared before re-recording: on RAILS only the
 * Nose and Tail plots changed; on VOLUME only the litres and the thickness rows. TEMPLATE, ROCKER and FINS passed
 * unchanged and were not re-recorded. Rendered by the webpack dev server (`IS_WEBPACK_TEST=1`, port 3191) in a
 * scratch copy of this checkout on this Mac. SHA-256 (first 8 characters), old to new: RAILS c4c6afc4 to c89c1def,
 * VOLUME 2e4e1421 to ff9f48b1.
 *
 * RE-RECORDED 2026-11-02 (fast task 187, branch rails-v2) — RAILS only, `rails-desktop.png`, for the key: its
 * "Finished Rail" entry now draws a 14px line at the curve's own 3px weight instead of a 9px ink dot (which was the
 * same dot "Board Thickness" has), so the whole key row re-flows by a few dots. Old and new were compared before
 * re-recording: the diff picture shows the key row only; the drawing, the toolbar, the sidebar and the top bar are
 * unchanged. TEMPLATE, ROCKER, VOLUME and FINS passed unchanged and were not re-recorded. Rendered by the webpack
 * dev server (`IS_WEBPACK_TEST=1`, port 3191) in a scratch copy of this checkout on this Mac. SHA-256 (first 8
 * characters), old to new: RAILS 70fe0531 to c4c6afc4.
 *
 * RE-RECORDED 2026-11-02 (quick 261102-gec, plan 03, branch rails-v2) — VOLUME only, `volume-desktop.png`, for the
 * founder's D-V1 ("Switch to the finished curve"): litres now count the finished rail, the cut rail blended halfway
 * into each band, instead of the raw band cuts. Old and new were compared before re-recording: on the default board
 * the Estimated Volume reads 30.52 L instead of 30.73 L, the Center Cross-Section Thickness row reads 2 1/4" instead
 * of 2 5/16" (it is worked from the same finished rail), and the method line reads "From the board's own finished
 * cross-sections along its length."; the Tail, Nose and Length-Weighted rows (1 1/2", 1 1/4", 1 1/2"), the sidebar
 * and the top bar are unchanged. TEMPLATE, ROCKER, RAILS and FINS passed unchanged and were not re-recorded.
 * Rendered by the webpack dev server (`IS_WEBPACK_TEST=1`, port 3174) in the plan's worktree on this Mac. SHA-256
 * (first 8 characters), old to new: VOLUME 8069a93a to 2e4e1421.
 *
 * RE-RECORDED 2026-11-02 (fast task 185, branch rails-v2) — RAILS only, `rails-desktop.png`, for the VIEWER toolbar
 * after the founder's look at plan 02: the Finished Rail button now wears a solid rail-silhouette glyph in place of
 * lucide's spline, and a new Ghost Bands button (a dashed cut chain with its mark dots) sits beside it, off by
 * default. Old and new were compared before re-recording: the diff picture shows only the three toolbar buttons;
 * the drawing, the key, the sidebar and the top bar are unchanged. TEMPLATE, ROCKER, VOLUME and FINS passed
 * unchanged and were not re-recorded. Rendered by the webpack dev server (`IS_WEBPACK_TEST=1`, port 3190) in a
 * scratch copy of this checkout on this Mac (the founder's review server held the checkout's dev lock). SHA-256
 * (first 8 characters), old to new: RAILS 8411efec to 70fe0531.
 *
 * RE-RECORDED 2026-11-02 (quick 261102-gec, plan 02, branch rails-v2) — RAILS only, `rails-desktop.png`, for the
 * finished rail and the fuller sidebar: every cross-section now draws the finished rail as a heavy ink line over
 * the bands with the board's fill under the grid, the VIEWER toolbar gained the curve button that hides it, the key
 * gained "Finished Rail", Ratio's marks read 20/80, 50/50 and 80/20, and Sym moved onto its own line under them.
 * Old and new were compared before re-recording: only those parts moved; the top bar, the tab band and the rest of
 * the sidebar are unchanged. TEMPLATE, ROCKER, VOLUME and FINS passed unchanged and were not re-recorded. Rendered
 * by the webpack dev server (`IS_WEBPACK_TEST=1`, port 3173) in the plan's worktree on this Mac. SHA-256 (first 8
 * characters), old to new: RAILS f7bc899f to 8411efec.
 *
 * RE-RECORDED 2026-11-02 (quick 261102-gec, plan 01, branch rails-v2) — RAILS and VOLUME, `rails-desktop.png` and
 * `volume-desktop.png`, for the founder's Chris Rails v2 rules: every rail's marks now come from their two new
 * sheets and the Corner Cut is gone. Old and new were compared before re-recording. On RAILS only the three
 * cross-sections, their dots and the key changed (no Corner Cut line or key entry, the dome band 2.4 x the
 * thickness, the new marks); the sidebar and the top bar are unchanged. On VOLUME the default board reads
 * 30.73 L instead of 30.51 L, and the Tail and Nose Cross-Section Thickness rows read 1 1/2" and 1 1/4" instead
 * of 1 7/16" and 1 3/16" — each is that end's average thickness across its 12" cross-section, worked from the
 * same rail profile the litres use, so all three moved for the one reason; nothing else on VOLUME moved.
 * TEMPLATE, ROCKER and FINS passed unchanged and were not re-recorded. RAILS was rendered by the webpack dev
 * server (`IS_WEBPACK_TEST=1`, port 3172) in the plan's worktree, VOLUME by the same server from the main
 * checkout (port 3100), both on this Mac. SHA-256 (first 8 characters), old to new: RAILS 199a6b0a to
 * f7bc899f, VOLUME c698ede0 to 8069a93a.
 *
 * RE-RECORDED 2026-10-19 (quick 261019-gqo, plan 02) — ROCKER only, `rocker-desktop.png`, for the new PLANING
 * tab: the panel's tab strip now reads VIEWER, PLANING, DATASHEET on a computer. Old and new were compared
 * before re-recording (421 pixels differ): only the tab strip gained a word; the sidebar, the drawing and the
 * top bar are unchanged. TEMPLATE, RAILS, VOLUME and FINS passed unchanged and were not re-recorded. Rendered
 * by the webpack dev server (`IS_WEBPACK_TEST=1`, port 3172) in the plan's worktree on this Mac. SHA-256
 * (first 8 characters), old to new: ROCKER c32b9086 to 849ae17b.
 *
 * RE-RECORDED 2026-10-19 (quick 261019-gqo, plan 01) — ROCKER only, `rocker-desktop.png`, for the founder's
 * rearranged ROCKER & FOIL sidebar: INPUTS now holds Center Thickness, Nose Tip and Tail Tip (three sliders),
 * Placement moved up into the BLANK section under the Pick a Blank card (the BOARD ON BLANK heading is gone),
 * and the hand-set Rocker & Foil table lost its two tip-thickness cells. Old and new were compared by eye
 * before re-recording: the top bar, the tab band and the whole drawing side are unchanged; only the sidebar
 * from the INPUTS block down moved. TEMPLATE, RAILS, VOLUME and FINS passed unchanged and were not
 * re-recorded. Rendered by the webpack dev server (`IS_WEBPACK_TEST=1`, port 3171) in the plan's worktree on
 * this Mac. SHA-256 (first 8 characters), old to new: ROCKER 8b058472 to c32b9086.
 *
 * RE-RECORDED 2026-10-18 (quick 261018-fg1) — ROCKER, RAILS, VOLUME and FINS, for the imported
 * dimensions as a readout card (sketch 017 C, the founder's "Go with C readout card, figures in
 * accent = off"): each sidebar's one-line INPUTS sentence became a small card (an accent caption,
 * then each figure large in ink with its name under it), so the controls under it move down by the
 * card's extra height. Old and new were compared against each other before re-recording: only the
 * sidebar from the INPUTS block down moved; the drawing side and the top bar are unchanged. TEMPLATE
 * was not re-recorded. Rendered by the webpack dev server (`IS_WEBPACK_TEST=1`, port 3164) on this
 * Mac. SHA-256 (first 8 characters), old to new: ROCKER df77b72a to 8b058472, RAILS 5766a6d9 to
 * 45bdc74a, VOLUME 17b3a6c9 to d9915b11, FINS 11b3b466 to da13a38a.
 *
 * RE-RECORDED 2026-10-18 (quick 261018-e6w) — TEMPLATE only, `outline-desktop-desktop-darwin.png`:
 * the drag points now show from the start (the five rings and their guide lines on the board, and
 * the drag-points button shaded), a fin-placement button with the new surfboard-fin icon joins the
 * drawing's toolbar, and the sidebar's Settings block is gone (it sat below the fold of this picture,
 * so the picture itself shows only the first two changes). Old and new were compared by eye before re-recording: nothing
 * else moved. ROCKER, RAILS, VOLUME and FINS were not re-recorded. Rendered by the webpack dev
 * server (`IS_WEBPACK_TEST=1`, port 3162) on this Mac.
 *
 * RE-RECORDED 2026-10-18 (quick 261017-vdh) — all five, for the founder's side-panel redesign from
 * the copy-edit canvas: an INPUTS section at the top of ROCKER, RAILS, VOLUME and FINS (one import
 * box where a screen imports, and a "… details are imported: …" line in place of the controls it
 * now hides), RAILS' View box on each rail heading, ROCKER's hand-set Rocker & Foil table, FINS'
 * Advanced reading nose to tail, and TEMPLATE's Show Drag Points / Show fin placement wording. Each
 * plan compared old against new before re-recording: only the side panels moved. Rendered by the
 * webpack dev server (`IS_WEBPACK_TEST=1`, ports 3161–3163) in the plans' worktrees; RAILS and
 * TEMPLATE were shot after hydration settled (an early shot catches the unfitted server render).
 *
 * RE-RECORDED 2026-10-17 (quick 261017-sru, then fast task 173) — TEMPLATE, VOLUME and FINS for the
 * closed Board Length boxes, which now read 6' and 0" like their lists instead of a bare 6 and 0
 * (261017-sru; VOLUME and FINS changed only in that box row). TEMPLATE once more for the founder's
 * canvas edit: the Width slider gains "Thin" / "Thick" hints under it, so the sidebar below the
 * Widepoint row moves down by one hint line (fast 173). ROCKER for the same canvas (fast 174): the
 * new subtitle, "TEMPLATE details are imported:" on the line under it, and the Center Thickness note
 * removed, so the sidebar under it moves up by that line. RAILS was not re-recorded. All rendered by
 * the webpack dev server (`IS_WEBPACK_TEST=1`, port 3134) on this Mac.
 *
 * RE-RECORDED 2026-10-15 (quick 261015-ve9) — ROCKER only, `rocker-desktop.png`, for picking a blank
 * from a popup of drawn blanks (sketch 015 B): the BLANK section is now one "Pick a Blank" button
 * with its count line ("196 blanks long enough for this board, 194 fit") and BROWSE BLANKS ›, where
 * the list intro, the search box and the first rows used to be, so the sections under it (BOARD ON
 * BLANK, ROCKER) move up into view. Old and new were compared by eye before committing: the top bar,
 * the CENTER THICKNESS section, the BLANK heading and the whole drawing side are unchanged; only the
 * sidebar from the BLANK heading down moved. TEMPLATE, RAILS, VOLUME and FINS were not re-recorded.
 * ROCKER went from 9e8879e5… to 950cf2d2… (SHA-256). The new PNG was rendered by the webpack dev
 * server (`IS_WEBPACK_TEST=1`, port 3181) in the 261015-ve9 worktree on this Mac; if the
 * orchestrator's Turbopack run from the main checkout disagrees, it may re-record ROCKER once there.
 *
 * RE-RECORDED 2026-10-10 (quick task 261010-km7) — all five, on the founder's standing go ("push all
 * when live"), for the founder's new logo: "shaperassistant.com" replaces SHAPER ASSISTANT at the
 * left of the top bar. Compared old against new before committing: exactly 1851 changed pixels on
 * every screen, all inside the logo's box (x 40-232, y 24-58), and 0 pixels anywhere else on all
 * five. Rendered by the Turbopack dev server from the main checkout (PW_PORT=3191). SHA-256 now
 * 5a8556b4…fins, cc1d18e8…outline, 33695a65…rails, 48a22e9c…rocker, aebc623a…volume.
 *
 * RE-RECORDED 2026-10-08 (quick task 261008-raw) — all five, on the founder's approval ("approved,
 * push all"), for the board's name in the tab band: the unsaved reference board now reads "Untitled"
 * at the right end of each screen's VIEWER tab band. Compared old against new, region by region,
 * before committing: exactly 285 changed pixels on every screen, all inside the band's right end
 * (x >= 1190, y 93-123) — the word itself — and elsewhere 49 (TEMPLATE), 14 (ROCKER), 49 (RAILS),
 * 0 (VOLUME) and 0 (FINS) pixels at no more than 2 levels of 255, the sidebar text's pre-existing
 * anti-aliasing scatter (with the name switched off, all five old pictures still passed). Rendered by
 * the Turbopack dev server from the main checkout (PW_PORT=3191). SHA-256 now 08ba7c34…fins,
 * a4c58cbc…outline, 6b132ae5…rails, ccb2b9bd…rocker, 8db54027…volume.
 *
 * RE-RECORDED 2026-10-06 (quick task 261006-qfm) — ROCKER only, `rocker-desktop.png`, for the blank
 * seen from above: the VIEWER toolbar gains a fourth button at the left end of the row (hide / show
 * the blank from above, on by default, so it draws in its pressed colour), and a small drawing of
 * the default board seen from above now sits on its own plate over the panel's top-left corner. The
 * side view itself did not move. The diff image, inspected before re-recording, showed exactly two
 * changed areas — the new button and the corner drawing's plate and outline (2032 pixels) — with
 * the side view, its station cards, the sidebar and the top bar untouched. TEMPLATE, RAILS, VOLUME
 * and FINS were not re-recorded and are byte-for-byte what they were (SHA-256 ef4fa37e…c0 outline,
 * 6c2c6b2b…73 rails, 4c0d673a…d9 volume, a925ba15…62 fins); ROCKER went from 5c8698df…0d to
 * 175341c0…3e. The new PNG was rendered by the webpack dev server (`IS_WEBPACK_TEST=1`, port 3143)
 * in the 261006-qfm worktree on this Mac; if the orchestrator's Turbopack run from the main checkout
 * disagrees, it may re-record ROCKER once there, as the earlier entries say.
 *
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
    // The BLANK button streams in after the page (Phase 11): wait for it with the catalogue judged,
    // and for React to own it, so the picture is the screen a shaper sees once it has loaded — never
    // the "Loading blanks…" line, and never a hydration mismatch's red "1 Issue" badge from the
    // screenshot touching the page before the boundary hydrated (quick 261015-ve9: `openRocker`).
    await openRocker(page);
    await expect(page.locator("svg").first()).toBeVisible();
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
