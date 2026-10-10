import { expect, test, type Page } from "@playwright/test";

/**
 * The founder's logo in every top bar (quick 261010-km7): its ink in all four themes, its size and
 * its room on a computer and on the two phones, upright and held sideways.
 *
 * The numbers come from the plan's measurements (D-07, D-14) and from a "before" run taken the same
 * day, before any code changed: the computer row stood 89 dots tall at 820 wide (the name wrapped
 * onto two lines there) and 81 at 1023, 1024 and 1280; 93 with a touch pointer at 1024 x 640; and
 * the Menu button stood 44 x 44 with its top at 1.5 and its left edge at the window's width less 60,
 * at every phone size below. None of those may move or grow.
 */

const BANNER_DISMISSAL_KEY = "shaper-sign-in-banner-dismissed";
const TOOLBAR_TIP_DISMISSAL_KEY = "shaper-toolbar-tip-dismissed";
const THEME_STORAGE_KEY = "shaper-theme";

const INK = {
  daylight: "rgb(31, 42, 59)",
  chalk: "rgb(31, 42, 59)",
  slate: "rgb(242, 244, 247)",
  phosphor: "rgb(38, 208, 38)",
} as const;

/** Dismisses the two strips that would otherwise sit above the bar, and picks the theme, all
 * before the page loads. */
async function prepare(page: Page, theme: keyof typeof INK = "daylight") {
  await page.addInitScript(
    ([bannerKey, tipKey, themeKey, themeId]) => {
      window.sessionStorage.setItem(bannerKey, "true");
      window.localStorage.setItem(tipKey, "true");
      window.localStorage.setItem(themeKey, themeId);
    },
    [BANNER_DISMISSAL_KEY, TOOLBAR_TIP_DISMISSAL_KEY, THEME_STORAGE_KEY, theme],
  );
}

/** The logo inside the bar that is actually drawing: the computer row, or the phone's banner. */
function logoIn(page: Page, phone: boolean) {
  const scope = phone ? page.getByRole("banner") : page.locator("nav:not([aria-label])");
  return scope.getByRole("img", { name: "Shaper Assistant", exact: true });
}

async function boxOf(locator: ReturnType<typeof logoIn>) {
  const box = await locator.boundingBox();
  if (!box) throw new Error("the logo has no bounding box");
  return box;
}

function near(actual: number, expected: number, tolerance = 0.5) {
  expect(Math.abs(actual - expected), `${actual} should be within ${tolerance} of ${expected}`).toBeLessThanOrEqual(
    tolerance,
  );
}

test.describe("the logo is drawn in each theme's own ink", () => {
  for (const theme of Object.keys(INK) as (keyof typeof INK)[]) {
    test(`${theme}: ${INK[theme]}`, async ({ page }, testInfo) => {
      const phone = testInfo.project.name !== "desktop";
      await prepare(page, theme);
      await page.goto("/design/outline");
      const logo = logoIn(page, phone);
      await expect(logo).toBeVisible();
      const color = await logo.evaluate((el) => getComputedStyle(el).color);
      expect(color).toBe(INK[theme]);
      // The shape itself paints with that colour, not with one of its own.
      const fill = await logo.locator("path").evaluate((el) => getComputedStyle(el).fill);
      expect(fill).toBe(INK[theme]);
    });
  }
});

test.describe("on a computer the logo takes the room the name took (mouse)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "mouse-driven computer row");
    await prepare(page);
  });

  test("1280 x 800: 175.4 by 21.8, and the row is no taller than before (81)", async ({ page }) => {
    await page.goto("/design/outline");
    const box = await boxOf(logoIn(page, false));
    near(box.width, 175.4);
    near(box.height, 21.8);
    const row = await page.locator("nav:not([aria-label])").boundingBox();
    console.log(`[wordmark] 1280: logo ${box.width.toFixed(2)} x ${box.height.toFixed(2)}, row ${row?.height}`);
    expect(row!.height).toBeLessThanOrEqual(81);
  });

  for (const width of [1023, 1024]) {
    test(`${width} x 800: the same full size, row no taller than 81`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/design/outline");
      const box = await boxOf(logoIn(page, false));
      near(box.width, 175.4);
      near(box.height, 21.8);
      const row = await page.locator("nav:not([aria-label])").boundingBox();
      expect(row!.height).toBeLessThanOrEqual(81);
    });
  }

  test("820 x 800: it shrinks instead of wrapping, between 100 and 175.4 wide, and the row is no taller than 89", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 820, height: 800 });
    await page.goto("/design/outline");
    const box = await boxOf(logoIn(page, false));
    const row = await page.locator("nav:not([aria-label])").boundingBox();
    console.log(`[wordmark] 820: logo ${box.width.toFixed(2)} x ${box.height.toFixed(2)}, row ${row?.height}`);
    expect(box.width).toBeGreaterThanOrEqual(100);
    expect(box.width).toBeLessThanOrEqual(175.4 + 0.5);
    expect(row!.height).toBeLessThanOrEqual(89);
    expect(await page.evaluate(() => document.scrollingElement?.scrollWidth ?? 0)).toBe(820);
  });

  test("it is the link home on a design screen", async ({ page }) => {
    await page.goto("/design/outline");
    const link = page.locator("nav:not([aria-label])").getByRole("link", { name: "Shaper Assistant", exact: true });
    await expect(link).toHaveAttribute("href", "/");
  });
});

test.describe("on a computer with a touch pointer the row is no taller than before", () => {
  test.use({ hasTouch: true });

  test("1024 x 640 with touch: full size logo, row no taller than 93", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Chromium with a touch pointer on the desktop project");
    await prepare(page);
    await page.setViewportSize({ width: 1024, height: 640 });
    await page.goto("/design/outline");
    const box = await boxOf(logoIn(page, false));
    near(box.width, 175.4);
    const row = await page.locator("nav:not([aria-label])").boundingBox();
    console.log(`[wordmark] 1024x640 touch: logo ${box.width.toFixed(2)}, row ${row?.height}`);
    expect(row!.height).toBeLessThanOrEqual(93);
  });
});

test.describe("on a phone the logo grows into the bar's spare room (D-14)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "phone-only compact bar");
    await prepare(page);
  });

  const SIZES: { width: number; height: number; logoWidth: number; logoHeight: number }[] = [
    { width: 360, height: 740, logoWidth: 159.0, logoHeight: 19.7 },
    { width: 375, height: 667, logoWidth: 174.0, logoHeight: 21.6 },
    { width: 390, height: 844, logoWidth: 175.4, logoHeight: 21.8 },
    { width: 412, height: 915, logoWidth: 175.4, logoHeight: 21.8 },
    { width: 844, height: 390, logoWidth: 175.4, logoHeight: 21.8 },
    { width: 863, height: 360, logoWidth: 175.4, logoHeight: 21.8 },
  ];

  for (const size of SIZES) {
    test(`${size.width} x ${size.height}: ${size.logoWidth} by ${size.logoHeight}, inside the 48-dot bar`, async ({ page }) => {
      await page.setViewportSize({ width: size.width, height: size.height });
      await page.goto("/design/outline");
      const banner = page.getByRole("banner");
      const logo = logoIn(page, true);
      await expect(logo).toBeVisible();
      const box = await boxOf(logo);
      near(box.width, size.logoWidth);
      near(box.height, size.logoHeight);
      const bar = await banner.boundingBox();
      near(bar!.height, 48, 1);
      expect(box.y).toBeGreaterThanOrEqual(bar!.y);
      expect(box.y + box.height).toBeLessThanOrEqual(bar!.y + bar!.height);
    });
  }

  // Save keeps at least 20 dots of clear air in its widest face, and the Menu button has not moved.
  for (const width of [320, 340, 360, 375, 390, 412]) {
    test(`${width} wide: Save's widest face keeps 20 dots of air and the Menu button has not moved`, async ({ page }) => {
      await page.setViewportSize({ width, height: 740 });
      await page.goto("/design/outline");
      const banner = page.getByRole("banner");
      const gap = await banner.evaluate((el) => {
        const logo = el.querySelector("svg") as SVGElement | null;
        const saveEl = el.querySelector("button[aria-label='Save Board']") as HTMLElement | null;
        if (!logo || !saveEl) throw new Error("missing logo or Save element");
        const originalMinWidth = saveEl.style.minWidth;
        saveEl.style.minWidth = "80px";
        const logoRect = logo.getBoundingClientRect();
        const saveRect = saveEl.getBoundingClientRect();
        saveEl.style.minWidth = originalMinWidth;
        return saveRect.left - logoRect.right;
      });
      console.log(`[wordmark] ${width}: ${gap.toFixed(1)} dots of air before Save's widest face`);
      expect(gap).toBeGreaterThanOrEqual(20 - 0.05);

      const menu = await banner.getByRole("button", { name: "Menu" }).boundingBox();
      near(menu!.x, width - 60);
      near(menu!.y, 1.5);
      near(menu!.width, 44);
      near(menu!.height, 44);
    });
  }

  test("the Menu button stands where it did, sideways too", async ({ page }) => {
    for (const [width, height] of [
      [844, 390],
      [863, 360],
    ]) {
      await page.setViewportSize({ width, height });
      await page.goto("/design/outline");
      const menu = await page.getByRole("banner").getByRole("button", { name: "Menu" }).boundingBox();
      near(menu!.x, width - 60);
      near(menu!.width, 44);
    }
  });

  test("on the home page the banner holds the logo as a picture and no link named Shaper Assistant", async ({ page }) => {
    await page.goto("/");
    const banner = page.getByRole("banner");
    await expect(logoIn(page, true)).toBeVisible();
    await expect(banner.getByRole("link", { name: "Shaper Assistant", exact: true })).toHaveCount(0);
  });

  test("on a design screen the banner's link named Shaper Assistant goes home", async ({ page }) => {
    await page.goto("/design/outline");
    const link = page.getByRole("banner").getByRole("link", { name: "Shaper Assistant", exact: true });
    await expect(link).toHaveAttribute("href", "/");
    await link.click();
    await page.waitForURL((url) => url.pathname === "/");
  });
});
