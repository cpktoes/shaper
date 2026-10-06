import { expect, test, type Locator, type Page } from "@playwright/test";
import { appSettingsDialog, appSettingsRow, openAppSettings, openSettingsMenu, settled } from "./helpers/settings";

/**
 * App Default Settings (quick 261003-uwi): both menus — the computer's gear and the phone's ☰ —
 * carry ONE row that opens a pop-up holding Imperial | Metric, the theme tiles, the blank makers and
 * the fit and tip defaults. Proved on all three projects; signed out on fake Clerk keys, so what is
 * proved is the browser path (localStorage and the cookie), as in fit-defaults.spec.ts.
 */

const BANNER_DISMISSAL_KEY = "shaper-sign-in-banner-dismissed";
const TOOLBAR_TIP_DISMISSAL_KEY = "shaper-toolbar-tip-dismissed";

/** Set before navigation so neither strip ever sits over the menu or the pop-up. */
async function dismissBannerAndTip(page: Page) {
  await page.addInitScript((key) => {
    window.sessionStorage.setItem(key, "true");
  }, BANNER_DISMISSAL_KEY);
  await page.addInitScript((key) => {
    window.localStorage.setItem(key, "true");
  }, TOOLBAR_TIP_DISMISSAL_KEY);
}

/** The first preset card on the setup screen — its dims line follows the chosen system. */
function firstPresetCard(page: Page) {
  return page.getByRole("button").filter({ hasText: "Start Shaping" }).first();
}

/** The menu proofs for one window: the one row, no old rows, Contact still there (the legal pages
 * live in the footer since quick 261006-fom, not in the menus). */
async function expectOneRowMenu(page: Page, phoneSheet: boolean) {
  const menu = await openSettingsMenu(page);
  const row = appSettingsRow(page);
  await expect(row).toBeVisible();
  await expect(row).toContainText("Units, theme, blank makers, fit and tips");
  await expect(menu.getByRole("menuitemradio", { name: /^Imperial/ })).toHaveCount(0);
  await expect(menu.getByRole("menuitemradio", { name: /^Metric/ })).toHaveCount(0);
  await expect(menu.getByRole("menuitem", { name: /Fit & Tip Defaults/ })).toHaveCount(0);
  await expect(menu.getByRole("menuitem", { name: "Contact", exact: true })).toBeVisible();
  await expect(menu.getByRole("menuitem", { name: "Terms", exact: true })).toHaveCount(0);
  await expect(menu.getByRole("menuitem", { name: "Privacy", exact: true })).toHaveCount(0);
  // Nothing of the old settings groups is left: no radio rows, no tick-box rows, no group of them.
  await expect(menu.getByRole("menuitemradio")).toHaveCount(0);
  await expect(menu.getByRole("menuitemcheckbox")).toHaveCount(0);
  for (const name of ["Units", "Theme", "Blank Makers"]) {
    await expect(menu.getByRole("group", { name, exact: true })).toHaveCount(0);
  }
  const textOutsideTiles = await menu.evaluate((el) => {
    const copy = el.cloneNode(true) as HTMLElement;
    copy.querySelectorAll("[data-screen-tile]").forEach((tile) => tile.remove());
    return copy.textContent ?? "";
  });
  expect(textOutsideTiles).not.toContain("Blank Makers");
  if (phoneSheet) {
    await expect(menu.locator("[data-screen-tile]")).toHaveCount(6);
    await expect(menu.locator("[data-phone-menu-account]")).toHaveCount(1);
  }
  await page.keyboard.press("Escape");
  await expect(row).toBeHidden();
}

test.describe("App Default Settings — one row in the menu, one pop-up", () => {
  test.beforeEach(async ({ page }) => {
    await dismissBannerAndTip(page);
  });

  test("the menu has one App Default Settings row and no Units rows", async ({ page }, testInfo) => {
    const desktop = testInfo.project.name === "desktop";
    await page.goto("/design/outline");
    await expectOneRowMenu(page, !desktop);

    if (desktop) {
      // A short screen condenses the top bar into ☰ at any width — the same one row is there.
      await page.setViewportSize({ width: 844, height: 390 });
      await page.reload();
      await expectOneRowMenu(page, true);
    }
  });

  test("the row closes the menu and opens App Default Settings, Imperial pressed", async ({ page }) => {
    await page.goto("/design/outline");
    await openSettingsMenu(page);
    await appSettingsRow(page).click();
    const dialog = appSettingsDialog(page);
    await expect(dialog).toBeVisible();
    await expect(appSettingsRow(page)).toBeHidden();
    await expect(dialog.getByRole("heading", { name: "App Default Settings" })).toBeVisible();
    await expect(dialog.getByText("Your defaults for this app. Changes apply at once.")).toBeVisible();
    const units = dialog.getByRole("group", { name: "Units" });
    await expect(units.getByRole("button", { name: /^Imperial/ })).toHaveAttribute("aria-pressed", "true");
    await expect(units.getByRole("button", { name: /^Metric/ })).toHaveAttribute("aria-pressed", "false");
  });

  test("Metric applies at once and survives a reload", async ({ page }) => {
    await page.goto("/");
    let dialog = await openAppSettings(page);
    let units = dialog.getByRole("group", { name: "Units" });
    await units.getByRole("button", { name: /^Metric/ }).click();
    await expect(units.getByRole("button", { name: /^Metric/ })).toHaveAttribute("aria-pressed", "true");
    await expect(units.getByRole("button", { name: /^Imperial/ })).toHaveAttribute("aria-pressed", "false");
    await dialog.getByRole("button", { name: "Done" }).click();
    await expect(dialog).toBeHidden();

    await expect.poll(async () => (await firstPresetCard(page).textContent()) ?? "").toMatch(/\d+\.\d × \d+\.\d × \d+\.\d cm/);
    expect(await page.evaluate(() => window.localStorage.getItem("shaper-units"))).toBe("metric");

    await page.reload();
    dialog = await openAppSettings(page);
    units = dialog.getByRole("group", { name: "Units" });
    await expect(units.getByRole("button", { name: /^Metric/ })).toHaveAttribute("aria-pressed", "true");
    await units.getByRole("button", { name: /^Imperial/ }).click();
    await expect(units.getByRole("button", { name: /^Imperial/ })).toHaveAttribute("aria-pressed", "true");
    await dialog.getByRole("button", { name: "Done" }).click();
    await expect.poll(async () => (await firstPresetCard(page).textContent()) ?? "").toMatch(/\d+'\d+"/);
  });

  /* -- THEME ---------------------------------------------------------------------------- */

  test("five theme tiles in order, System first; a tap switches the theme and survives a reload", async ({ page }) => {
    await page.goto("/design/outline");
    let dialog = await openAppSettings(page);
    const tiles = dialog.locator("[data-theme-tile]");
    expect(await tiles.evaluateAll((els) => els.map((el) => el.getAttribute("data-theme-tile")))).toEqual(
      THEME_IDS,
    );
    await expect(tile(dialog, "system")).toHaveAttribute("aria-pressed", "true");

    await tile(dialog, "slate").click();
    await expect(page.locator("html")).toHaveClass(/(^|\s)theme-slate(\s|$)/);
    await expect(page.locator("html")).toHaveClass(/(^|\s)dark(\s|$)/);
    await expectOnlyPressed(dialog, "slate");

    await page.reload();
    dialog = await openAppSettings(page);
    await expect(page.locator("html")).toHaveClass(/(^|\s)theme-slate(\s|$)/);
    await expectOnlyPressed(dialog, "slate");

    await tile(dialog, "system").click();
    await expectOnlyPressed(dialog, "system");
    expect(await page.evaluate(() => Array.from(document.documentElement.classList).some((c) => c.startsWith("theme-")))).toBe(
      false,
    );
  });

  test("each tile paints its own theme's colours, whatever theme is on screen", async ({ page }) => {
    await page.goto("/design/outline");
    const dialog = await openAppSettings(page);
    // Phosphor on screen, so the live colours differ from most of the tiles.
    await tile(dialog, "phosphor").click();
    await expectOnlyPressed(dialog, "phosphor");

    for (const id of THEME_IDS.slice(1)) {
      const ground = await backgroundOf(tile(dialog, id).locator('[data-swatch="ground"]'));
      const accent = await backgroundOf(tile(dialog, id).locator('[data-swatch="accent"]'));
      expect(ground, `${id} ground`).toBe(await rampColour(page, `--ramp-${id}-ground`));
      expect(accent, `${id} accent`).toBe(await rampColour(page, `--ramp-${id}-accent`));
    }
    const system = tile(dialog, "system");
    expect(await backgroundOf(system.locator('[data-swatch-half="light"] [data-swatch="ground"]'))).toBe(
      await rampColour(page, "--ramp-daylight-ground"),
    );
    expect(await backgroundOf(system.locator('[data-swatch-half="dark"] [data-swatch="ground"]'))).toBe(
      await rampColour(page, "--ramp-slate-ground"),
    );
  });

  test("System follows the device and says what it picks right now", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/design/outline");
    const dialog = await openAppSettings(page);
    const system = tile(dialog, "system");
    await expect(system).toHaveAttribute("aria-pressed", "true");
    await expect(system).toHaveAccessibleName(/Slate right now/);
    await expect(system).toHaveText("System");
    expect(await liveColour(page, "--surf-ground")).toBe(await rampColour(page, "--ramp-slate-ground"));

    await page.emulateMedia({ colorScheme: "light" });
    await expect(system).toHaveAccessibleName(/Daylight right now/);
    expect(await liveColour(page, "--surf-ground")).toBe(await rampColour(page, "--ramp-daylight-ground"));
  });

  /* -- BLANK MAKERS ---------------------------------------------------------------------- */

  test("the three makers sit on one row; the last one ticked is locked with the hint", async ({ page }) => {
    await page.goto("/design/outline");
    const dialog = await openAppSettings(page);
    const group = dialog.getByRole("group", { name: "Blank Makers" });
    const buttons = group.getByRole("button");
    await expect(buttons).toHaveCount(3);
    const tops = await buttons.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().top));
    expect(Math.max(...tops) - Math.min(...tops)).toBeLessThanOrEqual(1);
    for (const vendor of MAKERS) {
      await expect(maker(group, vendor)).toHaveAttribute("aria-pressed", "true");
      await expect(maker(group, vendor)).not.toHaveAttribute("aria-disabled", "true");
    }

    await maker(group, "Arctic Foam").click();
    await expect(maker(group, "Arctic Foam")).toHaveAttribute("aria-pressed", "false");
    await maker(group, "Marko Foam").click();
    await expect(maker(group, "Marko Foam")).toHaveAttribute("aria-pressed", "false");

    const usBlanks = maker(group, "US Blanks");
    await expect(usBlanks).toHaveAttribute("aria-disabled", "true");
    await expect(usBlanks).toHaveAttribute("aria-pressed", "true");
    await expect(dialog.getByText("Keep at least one maker ticked")).toBeVisible();
    await expect(usBlanks).toHaveAccessibleDescription("Keep at least one maker ticked");
    await usBlanks.click({ force: true });
    await expect(usBlanks).toHaveAttribute("aria-pressed", "true");

    await maker(group, "Marko Foam").click();
    await expect(usBlanks).not.toHaveAttribute("aria-disabled", "true");
    await expect(dialog.getByText("Keep at least one maker ticked")).toHaveCount(0);
  });

  /* -- Change Fit Rules ------------------------------------------------------------------- */

  test("ROCKER's Change Fit Rules opens the pop-up at WHICH BLANKS FIT", async ({ page }, testInfo) => {
    // The makers are changed from ROCKER itself: a maker's tick saves through a Server Action, which
    // refreshes the page it was made on, and a navigation started meanwhile would be cut short.
    await openRocker(page);
    const dialog = await openAppSettings(page);
    const group = dialog.getByRole("group", { name: "Blank Makers" });
    await maker(group, "US Blanks").click();
    await expect(maker(group, "US Blanks")).toHaveAttribute("aria-pressed", "false");
    await maker(group, "Marko Foam").click();
    await expect(maker(group, "Marko Foam")).toHaveAttribute("aria-pressed", "false");
    await dialog.getByRole("button", { name: "Done" }).click();
    await expect(dialog).toBeHidden();

    await expect(page.locator("[data-blank-makers-note]")).toHaveText("Showing Arctic Foam only — change in Settings");
    const field = page.getByRole("textbox", { name: "Center Thickness" });
    await field.click();
    await field.fill("5");
    await field.press("Enter");
    const empty = page.locator("[data-blank-list-empty]");
    await expect(empty).toBeVisible();
    await empty.getByRole("button", { name: "Change Fit Rules" }).click();

    const opened = appSettingsDialog(page);
    await expect(opened).toBeVisible();
    await settled(opened);
    await expect
      .poll(() => page.evaluate(() => document.activeElement?.textContent ?? ""))
      .toBe("WHICH BLANKS FIT");
    const place = await opened.evaluate((el) => {
      const heading = document.activeElement as HTMLElement;
      return {
        offset: heading.getBoundingClientRect().top - el.getBoundingClientRect().top,
        scrollTop: el.scrollTop,
        maxScroll: el.scrollHeight - el.clientHeight,
      };
    });
    // The heading is inside the pop-up's visible box, and either near its top or — when everything
    // under the heading is shorter than the pop-up, so it cannot scroll that far — the pop-up is
    // scrolled as far as it goes, which shows the whole fit part down to Done. Measured: on the
    // desktop and the Pixel 7 the fit part is about 110 dots shorter than the pop-up's window.
    expect(place.offset).toBeGreaterThanOrEqual(0);
    expect(place.offset <= 80 || place.scrollTop >= place.maxScroll - 1, JSON.stringify(place)).toBe(true);
    if (testInfo.project.name !== "desktop") expect(place.scrollTop).toBeGreaterThan(0);
    await expect(opened.getByRole("textbox", { name: "Extra Length", exact: true })).toBeInViewport();
  });

  /* -- sizes ---------------------------------------------------------------------------- */

  test("on a 360x640 phone the pop-up has no sideways scroll, tiles in one row, every control 44 tall", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "phone sizes");
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto("/design/outline");
    const dialog = await openAppSettings(page);

    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
    const box = await dialog.evaluate((el) => ({
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
      right: el.getBoundingClientRect().right,
    }));
    expect(box.scrollWidth).toBeLessThanOrEqual(box.clientWidth);
    expect(box.right).toBeLessThanOrEqual(360);

    const tiles = dialog.locator("[data-theme-tile]");
    const tops = await tiles.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().top));
    expect(Math.max(...tops) - Math.min(...tops), "the five tiles share one row").toBeLessThanOrEqual(1);
    const names = await tiles.evaluateAll((els) =>
      els.map((el) => {
        const name = el.lastElementChild as HTMLElement;
        return { text: name.textContent, scroll: name.scrollWidth, client: name.clientWidth };
      }),
    );
    for (const name of names) expect(name.scroll, `${name.text} is whole`).toBeLessThanOrEqual(name.client);

    const units = dialog.getByRole("group", { name: "Units" });
    const controls: [string, Locator][] = [
      ["Imperial", units.getByRole("button", { name: /^Imperial/ })],
      ["Metric", units.getByRole("button", { name: /^Metric/ })],
      ...THEME_IDS.map((id): [string, Locator] => [id, tile(dialog, id)]),
      ...MAKERS.map((vendor): [string, Locator] => [
        vendor,
        maker(dialog.getByRole("group", { name: "Blank Makers" }), vendor),
      ]),
      ["Restore Fit & Tip Defaults", dialog.getByRole("button", { name: "Restore Fit & Tip Defaults", exact: true })],
      ["Done", dialog.getByRole("button", { name: "Done" })],
    ];
    for (const [label, control] of controls) {
      expect(await control.evaluate((el) => (el as HTMLElement).offsetHeight), label).toBeGreaterThanOrEqual(44);
    }
  });

  test("held sideways at 844x340 the pop-up scrolls inside itself down to Done", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "iphone", "one sideways phone is enough");
    await page.setViewportSize({ width: 844, height: 340 });
    await page.goto("/design/outline");
    const dialog = await openAppSettings(page);
    const sizes = await dialog.evaluate((el) => ({ scroll: el.scrollHeight, client: el.clientHeight }));
    expect(sizes.scroll).toBeGreaterThan(sizes.client);
    const done = dialog.getByRole("button", { name: "Done" });
    await done.scrollIntoViewIfNeeded();
    await expect(done).toBeInViewport();
    const bottom = await dialog.evaluate((el) => el.getBoundingClientRect().bottom);
    expect(bottom).toBeLessThanOrEqual(340);
  });
});

/* -- helpers for the tiles and makers ----------------------------------------------------- */

const THEME_IDS = ["system", "daylight", "chalk", "slate", "phosphor"];
const MAKERS = ["US Blanks", "Arctic Foam", "Marko Foam"];

function tile(dialog: Locator, id: string): Locator {
  return dialog.locator(`[data-theme-tile="${id}"]`);
}

async function expectOnlyPressed(dialog: Locator, pressed: string) {
  for (const id of THEME_IDS) {
    await expect(tile(dialog, id)).toHaveAttribute("aria-pressed", id === pressed ? "true" : "false");
  }
}

function maker(group: Locator, vendor: string): Locator {
  return group.getByRole("button", { name: new RegExp(`^${vendor}`) });
}

async function backgroundOf(locator: Locator): Promise<string> {
  return locator.evaluate((el) => getComputedStyle(el).backgroundColor);
}

/** A colour token's value as the browser paints it, read from <html> and normalised to rgb(…) by
 * handing it to a throwaway element's background. */
async function colourOf(page: Page, name: string, live: boolean): Promise<string> {
  return page.evaluate(
    ({ name, live }) => {
      const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      const probe = document.createElement("div");
      probe.style.backgroundColor = live ? `var(${name})` : raw;
      document.body.appendChild(probe);
      const colour = getComputedStyle(probe).backgroundColor;
      probe.remove();
      return colour;
    },
    { name, live },
  );
}

function rampColour(page: Page, name: string) {
  return colourOf(page, name, false);
}

function liveColour(page: Page, name: string) {
  return colourOf(page, name, true);
}

/** ROCKER, once its streamed blank list has arrived and React owns it (blank-makers.spec.ts). */
async function openRocker(page: Page) {
  await page.goto("/design/rocker");
  await expect(page.getByRole("list", { name: "Blanks" })).toBeVisible({ timeout: 30_000 });
  await page.waitForFunction(() => {
    const owned = (el: Element | null) => !!el && Object.keys(el).some((key) => key.startsWith("__reactFiber"));
    return (
      owned(document.querySelector('ul[aria-label="Blanks"] button')) &&
      owned(document.querySelector('input[aria-label="Search blanks"]'))
    );
  });
}
