/**
 * Server-side resolution of the fit-defaults handoff (D-09, mirrors
 * `lib/print-instructions-server.ts` and `lib/units-server.ts`).
 *
 * `app/layout.tsx` calls this before rendering (wired in 11-08), so the server already knows a
 * shaper's seven fit and tip defaults — Extra Length, Planer Max Depth, Width Margin, Deck Skin,
 * Nose Tip, Tail Tip and Tip Style — in the HTML it is about to write, and the numbers are right
 * from the first frame.
 *
 * Signed out, the shaper's choice comes from the `shaper-fit-defaults` cookie alone. Signed in, the
 * account row is read too, and `decideFitDefaultsHandoff` reconciles the two field by field.
 *
 * The account read is wrapped in try/catch and degrades to `null` (the same as "no account value")
 * on any failure — a database problem, or a `user_preferences` column not existing yet between
 * the push to `main` and the production migration (11-13 for the Phase 11 columns, 12-10 for
 * Planer Max Depth, Deck Skin and Tip Style) — so it must never break the page, exactly the way
 * `resolvePrintRailInstructionsHandoff` degrades.
 */

import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { readFitDefaultsPreference } from "./db/queries";
import { DEFAULT_BLANK_CUT, type TipStyle } from "./geometry/blank";
import {
  FIT_DEFAULTS_COOKIE_NAME,
  decideFitDefaultsHandoff,
  parseFitDefaultsCookieValue,
  resolveFitDefaults,
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

/**
 * The Tip Style a board saved under Phase 11 is carried over with when the server reopens it — the
 * shaper's own account default (Phase 12 D-14), not always Pin deck. Only the rack
 * (`app/page.tsx`) and the save, rename and duplicate actions (`app/design/actions.ts`) call it,
 * and only when the board they are about to read really holds a Phase 11 blank, so an ordinary
 * save costs no extra database read.
 *
 * Resolved from exactly the same cookie + account handoff the first paint uses, so it fails soft
 * the same way: a database problem, or production not yet carrying the `tip_style` column, falls
 * back to the cookie's Tip Style, and with no cookie pick to Pin deck — it never throws. It takes
 * no user id: the shaper is whoever `await auth()` says is signed in, and all it returns is one of
 * two words.
 */
export async function resolveCarryOverTipStyle(): Promise<TipStyle> {
  try {
    return resolveFitDefaults((await resolveFitDefaultsHandoff()).preference).tipStyle;
  } catch (error) {
    // The account read inside the handoff already degrades on its own; this outer guard is for
    // anything else (the cookie store, the session) so reopening an old board can never fail
    // just because its Tip Style couldn't be looked up — it opens with Pin deck instead.
    console.error("Shaper: failed to resolve the Tip Style for an older board", error);
    return DEFAULT_BLANK_CUT.tipStyle;
  }
}
