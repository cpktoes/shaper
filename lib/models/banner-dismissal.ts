/**
 * The sign-in banner's visibility rule (D-02).
 *
 * `shouldShowSignInBanner` is the one place the question "should this shaper see the offer to
 * sign in right now?" is answered — pure and tested, the same separation
 * `lib/models/autosave.ts`'s `decideAutosave` draws for the autosave timer. A component that
 * inlined this check itself risks getting one of the four signed-in/dismissed combinations
 * wrong; one tested function cannot drift out of sync with itself.
 *
 * Dismissal is stored in `sessionStorage`, not `localStorage`: D-02 asks for a nudge dismissed
 * "for the rest of the visit", and a shaper coming back next week should see the offer again —
 * quietly, once. The two storage helpers below are the only things in this module that touch a
 * browser API; they guard every access behind a `try`/`catch` so they are safe to call from a
 * node test (no `sessionStorage` global at all) and from a server render (same reason), mirroring
 * `components/theme-provider.tsx`'s `getStoredPreference`/`setPreference` guards.
 */

/** Stable storage key, named once here rather than typed again at every call site. */
export const BANNER_DISMISSAL_KEY = "shaper-sign-in-banner-dismissed";

const DISMISSED_VALUE = "true";

export interface ShouldShowSignInBannerInput {
  /** Whether the shaper is currently signed in — read from Clerk. */
  signedIn: boolean;
  /** Whether this banner has already been dismissed this visit. */
  dismissed: boolean;
}

/**
 * Signed out and not dismissed: show it. Every other combination — signed in (with or without
 * a dismissal already recorded) or already dismissed this visit — hides it. A shaper who
 * already has an account is never offered one, and a dismissal holds for the rest of the visit
 * regardless of which screen they land on next.
 */
export function shouldShowSignInBanner({ signedIn, dismissed }: ShouldShowSignInBannerInput): boolean {
  return !signedIn && !dismissed;
}

/**
 * Reads whether this visit's banner has been dismissed. Returns `false` — "not dismissed, so
 * show it" — rather than throwing whenever `sessionStorage` is unavailable (no browser, a
 * server render) or blocked (Safari private mode, cookies disabled) or holds anything other
 * than the exact value `writeBannerDismissal` writes. A browser with storage blocked should
 * still be able to shape a board; it just sees the banner every time instead of once.
 */
export function readBannerDismissal(): boolean {
  try {
    return sessionStorage.getItem(BANNER_DISMISSAL_KEY) === DISMISSED_VALUE;
  } catch {
    return false;
  }
}

/**
 * Records that this visit's banner has been dismissed. Swallows a storage failure the same way
 * `readBannerDismissal` does — the dismissal still applies to the rest of this render (the
 * caller's own state update), it just will not survive a reload in a browser that blocks
 * storage, which is the correct degradation rather than a thrown error interrupting the click.
 */
export function writeBannerDismissal(): void {
  try {
    sessionStorage.setItem(BANNER_DISMISSAL_KEY, DISMISSED_VALUE);
  } catch {
    // Storage blocked — nothing more to do; see doc comment above.
  }
}
