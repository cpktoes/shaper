/**
 * Request-time glue for the Contact page (quick 260929-u1t), mirroring `lib/units-server.ts`'s
 * shape: read the environment and the request's own cookies, hand a pure decider its inputs, and
 * degrade to the safe answer on any failure rather than break the page.
 *
 * `resolveContactDeliveryForRequest` passes `process.env.NODE_ENV` as a literal property access
 * (not through a variable, and not destructured elsewhere first) because that is the exact form
 * Next.js inlines at build time — in a production build (Vercel's included) this becomes the
 * string literal `"production"`, which is what makes P-3's stand-in switch provably unreachable
 * there; delivery.test.ts's boundary block pins this literal so a refactor can't quietly break the
 * guarantee. Everything downstream of this file only ever receives a `ContactDelivery` object (a
 * server-only shape carrying the real key when present) or, from `contactFormAvailableForRequest`,
 * a plain boolean — `app/contact/page.tsx` must never import `resolveContactDeliveryForRequest`
 * itself, or the key's own container would be one accidental prop away from a client bundle.
 *
 * `takeContactSendSlotForRequest` (quick 261006-g5q) is the per-visitor limit's request-time half:
 * it reads the visitor from the request's own address headers and asks the pure limiter in
 * `lib/contact/rate-limit.ts`, whose opening comment says what the limit protects and what it
 * doesn't. Every visitor's sends live in ONE map hung on `globalThis` — the practice rack's pattern
 * in `lib/rack-stand-in-server.ts` — so it is shared by every copy of this module and survives a
 * hot reload on the dev server. The address is never logged, saved or returned to the browser.
 */

import { currentUser } from "@clerk/nextjs/server";
import { cookies, headers } from "next/headers";
import {
  CONTACT_STAND_IN_COOKIE,
  isContactFormAvailable,
  resolveContactDelivery,
  type ContactDelivery,
} from "./contact/delivery";
import { contactPrefillFrom } from "./contact/message";
import { contactVisitorKey, takeContactSendSlot, type ContactSendStore } from "./contact/rate-limit";

const SEND_STORE_KEY = "__shaperContactSends";

/** Every visitor's recent Contact sends, by address — one map for the whole server copy. */
function contactSendStore(): ContactSendStore {
  const holder = globalThis as typeof globalThis & { [SEND_STORE_KEY]?: ContactSendStore };
  holder[SEND_STORE_KEY] ??= new Map();
  return holder[SEND_STORE_KEY];
}

/**
 * Asks for one Contact send for the visitor making this request: true when allowed (and counted),
 * false when this visitor has already sent five within the hour. Reading the visitor never breaks
 * the send — if the headers can't be read, the visitor is the shared "unknown" key.
 */
export async function takeContactSendSlotForRequest(): Promise<boolean> {
  let key: string;
  try {
    const requestHeaders = await headers();
    key = contactVisitorKey({
      forwardedFor: requestHeaders.get("x-forwarded-for"),
      realIp: requestHeaders.get("x-real-ip"),
    });
  } catch {
    key = contactVisitorKey({ forwardedFor: null, realIp: null });
  }
  const allowed = takeContactSendSlot({ store: contactSendStore(), key, nowMs: Date.now() });
  if (!allowed) {
    // Names neither the address nor anything the visitor typed.
    console.warn("Shaper: contact send refused — one visitor reached the hourly limit");
  }
  return allowed;
}

export async function resolveContactDeliveryForRequest(): Promise<ContactDelivery> {
  const cookieStore = await cookies();
  return resolveContactDelivery({
    nodeEnv: process.env.NODE_ENV,
    standInFlag: process.env.SHAPER_CONTACT_STAND_IN,
    standInChoice: cookieStore.get(CONTACT_STAND_IN_COOKIE)?.value,
    apiKey: process.env.RESEND_API_KEY,
  });
}

/** The only shape the page itself may hold: a boolean, never the delivery object or the key. */
export async function contactFormAvailableForRequest(): Promise<boolean> {
  return isContactFormAvailable(await resolveContactDeliveryForRequest());
}

/**
 * The signed-in shaper's own name and email, degrading to the empty prefill on any Clerk
 * failure — the page must still render the form (or the address) even if the account lookup
 * itself breaks.
 */
export async function resolveContactPrefill(): Promise<{ name: string; email: string }> {
  try {
    const user = await currentUser();
    return contactPrefillFrom(
      user
        ? { fullName: user.fullName, primaryEmail: user.primaryEmailAddress?.emailAddress ?? null }
        : null,
    );
  } catch (error) {
    console.error("Shaper: contact prefill failed", error);
    return contactPrefillFrom(null);
  }
}
