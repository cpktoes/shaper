import { expect, type Locator, type Page } from "@playwright/test";

/**
 * One way for every browser test to reach App Default Settings (quick 261003-uwi) — the pop-up that
 * now holds Imperial or Metric, the theme, the blank makers and the fit and tip defaults. On a tall,
 * wide window it is the gear in the top bar; wherever the top bar is condensed (an upright phone, a
 * phone held sideways) it is ☰. Either way the menu holds one "App Default Settings" row.
 */

/** The "App Default Settings" row, inside whichever menu is open. */
export function appSettingsRow(page: Page): Locator {
  return page.getByRole("menuitem", { name: /^App Default Settings/ });
}

/** The App Default Settings pop-up itself. */
export function appSettingsDialog(page: Page): Locator {
  return page.getByRole("dialog", { name: "App Default Settings" });
}

/** The gear when the desktop row shows (exact, because FINS has its own "Settings ▸" button), else
 * the top bar's ☰. */
async function settingsTrigger(page: Page): Promise<{ trigger: Locator; selector: string }> {
  const gear = page.getByRole("button", { name: "Settings", exact: true });
  if (await gear.isVisible()) {
    return { trigger: gear, selector: 'button[aria-label="Settings"]' };
  }
  return {
    trigger: page.getByRole("banner").getByRole("button", { name: "Menu" }),
    selector: 'header button[aria-label="Menu"]',
  };
}

/**
 * Opens the gear menu or ☰, whichever this window shows, and returns the open menu. Waits until
 * React owns the button (a tap on the server-rendered markup reaches nothing), then taps it only
 * while the App Default Settings row is not yet showing — retried, so a tap that landed before the
 * page was ready is tried again, and an open menu is never tapped shut.
 */
export async function openSettingsMenu(page: Page): Promise<Locator> {
  const row = appSettingsRow(page);
  // A menu still animating shut (Base UI's `data-closed`) is not open, and its row vanishes mid-tap:
  // wait for it to go before reading whether the row shows (the same race as screens.ts' openPhoneMenu).
  await expect(page.locator('[role="menu"][data-closed]')).toHaveCount(0);
  await expect(async () => {
    if (await row.isVisible()) return;
    const { trigger, selector } = await settingsTrigger(page);
    await expect(trigger).toBeVisible({ timeout: 1_000 });
    await page.waitForFunction(
      (sel) =>
        Array.from(document.querySelectorAll(sel)).some(
          (el) => (el as HTMLElement).offsetParent !== null && Object.keys(el).some((key) => key.startsWith("__reactFiber")),
        ),
      selector,
      { timeout: 5_000 },
    );
    if (!(await row.isVisible())) await trigger.click();
    await expect(row).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 20_000 });
  return page.locator('[role="menu"]:not([data-closed])');
}

/** Waits out a box's opening animation — a box read mid-animation is a frame short of its place. */
export async function settled(locator: Locator): Promise<void> {
  await locator.evaluate(async (el) => {
    await Promise.all(el.getAnimations({ subtree: true }).map((animation) => animation.finished.catch(() => undefined)));
  });
}

/** Opens the menu, taps App Default Settings, and returns the pop-up once it has finished opening. */
export async function openAppSettings(page: Page): Promise<Locator> {
  await openSettingsMenu(page);
  await appSettingsRow(page).click();
  const dialog = appSettingsDialog(page);
  await expect(dialog).toBeVisible();
  await settled(dialog);
  return dialog;
}
