/**
 * The one-time iOS toolbar tip's visibility rule and its permanent remembering — the founder's
 * own fallback for "Can we 'hide toolbar' in the phone browser by default... Maybe a popup
 * reminder on first entry if we can't force a hide from our side."
 *
 * `shouldShowToolbarTip` is a thin rule — `!dismissed` — and it stays that thin ON PURPOSE: the
 * phone-width gate and the iOS-only gate are deliberately CSS's job, not this function's, so the
 * tip's element stays in the server-rendered tree with no JavaScript width check and no flash
 * between layouts — the same argument `components/design/phone-tab-bar.tsx` already makes for
 * itself. Do not "fix" this later by pulling either CSS gate into this function.
 *
 * Storage mirrors `lib/models/banner-dismissal.ts`'s shape — a stable key, a sentinel value, two
 * try/catch-guarded helpers — but reads and writes `localStorage`, the browser's PERMANENT
 * per-origin store, not `sessionStorage`. That module's own doc comment argues at length for a
 * per-visit store because the sign-in offer is meant to come back next visit; this toolbar advice
 * is read once and acted on once, and repeating it every visit would be nagging about something
 * already done. This key deliberately does NOT live in `banner-dismissal.ts` — its doc comment
 * would then be arguing for sessionStorage right next to a permanent key, which would make that
 * comment a lie. See `banner-dismissal.ts` for the sibling module this one is paired with.
 */

export const TOOLBAR_TIP_DISMISSAL_KEY = "shaper-toolbar-tip-dismissed";

const DISMISSED_VALUE = "true";

export interface ShouldShowToolbarTipInput {
  /** Whether this phone has already dismissed the tip, ever. */
  dismissed: boolean;
}

/**
 * Not dismissed: show it. Every phone that has tapped Got it once: hidden forever after. The
 * phone-width gate and the iOS-only gate are CSS's job (see the module doc comment above) — this
 * function answers only the one question storage can answer.
 */
export function shouldShowToolbarTip({ dismissed }: ShouldShowToolbarTipInput): boolean {
  return !dismissed;
}

/**
 * Reads whether this phone has ever dismissed the tip. Returns `false` — "not dismissed, so show
 * it" — rather than throwing whenever `localStorage` is unavailable (no browser, a server render)
 * or blocked (Safari private mode, cookies disabled) or holds anything other than the exact value
 * `writeToolbarTipDismissal` writes. A browser with storage blocked should still be able to shape
 * a board; it just sees the tip every time instead of once.
 */
export function readToolbarTipDismissal(): boolean {
  try {
    return localStorage.getItem(TOOLBAR_TIP_DISMISSAL_KEY) === DISMISSED_VALUE;
  } catch {
    return false;
  }
}

/**
 * Records that this phone has dismissed the tip, for good. Swallows a storage failure the same
 * way `readToolbarTipDismissal` does — the dismissal still applies to the rest of this render
 * (the caller's own state update), it just will not survive a reload in a browser that blocks
 * storage, which is the correct degradation rather than a thrown error interrupting the tap.
 */
export function writeToolbarTipDismissal(): void {
  try {
    localStorage.setItem(TOOLBAR_TIP_DISMISSAL_KEY, DISMISSED_VALUE);
  } catch {
    // Storage blocked — nothing more to do; see doc comment above.
  }
}
