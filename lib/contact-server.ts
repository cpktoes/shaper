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
 */

import { currentUser } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import {
  CONTACT_STAND_IN_COOKIE,
  isContactFormAvailable,
  resolveContactDelivery,
  type ContactDelivery,
} from "./contact/delivery";
import { contactPrefillFrom } from "./contact/message";

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
