import type { ModelRow, UserPreferenceRow } from "@/lib/db/schema";

/**
 * Quick 261006-g4u (2026-10-06): the pure half of the Your data page — what Export my designs puts
 * in its file (D-02) and the shapes the two account actions answer with. No React, no database
 * client and no Clerk here, so the file's shape is proven from fake rows in
 * lib/account/account-data.test.ts; app/actions/account.ts does the reading and calls in.
 *
 * The file is the shaper's stored data exactly as stored. Every stored length is already metric
 * (CLAUDE.md Rule 2), so nothing is converted, and a board's design is the saved envelope itself,
 * never decoded. The Clerk account id is never written into the file.
 */

/** One saved board in the export: its id (the settings' rack order lists boards by id), name,
 * when it was made and last changed, and the design exactly as the app stores it. */
export type ExportedBoard = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  design: unknown;
};

/** The shaper's App Default Settings row as stored, every column except the account id, with its
 * two dates as ISO strings. A future settings column is carried without being listed here. */
export type ExportedSettings = {
  [Key in Exclude<keyof UserPreferenceRow, "clerkUserId">]: UserPreferenceRow[Key] extends Date
    ? string
    : UserPreferenceRow[Key];
};

export type DesignsExport = {
  about: string;
  fileVersion: 1;
  exportedAt: string;
  boards: ExportedBoard[];
  settings: ExportedSettings | null;
};

/** What exportMyDesigns answers: the file, or `exported: false` when no one is signed in. */
export type ExportMyDesignsResult = { exported: true; file: DesignsExport } | { exported: false };

export const DESIGNS_EXPORT_ABOUT =
  "Your saved surfboard designs from Shaper Assistant (www.shaperassistant.com). " +
  "Each board's design is exactly as the app stores it: lengths in millimetres, angles in degrees " +
  "and volume in litres, whichever units you view it in. settings holds your App Default Settings " +
  "as stored; a blank (null) setting means you never changed it from the app's own default.";

function settingsForExport(preferences: UserPreferenceRow): ExportedSettings {
  // Copy the row whole and drop only the account id, so a column added later travels too.
  const { clerkUserId: _dropped, ...rest } = preferences;
  void _dropped;
  const copy: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(rest)) {
    copy[key] = value instanceof Date ? value.toISOString() : value;
  }
  return copy as ExportedSettings;
}

/** Builds the Export my designs file (D-02) from the shaper's own rows. Boards come out oldest
 * first; the caller's list is never reordered. */
export function buildDesignsExport(
  rows: readonly ModelRow[],
  preferences: UserPreferenceRow | null,
  now: Date,
): DesignsExport {
  const boards = [...rows]
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .map((row) => ({
      id: row.id,
      name: row.name,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      design: row.snapshot,
    }));
  return {
    about: DESIGNS_EXPORT_ABOUT,
    fileVersion: 1,
    exportedAt: now.toISOString(),
    boards,
    settings: preferences === null ? null : settingsForExport(preferences),
  };
}

/** `shaper-assistant-designs-YYYY-MM-DD.json`, from the date where the shaper is (their own clock). */
export function designsExportFileName(now: Date): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `shaper-assistant-designs-${year}-${month}-${day}.json`;
}
