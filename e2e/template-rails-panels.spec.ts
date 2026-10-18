import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * Browser proof for quick 261017-vdh plan 01 — the founder's copy-edit canvas, 2026-10-17:
 *
 *   - TEMPLATE's wording: the shorter subtitle, no Settings block (its two tick boxes became the
 *     drawing's toolbar buttons, quick 261018-e6w), and the drawing's `Hide drag points` button.
 *   - RAILS' INPUTS section (one tick box importing ROCKER's thicknesses, with its one line) and the
 *     View tick box on each rail, on a computer and on an upright phone.
 *
 * The sign-in banner and the toolbar tip are dismissed before navigation, as in the sibling specs,
 * so neither shifts anything under a click.
 */

const BANNER_DISMISSAL_KEY = "shaper-sign-in-banner-dismissed";
const TOOLBAR_TIP_DISMISSAL_KEY = "shaper-toolbar-tip-dismissed";

async function dismissChrome(page: Page) {
  await page.addInitScript((key) => {
    window.sessionStorage.setItem(key, "true");
  }, BANNER_DISMISSAL_KEY);
  await page.addInitScript((key) => {
    window.localStorage.setItem(key, "true");
  }, TOOLBAR_TIP_DISMISSAL_KEY);
}

test.describe("TEMPLATE — the side panel's new wording", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the computer layout's sidebar");
    await dismissChrome(page);
    await page.goto("/design/outline");
  });

  test("the subtitle is shorter and the sidebar has no Settings block", async ({ page }) => {
    const aside = page.locator("aside");
    await expect(aside.getByText("Design and print full sized templates", { exact: true })).toBeVisible();
    // Quick 261018-e6w: the two tick boxes and their heading are gone — the drawing's toolbar
    // buttons do the job. "Settings" as a heading is matched as the exact text, so the top bar's
    // "App Default Settings" never counts.
    await expect(aside.getByRole("checkbox", { name: "Show Drag Points" })).toHaveCount(0);
    await expect(aside.getByRole("checkbox", { name: "Show fin placement" })).toHaveCount(0);
    await expect(aside.getByText("Settings", { exact: true })).toHaveCount(0);
    await expect(aside.getByText("marks only")).toHaveCount(0);
    await expect(aside.getByText("Construction Lines")).toHaveCount(0);
  });

  test("the drawing's button reads Hide drag points from the start, then Show drag points once pressed", async ({
    page,
  }) => {
    // Quick 261018-e6w (the founder, 2026-10-18): the drag points start on, so the button starts shaded.
    const hide = page.getByRole("button", { name: "Hide drag points" });
    await expect(hide).toBeVisible();
    await expect(hide).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("[data-drag-target]").first()).toBeVisible();
    await hide.click();
    const show = page.getByRole("button", { name: "Show drag points" });
    await expect(show).toBeVisible();
    await expect(show).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator("[data-drag-target]")).toHaveCount(0);
    await show.click();
    await expect(page.getByRole("button", { name: "Hide drag points" })).toHaveAttribute("aria-pressed", "true");
  });
});

// ---------------------------------------------------------------------------------------------
// RAILS — an INPUTS section, one tick box that imports ROCKER's thicknesses, and a View box on each
// rail (BRIEF 2a-2c). The default board's thicknesses (foil nose 12" 1.31", centre 2.5", tail 12"
// 1.56") were measured with the real formatters when the plan was written.
// ---------------------------------------------------------------------------------------------

const IMPERIAL_LINE = `Thickness details are imported: 1 5/16" nose @ 12" · 2 1/2" center · 1 9/16" tail @ 12"`;
const METRIC_LINE = "Thickness details are imported: 33 mm nose @ 30.5 cm · 64 mm center · 40 mm tail @ 30.5 cm";

type Rail = "nose" | "center" | "tail";
const group = (page: Page, rail: Rail) => page.locator(`aside [data-rail-group="${rail}"]`);
const viewBox = (page: Page, rail: Rail) =>
  page.locator("aside").getByRole("checkbox", { name: `View ${rail[0].toUpperCase()}${rail.slice(1)} Rail` });

/** Sets a tick box and waits for it to read the new state, so a tap that landed before React owned
 * the box can never pass silently. */
async function setChecked(box: Locator, checked: boolean) {
  if ((await box.getAttribute("aria-checked")) === String(checked)) return;
  await box.click();
  await expect(box).toHaveAttribute("aria-checked", String(checked));
}

test.describe("RAILS on a computer — Inputs, the import line and the View boxes", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the computer layout's sidebar");
    await dismissChrome(page);
  });

  test("the subtitle, the Inputs heading and the import box with its line, and no thickness sliders", async ({
    page,
  }) => {
    await page.goto("/design/rails");
    const aside = page.locator("aside");
    await expect(aside.getByText("Design and shape consistent rails", { exact: true })).toBeVisible();
    await expect(aside.getByText("Inputs", { exact: true })).toBeVisible();
    const importBox = aside.getByRole("checkbox", { name: "Import Rocker & Foil Values" });
    await expect(importBox).toBeVisible();
    await expect(importBox).toHaveAttribute("aria-checked", "true");
    await expect(aside.getByText(IMPERIAL_LINE, { exact: true })).toBeVisible();
    // The two old help sentences and the old box's wording are gone.
    await expect(aside.getByText(/Thickness comes from the ROCKER screen/)).toHaveCount(0);
    await expect(aside.getByText(/You're typing your own thickness/)).toHaveCount(0);
    await expect(aside.getByText("Use Board's Rocker & Foil Thickness")).toHaveCount(0);
    // Hidden, not greyed: no thickness row at all while the import is on.
    await expect(aside.getByText(/^Thickness @12" — /)).toHaveCount(0);
    await expect(aside.getByText(/^Board Thickness — /)).toHaveCount(0);
  });

  test("unticking the import brings back each rail's own thickness slider and drops the line; ticking again undoes it", async ({
    page,
  }) => {
    await page.goto("/design/rails");
    const aside = page.locator("aside");
    const importBox = aside.getByRole("checkbox", { name: "Import Rocker & Foil Values" });
    await setChecked(importBox, false);
    await expect(aside.getByText(IMPERIAL_LINE, { exact: true })).toHaveCount(0);
    // The toggle is a plain flip: RAILS' own stored thicknesses show, nothing was copied.
    await expect(group(page, "nose").getByText(`Thickness @12" — 1 5/16"`, { exact: true })).toBeVisible();
    await expect(group(page, "center").getByText(`Board Thickness — 2 1/2"`, { exact: true })).toBeVisible();
    await expect(group(page, "tail").getByText(`Thickness @12" — 1 9/16"`, { exact: true })).toBeVisible();

    await setChecked(importBox, true);
    await expect(aside.getByText(IMPERIAL_LINE, { exact: true })).toBeVisible();
    await expect(aside.getByText(/^(Thickness @12"|Board Thickness) — /)).toHaveCount(0);
  });

  test("Metric reads the same line in whole millimetres, the station in centimetres", async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem("shaper-units", "metric"));
    await page.goto("/design/rails");
    await expect(page.locator("aside").getByText(METRIC_LINE, { exact: true })).toBeVisible();
  });

  test("each rail has a View box, ticked; unticking Center takes its controls, its plot and its DATA column away", async ({
    page,
  }) => {
    await page.goto("/design/rails");
    for (const rail of ["nose", "center", "tail"] as const) {
      await expect(viewBox(page, rail)).toBeVisible();
      await expect(viewBox(page, rail)).toHaveAttribute("aria-checked", "true");
    }
    // The old heading arrow is gone; only each rail's Advanced fold keeps one.
    await expect(page.locator("aside").getByRole("button", { name: /^(Nose|Center|Tail) Rail/ })).toHaveCount(0);

    const plotTitles = page.locator('[data-rail-plot-row="desktop"] .font-extrabold');
    await expect(plotTitles).toHaveText(["Nose", "Center", "Tail"]);

    await setChecked(viewBox(page, "center"), false);
    await expect(group(page, "center").getByRole("slider")).toHaveCount(0);
    await expect(group(page, "nose").getByRole("slider").first()).toBeVisible();
    await expect(plotTitles).toHaveText(["Nose", "Tail"]);

    await page.getByRole("tab", { name: "DATA", exact: true }).click();
    const dataColumns = page.locator("div.text-right.font-extrabold");
    await expect(dataColumns.filter({ hasText: /^Nose/ })).not.toHaveCount(0);
    await expect(dataColumns.filter({ hasText: /^Center/ })).toHaveCount(0);

    await page.getByRole("tab", { name: "VIEWER", exact: true }).click();
    await setChecked(viewBox(page, "center"), true);
    await expect(plotTitles).toHaveText(["Nose", "Center", "Tail"]);
    await expect(group(page, "center").getByRole("slider").first()).toBeVisible();
  });
});

test.describe("RAILS on an upright phone — the switch still picks the rail, and the picked rail has no View box", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "upright-phone assertions");
    await dismissChrome(page);
    await page.goto("/design/rails");
  });

  test("VIEWER: the picked rail shows its controls and no View box; DATA: all three View boxes; an unticked rail stays in view on VIEWER", async ({
    page,
  }) => {
    const aside = page.locator("aside");
    // Wait for the finished screen before reading anything.
    await expect(aside.getByText("Rail Band Calculator", { exact: true })).toBeVisible();
    await expect(group(page, "nose").getByRole("slider").first()).toBeVisible();
    await expect(viewBox(page, "nose")).toBeHidden();
    await expect(viewBox(page, "center")).toHaveCount(0);
    await expect(viewBox(page, "tail")).toHaveCount(0);

    const pageTabs = page.getByRole("tablist").filter({ hasText: "DATA" });
    await pageTabs.getByRole("tab", { name: "DATA" }).click();
    for (const rail of ["nose", "center", "tail"] as const) {
      await expect(viewBox(page, rail)).toBeVisible();
    }
    await setChecked(viewBox(page, "nose"), false);

    await pageTabs.getByRole("tab", { name: "VIEWER" }).click();
    const switchTabs = page.getByRole("tablist").filter({ hasText: "NOSE" });
    await expect(switchTabs.getByRole("tab", { name: "NOSE" })).toHaveAttribute("aria-selected", "true");
    await expect(group(page, "nose").getByRole("slider").first()).toBeVisible();
    await expect(viewBox(page, "nose")).toBeHidden();
  });
});
