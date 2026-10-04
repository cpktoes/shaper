/**
 * The order a board is shaped in — TEMPLATE, ROCKER, RAILS, VOLUME, FINS, SUMMARY — and the one
 * question the Back and Next buttons ask of it: "from this screen, which one comes before and which
 * one comes after?"
 *
 * The list of screens is passed in rather than written here, so the app's top row, phone tab bar
 * and these buttons all keep reading the one copy (`NAV_LINKS` in `components/site-nav.tsx`) and can
 * never disagree about the order. It never wraps round: Back on TEMPLATE or Next on SUMMARY would
 * have nowhere sensible to go, so those two ends simply have no button.
 *
 * Pure, with no React or Next import, so it can be tested on its own.
 */

/** The two words about a screen the buttons need: where it lives and its label in capitals. */
export interface ScreenLink {
  readonly href: string;
  readonly label: string;
}

/**
 * The screens either side of the one `pathname` is on. A screen is matched by its exact address or
 * by an address beneath it (the same test the top row uses to light up the current screen); any
 * other address — the home page, Contact, a typo, nothing at all — has no neighbours. The returned
 * entries are always members of `screens`, never built from the address, so a crafted address can
 * never point a button anywhere new.
 */
export function screenStepsAround<T extends ScreenLink>(
  screens: readonly T[],
  pathname: string | null | undefined,
): { previous: T | null; next: T | null } {
  if (!pathname) return { previous: null, next: null };
  const index = screens.findIndex((screen) => pathname === screen.href || pathname.startsWith(`${screen.href}/`));
  if (index === -1) return { previous: null, next: null };
  return { previous: screens[index - 1] ?? null, next: screens[index + 1] ?? null };
}

/** A screen's capitals as the word a button reads: "ROCKER" becomes "Rocker". */
export function screenWord(label: string): string {
  return label.charAt(0).toUpperCase() + label.slice(1).toLowerCase();
}
