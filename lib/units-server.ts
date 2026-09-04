/**
 * Server-side resolution of the units handoff (D-12: "never a blink of inches").
 *
 * `app/layout.tsx` calls this before rendering, so the server already knows the system it is
 * about to write into the HTML — the numbers a shaper reads have to be right from the first
 * frame, and unlike the theme (CSS, correctable before paint by a pre-hydration script)
 * rendered text cannot be patched up after the fact.
 *
 * This plan covers only the signed-out, browser-remembered path: the cookie is the one thing
 * the server can see. 05-02 extends this function to also call `await auth()` and read the
 * shaper's stored account row, passing both into `decideUnitsHandoff` — the shape of this
 * function (an async resolver returning a `UnitsHandoff`) does not change when it does.
 */

import { cookies } from "next/headers";
import { UNITS_COOKIE_NAME, decideUnitsHandoff, parseUnitsPreference, type UnitsHandoff } from "./units-preference";

export async function resolveUnitsHandoff(): Promise<UnitsHandoff> {
  const cookieStore = await cookies();
  const browser = parseUnitsPreference(cookieStore.get(UNITS_COOKIE_NAME)?.value ?? null);
  return decideUnitsHandoff({ signedIn: false, account: null, browser });
}
