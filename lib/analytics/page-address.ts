/**
 * Strips everything after the first "?" or "#" from a page address before it's counted by
 * Vercel Web Analytics (quick 260930-03d, Task 2; P-2). Several things can add to an address
 * without that meaning anything about who a visitor is:
 * - Clerk's sign-in dialog uses `routing="hash"` (components/auth/sign-in-dialog.tsx), which
 *   writes its own steps after a "#";
 * - a returning sign-in can carry Clerk's own values after a "?";
 * - a link posted on social media can carry a per-click id (for example `fbclid`).
 *
 * The privacy page promises visitors that only the page's own address is recorded — never
 * anything added to the end of a link — and this module is what keeps that promise true.
 *
 * No React, Next or browser import anywhere in this file — string work only, so it can never
 * throw on a malformed address.
 */

/** The part of `url` before the first "?" or "#", whichever comes first. Works on absolute and
 * relative addresses alike, with no `new URL` call, so it cannot throw. */
export function pageAddressOnly(url: string): string {
  const cut = url.search(/[?#]/);
  return cut === -1 ? url : url.slice(0, cut);
}

/** A spread copy of `event` with its `url` trimmed by `pageAddressOnly`. Never mutates its input,
 * never returns null, and keeps whichever `type` it was given — the generic signature lets this
 * serve as Vercel's `BeforeSend` without this file importing the analytics package itself. */
export function pageAddressOnlyVisit<T extends { url: string }>(event: T): T {
  return { ...event, url: pageAddressOnly(event.url) };
}
