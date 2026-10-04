import { devices, expect, test, type Page } from "@playwright/test";
import { BANNER_DISMISSAL_KEY } from "../lib/models/banner-dismissal";
import { TOOLBAR_TIP_DISMISSAL_KEY } from "../lib/models/toolbar-tip";

/**
 * Quick 261003-q2c: every design screen's controls end with a Back and a Next button, so a shaper
 * walks a board TEMPLATE, ROCKER, RAILS, VOLUME, FINS, SUMMARY without opening a menu (the founder's
 * "almost wizard like", sketch 008's pick B). TEMPLATE has only Next, SUMMARY only Back.
 *
 * The six screens are hand-written here the way every phone spec in this suite does it: importing
 * `components/site-nav.tsx` would pull the database client into Playwright's own Node process.
 */
const SCREENS = [
  { href: "/design/outline", label: "TEMPLATE", word: "Template" },
  { href: "/design/rocker", label: "ROCKER", word: "Rocker" },
  { href: "/design/rails", label: "RAILS", word: "Rails" },
  { href: "/design/volume", label: "VOLUME", word: "Volume" },
  { href: "/design/fins", label: "FINS", word: "Fins" },
  { href: "/design/summary", label: "SUMMARY", word: "Summary" },
] as const;

async function dismissBanners(page: Page) {
  await page.addInitScript((key) => window.sessionStorage.setItem(key, "true"), BANNER_DISMISSAL_KEY);
  await page.addInitScript((key) => window.localStorage.setItem(key, "true"), TOOLBAR_TIP_DISMISSAL_KEY);
}

/** From the setup screen, start the first preset (it carries its own blank, so ROCKER shows both
 * Thinning Starts rows). The Start Shaping click is retried until the outline URL shows, because a
 * click before hydration does nothing. */
async function startTheFirstPreset(page: Page) {
  await page.goto("/");
  const start = page.getByRole("button").filter({ hasText: "Start Shaping" }).first();
  await expect(async () => {
    await start.click();
    await page.waitForURL("**/design/outline", { timeout: 2_000 });
  }).toPass({ timeout: 20_000 });
}

function stepNav(page: Page) {
  return page.getByRole("navigation", { name: "Back and Next", exact: true });
}

/** `dispatchEvent("click")`, not `.click()`: under `next dev`, Next's own corner badge
 * (`<nextjs-portal>`, bottom-left) can sit over a link and swallow a real mouse click — see
 * e2e/phone-trip.spec.ts. The move is still a real client-side link navigation. */
async function followStep(page: Page, direction: "previous" | "next", toHref: string) {
  await stepNav(page).locator(`a[data-step="${direction}"]`).dispatchEvent("click");
  await page.waitForURL(`**${toHref}`);
}

test.describe("Back and Next end every design screen's controls", () => {
  // (The walk, the sizes, print, wide view and the phone clearance are further down.)
  test.beforeEach(async ({ page }) => {
    await dismissBanners(page);
  });

  test("TEMPLATE's Next goes to ROCKER and ROCKER's Back comes home", async ({ page }) => {
    await startTheFirstPreset(page);

    // TEMPLATE is the first screen: Next only, reading "Rocker".
    await expect(stepNav(page).getByRole("link")).toHaveCount(1);
    const next = stepNav(page).getByRole("link", { name: "Next screen: Rocker", exact: true });
    await expect(next).toHaveText("Rocker");
    await expect(stepNav(page).getByRole("link", { name: /^Previous screen: / })).toHaveCount(0);

    await followStep(page, "next", "/design/rocker");

    // ROCKER has both: Back reading "Template", Next reading "Rails".
    await expect(stepNav(page).getByRole("link", { name: "Previous screen: Template", exact: true })).toHaveText(
      "Template",
    );
    await expect(stepNav(page).getByRole("link", { name: "Next screen: Rails", exact: true })).toHaveText("Rails");

    await followStep(page, "previous", "/design/outline");
    await expect(stepNav(page).getByRole("link", { name: "Next screen: Rocker", exact: true })).toBeVisible();
  });
});

/** Checks the pair at screen `index` of the walk: the right words, and only the buttons that screen
 * should have (TEMPLATE has no Back, SUMMARY has no Next). */
async function expectTheRightPair(page: Page, index: number) {
  const before = SCREENS[index - 1];
  const after = SCREENS[index + 1];
  const nav = stepNav(page);
  await expect(nav.getByRole("link")).toHaveCount((before ? 1 : 0) + (after ? 1 : 0));
  if (before) {
    await expect(nav.getByRole("link", { name: `Previous screen: ${before.word}`, exact: true })).toHaveText(before.word);
  } else {
    await expect(nav.getByRole("link", { name: /^Previous screen: / })).toHaveCount(0);
  }
  if (after) {
    await expect(nav.getByRole("link", { name: `Next screen: ${after.word}`, exact: true })).toHaveText(after.word);
  } else {
    await expect(nav.getByRole("link", { name: /^Next screen: / })).toHaveCount(0);
  }
}

/** Sets the Nose Thinning Start by hand (ArrowRight on its slider) and returns the label's new text. */
async function setNoseStartByHand(page: Page): Promise<string> {
  const label = page.getByText(/^Nose Thinning Starts — /);
  const before = await label.innerText();
  const slider = page.getByRole("slider", { name: "Nose Thinning Starts", exact: true });
  await slider.focus();
  await page.keyboard.press("ArrowRight");
  await expect(label).not.toHaveText(before);
  return label.innerText();
}

/** The whole walk: Next from TEMPLATE to SUMMARY, then Back to TEMPLATE, checking the pair at every
 * stop. A Nose Thinning Start set by hand on ROCKER on the way out must read the same on the way
 * back — proof that every move is client-side and the unsaved board survives. */
async function walkOutAndBack(page: Page) {
  await startTheFirstPreset(page);
  await expectTheRightPair(page, 0);

  let noseStart = "";
  for (let i = 1; i < SCREENS.length; i += 1) {
    await followStep(page, "next", SCREENS[i].href);
    await expectTheRightPair(page, i);
    if (SCREENS[i].label === "ROCKER") noseStart = await setNoseStartByHand(page);
  }

  for (let i = SCREENS.length - 2; i >= 0; i -= 1) {
    await followStep(page, "previous", SCREENS[i].href);
    await expectTheRightPair(page, i);
    if (SCREENS[i].label === "ROCKER") {
      await expect(page.getByText(/^Nose Thinning Starts — /)).toHaveText(noseStart);
    }
  }
}

test.describe("Back and Next walk the whole board", () => {
  test.beforeEach(async ({ page }) => {
    await dismissBanners(page);
  });

  test("Next walks TEMPLATE to SUMMARY and Back walks home again, keeping a hand-set Thinning Start", async ({
    page,
  }) => {
    await walkOutAndBack(page);
  });

  test("both buttons are a finger's 44 dots tall on a phone and the normal 32 with a mouse", async ({
    page,
  }, testInfo) => {
    await page.goto("/design/rocker");
    const expected = testInfo.project.name === "desktop" ? 32 : 44;
    for (const name of ["Previous screen: Template", "Next screen: Rails"]) {
      const box = await stepNav(page).getByRole("link", { name, exact: true }).boundingBox();
      if (!box) throw new Error(`${name} has no bounding box`);
      expect(box.height, `${name} height`).toBeCloseTo(expected, 0);
    }
  });

  test("on each of the five design screens the pair sits below the last of the screen's own controls", async ({
    page,
  }) => {
    for (const screen of SCREENS.slice(0, 5)) {
      await page.goto(screen.href);
      await expect(stepNav(page), screen.label).toBeVisible();
      // Every in-flow box inside the sidebar except the pair itself: none may reach down past the
      // pair's top edge. (A control column that is as tall as its scrolling box would let the rest of
      // the controls spill out underneath the pair — found on FINS and VOLUME.)
      const overlap = await page.evaluate(() => {
        const nav = document.querySelector<HTMLElement>("[data-step-nav]");
        const aside = nav?.closest("aside");
        if (!nav || !aside) return Number.NaN;
        const navTop = nav.getBoundingClientRect().top;
        let lowest = -Infinity;
        for (const el of Array.from(aside.querySelectorAll<HTMLElement>("*"))) {
          if (nav.contains(el)) continue;
          const style = getComputedStyle(el);
          if (style.position === "absolute" || style.position === "fixed") continue;
          const box = el.getBoundingClientRect();
          if (box.width === 0 || box.height === 0) continue;
          lowest = Math.max(lowest, box.bottom);
        }
        return lowest - navTop;
      });
      expect(overlap, `${screen.label}: how far the screen's controls reach below the top of the pair`).toBeLessThanOrEqual(
        0.5,
      );
    }
  });

  test("the buttons never reach paper, on ROCKER or on SUMMARY", async ({ page }) => {
    for (const href of ["/design/rocker", "/design/summary"]) {
      await page.goto(href);
      await expect(stepNav(page)).toBeVisible();
      await page.emulateMedia({ media: "print" });
      await expect(stepNav(page), `${href} printed`).toBeHidden();
      await page.emulateMedia({ media: "screen" });
      await expect(stepNav(page), `${href} on screen`).toBeVisible();
    }
  });

  // One address per test: a second `goto` straight after a page that is still settling gets
  // interrupted by that page's own navigation.
  test("the home page has no Back or Next", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button").filter({ hasText: "Start Shaping" }).first()).toBeVisible();
    await expect(page.locator("[data-step-nav]")).toHaveCount(0);
  });

  test("the Contact page has no Back or Next", async ({ page }) => {
    await page.goto("/contact");
    await expect(page.getByRole("heading").first()).toBeVisible();
    await expect(page.locator("[data-step-nav]")).toHaveCount(0);
  });

  test("on a computer, hiding the sidebar for a wider view hides the buttons with it", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the wide-view button is a computer's");
    await page.goto("/design/outline");
    await expect(stepNav(page)).toBeVisible();
    await page.getByRole("button", { name: "Hide the sidebar for a wider view" }).click();
    await expect(stepNav(page)).toBeHidden();
    await page.getByRole("button", { name: "Show the sidebar" }).click();
    await expect(stepNav(page)).toBeVisible();
  });
});

// Dropping `defaultBrowserType` matches e2e/phone-sideways-top-bar.spec.ts: it cannot be set via
// `test.use` inside a describe, and the android project this describe is pinned to is Chromium anyway.
const { defaultBrowserType: pixel7LandscapeBrowserType, ...pixel7LandscapeViewport } = devices["Pixel 7 landscape"];
void pixel7LandscapeBrowserType;

test.describe("Back and Next on a Pixel 7 held sideways (863x360, the desktop shell)", () => {
  test.use({ ...pixel7LandscapeViewport });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "android", "this describe supplies its own device (Pixel 7 landscape)");
    await dismissBanners(page);
  });

  test("Next walks TEMPLATE to SUMMARY and Back walks home again", async ({ page }) => {
    await walkOutAndBack(page);
  });
});

/** What a thumb does to reach the end of a screen: every scrolling box, and the page, to its end. */
async function scrollEverythingToItsEnd(page: Page) {
  await page.evaluate(() => {
    for (const el of Array.from(document.querySelectorAll<HTMLElement>("*"))) {
      const overflowY = getComputedStyle(el).overflowY;
      if ((overflowY === "auto" || overflowY === "scroll") && el.scrollHeight > el.clientHeight + 1) {
        el.scrollTop = el.scrollHeight;
      }
    }
    window.scrollTo(0, document.documentElement.scrollHeight);
  });
}

test.describe("on an upright phone, the buttons scroll clear of the floating Undo/Redo pair", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name === "desktop",
      "on a computer the pair floats over the drawing's corner, never over the controls",
    );
    await dismissBanners(page);
  });

  test("VOLUME's Next and SUMMARY's Back end above the pair and take a tap at their centre", async ({ page }) => {
    await startTheFirstPreset(page);
    // One small change on TEMPLATE, so there is something to take back and the pair is showing.
    const slider = page.getByRole("slider").filter({ visible: true }).first();
    await slider.focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("button", { name: "Undo", exact: true })).toBeVisible();

    // Only the two screens whose whole page scrolls (VOLUME and SUMMARY). On the other four the
    // controls scroll in a window under the pinned drawing that is only about 57 dots tall at
    // 390x664 on this dev server, so scrolled to its end the pair is simply out of that window;
    // the production-build spec (e2e/prod/phone-controls-clear-undo.spec.ts) covers those.
    const stops = [
      { screen: 3, direction: "next" },
      { screen: 5, direction: "previous" },
    ] as const;
    let here = 0;
    for (const stop of stops) {
      // Walk on, one screen at a time, to the stop.
      while (here < stop.screen) {
        here += 1;
        await followStep(page, "next", SCREENS[here].href);
      }
      await scrollEverythingToItsEnd(page);

      const link = stepNav(page).locator(`a[data-step="${stop.direction}"]`);
      const box = await link.boundingBox();
      const undo = await page.getByRole("button", { name: "Undo", exact: true }).boundingBox();
      if (!box || !undo) throw new Error("the step link or the Undo button is missing a bounding box");
      const label = SCREENS[stop.screen].label;
      console.log(
        `[q2c] ${label}: daylight between the ${stop.direction} button and the pair = ${undo.y - (box.y + box.height)}`,
      );
      expect(box.y + box.height, `${label}: the button's bottom edge is above the pair's top edge`).toBeLessThan(
        undo.y,
      );

      const takesTheTap = await link.evaluate((el) => {
        const rect = el.getBoundingClientRect();
        const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
        return !!hit && (hit === el || el.contains(hit));
      });
      expect(takesTheTap, `${label}: a tap at the button's centre lands on the button`).toBe(true);
    }
  });
});
