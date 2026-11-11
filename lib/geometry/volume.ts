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
import {
  type HalfSectionPoints,
  blendFinishedRails,
  finishedRailReach,
  fittedFinishedRail,
  HALF_SECTION_POINT_COUNT,
  openedFinishedRail,
  railBlendArea,
  SECTION_POINTS,
  sampledFinishedRail,
  sampledSectionArea,
  sectionFinishedRail,
} from "./finished-rail";
import { FOIL_THICKNESS_RANGE_IN, type FoilSpec, foilStationPoints, sampleFoil } from "./foil";
import {
  DEFAULT_TIP_RAIL_SCALE,
  RAIL_NUDGE_KEYS,
  ZERO_RAIL_NUDGES,
  type ComputeRailSectionInput,
  type RailBandSpec,
  type RailFamily,
  type RailMarkNudges,
  type RailSectionKey,
  type RailSectionResult,
  buildRailProfile,
  computeRailSection,
  effectiveDeckPercent,
  hardEdgeBlendsFrom,
  hardEdgeEndsAt,
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
  /**
   * How far the stepped outline stands inside (+) or outside (−) the wing's meeting line at a station (Phase 16,
   * D-37, `wingShareAt` in wings.ts): `crossSectionFoam` sets it only on a winged outline. The live rule builds
   * each station near a wing at `halfWidthAt` plus this, then moves the rail onto the outline (`wingStepHalf`); the
   * old rules never read it.
   */
  wingShareAt?: (station: Mm) => Mm;
  /**
   * The foam the bottom contours take off (Phase 17, D-05, D-21): at a station, `across` millimetres in from the
   * section's own inside edge (the stringer, or a swallow's notch wall), how far the bottom is lifted above the planed
   * bottom. `design.ts` builds it from the board's bottom (`bottomSampler` in bottom.ts) only when the bottom cuts
   * anything, and hands it in as a closure — this file never imports the bottom, the outline, the wings or the fins
   * (the design rule above). Absent, every section is exactly as it always was. `boardSectionsWith` reads it at the end
   * of each section (`bottomedHalfSection`), so the litres, the 3D board and the CNC files all carry the same cut.
   */
  foamOffAt?: (station: Mm, across: Mm) => Mm;
  /**
   * Where the channels' walls stand (Phase 17, D-10, D-21; research §B): at a station, each wall's distance across on
   * one side, in from the section's own inside edge as `foamOffAt`'s `across` is — one entry per channel a side, the
   * same number at every station of a board (up to `BOTTOM_WALL_SLOTS`). `design.ts` supplies it beside `foamOffAt`
   * only when the bottom has channels. With it, every section's bottom run is laid out afresh to
   * `BOTTOM_RUN_WITH_WALLS` points with a top and a foot slot at each wall, so a wall is a vertical step in the ring
   * rather than a ramp between two of its points (`bottomedHalfWithWalls`). Absent, every section keeps its 24 points.
   */
  bottomWallsAt?: (station: Mm) => Mm[];
  /**
   * The foam the three sections' cuts alone take off (G-17-6, the founder's ruling of 2026-11-10; D-05): the vees,
   * bellies and concaves without the channels, read at the same station and `across` as `foamOffAt`
   * (`bottomSectionsSampler` in bottom.ts). `design.ts` hands it in only on a board with channels. With it the vee or
   * belly lifts the finished rail as always (D-41), and the channels are then cut straight up into the rail that
   * leaves — a channel's floor never rides up the rail's curve, and a wall under the curve keeps its face. Absent,
   * every section is exactly as it was.
   */
  sectionsOffAt?: (station: Mm, across: Mm) => Mm;
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
  /** The foam the tail's roll takes off the whole board, in cubic millimetres (D-38, `tailRollFoam`): already out of
   * `volumeMm3`, and not in `stationAreas`. 0 under a rule with a square tail. */
  tailRollMm3: number;
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
 * One station's finished-rail cross-section, as the litres count it and the 3D board draws it (D-05).
 * Each station reads two rail characters — the BASE (the centre's rail, under the live rule) and the TIP
 * (the tail's or the nose's) — and `tipWeight` says how much of the station is the tip's (Phase 16, D-32):
 * 0 all base, 1 all tip, between a blend. `result` is the base section while blending (0 < `tipWeight` < 1)
 * and the only section otherwise; it is null where the foam has no width. While it blends, `blended` is the
 * half-section the 3D board draws there — the base and the tip finished rails sampled alike and blended point
 * for point by the weight (`blendFinishedRails`, rail at `halfWidth`, stringer at 0) — and the litres count
 * that very ring (D-31, `fadingSectionArea`). `hardWeight` is how much of the station is a hard edge and
 * `sharpness` how sharp its bottom edge is drawn (an end is sharp when it has a hard edge or a Sharp Bottom
 * Tuck: 1 where both ends are, 0 where neither is, the sharp end's share where one is — the founder's
 * "maintains the sharper edge"). `sharpBottomTuck` is the base's (or the only) section's flag. `area` is the
 * full (both-rails) finished cross-section in square millimetres and `blendArea` the foam the finished
 * rail's blends take off it, both rails — `stationAreas` and `stationBlendAreas` of
 * `computeCrossSectionVolume`, element for element.
 *
 * `drawn` is the half the 3D board draws whenever it is not `blended ?? sampledFinishedRail(result, domed,
 * halfWidth)`: a rail fitted into a station narrower than its own bands (D-34, `fittedFinishedRail`), or near a
 * wing (D-37), the section built on the deck's meeting line with its rail moved onto the outline (`wingStepHalf`).
 * The stepped outline stays `halfWidth`, so the drawn half's outermost point is TEMPLATE's outline; `result` and
 * `blended` are the section built on the meeting line.
 *
 * `rollScale` is the share of its height a station in the tail's last inch keeps (D-38, `tailRollScale`), absent
 * clear of it; `drawn` is then already scaled by it. `area` stays the un-rolled section's, because the roll's foam is
 * counted once, exactly, off the whole board (`tailRollFoam`).
 *
 * With the bottom contours (Phase 17, D-21, `CrossSectionVolumeInput.foamOffAt`), `drawn` is also the half with its
 * bottom lifted (`bottomedHalfSection`), last of all — the vee or belly lifts the rail, and on a board with channels the
 * channels are then cut into what that leaves, straight up (G-17-6, `sectionsOffAt`) — and `area` is corrected by the
 * change in the ring's own area —
 * so the litres count the very ring the 3D board and the CNC files carry. `thinAt` says where a vee or belly leaves
 * the rail under 1/4", and `railEdgeAt` where it lifted the bottom to the deck and the foam ends.
 */
export interface BoardSection {
  station: Mm;
  halfWidth: Mm;
  thickness: Mm;
  result: RailSectionResult | null;
  blended?: HalfSectionPoints;
  drawn?: HalfSectionPoints;
  rollScale?: number;
  tipWeight: number;
  hardWeight: number;
  sharpness: number;
  domed: boolean;
  sharpBottomTuck: boolean;
  area: number;
  blendArea: number;
  /** Where a vee or a belly leaves the rail thinner than 1/4" at this station (Phase 17, D-40): the distances across,
   * in from the section's inside edge, of every bottom point with less than 1/4" of foam under the deck, the rail edge
   * included — flagged for the warning, never cut shallower. Absent when the foam is 1/4" or more everywhere. */
  thinAt?: Mm[];
  /** Where a vee or a belly lifted the bottom to the deck (D-40): the section's foam ends here, a knife edge, this far
   * across from its inside edge. Absent when the foam runs out to the rail as built. */
  railEdgeAt?: Mm;
  /** On a board with channels (`CrossSectionVolumeInput.bottomWallsAt`): how many points `drawn` holds — the board's
   * own ring length, the same on every section of it. Absent on every other board, which keeps
   * `HALF_SECTION_POINT_COUNT`. */
  ringLength?: number;
  /** On a board with channels: the index in `drawn` of each wall's top — its rail-side point, the next channel's peak,
   * as the founder draws the bottom (board upside down); the wall's foot, the channel's floor at its deepest, is the
   * next index, and the face between the two is the wall. A wall with no step at this station has its top and foot on
   * the one spot. */
  wallRows?: number[];
  /** On a board with channels, at a station where a wall stands under the rail's curve (G-17-6): the index in `drawn`
   * of the finished rail's true bottom edge, laid inside the walled run, which then starts outboard of it on the rail's
   * run so the wall has its own vertical face. The 3D board draws its sharp bottom edge here, and the faces outboard of
   * it as the rail's. Absent everywhere else, where the bottom edge is the bottom run's first point as always. */
  bottomEdgeRow?: number;
}

/**
 * The litres' area at a station inside the hard edge's fade (D-31, the level variant): the foam the 3D board
 * draws there, corrected by the same hair the drawn board loses to its straight segments everywhere else.
 * Written as the two end sections' exact areas blended by the weight, plus how far the drawn (blended) ring's
 * area stands from the two end rings' areas blended alike:
 * `(1 − w)·exactTucked + w·exactHard + (ring(blended) − ((1 − w)·ring(tucked) + w·ring(hard)))` — which is
 * `ring + (1 − w)·(exactTucked − ring(tucked)) + w·(exactHard − ring(hard))`. At w = 0 and w = 1 the blended
 * ring IS the end ring and the correction is exactly 0, so the fade is level with the stations either side.
 */
export function fadingSectionArea(
  exactTucked: number,
  exactHard: number,
  tuckedHalf: HalfSectionPoints,
  hardHalf: HalfSectionPoints,
  blended: HalfSectionPoints,
  weight: number,
): number {
  const ringsBlended = (1 - weight) * sampledSectionArea(tuckedHalf) + weight * sampledSectionArea(hardHalf);
  return (1 - weight) * exactTucked + weight * exactHard + (sampledSectionArea(blended) - ringsBlended);
}

/** The three rail-band anchors' stations, measured from the tail end: tail 12", centre, nose 12". */
export interface RailAnchorStations {
  tail: Mm;
  center: Mm;
  nose: Mm;
}

/**
 * How the tail's Hard Edge reaches each station. `weight` is how much of the station is the hard-edged
 * section (1 all hard, 0 all tucked, between a blend of the two sections, `fadingSectionArea`); `tuckSource` names the
 * anchor whose Single Tuck and Sharp Bottom Tuck the tucked side reads, given the station's nearest anchor.
 * `length` is the board's length (its centre is half of it), which the live rule's two settings are read
 * against (D-30). The live functions never take a rule: an old rule is callable only by name (Phase 14 D-25's
 * precedent).
 */
export interface HardEdgeRule {
  weight(station: Mm, anchors: RailAnchorStations, rails: RailBandSpec, length: Mm): number;
  tuckSource(nearest: RailSectionKey, rails: RailBandSpec): RailSectionKey;
}

/**
 * The hard edge as it was before Phase 16: a switch — fully hard at every station whose nearest anchor is
 * the tail 12" section (out to halfway to the centre) while the tail's Hard Edge is on, and not at all
 * anywhere else; every tuck read from the nearest anchor. Named only by the 40-board pin test
 * (`phase16-litres-pin.test.ts`) and by the hard-edge report (`lib/models/hard-edge-report.ts`); no screen
 * uses it.
 */
export const HARD_EDGE_SWITCH: HardEdgeRule = {
  weight(station, anchors, rails) {
    if (!rails.tailHardEdge) return 0;
    return nearestAnchorSection(station, anchors.tail, anchors.center, anchors.nose) === "tail" ? 1 : 0;
  },
  tuckSource(nearest) {
    return nearest;
  },
};

/**
 * How much of a station is the tail's hard edge, by the founder's fade (Phase 16, D-20/D-27/D-30): 1 at and
 * behind `blendsFrom` (Hard Edge Blends From), 0 at and beyond `endsAt` (Hard Edge Ends At, where the rail has
 * fully blended into the centre's tucked rail), and between them the smoothstep `1 − t²(3 − 2t)` with
 * `t = (station − blendsFrom)/(endsAt − blendsFrom)` — level at both ends, so the litres kink at neither
 * setting. Never rises along the board. Since D-32 (plan 16-15) the same weight carries the tail's WHOLE rail
 * character into the centre's (`RAIL_CHARACTER_FADE`), the name kept because the hard edge was its first use.
 */
export function tailHardEdgeWeight(station: Mm, blendsFrom: Mm, endsAt: Mm): number {
  if (station <= blendsFrom) return 1;
  if (station >= endsAt) return 0;
  const t = (station - blendsFrom) / (endsAt - blendsFrom);
  return 1 - t * t * (3 - 2 * t);
}

/**
 * Go-live 1's hard edge (Phase 16, D-20/D-27/D-30, the founder) — the live rule until D-32 (plan 16-15) made the
 * tail's whole rail fade, kept as it was and named only by the 74-board pin test
 * (`phase16-live-litres-pin.test.ts`) and by the rail-character report (`lib/models/rail-character-report.ts`);
 * no screen uses it. While the tail's Hard Edge is on it is full at
 * and behind Hard Edge Blends From (`hardEdgeBlendsFrom`, 18" when the board says nothing) and fades by
 * `tailHardEdgeWeight` until it is gone at Hard Edge Ends At (`hardEdgeEndsAt`, 30" when the board says
 * nothing), where the rail is fully the centre's tucked rail; off, it is nowhere. Blends From never goes below
 * the 12" mark, so the tail 12" station is always a full hard edge. The tucked side of every station nearest
 * the tail reads the CENTRE's Single Tuck and Sharp Bottom Tuck — the tail's own are hidden on RAILS while
 * Hard Edge is on, so a hidden box can never move the litres (research pitfall 8).
 */
export const HARD_EDGE_FADE: HardEdgeRule = {
  weight(station, _anchors, rails, length) {
    if (!rails.tailHardEdge) return 0;
    return tailHardEdgeWeight(station, hardEdgeBlendsFrom(rails, length), hardEdgeEndsAt(rails, length));
  },
  tuckSource(nearest, rails) {
    return rails.tailHardEdge && nearest === "tail" ? "center" : nearest;
  },
};

/**
 * A rail's discrete character (Phase 16, D-32): the five settings that cannot be "halfway" — the tail's Hard
 * Edge, the Family, Symmetrical, Use Single Tuck and Sharp Bottom Tuck. Every other rail setting (Deck
 * Profile, Ratio, the scale and the nudges) is a number and blends by `blendContinuous`.
 */
export interface RailCharacter {
  hardEdge: boolean;
  family: RailFamily;
  symmetrical: boolean;
  singleTuck: boolean;
  sharpBottomTuck: boolean;
}

/** One of `RailCharacter`'s five settings. */
export type RailCharacterKey = keyof RailCharacter;

/** The order `railCharacterDifferences` lists a tip's differences in (RAILS' own order). */
const RAIL_CHARACTER_KEYS: readonly RailCharacterKey[] = [
  "hardEdge",
  "family",
  "symmetrical",
  "singleTuck",
  "sharpBottomTuck",
];

/**
 * One rail's character as the shaper set it (D-32). `hardEdge` is the tail's Hard Edge on the tail and false
 * on the centre and the nose. While the tail's Hard Edge is on, the tail's own Single Tuck and Sharp Bottom
 * Tuck are hidden on RAILS, so the tail reads the CENTRE's two tucks — a hidden box can never move the litres
 * (D-27, research pitfall 8).
 */
export function railCharacterOf(rails: RailBandSpec, key: RailSectionKey): RailCharacter {
  const spec = rails[key];
  const hardEdge = key === "tail" && rails.tailHardEdge;
  const tucks = hardEdge ? rails.center : spec;
  return {
    hardEdge,
    family: spec.family,
    symmetrical: spec.symmetrical,
    singleTuck: tucks.singleTuck,
    sharpBottomTuck: tucks.sharpBottomTuck,
  };
}

/**
 * The settings in which a tip's rail character differs from the centre's (D-32), each once, in the order Hard
 * Edge, Family, Symmetrical, Single Tuck, Sharp Bottom Tuck. Empty when the tip's rail is the centre's: then
 * nothing blends on that side of the board.
 */
export function railCharacterDifferences(rails: RailBandSpec, tip: "tail" | "nose"): RailCharacterKey[] {
  const centre = railCharacterOf(rails, "center");
  const own = railCharacterOf(rails, tip);
  return RAIL_CHARACTER_KEYS.filter((key) => own[key] !== centre[key]);
}

/** A number held into [0, 1] — every blend weight passes through it before the branch (16-15's trap 1). */
function unitWeight(weight: number): number {
  return Math.min(1, Math.max(0, weight));
}

/**
 * How much of a station ahead of the centre is the nose's rail (D-32, the founder: "The rule for center/nose
 * blending should be to make the transition as smooth as possible. We don't need slider controls."): 0 at and
 * behind the centre station, 1 at and beyond the nose 12" station, and between them the smoothstep `t²(3 − 2t)`
 * with `t = (station − centre)/(nose12 − centre)` — the tail's own shape, level at both ends, the smoothest of
 * the four the planner measured. Never falls along the board; always inside [0, 1]. From the nose 12" mark to
 * the tip the nose's rail as set shrinks with the foam as it always has.
 */
export function noseRailWeight(station: Mm, centre: Mm, nose12: Mm): number {
  if (station <= centre) return 0;
  if (station >= nose12) return 1;
  const t = (station - centre) / (nose12 - centre);
  return unitWeight(t * t * (3 - 2 * t));
}

/** The two rail characters a station blends and how much of it is the tip's (0 all base, 1 all tip). */
export interface StationRailCharacter {
  base: RailCharacter;
  tip: RailCharacter;
  tipWeight: number;
}

/**
 * How the rail character reaches each station (D-32): the base and the tip characters and the tip's weight,
 * given the station's nearest anchor, the three anchors, the rails and the board's length.
 */
export interface RailCharacterRule {
  at(station: Mm, nearest: RailSectionKey, anchors: RailAnchorStations, rails: RailBandSpec, length: Mm): StationRailCharacter;
  /** How the section fits the outline (plan 16-16); absent reads `OLD_SURFACE_FIT`. */
  fit?: SurfaceFit;
}

/**
 * How a rail-character rule fits the section to the outline (Phase 16, plan 16-16). `wings`: `"shift"` moves the
 * whole section in with the outline behind a wing; `"share"` builds the stations either side of a wing on a deck
 * line the two sides share and moves only the rail onto the outline (D-37). `tips`: `"clip"` cuts a rail wider than its station off at the stringer, so the
 * stringer sinks under the side profile's deck near a tip; `"fit"` draws it into its room and the litres count
 * what is drawn (D-34). `tail`: `"square"` ends the deck at the tail's full thickness; `"roll"` carries the rail
 * around the end, the deck rolling over into the tail's edge (D-38). `tuck`: `"corner"` blends a sharp bottom edge
 * into a round one point for point, a corner in every slice, shrinking; `"open"` opens the corner into a radius
 * that grows along the blend (`openedFinishedRail`). `rail`: on a domed deck, `"sixteenths"` builds each station's
 * rail from its thickness rounded to the nearest 1/16", which steps along the board; `"exact"` builds it from the
 * thickness itself, so the rail runs smooth. RAILS, DATA and the order form read `computeRailBands`, which keeps
 * the rounding, whichever rule the sections read.
 */
export interface SurfaceFit {
  wings: "shift" | "share";
  tips: "clip" | "fit";
  tail: "square" | "roll";
  tuck: "corner" | "open";
  rail: "sixteenths" | "exact";
}

/** What every rule before plan 16-16 does: the whole section shifts in with a wing, a wide rail is cut off, the deck
 * runs square to the tail's end, a sharp edge blends as a corner and a domed rail steps by sixteenths. */
export const OLD_SURFACE_FIT: SurfaceFit = { wings: "shift", tips: "clip", tail: "square", tuck: "corner", rail: "sixteenths" };

/** How much of the tip's thickness the tail's roll takes off at the very end (D-38, the founder's pick). */
export const TAIL_ROLL_SHARE = 1 / 3;
/** How far in from the tail end the roll runs, in inches (D-38, the founder's pick). */
export const TAIL_ROLL_RUN_IN = 1;
/** The panels the litres integrate the roll's foam over (`tailRollFoam`). */
export const TAIL_ROLL_PANELS = 8;

/**
 * How far the deck has rolled down at a station in the tail's last inch (Phase 16, D-38, the founder: "The rail at the
 * tail of the board can be carried around the tip, so there's usually a pretty mild rounding of the deck line for all
 * tail types."), in millimetres: a quarter ellipse, `TAIL_ROLL_SHARE` of the tip's thickness tall and
 * `TAIL_ROLL_RUN_IN` long, level with the deck where it starts and upright where it meets the tail's edge. 0 at
 * and ahead of the end of the run.
 */
export function tailRollDrop(station: Mm, tipThickness: Mm): number {
  const run = inchesToMm(TAIL_ROLL_RUN_IN);
  if (station >= run) return 0;
  const t = 1 - station / run;
  return tipThickness * TAIL_ROLL_SHARE * (1 - Math.sqrt(Math.max(0, 1 - t * t)));
}

/** The share of its height a station keeps under the tail's roll: 1 clear of it, and at a station with no thickness to
 * roll. Every height scales alike, so the bottom stays on the rocker and the rail keeps its shape. */
export function tailRollScale(station: Mm, thickness: Mm, tipThickness: Mm): number {
  if (thickness <= 0) return 1;
  return Math.max(0, 1 - tailRollDrop(station, tipThickness) / thickness);
}

/** `panels + 1` stations through the tail's roll, even in the ellipse's own angle, so they crowd where it turns
 * fastest: the tail end first, the end of the run last. The 3D board's rings and the litres' count both take them. */
export function tailRollStations(panels: number): Mm[] {
  const run = inchesToMm(TAIL_ROLL_RUN_IN);
  return Array.from({ length: panels + 1 }, (_, k) => mm(run * (1 - Math.cos((k / panels) * (Math.PI / 2)))));
}

/**
 * Either kind of section rule: the two old hard-edge rules (`HARD_EDGE_SWITCH`, `HARD_EDGE_FADE`, kept as
 * `HardEdgeRule`s and read exactly as before) or a rail-character rule (`RAIL_CHARACTER_FADE`). Told apart
 * by `"at" in rule`.
 */
export type SectionRule = HardEdgeRule | RailCharacterRule;

/**
 * The live rule (Phase 16, D-32, the founder 2026-11-04: "we should also treat 'sharp bottom tuck' like a hard
 * edge at the tail station. The same blend from and to applies"). Nothing about the rail switches anywhere:
 *
 * - The tail: at and behind the centre the base is the centre's rail as set and the tip the tail's
 *   (`railCharacterOf`). Whenever they differ in anything (`railCharacterDifferences`) — Hard Edge ticked or
 *   not — the tip's weight is `tailHardEdgeWeight` between Tail Rail Blends From and Tail Rail Ends At
 *   (`hardEdgeBlendsFrom` / `hardEdgeEndsAt`, the shaper's two settings): the tail's rail full at and behind
 *   Blends From, the centre's at and beyond Ends At, the point blend of the two between (D-31).
 * - The nose, with no control and nothing stored ("Only the tail rail gets the users blend. The nose is a
 *   default that always gets applied."): ahead of the centre the tip is the nose's rail, and whenever it
 *   differs from the centre's the tip's weight is `noseRailWeight`, from the centre to the nose 12" station.
 *
 * Where a tip's rail is the centre's, its weight is 0 and every station on that side is the centre's rail, as
 * before.
 */
export const RAIL_CHARACTER_FADE: RailCharacterRule = {
  at(station, _nearest, anchors, rails, length) {
    const base = railCharacterOf(rails, "center");
    if (station <= anchors.center) {
      const tip = railCharacterOf(rails, "tail");
      if (railCharacterDifferences(rails, "tail").length === 0) return { base, tip, tipWeight: 0 };
      const tipWeight = tailHardEdgeWeight(station, hardEdgeBlendsFrom(rails, length), hardEdgeEndsAt(rails, length));
      return { base, tip, tipWeight };
    }
    const tip = railCharacterOf(rails, "nose");
    if (railCharacterDifferences(rails, "nose").length === 0) return { base, tip, tipWeight: 0 };
    return { base, tip, tipWeight: noseRailWeight(station, anchors.center, anchors.nose) };
  },
};

/**
 * The live rule (Phase 16, D-33, D-34 and D-37, the founder: "Wings should be steps in the outline. The Deck should
 * remain smooth across the wings location.", "Let's not do that little flip." and "they should share the blend"):
 * `RAIL_CHARACTER_FADE`'s own rail character, with the stations either side of a wing built on the deck line the
 * two sides share and only their rails moved onto the outline (`wingShareAt`, `wingStepHalf`), a rail wider than its
 * station drawn into its room and counted (`fittedFinishedRail`), and the tail's rail carried around its end
 * (`tailRollDrop`, D-38), with a sharp bottom edge opening into a round one along a blend (`openedFinishedRail`), and
 * a domed deck's rail built from its thickness itself, not rounded to a sixteenth. `RAIL_CHARACTER_FADE` itself is kept as plan 16-15 left it, named by the 102-board pin
 * test and the two reports (`lib/models/surface-report.ts`, `lib/models/rail-character-report.ts`); no screen uses it.
 */
export const SMOOTH_SURFACE_FADE: RailCharacterRule = {
  at: RAIL_CHARACTER_FADE.at,
  fit: { wings: "share", tips: "fit", tail: "roll", tuck: "open", rail: "exact" },
};

/** The rule the live litres and the 3D board use. */
const LIVE_SECTION_RULE: SectionRule = SMOOTH_SURFACE_FADE;

/** The foam a shaper wants left under the deck (Phase 17, D-09): the app's own thinnest foil, 1/4". A concave is held
 * to it at the stringer (bottom.ts's `foamOff`); a vee or a belly that leaves a rail thinner than this is flagged
 * (`BoardSection.thinAt`), never cut shallower (D-40). */
export const BOTTOM_COLUMN_FLOOR: Mm = inchesToMm(FOIL_THICKNESS_RANGE_IN.min);

/** The deck run's height at `y` across (indices 0 to the rail's outermost point): straight between its two points
 * either side, the first point's height inside it and the outermost point's beyond it. */
function deckHeightAt(half: HalfSectionPoints, y: number): number {
  const last = SECTION_POINTS.deck - 1;
  if (y <= half[0][0]) return half[0][1];
  for (let k = 0; k < last; k++) {
    const [y0, h0] = half[k];
    const [y1, h1] = half[k + 1];
    if (y >= y0 && y <= y1) return y1 > y0 ? h0 + ((h1 - h0) * (y - y0)) / (y1 - y0) : Math.max(h0, h1);
  }
  return half[last][1];
}

/** How many halvings find where a lift meets the deck: far finer than a thousandth of a millimetre on any rail. */
const RAIL_EDGE_STEPS = 48;

/** The index of the bottom edge in a half: where the rail's run ends and the bottom's begins. */
const BOTTOM_EDGE_INDEX = SECTION_POINTS.deck + SECTION_POINTS.rail - 2;

/**
 * A finished half-section with its bottom lifted by the bottom contours (Phase 17, D-05, D-21, D-40; research
 * Pattern 2). The deck — the stringer on the deck out to the rail's outermost point — never moves: a contour only takes
 * foam from below.
 *
 * - Every point under the deck at `y` across, `h` above the planed bottom, rises by `f · (1 − h / a)`, with
 *   `f = foamOffAt(y)` and `a` the height of the rail's outermost point: a point on the bottom by exactly `f`, the
 *   rail's lower run less the higher it stands, the outermost point not at all — a lifted, thinned rail (the founder,
 *   D-40). Out from the stringer a vee's or belly's lift only grows, so the underside only rises (no lip), and while
 *   `f` is under `a` no point passes `a`, under the deck everywhere. Where `f` reaches `a` the rail there is cut away
 *   and the underside is the lift's own line, `f`.
 * - Nothing is clamped (D-40: "no lips should ever be present. The contour should extend to the rail and make it
 *   effectively thinner."). Where the lifted bottom reaches the deck — on the bottom, or past the rail's outermost
 *   height, where the rail is cut away and the bottom's line runs on — the foam ENDS: walking the underside out from
 *   the stringer, the first place it meets the deck is found by halving and becomes the section's rail edge, a knife
 *   edge on the deck (`railEdgeAt`). Every point outboard of it is drawn there, so no point of the bottom stands above
 *   the deck and the bottom never steps back down.
 *
 * `thinAt` lists the distances across, on the bottom, where less than `floor` of foam is left under the deck, the rail
 * edge included: the warning's to word, never the maths' to clamp. A column with no deck over it (a tip's edge) is left
 * as it is, never 0/0. Every point that does not move is returned as the very same pair, so with no foam off the half
 * comes back point for point. A foam off that is not a finite number is read as none at that point — the foam ends only
 * where a real cut reaches the deck, never because a sampler slipped.
 *
 * On a board with channels (`sectionsOffAt`, G-17-6, the founder's ruling of 2026-11-10; D-05): the vee, belly or
 * concave lifts the rail by the rule above, read from `sectionsOffAt` — the sections' foam alone — and the channels are
 * then cut into what that leaves, straight up, the way a shaper cuts them last: each point stands at the higher of the
 * lifted rail and the channel's floor (`foamOffAt`, the sections' bottom plus the channel there). On the bottom that is
 * exactly `foamOffAt`; wherever no channel reaches, exactly the lifted point. Without `sectionsOffAt` the rule above is
 * the only rule, untouched.
 */
export function bottomedHalfSection(
  half: HalfSectionPoints,
  foamOffAt: (across: Mm) => Mm,
  floor: Mm,
  sectionsOffAt?: (across: Mm) => Mm,
): { half: HalfSectionPoints; thinAt: Mm[]; railEdgeAt?: Mm } {
  const deckCount = SECTION_POINTS.deck;
  const out: [number, number][] = half.slice() as [number, number][];
  const thinAt: Mm[] = [];
  const apex = half[deckCount - 1][1];
  /** A point `h` above the planed bottom lifted by `f` of foam off (D-40, D-41): the vee's or belly's rule. */
  const lift = (h: number, f: number): number => {
    if (f === 0) return h;
    if (!(apex > 0) || f >= apex) return Math.max(h, f);
    return h + f * (1 - Math.min(1, h / apex));
  };
  // A cut that is not a finite number takes nothing off: it must never end the foam (the code review's CR-01).
  const read = (raw: number): number => (Number.isFinite(raw) ? Math.max(0, raw) : 0);
  /** The underside's height at a point `h` above the planed bottom, `y` across. */
  const under = sectionsOffAt
    ? (y: number, h: number): number => {
        // the vee or belly lifts the rail; the channel is then cut straight up into what that leaves (G-17-6, D-05)
        const total = read(foamOffAt(mm(y)));
        const sections = read(sectionsOffAt(mm(y)));
        const lifted = lift(h, sections);
        return total > sections ? Math.max(lifted, total) : lifted;
      }
    : (y: number, h: number): number => lift(h, read(foamOffAt(mm(y))));
  // The underside, walked out from the stringer: the bottom's run backwards, then the rail's run up to its outermost
  // point. That point is the deck's and stays, unless a lift past its height ends the foam before it.
  for (let k = half.length - 1; k >= deckCount - 1; k--) {
    const point = half[k];
    const [y, h] = point;
    const onRail = k < BOTTOM_EDGE_INDEX;
    const top = deckHeightAt(half, y);
    const raised = under(y, h);
    if (raised === h || !(top > 0)) continue;
    if (raised < top) {
      out[k] = [y, raised];
      if (!onRail && top - raised < floor) thinAt.push(mm(y));
      continue;
    }
    // The lifted underside reaches the deck between the point inboard and this one: find where, and end the foam there.
    const [y0, h0] = half[k + 1] ?? point;
    const below = (t: number) => {
      const yt = y0 + (y - y0) * t;
      return under(yt, h0 + (h - h0) * t) < deckHeightAt(half, yt);
    };
    let inside = 0;
    let outside = 1;
    if (k + 1 < half.length && below(0)) {
      for (let i = 0; i < RAIL_EDGE_STEPS; i++) {
        const mid = (inside + outside) / 2;
        if (below(mid)) inside = mid;
        else outside = mid;
      }
    } else {
      outside = 0;
    }
    const edgeY = y0 + (y - y0) * outside;
    const edge: [number, number] = [edgeY, deckHeightAt(half, edgeY)];
    for (let j = k; j >= deckCount; j--) out[j] = edge;
    for (let j = 0; j < deckCount; j++) if (half[j][0] > edgeY) out[j] = edge;
    thinAt.push(mm(edgeY));
    return { half: out, thinAt, railEdgeAt: mm(edgeY) };
  }
  return { half: out, thinAt };
}

/** Up to four channel walls a side (Phase 17, D-10: eight channels at most). */
export const BOTTOM_WALL_SLOTS = 4;
/** On a board with channels each section's bottom run holds this many points (research §B): the 24 of every other
 * board, and a top and a foot for each of up to four walls a side. */
export const BOTTOM_RUN_WITH_WALLS = SECTION_POINTS.bottom + 2 * BOTTOM_WALL_SLOTS;

/** How many points one half-section holds on this board — the same for every ring and tip edge of it: the usual
 * `HALF_SECTION_POINT_COUNT`, or eight more on a board with channels (`bottomWallsAt`). */
export function halfSectionPointCount(input: Pick<CrossSectionVolumeInput, "bottomWallsAt">): number {
  return HALF_SECTION_POINT_COUNT + (input.bottomWallsAt ? BOTTOM_RUN_WITH_WALLS - SECTION_POINTS.bottom : 0);
}

/** A wall's top — the next channel's peak — is read this far outside the wall, then set back on the wall's own line, so
 * the face between its top and its foot is vertical: far under a thousandth of a millimetre. */
const WALL_READ_GAP = 1e-6;
/** A wall whose foot stands less than this above its top has no face at a station (its channel has not started, or
 * has no depth there): its two slots are one point, welded in the 3D board. */
const WALL_MIN_STEP = 1e-6;

/** The planed bottom's height at `y` across, read along a bottom run straight between its two points either side. */
function bottomRunHeightAt(run: HalfSectionPoints, y: number): number {
  for (let k = 0; k + 1 < run.length; k++) {
    const [y0, h0] = run[k];
    const [y1, h1] = run[k + 1];
    if (y >= Math.min(y0, y1) && y <= Math.max(y0, y1)) return y1 !== y0 ? h0 + ((h1 - h0) * (y - y0)) / (y1 - y0) : Math.max(h0, h1);
  }
  const first = run[0];
  const last = run[run.length - 1];
  return Math.abs(y - first[0]) <= Math.abs(y - last[0]) ? first[1] : last[1];
}

/**
 * A finished half-section on a board with channels, its bottom lifted (Phase 17, D-10, D-21, R11; research §B "A
 * channel's wall in the ring"). With only the 24 points of the bottom run a channel's vertical wall would be smeared
 * into a ramp between two of them, so first the bottom run — from the bottom edge back to the inside edge — is laid out
 * afresh to `BOTTOM_RUN_WITH_WALLS` points: a foot and a top slot at each wall's own distance across (`walls`, out
 * from the inside edge), and the rest spread evenly between the inside edge, the walls and the bottom edge, a fixed
 * number in each stretch, so every ring of the board has the same count and each wall keeps the same two slots from
 * ring to ring. Then the bottom is lifted exactly as on any other board (`bottomedHalfSection`).
 *
 * - A wall's foot is the channel's floor at its deepest (`foamOffAt` at the wall); its top is the next channel's peak,
 *   read just outside the wall and set back on the wall's own line, so the face between them is vertical.
 * - A wall with no step — its channel not yet started (a staggered set), no depth there, or a wall at or past the
 *   bottom edge (the channel runs out through the rail) — has its top and foot on one spot, which the 3D board welds
 *   into one point, so the ring stays closed and no triangle has no area.
 *
 * The bottom edge and the inside edge are the very same points; the bottom run lies on the planed bottom, so laying it
 * out afresh moves no foam. `wallRows` is the index of each wall's top in the returned half; its foot is the next.
 *
 * With `sectionsOffAt` (G-17-6, D-05) the vee or belly lifts the rail and the channels are cut straight up into what
 * that leaves (`bottomedHalfSection`): a channel's floor never rides up the rail's curve.
 */
export function bottomedHalfWithWalls(
  half: HalfSectionPoints,
  walls: readonly Mm[],
  foamOffAt: (across: Mm) => Mm,
  floor: Mm,
  sectionsOffAt?: (across: Mm) => Mm,
): { half: HalfSectionPoints; thinAt: Mm[]; railEdgeAt?: Mm; wallRows: number[] } {
  const run = half.slice(BOTTOM_EDGE_INDEX);
  const edge = run[0];
  const inside = run[run.length - 1];
  const yInside = inside[0];
  const yEdge = edge[0];
  const n = Math.min(walls.length, BOTTOM_WALL_SLOTS);
  // the walls in order out from the inside edge, on the bottom
  const at: number[] = [];
  for (let j = 0; j < n; j++) at.push(Math.max(at[j - 1] ?? yInside, Math.min(yEdge, walls[j])));
  const interior = BOTTOM_RUN_WITH_WALLS - 2 - 2 * n;
  const perChannel = Math.floor(interior / (n + 1));
  const outerCount = interior - n * perChannel;
  const bounds = [yInside, ...at, yEdge];
  const planed = (y: number): [number, number] => [y, bottomRunHeightAt(run, y)];
  // laid out from the inside edge outward, then turned to run from the bottom edge inward like the rest of the half
  const outward: [number, number][] = [inside];
  const tops: { at: number; y: number; wall: number }[] = [];
  for (let k = 0; k <= n; k++) {
    const count = k < n ? perChannel : outerCount;
    const from = bounds[k];
    const to = bounds[k + 1];
    for (let i = 1; i <= count; i++) outward.push(planed(from + ((to - from) * i) / (count + 1)));
    if (k === n) break;
    const w = at[k];
    const foot = planed(w);
    outward.push(foot);
    const stands = w > yInside && w < yEdge && foamOffAt(mm(w)) - foamOffAt(mm(w + WALL_READ_GAP)) > WALL_MIN_STEP;
    tops.push({ at: outward.length, y: stands ? w + WALL_READ_GAP : w, wall: w });
    outward.push(stands ? planed(w + WALL_READ_GAP) : foot);
  }
  outward.push(edge);
  const last = outward.length - 1;
  const relaid: HalfSectionPoints = [...half.slice(0, BOTTOM_EDGE_INDEX + 1), ...outward.slice(0, last).reverse()];
  const wallRows = tops.map((top) => BOTTOM_EDGE_INDEX + last - top.at);
  const cut = bottomedHalfSection(relaid, foamOffAt, floor, sectionsOffAt);
  const out = cut.half.slice();
  tops.forEach((top, j) => {
    const row = wallRows[j];
    // set the top back on the wall's own line, unless the foam ended inboard of it (the knife edge, D-40)
    if (top.y !== top.wall && out[row][0] === top.y) out[row] = [top.wall, out[row][1]];
  });
  return { half: out, thinAt: cut.thinAt, ...(cut.railEdgeAt !== undefined ? { railEdgeAt: cut.railEdgeAt } : {}), wallRows };
}

/**
 * A half-section drawn at `room` (the width on the wing's meeting line) with its rail moved onto the outline by `move`:
 * inward behind a wing (`move` above 0), outward ahead of it (below 0), straight up into the deck (D-37, the founder's
 * red line: "Blend the rail up to the deck with the same radius."). A point `u = room − y` in from the meeting line's
 * rail moves by `move × (1 − s(u / U))`, where `s(t) = t²(3 − 2t)` held to [0, 1] and
 * `U = min(room, max(deckMark2, 2 × |move|))`. Right at the rail the ease is level, so the rail's own tight curve moves
 * whole; the move is gone by Deck Mark 2 (never in under twice the move, or the rail would fold), and inside that
 * the deck is the meeting line's. Only distances across change, so the flat bottom stays flat and the tuck moves with
 * the rail. The stringer point never moves. Where `1.5 × |move| ≥ U` — a station barely wider than the move, where
 * the ease itself would fold — the whole half is scaled evenly into `room − move` instead.
 */
export function wingStepHalf(half: HalfSectionPoints, room: number, move: number, deckMark2: Mm): HalfSectionPoints {
  const reach = Math.min(room, Math.max(deckMark2, 2 * Math.abs(move)));
  if (1.5 * Math.abs(move) >= reach) {
    const k = (room - move) / room;
    return half.map(([y, h]) => [y * k, h]);
  }
  return half.map(([y, h]) => {
    const t = (room - y) / reach;
    const eased = t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
    return [y - move * (1 - eased), h];
  });
}

/**
 * An old hard-edge rule read in the rail-character terms, exactly as it worked: both characters take the
 * nearest anchor's Family and Symmetrical and the tuck source's two tucks, the base without a hard edge and
 * the tip with one, and the tip's weight is the rule's own.
 */
function hardEdgeRuleCharacters(
  rule: HardEdgeRule,
  station: Mm,
  nearest: RailSectionKey,
  anchors: RailAnchorStations,
  rails: RailBandSpec,
  length: Mm,
): StationRailCharacter {
  const nearestSpec = rails[nearest];
  const tuckSpec = rails[rule.tuckSource(nearest, rails)];
  const base: RailCharacter = {
    hardEdge: false,
    family: nearestSpec.family,
    symmetrical: nearestSpec.symmetrical,
    singleTuck: tuckSpec.singleTuck,
    sharpBottomTuck: tuckSpec.sharpBottomTuck,
  };
  return { base, tip: { ...base, hardEdge: true }, tipWeight: rule.weight(station, anchors, rails, length) };
}

/**
 * How much of a station is a property both, neither or one end of a blend has (D-32): by cases, never by
 * arithmetic that could round — 1 where both ends have it, 0 where neither does, the tip's weight where only
 * the tip does and one less the tip's weight where only the base does.
 */
function sharedWeight(baseHas: boolean, tipHas: boolean, tipWeight: number): number {
  if (baseHas && tipHas) return 1;
  if (!baseHas && !tipHas) return 0;
  return tipHas ? tipWeight : 1 - tipWeight;
}

/** Whether a rail character's bottom edge is drawn sharp: a hard edge or a Sharp Bottom Tuck. */
function isSharp(character: RailCharacter): boolean {
  return character.hardEdge || character.sharpBottomTuck;
}

/**
 * The cross-sections the litres integrate, one per station — the ONE section function the litres and the
 * 3D board both read (D-05), with the rail character reaching each station by `rule` (an old hard-edge rule
 * by name, or a rail-character rule). `stations` defaults to the litres' own (`crossSectionStations`); the 3D
 * surface may pass its own. See `computeCrossSectionVolume` for how each section is built.
 */
export function boardSectionsWith(
  input: CrossSectionVolumeInput,
  rule: SectionRule,
  stations?: readonly Mm[],
): BoardSection[] {
  const { halfWidthAt, foil, rails, length } = input;
  const thicknessAt = input.thicknessAt ?? ((station: Mm) => sampleFoil(foil, length, station));

  const anchorPoints = foilStationPoints(foil, length);
  const tailStation = anchorPoints[1].station; // tail12
  const centerStation = anchorPoints[2].station; // center
  const noseStation = anchorPoints[3].station; // nose12
  const anchors: RailAnchorStations = { tail: tailStation, center: centerStation, nose: noseStation };

  // A section saved before quick 261102-gec reads its defaults (design-snapshot rule 10).
  const tailScale = rails.tail.scaleFromCenter ?? DEFAULT_TIP_RAIL_SCALE;
  const noseScale = rails.nose.scaleFromCenter ?? DEFAULT_TIP_RAIL_SCALE;
  const tailNudges = rails.tail.nudges ?? ZERO_RAIL_NUDGES;
  const centerNudges = rails.center.nudges ?? ZERO_RAIL_NUDGES;
  const noseNudges = rails.nose.nudges ?? ZERO_RAIL_NUDGES;

  const at = stations ?? crossSectionStations(length, input.cutStation ?? mm(0));
  const sections: BoardSection[] = [];
  // An old rule never reads a fit (Phase 14 D-25's precedent): it runs today's arithmetic, wings and all.
  const fit = "at" in rule ? (rule.fit ?? OLD_SURFACE_FIT) : OLD_SURFACE_FIT;
  const tipThickness = thicknessAt(mm(0));
  const { foamOffAt, bottomWallsAt, sectionsOffAt } = input;

  // The bottom contours (Phase 17, D-05, D-21, research Pattern 2): once a section is finished — the wing move and the
  // tail roll done — its half has its bottom lifted by the foam off (`bottomedHalfSection`), set as the half the 3D
  // board draws, and its area corrected by the change the ring itself sees (the level variant, as `movedOn`). With no
  // sampler, or no foam off at this station, the section is returned exactly as it was built. On a board with
  // channels every section's bottom run is laid out afresh with its walls first (`bottomedHalfWithWalls`), so every
  // ring of the board has the board's own length.
  const bottomed = (built: BoardSection): BoardSection => {
    if (!foamOffAt || !built.result) return built;
    const half = built.drawn ?? built.blended ?? sampledFinishedRail(built.result, built.domed, built.halfWidth);
    // the vees and bellies alone, so the channels are cut straight up into the rail they leave (G-17-6, D-05)
    const sectionsAt = sectionsOffAt ? (across: Mm) => sectionsOffAt(built.station, across) : undefined;
    if (bottomWallsAt) {
      const walled = bottomedHalfWithWalls(
        half,
        bottomWallsAt(built.station),
        (across) => foamOffAt(built.station, across),
        BOTTOM_COLUMN_FLOOR,
        sectionsAt,
      );
      return {
        ...built,
        drawn: walled.half,
        area: built.area + (sampledSectionArea(walled.half) - sampledSectionArea(half)),
        ...(walled.thinAt.length > 0 ? { thinAt: walled.thinAt } : {}),
        ...(walled.railEdgeAt !== undefined ? { railEdgeAt: walled.railEdgeAt } : {}),
        ringLength: walled.half.length,
        wallRows: walled.wallRows,
      };
    }
    const cut = bottomedHalfSection(half, (across) => foamOffAt(built.station, across), BOTTOM_COLUMN_FLOOR, sectionsAt);
    if (cut.half.every((point, k) => point === half[k])) return built;
    return {
      ...built,
      drawn: cut.half,
      area: built.area + (sampledSectionArea(cut.half) - sampledSectionArea(half)),
      ...(cut.thinAt.length > 0 ? { thinAt: cut.thinAt } : {}),
      ...(cut.railEdgeAt !== undefined ? { railEdgeAt: cut.railEdgeAt } : {}),
    };
  };

  for (const station of at) {
    const foam = halfWidthAt(station);
    const thickness = thicknessAt(station);
    // Near a wing (D-37) the section is built on the deck's meeting line; 0 everywhere else, and then every line
    // below runs exactly as it always has. A station too narrow to stand on the line stays on its outline.
    const offLine = fit.wings === "share" && input.wingShareAt && foam > 0 ? input.wingShareAt(station) : 0;
    const move = foam + offLine > 0 ? offLine : 0;
    const room = move !== 0 ? mm(foam + move) : foam;
    // In the tail's last inch the deck rolls over into the tail's edge (D-38); 1 everywhere else.
    const keep = fit.tail === "roll" ? tailRollScale(station, thickness, tipThickness) : 1;
    const rollField = keep < 1 ? { rollScale: keep } : {};

    if (room === 0) {
      sections.push({
        station,
        halfWidth: foam,
        thickness,
        ...rollField,
        result: null,
        tipWeight: 0,
        hardWeight: 0,
        sharpness: 0,
        domed: false,
        sharpBottomTuck: false,
        area: 0,
        blendArea: 0,
      });
      continue;
    }

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
    const { base, tip, tipWeight: rawWeight } =
      "at" in rule
        ? rule.at(station, nearestKey, anchors, rails, length)
        : hardEdgeRuleCharacters(rule, station, nearestKey, anchors, rails, length);
    // Held into [0, 1] before the branch: a weight a hair above 1 is the tip alone, a hair below 0 the base.
    const tipWeight = unitWeight(rawWeight);
    const hardWeight = sharedWeight(base.hardEdge, tip.hardEdge, tipWeight);
    const sharpness = sharedWeight(isSharp(base), isSharp(tip), tipWeight);

    const domed = deckPercent < 100;
    const railThickness = mm((thickness * deckPercent) / 100);
    const thicknessEff = !domed ? thickness : fit.rail === "exact" ? railThickness : roundToSixteenthInch(railThickness);

    const sectionInput = (character: RailCharacter): ComputeRailSectionInput => ({
      thickness: thicknessEff,
      boardThickness: thickness,
      ratioTopPercent,
      family: character.family,
      scale,
      nudges,
      singleTuck: character.singleTuck,
      sharpBottomTuck: character.sharpBottomTuck,
      symmetrical: character.symmetrical,
      hardEdge: character.hardEdge,
    });
    // The cut area less both rails' blends: the finished rail, exactly (D-V1, PV1).
    const finished = (result: RailSectionResult) => {
      const profile = buildRailProfile(result);
      const profilePairs: [number, number][] = profile.map((p) => [p.x, p.y]);
      const rail = sectionFinishedRail(result, domed);
      const blendBothRails = 2 * railBlendArea(rail);
      // Whether this rail is wider than the room it has, and the live rule draws it into that room (D-34).
      const fits = fit.tips === "fit" && room < finishedRailReach(rail, thickness);
      return { area: stationArea(profilePairs, thickness, room) - blendBothRails, blendArea: blendBothRails, fits };
    };
    // One end's half, and the end's exact area under it (D-34, the level variant): the fitted half's area less the
    // cut-off half's lifts the exact area; a rail with room is sampled as it always was, the lift exactly nothing.
    const endHalf = (result: RailSectionResult, end: { area: number; fits: boolean }) => {
      const sampled = sampledFinishedRail(result, domed, room);
      if (!end.fits) return { half: sampled, exact: end.area };
      const half = fittedFinishedRail(result, domed, room);
      return { half, exact: end.area + (sampledSectionArea(half) - sampledSectionArea(sampled)) };
    };

    // The rail moved onto the outline near a wing (D-37): the half moved by `wingStepHalf`, the foam that adds to or
    // takes off the built area, and the stepped foam as the section's width (so the outline stays TEMPLATE's).
    // `rollReach` is Deck Mark 2, carried through a blend by the blend's own weight so the roll never jumps.
    const movedOn = (built: BoardSection, half: HalfSectionPoints, rollReach: Mm): BoardSection => {
      const drawn = wingStepHalf(half, room, move, rollReach);
      return {
        ...built,
        halfWidth: foam,
        drawn,
        area: built.area + (sampledSectionArea(drawn) - sampledSectionArea(half)),
      };
    };

    // The tail's roll on a built section (D-38): whatever it draws, every height scaled, the bottom left alone.
    const rolled = (built: BoardSection, half: HalfSectionPoints): BoardSection => {
      if (keep === 1) return built;
      const drawn = (built.drawn ?? half).map(([y, h]): [number, number] => [y, h * keep]);
      return { ...built, ...rollField, drawn };
    };

    if (tipWeight > 0 && tipWeight < 1) {
      // The blend (D-31, level variant; D-32): both sections, the base first, sampled alike and blended point
      // for point — the ring the 3D board draws (never shrunk tuck marks, which would leave a rounded edge,
      // research §G) — and the litres count that ring, corrected by the end sections' own polygon shortfalls
      // (`fadingSectionArea`).
      const baseResult = computeRailSection(sectionInput(base));
      const tipResult = computeRailSection(sectionInput(tip));
      const baseArea = finished(baseResult);
      const tipArea = finished(tipResult);
      const baseFinal = endHalf(baseResult, baseArea);
      const tipFinal = endHalf(tipResult, tipArea);
      // A sharp edge blending into a round one opens into a radius (the founder 2026-11-05): that end's half gains the
      // radius and its exact area the change, the level variant again. Two sharp ends, or two round, stay as they are.
      const opened = (end: typeof baseFinal, other: typeof baseFinal, share: number) => {
        const half = openedFinishedRail(end.half, other.half, share);
        return { half, exact: end.exact + (sampledSectionArea(half) - sampledSectionArea(end.half)) };
      };
      const opening = fit.tuck === "open" && isSharp(base) !== isSharp(tip);
      const baseEnd = opening && isSharp(base) ? opened(baseFinal, tipFinal, tipWeight) : baseFinal;
      const tipEnd = opening && isSharp(tip) ? opened(tipFinal, baseFinal, 1 - tipWeight) : tipFinal;
      const blended = blendFinishedRails(baseEnd.half, tipEnd.half, tipWeight);
      const area = fadingSectionArea(baseEnd.exact, tipEnd.exact, baseEnd.half, tipEnd.half, blended, tipWeight);
      // The cut area (finished plus blends) has no ring of its own; it is the two cuts blended by the weight,
      // so `area + blendArea` stays the station's cut area as everywhere else.
      const cut = (1 - tipWeight) * (baseArea.area + baseArea.blendArea) + tipWeight * (tipArea.area + tipArea.blendArea);
      const section: BoardSection = {
        station,
        halfWidth: foam,
        thickness,
        result: baseResult,
        blended,
        tipWeight,
        hardWeight,
        sharpness,
        domed,
        sharpBottomTuck: base.sharpBottomTuck,
        area,
        blendArea: cut - area,
      };
      const rollReach = mm((1 - tipWeight) * baseResult.deckMark2 + tipWeight * tipResult.deckMark2);
      sections.push(bottomed(rolled(move !== 0 ? movedOn(section, blended, rollReach) : section, blended)));
      continue;
    }

    // All base or all tip: one section, the arithmetic exactly as before Phase 16.
    const only = tipWeight === 1 ? tip : base;
    const result = computeRailSection(sectionInput(only));
    const ended = finished(result);
    const section: BoardSection = {
      station,
      halfWidth: foam,
      thickness,
      result,
      tipWeight,
      hardWeight,
      sharpness,
      domed,
      sharpBottomTuck: only.sharpBottomTuck,
      area: ended.area,
      blendArea: ended.blendArea,
    };
    if (move === 0 && !ended.fits && keep === 1) {
      sections.push(bottomed(section));
      continue;
    }
    const { half, exact } = endHalf(result, ended);
    const counted = ended.fits ? { ...section, drawn: half, area: exact } : section;
    sections.push(bottomed(rolled(move !== 0 ? movedOn(counted, half, result.deckMark2) : counted, half)));
  }
  return sections;
}

/** `boardSectionsWith` under the live rule: the sections every screen's litres and the 3D board read. */
export function boardSections(input: CrossSectionVolumeInput, stations?: readonly Mm[]): BoardSection[] {
  return boardSectionsWith(input, LIVE_SECTION_RULE, stations);
}

/**
 * The live rule's two end sections at one station (D-32), for the tests: the base alone (the tip's weight held
 * at 0) and the tip alone (held at 1), with the station's own live tip weight — so a blended section can be
 * checked against `blendFinishedRails` and `fadingSectionArea` of its two ends.
 */
export function boardSectionEnds(
  input: CrossSectionVolumeInput,
  station: Mm,
): { base: BoardSection; tip: BoardSection; tipWeight: number } {
  const held = (tipWeight: number): RailCharacterRule => ({
    ...SMOOTH_SURFACE_FADE,
    at: (...args) => ({ ...SMOOTH_SURFACE_FADE.at(...args), tipWeight }),
  });
  const [base] = boardSectionsWith(input, held(0), [station]);
  const [tip] = boardSectionsWith(input, held(1), [station]);
  const [live] = boardSectionsWith(input, SMOOTH_SURFACE_FADE, [station]);
  return { base, tip, tipWeight: live.tipWeight };
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
 * halfway between them) — that long straight blend from each 12" station to the centre is unchanged by
 * D-32. The DISCRETE fields — the rail character (`RailCharacter`: the tail's Hard Edge, `family`,
 * `symmetrical`, `singleTuck` and `sharpBottomTuck`), which cannot be "halfway" — blend as whole sections
 * (Phase 16, D-32, the founder 2026-11-04, `RAIL_CHARACTER_FADE`): on the tail side the tail's rail as set is
 * full at and behind Tail Rail Blends From (`hardEdgeBlendsFrom`, 18" unless the board says otherwise) and
 * eases by smoothstep into the centre's rail as set, which is full at and beyond Tail Rail Ends At
 * (`hardEdgeEndsAt`, 30" on a 6'0" unless the board says otherwise) — Hard Edge ticked or not; on the nose side
 * the centre's rail eases into the nose's by smoothstep from the centre to the nose 12" station, with no
 * control (`noseRailWeight`). A blending station counts the foam the 3D board draws there — the two end
 * finished rails blended point for point by that weight — corrected by the same hair the drawn board loses to
 * its straight segments everywhere else (D-31, `fadingSectionArea`); a bottom edge stays sharp through the
 * blend wherever both ends are sharp (`BoardSection.sharpness`). While the tail's Hard Edge is on, the tail's
 * own tucks are hidden on RAILS and the tail reads the centre's (D-27). RAILS' three plots and DATA are the
 * three anchors' own rails, so nothing on RAILS moves. Before D-32 only the hard edge faded and every other
 * discrete field came from the nearest anchor, switching halfway between two (`HARD_EDGE_FADE`, go-live 1's
 * rule); before Phase 16 the hard edge was a switch too (`HARD_EDGE_SWITCH`); both kept by name. The board
 * thickness at the station is T and the 1/16"-rounded tapered rail thickness t, so the Domed Deck Band
 * (2.4 x T) follows the board's own thickness along its length.
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
 * WINGS (Phase 16, D-33 and D-37, the founder: "Wings should be steps in the outline. The Deck should remain smooth
 * across the wings location." and "they should share the blend"). A wing is a step in the outline only. The deck
 * doesn't step: its rail stands on a meeting line (`wingShareAt`) that eases from the outline ahead of the wing to the
 * outline behind it, 3" each way, half and half at the wing. Each station in that stretch is built on the line, and its
 * rail then moves onto the real outline and rolls straight up into the deck (`wingStepHalf`): behind the wing the rail
 * stands thicker than its own, ahead of it thinner, and they meet at the wing. The flat bottom stays flat and the tuck
 * moves with the rail. The litres count that drawn half, as D-31 does a blend: the station's exact area plus the
 * drawn half's area less the half's it was moved from. The old rules shift the whole section in with the outline and
 * are kept by name for the pins (`OLD_SURFACE_FIT`).
 *
 * TIPS (Phase 16, D-34, the founder 2026-11-04: "Let's not do that little flip."; Q3: VOLUME counts the foam the
 * fixed tips add). Near a tip a station can be narrower than its rail's own bands. The live rule draws that rail
 * into its room instead of cutting it off at the stringer (`fittedFinishedRail`), so the stringer stays on the side
 * profile's deck and bottom right into the tip, and the litres count the ring drawn, as D-31 does a blend: the
 * end's exact area plus the fitted half's area less the cut-off half's, exactly 0 where the rail has room. The old
 * rules keep the cut, by name for the pins (`OLD_SURFACE_FIT`).
 *
 * A DOMED DECK'S RAIL (the founder, 2026-11-05, of the Mid-length: "all wavy and I do not like it"). RAILS reads the
 * rail-side thickness to the nearest 1/16", which is how a shaper marks it, but built station by station that rounding
 * stepped the rail about 25 times along a domed board. So the live rule builds the sections, and with them the
 * litres and the 3D board, from the thickness itself; the figures a shaper reads keep the rounding
 * (`computeRailBands`). The old rules keep the steps, by name for the pins (`OLD_SURFACE_FIT`).
 *
 * A SHARP EDGE INTO A ROUND ONE (the founder, 2026-11-05: "make sure a sharp tuck can blend into a round tuck nicely").
 * Where a blend runs between a sharp bottom edge (a hard edge or a Sharp Bottom Tuck) and a round one, a point-for-point
 * blend keeps a real corner in every slice with its angle shrinking, a small kink along the board. So the sharp end's
 * corner opens first (`openedFinishedRail`): it gains a radius that grows with the round rail's share, and that half is
 * what blends. The litres count it the level way, the end's exact area plus the opened ring's less the sharp ring's. Two
 * sharp ends blend as they always did, so a sharp edge stays sharp all the way between them. The old rules keep the
 * corner (`OLD_SURFACE_FIT`).
 *
 * THE TAIL'S ROLL (Phase 16, D-38, the founder's pick: "Medium: 1/3 over 1""). The rail is carried around the tail's
 * end: over the last inch every height of the section scales down along a quarter ellipse, a third of the tip's
 * thickness at the end (`tailRollDrop`), so the deck rolls over into the tail's edge and the bottom stays on the
 * rocker. The 51 stations are too far apart to see that: station 0 would stand for a whole first panel on a tail with
 * width, and a tail that comes to a point has no station in the roll at all. So each section's `area` is left un-rolled
 * and the roll's own foam comes off the whole board, integrated finely through the ellipse (`tailRollFoam`), so
 * the litres count what the 3D board draws (D-31). The old rules keep the square end (`OLD_SURFACE_FIT`).
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
 *
 * ONE SECTION FUNCTION (Phase 16, D-05). The station loop lives in `boardSections` (`boardSectionsWith` with
 * the live rule): this function integrates exactly the `area` of each section it returns, and the 3D board
 * (16-03) draws the very same sections, so the litres and the surface can never disagree.
 */
export function computeCrossSectionVolume(input: CrossSectionVolumeInput): CrossSectionVolumeResult {
  return computeCrossSectionVolumeWith(input, LIVE_SECTION_RULE);
}

/**
 * The foam the tail's roll takes off the whole board, in cubic millimetres (D-38): each station's area times the
 * share of height it loses, Simpson-integrated through the run in the ellipse's own angle (`θ`, with
 * `station = run (1 − cos θ)`), which keeps the integrand smooth where the ellipse stands upright at the tail end.
 */
export function tailRollFoam(input: CrossSectionVolumeInput, rule: SectionRule): number {
  const stations = tailRollStations(TAIL_ROLL_PANELS);
  const run = inchesToMm(TAIL_ROLL_RUN_IN);
  const h = Math.PI / 2 / TAIL_ROLL_PANELS;
  const sections = boardSectionsWith(input, rule, stations);
  const lost = sections.map((section, k) => section.area * (1 - (section.rollScale ?? 1)) * run * Math.sin(k * h));
  return simpsonIntegrate(lost, h);
}

/** `computeCrossSectionVolume` with the section rule named: Simpson over `boardSectionsWith(input, rule)`. */
export function computeCrossSectionVolumeWith(
  input: CrossSectionVolumeInput,
  rule: SectionRule,
): CrossSectionVolumeResult {
  const { length } = input;
  const cutStation = input.cutStation ?? mm(0);
  const sections = boardSectionsWith(input, rule);
  const stations = sections.map((section) => section.station);
  const stationAreas = sections.map((section) => section.area);
  const stationBlendAreas = sections.map((section) => section.blendArea);

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
  const tailRollMm3 = "at" in rule && rule.fit?.tail === "roll" ? tailRollFoam(input, rule) : 0;
  if (tailRollMm3 !== 0) volumeMm3 -= tailRollMm3;

  return {
    volumeLitres: cubicMmToLitres(volumeMm3),
    volumeMm3,
    panelCount: SIMPSON_PANEL_COUNT,
    stations,
    stationAreas,
    stationBlendAreas,
    tailRollMm3,
  };
}
