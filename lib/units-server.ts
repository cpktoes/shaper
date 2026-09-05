/**
 * Server-side resolution of the units handoff (D-12: "never a blink of inches").
 *
 * `app/layout.tsx` calls this before rendering, so the server already knows the system it is
 * about to write into the HTML — the numbers a shaper reads have to be right from the first
 * frame, and unlike the theme (CSS, correctable before paint by a pre-hydration script)
 * rendered text cannot be patched up after the fact.
 *
 * Both inputs are now real: `signedIn` comes from `await auth()`, and a signed-in shaper's
 * account value comes from `readUnitsPreference`. The account read is wrapped in try/catch and
 * degrades to `null` (the same as "no account value") on any failure — a database problem, or
 * the `user_preferences` table not existing yet between the push to `main` and the production
 * migration (05-07) — must never break the page, exactly the way `app/page.tsx`'s
 * `BoardRackData` degrades a failed board-list read to an empty rack rather than a broken page.
 */

import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { readUnitsPreference } from "./db/queries";
import { UNITS_COOKIE_NAME, decideUnitsHandoff, parseUnitsPreference, type UnitsHandoff } from "./units-preference";

export async function resolveUnitsHandoff(): Promise<UnitsHandoff> {
  const { userId } = await auth();
  const cookieStore = await cookies();
  const browser = parseUnitsPreference(cookieStore.get(UNITS_COOKIE_NAME)?.value ?? null);

  let account: Awaited<ReturnType<typeof readUnitsPreference>> | null = null;
  if (userId) {
    try {
      account = await readUnitsPreference(userId);
    } catch (error) {
      // A failed or not-yet-existing user_preferences table degrades to the cookie value —
      // never breaks the page.
      console.error("Shaper: failed to read units preference", error);
      account = null;
    }
  }

  return decideUnitsHandoff({ signedIn: userId !== null, account, browser });
}
