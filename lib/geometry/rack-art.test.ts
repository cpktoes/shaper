import { describe, expect, it } from "vitest";
import { presetDesignFields } from "@/lib/blanks/preset-blanks";
import { prepareBlank, thinningStartsOf } from "./blank-fit";
import { buildBoardProfile, type BoardSideProfile } from "./board-profile";
import { LIVE_DESIGN_RULES, designSideProfile } from "./design";
import { buildOutline, type OutlineGeometry } from "./outline";
import { BOARD_PRESETS, type BoardPreset } from "./presets";
import {
  RACK_ART_STEPS,
  RACK_OUTLINE_SWITCH_RAD,
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
} from "./rack-art";
import { polylinePath, silhouette } from "./screen-tiles";
import { inchesToMm, mm } from "./units";

/**
 * Phase 15 R3: the Board Rack's turn, worked out from each board's own numbers. Every expected
 * value comes from the app's own functions (CLAUDE.md Rule 1) — the presets through
 * `presetDesignFields`, the outline through `buildOutline`, the side profile through
 * `designSideProfile` and its own `rockerAt`/`deckAt`, the TEMPLATE outline through `silhouette` —
 * never a hand-typed number.
 */

interface RackCase {
  name: string;
  geometry: OutlineGeometry;
  profile: BoardSideProfile;
  art: RackBoardArt;
}

function boardCase(name: string, fields: ReturnType<typeof presetDesignFields> | HandSetFields): RackCase {
  const geometry = buildOutline(fields.outline);
  const profile = designSideProfile(fields, LIVE_DESIGN_RULES);
  return { name, geometry, profile, art: buildRackBoardArt(profile, geometry) };
}

type HandSetFields = Omit<ReturnType<typeof presetDesignFields>, "blank"> & { blank: null };

const PRESET = Object.fromEntries(BOARD_PRESETS.map((preset) => [preset.id, preset])) as Record<
  BoardPreset["id"],
  BoardPreset
>;

const HAND_SET_FIELDS: HandSetFields = { ...presetDesignFields(PRESET.shortboard), blank: null };

const PRESET_CASES = BOARD_PRESETS.map((preset) => boardCase(preset.name, presetDesignFields(preset)));
const HAND_SET = boardCase("a hand-set Shortboard", HAND_SET_FIELDS);
const ALL_CASES = [...PRESET_CASES, HAND_SET];
const FISH = boardCase(PRESET.fish.name, presetDesignFields(PRESET.fish));

const STATION_COUNT = RACK_ART_STEPS + 1;

/** Every whole degree from 0 to 90, in radians. */
const DEGREES = Array.from({ length: 91 }, (_, deg) => (deg * Math.PI) / 180);

/** A turned board's two edges by station, read back out of the closed polygon (right edge tail to
 * nose, then left edge nose to tail). Only below the switch angle, where the polygon is per station. */
function edgesAt(points: RackPoint[], i: number): { left: number; right: number } {
  return { right: points[i].x, left: points[2 * STATION_COUNT - 1 - i].x };
}

function silhouetteAsRackPoints(geometry: OutlineGeometry): RackPoint[] {
  return silhouette(geometry).map(({ station, w }) => ({ station, x: -w }));
}

describe("R3: the rack art is read from the board's own numbers", () => {
  it.each(ALL_CASES.map((c) => [c.name, c] as const))("%s: 65 stations tail to nose from rockerAt, deckAt and the outline", (_, c) => {
    expect(c.art.stations).toHaveLength(STATION_COUNT);
    expect(c.art.length).toBe(c.profile.length);
    c.art.stations.forEach((st, i) => {
      const s = mm((c.profile.length * i) / RACK_ART_STEPS);
      expect(st.station).toBeCloseTo(s, 9);
      expect(st.rocker).toBeCloseTo(c.profile.rockerAt(s), 9);
      expect(st.deck).toBeCloseTo(c.profile.deckAt(s), 9);
    });
    expect(c.art.stations[0].station).toBe(0);
    expect(c.art.stations[RACK_ART_STEPS].station).toBeCloseTo(c.profile.length, 9);
    const maxDeck = Math.max(...c.art.stations.map((st) => st.deck));
    expect(c.art.maxDeck).toBe(maxDeck);
    expect(c.art.tMid).toBe(maxDeck / 2);
    expect(c.art.maxHalf).toBe(Math.max(...c.art.stations.map((st) => st.half)));
    expect(c.art.silhouette).toEqual(silhouette(c.geometry));
  });

  it("throws, naming the value, when a profile hands back something that isn't a number", () => {
    const good = PRESET_CASES[0];
    const broken: BoardSideProfile = { ...good.profile, rockerAt: () => mm(Number.NaN) };
    expect(() => buildRackBoardArt(broken, good.geometry)).toThrow(/rocker at station 0 is not a finite number/);
  });
});

describe("R3: at rest (0 degrees) the board shows exactly its side profile", () => {
  it.each(ALL_CASES.map((c) => [c.name, c] as const))("%s: right edge is the deck, left edge is the rocker", (_, c) => {
    const points = turnedBoardPoints(c.art, 0);
    expect(points).toHaveLength(2 * STATION_COUNT);
    c.art.stations.forEach((st, i) => {
      const s = mm((c.profile.length * i) / RACK_ART_STEPS);
      const { left, right } = edgesAt(points, i);
      expect(right).toBeCloseTo(c.profile.deckAt(s) - c.art.tMid, 9);
      expect(left).toBeCloseTo(c.profile.rockerAt(s) - c.art.tMid, 9);
      expect(points[i].station).toBe(st.station);
      expect(points[2 * STATION_COUNT - 1 - i].station).toBe(st.station);
    });
  });
});

describe("R3: turned (90 degrees) the board shows exactly its TEMPLATE outline", () => {
  it.each(ALL_CASES.map((c) => [c.name, c] as const))("%s: at 90 degrees and from the switch angle up", (_, c) => {
    const expected = silhouetteAsRackPoints(c.geometry);
    expect(turnedBoardPoints(c.art, Math.PI / 2)).toEqual(expected);
    expect(turnedBoardPoints(c.art, RACK_OUTLINE_SWITCH_RAD)).toEqual(expected);
  });

  it.each(ALL_CASES.map((c) => [c.name, c] as const))(
    "%s: just below the switch, each section is within its derived bound of the outline's half-width",
    (_, c) => {
      const theta = 1.56;
      expect(theta).toBeLessThan(RACK_OUTLINE_SWITCH_RAD);
      const points = turnedBoardPoints(c.art, theta);
      c.art.stations.forEach((st, i) => {
        const { left, right } = edgesAt(points, i);
        const projectedHalf = (right - left) / 2;
        // ext = sqrt(a^2 cos^2 + h^2 sin^2) lies between h * sin and a * cos + h, a = (deck - rocker) / 2.
        const a = (st.deck - st.rocker) / 2;
        expect(projectedHalf - st.half).toBeLessThanOrEqual(a * Math.cos(theta) + 1e-9);
        expect(st.half - projectedHalf).toBeLessThanOrEqual(st.half * (1 - Math.sin(theta)) + 1e-9);
      });
    },
  );
});

describe("Edge: a swallow tail keeps its notch when turned", () => {
  it("the fish preset's 90-degree outline closes at the notch's crotch, on the stringer", () => {
    expect(PRESET.fish.outline.tail.kind).toBe("swallow");
    const points = turnedBoardPoints(FISH.art, Math.PI / 2);
    const last = points[points.length - 1];
    expect(last).toEqual({ station: FISH.geometry.centreCloseStation, x: 0 });
    expect(FISH.geometry.centreCloseStation).toBeGreaterThan(0);
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
      handSetCurve: LIVE_DESIGN_RULES.handSetCurve,
    });
    HAND_SET.art.stations.forEach((st) => {
      expect(st.rocker).toBeCloseTo(direct.rockerAt(st.station), 9);
      expect(st.deck).toBeCloseTo(direct.deckAt(st.station), 9);
    });
  });

  it("builds rack art with every value finite", () => {
    const { art } = HAND_SET;
    for (const st of art.stations) {
      for (const value of [st.station, st.rocker, st.deck, st.half]) expect(Number.isFinite(value)).toBe(true);
    }
    for (const value of [art.length, art.tMid, art.maxDeck, art.maxHalf]) expect(Number.isFinite(value)).toBe(true);
  });
});

describe("R3: the stringer slides from the rail edge to the centre", () => {
  it.each(ALL_CASES.map((c) => [c.name, c] as const))("%s", (_, c) => {
    const atRest = stringerPoints(c.art, 0);
    const restEdges = turnedBoardPoints(c.art, 0);
    expect(atRest).toHaveLength(STATION_COUNT);
    atRest.forEach((p, i) => expect(p.x).toBeCloseTo(edgesAt(restEdges, i).right, 9));

    for (const p of stringerPoints(c.art, Math.PI / 2)) expect(Math.abs(p.x)).toBeLessThan(1e-9);

    for (const theta of DEGREES) {
      const stringer = stringerPoints(c.art, theta);
      if (theta >= RACK_OUTLINE_SWITCH_RAD) {
        // Turned: the board is its TEMPLATE outline, so the stringer sits within the half-width.
        stringer.forEach((p, i) => expect(Math.abs(p.x)).toBeLessThanOrEqual(c.art.stations[i].half + 1e-9));
        continue;
      }
      const points = turnedBoardPoints(c.art, theta);
      stringer.forEach((p, i) => {
        const { left, right } = edgesAt(points, i);
        expect(p.x).toBeGreaterThanOrEqual(left - 1e-9);
        expect(p.x).toBeLessThanOrEqual(right + 1e-9);
      });
    }
  });
});

describe("the room a turning board takes", () => {
  it.each(ALL_CASES.map((c) => [c.name, c] as const))("%s: halfExtent is half the side view at rest and the outline's half-width turned", (_, c) => {
    const scale = 380 / Math.max(c.art.length, inchesToMm(84));
    expect(halfExtent(c.art, 0, scale)).toBeCloseTo((c.art.maxDeck * scale) / 2, 9);
    expect(halfExtent(c.art, Math.PI / 2, scale)).toBeCloseTo(c.art.maxHalf * scale, 9);
  });

  it.each(ALL_CASES.map((c) => [c.name, c] as const))("%s: drawnSpan is the turned picture's own left and right", (_, c) => {
    for (const theta of DEGREES) {
      const xs = turnedBoardPoints(c.art, theta).map((p) => p.x);
      expect(drawnSpan(c.art, theta)).toEqual({ left: Math.min(...xs), right: Math.max(...xs) });
    }
  });
});

describe("the paths the rack draws", () => {
  it("turnedBoardPath and stringerPath place each point at cx + x * scale, floorY - station * scale", () => {
    const c = PRESET_CASES[0];
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
    it.each(ALL_CASES.map((c) => [c.name, c] as const))(`%s, ${size.label}: every glyph sits left of the drawn board at every angle`, (_, c) => {
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
