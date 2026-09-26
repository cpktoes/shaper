/**
 * Server-side resolution of the fit-defaults handoff (D-09, mirrors
 * `lib/print-instructions-server.ts` and `lib/units-server.ts`).
 *
 * `app/layout.tsx` calls this before rendering (wired in 11-08), so the server already knows a
 * shaper's five fit and tip defaults — Extra Length, Extra Center Thickness, Width Margin, Nose Tip
 * and Tail Tip — in the HTML it is about to write, and the numbers are right from the first frame.
 *
 * Signed out, the shaper's choice comes from the `shaper-fit-defaults` cookie alone. Signed in, the
 * account row is read too, and `decideFitDefaultsHandoff` reconciles the two field by field.
 *
 * The account read is wrapped in try/catch and degrades to `null` (the same as "no account value")
 * on any failure — a database problem, or the five `user_preferences` columns not existing yet
 * between the push to `main` and the production migration (11-13) — so it must never break the
 * page, exactly the way `resolvePrintRailInstructionsHandoff` degrades.
 */

import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { readFitDefaultsPreference } from "./db/queries";
import {
  FIT_DEFAULTS_COOKIE_NAME,
  decideFitDefaultsHandoff,
  parseFitDefaultsCookieValue,
  type FitDefaultsHandoff,
  type FitDefaultsPreference,
} from "./fit-defaults-preference";

export async function resolveFitDefaultsHandoff(): Promise<FitDefaultsHandoff> {
  const { userId } = await auth();
  const cookieStore = await cookies();
  const browser = parseFitDefaultsCookieValue(cookieStore.get(FIT_DEFAULTS_COOKIE_NAME)?.value ?? null);

  let account: FitDefaultsPreference | null = null;
  if (userId) {
    try {
      account = await readFitDefaultsPreference(userId);
    } catch (error) {
      // Failed or not-yet-existing fit-default columns degrade to the cookie's values (or the
      // standard defaults) — never break the page.
      console.error("Shaper: failed to read fit defaults preference", error);
      account = null;
    }
  }

  return decideFitDefaultsHandoff({ signedIn: userId !== null, account, browser });
}
