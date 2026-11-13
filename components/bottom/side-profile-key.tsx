import { BOTTOM_COPY } from "./bottom-copy";

/**
 * The side view's bottom line at the rail and its key — shared by BOTTOM's side view and the Board file preview's, so the
 * two draw the same dashes and say the same words (quick 261112-ogx).
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

/**
 * The side view's key entries: a short swatch in the line's own stroke, then what the line is. The stringer's is the board's
 * ink edge, solid; the rail's is the dashed line the drawing gives it (`railLineProps`). Two entries when the bottom parts
 * from the stringer's line, otherwise the one entry that says the two are the same. It renders the entries only; each
 * caller wraps them in its own row.
 */
export function SideProfileKey({ twoLines, railWord }: { twoLines: boolean; railWord: string }) {
  return twoLines ? (
    <>
      <KeyEntry which="stringer" word={BOTTOM_COPY.sideKeyStringer} />
      <KeyEntry which="rail" word={railWord} />
    </>
  ) : (
    <KeyEntry which="one" word={BOTTOM_COPY.sideKeyOneLine} />
  );
}

function KeyEntry({ which, word }: { which: "stringer" | "rail" | "one"; word: string }) {
  const dashed = which === "rail";
  return (
    <div data-side-profile-key={which} className="flex items-center gap-1.5">
      <svg aria-hidden width={24} height={6} viewBox="0 0 24 6" className="flex-none">
        <line x1={0} x2={24} y1={3} y2={3} {...(dashed ? railLineProps(1) : { stroke: "var(--outline-ink)", strokeWidth: 1.1 })} />
      </svg>
      <span>{word}</span>
    </div>
  );
}
