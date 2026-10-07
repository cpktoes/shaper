import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * The browser proof for zooming a drawing (quick 261007-fnz, 2026-10-07), shown first on ROCKER's
 * side view. The founder's brief: the mouse wheel and a trackpad pinch zoom the drawing from 1x to
 * 10x in half steps toward the pointer, a phone pinches and pans, a drag pans once zoomed in, a
 * small control shows the level with zoom out, zoom in and reset, a double-click or a double-tap
 * goes back to 1x, lines and words keep their size on screen, a grid appears as the shaper zooms
 * in, and nothing is saved.
 *
 * What a shaper would see, test by test, is in each test's name. No blank name is typed here: the
 * tests pick "the first row under FITS THIS BOARD", exactly as `rocker-top-view.spec.ts` does.
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

function blankList(page: Page): Locator {
  return page.getByRole("list", { name: "Blanks" });
}

async function openRocker(page: Page) {
  await page.goto("/design/rocker");
  await expect(blankList(page)).toBeVisible({ timeout: 30_000 });
  // The list streams in server-rendered and becomes live only once React hydrates it.
  await page.waitForFunction(() => {
    const owned = (el: Element | null) => !!el && Object.keys(el).some((key) => key.startsWith("__reactFiber"));
    return (
      owned(document.querySelector('ul[aria-label="Blanks"] button')) &&
      owned(document.querySelector('input[aria-label="Search blanks"]'))
    );
  });
}

async function pickFirstFittingBlank(page: Page): Promise<string> {
  const row = blankList(page).locator('li[data-group="fits"] button').first();
  const name = (await row.locator("[data-blank-name]").innerText()).trim();
  expect(name.length).toBeGreaterThan(0);
  await row.click();
  await expect(page.locator("[data-picked-blank]")).toContainText(name);
  return name;
}

/** ROCKER's side view — the one drawing carrying the board's profile silhouette. */
function sideView(page: Page): Locator {
  return page.locator('svg:has([data-board-silhouette="profile"])');
}

function zoomLevel(page: Page): Locator {
  return page.locator("[data-viewer-zoom] [data-zoom-level]");
}

/**
 * The nose tip's measuring dot on the board's bottom: of the leftmost ink dots (nose-left; the
 * bottom and the deck share the nose tip's x), the lower one. Marked on first read so every later
 * read measures the very same dot.
 */
async function noseDotCentre(page: Page): Promise<{ x: number; y: number }> {
  return page.evaluate(() => {
    const centre = (el: Element) => {
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    };
    const marked = document.querySelector("[data-test-nose-dot]");
    if (marked) return centre(marked);
    const dots = [...document.querySelectorAll('[data-measuring-points] circle[fill="var(--outline-ink)"]')];
    let best: Element | null = null;
    for (const dot of dots) {
      if (!best) {
        best = dot;
        continue;
      }
      const c = centre(dot);
      const b = centre(best);
      if (c.x < b.x - 0.5 || (Math.abs(c.x - b.x) <= 0.5 && c.y > b.y)) best = dot;
    }
    if (!best) throw new Error("no measuring dots");
    best.setAttribute("data-test-nose-dot", "");
    return centre(best);
  });
}

async function pageStillness(page: Page) {
  return page.evaluate(() => ({ scrollY: window.scrollY, scale: window.visualViewport?.scale ?? 1 }));
}

test.describe("261007-fnz ROCKER zoom — computer", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "a mouse and its wheel");
  });

  test("tracer: the wheel zooms ROCKER toward the pointer", async ({ page }) => {
    await dismissChrome(page);
    await openRocker(page);
    await pickFirstFittingBlank(page);
    await page.getByRole("button", { name: "Show measuring points" }).click();
    const svg = sideView(page);
    const baseViewBox = await svg.getAttribute("viewBox");
    await expect(zoomLevel(page)).toHaveText("1x");
    const before = await pageStillness(page);

    const start = await noseDotCentre(page);
    // A mouse event's position is a whole pixel, so the pointer lands up to half a pixel off the
    // dot's centre; at 6x that half pixel is three. What the zoom holds still is the point under the
    // pointer, so the dot is expected where that point puts it: six times its 1x offset from it.
    const pointer = { x: Math.round(start.x), y: Math.round(start.y) };
    await page.mouse.move(pointer.x, pointer.y);
    for (let i = 0; i < 10; i++) {
      await page.waitForTimeout(200);
      await page.mouse.wheel(0, -100);
    }
    await expect(zoomLevel(page)).toHaveText("6x");
    await expect(svg).not.toHaveAttribute("viewBox", baseViewBox ?? "");

    const end = await noseDotCentre(page);
    const expected = { x: pointer.x + (start.x - pointer.x) * 6, y: pointer.y + (start.y - pointer.y) * 6 };
    expect(Math.hypot(end.x - expected.x, end.y - expected.y)).toBeLessThan(1.5);
    expect(await pageStillness(page)).toEqual(before);
  });
});
