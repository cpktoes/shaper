import { describe, expect, it } from "vitest";
import { rackBoardFigures, rackModelsFromRows } from "@/lib/models/rack-models";
import { standInRackRows } from "@/lib/models/rack-stand-in";
import { drawnSpan, halfExtent, spineAnchorX, type RackBoardArt } from "./rack-art";
import {
  HOVER_SLOT,
  HOVER_WORD_SIZE,
  RACK_REFERENCE_LENGTH_MM,
  SPINE_CLEARANCE,
  SPINE_GLYPH_EM,
  SPINE_HALO_WIDTH,
  SWIPE_SLOT,
  SWIPE_WORD_SIZE,
  boardExtra,
  hoverRackLayout,
  hoverSlotPosition,
  rackRoomOffsets,
  rackScale,
  spineWordColumn,
  swipeSlotCentre,
  swipeSlotFor,
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
const WORD_SIZE = HOVER_WORD_SIZE;
/** The furthest a glyph reaches from the words' baseline: one whole font size (Inter's own ascent
 * is 0.97 of it). Stated here rather than borrowed from the layout, so this check stands apart from
 * the figure it checks. */
const GLYPH_REACH_EM = 1;
/** How far the words reach left of their baseline: the glyphs, plus the half of the halo's stroke
 * (as the rack draws it) that shows beyond them. */
const WORDS_REACH = GLYPH_REACH_EM * WORD_SIZE + SPINE_HALO_WIDTH / 2;
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
  // Laid out exactly as hover-rack.tsx lays it out, in the 960 dots a wide window gives the rack.
  const layout = hoverRackLayout({
    count: arts.length,
    contentWidth: 960,
    longestMm: Math.max(...arts.map((art) => art.length)),
    widestHalfMm: Math.max(...arts.map((art) => halfExtent(art, HALF_TURN, 1))),
    wordColumnPx: spineWordColumn(WORD_SIZE),
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
  return boardExtra(halfExtent(art, theta, scale), HOVER_SLOT, spineWordColumn(WORD_SIZE));
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
    wordsK: cK + spineAnchorX(artK, thetaK, scale, WORD_SIZE) - WORDS_REACH,
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

describe("the room a board's words take is the room the rack draws them in", () => {
  it.each(CASES)("$label: from the board's drawn edge to the far side of the words' halo, plus the clearance", (rack) => {
    const scale = rack.layout.scale;
    for (const art of rack.arts) {
      for (let degrees = 0; degrees <= 90; degrees += 5) {
        const theta = (degrees * Math.PI) / 180;
        const farSide = spineAnchorX(art, theta, scale, WORD_SIZE) - SPINE_GLYPH_EM * WORD_SIZE - SPINE_HALO_WIDTH / 2;
        expect(drawnSpan(art, theta).left * scale - farSide + SPINE_CLEARANCE).toBeCloseTo(spineWordColumn(WORD_SIZE), 9);
      }
    }
  });
});

describe("a rack resting on any board stays inside its rack", () => {
  it.each(CASES)("$label: every board's room runs from the label gutter to the end of its row, never past", (rack) => {
    const { layout } = rack;
    // Where each row's own slots and reserve end.
    const rowEnd = rack.positions.map(
      ({ row }) => layout.gutter + layout.reserve + rack.positions.filter((position) => position.row === row).length * layout.slot,
    );
    const outside: string[] = [];
    rack.arts.forEach((_, rested) => {
      const thetas = rack.arts.map((__, k) => (k === rested ? HALF_TURN : 0));
      const xs = centres(rack, thetas);
      rack.arts.forEach((art, k) => {
        // A board's room — the button laid over it — is its slot plus the extra it opens, centred.
        const half = (HOVER_SLOT + extraAt(art, thetas[k], layout.scale)) / 2;
        if (xs[k] - half < layout.gutter - 1e-9) {
          outside.push(`resting on ${rested + 1}: board ${k + 1} reaches ${(layout.gutter - (xs[k] - half)).toFixed(2)} into the label gutter`);
        }
        if (xs[k] + half > rowEnd[k] + 1e-9) {
          outside.push(`resting on ${rested + 1}: board ${k + 1} reaches ${(xs[k] + half - rowEnd[k]).toFixed(2)} past its row`);
        }
      });
    });
    expect(outside, outside.slice(0, 12).join("\n")).toEqual([]);
  });
});

describe("a resting rack keeps to its slots", () => {
  it.each(CASES)("$label: no board at rest asks for room beyond its 48-dot slot", (rack) => {
    for (const art of rack.arts) expect(extraAt(art, 0, rack.layout.scale)).toBe(0);
  });

  it("the phone's 40-dot slots with its 11px words: no practice board at rest asks for more on a 390 × 664 phone", () => {
    const arts = rackModelsFromRows(standInRackRows(15)).map((model) => rackBoardFigures(model.snapshot).art);
    // The UI-SPEC's worked phone (§1, 3.19 dots per inch for this quiver) draws its tallest board 357
    // dots tall. Not the whole phone range: from about R 384 for this quiver, and from about R 304
    // for a quiver of boards all under 7'0", a resting side view and its 11px words are wider than
    // a 40-dot slot, so a swipe rack passing this column opens a little even at rest.
    const scale = rackScale(357, Math.max(...arts.map((art) => art.length)));
    const column = spineWordColumn(SWIPE_WORD_SIZE);
    for (const art of arts) expect(boardExtra(halfExtent(art, 0, scale), SWIPE_SLOT, column)).toBe(0);
  });
});

/**
 * The same rule on the phone's and iPad's swipe rack (15-07): one long track of slots, every board
 * turning by its distance from the middle of the screen, the rack opening around the turning boards.
 * Its slot is `swipeSlotFor` the quiver at that height — 40 dots, or wider where a resting board and
 * its 11px words would not fit 40 — and the turn's reach is one slot (UI-SPEC §2). Checked at every
 * drawn height the swipe rack can take, 220 to 420 in 20-dot steps, for the practice quiver and for a
 * quiver of boards all under 7'0" (which the 7'0" reference draws at the larger scale).
 */
const SWIPE_COLUMN = spineWordColumn(SWIPE_WORD_SIZE);
/** How far the phone's words reach left of their baseline: the glyphs and the halo beyond them. */
const SWIPE_WORDS_REACH = GLYPH_REACH_EM * SWIPE_WORD_SIZE + SPINE_HALO_WIDTH / 2;
/** A phone's width: the track's geometry depends on it only through the end padding. */
const SWIPE_VIEWPORT = 390;
const SWIPE_HEIGHTS = Array.from({ length: 11 }, (_, step) => 220 + step * 20);

interface SwipeCase {
  label: string;
  arts: RackBoardArt[];
}

function swipeQuiver(label: string, keep: (art: RackBoardArt) => boolean = () => true): SwipeCase {
  const arts = rackModelsFromRows(standInRackRows(15))
    .map((model) => rackBoardFigures(model.snapshot).art)
    .filter(keep);
  return { label, arts };
}

const SWIPE_QUIVERS: SwipeCase[] = [
  swipeQuiver("the practice quiver"),
  swipeQuiver("boards all under 7'0\"", (art) => art.length < RACK_REFERENCE_LENGTH_MM),
];

/** The swipe rack's scale and slot at drawn height `rackHeight`, exactly as swipe-rack.tsx works them out. */
function swipeGeometry(arts: readonly RackBoardArt[], rackHeight: number) {
  const scale = rackScale(rackHeight, Math.max(...arts.map((art) => art.length)));
  const slot = swipeSlotFor(
    arts.map((art) => halfExtent(art, 0, scale)),
    SWIPE_COLUMN,
  );
  return { scale, slot };
}

/** What crosses what on the swipe track for these angles: neighbours' bodies, and any visible words
 * against the board to their left. Positions are the slot centres plus the room the track opens. */
function swipeCrossings(arts: readonly RackBoardArt[], thetas: readonly number[], scale: number, slot: number): string[] {
  const extras = arts.map((art, k) => boardExtra(halfExtent(art, thetas[k], scale), slot, SWIPE_COLUMN));
  const offsets = rackRoomOffsets(extras);
  const xs = arts.map((_, k) => swipeSlotCentre(k, SWIPE_VIEWPORT, slot) + offsets[k]);
  const found: string[] = [];
  for (let k = 1; k < arts.length; k++) {
    const j = k - 1;
    const rightJ = xs[j] + drawnSpan(arts[j], thetas[j]).right * scale;
    const leftK = xs[k] + drawnSpan(arts[k], thetas[k]).left * scale;
    const wordsK = xs[k] + spineAnchorX(arts[k], thetas[k], scale, SWIPE_WORD_SIZE) - SWIPE_WORDS_REACH;
    if (rightJ > leftK) found.push(`boards ${j + 1} and ${k + 1} overlap by ${(rightJ - leftK).toFixed(2)}`);
    if (Math.cos(thetas[k]) > VISIBLE && wordsK < rightJ) {
      found.push(`board ${k + 1}'s words cross board ${j + 1} by ${(rightJ - wordsK).toFixed(2)}`);
    }
  }
  return found;
}

/** The angles the swipe rack shows: each board settled in the middle alone, and the middle of the
 * screen swept from a slot before the first board to a slot past the last, in eighth-of-a-slot steps. */
function swipeStates(arts: readonly RackBoardArt[], slot: number): { label: string; thetas: number[] }[] {
  const states = arts.map((_, rested) => ({
    label: `resting on board ${rested + 1}`,
    thetas: arts.map((__, k) => (k === rested ? HALF_TURN : 0)),
  }));
  const first = swipeSlotCentre(0, SWIPE_VIEWPORT, slot) - slot;
  const last = swipeSlotCentre(arts.length - 1, SWIPE_VIEWPORT, slot) + slot;
  for (let step = 0; first + (step * slot) / 8 <= last; step++) {
    const middle = first + (step * slot) / 8;
    states.push({
      label: `the middle at ${middle.toFixed(1)}`,
      thetas: arts.map((_, k) => turnAngle(middle - swipeSlotCentre(k, SWIPE_VIEWPORT, slot), slot)),
    });
  }
  return states;
}

describe("R4 on the phone's swipe rack: no word ever crosses a board, at every height it draws", () => {
  for (const quiver of SWIPE_QUIVERS) {
    it.each(SWIPE_HEIGHTS)(`${quiver.label}, drawn %i tall: at rest every board keeps to its slot`, (rackHeight) => {
      const { scale, slot } = swipeGeometry(quiver.arts, rackHeight);
      expect(slot).toBeGreaterThanOrEqual(SWIPE_SLOT);
      for (const art of quiver.arts) expect(boardExtra(halfExtent(art, 0, scale), slot, SWIPE_COLUMN)).toBe(0);
    });

    it.each(SWIPE_HEIGHTS)(`${quiver.label}, drawn %i tall: resting on each board, and the middle swept along the track`, (rackHeight) => {
      const { scale, slot } = swipeGeometry(quiver.arts, rackHeight);
      const states = swipeStates(quiver.arts, slot);
      const failing = states.flatMap(({ label, thetas }) => {
        const found = swipeCrossings(quiver.arts, thetas, scale, slot);
        return found.length > 0 ? [`${label}: ${found.join("; ")}`] : [];
      });
      expect(failing.length, `slot ${slot}; ${failing.length} of ${states.length} states:\n${failing.slice(0, 12).join("\n")}`).toBe(0);
    });
  }

  it("on the UI-SPEC's iPhone 14 page (drawn about 357 tall) the practice quiver keeps the 40-dot slot", () => {
    expect(swipeGeometry(SWIPE_QUIVERS[0].arts, 357).slot).toBe(SWIPE_SLOT);
    expect(swipeGeometry(SWIPE_QUIVERS[0].arts, 358).slot).toBe(SWIPE_SLOT);
  });

  it("at the 420 cap the slot widens past 40 rather than let a resting board crowd its neighbour's words", () => {
    expect(swipeGeometry(SWIPE_QUIVERS[0].arts, 420).slot).toBeGreaterThan(SWIPE_SLOT);
    expect(swipeGeometry(SWIPE_QUIVERS[1].arts, 420).slot).toBeGreaterThan(SWIPE_SLOT);
  });
});
