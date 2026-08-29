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
 *    standalone quick-estimator mode (CONTEXT.md D-13) — it is not replaced, and every one of its
 *    private inch-domain helpers is untouched by this addition.
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
import { type FoilSpec, foilStationPoints, sampleFoil } from "./foil";
import {
  RAIL_SECTION_CONSTANTS,
  type ComputeRailSectionInput,
  type RailBandSpec,
  type RailSectionKey,
  buildRailProfile,
  computeRailSection,
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
// than dividing (Volume.dc.html lines 343-347).
function stationEffThickness(profile: [number, number][], boardThickness: number, halfWidth: number): number {
  if (!halfWidth) return 0;
  const poly: [number, number][] = [[-halfWidth, boardThickness], ...profile, [-halfWidth, 0]];
  return shoelaceArea(poly) / halfWidth;
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
    tailEffIn = stationEffThickness(r.tailProfileIn as [number, number][], r.tailThicknessIn, t.tailWidthAt12In / 2);
    centerEffIn = stationEffThickness(
      r.centerProfileIn as [number, number][],
      r.centerThicknessIn,
      t.widePointWidthIn / 2,
    );
    noseEffIn = stationEffThickness(r.noseProfileIn as [number, number][], r.noseThicknessIn, t.noseWidthAt12In / 2);

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

/** Input to `computeCrossSectionVolume`. `halfWidthAt` is a half-width SAMPLER rather than an
 * `OutlineGeometry` directly: the app passes `(s) => sampleOutline(outlineGeometry, s)`, and the
 * blank-datasheet validation test below passes a monotone spline through a real blank's five
 * quoted widths instead. Taking a function rather than a concrete outline type is what makes that
 * validation possible at all, and it keeps this module from importing the outline builder. */
export interface CrossSectionVolumeInput {
  halfWidthAt: (station: Mm) => Mm;
  foil: FoilSpec;
  rails: RailBandSpec;
  length: Mm;
}

/** `stationAreas` are full (both-rails) cross-section areas in square millimetres, nose-to-tail —
 * exposed for the blank-datasheet validation test's family sweep and for anyone auditing a
 * specific station's contribution to the total. */
export interface CrossSectionVolumeResult {
  volumeLitres: Litres;
  volumeMm3: number;
  panelCount: number;
  stationAreas: number[];
}

/** Linear interpolation between the three anchor sections (tail 12", centre, nose 12"), holding
 * the outer value constant beyond the outer two anchors — the shared shape every continuous
 * per-station field (`deckPercent`, `ratioTopPercent`, `scale`, `domedBandBase`) blends through. */
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
 * fields (`deckPercent`, `ratioTopPercent`, and the per-section `scale`/`domedBandBase` from
 * `RAIL_SECTION_CONSTANTS`) are linearly interpolated across station and held constant outboard of
 * the outer two anchors; the DISCRETE fields (`family`, `symmetrical`, `removeCornerCut`,
 * `singleTuck`, `cornerCutOffsetOverride`, `bottomTuck3Override`) come from the nearest anchor
 * section wholesale, because a family index or a boolean cannot be interpolated. `tailHardEdge`
 * applies only at stations whose nearest anchor is the tail. This makes the integrated volume
 * truthful to the board actually drawn, station by station, rather than to a canned profile shape.
 */
export function computeCrossSectionVolume(input: CrossSectionVolumeInput): CrossSectionVolumeResult {
  const { halfWidthAt, foil, rails, length } = input;

  const anchors = foilStationPoints(foil, length);
  const tailAnchor = anchors[1]; // tail12
  const centerAnchor = anchors[2]; // center
  const noseAnchor = anchors[3]; // nose12
  const tailStation = tailAnchor.station;
  const centerStation = centerAnchor.station;
  const noseStation = noseAnchor.station;

  const tailConst = RAIL_SECTION_CONSTANTS.tail;
  const centerConst = RAIL_SECTION_CONSTANTS.center;
  const noseConst = RAIL_SECTION_CONSTANTS.nose;

  const h = length / SIMPSON_PANEL_COUNT;
  const stationAreas: number[] = [];

  for (let i = 0; i <= SIMPSON_PANEL_COUNT; i++) {
    const station = mm(i * h);
    const halfWidth = halfWidthAt(station);

    if (halfWidth === 0) {
      stationAreas.push(0);
      continue;
    }

    const thickness = sampleFoil(foil, length, station);

    const deckPercent = blendContinuous(
      station,
      tailStation,
      rails.tail.deckPercent,
      centerStation,
      rails.center.deckPercent,
      noseStation,
      rails.nose.deckPercent,
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
    const scale = blendContinuous(
      station,
      tailStation,
      tailConst.scale,
      centerStation,
      centerConst.scale,
      noseStation,
      noseConst.scale,
    );
    const domedBandBase = mm(
      blendContinuous(
        station,
        tailStation,
        tailConst.domedBandBase,
        centerStation,
        centerConst.domedBandBase,
        noseStation,
        noseConst.domedBandBase,
      ),
    );

    const nearestKey = nearestAnchorSection(station, tailStation, centerStation, noseStation);
    const nearestSpec = rails[nearestKey];

    const domed = deckPercent < 100;
    const railThicknessClamped = roundToSixteenthInch(mm((thickness * deckPercent) / 100));
    const thicknessEff = domed ? railThicknessClamped : thickness;

    const sectionInput: ComputeRailSectionInput = {
      thickness: thicknessEff,
      ratioTopPercent,
      family: nearestSpec.family,
      domedBandBase,
      scale,
      cornerCutOffsetOverride: nearestSpec.cornerCutOffsetOverride,
      removeCornerCut: nearestSpec.removeCornerCut,
      singleTuck: nearestSpec.singleTuck,
      bottomTuck3Override: nearestSpec.bottomTuck3Override,
      symmetrical: nearestSpec.symmetrical,
      hardEdge: nearestKey === "tail" && rails.tailHardEdge,
    };
    const result = computeRailSection(sectionInput);
    const profile = buildRailProfile(result, thicknessEff, domed, {
      boardThickness: thickness,
      railThicknessVal: railThicknessClamped,
      domedBandBase,
    });
    const profilePairs: [number, number][] = profile.map((p) => [p.x, p.y]);

    stationAreas.push(stationArea(profilePairs, thickness, halfWidth));
  }

  const volumeMm3 = simpsonIntegrate(stationAreas, h);

  return {
    volumeLitres: cubicMmToLitres(volumeMm3),
    volumeMm3,
    panelCount: SIMPSON_PANEL_COUNT,
    stationAreas,
  };
}
