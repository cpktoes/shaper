/**
 * Server-side resolution of the print-instructions handoff (D-07, mirrors `lib/units-server.ts`).
 *
 * `app/layout.tsx` calls this before rendering, so the server already knows whether the box
 * should paint ticked in the HTML it is about to write — the box has to be right from the first
 * frame, exactly the way units is (D-07: "never a blink").
 *
 * The account read is wrapped in try/catch and degrades to `null` (the same as "no account
 * value") on any failure — a database problem, or the `user_preferences.print_rail_instructions`
 * column not existing yet between the push to `main` and the production migration (08-06) — must
 * never break the page, exactly the way `lib/units-server.ts`'s own `resolveUnitsHandoff` degrades.
 */

import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { readPrintRailInstructionsPreference } from "./db/queries";
import {
  PRINT_RAIL_INSTRUCTIONS_COOKIE_NAME,
  decidePrintRailInstructionsHandoff,
  parsePrintRailInstructionsPreference,
  type PrintRailInstructionsHandoff,
} from "./print-instructions-preference";

export async function resolvePrintRailInstructionsHandoff(): Promise<PrintRailInstructionsHandoff> {
  const { userId } = await auth();
  const cookieStore = await cookies();
  const browser = parsePrintRailInstructionsPreference(
    cookieStore.get(PRINT_RAIL_INSTRUCTIONS_COOKIE_NAME)?.value ?? null,
  );

  let account: Awaited<ReturnType<typeof readPrintRailInstructionsPreference>> | null = null;
  if (userId) {
    try {
      account = await readPrintRailInstructionsPreference(userId);
    } catch (error) {
      // A failed or not-yet-existing print_rail_instructions column degrades to the cookie
      // value — never breaks the page.
      console.error("Shaper: failed to read print-instructions preference", error);
      account = null;
    }
  }

  return decidePrintRailInstructionsHandoff({ signedIn: userId !== null, account, browser });
}
