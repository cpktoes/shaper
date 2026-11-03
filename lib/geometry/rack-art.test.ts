import { describe, expect, it } from "vitest";
import { presetDesignFields } from "@/lib/blanks/preset-blanks";
import { prepareBlank, thinningStartsOf } from "./blank-fit";
import { TAIL_PRESETS, type TailShape } from "./board";
import { buildBoardProfile, type BoardSideProfile } from "./board-profile";
import { LIVE_DESIGN_RULES, designSideProfile } from "./design";
import { buildOutline, sampleOutline, type OutlineGeometry } from "./outline";
import { BOARD_PRESETS, type BoardPreset } from "./presets";
import {
  RACK_ART_STEPS,
  buildRackBoardArt,
  drawnSpan,
  halfExtent,
  spineAnchorX,
  stringerPath,
  stringerPoints,
  turnedBoardPath,
  turnedBoardPoints,
  type RackBoardArt,
  type RackPoint,
  type RackStation,
} from "./rack-art";
import { polylinePath, silhouette } from "./screen-tiles";
import { inchesToMm, mm } from "./units";

/**
 * Phase 15 R3: the Board Rack's turn, worked out from each board's own numbers. Every expected
 * value comes from the app's own functions (CLAUDE.md Rule 1) — the presets through
 * `presetDesignFields`, the tail buttons through `TAIL_PRESETS`, the outline through `buildOutline`,
 * the side profile through `designSideProfile` and its own `rockerAt`/`deckAt`, the TEMPLATE outline
 * through `silhouette` — never a hand-typed number. Every expected figure is a relation: the side
 * profile at rest, the TEMPLATE outline turned, and a bound read off the board's own size in between.
 *
 * Quick 261103-drw: one rule draws every angle, so a swallow's notch and a diamond's point keep their
 * shape all the way round instead of the board snapping to its TEMPLATE outline near 89.5 degrees.
 */

interface RackCase {
  name: string;
  geometry: OutlineGeometry;
  profile: BoardSideProfile;
  art: RackBoardArt;
}

type DesignFields = ReturnType<typeof presetDesignFields>;
type HandSetFields = Omit<DesignFields, "blank"> & { blank: null };

function boardCase(name: string, fields: DesignFields | HandSetFields): RackCase {
  const geometry = buildOutline(fields.outline);
  const profile = designSideProfile(fields, LIVE_DESIGN_RULES);
  return { name, geometry, profile, art: buildRackBoardArt(profile, geometry) };
}

/** A board with one of OUTLINE's five tail buttons pressed: the button's tail, angle and fullness. */
function withTail<F extends DesignFields | HandSetFields>(fields: F, kind: TailShape["kind"]): F {
  const button = TAIL_PRESETS[kind];
  return {
    ...fields,
    outline: { ...fields.outline, tail: button.tail, tailAngle: button.tailAngle, tailFullness: button.tailFullness },
  };
}

const PRESET = Object.fromEntries(BOARD_PRESETS.map((preset) => [preset.id, preset])) as Record<
  BoardPreset["id"],
  BoardPreset
>;

const HAND_SET_FIELDS: HandSetFields = { ...presetDesignFields(PRESET.shortboard), blank: null };

const PRESET_CASES = BOARD_PRESETS.map((preset) => boardCase(preset.name, presetDesignFields(preset)));
const HAND_SET = boardCase("a hand-set Shortboard", HAND_SET_FIELDS);
const ALL_CASES = [...PRESET_CASES, HAND_SET];
const FISH = boardCase(PRESET.fish.name, presetDesignFields(PRESET.fish));

const TAIL_KINDS = Object.keys(TAIL_PRESETS) as TailShape["kind"][];

/** Every preset with each of the five tail buttons, on its blank and hand-set (no blank). */
const TAIL_CASES = BOARD_PRESETS.flatMap((preset) =>
  TAIL_KINDS.flatMap((kind) => {
    const fields = withTail(presetDesignFields(preset), kind);
    return [
      boardCase(`${preset.name} with the ${kind} tail`, fields),
      boardCase(`a hand-set ${preset.name} with the ${kind} tail`, { ...fields, blank: null }),
    ];
  }),
);

const EVERY_CASE = [...ALL_CASES, ...TAIL_CASES];
const SWALLOW_CASES = [FISH, ...TAIL_CASES.filter((c) => c.geometry.centreCloseStation > c.geometry.points[0].station)];
const DIAMOND_CASES = TAIL_CASES.filter((c) => c.geometry.centreCloseStation < c.geometry.points[0].station);

const STATION_COUNT = RACK_ART_STEPS + 1;
const DEGREE = Math.PI / 180;

/** Every whole degree from 0 to 90, in radians. */
const DEGREES = Array.from({ length: 91 }, (_, deg) => deg * DEGREE);
/** Every tenth of a degree from 0 to 90, in radians. */
const TENTHS = Array.from({ length: 901 }, (_, tenth) => (tenth / 10) * DEGREE);

const named = (cases: readonly RackCase[]) => cases.map((c) => [c.name, c] as const);

/** The turned drawing split into its three runs: the low edge tail to nose (`sections` long), the high
 * edge nose to tail, then the points that close the tail. */
function parts(art: RackBoardArt, points: RackPoint[]) {
  const n = art.sections.length;
  return { low: points.slice(0, n), high: points.slice(n, 2 * n).reverse(), closing: points.slice(2 * n) };
}

/** The drawn low and high edges at any station, read along the drawing's own straight lines. */
function edgesAtStation(art: RackBoardArt, points: RackPoint[], station: number) {
  const { low, high } = parts(art, points);
  for (let i = 0; i < low.length - 1; i++) {
    if (station >= low[i].station && station <= low[i + 1].station) {
      const span = low[i + 1].station - low[i].station;
      const t = span > 0 ? (station - low[i].station) / span : 0;
      return { low: low[i].x + (low[i + 1].x - low[i].x) * t, high: high[i].x + (high[i + 1].x - high[i].x) * t };
    }
  }
  throw new Error(`station ${station} is off the drawing`);
}

/** Where a section's cross-section is centred at an angle: halfway between its rocker and its deck. */
function centreOf(art: RackBoardArt, st: RackStation, theta: number) {
  return ((st.rocker + st.deck) / 2 - art.tMid) * Math.cos(theta);
}

function distanceToSegment(p: RackPoint, a: RackPoint, b: RackPoint) {
  const dx = b.x - a.x;
  const ds = b.station - a.station;
  const length2 = dx * dx + ds * ds;
  const t = length2 > 0 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.station - a.station) * ds) / length2)) : 0;
  return Math.hypot(p.x - (a.x + t * dx), p.station - (a.station + t * ds));
}

function silhouetteAsRackPoints(geometry: OutlineGeometry): RackPoint[] {
  // x = -w, written `0 - w` so a zero half-width reads as 0 rather than a negative zero.
  return silhouette(geometry).map(({ station, w }) => ({ station, x: 0 - w }));
}

/**
 * The least position, projected at the angle whose cosine and sine are `cos` and `sin`, of one tail
 * piece of a swallow: its cross-section ellipse (`w` across, `b` deep) cut at `a` from the stringer,
 * from the cut out to the rail — found by brute force over the piece's boundary (the arc, densely
 * sampled, and the cut's two ends; the position is a straight function, so its least is on the edge).
 */
function leastProjected(a: number, w: number, b: number, cos: number, sin: number): number {
  let least = Infinity;
  const samples = 20_000;
  for (let i = 0; i <= samples; i++) {
    const phi = -Math.PI / 2 + (Math.PI * i) / samples;
    const u = w * Math.cos(phi);
    if (u < a) continue;
    least = Math.min(least, u * sin + b * Math.sin(phi) * cos);
  }
  const cutHalf = b * Math.sqrt(Math.max(0, 1 - (a / w) ** 2));
  for (const v of [cutHalf, -cutHalf]) least = Math.min(least, a * sin + v * cos);
  return least;
}

describe("R3: the rack art is read from the board's own numbers", () => {
  it.each(named(ALL_CASES))("%s: 65 stations tail to nose from rockerAt, deckAt and the outline", (_, c) => {
    expect(c.art.stations).toHaveLength(STATION_COUNT);
    expect(c.art.length).toBe(c.profile.length);
    c.art.stations.forEach((st, i) => {
      const s = mm((c.profile.length * i) / RACK_ART_STEPS);
      expect(st.station).toBeCloseTo(s, 9);
      expect(st.rocker).toBeCloseTo(c.profile.rockerAt(s), 9);
      expect(st.deck).toBeCloseTo(c.profile.deckAt(s), 9);
      expect(st.half).toBe(sampleOutline(c.geometry, st.station));
    });
    expect(c.art.stations[0].station).toBe(0);
    expect(c.art.stations[RACK_ART_STEPS].station).toBeCloseTo(c.profile.length, 9);
    const maxDeck = Math.max(...c.art.sections.map((st) => st.deck));
    expect(c.art.maxDeck).toBe(maxDeck);
    expect(c.art.tMid).toBe(maxDeck / 2);
    expect(c.art.maxHalf).toBe(Math.max(...c.art.sections.map((st) => st.half)));
    expect(c.art.silhouette).toEqual(silhouette(c.geometry));
    expect(c.art.closeStation).toBe(c.geometry.centreCloseStation);
  });

  it.each(named(EVERY_CASE))(
    "%s: the drawn stations are the 65, the outline's own and the tail's closing station, tail to nose",
    (_, c) => {
      const { sections } = c.art;
      const first = Math.min(c.geometry.centreCloseStation, c.geometry.points[0].station);
      expect(sections[0].station).toBe(first);
      expect(sections[sections.length - 1].station).toBe(c.art.length);
      for (let i = 1; i < sections.length; i++) expect(sections[i].station).toBeGreaterThan(sections[i - 1].station);
      const drawn = new Set<number>(sections.map((st) => st.station));
      for (const st of c.art.stations) expect(drawn.has(st.station)).toBe(true);
      for (const p of c.geometry.points) expect(drawn.has(p.station)).toBe(true);
      expect(drawn.has(c.geometry.centreCloseStation)).toBe(true);
      for (const st of sections) {
        expect(st.rocker).toBe(c.profile.rockerAt(st.station));
        expect(st.deck).toBe(c.profile.deckAt(st.station));
        if (st.station >= c.geometry.points[0].station) expect(st.half).toBe(sampleOutline(c.geometry, st.station));
      }
    },
  );

  it("throws, naming the value, when a profile hands back something that isn't a number", () => {
    const good = PRESET_CASES[0];
    const broken: BoardSideProfile = { ...good.profile, rockerAt: () => mm(Number.NaN) };
    expect(() => buildRackBoardArt(broken, good.geometry)).toThrow(/rocker at station 0 is not a finite number/);
  });
});

describe("R3: at rest (0 degrees) the board shows exactly its side profile", () => {
  it.each(named(EVERY_CASE))("%s: the low edge is the rocker, the high edge the deck, the tail closed between", (_, c) => {
    const points = turnedBoardPoints(c.art, 0);
    const { low, high, closing } = parts(c.art, points);
    c.art.sections.forEach((st, i) => {
      expect(low[i].station).toBe(st.station);
      expect(high[i].station).toBe(st.station);
      expect(low[i].x).toBeCloseTo(c.profile.rockerAt(st.station) - c.art.tMid, 9);
      expect(high[i].x).toBeCloseTo(c.profile.deckAt(st.station) - c.art.tMid, 9);
    });
    expect(closing.length).toBeGreaterThan(0);
    for (const p of closing) {
      // On the tail's end line, between its rocker and its deck.
      expect(p.station).toBe(c.art.sections[0].station);
      expect(p.x).toBeGreaterThanOrEqual(low[0].x - 1e-9);
      expect(p.x).toBeLessThanOrEqual(high[0].x + 1e-9);
    }
  });
});

describe("R3: turned (90 degrees) the board shows exactly its TEMPLATE outline", () => {
  it.each(named(EVERY_CASE))("%s: every TEMPLATE point, in order, and every other point on its lines", (_, c) => {
    const expected = silhouetteAsRackPoints(c.geometry);
    const points = turnedBoardPoints(c.art, Math.PI / 2);
    let next = 0;
    for (const p of points) {
      if (next < expected.length && Math.abs(p.station - expected[next].station) <= 1e-9 && Math.abs(p.x - expected[next].x) <= 1e-9) {
        next++;
      }
    }
    expect(next, `${next} of ${expected.length} TEMPLATE points found in order`).toBe(expected.length);
    for (const p of points) {
      let nearest = Infinity;
      for (let i = 0; i < expected.length; i++) {
        nearest = Math.min(nearest, distanceToSegment(p, expected[i], expected[(i + 1) % expected.length]));
      }
      expect(nearest).toBeLessThanOrEqual(1e-9);
    }
  });

  it.each(named(EVERY_CASE))(
    "%s: at every whole degree each drawn station shows between half x sin and half x sin + thickness/2 x cos",
    (_, c) => {
      for (const theta of DEGREES) {
        const { low, high } = parts(c.art, turnedBoardPoints(c.art, theta));
        c.art.sections.forEach((st, i) => {
          const shown = (high[i].x - low[i].x) / 2;
          const b = (st.deck - st.rocker) / 2;
          // ext = sqrt(b^2 cos^2 + half^2 sin^2) lies between half * sin and b * cos + half * sin.
          expect(shown).toBeGreaterThanOrEqual(st.half * Math.sin(theta) - 1e-9);
          expect(shown).toBeLessThanOrEqual(st.half * Math.sin(theta) + b * Math.cos(theta) + 1e-9);
        });
      }
    },
  );
});

describe("no snap: every board changes smoothly all the way round", () => {
  it.each(named(EVERY_CASE))("%s: the same points at every tenth of a degree, none moving further than the board's size allows", (_, c) => {
    // A point is a section's centre plus or minus its reach, and neither moves faster per radian than
    // the board's greatest deck height and half-width; the notch's points get the same budget, doubled.
    const bound = 2 * (c.art.maxDeck + c.art.maxHalf) * (0.1 * DEGREE);
    let previous = turnedBoardPoints(c.art, 0);
    for (const theta of TENTHS.slice(1)) {
      const points = turnedBoardPoints(c.art, theta);
      expect(points, `at ${(theta / DEGREE).toFixed(1)} degrees`).toHaveLength(previous.length);
      let moved = 0;
      points.forEach((p, i) => {
        moved = Math.max(moved, Math.hypot(p.x - previous[i].x, p.station - previous[i].station));
      });
      expect(moved, `largest move into ${(theta / DEGREE).toFixed(1)} degrees`).toBeLessThanOrEqual(bound);
      previous = points;
    }
  });
});

describe("a swallow's notch opens as the board turns", () => {
  it("the swallow boards are the Fish and every preset with the swallow button", () => {
    expect(PRESET.fish.outline.tail.kind).toBe("swallow");
    expect(SWALLOW_CASES).toHaveLength(1 + 2 * BOARD_PRESETS.length);
    for (const c of SWALLOW_CASES) expect(c.art.notch).not.toBeNull();
    for (const c of [...ALL_CASES.filter((c) => c !== FISH && c.geometry.centreCloseStation === 0), ...DIAMOND_CASES]) {
      expect(c.art.notch).toBeNull();
    }
  });

  it.each(named(SWALLOW_CASES))("%s: hidden edge-on, never closing as it turns, the TEMPLATE V turned", (_, c) => {
    const notch = c.art.notch!;
    const tail = c.art.sections[0];
    // Edge-on the far tail tip fills the notch: every closing point is the middle of the tail's end.
    for (const p of parts(c.art, turnedBoardPoints(c.art, 0)).closing) {
      expect(p.station).toBe(tail.station);
      expect(p.x).toBeCloseTo(centreOf(c.art, tail, 0), 9);
    }
    let depth = -Infinity;
    let width = -Infinity;
    for (const theta of TENTHS) {
      const { closing } = parts(c.art, turnedBoardPoints(c.art, theta));
      expect(closing).toHaveLength(2 * notch.sections.length);
      const nowDepth = Math.max(...closing.map((p) => p.station));
      const nowWidth = closing[0].x - closing[closing.length - 1].x;
      expect(nowDepth, `the notch's depth at ${(theta / DEGREE).toFixed(1)} degrees`).toBeGreaterThanOrEqual(depth - 1e-9);
      expect(nowWidth, `the notch's width at ${(theta / DEGREE).toFixed(1)} degrees`).toBeGreaterThanOrEqual(width - 1e-9);
      depth = nowDepth;
      width = nowWidth;
    }
    // Turned, it reaches the crotch, on the stringer, and is the tail's full width at the tail.
    const turned = parts(c.art, turnedBoardPoints(c.art, Math.PI / 2)).closing;
    const apex = turned.reduce((best, p) => (p.station > best.station ? p : best));
    expect(apex.station).toBeCloseTo(c.geometry.centreCloseStation, 9);
    expect(apex.x).toBeCloseTo(0, 9);
    expect(turned[0].x - turned[turned.length - 1].x).toBeCloseTo(2 * c.geometry.points[0].halfWidth, 9);
  });

  it.each(named(SWALLOW_CASES))("%s: each inner edge is where its cut cross-section shows nearest the stringer", (_, c) => {
    const notch = c.art.notch!;
    const s0 = c.geometry.points[0];
    const crotch = c.geometry.centreCloseStation;
    for (const degrees of [30, 60, 85]) {
      const theta = degrees * DEGREE;
      const cos = Math.cos(theta);
      const sin = Math.sin(theta);
      const points = turnedBoardPoints(c.art, theta);
      const { closing } = parts(c.art, points);
      const m = notch.sections.length;
      const up = closing.slice(0, m);
      const down = closing.slice(m).reverse();
      let open = true;
      let apex: RackPoint | null = null;
      notch.sections.forEach((st, j) => {
        // The notch's edge here: the straight line from the tail's corner to the crotch.
        const a = (s0.halfWidth * (crotch - st.station)) / (crotch - s0.station);
        expect(notch.edge[j]).toBeCloseTo(a, 9);
        const least = leastProjected(a, st.half, (st.deck - st.rocker) / 2, cos, sin);
        if (open && least > 0) {
          const xc = centreOf(c.art, st, theta);
          expect(up[j].station).toBe(st.station);
          expect(down[j].station).toBe(st.station);
          expect(up[j].x - xc).toBeCloseTo(least, 4);
          expect(xc - down[j].x).toBeCloseTo(least, 4);
          return;
        }
        // Past where the gap closes, every point sits on the notch's apex: no slit up the middle.
        open = false;
        apex ??= up[j];
        expect(up[j]).toEqual(apex);
        expect(down[j]).toEqual(apex);
      });
      expect(apex).not.toBeNull();
      for (const p of closing) {
        const edges = edgesAtStation(c.art, points, p.station);
        expect(p.x).toBeGreaterThanOrEqual(edges.low - 1e-9);
        expect(p.x).toBeLessThanOrEqual(edges.high + 1e-9);
      }
    }
  });
});

describe("a diamond keeps its point as the board turns", () => {
  it("the diamond boards are every preset with the diamond button", () => {
    expect(DIAMOND_CASES).toHaveLength(2 * BOARD_PRESETS.length);
  });

  it.each(named(DIAMOND_CASES))("%s: behind the tail block the half-width is the V's straight line from the tip", (_, c) => {
    const tip = c.geometry.centreCloseStation;
    const corner = c.geometry.points[0];
    const onTheV = (station: number) => (corner.halfWidth * (station - tip)) / (corner.station - tip);
    // The 65 even stations (the stringer's), then every drawn station.
    const evens = c.art.stations.filter((st) => st.station < corner.station);
    expect(evens.length).toBeGreaterThan(1);
    for (const st of evens) expect(st.half, `half-width at ${st.station.toFixed(1)} mm`).toBeCloseTo(onTheV(st.station), 9);
    const inside = c.art.sections.filter((st) => st.station < corner.station);
    expect(inside.length).toBeGreaterThanOrEqual(evens.length);
    expect(inside[0].station).toBe(tip);
    for (const st of inside) expect(st.half).toBeCloseTo(onTheV(st.station), 9);
  });

  it.each(named(DIAMOND_CASES))("%s: the tip shows only the tail's own thickness x cos, like a pin tail's point", (_, c) => {
    const tip = c.art.sections[0];
    for (const theta of DEGREES) {
      const { low, high } = parts(c.art, turnedBoardPoints(c.art, theta));
      expect(high[0].x - low[0].x).toBeCloseTo((tip.deck - tip.rocker) * Math.cos(theta), 9);
    }
  });
});

describe("Edge: a hand-set board with no blank", () => {
  it("builds its side profile from its five typed stations, exactly as ROCKER draws it", () => {
    expect(HAND_SET.profile.blank).toBeNull();
    const direct = buildBoardProfile({
      length: HAND_SET_FIELDS.outline.length,
      rocker: HAND_SET_FIELDS.rocker,
      foil: HAND_SET_FIELDS.foil,
      blank: null,
    });
    HAND_SET.art.sections.forEach((st) => {
      expect(st.rocker).toBeCloseTo(direct.rockerAt(st.station), 9);
      expect(st.deck).toBeCloseTo(direct.deckAt(st.station), 9);
    });
  });

  it("builds rack art with every value finite", () => {
    const { art } = HAND_SET;
    for (const st of [...art.stations, ...art.sections]) {
      for (const value of [st.station, st.rocker, st.deck, st.half]) expect(Number.isFinite(value)).toBe(true);
    }
    for (const value of [art.length, art.tMid, art.maxDeck, art.maxHalf]) expect(Number.isFinite(value)).toBe(true);
  });
});

describe("R3: the stringer slides from the rail edge to the centre", () => {
  it.each(named(EVERY_CASE))("%s", (_, c) => {
    const atRest = stringerPoints(c.art, 0);
    const swallow = c.art.notch !== null;
    // A swallow's starts at the crotch — no line across the open notch — every other board's at the tail.
    expect(atRest[0].station).toBe(swallow ? c.geometry.centreCloseStation : 0);
    expect(atRest[atRest.length - 1].station).toBe(c.art.length);
    const evens = c.art.stations.filter((st) => st.station > atRest[0].station);
    expect(atRest.slice(1).map((p) => p.station)).toEqual(evens.map((st) => st.station));
    if (!swallow) expect(atRest).toHaveLength(STATION_COUNT);

    const restPoints = turnedBoardPoints(c.art, 0);
    for (const p of atRest) expect(p.x).toBeCloseTo(edgesAtStation(c.art, restPoints, p.station).high, 9);

    for (const p of stringerPoints(c.art, Math.PI / 2)) expect(Math.abs(p.x)).toBeLessThan(1e-9);

    for (const theta of DEGREES) {
      const points = turnedBoardPoints(c.art, theta);
      for (const p of stringerPoints(c.art, theta)) {
        const edges = edgesAtStation(c.art, points, p.station);
        expect(p.x).toBeGreaterThanOrEqual(edges.low - 1e-9);
        expect(p.x).toBeLessThanOrEqual(edges.high + 1e-9);
      }
    }
  });
});

describe("the room a turning board takes", () => {
  it.each(named(ALL_CASES))("%s: halfExtent is half the side view at rest and the TEMPLATE outline's widest half turned", (_, c) => {
    const scale = 380 / Math.max(c.art.length, inchesToMm(84));
    expect(halfExtent(c.art, 0, scale)).toBeCloseTo((c.art.maxDeck * scale) / 2, 9);
    const widest = Math.max(...silhouette(c.geometry).map(({ w }) => Math.abs(w)));
    expect(halfExtent(c.art, Math.PI / 2, scale)).toBeCloseTo(widest * scale, 9);
  });

  it.each(named(EVERY_CASE))("%s: halfExtent is the drawn board's reach on its wider side, at every angle", (_, c) => {
    const scale = 380 / Math.max(c.art.length, inchesToMm(84));
    for (const theta of DEGREES) {
      const xs = turnedBoardPoints(c.art, theta).map((p) => p.x);
      expect(halfExtent(c.art, theta, scale)).toBe(Math.max(-Math.min(...xs), Math.max(...xs)) * scale);
    }
  });

  it.each(named(EVERY_CASE))("%s: drawnSpan is the turned picture's own left and right", (_, c) => {
    for (const theta of DEGREES) {
      const xs = turnedBoardPoints(c.art, theta).map((p) => p.x);
      expect(drawnSpan(c.art, theta)).toEqual({ left: Math.min(...xs), right: Math.max(...xs) });
    }
  });
});

describe("the paths the rack draws", () => {
  it.each(named([PRESET_CASES[0], FISH]))("%s: each point lands at cx + x * scale, floorY - station * scale", (_, c) => {
    const scale = 0.2;
    const cx = 100;
    const floorY = 380;
    for (const theta of [0, Math.PI / 4, Math.PI / 2]) {
      const toScreen = (p: RackPoint) => ({ x: cx + p.x * scale, y: floorY - p.station * scale });
      expect(turnedBoardPath(c.art, theta, scale, cx, floorY)).toBe(
        polylinePath(turnedBoardPoints(c.art, theta).map(toScreen), true),
      );
      expect(stringerPath(c.art, theta, scale, cx, floorY)).toBe(
        polylinePath(stringerPoints(c.art, theta).map(toScreen), false),
      );
    }
  });
});

describe("words never cross their board (the SPEC's prohibition, R4)", () => {
  const SIZES = [
    { label: "hover rack", rackHeight: 380, fontSize: 12 },
    { label: "swipe rack", rackHeight: 357, fontSize: 11 },
  ];
  for (const size of SIZES) {
    it.each(named(EVERY_CASE))(`%s, ${size.label}: every glyph sits left of the drawn board at every angle`, (_, c) => {
      const scale = size.rackHeight / Math.max(c.art.length, inchesToMm(84));
      for (const theta of DEGREES) {
        const anchor = spineAnchorX(c.art, theta, scale, size.fontSize);
        // Glyphs of words turned with rotate(-90) sit left of their baseline point; a quarter of the
        // font size allows for descenders reaching past it on the right.
        expect(anchor + 0.25 * size.fontSize).toBeLessThanOrEqual(drawnSpan(c.art, theta).left * scale);
      }
    });
  }
});

describe("designSideProfile is the side profile every screen builds", () => {
  it.each(BOARD_PRESETS.map((preset) => [preset.name, preset] as const))("%s: matches the design store's recipe at 65 stations", (_, preset) => {
    const fields = presetDesignFields(preset);
    const viaHelper = designSideProfile(fields, LIVE_DESIGN_RULES);
    // The recipe screen-tiles.test.ts's presetBoard copies from the design store.
    const direct = buildBoardProfile({
      length: fields.outline.length,
      rocker: fields.rocker,
      foil: fields.foil,
      blank: {
        prepared: prepareBlank(fields.blank.copy),
        placement: fields.blank.placement,
        nose12Offset: fields.blank.nose12Offset,
        tail12Offset: fields.blank.tail12Offset,
        deckSkin: fields.blank.deckSkin,
        tipStyle: fields.blank.tipStyle,
        fineTuneSurface: fields.blank.fineTuneSurface,
        ...thinningStartsOf(fields.blank),
      },
    });
    for (let i = 0; i <= RACK_ART_STEPS; i++) {
      const s = mm((fields.outline.length * i) / RACK_ART_STEPS);
      expect(viaHelper.rockerAt(s)).toBeCloseTo(direct.rockerAt(s), 9);
      expect(viaHelper.thicknessAt(s)).toBeCloseTo(direct.thicknessAt(s), 9);
    }
  });
});
