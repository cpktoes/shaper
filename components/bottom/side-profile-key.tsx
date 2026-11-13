/**
 * The side view's bottom line at the rail, and (from the second step) its key — shared by BOTTOM's side view and the Board
 * file preview's, so the two draw the same dashes and say the same words (quick 261112-ogx).
 */

/**
 * The bottom at the rail, as drawn in the side views and their keys: dashed like the GUIDE's pushed setting, but in the
 * full muted ink and a little heavier (the GUIDE's own token is a 75% tint, too pale to tell from the ink edge beside it
 * when the two lines lie 5 dots apart). The muted ink is the app's own and reads on the panel and the board fill in every
 * theme; it is distinct from the faint station lines and the marked station's dash-dot.
 *
 * This is the Board file preview's `RAIL_LINE`, moved here. The numbers are screen dots; `px` is how many drawing units one
 * dot is (1 where the drawing's units are dots).
 */
export function railLineProps(px: number) {
  return {
    stroke: "var(--surf-ink-muted)",
    strokeWidth: 1.5 * px,
    strokeDasharray: `${3 * px} ${2 * px}`,
  } as const;
}
