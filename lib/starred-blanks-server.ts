/**
 * Server-side read of the shaper's starred blanks (quick task 261016-usz, 2026-10-16, D-03; modelled
 * on `lib/blank-makers-server.ts`).
 *
 * `app/layout.tsx` awaits this beside the other account hand-offs and passes the result to
 * `StarredBlanksProvider`, so a signed-in page shows the account's stars, not a stale browser copy.
 *
 * - Signed out: `{ kind: "signed-out" }`, and the account is never read — this browser's stars are
 *   all there is (D-02).
 * - Signed in: `{ kind: "signed-in", account }` with the account's list.
 * - Signed in but the read failed — a database hiccup, or the `starred_blanks` column not there yet
 *   between a deploy and the production migration: `{ kind: "account-unreadable" }` (P-3). This is
 *   deliberately NOT "the account has no stars". If it were, the browser's next join would save just
 *   this browser's stars over the account's real list and lose stars, which D-04 forbids. Unreadable,
 *   the browser shows its own copy and saves, replaces and clears nothing. It never breaks the page.
 *
 * There is no cookie (D-05): a long star list would outgrow one, and stars only ever render in the
 * browser, inside the popup, so this read is the only thing the server hands down.
 */

import { auth } from "@clerk/nextjs/server";
import { readStarredBlanksPreference } from "./db/queries";
import type { StarredBlanksHandoff } from "./starred-blanks-preference";

export async function resolveStarredBlanksHandoff(): Promise<StarredBlanksHandoff> {
  const { userId } = await auth();
  if (!userId) return { kind: "signed-out" };

  try {
    const account = await readStarredBlanksPreference(userId);
    return { kind: "signed-in", account };
  } catch (error) {
    // Unreadable is its own state (P-3) — never "no stars", and never a broken page.
    console.error("Shaper: failed to read starred blanks preference", error);
    return { kind: "account-unreadable" };
  }
}
