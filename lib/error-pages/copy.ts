/**
 * The error-screen and not-found page's pure parts (quick 260930-fjm, Phase 13 item 12, Task 2):
 * every word a shaper reads on `app/error.tsx`, `app/global-error.tsx` (Task 3) and
 * `app/not-found.tsx`. The words are the product here, the same reason
 * `lib/privacy/copy.ts` and `lib/contact/message.ts` do this (P-12) — pinned by tests so the
 * founder's approved words (F-4) can never drift.
 *
 * `errorReference` returns Next's own opaque digest — never the failure's message — trimmed, or
 * null when there isn't one. A shaper who writes in with this reference gives us exactly the
 * hash a server log can be matched by, and nothing about what actually broke.
 *
 * No React, Next, browser API or network import anywhere in this file.
 */

export const ERROR_COPY = {
  heading: "Something went wrong",
  lead: "This screen ran into a problem and couldn't finish loading. Your saved boards are safe.",
  hint: "Try again — it often clears on its own. If it keeps happening, tell us what you were doing and we'll look into it.",
  tryAgain: "Try again",
  home: "Home screen",
  contact: "Tell us what happened",
  referenceLead: "If you write to us, include this reference:",
  documentTitle: "Something went wrong — Shaper Assistant",
} as const;

export const NOT_FOUND_COPY = {
  pageTitle: "Page not found — Shaper Assistant",
  heading: "We couldn't find that page",
  lead: "The address may be mistyped, or the page may have moved.",
  hint: "Head back to the home screen, or tell us about the link that brought you here.",
  home: "Home screen",
  contact: "Tell us about a broken link",
} as const;

/** Trims a server-side error's digest, or returns null when it's missing or blank — so the
 * reference line only ever appears when there's a real hash to show. */
export function errorReference(digest: string | undefined): string | null {
  const trimmed = (digest ?? "").trim();
  return trimmed === "" ? null : trimmed;
}
