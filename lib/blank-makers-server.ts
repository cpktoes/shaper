/**
 * Server-side resolution of the blank makers handoff (quick task 260926-wmf, mirrors
 * `lib/fit-defaults-server.ts` and `lib/units-server.ts`).
 *
 * `app/layout.tsx` calls this before rendering, so the server already knows which blank makers a
 * shaper has switched off in the HTML it is about to write, and the gear menu's tick boxes and the
 * ROCKER blank list are right from the first frame.
 *
 * Signed out, the shaper's choice comes from the `shaper-blank-makers` cookie alone. Signed in, the
 * account row is read too, and `decideBlankMakersHandoff` reconciles the two.
 *
 * The account read is wrapped in try/catch and degrades to `null` (the same as "no account value")
 * on any failure — a database problem, or the `hidden_blank_makers` column not existing yet
 * between the push to `main` and the production migration — so it must never break the page.
 */

import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { readBlankMakersPreference } from "./db/queries";
import {
  BLANK_MAKERS_COOKIE_NAME,
  decideBlankMakersHandoff,
  parseBlankMakersCookieValue,
  type BlankMakersHandoff,
} from "./blank-makers-preference";
import type { BlankVendor } from "./blanks/vendors";

export async function resolveBlankMakersHandoff(): Promise<BlankMakersHandoff> {
  const { userId } = await auth();
  const cookieStore = await cookies();
  const browser = parseBlankMakersCookieValue(cookieStore.get(BLANK_MAKERS_COOKIE_NAME)?.value ?? null);

  let account: BlankVendor[] | null = null;
  if (userId) {
    try {
      account = await readBlankMakersPreference(userId);
    } catch (error) {
      // A failed or not-yet-existing column degrades to the cookie's choice (or every maker on) —
      // never break the page.
      console.error("Shaper: failed to read blank makers preference", error);
      account = null;
    }
  }

  return decideBlankMakersHandoff({ signedIn: userId !== null, account, browser });
}
