/**
 * Server-side resolution of the print-instructions handoff (D-07, mirrors `lib/units-server.ts`).
 *
 * `app/layout.tsx` calls this before rendering, so the server already knows whether the box
 * should paint ticked in the HTML it is about to write — the box has to be right from the first
 * frame, exactly the way units is (D-07: "never a blink").
 *
 * For this task, `signedIn` is hard-coded `false` and `account` is hard-coded `null` — Task 2
 * supplies the real values (`await auth()` + `readPrintRailInstructionsPreference`, degraded to
 * `null` on any failure) without this function's shape changing, exactly as Phase 5's own 05-01
 * to 05-02 progression did.
 */

import { cookies } from "next/headers";
import {
  PRINT_RAIL_INSTRUCTIONS_COOKIE_NAME,
  decidePrintRailInstructionsHandoff,
  parsePrintRailInstructionsPreference,
  type PrintRailInstructionsHandoff,
} from "./print-instructions-preference";

export async function resolvePrintRailInstructionsHandoff(): Promise<PrintRailInstructionsHandoff> {
  const cookieStore = await cookies();
  const browser = parsePrintRailInstructionsPreference(
    cookieStore.get(PRINT_RAIL_INSTRUCTIONS_COOKIE_NAME)?.value ?? null,
  );

  return decidePrintRailInstructionsHandoff({ signedIn: false, account: null, browser });
}
