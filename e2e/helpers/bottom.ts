import { expect, type Locator, type Page } from "@playwright/test";

/** BOTTOM's three sections, as the phone's NOSE · CENTER · TAIL row speaks them (drawn in capitals by the page). */
const SECTION_WORD = { nose: "Nose", center: "Center", tail: "Tail" } as const;

export type BottomSection = keyof typeof SECTION_WORD;

/** The phone's NOSE · CENTER · TAIL row over VIEWER's drawing (17-14, D-27). On a computer, and on a phone held
 * sideways, it is in the page and not drawn. */
export function bottomPhoneRow(page: Page): Locator {
  return page.locator("[data-bottom-phone-sections]");
}

/** One tab of that row. */
export function bottomPhoneTab(page: Page, section: BottomSection): Locator {
  return bottomPhoneRow(page).getByRole("tab", { name: SECTION_WORD[section], exact: true });
}

/**
 * Brings a section's controls onto the page before a test reaches for them.
 *
 * On an upright phone BOTTOM's VIEWER shows one section's controls at a time, the one picked on the NOSE · CENTER · TAIL
 * row (17-14) — so a test that opens TAIL's menu has to tap TAIL first, as a shaper would. Everywhere the row is not
 * drawn (a computer, a phone held sideways, the DATA and GUIDE tabs) all three sections are already there and this does
 * nothing. It waits for BOTTOM's panel to be on the page first — the row arrives with it — so a call made the moment the
 * screen is reached is never mistaken for a computer's; and the tap is retried until React owns the row, so one made
 * before hydration is never lost.
 */
export async function showBottomSection(page: Page, section: BottomSection): Promise<void> {
  await expect(page.locator("[data-bottom-card]").first()).toBeAttached({ timeout: 60_000 });
  if (!(await bottomPhoneRow(page).isVisible())) return;
  const tab = bottomPhoneTab(page, section);
  await expect(async () => {
    if ((await tab.getAttribute("aria-selected")) !== "true") await tab.click({ timeout: 2_000 });
    await expect(tab).toHaveAttribute("aria-selected", "true", { timeout: 2_000 });
  }).toPass({ timeout: 60_000 });
}

/**
 * Waits until BOTTOM's floor scan has caught up with the board as it is now.
 *
 * The scan that finds where a cut meets the 1/4" floor trails a pick or a drag by a moment (the editor defers it, so a
 * slider never waits on it), and the sentence under a Depth row and DATA's floor note arrive when it lands. A test that
 * counts DATA's notes, or says a warning is not there, straight after a pick is reading the last board's answer. The
 * side panel says which it is in `data-bottom-floor-scan` (`pending`, then `settled`); call this after the pick has
 * shown on the page and before saying what is, or is not, warned about — or measuring a page a late note would lengthen.
 */
export async function bottomFloorScanSettled(page: Page): Promise<void> {
  const panel = page.locator("[data-bottom-floor-scan]");
  await expect(panel.first()).toBeAttached({ timeout: 60_000 });
  await expect(page.locator('[data-bottom-floor-scan="pending"]')).toHaveCount(0, { timeout: 30_000 });
  await expect(panel.first()).toHaveAttribute("data-bottom-floor-scan", "settled");
}
