"use client";

import { memo, useId, useMemo } from "react";
import type { BottomBoard, BottomWingRule } from "@/lib/geometry/bottom";
import { CARTOON_SHADE_OPACITY, guideCartoon, type GuideCartoon, type GuideCartoonKey } from "@/lib/geometry/bottom-draw";
import type { OutlineGeometry } from "@/lib/geometry/outline";

/**
 * A GUIDE card's cartoon (Phase 17, D-17; UI-SPEC §5): the board the shaper has open, seen from below with one cut
 * alone at its starting numbers — its shade, the pencil lines a shaper would rule, the stringer, and a cutting line
 * where the cut is deepest — and, under it, the section across the board there at Height ×8, sitting on a dashed
 * straightedge (the planed bottom), with a break line when the slab is too thick for the card.
 *
 * Every shape is `guideCartoon`'s, the same maths VIEWER's two drawings use (`lib/geometry/bottom-draw.ts`), so a card
 * can never disagree with the viewer; this component only paints it (CLAUDE.md Rule 1). The colours are the viewers'
 * own drawing tokens. The dashes are written for the cartoon's 300-unit width; every line keeps a one-dot width however
 * wide the card draws (`vector-effect`).
 *
 * The picture says nothing a screen reader needs — the card's words say it — so it is hidden from one.
 */

/** The cartoon's dashes, in its own 300-wide units (UI-SPEC §5; the sketch's own). */
const DASH = { stringer: "12 3 3 3", cutLine: "7 2.5 1.5 2.5", straightedge: "4 3", trough: "1 3" } as const;

/**
 * The cartoons already worked out for a board, kept for as long as that board is the one open. Nineteen cartoons take
 * a fifth of a second to work out, so flipping back to GUIDE, or a slider moved in the panel while GUIDE is open, must
 * not work them out again: a cartoon depends on the board and the cut's name alone, never on what is cut on the board.
 * The store hands out a new board whenever its outline, thickness or fins change, and the old board's cartoons go with
 * it.
 */
const drawn = new WeakMap<BottomBoard, Map<string, GuideCartoon>>();

function cartoonFor(cut: GuideCartoonKey, board: BottomBoard, geometry: OutlineGeometry, rule: BottomWingRule): GuideCartoon {
  let ofBoard = drawn.get(board);
  if (!ofBoard) {
    ofBoard = new Map();
    drawn.set(board, ofBoard);
  }
  const key = `${rule}|${cut.section}|${"name" in cut ? cut.name : "channels"}`;
  let cartoon = ofBoard.get(key);
  if (!cartoon) {
    cartoon = guideCartoon(cut, board, geometry, rule);
    ofBoard.set(key, cartoon);
  }
  return cartoon;
}

export interface BottomCartoonProps {
  /** The cut this card names: one of the eighteen in its section, or the channels (drawn as six). */
  cut: GuideCartoonKey;
  /** The open board, its outline, and its rule for a winged outline — the store's own. */
  board: BottomBoard;
  geometry: OutlineGeometry;
  wingRule: BottomWingRule;
}

export const BottomCartoon = memo(function BottomCartoon({ cut, board, geometry, wingRule }: BottomCartoonProps) {
  const clipId = useId();
  const cartoon = useMemo(() => cartoonFor(cut, board, geometry, wingRule), [cut, board, geometry, wingRule]);
  const { stringer, cutLine, section } = cartoon;
  const cutOn = cartoon.shade.length > 0 || cartoon.pencil !== "" || cartoon.trough !== "";

  return (
    <svg
      data-guide-cartoon
      viewBox={cartoon.viewBox}
      aria-hidden="true"
      focusable="false"
      className="block h-auto w-full overflow-visible"
      fill="none"
      strokeWidth={1}
    >
      {/* The board from below. */}
      <path d={cartoon.board} fill="var(--outline-board-fill)" stroke="var(--outline-ink)" vectorEffect="non-scaling-stroke" />
      {cutOn && (
        <>
          <defs>
            <clipPath id={clipId}>
              <path d={cartoon.board} />
            </clipPath>
          </defs>
          <g clipPath={`url(#${clipId})`}>
            {/* The shade: one path per 1/32" of foam off, stacked, so a deeper cut reads darker. */}
            <g data-guide-shade fill="var(--outline-bottom-shade)" fillOpacity={CARTOON_SHADE_OPACITY}>
              {cartoon.shade.map((d, level) => (
                <path key={level} d={d} />
              ))}
            </g>
            {/* The lines a shaper would rule for this cut, in pencil, as the sketch the founder approved drew them. */}
            {cartoon.pencil !== "" && <path d={cartoon.pencil} stroke="var(--outline-pencil-line)" vectorEffect="non-scaling-stroke" />}
            {/* A double's trough line, dotted. */}
            {cartoon.trough !== "" && (
              <path d={cartoon.trough} stroke="var(--outline-station-line)" strokeDasharray={DASH.trough} vectorEffect="non-scaling-stroke" />
            )}
          </g>
        </>
      )}
      <line
        x1={stringer.x1}
        y1={stringer.y1}
        x2={stringer.x2}
        y2={stringer.y2}
        stroke="var(--outline-station-line)"
        strokeDasharray={DASH.stringer}
        vectorEffect="non-scaling-stroke"
      />
      {/* Where the section below is taken: the cut's deepest (a flat one, the wide point). */}
      <line
        x1={cutLine.x}
        y1={cutLine.y1}
        x2={cutLine.x}
        y2={cutLine.y2}
        stroke="var(--outline-ink)"
        strokeDasharray={DASH.cutLine}
        vectorEffect="non-scaling-stroke"
      />

      {/* The section there, Height ×8, the bottom down on the straightedge. */}
      {section.pieces.map((d, piece) => (
        <path key={piece} d={d} fill="var(--outline-board-fill)" stroke="var(--outline-ink)" vectorEffect="non-scaling-stroke" />
      ))}
      {section.breakPath !== null && (
        <>
          {/* The break line, over a band of the card's own colour so the slab reads as torn off, not capped. */}
          <path d={section.breakPath} stroke="var(--surf-panel)" strokeWidth={5} vectorEffect="non-scaling-stroke" />
          <path d={section.breakPath} stroke="var(--outline-ink)" vectorEffect="non-scaling-stroke" />
        </>
      )}
      {section.stringer !== null && (
        <line
          x1={section.stringer.x}
          y1={section.stringer.y1}
          x2={section.stringer.x}
          y2={section.stringer.y2}
          stroke="var(--outline-station-line)"
          strokeDasharray={DASH.stringer}
          vectorEffect="non-scaling-stroke"
        />
      )}
      <line
        x1={section.straightedge.x1}
        y1={section.straightedge.y}
        x2={section.straightedge.x2}
        y2={section.straightedge.y}
        stroke="var(--outline-ink)"
        strokeDasharray={DASH.straightedge}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
});
