/**
 * Every word the board's name in the tab band puts on screen (quick 261008-raw — the founder,
 * 2026-10-08: "we need to know what board we're on"), in one place so the band, its tooltip and the
 * browser tests all read the same strings.
 *
 * A board that has never been saved is "Untitled" in the band, even when a name has already been
 * typed into SUMMARY's Board Name box (the founder's answer, 2026-10-08): the band says what is
 * true — nothing is saved yet — and the popup that opens from it starts with the typed name so
 * nothing the shaper wrote is lost.
 *
 * Pure: no React, browser or database import.
 */
export const BOARD_NAME_COPY = {
  /** What the band reads for a board that has never been saved. */
  untitled: "Untitled",
} as const;

/** The name the band shows: "Untitled" until the board is saved, then its name ("Untitled" again if
 * the stored name is somehow blank). */
export function bandBoardName(modelId: string | null, boardName: string): string {
  if (modelId === null) return BOARD_NAME_COPY.untitled;
  const trimmed = boardName.trim();
  return trimmed === "" ? BOARD_NAME_COPY.untitled : trimmed;
}

/**
 * The band button's name for a screen reader — what it is, and what pressing it does. A saved
 * board renames; a never-saved one is named and saved.
 */
export function boardNameButtonLabel(name: string, state: { saved: boolean; locked: boolean }): string {
  if (!state.saved) return `Board name: ${name} — name and save`;
  return state.locked ? `Board name: ${name}, locked — rename` : `Board name: ${name} — rename`;
}
