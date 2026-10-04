import { expect, type Locator, type Page } from "@playwright/test";

/**
 * One way for every browser test to walk the six design screens (quick 261003-q2f). On a tall, wide
 * window that is the desktop row's own link; everywhere the top bar is condensed into ☰ (an upright
 * phone, a phone held sideways) it is ☰ and then that screen's tile. There is no bottom tab bar any
 * more.
 *
 * The six screens are written out here rather than imported from `components/site-nav.tsx`'s
 * `NAV_LINKS`: that file pulls the app's database client in through its Save button, which
 * Playwright's own Node process cannot load — and a test that read what it proves from the thing
 * itself could pass for the wrong reason.
 */
export const SCREENS = [
  { href: "/design/outline", label: "TEMPLATE" },
  { href: "/design/rocker", label: "ROCKER" },
  { href: "/design/rails", label: "RAILS" },
  { href: "/design/volume", label: "VOLUME" },
  { href: "/design/fins", label: "FINS" },
  { href: "/design/summary", label: "SUMMARY" },
] as const;

export type ScreenLabel = (typeof SCREENS)[number]["label"];

export function screenHref(label: ScreenLabel): string {
  const screen = SCREENS.find((s) => s.label === label);
  if (!screen) throw new Error(`No screen named ${label}`);
  return screen.href;
}

/** Waits until React owns the top bar's Menu button, so a tap reaches Base UI rather than the
 * server-rendered markup. */
async function waitForMenuButton(page: Page) {
  await page.waitForFunction(() => {
    const el = document.querySelector('header button[aria-label="Menu"]');
    return !!el && Object.keys(el).some((key) => key.startsWith("__reactFiber"));
  });
}

/** Taps ☰ in the top bar and returns the open sheet once a tile shows, settled past its opening
 * animation (a box read mid-animation is a frame short of its final place). */
export async function openPhoneMenu(page: Page): Promise<Locator> {
  const menu = page.getByRole("menu");
  if (!(await menu.isVisible())) {
    await waitForMenuButton(page);
    await page.getByRole("banner").getByRole("button", { name: "Menu" }).click();
  }
  await expect(menu.locator("[data-screen-tile]").first()).toBeVisible();
  await menu.evaluate(async (el) => {
    await Promise.all(el.getAnimations({ subtree: true }).map((animation) => animation.finished.catch(() => undefined)));
  });
  return menu;
}

/** The tile for a screen, inside the open ☰ sheet. */
export function screenTile(page: Page, label: ScreenLabel): Locator {
  return page.locator(`[data-screen-tile="${screenHref(label)}"]`);
}

/** No page draws a navigation named "Screens" any more — that was the old bottom tab bar. Exact, so
 * the Back and Next landmark can never be mistaken for it. */
export async function expectNoScreensNavigation(page: Page): Promise<void> {
  await expect(page.getByRole("navigation", { name: "Screens", exact: true })).toHaveCount(0);
}

/** Opens ☰, checks it holds the six tiles in order with `current` ticked (or none ticked on a page
 * that is not a design screen), then closes it again with Escape. */
export async function expectSixTilesInMenu(page: Page, current: ScreenLabel | null): Promise<void> {
  const sheet = await openPhoneMenu(page);
  const tiles = sheet.locator("[data-screen-tile]");
  await expect(tiles).toHaveCount(6);
  expect(await tiles.evaluateAll((els) => els.map((el) => el.getAttribute("data-screen-tile")))).toEqual(
    SCREENS.map((s) => s.href),
  );
  const ticked = sheet.locator('[data-screen-tile][aria-current="page"]');
  if (current) {
    await expect(ticked).toHaveCount(1);
    await expect(ticked).toHaveAttribute("data-screen-tile", screenHref(current));
  } else {
    await expect(ticked).toHaveCount(0);
  }
  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();
}

/**
 * Moves to a design screen the way a shaper would on this window: the desktop row's link when it
 * shows (found as `nav:not([aria-label])`, which never matches the "Back and Next" landmark), else
 * ☰ and the tile. Does nothing if already there. Retries the whole open-and-tap gesture: a tap that
 * lands a frame before Base UI has finished placing the sheet still closes it without reaching the
 * tile's own move, so retrying only the tap would find nothing to tap.
 */
export async function goToScreen(page: Page, label: ScreenLabel): Promise<void> {
  const href = screenHref(label);
  if (new URL(page.url()).pathname === href) return;
  const desktopLink = page.locator("nav:not([aria-label])").getByRole("link", { name: label, exact: true }).first();
  if (await desktopLink.isVisible()) {
    await desktopLink.click();
  } else {
    await expect(async () => {
      if (new URL(page.url()).pathname === href) return;
      await openPhoneMenu(page);
      await screenTile(page, label).click();
      await expect(page).toHaveURL(new RegExp(`${href}$`), { timeout: 10_000 });
    }).toPass({ timeout: 60_000 });
  }
  await page.waitForURL(`**${href}`);
}
