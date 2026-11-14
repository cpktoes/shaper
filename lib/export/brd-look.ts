/**
 * Reading a `.brd` and working out its whole look in one pure call (quick 261113-kvo, Task 3): the file's bytes in, the closest-fit
 * look and the board it opens as (or the one reason it cannot be looked at) out. The fit is slow work (a second or more on the app's
 * own long boards), so the home page runs it in a background worker (`components/setup/brd-look.worker.ts`) and keeps itself live
 * while the file is read; when a worker cannot be made it runs the very same call on the page, after the "Reading the file…" line has
 * painted. One function serves both, so the two cannot disagree.
 *
 * The result crosses from the worker to the page by structured clone: plain numbers, strings, booleans, arrays and objects only, no
 * function and no class instance (a test holds that). Nothing leaves the browser.
 *
 * Pure: no React, browser or database import (CLAUDE.md Rule 1).
 */
import type { Mm } from "../geometry/units";
import { brdBoardFields } from "../models/brd-board";
import type { DesignSnapshotFields } from "../models/design-snapshot";
import { brdFitLook, type BrdFitLook } from "./brd-fit-preview";
import { BRD_READ_MAX_BYTES, readAnyBrd } from "./brd-read";

/** The look and its fields, or the one reason a file cannot be looked at (`length` is the out-of-range board's own). */
export type BrdLookResult =
  | { ok: true; look: BrdFitLook; fields: DesignSnapshotFields | null }
  | { ok: false; problem: "unreadable" | "out-of-range" | "too-big"; length?: Mm };

/**
 * Reads `bytes` as a board file, fits it, and works out the board its closest fit opens as, under `fileName`. Never throws: any
 * failure is `unreadable`. `fields` is null only if the board reader would refuse the fit (which its clamping means never happens).
 */
export function brdLookFromBytes(bytes: Uint8Array, fileName: string): BrdLookResult {
  try {
    if (bytes.length > BRD_READ_MAX_BYTES) return { ok: false, problem: "too-big" };
    const read = readAnyBrd(bytes);
    if (!read.ok) return read.problem === "out-of-range" ? { ok: false, problem: "out-of-range", length: read.length } : { ok: false, problem: "unreadable" };
    const look = brdFitLook(read.board);
    return { ok: true, look, fields: brdBoardFields(look.fit, fileName, look.bottom?.bottom ?? null, look.rails?.rails ?? null, look.fins) };
  } catch {
    return { ok: false, problem: "unreadable" };
  }
}
