/**
 * Volume estimator engine.
 *
 * Ported statement-for-statement from the prototype's `renderVals` calculation block
 * (reference/project/Volume.dc.html lines 308-363), with these deliberate changes and no others:
 *
 * 1. INCH-DOMAIN CORE. Every constant in this calculation is an inch quantity: the two factor
 *    tables, the 12" stations the trapezoid splits on, the 84" length threshold, the 1/2" and
 *    3/8" tip thicknesses. The prototype's arithmetic is ported statement-for-statement in
 *    inches in a private core, and the exported function converts `Mm` in and `Mm`/`Litres` out
 *    at the boundary. Same posture as rail-bands.ts and fins.ts; the inch core is never exported.
 * 2. LITRE CONSTANT — a real, recorded divergence from units.ts, now RESOLVED. The prototype
 *    divides cubic inches by 61.0237, a truncation of the exact 61.023744... conversion;
 *    units.ts's `cubicMmToLitres` is exact by definition (1 L = 1,000,000 mm3). They disagree by
 *    about 7.2e-7 relative — roughly 0.000025 L on a 35 L board. `computeVolume` (this estimator)
 *    keeps the prototype's own truncated litre constant below (exported for the golden tests), so
 *    the port stays bit-faithful to the numbers a shaper has already been reading; it still does
 *    NOT call `cubicMmToLitres`. `computeCrossSectionVolume` (added below) is the accurate path
 *    this deviation was waiting for, and it uses the exact conversion exclusively instead — the
 *    two never mix: the estimator's own constant is read only inside this file's inch-domain
 *    estimator core, `cubicMmToLitres` only inside `computeCrossSectionVolume`.
 * 3. MODEL DEVIATION FROM THE APPROVED DESIGN — now RESOLVED. `.planning/design/GEOMETRY-MODULE.md`
 *    prescribes a ~50-station Simpson integration over the foil. That needed the Phase 4 foil
 *    editor, which now exists: `computeCrossSectionVolume` below is that Simpson path, validated
 *    against a published blank datasheet (CONTEXT.md D-14). `computeVolume`, the prototype's
 *    three-station rail-profile method below, survives deliberately as the Volume screen's
 *    standalone quick-estimator mode (CONTEXT.md D-13) — it is not replaced. Since quick 261102-gec
 *    plan 03 (the founder's D-V1, 2026-11-02: "Switch to the finished curve") both paths count the
 *    FINISHED rail — the cut rail blended halfway into every band, the curve RAILS draws — exactly,
 *    through the cut area less the blends' thirds (`finished-rail.ts`'s `railBlendArea`):
 *    `computeCrossSectionVolume` at each of its 51 stations, and this estimator's three Cross-Section
 *    Thickness rows through the optional blend areas on `VolumeRailValues` (absent reads 0, the
 *    prototype's own cut rail, so its golden cases are unchanged).
 * 4. PRESENTATION SPLIT. Returns numbers, never display strings; the caller formats through
 *    `formatInchesFraction`. Nothing here formats.
 * 5. STATE AND EVENT WIRING EXCLUDED. `syncFromTemplate`, the two checkbox handlers, `applySeed`/
 *    `syncSnapshot`, copy-spec, compact mode, cm mode and `_themeVars` are screen and store
 *    concerns, not math.
 * 6. UNRENDERED DISCLAIMER OMITTED. The prototype computes a long path-aware `disclaimerText` its
 *    own markup never renders; only the short static line the markup shows is reproduced, and it
 *    lives in the component, not here.
 */

import type { Point2D } from "./board";
import { railBlendArea, sectionFinishedRail } from "./finished-rail";
import { type FoilSpec, foilStationPoints, sampleFoil } from "./foil";
import {
  DEFAULT_TIP_RAIL_SCALE,
  RAIL_NUDGE_KEYS,
  ZERO_RAIL_NUDGES,
  type ComputeRailSectionInput,
  type RailBandSpec,
  type RailMarkNudges,
  type RailSectionKey,
  buildRailProfile,
  computeRailSection,
  effectiveDeckPercent,
} from "./rail-bands";
import {
  type Litres,
  MM_PER_INCH,
  type Mm,
  cubicMmToLitres,
  inchesToMm,
  litres,
  mm,
  mmToInches,
  roundToSixteenthInch,
} from "./units";

/** Square millimetres per square inch — `MM_PER_INCH` squared, used only to convert the
 * template's `area` field (a plain square-millimetre number, not a branded `Mm`) at this
 * module's boundary. */
const SQMM_PER_SQIN = MM_PER_INCH * MM_PER_INCH;

// 7 fixed steps tuned so a 6'0" x 19" x 2.25" board lands exactly on 26-32L in 1L increments
// (Volume.dc.html lines 309-311).
export const AREA_FACTORS = [0.6443, 0.6609, 0.677, 0.6927, 0.7081, 0.7231, 0.7377] as const;
export const THICKNESS_FACTORS = [0.8, 0.81, 0.82, 0.83, 0.84, 0.85, 0.86] as const;
export const BOARD_TYPE_LABELS = [
  "Performance",
  "Performance",
  "Performance",
  "Balanced",
  "Beefy",
  "Beefy",
  "Beefy",
] as const;
export const BOARD_TYPE_STEP_COUNT = 7;

/** The prototype's own (truncated) cubic-inches-per-litre constant — see deviation 2 above. Not
 * the exact conversion `cubicMmToLitres` uses. */
export const CUBIC_INCHES_PER_LITRE = 61.0237;

/** Parametric controls for the volume estimator's manual/factor path. */
export interface VolumeSpec {
  length: Mm;
  width: Mm;
  centerThickness: Mm;
  boardTypeIndex: number;
  importTemplateDimensions: boolean;
  importRailThickness: boolean;
}

/** Ported from the prototype's state defaults (Volume.dc.html lines 188-198). */
export const DEFAULT_VOLUME_SPEC: VolumeSpec = {
  length: inchesToMm(72),
  width: inchesToMm(20),
  centerThickness: inchesToMm(2.5),
  boardTypeIndex: 3,
  importTemplateDimensions: true,
  importRailThickness: true,
};

/** The template-derived values the volume screen can import — the same field set the Sandbox
 * shell composes for Volume (Sandbox.dc.html lines 209-212). `area` is square millimetres,
 * matching `OutlineGeometry.area`. */
export interface VolumeTemplateValues {
  area: number;
  length: Mm;
  widePointWidth: Mm;
  noseWidthAt12: Mm;
  tailWidthAt12: Mm;
}

/** The rail-band-derived values the volume screen can import — the same field set the Sandbox
 * shell composes for Volume (Sandbox.dc.html lines 213-224), restricted to the fields this
 * module reads. Profiles are in the same coordinate frame `buildRailProfile` returns (x=0 at the
 * rail apex, negative inboard toward the stringer; y off the bottom), or null when unavailable. */
export interface VolumeRailValues {
  noseThickness: Mm;
  centerThickness: Mm;
  tailThickness: Mm;
  noseProfile: Point2D[] | null;
  centerProfile: Point2D[] | null;
  tailProfile: Point2D[] | null;
  /** The foam the finished rail's blends take off ONE rail of each section, in square millimetres
   * (`railBlendArea`, quick 261102-gec plan 03, D-V1/PV5): each Cross-Section Thickness row counts the
   * finished rail, as the quoted litres do. Absent reads 0 — the prototype had no finished rail, so its
   * golden cases leave them out. `deriveRailValues` always fills them. */
  noseBlendArea?: number;
  centerBlendArea?: number;
  tailBlendArea?: number;
}

/** Every value the volume screen's sidebar and calculation card read. */
export interface VolumeResult {
  templateAvailable: boolean;
  railAvailable: boolean;
  importingTemplate: boolean;
  importingRailThickness: boolean;
  geomReady: boolean;
  /** Square millimetres — imported from the template area, or estimated from length x width x
   * the area factor. */
  area: number;
  areaFactor: number;
  thicknessFactor: number;
  boardTypeLabel: string;
  /** Non-null only when `geomReady`. */
  tailCrossSectionThickness: Mm | null;
  centerCrossSectionThickness: Mm | null;
  noseCrossSectionThickness: Mm | null;
  weightedThickness: Mm;
  volumeCubicInches: number;
  volumeLitres: Litres;
}

// ---------------------------------------------------------------------------------------------
// Private inch-domain core — statement-for-statement port. Never exported.
// ---------------------------------------------------------------------------------------------

interface VolumeSpecInches {
  lengthIn: number;
  widthIn: number;
  centerThicknessIn: number;
  boardTypeIndex: number;
  importTemplateDimensions: boolean;
  importRailThickness: boolean;
}

interface VolumeTemplateValuesInches {
  areaSqIn: number;
  widePointWidthIn: number;
  noseWidthAt12In: number;
  tailWidthAt12In: number;
}

interface VolumeRailValuesInches {
  noseThicknessIn: number;
  centerThicknessIn: number;
  tailThicknessIn: number;
  noseProfileIn: [number, number][] | null;
  centerProfileIn: [number, number][] | null;
  tailProfileIn: [number, number][] | null;
  noseBlendSqIn: number;
  centerBlendSqIn: number;
  tailBlendSqIn: number;
}

interface VolumeResultInches {
  templateAvailable: boolean;
  railAvailable: boolean;
  importingTemplate: boolean;
  importingRailThickness: boolean;
  geomReady: boolean;
  areaSqIn: number;
  areaFactor: number;
  thicknessFactor: number;
  boardTypeLabel: string;
  tailEffIn: number | null;
  centerEffIn: number | null;
  noseEffIn: number | null;
  weightedThicknessIn: number;
  volumeCuIn: number;
  volumeLiters: number;
}

/** Shoelace polygon area (Volume.dc.html lines 335-342). */
function shoelaceArea(pts: [number, number][]): number {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a) / 2;
}

// Closes the half cross-section into a polygon by prepending [-halfWidth, boardThickness] and
// appending [-halfWidth, 0] to the rail profile — the flat run of full-thickness, un-tapered foam
// from the profile's innermost point in to the stringer — then divides the shoelace area by the
// half width to back out an equivalent uniform thickness. A zero half width returns zero rather
// than dividing (Volume.dc.html lines 343-347). `blendSqIn` is the foam the finished rail's blends take
// off that one rail (quick 261102-gec plan 03, D-V1): it comes off the cut area before the division, so
// the row reads the finished rail, exactly as the quoted litres do. 0 is the prototype's own cut rail.
function stationEffThickness(
  profile: [number, number][],
  boardThickness: number,
  halfWidth: number,
  blendSqIn: number,
): number {
  if (!halfWidth) return 0;
  const poly: [number, number][] = [[-halfWidth, boardThickness], ...profile, [-halfWidth, 0]];
  return (shoelaceArea(poly) - blendSqIn) / halfWidth;
}

/** Statement-for-statement port of `renderVals`'s volume calculation (Volume.dc.html lines
 * 308-363). Keeps the prototype's own long comment explaining why the shoelace result is exact
 * for that cross-section rather than a fudge factor. */
function computeVolumeInches(
  spec: VolumeSpecInches,
  template: VolumeTemplateValuesInches | null,
  rail: VolumeRailValuesInches | null,
): VolumeResultInches {
  const areaFactor = AREA_FACTORS[spec.boardTypeIndex];
  const thicknessFactor = THICKNESS_FACTORS[spec.boardTypeIndex];
  const boardTypeLabel = BOARD_TYPE_LABELS[spec.boardTypeIndex];

  // templateAvailable requires an available bag AND a non-null area; railAvailable requires an
  // available bag AND a non-null centre thickness.
  const templateAvailable = !!(template && template.areaSqIn != null);
  const railAvailable = !!(rail && rail.centerThicknessIn != null);
  // importingTemplate needs the toggle and availability; importingRailThickness needs its own
  // toggle, rail availability AND importingTemplate — the rail path can never be active without
  // the template path.
  const importingTemplate = spec.importTemplateDimensions && templateAvailable;
  const importingRailThickness = spec.importRailThickness && railAvailable && importingTemplate;

  const areaSqIn = importingTemplate
    ? (template as VolumeTemplateValuesInches).areaSqIn
    : spec.lengthIn * spec.widthIn * areaFactor;

  // Real-geometry path: build each station's true half cross-section polygon from the Rail Band
  // Calculator's actual point-to-point profile (deck marks, rail marks, tucks) plus a flat closing
  // run from the profile's innermost point to the centerline at full board thickness (the board is
  // solid, un-tapered foam inboard of the rail bands), shoelace that polygon for its area, and back
  // that out into an equivalent uniform thickness (area / half-width) — this is exact for that
  // cross-section, not a fudge factor. The three stations are then length-weighted by trapezoidal
  // integration along the board, same station layout the estimator always used (tip -> @12" ->
  // center -> @12" -> tip).
  const geomReady = !!(
    importingRailThickness &&
    rail &&
    rail.noseProfileIn &&
    rail.centerProfileIn &&
    rail.tailProfileIn &&
    template &&
    template.noseWidthAt12In != null &&
    template.tailWidthAt12In != null &&
    template.widePointWidthIn != null &&
    rail.noseThicknessIn != null &&
    rail.centerThicknessIn != null &&
    rail.tailThicknessIn != null
  );

  let weightedThicknessIn: number;
  let volumeCuIn: number;
  let tailEffIn: number | null = null;
  let centerEffIn: number | null = null;
  let noseEffIn: number | null = null;

  if (geomReady) {
    const t = template as VolumeTemplateValuesInches;
    const r = rail as VolumeRailValuesInches;
    // Tail from tailWidthAt12/2, centre from widePointWidth/2, nose from noseWidthAt12/2, each
    // paired with that station's own board thickness.
    tailEffIn = stationEffThickness(
      r.tailProfileIn as [number, number][],
      r.tailThicknessIn,
      t.tailWidthAt12In / 2,
      r.tailBlendSqIn,
    );
    centerEffIn = stationEffThickness(
      r.centerProfileIn as [number, number][],
      r.centerThicknessIn,
      t.widePointWidthIn / 2,
      r.centerBlendSqIn,
    );
    noseEffIn = stationEffThickness(
      r.noseProfileIn as [number, number][],
      r.noseThicknessIn,
      t.noseWidthAt12In / 2,
      r.noseBlendSqIn,
    );

    const L = spec.lengthIn;
    // Tip thickness switches at exactly 84": under 84" uses 1/2", at/over 84" uses 3/8".
    const tipThickness = L < 84 ? 0.5 : 0.375;
    const halfLen = L / 2;
    const trapz = (a: number, b: number, d: number) => ((a + b) / 2) * d;
    // Trapezoidal weighting runs tip -> tail@12" -> centre -> nose@12" -> tip with spans of 12,
    // halfLen-12, (L-12)-halfLen, and 12. Keep the prototype's asymmetric third span exactly as
    // written — do not "tidy" it into `halfLen - 12`.
    const totalArea =
      trapz(tipThickness, tailEffIn, 12) +
      trapz(tailEffIn, centerEffIn, halfLen - 12) +
      trapz(centerEffIn, noseEffIn, L - 12 - halfLen) +
      trapz(noseEffIn, tipThickness, 12);
    weightedThicknessIn = totalArea / L;
    volumeCuIn = areaSqIn * weightedThicknessIn;
  } else {
    // Fallback: when the rail import is on but geometry is incomplete, weighted thickness is the
    // centre thickness raw; otherwise it is centre thickness times the board-type thickness
    // factor. The area factor is applied only when the template area is not imported (above).
    weightedThicknessIn = importingRailThickness ? spec.centerThicknessIn : spec.centerThicknessIn * thicknessFactor;
    volumeCuIn = areaSqIn * weightedThicknessIn;
  }

  const volumeLiters = volumeCuIn / CUBIC_INCHES_PER_LITRE;

  return {
    templateAvailable,
    railAvailable,
    importingTemplate,
    importingRailThickness,
    geomReady,
    areaSqIn,
    areaFactor,
    thicknessFactor,
    boardTypeLabel,
    tailEffIn,
    centerEffIn,
    noseEffIn,
    weightedThicknessIn,
    volumeCuIn,
    volumeLiters,
  };
}

// ---------------------------------------------------------------------------------------------
// Public Mm boundary
// ---------------------------------------------------------------------------------------------

function pointsToInches(points: Point2D[] | null): [number, number][] | null {
  if (!points) return null;
  return points.map((p): [number, number] => [mmToInches(p.x), mmToInches(p.y)]);
}

/** Mm-boundary port of the prototype's volume calculation. A null template with
 * `importTemplateDimensions: true` behaves as not importing (`templateAvailable` false), and a
 * null rail bag likewise — the screen degrades to the manual factor path rather than throwing. */
export function computeVolume(
  spec: VolumeSpec,
  template: VolumeTemplateValues | null,
  rail: VolumeRailValues | null,
): VolumeResult {
  const specIn: VolumeSpecInches = {
    lengthIn: mmToInches(spec.length),
    widthIn: mmToInches(spec.width),
    centerThicknessIn: mmToInches(spec.centerThickness),
    boardTypeIndex: spec.boardTypeIndex,
    importTemplateDimensions: spec.importTemplateDimensions,
    importRailThickness: spec.importRailThickness,
  };
  const templateIn: VolumeTemplateValuesInches | null = template
    ? {
        areaSqIn: template.area / SQMM_PER_SQIN,
        widePointWidthIn: mmToInches(template.widePointWidth),
        noseWidthAt12In: mmToInches(template.noseWidthAt12),
        tailWidthAt12In: mmToInches(template.tailWidthAt12),
      }
    : null;
  const railIn: VolumeRailValuesInches | null = rail
    ? {
        noseThicknessIn: mmToInches(rail.noseThickness),
        centerThicknessIn: mmToInches(rail.centerThickness),
        tailThicknessIn: mmToInches(rail.tailThickness),
        noseProfileIn: pointsToInches(rail.noseProfile),
        centerProfileIn: pointsToInches(rail.centerProfile),
        tailProfileIn: pointsToInches(rail.tailProfile),
        noseBlendSqIn: (rail.noseBlendArea ?? 0) / SQMM_PER_SQIN,
        centerBlendSqIn: (rail.centerBlendArea ?? 0) / SQMM_PER_SQIN,
        tailBlendSqIn: (rail.tailBlendArea ?? 0) / SQMM_PER_SQIN,
      }
    : null;

  const core = computeVolumeInches(specIn, templateIn, railIn);

  return {
    templateAvailable: core.templateAvailable,
    railAvailable: core.railAvailable,
    importingTemplate: core.importingTemplate,
    importingRailThickness: core.importingRailThickness,
    geomReady: core.geomReady,
    area: core.areaSqIn * SQMM_PER_SQIN,
    areaFactor: core.areaFactor,
    thicknessFactor: core.thicknessFactor,
    boardTypeLabel: core.boardTypeLabel,
    tailCrossSectionThickness: core.tailEffIn !== null ? inchesToMm(core.tailEffIn) : null,
    centerCrossSectionThickness: core.centerEffIn !== null ? inchesToMm(core.centerEffIn) : null,
    noseCrossSectionThickness: core.noseEffIn !== null ? inchesToMm(core.noseEffIn) : null,
    weightedThickness: mm(inchesToMm(core.weightedThicknessIn)),
    volumeCubicInches: core.volumeCuIn,
    volumeLitres: litres(core.volumeLiters),
  };
}

// ---------------------------------------------------------------------------------------------
// Cross-section volume — the accurate path (deviation 3, resolved above). Millimetre-domain
// throughout; no inch core, because buildRailProfile already returns millimetre points and this
// path converts to litres exactly once, through cubicMmToLitres.
// ---------------------------------------------------------------------------------------------

/** The composite Simpson one-third rule alternates a four-two weight pattern across the interior
 * samples and is only exact — indeed only VALID — over an even number of panels. 50 is a named
 * constant with its own unit assertion (`SIMPSON_PANEL_COUNT is even`) rather than a round number
 * inlined at the integration call site, so a future edit that breaks the parity fails loudly
 * instead of quietly biasing every volume figure the app quotes. */
export const SIMPSON_PANEL_COUNT = 50;

/**
 * Composite Simpson's one-third rule over `samples.length - 1` evenly spaced panels of width `h`:
 * the two end samples weight 1, odd-indexed interior samples weight 4, even-indexed interior
 * samples weight 2, and the weighted sum is multiplied by `h / 3`. Simpson's rule is exact for any
 * polynomial up to cubic degree, which is what the golden tests check it against. Throws rather
 * than integrating with a broken weight pattern when the panel count is odd or fewer than two, or
 * when the sample count does not match `panels + 1`.
 */
export function simpsonIntegrate(samples: number[], h: number): number {
  const panels = samples.length - 1;
  if (panels < 2 || panels % 2 !== 0) {
    throw new Error(
      `simpsonIntegrate: composite Simpson's one-third rule requires an even panel count of at least 2; got ${panels} panels from ${samples.length} samples`,
    );
  }
  let sum = samples[0] + samples[panels];
  for (let i = 1; i < panels; i++) {
    sum += (i % 2 === 0 ? 2 : 4) * samples[i];
  }
  return (h / 3) * sum;
}

/**
 * The `SIMPSON_PANEL_COUNT + 1` stations the cross-sections are taken at, tail end to nose.
 *
 * With no tail cut — `cutStation` 0, or anything not strictly inside the board — these are today's
 * even stations, `i x (length / SIMPSON_PANEL_COUNT)`, exactly. With one (a diamond's tail block or a
 * swallow's crotch, `tailCutStation` in outline.ts) the corner itself is a station: the even panel
 * count nearest the cut's share of the board, held to 2..48, spaced evenly from the tail end to the
 * corner, and the rest spaced evenly from the corner to the nose. Both pieces have an even number of
 * panels, so Simpson's rule runs over each, and the cut's straight edges are integrated exactly rather
 * than straddled by a panel.
 */
export function crossSectionStations(length: Mm, cutStation: Mm): Mm[] {
  const h = length / SIMPSON_PANEL_COUNT;
  const stations: Mm[] = [];
  if (!splitsAtCut(length, cutStation)) {
    for (let i = 0; i <= SIMPSON_PANEL_COUNT; i++) stations.push(mm(i * h));
    return stations;
  }
  const m = cutPanelCount(length, cutStation);
  for (let i = 0; i < m; i++) stations.push(mm(i * (cutStation / m)));
  stations.push(cutStation);
  for (let i = 1; i < SIMPSON_PANEL_COUNT - m; i++) {
    stations.push(mm(cutStation + i * ((length - cutStation) / (SIMPSON_PANEL_COUNT - m))));
  }
  stations.push(length);
  return stations;
}

/** Whether a cut's corner lies strictly inside the board, so the stations split there. */
function splitsAtCut(length: number, cutStation: number): boolean {
  return Number.isFinite(cutStation) && cutStation > 0 && cutStation < length;
}

/** How many of the panels lie between the tail end and a cut's corner: the even count nearest the
 * cut's share of the board, at least 2 and leaving at least 2 for the rest. */
function cutPanelCount(length: number, cutStation: number): number {
  const h = length / SIMPSON_PANEL_COUNT;
  return Math.min(SIMPSON_PANEL_COUNT - 2, Math.max(2, 2 * Math.round(cutStation / (2 * h))));
}

/** Input to `computeCrossSectionVolume`. `halfWidthAt` is a half-width SAMPLER rather than an
 * `OutlineGeometry` directly: the app passes `crossSectionFoam(outlineGeometry)` from design.ts —
 * the foam actually there on one side of the stringer, a swallow's notch left out and a diamond's V
 * counted (outline.ts's `foamHalfWidth`) — and the blank-datasheet validation test below passes a
 * monotone spline through a real blank's five quoted widths instead. Taking a function rather than a
 * concrete outline type is what makes that validation possible at all, and it keeps this module from
 * importing the outline builder. */
export interface CrossSectionVolumeInput {
  halfWidthAt: (station: Mm) => Mm;
  /** The tail cut's corner (outline.ts's `tailCutStation`), made a station so the cut is integrated
   * exactly — see `crossSectionStations`. Absent or 0 is a tail with no cut: today's even stations. */
  cutStation?: Mm;
  foil: FoilSpec;
  rails: RailBandSpec;
  length: Mm;
  /**
   * The board's thickness at any station (Phase 11, Pattern 5). A foil read off a real blank must
   * be integrated densely, exactly as drawn — re-splining its five sampled stations is NOT the
   * blank's curve between them — so the store passes the side profile's own `thicknessAt`
   * (`lib/geometry/board-profile.ts`). Absent, it defaults to `sampleFoil` through `foil`'s five
   * stations, which is exactly what a hand-set board's profile draws. `foil` still places the
   * three rail-band anchors either way (their positions depend on length only).
   */
  thicknessAt?: (station: Mm) => Mm;
}

/** `stationAreas` are full (both-rails) cross-section areas in square millimetres, nose-to-tail —
 * exposed for the blank-datasheet validation test's family sweep and for anyone auditing a
 * specific station's contribution to the total. */
export interface CrossSectionVolumeResult {
  volumeLitres: Litres;
  volumeMm3: number;
  panelCount: number;
  /** Where each of `stationAreas` was taken, tail end to nose (`crossSectionStations`). */
  stations: Mm[];
  stationAreas: number[];
  /** The foam the finished rail's blends take off each station, both rails, in square millimetres
   * (quick 261102-gec plan 03, PV5): `stationAreas[i] + stationBlendAreas[i]` is that station's cut area.
   * Exposed for auditing, as `stationAreas` is. */
  stationBlendAreas: number[];
}

/** Linear interpolation between the three anchor sections (tail 12", centre, nose 12"), holding
 * the outer value constant beyond the outer two anchors — the shared shape every continuous
 * per-station field (`deckPercent`, `ratioTopPercent`, the scale and each nudge) blends through. */
function blendContinuous(
  station: number,
  tailStation: number,
  tailVal: number,
  centerStation: number,
  centerVal: number,
  noseStation: number,
  noseVal: number,
): number {
  if (station <= tailStation) return tailVal;
  if (station <= centerStation) {
    const t = (station - tailStation) / (centerStation - tailStation);
    return tailVal + (centerVal - tailVal) * t;
  }
  if (station <= noseStation) {
    const t = (station - centerStation) / (noseStation - centerStation);
    return centerVal + (noseVal - centerVal) * t;
  }
  return noseVal;
}

/** Which of the three anchor sections (tail 12", centre, nose 12") this station is closest to —
 * the source for every DISCRETE per-station field, which cannot be interpolated. */
function nearestAnchorSection(
  station: number,
  tailStation: number,
  centerStation: number,
  noseStation: number,
): RailSectionKey {
  const dTail = Math.abs(station - tailStation);
  const dCenter = Math.abs(station - centerStation);
  const dNose = Math.abs(station - noseStation);
  if (dTail <= dCenter && dTail <= dNose) return "tail";
  if (dCenter <= dNose) return "center";
  return "nose";
}

/** Closes a half cross-section profile into a polygon exactly as `stationEffThickness` does above
 * — prepend the full-thickness point at minus-half-width, append the zero-height point at
 * minus-half-width, closing the flat run of solid, un-tapered foam from the profile's innermost
 * point in to the stringer — then shoelaces it and doubles the result for the FULL (both-rails)
 * cross-section area, in square millimetres. A zero half-width returns zero rather than building
 * a degenerate polygon. */
function stationArea(profile: [number, number][], boardThickness: number, halfWidth: number): number {
  if (!halfWidth) return 0;
  const poly: [number, number][] = [[-halfWidth, boardThickness], ...profile, [-halfWidth, 0]];
  return shoelaceArea(poly) * 2;
}

/**
 * Cross-section volume — the accurate path CONTEXT.md D-13 promises everywhere the app quotes
 * volume. Integrates `SIMPSON_PANEL_COUNT + 1` real cross-sections along the board's own length
 * with Simpson's rule and converts once through the exact `cubicMmToLitres`. Takes no rocker
 * argument: lifting a cross-section off the flat does not change its area, so rocker structurally
 * cannot reach this calculation.
 *
 * BLENDING RULE (CONTEXT.md's Claude's Discretion — "whether cross-sections use the rail-band
 * module's real computed sections or the design doc's named rail profiles"): this function re-runs
 * the real rail-band formula (`computeRailSection` + `buildRailProfile`) at every one of the 51
 * stations, rather than substituting one of the approved design's named boxy/medium/tapered
 * profiles. A station between the three rail-band anchors (tail 12", centre, nose 12") gets a
 * `RailSectionSpec`-shaped input built by blending those three known sections: the CONTINUOUS
 * fields — `deckPercent` (each anchor held at 75% or more first, R7), `ratioTopPercent`, the
 * "Scaled from center by" number (the centre always 1) and each of the seven nudges — are linearly
 * interpolated across station and held constant outboard of the outer two anchors (quick 261102-gec,
 * PC7: a nudge is a length, so a nudged centre fades into an un-nudged nose rather than stepping
 * halfway between them); the DISCRETE fields (`family`, `symmetrical`, `singleTuck`, and since quick
 * 261102-gec plan 05 `sharpBottomTuck`, R22/PC39) come from the nearest anchor section wholesale, because
 * a family index or a boolean cannot be interpolated.
 * `tailHardEdge` applies only at stations whose nearest anchor is the tail. The board thickness at
 * the station is T and the 1/16"-rounded tapered rail thickness t, so the Domed Deck Band (2.4 x T)
 * follows the board's own thickness along its length.
 *
 * FINISHED RAIL (quick 261102-gec plan 03, the founder's D-V1, 2026-11-02: "Switch to the finished
 * curve"). Each station counts the finished rail — the cut rail with every corner blended halfway into
 * the bands either side, the curve RAILS draws — not the raw band cuts. It is worked out exactly, not by
 * sampling the curve (PV1): the cut area comes from the faceted profile as before (proven to enclose
 * exactly the foam the cuts leave), and both rails' blend areas come off it (`railBlendArea` of
 * `sectionFinishedRail`, the cut's own area less Green's theorem on the finished curve — plan 05). Since
 * plan 05 (R22/R23) that curve rolls off the deck by the founder's continuous one-curve rule and keeps its
 * bottom edge sharp at Bottom Tuck 3 where the nearest rail's box asks for it. The faceted profile survives only
 * as that base (PV3). This makes the integrated volume truthful to the board actually drawn, station by
 * station, rather than to a canned profile shape.
 *
 * TAIL CUT (quick 261103-gcm, the founder, 2026-11-03: the litres count the tail the board is drawn
 * with). `halfWidthAt` is the foam actually there, so a station inside a swallow's notch reads the foam
 * on one side of the notch and a station inside a diamond's V reads the V's own width. A swallow's tail
 * is two pieces, each with the notch's square wall on its inside and the rail on its outside — exactly
 * the half-section this function already builds, at the piece's width — so the finished-rail basis above
 * is untouched: the notch takes its wall's full thickness out of every station it reaches. The cut's
 * corner (the diamond's tail block, the swallow's crotch) is itself a station (`cutStation`, see
 * `crossSectionStations`), and Simpson runs over each side of it separately: the cut's edges are
 * straight, so the plan area the stations integrate holds the whole V or notch exactly, rather than a
 * panel straddling the corner's step.
 */
export function computeCrossSectionVolume(input: CrossSectionVolumeInput): CrossSectionVolumeResult {
  const { halfWidthAt, foil, rails, length } = input;
  const thicknessAt = input.thicknessAt ?? ((station: Mm) => sampleFoil(foil, length, station));

  const anchors = foilStationPoints(foil, length);
  const tailAnchor = anchors[1]; // tail12
  const centerAnchor = anchors[2]; // center
  const noseAnchor = anchors[3]; // nose12
  const tailStation = tailAnchor.station;
  const centerStation = centerAnchor.station;
  const noseStation = noseAnchor.station;

  // A section saved before quick 261102-gec reads its defaults (design-snapshot rule 10).
  const tailScale = rails.tail.scaleFromCenter ?? DEFAULT_TIP_RAIL_SCALE;
  const noseScale = rails.nose.scaleFromCenter ?? DEFAULT_TIP_RAIL_SCALE;
  const tailNudges = rails.tail.nudges ?? ZERO_RAIL_NUDGES;
  const centerNudges = rails.center.nudges ?? ZERO_RAIL_NUDGES;
  const noseNudges = rails.nose.nudges ?? ZERO_RAIL_NUDGES;

  const cutStation = input.cutStation ?? mm(0);
  const stations = crossSectionStations(length, cutStation);
  const stationAreas: number[] = [];
  const stationBlendAreas: number[] = [];

  for (const station of stations) {
    const halfWidth = halfWidthAt(station);

    if (halfWidth === 0) {
      stationAreas.push(0);
      stationBlendAreas.push(0);
      continue;
    }

    const thickness = thicknessAt(station);

    const deckPercent = blendContinuous(
      station,
      tailStation,
      effectiveDeckPercent(rails.tail.deckPercent),
      centerStation,
      effectiveDeckPercent(rails.center.deckPercent),
      noseStation,
      effectiveDeckPercent(rails.nose.deckPercent),
    );
    const ratioTopPercent = blendContinuous(
      station,
      tailStation,
      rails.tail.ratioTopPercent,
      centerStation,
      rails.center.ratioTopPercent,
      noseStation,
      rails.nose.ratioTopPercent,
    );
    const scale = blendContinuous(station, tailStation, tailScale, centerStation, 1, noseStation, noseScale);
    const nudges = Object.fromEntries(
      RAIL_NUDGE_KEYS.map((key) => [
        key,
        mm(
          blendContinuous(
            station,
            tailStation,
            tailNudges[key],
            centerStation,
            centerNudges[key],
            noseStation,
            noseNudges[key],
          ),
        ),
      ]),
    ) as RailMarkNudges;

    const nearestKey = nearestAnchorSection(station, tailStation, centerStation, noseStation);
    const nearestSpec = rails[nearestKey];

    const domed = deckPercent < 100;
    const railThicknessClamped = roundToSixteenthInch(mm((thickness * deckPercent) / 100));
    const thicknessEff = domed ? railThicknessClamped : thickness;

    const sectionInput: ComputeRailSectionInput = {
      thickness: thicknessEff,
      boardThickness: thickness,
      ratioTopPercent,
      family: nearestSpec.family,
      scale,
      nudges,
      singleTuck: nearestSpec.singleTuck,
      sharpBottomTuck: nearestSpec.sharpBottomTuck,
      symmetrical: nearestSpec.symmetrical,
      hardEdge: nearestKey === "tail" && rails.tailHardEdge,
    };
    const result = computeRailSection(sectionInput);
    const profile = buildRailProfile(result);
    const profilePairs: [number, number][] = profile.map((p) => [p.x, p.y]);

    // The cut area less both rails' blends: the finished rail, exactly (D-V1, PV1).
    const blendBothRails = 2 * railBlendArea(sectionFinishedRail(result, domed));
    stationAreas.push(stationArea(profilePairs, thickness, halfWidth) - blendBothRails);
    stationBlendAreas.push(blendBothRails);
  }

  let volumeMm3: number;
  if (splitsAtCut(length, cutStation)) {
    // One Simpson run from the tail end to the corner, another from the corner to the nose.
    const m = cutPanelCount(length, cutStation);
    volumeMm3 =
      simpsonIntegrate(stationAreas.slice(0, m + 1), cutStation / m) +
      simpsonIntegrate(stationAreas.slice(m), (length - cutStation) / (SIMPSON_PANEL_COUNT - m));
  } else {
    volumeMm3 = simpsonIntegrate(stationAreas, length / SIMPSON_PANEL_COUNT);
  }

  return {
    volumeLitres: cubicMmToLitres(volumeMm3),
    volumeMm3,
    panelCount: SIMPSON_PANEL_COUNT,
    stations,
    stationAreas,
    stationBlendAreas,
  };
}
