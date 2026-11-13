import type { Page } from "@playwright/test";
import { presetDesignFields } from "../../lib/blanks/preset-blanks";
import {
  BOTTOM_SECTIONS,
  DEFAULT_BOTTOM,
  pickCut,
  resolveBottom,
  startingChannels,
  type BoardBottom,
  type BottomBoard,
  type BottomCutName,
  type BottomSectionKey,
  type ChannelCount,
  type ResolvedBottom,
} from "../../lib/geometry/bottom";
import type { BoardSideProfile } from "../../lib/geometry/board-profile";
import { LIVE_DESIGN_RULES, designBottomBoard, designFinPlacement, designSideProfile } from "../../lib/geometry/design";
import { buildOutline } from "../../lib/geometry/outline";
import { BOARD_PRESETS } from "../../lib/geometry/presets";
import { DEFAULT_VOLUME_SPEC } from "../../lib/geometry/volume";
import type { DesignSnapshotFields } from "../../lib/models/design-snapshot";
import { OPEN_BOARD_STORAGE_KEY, openBoardCopyJson } from "../../lib/models/open-board";

/** Which cut each section of the bottom carries (a section left out stays flat), and how many channels. */
export interface BottomPicks {
  nose?: BottomCutName;
  center?: BottomCutName;
  tail?: BottomCutName;
  channels?: ChannelCount;
}

/** A stock board with a bottom picked on it, as the app itself would hold it. */
export interface BoardWithBottom {
  /** The copy this browser keeps of an open board (`shaper-open-board`), written by the app's own writer. */
  kept: string;
  /** The board the bottom's maths reads — length, widths, fins — worked out by the app's own functions. */
  board: BottomBoard;
  /** The planed side profile (rocker and thickness) the bottom's maths and the side view read. */
  profile: BoardSideProfile;
  /** The bottom as it is stored. */
  bottom: BoardBottom;
  /** The bottom with every figure worked out, as the BOTTOM screen and the printed page read it. */
  resolved: ResolvedBottom;
  /** Whether the board has a front pair of fins (a single fin has none) — the printed page's fit rule asks. */
  frontPair: boolean;
}

/**
 * A stock board (`shortboard`, `fish`, `midlength`, `longboard`) with these cuts picked — each at the starting numbers
 * the BOTTOM screen itself would give it on that board (`pickCut`, `startingChannels`), never a typed figure. A test
 * that prints a bottom starts here instead of clicking through BOTTOM's menus, which the BOTTOM specs already cover;
 * and it reads every number it expects on the page from `board` and `resolved` through the app's own unit rules.
 */
export function boardWithBottom(presetId: string, picks: BottomPicks): BoardWithBottom {
  const preset = BOARD_PRESETS.find((p) => p.id === presetId);
  if (!preset) throw new Error(`No stock board named ${presetId}`);
  const fields: Omit<DesignSnapshotFields, "bottom"> = {
    ...presetDesignFields(preset),
    volume: DEFAULT_VOLUME_SPEC,
    finsImportTemplate: true,
    railsImportFoilThickness: true,
    boardName: "",
    finSystem: "fcs2",
  };
  const fins = designFinPlacement(fields);
  const profile = designSideProfile(fields, LIVE_DESIGN_RULES);
  const board = designBottomBoard(fields.outline, buildOutline(fields.outline), profile, fins);
  let bottom: BoardBottom = DEFAULT_BOTTOM;
  for (const section of BOTTOM_SECTIONS) {
    const name = picks[section as BottomSectionKey];
    if (name) bottom = pickCut(bottom, section, name, board);
  }
  if (picks.channels) bottom = { ...bottom, channels: startingChannels(picks.channels, board, bottom.channels) };
  return {
    kept: openBoardCopyJson({ ...fields, bottom }, { modelId: null, ownerId: null, locked: false, dirty: true }),
    board,
    profile,
    bottom,
    resolved: resolveBottom(bottom, board),
    frontPair: fins.marks.some((mark) => mark.role === "front"),
  };
}

/**
 * Opens every load of this page on that board: its kept copy is written into the browser before the app reads it, the
 * way the app itself leaves a board behind for the next visit (quick 261019-ep5). Call it before the first
 * `page.goto`. The page draws the stock board for a moment and then the kept one, so wait for something only the kept
 * board shows before reading the page.
 */
export async function openOnBoard(page: Page, board: BoardWithBottom): Promise<void> {
  await page.addInitScript(([key, value]) => window.localStorage.setItem(key, value), [OPEN_BOARD_STORAGE_KEY, board.kept] as const);
}
