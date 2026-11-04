/**
 * Import my designs (quick 261103-k8o, plan 02, 2026-11-03). The founder: "I can download my board data
 * from the site, but I need a way to upload it." The Your data page in Clerk's account panel takes back a
 * whole Export my designs file and puts its boards on the account (R1b). A file, never a web link, and no
 * database change of any kind (R2): every board goes in as a new saved board, exactly as Duplicate makes
 * one.
 *
 * Preview first, then one choice (R3). Before anything is written the page says how many boards will be
 * added (by name), how many are already on the account (matched by board id) and will be left exactly as
 * they are, and how many couldn't be read. One tick box, off by default, also adds the file's versions of
 * the already-there boards as copies, named the way Duplicate names a copy. Nothing on the account is ever
 * overwritten, a locked board included, and the file's settings are never read.
 *
 * Why a board's id is kept (PC15): "already on your account" is matched by board id, so if every imported
 * board took a fresh id, importing the same file twice — or again after a failure part-way — would add
 * every board again. A board keeps its file id when that id is free; a clash can only be another account's
 * board, which is never touched, and the board then goes in with a fresh id. Only an id in the database's
 * own form is ever kept; a copy always takes a fresh one.
 *
 * Why batches (PC16): a Server Action takes at most 1 MB a call, and a whole file can be far bigger, so
 * the page sends a few boards at a time and the server refuses a call with more.
 *
 * The page and the server read a board by ONE rule (`readEntry` below, built on plan 01's
 * `readBoardEntry`: the save reader plus the rack's drawing check), and decide by one rule (`planImport`),
 * so the preview says exactly what the import does.
 *
 * Nothing is converted (CLAUDE.md Rule 2): a file is the stored data, every length in millimetres.
 *
 * Pure: no React, browser, database or Clerk import.
 */
import { z } from "zod";
import { readBoardEntry, readBoardFileContents, UNTITLED_BOARD_NAME } from "@/lib/models/board-file";
import type { DesignSnapshotFields, ParseSnapshotOptions } from "@/lib/models/design-snapshot";
import { orderWithNewBoardFirst, RACK_ORDER_MAX_IDS, type SavedRackEntry } from "@/lib/models/rack-order";

/** The most boards one file can bring in: the rack order's own cap. */
export const IMPORT_MAX_BOARDS = RACK_ORDER_MAX_IDS;

/** The most boards the page sends in one call, and the most the server takes (PC16). */
export const IMPORT_BATCH_MAX_BOARDS = 25;

/** The most design text the page puts in one call, in characters, well inside a Server Action's 1 MB. */
export const IMPORT_BATCH_MAX_CHARS = 600_000;

/** The most design text one board can carry, in characters. A real board is 4,000 to 7,500. */
export const IMPORT_BOARD_MAX_CHARS = 64_000;

/** One board as the page sends it to the server. */
export type ImportEntry = { id: string | null; name: string; design: unknown };

/** One board from a file, read: its place in the file (from 1), its id when one can be kept, the name its
 * row takes, the file's design as it came, and the design as the save reader reads it. */
export interface ImportBoard {
  position: number;
  id: string | null;
  name: string;
  design: unknown;
  fields: DesignSnapshotFields;
}

/** What the page makes of a whole file before anything is shown. */
export type DesignsFileReadResult =
  | { ok: true; boards: ImportBoard[]; unreadable: string[] }
  | { ok: false; problem: "too-big" | "not-ours" | "no-boards" | "too-many-boards" };

const BOARD_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A board id in the database's own form (8-4-4-4-12 hexadecimal), in small letters; anything else is no id. */
export function boardIdOf(value: unknown): string | null {
  return typeof value === "string" && BOARD_ID_PATTERN.test(value) ? value.toLowerCase() : null;
}

/** How a board is named when it is reported: its name, or "board 3" when it has none. */
export function boardLabel(name: string, position: number): string {
  const trimmed = name.trim();
  return trimmed === "" ? `board ${position}` : trimmed;
}

/** A copy's name — exactly the way Duplicate names one (PC18). */
export function boardCopyName(name: string): string {
  return `Copy of ${name}`;
}

/** How long a design is as text, or past the cap when it can't be written as text at all. */
function designTextLength(design: unknown): number {
  try {
    return JSON.stringify(design)?.length ?? 0;
  } catch {
    return IMPORT_BOARD_MAX_CHARS + 1;
  }
}

/** One entry's name as given, for reporting it when it can't be read. */
function rawName(entry: unknown): string {
  if (typeof entry !== "object" || entry === null) return "";
  const name = (entry as { name?: unknown }).name;
  return typeof name === "string" ? name : "";
}

/**
 * Reads every entry by one rule, for the page and the server alike: the design under the size cap, the
 * save reader and the rack's drawing check (`readBoardEntry`), an empty name made Untitled Board with the
 * design's own name set to it (a saved board always has a name), and an id kept only when it is in the
 * database's form and no earlier board in the list has it.
 */
function readEntries(
  entries: readonly unknown[],
  options: ParseSnapshotOptions,
): { boards: ImportBoard[]; unreadable: string[] } {
  const boards: ImportBoard[] = [];
  const unreadable: string[] = [];
  const seenIds = new Set<string>();
  entries.forEach((entry, i) => {
    const position = i + 1;
    const design = typeof entry === "object" && entry !== null ? (entry as { design?: unknown }).design : undefined;
    const read = designTextLength(design) > IMPORT_BOARD_MAX_CHARS ? null : readBoardEntry(entry, options);
    if (read === null) {
      unreadable.push(boardLabel(rawName(entry), position));
      return;
    }
    const name = read.name === "" ? UNTITLED_BOARD_NAME : read.name;
    let id = boardIdOf((entry as { id?: unknown }).id);
    if (id !== null && seenIds.has(id)) id = null;
    if (id !== null) seenIds.add(id);
    boards.push({ position, id, name, design, fields: { ...read.fields, boardName: name } });
  });
  return { boards, unreadable };
}

/**
 * A whole Export my designs file's text, read in the browser before anything is shown (PC20). A one-board
 * file (plan 01's) reads as one board with no id, so it is always added (PC19). The file's settings and
 * every other key are never read.
 */
export function readDesignsFileText(text: string, options: ParseSnapshotOptions): DesignsFileReadResult {
  const contents = readBoardFileContents(text);
  if (!contents.ok) return contents;
  if (contents.entries.length === 0) return { ok: false, problem: "no-boards" };
  if (contents.entries.length > IMPORT_MAX_BOARDS) return { ok: false, problem: "too-many-boards" };
  return { ok: true, ...readEntries(contents.entries, options) };
}

/** One write an import makes: a new board (keeping its file id when it can) or a copy (always a fresh id). */
export type ImportWrite<T> =
  | { kind: "new"; keepId: string | null; name: string; board: T }
  | { kind: "copy"; name: string; board: T };

/** What an import will do, worked out the same way in the preview and on the server. */
export interface ImportPlan<T> {
  add: T[];
  alreadyThere: T[];
  copies: T[];
  writes: ImportWrite<T>[];
}

/**
 * The one rule (R3): a board whose id is already on the account is left exactly as it is, and with the box
 * ticked its file version also goes in as a copy; every other board — one with no id included — is added.
 * Nothing is ever dropped, and `writes` stand in the file's order.
 */
export function planImport<T extends { id: string | null; name: string }>(
  boards: readonly T[],
  accountIds: ReadonlySet<string>,
  includeCopies: boolean,
): ImportPlan<T> {
  const plan: ImportPlan<T> = { add: [], alreadyThere: [], copies: [], writes: [] };
  for (const board of boards) {
    if (board.id !== null && accountIds.has(board.id)) {
      plan.alreadyThere.push(board);
      if (includeCopies) {
        plan.copies.push(board);
        plan.writes.push({ kind: "copy", name: boardCopyName(board.name), board });
      }
    } else {
      plan.add.push(board);
      plan.writes.push({ kind: "new", keepId: board.id, name: board.name, board });
    }
  }
  return plan;
}

/**
 * The boards in calls the server takes (PC16): at most `IMPORT_BATCH_MAX_BOARDS` a call, and fewer when
 * their design text would pass `IMPORT_BATCH_MAX_CHARS`. Every board goes exactly once, in order.
 */
export function importBatches(boards: readonly ImportBoard[]): ImportEntry[][] {
  const batches: ImportEntry[][] = [];
  let batch: ImportEntry[] = [];
  let chars = 0;
  for (const board of boards) {
    const length = designTextLength(board.design);
    if (batch.length > 0 && (batch.length >= IMPORT_BATCH_MAX_BOARDS || chars + length > IMPORT_BATCH_MAX_CHARS)) {
      batches.push(batch);
      batch = [];
      chars = 0;
    }
    batch.push({ id: board.id, name: board.name, design: board.design });
    chars += length;
  }
  if (batch.length > 0) batches.push(batch);
  return batches;
}

const importRequestSchema = z.object({
  entries: z
    .array(z.object({ id: z.string().nullable(), name: z.string(), design: z.unknown() }))
    .min(1)
    .max(IMPORT_BATCH_MAX_BOARDS),
  includeCopies: z.boolean(),
});

/** One call's request, untrusted: a list of 1 to 25 boards and a real yes-or-no for copies, or null. */
export function parseImportRequest(
  boards: unknown,
  includeCopies: unknown,
): { entries: ImportEntry[]; includeCopies: boolean } | null {
  const parsed = importRequestSchema.safeParse({ entries: boards, includeCopies });
  return parsed.success ? (parsed.data as { entries: ImportEntry[]; includeCopies: boolean }) : null;
}

/** The server reads every board of a call again, by the page's own rule; one that fails is named. */
export function readImportEntries(
  entries: readonly ImportEntry[],
  options: ParseSnapshotOptions,
): { boards: ImportBoard[]; failed: string[] } {
  const { boards, unreadable } = readEntries(entries, options);
  return { boards, failed: unreadable };
}

/**
 * The order an arranged rack stores after an import (PC17, the founder's ruling): everything the import
 * added, copies included, at the front, the last added first — `orderWithNewBoardFirst` folded over the
 * added ids in the order they were written, so every other board stands where a save would leave it.
 */
export function orderWithImportedBoardsFirst(
  savedEntries: readonly SavedRackEntry[],
  stored: readonly string[],
  addedIds: readonly string[],
): string[] {
  return addedIds.reduce<string[]>((order, id) => orderWithNewBoardFirst(savedEntries, order, id), [...stored]);
}

/** What listMyBoardIds answers: the signed-in shaper's own board ids, for the preview. */
export type ListMyBoardIdsResult = { signedIn: true; ids: string[] } | { signedIn: false };

/** What importMyDesigns answers for one call. */
export type ImportMyDesignsResult =
  | { imported: true; added: number; alreadyThere: number; copies: number; failed: string[] }
  | { imported: false; reason: "signed-out" | "invalid" };

/** An import's running totals, summed over its calls. */
export interface ImportTotals {
  added: number;
  alreadyThere: number;
  copies: number;
  failed: string[];
}

/** No boards yet. */
export const NO_IMPORT_TOTALS: ImportTotals = Object.freeze({ added: 0, alreadyThere: 0, copies: 0, failed: [] }) as ImportTotals;

/** Two totals added together. */
export function addImportTotals(a: ImportTotals, b: ImportTotals): ImportTotals {
  return {
    added: a.added + b.added,
    alreadyThere: a.alreadyThere + b.alreadyThere,
    copies: a.copies + b.copies,
    failed: [...a.failed, ...b.failed],
  };
}
