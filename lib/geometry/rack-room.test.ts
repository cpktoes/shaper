import { describe, expect, it } from "vitest";
import { rackBoardFigures, rackModelsFromRows } from "@/lib/models/rack-models";
import { standInRackRows } from "@/lib/models/rack-stand-in";
import { drawnSpan, halfExtent, spineAnchorX, type RackBoardArt } from "./rack-art";
import {
  HOVER_SLOT,
  RACK_REFERENCE_LENGTH_MM,
  boardExtra,
  hoverRackLayout,
  hoverSlotPosition,
  rackRoomOffsets,
  turnAngle,
  type HoverRackLayout,
} from "./rack-layout";

/**
 * Phase 15, the SPEC's prohibition (R4): no word ever crosses a board — its own, or a turning
 * neighbour's. The room the computer's rack opens around a turning board has to hold the board's
 * outline AND the next board's vertical words, which stand to that board's left.
 *
 * The boards are the practice rack's own (`standInRackRows`: the four presets, then hand-set boards
 * from 5'2" to 9'4", a swallow among them), each worked out by `rackBoardFigures` — the one pipeline
 * the browser draws them from — so nothing here is a hand-typed board (CLAUDE.md Rule 1). The truth
 * every check measures against is `drawnSpan`, the drawn outline's own left and right.
 */

const HALF_TURN = Math.PI / 2;
/** The hover rack's words at their base size — before any shrink, the widest they ever stand. */
const WORD_SIZE = 12;
/** A glyph never reaches further from its baseline than one font size (Inter's ascent is 0.97). */
const GLYPH_EM = 1;
/** The words' ground-coloured halo reaches half its 3-dot stroke beyond the glyphs. */
const HALO_REACH = 1.5;
/** Words this faint (`cos θ`) are as good as gone; fainter ones are not checked. */
const VISIBLE = 0.05;

/** A rack of the practice boards, laid out exactly as the hover rack lays them out. */
interface RackCase {
  label: string;
  arts: RackBoardArt[];
  layout: HoverRackLayout;
  positions: ReturnType<typeof hoverSlotPosition>[];
}

function rackCase(label: string, count: number, keep: (art: RackBoardArt) => boolean = () => true): RackCase {
  const arts = rackModelsFromRows(standInRackRows(count))
    .map((model) => rackBoardFigures(model.snapshot).art)
    .filter(keep);
  const layout = hoverRackLayout({
    count: arts.length,
    contentWidth: 960,
    longestMm: Math.max(...arts.map((art) => art.length)),
    widestHalfMm: Math.max(...arts.map((art) => art.maxHalf)),
  });
  return { label, arts, layout, positions: arts.map((_, k) => hoverSlotPosition(layout, k)) };
}

const CASES: RackCase[] = [
  rackCase("fifteen boards in one row at 380", 15),
  rackCase("thirty boards in two rows at 288", 30),
  // Only boards up to 7'0" — the 7'0" reference then sets the scale, the largest the rack draws.
  rackCase("the boards up to 7'0\" in one row at the largest scale", 15, (art) => art.length <= RACK_REFERENCE_LENGTH_MM),
];

/** Board k's extra room at angle `theta` — exactly as `stepRack` (hover-rack.tsx) works it out. */
function extraAt(art: RackBoardArt, theta: number, scale: number): number {
  return boardExtra(halfExtent(art, theta, scale), HOVER_SLOT);
}

/** Every board's drawn centre for these angles: its slot centre plus the room its row opens. */
function centres(rack: RackCase, thetas: readonly number[]): number[] {
  const extras = rack.arts.map((art, k) => extraAt(art, thetas[k], rack.layout.scale));
  const xs = rack.positions.map((position) => position.x);
  for (let row = 0; row < rack.layout.rows; row++) {
    const members = rack.positions.flatMap((position, k) => (position.row === row ? [k] : []));
    rackRoomOffsets(members.map((k) => extras[k])).forEach((offset, j) => {
      xs[members[j]] += offset;
    });
  }
  return xs;
}

/** Where two neighbours meet: j's right edge, k's left edge and the left edge of k's words, in dots. */
function edges(artJ: RackBoardArt, thetaJ: number, cJ: number, artK: RackBoardArt, thetaK: number, cK: number, scale: number) {
  return {
    rightJ: cJ + drawnSpan(artJ, thetaJ).right * scale,
    leftK: cK + drawnSpan(artK, thetaK).left * scale,
    wordsK: cK + spineAnchorX(artK, thetaK, scale, WORD_SIZE) - GLYPH_EM * WORD_SIZE - HALO_REACH,
  };
}

/** What crosses what between every two neighbours in a row, for these angles. */
function crossings(rack: RackCase, thetas: readonly number[]): string[] {
  const xs = centres(rack, thetas);
  const found: string[] = [];
  for (let k = 1; k < rack.arts.length; k++) {
    const j = k - 1;
    if (rack.positions[j].row !== rack.positions[k].row) continue;
    const { rightJ, leftK, wordsK } = edges(rack.arts[j], thetas[j], xs[j], rack.arts[k], thetas[k], xs[k], rack.layout.scale);
    if (rightJ > leftK) found.push(`boards ${j + 1} and ${k + 1} overlap by ${(rightJ - leftK).toFixed(2)}`);
    if (Math.cos(thetas[k]) > VISIBLE && wordsK < rightJ) {
      found.push(`board ${k + 1}'s words cross board ${j + 1} by ${(rightJ - wordsK).toFixed(2)}`);
    }
  }
  return found;
}

/** The angles the rack actually shows: each board rested on alone, and the cursor swept along each
 * row in eighth-of-a-slot steps (from a slot before its first board to a slot past its last). */
function rackStates(rack: RackCase): { label: string; thetas: number[] }[] {
  const states = rack.arts.map((_, rested) => ({
    label: `resting on board ${rested + 1}`,
    thetas: rack.arts.map((__, k) => (k === rested ? HALF_TURN : 0)),
  }));
  for (let row = 0; row < rack.layout.rows; row++) {
    const xs = rack.positions.filter((position) => position.row === row).map((position) => position.x);
    const first = Math.min(...xs) - HOVER_SLOT;
    const last = Math.max(...xs) + HOVER_SLOT;
    for (let step = 0; first + (step * HOVER_SLOT) / 8 <= last; step++) {
      const x = first + (step * HOVER_SLOT) / 8;
      states.push({
        label: `the cursor at ${x.toFixed(1)} in row ${row + 1}`,
        thetas: rack.positions.map((position) => (position.row === row ? turnAngle(x - position.x, HOVER_SLOT) : 0)),
      });
    }
  }
  return states;
}

describe("R4: no word ever crosses a turning neighbour on the computer's rack", () => {
  it.each(CASES)("$label: resting on each board, and the cursor swept along every row", (rack) => {
    const states = rackStates(rack);
    const failing = states.flatMap(({ label, thetas }) => {
      const found = crossings(rack, thetas);
      return found.length > 0 ? [`${label}: ${found.join("; ")}`] : [];
    });
    expect(failing.length, `${failing.length} of ${states.length} states:\n${failing.slice(0, 12).join("\n")}`).toBe(0);
  });

  it.each(CASES)("$label: every two neighbours at every pair of angles, in 5-degree steps", (rack) => {
    const angles = Array.from({ length: 19 }, (_, step) => (step * 5 * Math.PI) / 180);
    const scale = rack.layout.scale;
    const failing: string[] = [];
    for (let k = 1; k < rack.arts.length; k++) {
      const j = k - 1;
      if (rack.positions[j].row !== rack.positions[k].row) continue;
      for (const thetaJ of angles) {
        for (const thetaK of angles) {
          // Two neighbours stand one slot apart plus the room each opens, whatever the rest of the
          // row is doing (`rackRoomOffsets` moves them apart by half of each one's extra).
          const [offsetJ, offsetK] = rackRoomOffsets([extraAt(rack.arts[j], thetaJ, scale), extraAt(rack.arts[k], thetaK, scale)]);
          const { rightJ, leftK, wordsK } = edges(rack.arts[j], thetaJ, offsetJ, rack.arts[k], thetaK, HOVER_SLOT + offsetK, scale);
          const at = `boards ${j + 1} at ${Math.round((thetaJ * 180) / Math.PI)} and ${k + 1} at ${Math.round((thetaK * 180) / Math.PI)} degrees`;
          if (rightJ > leftK) failing.push(`${at}: overlap by ${(rightJ - leftK).toFixed(2)}`);
          if (Math.cos(thetaK) > VISIBLE && wordsK < rightJ) failing.push(`${at}: words cross by ${(rightJ - wordsK).toFixed(2)}`);
        }
      }
    }
    expect(failing.length, `${failing.length} crossings:\n${failing.slice(0, 12).join("\n")}`).toBe(0);
  });
});
