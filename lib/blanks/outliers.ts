/**
 * Blank outlier check (quick 261013-uoj, the founder, 2026-10-13: "run through our database of all
 * blanks and check if any points appear to be outliers … don't fix yet, but let's find them").
 *
 * Two questions, asked of every blank in the catalogue the app holds (the committed CSVs, which the
 * seed's own check proves are what the database holds, row for row):
 *
 * 1. **Off its own curve** (`leaveOneOutResiduals`): take one printed station out, draw the blank's
 *    curve through the rest with the SAME rule every screen draws with — the square-root rule over
 *    pchip, `prepareRootCurve` (Phase 14 D-13), the width's zero tips rounded as on ROCKER — and read
 *    that curve where the station was. The gap between what the catalogue prints and what the rest of
 *    the blank implies is the station's residual. Only INTERIOR stations can be asked this: the rule
 *    holds flat past its ends, so a tip would only ever be compared with its neighbour. And a station
 *    that IS the curve's anchor — the lowest rocker, the thickest or widest station — cannot be asked
 *    either, because the rule never crosses its anchor, so the curve through the others can never
 *    reach it; `C` is usually that station, and a rocker of 0 at the centre is a definition anyway.
 *
 * 2. **Unusual for its maker** (`makerNormDeviations`): each station as a share of its anchor (a
 *    thickness or width over the centre's, a rocker over the tip's on that side), compared with the
 *    same station on the maker's other blanks. This can look at tips and centres, which the first
 *    question cannot, but it also flags honest design (a gun's narrow nose, a wake-surf blank's thick
 *    nose), so it is the weaker signal and is reported as such.
 *
 * Both are scored with a robust z — distance from the median in units of the median absolute
 * deviation — inside each maker-and-attribute group (question 1) or maker-station-attribute group
 * (question 2), so a maker printing stations every 6" (US Blanks) is judged more tightly than one
 * printing them every 12", with an absolute floor under each attribute so a hair off a very smooth
 * maker is never called an outlier. Nothing here changes a number: it reads and reports.
 *
 * No React, browser or database import — pure maths over `BlankRecord`s, tested in
 * outliers.test.ts (CLAUDE.md Rule 1). The script that runs it over the catalogue and draws the
 * page is `scripts/find-blank-outliers.ts`.
 */
import type { BlankRecord, BlankStation } from "@/lib/geometry/blank";
import { prepareRootCurve, type RootKind } from "@/lib/geometry/root-curve";
import { roundZeroTips } from "@/lib/geometry/round-tip";
import { inchesToMm, type Mm } from "@/lib/geometry/units";

export type BlankAttribute = "rocker" | "thickness" | "width";
export const BLANK_ATTRIBUTES: readonly BlankAttribute[] = ["rocker", "thickness", "width"];

/** Which way each attribute's curve runs from its anchor, exactly as `prepareBlank` draws it. */
const KIND: Record<BlankAttribute, RootKind> = { rocker: "rise", thickness: "fall", width: "fall" };

/** One attribute's printed value at a station, or null where the catalogue printed nothing. */
export function attributeValue(station: BlankStation, attribute: BlankAttribute): Mm | null {
  switch (attribute) {
    case "rocker":
      return station.rockerMm;
    case "thickness":
      return station.thicknessMm;
    case "width":
      return station.widthMm;
  }
}

/**
 * The curve through `points` on the live rule for `attribute` — the square-root rule the screens
 * draw with, a width's zero tips rounded — so a plot of the check shows the very curve ROCKER shows.
 */
export function liveAttributeCurve(points: readonly { x: number; y: number }[], attribute: BlankAttribute) {
  const curve = prepareRootCurve(points, KIND[attribute]);
  return attribute === "width" ? roundZeroTips(curve) : curve;
}

/** One printed station read against the curve the blank's other stations draw. */
export interface StationResidual {
  vendor: string;
  name: string;
  label: string;
  attribute: BlankAttribute;
  fromTailMm: Mm;
  /** As the catalogue prints it. */
  printedMm: Mm;
  /** What the live rule reads there through the other stations. */
  impliedMm: number;
  /** printed − implied: positive when the catalogue sits above the curve. */
  residualMm: number;
  /** How many other stations drew the implied curve. */
  others: number;
  /** This station's place among the attribute's printed stations, tail to nose (0 = the first). */
  knotIndex: number;
  /** The wider of the two gaps to the neighbouring printed stations (mm). */
  gapMm: number;
  /**
   * How much to trust a reading here: `"high"` when both neighbours are within 6 1/2" (US Blanks'
   * 6" stations — the curve between such close stations is well pinned, so a station off it is
   * most likely a slip in the figure); `"low"` when a neighbour is further off (12" and 24"
   * stations), where the rule drawn without this station can miss a real nose kick or a blunt tip
   * by as much as a misprint would, so a reading here is a question, not an answer.
   */
  confidence: "high" | "low";
}

/** Neighbours within this distance pin the curve well enough to trust a reading between them. */
const CLOSE_STATION_MM = inchesToMm(6.5);

/** One attribute's printed stations, as knots. */
function knotsOf(record: BlankRecord, attribute: BlankAttribute): BlankStation[] {
  return record.stations.filter((station) => attributeValue(station, attribute) !== null);
}

/**
 * What the live rule reads at knot `i` through the other knots — all of them but `i`, and but
 * `without` too when given (to ask whether a neighbour's reading was only that other knot's doing).
 * Null when fewer than three knots are left to draw through.
 */
function impliedAt(
  knots: readonly BlankStation[],
  attribute: BlankAttribute,
  i: number,
  without: ReadonlySet<number> = new Set(),
): number | null {
  const others = knots
    .filter((_, j) => j !== i && !without.has(j))
    .map((knot) => ({ x: knot.fromTailMm as number, y: attributeValue(knot, attribute) as number }));
  if (others.length < 3) return null;
  return liveAttributeCurve(others, attribute).sample(knots[i].fromTailMm);
}

/**
 * Leave-one-out on the live rule for every interior, non-anchor station of every attribute that has
 * at least four printed stations (three others to draw a curve through). See the file header for
 * why tips and anchors are left out.
 */
export function leaveOneOutResiduals(record: BlankRecord): StationResidual[] {
  const out: StationResidual[] = [];
  for (const attribute of BLANK_ATTRIBUTES) {
    const knots = knotsOf(record, attribute);
    if (knots.length < 4) continue;
    const ys = knots.map((knot) => attributeValue(knot, attribute) as Mm);
    const anchor = attribute === "rocker" ? Math.min(...ys) : Math.max(...ys);
    for (let i = 1; i < knots.length - 1; i++) {
      if (ys[i] === anchor) continue;
      const implied = impliedAt(knots, attribute, i);
      if (implied === null) continue;
      out.push({
        vendor: record.vendor,
        name: record.name,
        label: knots[i].label,
        attribute,
        fromTailMm: knots[i].fromTailMm,
        printedMm: ys[i],
        impliedMm: implied,
        residualMm: ys[i] - implied,
        others: knots.length - 1,
        knotIndex: i,
        gapMm: Math.max(knots[i].fromTailMm - knots[i - 1].fromTailMm, knots[i + 1].fromTailMm - knots[i].fromTailMm),
        confidence:
          Math.max(knots[i].fromTailMm - knots[i - 1].fromTailMm, knots[i + 1].fromTailMm - knots[i].fromTailMm) <= CLOSE_STATION_MM
            ? "high"
            : "low",
      });
    }
  }
  return out;
}

/**
 * Robust z-scores: each value's distance from the median in units of the scaled median absolute
 * deviation (×1.4826, so a normal sample reads in standard deviations). When more than half the
 * values are identical the MAD is 0 and says nothing, so the scale falls back to the mean absolute
 * deviation (×1.2533, the same normal footing); when every value is the same nothing stands out and
 * every score is 0.
 */
export function robustZScores(values: readonly number[]): number[] {
  if (values.length === 0) return [];
  const med = median(values);
  const deviations = values.map((value) => Math.abs(value - med));
  let scale = 1.4826 * median(deviations);
  if (scale === 0) scale = (1.2533 * deviations.reduce((sum, d) => sum + d, 0)) / deviations.length;
  if (scale === 0) return values.map(() => 0);
  return values.map((value) => (value - med) / scale);
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** A residual that stood out inside its maker-and-attribute group. */
export interface OutlierStation extends StationResidual {
  /** The residual's robust z inside its group. */
  z: number;
  /** How many residuals the group held. */
  groupSize: number;
}

export interface OutlierThresholds {
  /** |z| at or above which a residual is an outlier. */
  z: number;
  /** The smallest residual, per attribute, that counts at all (mm). */
  floorMm: Record<BlankAttribute, number>;
}

/** The defaults: 3.5 scaled MADs, and at least 1/16" (rocker, thickness) or 1/8" (width) off. */
export const DEFAULT_OUTLIER_THRESHOLDS: OutlierThresholds = {
  z: 3.5,
  floorMm: {
    rocker: inchesToMm(1 / 16),
    thickness: inchesToMm(1 / 16),
    width: inchesToMm(1 / 8),
  },
};

/**
 * Every station in `records` that sits off its own blank's curve: the leave-one-out residuals of
 * all the records, scored inside a group of the SAME station on the maker's other blanks (maker +
 * station label + attribute), the ones at or beyond the thresholds returned most extreme first.
 * Scoring per station label matters: the rule cannot follow every shape equally well everywhere — a
 * blunt longboard nose reads wide of the curve at its last station on every such blank — and judged
 * against its own station the usual amount of that is normal, so only the unusual one stands out.
 * A label group with fewer than six residuals falls back to the maker + attribute group; a group
 * still under six is never scored (too few to know what is normal).
 *
 * One bad station throws its neighbours' readings off too: with it left in, the curve through the
 * others bends toward it, so the stations around it read off the curve as well — echoes, which under
 * the square-root rule can even read larger than the bump itself near a tip. So on each blank and
 * attribute with more than one flagged station, the flagged stations are taken in order of how far
 * off they read: the furthest is kept, the others are re-read with every kept station left out as
 * well, and any whose reading then falls under the floor was only echoing and is dropped; the rest
 * are taken in turn the same way. A bump reads as one finding; two real slips stay two.
 */
export function findOutliers(
  records: readonly BlankRecord[],
  thresholds: OutlierThresholds = DEFAULT_OUTLIER_THRESHOLDS,
): OutlierStation[] {
  const all = records.flatMap(leaveOneOutResiduals);
  const byLabel = new Map<string, StationResidual[]>();
  const byAttribute = new Map<string, StationResidual[]>();
  const push = (map: Map<string, StationResidual[]>, key: string, residual: StationResidual) => {
    const group = map.get(key);
    if (group) group.push(residual);
    else map.set(key, [residual]);
  };
  for (const residual of all) {
    push(byLabel, `${residual.vendor}\u0000${residual.label}\u0000${residual.attribute}`, residual);
    push(byAttribute, `${residual.vendor}\u0000${residual.attribute}`, residual);
  }
  const scored = new Map<StationResidual, { z: number; groupSize: number }>();
  const score = (group: StationResidual[]) => {
    const zs = robustZScores(group.map((residual) => residual.residualMm));
    group.forEach((residual, i) => scored.set(residual, { z: zs[i], groupSize: group.length }));
  };
  for (const group of byLabel.values()) if (group.length >= 6) score(group);
  for (const group of byAttribute.values()) {
    const unscored = group.filter((residual) => !scored.has(residual));
    if (unscored.length >= 6) score(unscored);
  }
  const out: OutlierStation[] = [];
  for (const residual of all) {
    const s = scored.get(residual);
    if (!s) continue;
    if (Math.abs(s.z) >= thresholds.z && Math.abs(residual.residualMm) >= thresholds.floorMm[residual.attribute]) {
      out.push({ ...residual, ...s });
    }
  }
  // Echoes (see the doc comment above): per blank and attribute, keep the furthest-off station,
  // re-read the others with the kept ones left out, drop what collapses, repeat.
  const echoes = new Set<OutlierStation>();
  const perCurve = new Map<string, OutlierStation[]>();
  for (const o of out) {
    const key = `${o.vendor}\u0000${o.name}\u0000${o.attribute}`;
    const group = perCurve.get(key);
    if (group) group.push(o);
    else perCurve.set(key, [o]);
  }
  for (const flagged of perCurve.values()) {
    if (flagged.length < 2) continue;
    const record = records.find((r) => r.vendor === flagged[0].vendor && r.name === flagged[0].name)!;
    const knots = knotsOf(record, flagged[0].attribute);
    const floor = thresholds.floorMm[flagged[0].attribute];
    const kept = new Set<number>();
    const undecided = [...flagged].sort((a, b) => Math.abs(b.residualMm) - Math.abs(a.residualMm));
    while (undecided.length > 0) {
      const culprit = undecided.shift()!;
      kept.add(culprit.knotIndex);
      for (const other of [...undecided]) {
        const implied = impliedAt(knots, other.attribute, other.knotIndex, kept);
        if (implied !== null && Math.abs(other.printedMm - implied) < floor) {
          echoes.add(other);
          undecided.splice(undecided.indexOf(other), 1);
        }
      }
    }
  }
  return out
    .filter((o) => !echoes.has(o))
    .sort((a, b) => (a.confidence === b.confidence ? Math.abs(b.z) - Math.abs(a.z) : a.confidence === "high" ? -1 : 1));
}

/** One station's share of its anchor, against the same station on the maker's other blanks. */
export interface MakerNormDeviation {
  vendor: string;
  name: string;
  label: string;
  attribute: BlankAttribute;
  printedMm: Mm;
  /** The printed value over its anchor (centre, or the tip on that side for a rocker). */
  share: number;
  /** The maker's median share for this station and attribute. */
  typicalShare: number;
  /** What the typical share would make this station, in mm. */
  typicalMm: number;
  z: number;
  groupSize: number;
}

/** The anchor a station's share is taken over, or null when the blank has none to offer. */
function anchorOf(record: BlankRecord, station: BlankStation, attribute: BlankAttribute): Mm | null {
  if (attribute === "rocker") {
    if (station.label === "C" || station.label === "N0" || station.label === "T0") return null;
    const tip = record.stations.find((s) => s.label === (station.label.startsWith("N") ? "N0" : "T0"));
    return tip ? tip.rockerMm : null;
  }
  const centre = record.stations.find((s) => s.label === "C");
  return centre ? attributeValue(centre, attribute) : null;
}

/**
 * The weaker signal (see the file header): stations whose share of their anchor is far from the
 * maker's median for that station label and attribute, |z| at or beyond `zThreshold`, most extreme
 * first. Tip widths are left out (a tip printed 0 is a rounded nose, not a measurement), as are
 * groups with fewer than six blanks printing that station.
 */
export function makerNormDeviations(records: readonly BlankRecord[], zThreshold = 3.5): MakerNormDeviation[] {
  const groups = new Map<string, Omit<MakerNormDeviation, "typicalShare" | "typicalMm" | "z" | "groupSize">[]>();
  for (const record of records) {
    for (const station of record.stations) {
      for (const attribute of BLANK_ATTRIBUTES) {
        if (attribute === "width" && (station.label === "N0" || station.label === "T0")) continue;
        const value = attributeValue(station, attribute);
        const anchor = anchorOf(record, station, attribute);
        if (value === null || anchor === null || anchor === 0) continue;
        const key = `${record.vendor}\u0000${station.label}\u0000${attribute}`;
        const entry = { vendor: record.vendor, name: record.name, label: station.label, attribute, printedMm: value, share: value / anchor };
        const group = groups.get(key);
        if (group) group.push(entry);
        else groups.set(key, [entry]);
      }
    }
  }
  const out: MakerNormDeviation[] = [];
  for (const group of groups.values()) {
    if (group.length < 6) continue;
    const shares = group.map((entry) => entry.share);
    const typical = median(shares);
    const zs = robustZScores(shares);
    group.forEach((entry, i) => {
      if (Math.abs(zs[i]) >= zThreshold) {
        out.push({
          ...entry,
          typicalShare: typical,
          typicalMm: (entry.printedMm / entry.share) * typical,
          z: zs[i],
          groupSize: group.length,
        });
      }
    });
  }
  return out.sort((a, b) => Math.abs(b.z) - Math.abs(a.z));
}
