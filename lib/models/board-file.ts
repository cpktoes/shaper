/**
 * One board as a file (quick 261103-k8o, 2026-11-03). The founder: "I can download my board data from
 * the site, but I need a way to upload it (or send a board to a friend)." A saved board's ⋯ menu on the
 * Board Rack saves that one board as a small file, and Open a board file… on the home page opens such a
 * file as a new, unsaved board (R1a). A file, never a web link, and no database change of any kind (R2):
 * the file is made in the browser from the board on the rack, and a board opened from a file reaches the
 * account only through the ordinary Save, which reads it again on the server.
 *
 * The file (PC1): `{ about, fileVersion: 1, kind: "board", exportedAt, board: { name, design } }`, where
 * `design` is the very envelope a saved board's row holds (`buildSnapshot`). No board id, no account, no
 * lock, no settings and no dates but when the file was made — a board handed to a friend carries the
 * board and nothing else. Its name is `<board name>.shaper-board.json`, made safe for any computer (PC2).
 *
 * Reading one (PC3, PC4). A file is anyone's, so nothing in it is trusted: the outer shape is checked
 * with Zod, the board goes through the save reader (`parseSnapshot` — bounded numbers, lengths and
 * strings, older versions brought forward) and then through the rack's own drawing check
 * (`rackBoardFigures`), which is the exact rule a saved board must pass to stand on the rack — so a file
 * can never open a board the rack would later leave out. Open a board file… also takes a whole Export my
 * designs file holding exactly one board; one holding more is refused with its count (Import my designs,
 * on the Your data page, is the way in for those — plan 02). Every other key in a file, the download's
 * `settings` included, is never read.
 *
 * The readers never throw. Anything they cannot trust answers a plain reason (`too-big`, `not-ours`,
 * `no-boards`, `many-boards`, `unreadable`), so the home page can say so in one quiet line and change
 * nothing, the way `parseOpenBoardCopy` (`open-board.ts`) answers null.
 *
 * Nothing is converted (CLAUDE.md Rule 2): a file is the stored data, every length in millimetres,
 * whichever units the shaper views in.
 *
 * Pure: no React, browser or database import.
 */
import { z } from "zod";
import { buildSnapshot, parseSnapshot, type DesignSnapshot, type DesignSnapshotFields, type ParseSnapshotOptions } from "./design-snapshot";
import { rackBoardFigures } from "./rack-models";

/** The version of the board file's own outer shape (not of the board inside it). */
export const BOARD_FILE_VERSION = 1;

/** What marks a one-board file apart from a whole Export my designs file. */
export const BOARD_FILE_KIND = "board";

/** Every board file's name ends with this. */
export const BOARD_FILE_EXTENSION = ".shaper-board.json";

/** The file picker's filter: both a board file and an Export my designs file are `.json`. */
export const BOARD_FILE_ACCEPT = ".json,application/json";

/** The biggest file Open a board file… reads (PC3, T-k8o-02): one board is about 7 KB, and a hundred
 * boards' Export my designs file under half a megabyte, so 20 MB is far past anything real. */
export const BOARD_FILE_MAX_BYTES = 20 * 1024 * 1024;

/** The longest board name a file can bring in, in whole letters (PC4). */
export const BOARD_NAME_MAX_LENGTH = 200;

/** The longest board name a file is NAMED with, in whole letters, before the extension (PC2). */
const FILE_NAME_MAX_LENGTH = 80;

/** A file name for a board with no name the computer can use. */
export const UNTITLED_BOARD_NAME = "Untitled Board";

/** The file's first line, for anyone who opens it in another program (PC1). */
export const BOARD_FILE_ABOUT =
  "One surfboard design from Shaper Assistant (www.shaperassistant.com). Open it with Open a board file… " +
  "on the home page; it opens as a new board. Lengths are in millimetres, angles in degrees and volume in " +
  "litres, whichever units you view it in.";

/** One board as a file (PC1). */
export interface BoardFile {
  about: string;
  fileVersion: typeof BOARD_FILE_VERSION;
  kind: typeof BOARD_FILE_KIND;
  exportedAt: string;
  board: { name: string; design: DesignSnapshot };
}

/** The file for one board: its name and its design as a save stores it, under that name. */
export function buildBoardFile(name: string, fields: DesignSnapshotFields, now: Date): BoardFile {
  return {
    about: BOARD_FILE_ABOUT,
    fileVersion: BOARD_FILE_VERSION,
    kind: BOARD_FILE_KIND,
    exportedAt: now.toISOString(),
    board: { name, design: buildSnapshot({ ...fields, boardName: name }) },
  };
}

/** The file as text, with two-space indents, the way Export my designs writes its own. */
export function boardFileText(file: BoardFile): string {
  return JSON.stringify(file, null, 2);
}

/** Every character a computer refuses in a file name, and every control character. */
const UNSAFE_FILE_NAME_CHARACTERS = /[/\\:*?"<>|\u0000-\u001f\u007f]/g;

/**
 * `<board name>.shaper-board.json`, safe on any computer (PC2): each refused character becomes a space,
 * runs of spaces become one, leading dots and surrounding spaces and dots are trimmed, and the name is
 * cut to 80 whole letters — counted by `Array.from`, so an emoji is never split. Nothing left is an
 * untitled board. So `Fish 5'10"` saves as `Fish 5'10.shaper-board.json`.
 */
export function boardFileName(name: string): string {
  const cleaned = name
    .replace(UNSAFE_FILE_NAME_CHARACTERS, " ")
    .replace(/\s+/g, " ")
    .replace(/^[\s.]+|[\s.]+$/g, "");
  const cut = Array.from(cleaned).slice(0, FILE_NAME_MAX_LENGTH).join("").replace(/[\s.]+$/, "");
  return `${cut === "" ? UNTITLED_BOARD_NAME : cut}${BOARD_FILE_EXTENSION}`;
}

/** A one-board file's outer shape; the board inside is read by `readBoardEntry`. */
const oneBoardFileSchema = z.object({
  fileVersion: z.literal(BOARD_FILE_VERSION),
  kind: z.literal(BOARD_FILE_KIND),
  board: z.looseObject({}),
});

/** An Export my designs file's outer shape (`lib/account/account-data.ts`); each board is read on its own. */
const designsFileSchema = z.object({
  fileVersion: z.literal(1),
  boards: z.array(z.unknown()),
});

/** What is in a file, before any board is read: its kind and its boards, each still unread. */
export type BoardFileContents =
  | { ok: true; kind: "board" | "designs"; entries: unknown[] }
  | { ok: false; problem: "too-big" | "not-ours" };

/** The outer shape of a file's text: a one-board file, an Export my designs file, or neither. */
export function readBoardFileContents(text: string): BoardFileContents {
  if (text.length > BOARD_FILE_MAX_BYTES) return { ok: false, problem: "too-big" };
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { ok: false, problem: "not-ours" };
  }
  const one = oneBoardFileSchema.safeParse(value);
  if (one.success) return { ok: true, kind: "board", entries: [one.data.board] };
  const designs = designsFileSchema.safeParse(value);
  if (designs.success) return { ok: true, kind: "designs", entries: designs.data.boards };
  return { ok: false, problem: "not-ours" };
}

/** One board entry's shape — the same two keys in both kinds of file. */
const boardEntrySchema = z.object({ name: z.string(), design: z.unknown() });

/** A board name from a file: trimmed and cut to 200 whole letters (PC4). */
function boardNameFrom(raw: string): string {
  return Array.from(raw.trim()).slice(0, BOARD_NAME_MAX_LENGTH).join("").trimEnd();
}

/**
 * One board from a file, or null when it can't be opened — never throws (PC4). Readable means the save
 * reader takes its design (a Phase 11 blank carried over with `options.tipStyle`, PC9) AND the rack can
 * draw it. The entry's own name wins over the design's `boardName`, which is set to it, as a save pins it.
 */
export function readBoardEntry(
  entry: unknown,
  options: ParseSnapshotOptions,
): { name: string; fields: DesignSnapshotFields } | null {
  const shape = boardEntrySchema.safeParse(entry);
  if (!shape.success) return null;
  const name = boardNameFrom(shape.data.name);
  try {
    const fields = { ...parseSnapshot(shape.data.design, options), boardName: name };
    rackBoardFigures(fields);
    return { name, fields };
  } catch {
    return null;
  }
}

/** What Open a board file… makes of a file (PC3). */
export type OneBoardFileResult =
  | { ok: true; name: string; fields: DesignSnapshotFields }
  | { ok: false; problem: "too-big" | "not-ours" | "no-boards" | "unreadable" }
  | { ok: false; problem: "many-boards"; count: number };

/**
 * The board in a one-board file, or in an Export my designs file holding exactly one; otherwise the
 * reason it can't open. A file holding many boards is refused by its count, without reading them.
 */
export function readOneBoardFile(text: string, options: ParseSnapshotOptions): OneBoardFileResult {
  const contents = readBoardFileContents(text);
  if (!contents.ok) return contents;
  if (contents.entries.length === 0) return { ok: false, problem: "no-boards" };
  if (contents.entries.length > 1) return { ok: false, problem: "many-boards", count: contents.entries.length };
  const board = readBoardEntry(contents.entries[0], options);
  return board === null ? { ok: false, problem: "unreadable" } : { ok: true, ...board };
}
