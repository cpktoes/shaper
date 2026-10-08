import { getTableColumns } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { userPreferences, type ModelRow, type UserPreferenceRow } from "@/lib/db/schema";
import {
  buildDesignsExport,
  DELETE_CONFIRMATION_WORD,
  designsExportFileName,
  isDeleteConfirmed,
} from "./account-data";

/**
 * Quick 261006-g4u (2026-10-06): the file Export my designs downloads (D-02), built from fake rows —
 * no database is ever reached. The file must hold the shaper's own stored data exactly as stored,
 * oldest board first, and never their Clerk account id.
 */

const FAKE_ID = "user_fake_g4u";

const olderSnapshot = { v: 3, board: { lengthMm: 1880 } };
const newerSnapshot = { v: 3, board: { lengthMm: 1828.8 } };

const olderRow: ModelRow = {
  id: "11111111-1111-4111-8111-111111111111",
  clerkUserId: FAKE_ID,
  name: "Fish 5'10",
  snapshot: olderSnapshot,
  createdAt: new Date("2026-09-01T10:00:00.000Z"),
  updatedAt: new Date("2026-09-20T12:30:00.000Z"),
  locked: null,
};

const newerRow: ModelRow = {
  id: "22222222-2222-4222-8222-222222222222",
  clerkUserId: FAKE_ID,
  name: "Step-up 6'0",
  snapshot: newerSnapshot,
  createdAt: new Date("2026-10-01T08:00:00.000Z"),
  updatedAt: new Date("2026-10-02T09:15:00.000Z"),
  locked: null,
};

const preferencesRow: UserPreferenceRow = {
  clerkUserId: FAKE_ID,
  units: "metric",
  printRailInstructions: null,
  extraLengthMm: 30,
  widthMarginMm: null,
  noseTipThicknessMm: null,
  tailTipThicknessMm: 12,
  planerMaxDepthMm: null,
  deckSkinMm: null,
  tipStyle: null,
  hiddenBlankMakers: '["Arctic Foam"]',
  rackOrder: '["22222222-2222-4222-8222-222222222222","11111111-1111-4111-8111-111111111111"]',
  createdAt: new Date("2026-09-01T10:05:00.000Z"),
  updatedAt: new Date("2026-10-03T07:00:00.000Z"),
};

const NOW = new Date("2026-10-06T18:45:00.000Z");

describe("buildDesignsExport (D-02)", () => {
  it("lists every board oldest first, each as exactly id, name, dates and the design as stored", () => {
    const rows = [newerRow, olderRow];
    const result = buildDesignsExport(rows, preferencesRow, NOW);

    expect(result.boards.map((board) => board.name)).toEqual(["Fish 5'10", "Step-up 6'0"]);
    expect(result.boards[0]).toEqual({
      id: olderRow.id,
      name: "Fish 5'10",
      createdAt: "2026-09-01T10:00:00.000Z",
      updatedAt: "2026-09-20T12:30:00.000Z",
      design: olderSnapshot,
    });
    expect(Object.keys(result.boards[1]).sort()).toEqual(["createdAt", "design", "id", "name", "updatedAt"]);
    // Never decoded or copied: the stored envelope itself.
    expect(result.boards[0].design).toBe(olderSnapshot);
    expect(result.boards[1].design).toBe(newerSnapshot);
    // The caller's list is left as it came.
    expect(rows.map((row) => row.name)).toEqual(["Step-up 6'0", "Fish 5'10"]);
  });

  it("carries every settings column except the account id, values exactly as stored", () => {
    const result = buildDesignsExport([olderRow], preferencesRow, NOW);
    const expectedKeys = Object.keys(getTableColumns(userPreferences))
      .filter((key) => key !== "clerkUserId")
      .sort();

    expect(result.settings).not.toBeNull();
    expect(Object.keys(result.settings!).sort()).toEqual(expectedKeys);
    expect(result.settings!.rackOrder).toBe(preferencesRow.rackOrder);
    expect(typeof result.settings!.rackOrder).toBe("string");
    expect(result.settings!.hiddenBlankMakers).toBe('["Arctic Foam"]');
    expect(result.settings!.printRailInstructions).toBeNull();
    expect(result.settings!.widthMarginMm).toBeNull();
    expect(result.settings!.extraLengthMm).toBe(30);
    expect(result.settings!.units).toBe("metric");
    expect(result.settings!.createdAt).toBe("2026-09-01T10:05:00.000Z");
    expect(result.settings!.updatedAt).toBe("2026-10-03T07:00:00.000Z");
  });

  it("never puts the account id anywhere in the file", () => {
    const result = buildDesignsExport([newerRow, olderRow], preferencesRow, NOW);
    expect(JSON.stringify(result)).not.toContain(FAKE_ID);
  });

  it("gives settings null when the shaper never changed one, and an empty board list when none are saved", () => {
    const result = buildDesignsExport([], null, NOW);
    expect(result.settings).toBeNull();
    expect(result.boards).toEqual([]);
  });

  it("opens with a plain-English about line, file version 1 and the time it was made", () => {
    const result = buildDesignsExport([], null, NOW);
    expect(typeof result.about).toBe("string");
    expect(result.about.length).toBeGreaterThan(0);
    expect(result.about).toContain("millimetres");
    expect(result.fileVersion).toBe(1);
    expect(result.exportedAt).toBe("2026-10-06T18:45:00.000Z");
    expect(Object.keys(result)).toEqual(["about", "fileVersion", "exportedAt", "boards", "settings"]);
  });
});

describe("designsExportFileName (D-02)", () => {
  it("uses the shaper's own local date, zero-padded", () => {
    expect(designsExportFileName(new Date(2026, 9, 6, 23, 30))).toBe("shaper-assistant-designs-2026-10-06.json");
    expect(designsExportFileName(new Date(2026, 0, 5, 9, 0))).toBe("shaper-assistant-designs-2026-01-05.json");
  });
});

describe("isDeleteConfirmed (D-04)", () => {
  it("the word is DELETE", () => {
    expect(DELETE_CONFIRMATION_WORD).toBe("DELETE");
  });

  it("accepts the word in any case, with spaces around it ignored (a phone capitalises the first letter)", () => {
    expect(isDeleteConfirmed("DELETE")).toBe(true);
    expect(isDeleteConfirmed(" delete ")).toBe(true);
    expect(isDeleteConfirmed("Delete")).toBe(true);
  });

  it("refuses anything else", () => {
    expect(isDeleteConfirmed("")).toBe(false);
    expect(isDeleteConfirmed("DELET")).toBe(false);
    expect(isDeleteConfirmed("DELETE ACCOUNT")).toBe(false);
    expect(isDeleteConfirmed("delete me")).toBe(false);
  });
});
