import { describe, expect, it } from "vitest";
import { isPickable } from "@/lib/blanks/catalog";
import { readSeedCatalog } from "@/lib/blanks/seed-files";
import { blankStationOf, prepareBlank, type PreparedBlank } from "./blank-fit";
import {
  artPointOf,
  blankCardArt,
  boardOnBlankArt,
  FLAT_CARD_BOX,
  FLAT_CARD_FILL_BOX,
  THUMB_BOX,
  UPRIGHT_CARD_BOX,
  type ArtPoint,
  type BlankCardArt,
  type CardBox,
  type CardPose,
} from "./blank-card-art";
import { TIP_SEGMENT_SAMPLES } from "./blank-top-view";
import { DEFAULT_BOARD_SPEC } from "./board";
import { buildOutline } from "./outline";
import { silhouette } from "./screen-tiles";
import { inchesToMm, mm } from "./units";

// One blank drawn for its card (quick 261015-ve9, D-03, D-04, D-14). Every blank is a real seeded
// blank prepared by the app's own `prepareBlank`; every expected number is read off that prepared
// blank, its record or the art's own mapping — never typed (CLAUDE.md Rule 1).

const CATALOG = readSeedCatalog();
const PICKABLE: PreparedBlank[] = CATALOG.filter(isPickable).map((record) => prepareBlank(record));

const noseWidthOf = (p: PreparedBlank) => p.record.stations.find((s) => s.label === "N0")?.widthMm ?? null;
const ROUND_NOSE = PICKABLE.find((p) => p.record.vendor === "US Blanks" && noseWidthOf(p) === 0)!;
const SQUARE_NOSE = PICKABLE.find((p) => (noseWidthOf(p) ?? 0) > 0)!;

const POSES: { pose: CardPose; box: CardBox }[] = [
  { pose: "flat", box: FLAT_CARD_BOX },
  { pose: "upright", box: UPRIGHT_CARD_BOX },
  { pose: "flat", box: THUMB_BOX },
];

const EPS = 1e-6;

function allPoints(art: BlankCardArt): ArtPoint[] {
  return [...art.outline, ...art.side, ...art.widthDots, ...art.stringer, ...art.centreMark, ...art.baseline];
}

/** The along (length) and across axes for a pose. */
const along = (art: BlankCardArt, p: ArtPoint) => (art.pose === "flat" ? p.x : p.y);
const across = (art: BlankCardArt, p: ArtPoint) => (art.pose === "flat" ? p.y : p.x);

/** The art's half-widths and decks, sampled where the art sampled them: read back through the
 * mapping from the outline itself. */
function widestHalf(p: PreparedBlank): number {
  let max = 0;
  for (let i = 0; i <= 2000; i++) max = Math.max(max, p.width.sample((p.lengthMm * i) / 2000) / 2);
  return max;
}

describe("the real blanks the tests draw", () => {
  it("found a US Blanks blank with a 0-wide nose and a blank with a square nose", () => {
    expect(ROUND_NOSE).toBeDefined();
    expect(SQUARE_NOSE).toBeDefined();
    expect(PICKABLE.length).toBeGreaterThan(100);
  });
});

describe("blankCardArt — true proportion, filling its box (D-03)", () => {
  for (const { pose, box } of POSES) {
    describe(`${pose} in a ${box.width} × ${box.height} box`, () => {
      it("never stretches: the outline's length and width read the blank at one scale", () => {
        for (const p of [ROUND_NOSE, SQUARE_NOSE]) {
          const art = blankCardArt(p, pose, box);
          const lengths = art.outline.map((q) => along(art, q));
          const widths = art.outline.map((q) => across(art, q));
          expect(Math.max(...lengths) - Math.min(...lengths)).toBeCloseTo(p.lengthMm * art.scale, 6);
          const drawnHalf = (Math.max(...widths) - Math.min(...widths)) / 2 / art.scale;
          // The drawn outline's widest half-width is the widest sampled half-width, no wider than the
          // curve's own widest and within a fine sample of it.
          expect(drawnHalf).toBeLessThanOrEqual(widestHalf(p) + EPS);
          expect(drawnHalf).toBeGreaterThan(widestHalf(p) * 0.995);
          // And it is exactly twice the widest outline half-width at that scale (mirror symmetric).
          const centre = art.pose === "flat" ? art.origin.y : art.origin.x;
          expect(Math.max(...widths) - centre).toBeCloseTo(centre - Math.min(...widths), 6);
        }
      });

      it("every point lies inside the padded box, and the blank's length or stacked height touches it", () => {
        for (const p of PICKABLE) {
          const art = blankCardArt(p, pose, box);
          const every = allPoints(art);
          expect(Math.min(...every.map((q) => q.x))).toBeGreaterThanOrEqual(box.pad - EPS);
          expect(Math.max(...every.map((q) => q.x))).toBeLessThanOrEqual(box.width - box.pad + EPS);
          expect(Math.min(...every.map((q) => q.y))).toBeGreaterThanOrEqual(box.pad - EPS);
          expect(Math.max(...every.map((q) => q.y))).toBeLessThanOrEqual(box.height - box.pad + EPS);
          const pts = [...art.outline, ...art.side];
          const xs = pts.map((q) => q.x);
          const ys = pts.map((q) => q.y);
          const spanX = Math.max(...xs) - Math.min(...xs);
          const spanY = Math.max(...ys) - Math.min(...ys);
          const ratioX = (pose === "flat" ? spanX : spanX - box.gap) / (box.width - 2 * box.pad - (pose === "flat" ? 0 : box.gap));
          const ratioY = (pose === "flat" ? spanY - box.gap : spanY) / (box.height - 2 * box.pad - (pose === "flat" ? box.gap : 0));
          expect(Math.max(ratioX, ratioY)).toBeCloseTo(1, 6);
        }
      });

      it(`the nose is ${pose === "flat" ? "left" : "up"}: the outline's nose-tip point has the least ${pose === "flat" ? "x" : "y"}`, () => {
        for (const p of [ROUND_NOSE, SQUARE_NOSE]) {
          const art = blankCardArt(p, pose, box);
          const noseTip = artPointOf(art, p.lengthMm, 0);
          const least = Math.min(...art.outline.map((q) => along(art, q)));
          expect(along(art, noseTip)).toBeCloseTo(least, 9);
          const tailTip = artPointOf(art, 0, 0);
          expect(along(art, tailTip)).toBeCloseTo(Math.max(...art.outline.map((q) => along(art, q))), 9);
        }
      });
    });
  }
});

describe("blankCardArt — through every printed width, and round at a 0-wide nose (D-14)", () => {
  it.each(["flat", "upright"] as CardPose[])("%s: a dot on each rail at half each printed width, and the outline passes through it", (pose) => {
    const box = pose === "flat" ? FLAT_CARD_BOX : UPRIGHT_CARD_BOX;
    for (const p of [ROUND_NOSE, SQUARE_NOSE]) {
      const art = blankCardArt(p, pose, box);
      const printed = p.record.stations.filter((s) => s.widthMm !== null);
      expect(art.widthDots).toHaveLength(printed.length * 2);
      const centre = pose === "flat" ? art.origin.y : art.origin.x;
      printed.forEach((station, i) => {
        const half = (station.widthMm! / 2) * art.scale;
        const [a, b] = [art.widthDots[2 * i], art.widthDots[2 * i + 1]];
        expect(Math.abs(across(art, a) - centre)).toBeCloseTo(half, 6);
        expect(Math.abs(across(art, b) - centre)).toBeCloseTo(half, 6);
        expect(along(art, a)).toBeCloseTo(along(art, artPointOf(art, station.fromTailMm, 0)), 9);
        // The outline holds a point at this station with exactly this half-width.
        const onOutline = art.outline.find(
          (q) => Math.abs(along(art, q) - along(art, a)) < 1e-9 && Math.abs(Math.abs(across(art, q) - centre) - half) < 1e-6,
        );
        expect(onOutline, `${p.record.name} at ${station.label}`).toBeDefined();
      });
    }
  });

  it("the 0-wide nose is drawn round: dense samples on each rail inside its nose's last printed segment", () => {
    const art = blankCardArt(ROUND_NOSE, "flat", FLAT_CARD_BOX);
    const printed = ROUND_NOSE.record.stations.filter((s) => s.widthMm !== null);
    const nose = printed[printed.length - 1].fromTailMm;
    const before = printed[printed.length - 2].fromTailMm;
    const xNose = artPointOf(art, nose, 0).x;
    const xBefore = artPointOf(art, before, 0).x;
    const upper = art.outline.slice(0, art.outline.length / 2);
    const lower = art.outline.slice(art.outline.length / 2);
    for (const rail of [upper, lower]) {
      const inside = rail.filter((q) => q.x > xNose + 1e-9 && q.x < xBefore - 1e-9);
      expect(inside.length).toBeGreaterThanOrEqual(TIP_SEGMENT_SAMPLES - 1);
    }
  });
});

describe("blankCardArt — the side view (D-14)", () => {
  it.each(["flat", "upright"] as CardPose[])("%s: the lowest bottom rests on the baseline and the deck is never under the bottom", (pose) => {
    const box = pose === "flat" ? FLAT_CARD_BOX : UPRIGHT_CARD_BOX;
    for (const p of PICKABLE) {
      const art = blankCardArt(p, pose, box);
      const n = art.side.length / 2;
      const bottom = art.side.slice(0, n);
      const deck = art.side.slice(n).reverse();
      const surface = across(art, art.baseline[0]);
      expect(across(art, art.baseline[1])).toBeCloseTo(surface, 9);
      // Distance from the surface, growing away from it.
      const lift = (q: ArtPoint) => (pose === "flat" ? surface - q.y : q.x - surface);
      expect(Math.min(...bottom.map(lift))).toBeCloseTo(0, 6);
      for (let i = 0; i < n; i++) {
        expect(along(art, deck[i])).toBeCloseTo(along(art, bottom[i]), 9);
        expect(lift(deck[i])).toBeGreaterThanOrEqual(lift(bottom[i]) - EPS);
      }
    }
  });

  it("flat: the side view sits wholly below the outline, at least the gap apart", () => {
    for (const p of PICKABLE) {
      const art = blankCardArt(p, "flat", FLAT_CARD_BOX);
      const outlineLow = Math.max(...art.outline.map((q) => q.y));
      const sideTop = Math.min(...art.side.map((q) => q.y));
      expect(sideTop - outlineLow).toBeGreaterThanOrEqual(FLAT_CARD_BOX.gap - EPS);
    }
  });

  it("upright: the side view sits wholly to the right of the outline, at least the gap apart, bottom toward it", () => {
    for (const p of PICKABLE) {
      const art = blankCardArt(p, "upright", UPRIGHT_CARD_BOX);
      const outlineRight = Math.max(...art.outline.map((q) => q.x));
      const sideLeft = Math.min(...art.side.map((q) => q.x));
      expect(sideLeft - outlineRight).toBeGreaterThanOrEqual(UPRIGHT_CARD_BOX.gap - EPS);
      const n = art.side.length / 2;
      const bottom = art.side.slice(0, n);
      const deck = art.side.slice(n).reverse();
      for (let i = 0; i < n; i++) expect(bottom[i].x).toBeLessThanOrEqual(deck[i].x + EPS);
    }
  });
});

describe("boardOnBlankArt — the shaper's board on the blank (D-04)", () => {
  const boardFor = (length: number) => {
    const geometry = buildOutline({ ...DEFAULT_BOARD_SPEC.outline, length: mm(length) });
    return { length: mm(length), silhouette: silhouette(geometry), geometry };
  };

  it.each(["flat", "upright"] as CardPose[])("%s: a board as long as the blank, centred, spans it tip to tip", (pose) => {
    const box = pose === "flat" ? FLAT_CARD_BOX : UPRIGHT_CARD_BOX;
    const art = blankCardArt(SQUARE_NOSE, pose, box);
    const board = boardFor(SQUARE_NOSE.lengthMm);
    const points = boardOnBlankArt(art, board, mm(0));
    const alongs = points.map((q) => along(art, q));
    expect(Math.min(...alongs)).toBeCloseTo(along(art, artPointOf(art, SQUARE_NOSE.lengthMm, 0)), 6);
    expect(Math.max(...alongs)).toBeCloseTo(along(art, artPointOf(art, 0, 0)), 6);
  });

  it.each(["flat", "upright"] as CardPose[])("%s: an inch of placement moves every point an inch toward the nose", (pose) => {
    const box = pose === "flat" ? FLAT_CARD_BOX : UPRIGHT_CARD_BOX;
    const art = blankCardArt(SQUARE_NOSE, pose, box);
    const board = boardFor(SQUARE_NOSE.lengthMm - inchesToMm(4));
    const at0 = boardOnBlankArt(art, board, mm(0));
    const at1 = boardOnBlankArt(art, board, inchesToMm(1));
    at0.forEach((q, i) => {
      expect(along(art, q) - along(art, at1[i])).toBeCloseTo(inchesToMm(1) * art.scale, 6);
      expect(across(art, q)).toBeCloseTo(across(art, at1[i]), 9);
    });
  });

  it("every point is the art's own mapping of blankStationOf", () => {
    const art = blankCardArt(ROUND_NOSE, "flat", FLAT_CARD_BOX);
    const board = boardFor(ROUND_NOSE.lengthMm - inchesToMm(3));
    const placement = inchesToMm(0.75);
    const points = boardOnBlankArt(art, board, placement);
    board.silhouette.forEach(({ station, w }, i) => {
      const expected = artPointOf(art, blankStationOf(mm(station), placement, board.length, ROUND_NOSE.lengthMm), w);
      expect(points[i]).toEqual(expected);
    });
  });

  it("the thumbnail box draws the same shapes at its own scale", () => {
    const card = blankCardArt(ROUND_NOSE, "flat", FLAT_CARD_BOX);
    const thumb = blankCardArt(ROUND_NOSE, "flat", THUMB_BOX);
    expect(thumb.outline).toHaveLength(card.outline.length);
    expect(thumb.side).toHaveLength(card.side.length);
    const rel = (art: BlankCardArt, q: ArtPoint) => ({ x: (q.x - art.origin.x) / art.scale, y: (q.y - art.origin.y) / art.scale });
    card.outline.forEach((q, i) => {
      const a = rel(card, q);
      const b = rel(thumb, thumb.outline[i]);
      expect(b.x).toBeCloseTo(a.x, 6);
      expect(b.y).toBeCloseTo(a.y, 6);
    });
  });
});

describe("blankCardArt — filling the card's width (fast 163, the founder 2026-10-16)", () => {
  // "make the blanks fill the card width like the sketch": every blank spans the box's width less its
  // padding, and the drawing's height follows the blank's own proportions — still one scale both ways.
  const LONGEST = PICKABLE.reduce((a, b) => (b.lengthMm > a.lengthMm ? b : a));
  const STUBBIEST = PICKABLE.reduce((a, b) => (b.lengthMm / widestHalf(b) < a.lengthMm / widestHalf(a) ? b : a));

  it("spans the full width less the padding, on every pickable blank", () => {
    for (const p of PICKABLE) {
      const art = blankCardArt(p, "flat", FLAT_CARD_FILL_BOX);
      const xs = art.outline.map((q) => q.x);
      expect(Math.min(...xs)).toBeCloseTo(FLAT_CARD_FILL_BOX.pad, 6);
      expect(Math.max(...xs)).toBeCloseTo(FLAT_CARD_FILL_BOX.width - FLAT_CARD_FILL_BOX.pad, 6);
      expect(art.scale).toBeCloseTo((FLAT_CARD_FILL_BOX.width - 2 * FLAT_CARD_FILL_BOX.pad) / p.lengthMm, 12);
      expect(art.box.width).toBe(FLAT_CARD_FILL_BOX.width);
    }
  });

  it("gives the drawing the blank's own height, everything inside it with the padding kept", () => {
    for (const p of [LONGEST, STUBBIEST, ROUND_NOSE, SQUARE_NOSE]) {
      const art = blankCardArt(p, "flat", FLAT_CARD_FILL_BOX);
      const ys = allPoints(art).map((q) => q.y);
      expect(Math.min(...ys)).toBeGreaterThanOrEqual(FLAT_CARD_FILL_BOX.pad - EPS);
      expect(Math.max(...ys)).toBeLessThanOrEqual(art.box.height - FLAT_CARD_FILL_BOX.pad + EPS);
      expect(Math.min(...art.outline.map((q) => q.y))).toBeCloseTo(FLAT_CARD_FILL_BOX.pad, 6);
    }
  });

  it("a short wide blank's drawing grows taller than the fixed box, a long one's shorter", () => {
    expect(blankCardArt(STUBBIEST, "flat", FLAT_CARD_FILL_BOX).box.height).toBeGreaterThan(FLAT_CARD_BOX.height);
    expect(blankCardArt(LONGEST, "flat", FLAT_CARD_FILL_BOX).box.height).toBeLessThan(FLAT_CARD_BOX.height);
  });

  it("draws the same shapes as the fixed box, only at its own scale", () => {
    const fixed = blankCardArt(STUBBIEST, "flat", FLAT_CARD_BOX);
    const fill = blankCardArt(STUBBIEST, "flat", FLAT_CARD_FILL_BOX);
    const rel = (art: BlankCardArt, q: ArtPoint) => ({ x: (q.x - art.origin.x) / art.scale, y: (q.y - art.origin.y) / art.scale });
    fixed.outline.forEach((q, i) => {
      expect(rel(fill, fill.outline[i]).x).toBeCloseTo(rel(fixed, q).x, 6);
      expect(rel(fill, fill.outline[i]).y).toBeCloseTo(rel(fixed, q).y, 6);
    });
  });
});
