/**
 * Clearing a station read-out from under the viewer's toolbar on a short screen (quick 261114-loa; the founder's pick of
 * 2026-11-14: "move the readings clear"). On a phone held sideways the board is drawn turned, so the three station
 * read-outs (Nose @ 12", Center, Tail @ 12") run along the top of the drawing — and the toolbar's buttons, pinned over
 * the drawing's top-right corner, sat on the Tail one (quick 261018-e6w's note). The read-out whose box would lie under
 * the toolbar slides along the board, toward the nose, by just enough to sit a gap clear of the toolbar's left edge; its
 * tick stays on the true station and the extension line bends to carry it across, exactly as a read-out pushed off its
 * station by a neighbour already does (`OutputRail`'s `readoutY`). Pure: screen dots in, screen dots out.
 */

export interface ReadoutClearInput {
  /** The read-out's text box on the screen, in CSS dots from the drawing's own top-left corner. */
  readout: { left: number; right: number; top: number; bottom: number };
  /** The toolbar's box, pinned to the drawing's top-right corner: how wide and how tall it stands. */
  clear: { width: number; height: number };
  /** The drawing's own width on the screen. */
  drawingWidth: number;
  /** The air kept between the read-out and the toolbar. */
  gap: number;
}

/**
 * How many screen dots the read-out has to move toward the nose (left) to clear the toolbar: 0 when its box already
 * stands clear — below the toolbar, or left of it by the gap — or when there is no toolbar at all.
 */
export function readoutShiftLeftPx({ readout, clear, drawingWidth, gap }: ReadoutClearInput): number {
  if (clear.width <= 0 || clear.height <= 0) return 0;
  const toolbarLeft = drawingWidth - clear.width;
  const toolbarBottom = clear.height;
  const under = readout.right > toolbarLeft - gap && readout.top < toolbarBottom + gap;
  if (!under) return 0;
  return readout.right - (toolbarLeft - gap);
}

/** A read-out's text box on the screen, in CSS dots from the drawing's own top-left corner. */
export type ReadoutBox = { left: number; right: number; top: number; bottom: number };

/**
 * The slide for every read-out of the row, nose to tail, when the tail end of the row runs under the toolbar: the last
 * read-out slides clear (`readoutShiftLeftPx`), and each read-out before it slides on only as far as the one after it
 * needs — a slid read-out that would run into its neighbour pushes the neighbour along by the overlap plus the same gap,
 * and so on toward the nose (the spread the wing chips already make, quick 261014-wii). A read-out that nothing pushes
 * stays on its station: 0. On a board long enough for the row to spread, only the last moves.
 */
export function readoutRowShiftsLeftPx(
  readouts: readonly ReadoutBox[],
  clear: { width: number; height: number },
  drawingWidth: number,
  gap: number,
): number[] {
  const shifts = readouts.map(() => 0);
  if (readouts.length === 0) return shifts;
  const last = readouts.length - 1;
  shifts[last] = readoutShiftLeftPx({ readout: readouts[last], clear, drawingWidth, gap });
  for (let i = last - 1; i >= 0; i--) {
    const nextLeft = readouts[i + 1].left - shifts[i + 1];
    const overlap = readouts[i].right + gap - nextLeft;
    if (shifts[i + 1] > 0 && overlap > 0) shifts[i] = overlap;
  }
  return shifts;
}
