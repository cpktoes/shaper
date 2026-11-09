import { expect, test, type Locator, type Page } from "@playwright/test";
import { BANNER_DISMISSAL_KEY } from "../lib/models/banner-dismissal";
import { TOOLBAR_TIP_DISMISSAL_KEY } from "../lib/models/toolbar-tip";
import { BOARD_PRESETS } from "../lib/geometry/presets";

/**
 * BOTTOM's tracer (Phase 17, plan 17-08): the one path a shaper takes through the eighth design screen, end to end, on
 * a real page. From TEMPLATE he opens BOTTOM from the top row, picks CENTER → Deep Single Concave on the Shortboard he
 * has open, and sees the cut everywhere it shows: its six rows on its starting numbers in the panel, its shade on the
 * bottom from above, the gauge reading at the stringer in the cross-section (the section moved to the cut's deepest),
 * and DATA's first line — whose `now` is the very litres figure VOLUME shows for the same board, and whose `Foam off`
 * is the printed `before` less the printed `now`. One Undo takes the whole pick back to Flat Center.
 *
 * Desktop only: the phone's own BOTTOM layout is 17-14's. No figure is typed here — every number is read off the page
 * and checked against another number on the page.
 */

const CUT = "Deep Single Concave";

async function dismissStrips(page: Page) {
  await page.addInitScript((key) => window.sessionStorage.setItem(key, "true"), BANNER_DISMISSAL_KEY);
  await page.addInitScript((key) => window.localStorage.setItem(key, "true"), TOOLBAR_TIP_DISMISSAL_KEY);
}

/** The desktop row's link to a screen (`nav:not([aria-label])` never matches the Back and Next landmark). */
function navLink(page: Page, label: string): Locator {
  return page.locator("nav:not([aria-label])").getByRole("link", { name: label, exact: true });
}

/** VOLUME's Estimated Volume figure (`29.61 L`), as `e2e/rails-advanced.spec.ts` reads it. */
function estimatedVolume(page: Page): Locator {
  return page.getByText("Estimated Volume", { exact: true }).first().locator("xpath=following-sibling::span[1]/span[1]");
}

/** DATA's first line, split into its three litres figures. */
async function litresLine(page: Page): Promise<{ foamOff: string; now: string; before: string }> {
  const text = (await page.locator("[data-bottom-litres]").textContent()) ?? "";
  const match = text.match(/^Foam off (\d+\.\d\d) L · (\d+\.\d\d) L now, (\d+\.\d\d) L before contours · /);
  expect(match, text).not.toBeNull();
  return { foamOff: match![1], now: match![2], before: match![3] };
}

test.describe("BOTTOM, the eighth design screen: pick a cut and see it", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the tracer runs on a computer; BOTTOM on a phone is 17-14's");
    await dismissStrips(page);
  });

  test("CENTER → Deep Single Concave: the panel's rows, the shade, the stringer gauge, DATA with VOLUME's litres, and one Undo", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const shortboard = BOARD_PRESETS.find((preset) => preset.id === "shortboard");
    if (!shortboard) throw new Error("no Shortboard preset");
    await page.goto("/");
    const card = page.getByRole("button").filter({ hasText: "Start Shaping" }).filter({ hasText: shortboard.name }).first();
    await expect(async () => {
      await card.click();
      await expect(page).toHaveURL(/\/design\/outline$/, { timeout: 3_000 });
    }).toPass({ timeout: 60_000 });

    // BOTTOM is third in the top row, between ROCKER and RAILS.
    const links = await page.locator("nav:not([aria-label]) a[href^='/design/']").evaluateAll((els) => els.map((el) => el.getAttribute("href")));
    expect(links.slice(0, 4)).toEqual(["/design/outline", "/design/rocker", "/design/bottom", "/design/rails"]);
    await navLink(page, "BOTTOM").click();
    await page.waitForURL("**/design/bottom");
    await expect(page).toHaveTitle("Bottom Contours — Shaper Assistant");
    const title = page.getByText("Bottom Contours", { exact: true });
    await expect(title).toBeVisible();
    await expect(title).toHaveCSS("text-transform", "uppercase");

    // Every section opens flat.
    const center = page.locator('[data-bottom-card="center"]');
    await expect(center.locator("[data-bottom-cut-echo]")).toHaveText("Flat Center");
    await expect(center.getByText("Nothing is cut in this section.")).toBeVisible();
    await expect(page.locator("[data-bottom-shade] path")).toHaveCount(0);

    // The pick. Retried until React owns the menu, so a click before hydration is never lost.
    const trigger = page.getByRole("combobox", { name: "Center Cut" });
    await expect(async () => {
      await trigger.click();
      await page.getByRole("option", { name: CUT, exact: true }).click({ timeout: 2_000 });
      await expect(center.locator("[data-bottom-cut-echo]")).toHaveText(CUT, { timeout: 2_000 });
    }).toPass({ timeout: 60_000 });

    // The panel: the cut's six rows, on its starting numbers.
    for (const row of ["Off Rail", "Start", "Deepest At", "End", "Depth", "Smoothness"]) {
      await expect(page.getByRole("slider", { name: `Center ${row}`, exact: true })).toBeVisible();
    }
    await expect(center.getByText("Nothing is cut in this section.")).toHaveCount(0);
    await expect(center.getByText(/^Start — .+ from the tail$/)).toBeVisible();

    // From above: the shade, one path per 1/32" level; across: the gap at the stringer, read where the cut is deepest.
    expect(await page.locator("[data-bottom-shade] path").count()).toBeGreaterThan(0);
    await expect(page.locator('[data-gauge="stringer"] text').first()).toBeVisible();
    await expect(page.locator('[data-gauge="stringer"] text').first()).toHaveText(/ at the stringer$/);
    await expect(page.locator("[data-bottom-top-view]")).toHaveAttribute("role", "img");
    await expect(page.locator("[data-bottom-section]")).toHaveAttribute("role", "img");

    // DATA: the first line adds up as printed, and its depths table has its rows.
    await page.getByRole("tab", { name: "DATA", exact: true }).click();
    const cut = await litresLine(page);
    expect(Math.round(Number(cut.before) * 100) - Math.round(Number(cut.now) * 100)).toBe(Math.round(Number(cut.foamOff) * 100));
    expect(Number(cut.foamOff)).toBeGreaterThan(0);
    await expect(page.locator("[data-bottom-depths] thead th")).toHaveText(["From the tail", "Width", "Deepest cut", "Rail lift", "Stringer left"]);
    await expect(page.locator('[data-bottom-depths] [data-bottom-row="tail"] th')).toHaveText("Tail");
    await expect(page.locator('[data-bottom-depths] [data-bottom-row="nose"] th')).toHaveText("Nose tip");

    // `now` is VOLUME's own figure for the same board.
    await navLink(page, "VOLUME").click();
    await page.waitForURL("**/design/volume");
    await expect(estimatedVolume(page)).toHaveText(`${cut.now} L`);

    // Back on BOTTOM, one Undo takes the pick back.
    await navLink(page, "BOTTOM").click();
    await page.waitForURL("**/design/bottom");
    await expect(center.locator("[data-bottom-cut-echo]")).toHaveText(CUT);
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await expect(center.locator("[data-bottom-cut-echo]")).toHaveText("Flat Center");
    await expect(center.getByText("Nothing is cut in this section.")).toBeVisible();
    await expect(page.locator("[data-bottom-shade] path")).toHaveCount(0);
    await page.getByRole("tab", { name: "DATA", exact: true }).click();
    const flat = await litresLine(page);
    expect(flat.foamOff).toBe("0.00");
    expect(flat.now).toBe(cut.before);
  });

  test("the drawings carry no board name of their own markup: names are React text, never raw HTML (T-17-10)", async ({ page }) => {
    await page.goto("/design/bottom");
    await expect(page.locator("[data-bottom-top-view]")).toHaveAttribute("aria-label", /^The bottom of .+ from below, with the contours shaded$/);
  });
});
