/**
 * The text of a `.brd`'s fin fields (quick 261113-qyz): `p50`'s nine figures and `p51`'s word, as strings handled with the
 * same rules wherever they are read — the forgiving reader of any program's file (`brd-read.ts`) and the preview read back
 * from this app's own file (`brd-preview.ts`). Kept in a file of its own so neither imports the other.
 *
 * Pure: no React, browser or database import (CLAUDE.md Rule 1).
 */
import { BRD_FIN_WORD_MAX } from "../geometry/brd-fins";

/** A figure of the fin line stays inside this, in centimetres: far beyond any board, short of anything that breaks a sum. */
const BRD_FIN_MAX_CM = 10_000;

/**
 * A fin line's nine figures: `[a,b,c,d,e,f,g,h,i]`, every one a finite number within `BRD_FIN_MAX_CM`, or null (any other
 * line, a different count, a figure that is not a figure). The figures are centimetres, as the file has them.
 */
export function parseBrdFinLine(value: string): number[] | null {
  const match = /^\[([^\]]*)\]$/.exec(value.trim());
  if (!match) return null;
  const parts = match[1].split(",").map((part) => part.trim());
  if (parts.length !== 9 || parts.some((part) => part === "")) return null;
  const figures = parts.map(Number);
  return figures.every((n) => Number.isFinite(n) && Math.abs(n) <= BRD_FIN_MAX_CM) ? figures : null;
}

/**
 * A file's fin word (p51) as it may be shown: 1 to 32 characters of letters, digits, spaces and `+ - ( ) . / ' &`, with at
 * least one letter, trimmed; anything else (a path, a name in quotes, an empty field) is null.
 */
export function brdFinWord(value: string): string | null {
  const word = value.trim();
  if (word.length < 1 || word.length > BRD_FIN_WORD_MAX) return null;
  if (!/^[A-Za-z0-9 +\-().\/'&]+$/.test(word) || !/[A-Za-z]/.test(word)) return null;
  return word;
}

