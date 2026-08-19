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
 * 2. LITRE CONSTANT — a real, recorded divergence from units.ts. The prototype divides cubic
 *    inches by 61.0237, which is a truncation of the exact 61.023744... conversion; units.ts's
 *    `cubicMmToLitres` is exact by definition (1 L = 1,000,000 mm3). They disagree by about
 *    7.2e-7 relative — roughly 0.000025 L on a 35 L board. This module keeps the prototype's
 *    constant so the port is bit-faithful to the numbers a shaper has already been reading,
 *    exports it as `CUBIC_INCHES_PER_LITRE`, and does NOT call `cubicMmToLitres`. This is the one
 *    place a geometry module deliberately bypasses the units boundary's own conversion; the
 *    divergence should be revisited when the foil-based Simpson `computeVolume` (see deviation 3)
 *    replaces this method.
 * 3. MODEL DEVIATION FROM THE APPROVED DESIGN. `.planning/design/GEOMETRY-MODULE.md` prescribes
 *    a ~50-station Simpson integration over the foil. That needs the Phase 4 foil editor. This is
 *    the prototype's three-station rail-profile method, ported faithfully instead — prototype
 *    fidelity first, the Simpson upgrade arrives with the foil.
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
import { type Litres, MM_PER_INCH, type Mm, inchesToMm, litres, mm, mmToInches } from "./units";

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
