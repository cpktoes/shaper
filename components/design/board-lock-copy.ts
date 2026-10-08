/**
 * Every word the board lock puts on screen (quick 261008-lsy), in one place so the Board Rack's menu,
 * the rack's padlock, the top bar's Unlock button and the browser tests all read the same strings.
 * "Lock board" and "Board Locked" are the founder's own words (2026-10-08).
 *
 * Pure: no React, browser or database import.
 */
export const BOARD_LOCK_COPY = {
  /** The Board Rack menu row while a board is not locked. */
  lockBoard: "Lock board",
  /** The same row, ticked, while a board is locked. */
  boardLocked: "Board Locked",
  /** The padlock beside a locked board's name: its name for a screen reader and its tooltip. */
  padlock: "Locked",
  /** The top bar's button that takes the place of Save on a locked board. */
  unlock: "Unlock",
  /** The same button's name for a screen reader (mirrors "Save Board"). */
  unlockLabel: "Unlock Board",
  unlocking: "Unlocking…",
  /** The failed face of the Unlock button; pressing it tries again. */
  notUnlocked: "Not unlocked",
  unlockTitle: "This board is locked so it can't be changed by accident. Unlock it to change it.",
  /** Announced (not shown) after a board is locked from the rack. */
  locked: (name: string) => `Locked ${name}. It can't be changed until it's unlocked.`,
  /** Announced (not shown) after a board is unlocked from the rack. */
  unlocked: (name: string) => `Unlocked ${name}.`,
  lockFailed: "Couldn't lock — try again.",
  unlockFailed: "Couldn't unlock — try again.",
} as const;
