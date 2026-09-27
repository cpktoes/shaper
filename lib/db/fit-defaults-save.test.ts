import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { describe, expect, it } from "vitest";
import {
  FIT_DEFAULTS_KEYS,
  fitDefaultsInsertColumns,
  fitDefaultsUpdateSet,
  type FitDefaultsPatch,
} from "@/lib/fit-defaults-preference";
import { inchesToMm } from "@/lib/geometry/units";
import * as schema from "./schema";
import { userPreferences } from "./schema";

/**
 * WR-02: a fit-defaults save from one device must not wipe a setting another device chose. This
 * renders the SQL of the very statement `app/actions/fit-defaults.ts` runs (same table, same
 * insert values and conflict update helpers) through Drizzle's own `.toSQL()` — no database
 * connection is made, the URL below is never dialled.
 */
const db = drizzle(neon("postgresql://nobody:nothing@localhost/none"), { schema });

function upsertSql(patch: FitDefaultsPatch): string {
  return db
    .insert(userPreferences)
    .values({ clerkUserId: "user_test", ...fitDefaultsInsertColumns(patch) })
    .onConflictDoUpdate({ target: userPreferences.clerkUserId, set: fitDefaultsUpdateSet(patch, new Date(0)) })
    .toSQL().sql;
}

/** The column names the ON CONFLICT ... DO UPDATE SET clause assigns. */
function updatedColumns(sql: string): string[] {
  const set = sql.slice(sql.indexOf("do update set") + "do update set".length);
  return [...set.matchAll(/"([a-z_]+)"\s*=/g)].map((m) => m[1]).sort();
}

describe("the fit-defaults save writes only the settings it was given (WR-02)", () => {
  it("a one-key patch updates only that column and updated_at", () => {
    const sql = upsertSql({ widthMargin: inchesToMm(2) });
    expect(sql).toContain("on conflict");
    expect(updatedColumns(sql)).toEqual(["updated_at", "width_margin_mm"]);
  });

  it("Restore Defaults (all seven sent as null) updates the seven columns and updated_at — never the retired one", () => {
    const allNull = Object.fromEntries(FIT_DEFAULTS_KEYS.map((key) => [key, null])) as FitDefaultsPatch;
    const updated = updatedColumns(upsertSql(allNull));
    expect(updated).toEqual(
      [
        "deck_skin_mm",
        "extra_length_mm",
        "nose_tip_thickness_mm",
        "planer_max_depth_mm",
        "tail_tip_thickness_mm",
        "tip_style",
        "updated_at",
        "width_margin_mm",
      ].sort(),
    );
    expect(updated).not.toContain("extra_center_thickness_mm");
  });

  it("a one-key Tip Style patch updates only tip_style and updated_at", () => {
    expect(updatedColumns(upsertSql({ tipStyle: "bottom" }))).toEqual(["tip_style", "updated_at"]);
  });

  it("never names units or the print toggle in the update", () => {
    const sql = upsertSql({ noseTipThickness: inchesToMm(0.5) });
    expect(updatedColumns(sql)).not.toContain("units");
    expect(updatedColumns(sql)).not.toContain("print_rail_instructions");
  });
});
