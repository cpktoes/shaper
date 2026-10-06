import { SITE_NAME } from "./metadata";

/**
 * The site footer's copyright notice (quick 261006-fom, D-02): the founder's own words,
 * "© 2026 Shaper Assistant. All rights reserved.", with the year read from the date so it never
 * goes stale.
 *
 * `now` defaults to the moment of the call, which is how the footer reads today's date at every
 * render without a date being made in a component's own body (the React hooks purity lint flags
 * one; this app has no React Compiler, so nothing caches the value). Pure: the tests pass a fixed
 * date.
 */
export function copyrightNotice(now: Date = new Date()): string {
  return `© ${now.getFullYear()} ${SITE_NAME}. All rights reserved.`;
}
