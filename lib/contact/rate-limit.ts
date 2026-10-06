/**
 * The Contact form's per-visitor limit (quick 261006-g5q, Task 1): at most five messages an hour
 * from one visitor. Pure — no imports at all, the time and the memory are both handed in — so the
 * rule is proved with a pretend clock in rate-limit.test.ts, and `lib/contact-server.ts` is the
 * only place that reads the real visitor and the real time.
 *
 * What it protects. Sending a Contact message is the one thing a signed-out visitor can make this
 * server do that costs the founder something: each one is a call against Resend's free plan. With
 * this limit, each visitor's address can make this server call Resend at most five times an hour,
 * on one server copy. Only a message that would really go out is counted — one caught by the
 * hidden anti-spam field, one with a mistake in it, or one on a server with no way to send never
 * uses up a send. A real shaper writing a question and a follow-up or two never reaches it; a
 * shaper who does is shown a kind try-again line with the support address, and keeps what they
 * typed.
 *
 * What it does not protect.
 *   - Vercel may run several copies of the server at once, and each keeps its own memory, so a
 *     visitor could get a few more than five if their sends land on different copies.
 *   - Many different addresses together can still use up Resend's free daily allowance. If that
 *     happens, sends fail and the form's existing failure line shows the support address.
 *   - Visitors whose requests carry no address header at all share one key ("unknown").
 *   - A shared store that every server copy sees would need a new service; that is out of scope
 *     before the 2026-10-07 freeze.
 *   - Addresses are held only in memory, for at most an hour after a visitor's last send. They are
 *     never written to a log, never written to the database and never sent to the browser — which
 *     fits what `content/legal/privacy.md` already says about the addresses our host records.
 *
 * Why nothing else a signed-out visitor can reach needs a limit (each read from its own file,
 * 2026-10-06). The app's one API route, `app/api/webhooks/clerk/route.ts` (POST only), goes
 * through `handleClerkWebhook` in `lib/clerk-webhook.ts`, which answers 400 and does nothing unless
 * a signing secret is set and Clerk's Svix signature verifies. Every other entry point is a Server
 * Action. The four preference actions — `app/actions/units.ts`, `app/actions/print-instructions.ts`,
 * `app/actions/fit-defaults.ts` and `app/actions/blank-makers.ts` — each `await auth()` and return
 * without writing anything when signed out. `app/actions/rack-order.ts`, signed out, hands off to
 * the practice rack's stand-in (`lib/rack-stand-in-server.ts`), which is off on a real build
 * (`resolveRackStandInSave` answers "off" when NODE_ENV is "production"), so it stores nothing and
 * answers `{ saved: false }`. `app/actions/account.ts`'s `exportMyDesigns` and `deleteMyAccount`
 * each `await auth()` and refuse a signed-out caller before touching the database.
 * `app/design/actions.ts`'s `saveModel`, `renameModel`, `duplicateModel` and `deleteModel` each
 * throw "Sign in to …" before touching the database. `app/actions/contact.ts` is the one that does
 * costly work for a signed-out caller, and it is the one this file limits. The blank list stays as
 * it is (the founder's decision, 2026-10-06).
 */

/** Five: a shaper writing a question and a follow-up or two never reaches it, and a script does at once. */
export const CONTACT_SEND_LIMIT = 5;
/** One hour, so "try again in about an hour" is true and a script gets at most five tries an hour from one address. */
export const CONTACT_SEND_WINDOW_MS = 60 * 60 * 1000;
/** Far more visitors than one server sees in an hour; past it the one longest without a send is forgotten, so memory stays bounded even under a flood from many addresses. */
export const CONTACT_SEND_MAX_VISITORS = 10_000;
/** Longer than any written IP address (45 characters), so a hostile header can't make one key huge. */
export const CONTACT_VISITOR_KEY_MAX = 64;
/** The one shared key for every request that carries neither address header. */
export const CONTACT_VISITOR_UNKNOWN = "unknown";

/** Each visitor's allowed sends still inside the window, as epoch milliseconds, oldest first. */
export type ContactSendStore = Map<string, number[]>;

function firstEntry(value: string | null): string {
  return (value ?? "").split(",")[0].trim();
}

/**
 * The visitor, from two request headers: the first address in `x-forwarded-for`, else the first
 * in `x-real-ip`, else the shared "unknown" key — cut to 64 characters either way.
 */
export function contactVisitorKey(input: { forwardedFor: string | null; realIp: string | null }): string {
  const key = firstEntry(input.forwardedFor) || firstEntry(input.realIp) || CONTACT_VISITOR_UNKNOWN;
  return key.slice(0, CONTACT_VISITOR_KEY_MAX);
}

/**
 * Asks for one send. True means allowed, and the send is recorded; false means this visitor has
 * already sent `limit` times within the window, and nothing is recorded — so retrying while
 * refused never pushes the wait further out. A send stops counting exactly one window after it
 * was made. Every call forgets sends older than the window and visitors left with none, and the
 * store never holds more than `maxVisitors` (the one longest without a send is forgotten first).
 * Only the store handed in is changed.
 */
export function takeContactSendSlot(input: {
  store: ContactSendStore;
  key: string;
  nowMs: number;
  limit?: number;
  windowMs?: number;
  maxVisitors?: number;
}): boolean {
  const { store, key, nowMs } = input;
  const limit = input.limit ?? CONTACT_SEND_LIMIT;
  const windowMs = input.windowMs ?? CONTACT_SEND_WINDOW_MS;
  const maxVisitors = input.maxVisitors ?? CONTACT_SEND_MAX_VISITORS;
  const oldestCounted = nowMs - windowMs;

  for (const [visitor, times] of store) {
    const kept = times.filter((t) => t > oldestCounted);
    if (kept.length === 0) store.delete(visitor);
    else if (kept.length !== times.length) store.set(visitor, kept);
  }

  const times = store.get(key) ?? [];
  if (times.length >= limit) return false;

  store.delete(key);
  store.set(key, [...times, nowMs]);

  while (store.size > maxVisitors) {
    const oldest = store.keys().next().value;
    if (oldest === undefined) break;
    store.delete(oldest);
  }

  return true;
}
