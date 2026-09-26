"use server";

/**
 * Server Action for saving a shaper's five fit and tip defaults to their account (D-09): Extra
 * Length, Extra Center Thickness and Width Margin (which decide the blanks a board fits into), and
 * the Nose and Tail Tip thicknesses a new board starts from. Copies
 * `app/actions/print-instructions.ts`'s shape: `await auth()` runs before any database statement,
 * and the parameter list never accepts a user id, owner id or Clerk id from the client — the
 * writing identity always comes from the session. Mechanically enforced by
 * `lib/db/ownership.test.ts`.
 *
 * A signed-out caller is not an error here: a signed-out shaper's defaults live entirely in the
 * browser/cookie, so this action resolves quietly instead of throwing when there is no session.
 */

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db/client";
import { userPreferences } from "@/lib/db/schema";
import {
  EMPTY_FIT_DEFAULTS_PREFERENCE,
  FIT_DEFAULTS_KEYS,
  parseFitDefaultValue,
  type FitDefaultsPreference,
} from "@/lib/fit-defaults-preference";

/**
 * Upserts all five of the shaper's fit and tip defaults at once. `values` arrives over the wire
 * from a client component, so it is checked field by field: each must be `null` ("not chosen") or
 * a finite number of millimetres inside that setting's bounds (`parseFitDefaultValue`). If any
 * field fails — including a field that is missing altogether — or `values` is not an object at
 * all, nothing is written: a crafted call can't put arbitrary content into these columns, and a
 * half-valid call can't write half a preference.
 */
export async function saveFitDefaultsPreference(values: FitDefaultsPreference): Promise<void> {
  const { userId } = await auth();
  if (!userId) return;

  if (typeof values !== "object" || values === null || Array.isArray(values)) return;
  const sent = values as Record<string, unknown>;

  const parsed: FitDefaultsPreference = { ...EMPTY_FIT_DEFAULTS_PREFERENCE };
  for (const key of FIT_DEFAULTS_KEYS) {
    const value = Object.prototype.hasOwnProperty.call(sent, key) ? sent[key] : undefined;
    if (value === null) continue;
    const valid = parseFitDefaultValue(key, value);
    if (valid === null) return;
    parsed[key] = valid;
  }

  const columns = {
    extraLengthMm: parsed.extraLength,
    extraCenterThicknessMm: parsed.extraCenterThickness,
    widthMarginMm: parsed.widthMargin,
    noseTipThicknessMm: parsed.noseTipThickness,
    tailTipThicknessMm: parsed.tailTipThickness,
  };

  await db.insert(userPreferences)
    .values({ clerkUserId: userId, ...columns })
    .onConflictDoUpdate({
      target: userPreferences.clerkUserId,
      set: { ...columns, updatedAt: new Date() },
    });
}
