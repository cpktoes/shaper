import { expect, test, type Page } from "@playwright/test";
import { BOARD_FILE_COPY } from "../components/setup/board-file-copy";
import { brdFile } from "../lib/export/brd";
import { buildBoardSurface } from "../lib/geometry/board-surface";
import { buildOutline } from "../lib/geometry/outline";
import { designCrossSectionInput, designSideProfile, deriveEffectiveRails, LIVE_DESIGN_RULES } from "../lib/geometry/design";
import { phase16Boards } from "../lib/geometry/__fixtures__/phase16-boards";
import { BANNER_DISMISSAL_KEY } from "../lib/models/banner-dismissal";
import { TOOLBAR_TIP_DISMISSAL_KEY } from "../lib/models/toolbar-tip";
import { freshPracticeRack } from "./helpers/practice-rack";

/**
 * The home page stays light (quick 261114-118, the go-live review's WR-04). The `.brd` preview dialog and the whole fitting
 * library (the closest-fit maths, the bottom, rails, fins and wings fits, the preview's words) must reach the browser only
 * once a shaper picks a `.brd`, never for everybody who opens the home page.
 *
 * It watches every script the browser fetches (the page's own and the background worker's) and looks for text that only
 * those modules carry. On this dev server (Turbopack) every module sits in its chunk under its own source path, so the
 * source path of the fitting maths is one mark; the preview's own words and the dialog's own marker survive in a built
 * script too, so they are the other two. A prod-build twin of this is not needed to hold the rule: a chunk is fetched
 * on the dev server only when something imports it.
 */

const MARKS = {
  fittingLibrary: "lib/geometry/brd-fit.ts",
  previewWords: "Board file — our closest fit",
  dialog: "data-brd-fit-close",
} as const;

/** Every mark found so far, in the script that held it. */
function watchScripts(page: Page) {
  const found: { mark: keyof typeof MARKS; url: string }[] = [];
  const seen = new Set<string>();
  page.context().on("response", async (response) => {
    const type = response.headers()["content-type"] ?? "";
    if (!type.includes("javascript")) return;
    const url = response.url();
    seen.add(url);
    const body = await response.text().catch(() => "");
    for (const [mark, text] of Object.entries(MARKS)) if (body.includes(text)) found.push({ mark: mark as keyof typeof MARKS, url });
  });
  return { found, seen };
}

test.describe("the home page's weight", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(
      ([bannerKey, tipKey]) => {
        window.sessionStorage.setItem(bannerKey, "true");
        window.localStorage.setItem(tipKey, "true");
      },
      [BANNER_DISMISSAL_KEY, TOOLBAR_TIP_DISMISSAL_KEY] as const,
    );
    await freshPracticeRack(page);
  });

  test("w1: the fitting code and the preview dialog are not fetched until a .brd is picked", async ({ page }) => {
    test.setTimeout(120_000);
    const { found, seen } = watchScripts(page);
    await page.goto("/");
    const button = page.getByRole("button", { name: BOARD_FILE_COPY.button });
    await expect(button).toBeVisible();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1_500);
    expect(seen.size, "the page loaded scripts, so the watch is working").toBeGreaterThan(3);
    expect(found, "nothing of the fitting code or the dialog before a pick").toEqual([]);

    // A .brd the app's own writer made from the first fixture board (never anyone's file).
    const { fields } = phase16Boards()[0];
    const geometry = buildOutline(fields.outline);
    const profile = designSideProfile(fields, LIVE_DESIGN_RULES);
    const rails = deriveEffectiveRails(fields.rails, profile.effectiveFoil, fields.railsImportFoilThickness);
    const surface = buildBoardSurface({
      sections: designCrossSectionInput(geometry, profile, rails, fields.outline.length),
      geometry,
      rockerAt: profile.rockerAt,
    });
    const file = Buffer.from(brdFile(surface, "Weight").data);

    const [chooser] = await Promise.all([page.waitForEvent("filechooser"), button.click()]);
    await chooser.setFiles({ name: "weight.brd", mimeType: "application/octet-stream", buffer: file });
    await expect(page.locator("[data-brd-fit]")).toBeVisible({ timeout: 60_000 });

    for (const f of found) test.info().annotations.push({ type: "after the pick", description: `${f.mark}: ${f.url}` });
    const marks = new Set(found.map((f) => f.mark));
    expect(marks, "after a pick the preview dialog and the fitting code arrive").toEqual(new Set(["fittingLibrary", "previewWords", "dialog"]));
  });
});
