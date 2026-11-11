/**
 * Shared design derivation — the one composition a rack card's summary numbers and the Volume
 * screen's own numbers both read, so they can never disagree (RESEARCH.md "key_links": a rack
 * card's volume figure must never diverge from the Volume screen's).
 *
 * `deriveTemplateValues`, `deriveRailValues` and `deriveEffectiveVolume` are the exact bodies of
 * `components/design/design-store.tsx`'s `templateValues`, `railValues` and `effectiveVolume`
 * `useMemo`s, moved here verbatim (this is an extraction, not a rewrite) so a formula never lives
 * only inside a component (CLAUDE.md Rule 1). The store now calls these instead of holding the
 * arithmetic inline; its `useMemo`s and their dependency arrays are unchanged, so recompute
 * granularity on every design screen stays exactly what it was before this file existed.
 *
 * No React, browser API or database imports — this file is pure geometry composition, verifiable
 * in isolation exactly like every other module under lib/geometry/.
 */

import type { BlankRecord, BoardBlank } from "./blank";
import {
  BOTTOM_FLOOR,
  NOTCH_WALL_MIN,
  bottomHasChannels,
  bottomHasCut,
  bottomSampler,
  bottomSectionsSampler,
  bottomWallSampler,
  channelFoamOff,
  channelWallsAt,
  resolveBottom,
  sectionsFoamOff,
  type BoardBottom,
  type BottomBoard,
  type ResolvedBottom,
} from "./bottom";
import { prepareBlank, thinningStartsOf, type PreparedBlank } from "./blank-fit";
import type { OutlineSpec } from "./board";
import { buildBoardProfile, type BoardSideProfile } from "./board-profile";
import { prepareBoardBlank } from "./custom-rocker";
import { railBlendArea, sectionFinishedRail } from "./finished-rail";
import { foilStationPoints, type FoilSpec } from "./foil";
import { DEFAULT_FALLBACK_ROCKER, type FiveStationRocker } from "./rocker";
import type { OutlineGeometry } from "./outline";
import { buildOutline, foamHalfWidth, outlinePlanArea, sampleOutline, tailCutStation } from "./outline";
import { computeRailBands, type RailBandSpec, type RailBandsOutput } from "./rail-bands";
import { railSectionBottom } from "./rail-bottom";
import { curveHalfWidthAt, narrowestOutlineAt, outlineForFins, wingShareAt } from "./wings";
import { resolveWingStations } from "./wing-lock";
import {
  computeCrossSectionVolume,
  computeCrossSectionVolumeWith,
  computeVolume,
  type CrossSectionVolumeInput,
  type CrossSectionVolumeResult,
  type RailAnchorStations,
  type SectionRule,
  type VolumeRailValues,
  type VolumeResult,
  type VolumeSpec,
  type VolumeTemplateValues,
} from "./volume";
import { mm, type Litres, type Mm } from "./units";
import {
  computeFinPlacement,
  DEFAULT_FIN_PLACEMENT_SPEC,
  frontFinStation,
  frontFinToeDegrees,
  importedFinTailFromOutline,
  type FinPlacementResult,
  type FinPlacementSpec,
} from "./fins";

/**
 * FINS' Import Template mapping, moved here out of `design-store.tsx`'s `effectiveFins` memo
 * unchanged (quick 261014-wii, 2026-10-14) so the wing lock (`wing-lock.ts`) places the fins
 * exactly as the screen does. With Import Template off it is the stored fin spec itself — the
 * standalone calculator, which never sees the outline or its wings. On, the fins read the board's
 * length, tail shape and 12" tail width off the outline — the WINGED outline whenever the board has
 * wings (D8, the founder: "Fins listen to the closest piece of physical rail next to them"), so a
 * wing that crosses the 12" station moves every fin number that reads that width. Its callers pass
 * the fins' outline — the winged outline with every corner radius set to 0 (`outlineForFins`, quick
 * 261015-u8y, D2) — and that outline's geometry, so the 12" width the fins read is the
 * sharp-cornered one.
 *
 * OutlineSpec's TailShape and FinPlacementSpec's FinTailShape are kept structurally aligned on
 * purpose (the same five kind names), so this mapping is a direct assignment rather than a
 * translation table.
 */
export function deriveEffectiveFins(
  fins: FinPlacementSpec,
  finsImportTemplate: boolean,
  outline: OutlineSpec,
  geometry: OutlineGeometry,
): FinPlacementSpec {
  if (!finsImportTemplate) return fins;
  return {
    ...fins,
    boardLength: outline.length,
    tailWidth12: geometry.tailWidthAt12in,
    tailShape: outline.tail.kind,
  };
}

/**
 * The board's fins exactly as FINS places them (Phase 17, D-03, research Pitfall 1), for the bottom contours to read
 * where the front fins sit: the store's own chain in the store's order (`components/design/design-store.tsx`) — the
 * wings placed against their locks (`resolveWingStations`), every wing's corner sharpened for the fins
 * (`outlineForFins`), Import Template's mapping (`deriveEffectiveFins`) and the real tail the fins read
 * (`importedFinTailFromOutline`), then `computeFinPlacement`. Absent fins read the store's default fins; an absent
 * Import Template reads ticked, the store's default — so a preset's front fins read where FINS shows them. It reads
 * only the outline, the fins and the Import Template box, so any saved design or preset can be passed whole.
 */
export function designFinPlacement(
  fields: Pick<DesignSummaryFields, "outline"> & { fins?: FinPlacementSpec; finsImportTemplate?: boolean },
): FinPlacementResult {
  const fins = fields.fins ?? DEFAULT_FIN_PLACEMENT_SPEC;
  const importTemplate = fields.finsImportTemplate ?? true;
  const resolvedOutline = resolveWingStations(fields.outline, fins, importTemplate).outline;
  const finOutline = outlineForFins(resolvedOutline);
  const finGeometry = buildOutline(finOutline);
  const effectiveFins = deriveEffectiveFins(fins, importTemplate, finOutline, finGeometry);
  return computeFinPlacement(effectiveFins, importTemplate ? importedFinTailFromOutline(finGeometry) : null);
}

/**
 * The board facts the bottom is read against (Phase 17, D-19, D-38), built once per board: its length, the wide point
 * and its width, the front fins and their raw toe (`frontFinStation` / `frontFinToeDegrees` on FINS' own placement,
 * D-03, D-10), and six readers along its length —
 *
 * - `railAt`: the rail a vee or belly runs out to — the drawn rail, or a diamond's V where that is wider, because the V
 *   is foam and is cut (D-38): `max(sampleOutline, foamHalfWidth)`;
 * - `curveAt`: the curve drawn before any wing (`curveHalfWidthAt`, the Natural outline);
 * - `narrowestAt`: the Narrowest outline (`narrowestOutlineAt`, D-19);
 * - `foamAt`: the foam actually there (`foamHalfWidth`);
 * - `thicknessAt`: the planed thickness, the side profile's own;
 * - `notchInner`: a swallow's notch inside wall — the drawn curve less the foam, where that is more than
 *   `NOTCH_WALL_MIN` (the sketch's `innerAt`), 0 elsewhere.
 */
export function designBottomBoard(
  outline: OutlineSpec,
  geometry: OutlineGeometry,
  profile: BoardSideProfile,
  placement: FinPlacementResult,
): BottomBoard {
  return {
    length: outline.length,
    widePoint: geometry.widePointStation,
    widePointWidth: outline.widePointWidth,
    frontFins: frontFinStation(placement),
    toeDegrees: frontFinToeDegrees(placement),
    railAt: (s) => mm(Math.max(sampleOutline(geometry, s), foamHalfWidth(geometry, s))),
    curveAt: (s) => curveHalfWidthAt(geometry, s),
    narrowestAt: (s) => narrowestOutlineAt(geometry, s),
    foamAt: (s) => foamHalfWidth(geometry, s),
    thicknessAt: (s) => profile.thicknessAt(s),
    notchInner: (s) => {
      const d = sampleOutline(geometry, s) - foamHalfWidth(geometry, s);
      return mm(d > NOTCH_WALL_MIN ? d : 0);
    },
  };
}

/**
 * The foam the litres count, from the board's outline: the one rule every litres figure reads — VOLUME,
 * the preset and rack cards, the phone's tile, the order form and the printed template (quick
 * 261103-gcm). The width on one side of the stringer is the foam TEMPLATE draws (`foamHalfWidth`: a
 * swallow's notch is air, a diamond's V is foam), and the tail cut's corner is a cross-section station
 * (`tailCutStation`). A winged outline also carries how far it stands off the deck's meeting line at each station
 * (`wingShareAt`, Phase 16, D-37): the litres and the 3D board build the stations either side of a wing on that
 * line and move the rail onto the outline. A board without wings carries no such thing. Spread into
 * `computeCrossSectionVolume`'s input.
 */
export function crossSectionFoam(
  geometry: OutlineGeometry,
): Pick<CrossSectionVolumeInput, "halfWidthAt" | "cutStation" | "wingShareAt"> {
  const foam = {
    halfWidthAt: (station: Mm) => foamHalfWidth(geometry, station),
    cutStation: tailCutStation(geometry),
  };
  if (!geometry.wings || geometry.wings.length === 0) return foam;
  return { ...foam, wingShareAt: (station: Mm) => wingShareAt(geometry, station) };
}

/**
 * The one cross-section input every litres reader builds (Phase 16, D-05): the board's foam from its
 * outline (`crossSectionFoam`), the foil and the dense thickness curve off its side profile, the rails the
 * litres read (the effective rails — thicknesses imported from the foil when that box is ticked) and its
 * length. The litres (`summarizeDesignWith`) and the 3D board read the same sections through it.
 *
 * Phase 17 (D-05, D-20, D-21): with a `bottom` that cuts anything (`bottomHasCut`), the input also carries the foam
 * the bottom takes off (`foamOffAt`, `bottomSampler` over the bottom read against the board's own facts), so the
 * litres, the 3D board and the CNC files all count the cut. With channels (`bottomHasChannels`) it also carries where
 * their walls stand (`bottomWallsAt`, `bottomWallSampler`), so every section is laid out with a vertical step at each
 * wall (D-10, D-21), and the foam the vees, bellies and concaves alone take off (`sectionsOffAt`,
 * `bottomSectionsSampler`), so the vee or belly lifts the finished rail and the channels are then cut straight up into
 * it, last (G-17-6, the founder's ruling of 2026-11-10). A flat bottom, or none, adds nothing at all: the input is key
 * for key what it always was; a bottom without channels adds the sampler alone, so its rings keep their usual length.
 */
export function designCrossSectionInput(
  geometry: OutlineGeometry,
  profile: BoardSideProfile,
  rails: RailBandSpec,
  length: Mm,
  bottom?: { bottom: BoardBottom; board: BottomBoard },
): CrossSectionVolumeInput {
  const cut = bottom && bottomHasCut(bottom.bottom) ? bottom : null;
  const resolved = cut ? resolveBottom(cut.bottom, cut.board) : null;
  return {
    ...crossSectionFoam(geometry),
    foil: profile.effectiveFoil,
    thicknessAt: profile.thicknessAt,
    rails,
    length,
    ...(cut && resolved ? { foamOffAt: bottomSampler(resolved, cut.board) } : {}),
    ...(cut && resolved && bottomHasChannels(cut.bottom)
      ? { bottomWallsAt: bottomWallSampler(resolved, cut.board), sectionsOffAt: bottomSectionsSampler(resolved, cut.board) }
      : {}),
  };
}

/** Same shape as `design-store.tsx`'s `templateValues` memo. The area is the outline TEMPLATE draws,
 * tail cut included (`outlinePlanArea`, quick 261103-gcm) — VOLUME's Template Area row. */
export function deriveTemplateValues(outline: OutlineSpec, geometry: OutlineGeometry): VolumeTemplateValues {
  return {
    area: outlinePlanArea(geometry),
    length: outline.length,
    widePointWidth: outline.widePointWidth,
    noseWidthAt12: geometry.noseWidthAt12in,
    tailWidthAt12: geometry.tailWidthAt12in,
  };
}

/** Same shape as `design-store.tsx`'s `railValues` memo. The three blend areas carry each section's
 * finished rail into VOLUME's working rows (quick 261102-gec plan 03, the founder's D-V1, PV2): one basis
 * — the same `sectionFinishedRail` + `railBlendArea` the quoted litres read at every station of
 * `computeCrossSectionVolume` — so a Cross-Section Thickness row and the Estimated Volume beside it can
 * never sit on different curves. */
export function deriveRailValues(railBands: RailBandsOutput): VolumeRailValues {
  const blendArea = (section: RailBandsOutput["nose"]) => railBlendArea(sectionFinishedRail(section.result, section.domed));
  return {
    noseThickness: railBands.nose.boardThickness,
    centerThickness: railBands.center.boardThickness,
    tailThickness: railBands.tail.boardThickness,
    noseProfile: railBands.nose.profile,
    centerProfile: railBands.center.profile,
    tailProfile: railBands.tail.profile,
    noseBlendArea: blendArea(railBands.nose),
    centerBlendArea: blendArea(railBands.center),
    tailBlendArea: blendArea(railBands.tail),
  };
}

/**
 * Same shape as `design-store.tsx`'s `effectiveVolume` memo — the derived-value equivalent of the
 * prototype's `syncFromTemplate`: `volume` with length/width/centerThickness overridden by the
 * import, produced without an effect that writes back into state.
 *
 * VOLUME has ONE box, "Import Designed Board" (quick 261017-vdh, BRIEF 3b/3d): ticked means the real
 * outline AND the real rail and thickness data are both used. The stored `importTemplateDimensions`
 * flag IS the box, and `importRailThickness` follows it — so a board saved in the retired in-between
 * state (real outline, board-type thickness) simply opens ticked, with no migration. Its quoted litres
 * do not move: `deriveQuotedVolumeLitres` reads only the template flag, so the cross-section figure
 * every screen and print shows is the same either way; only the VOLUME card's working rows differ.
 */
export function deriveEffectiveVolume(
  volume: VolumeSpec,
  templateValues: VolumeTemplateValues,
  railValues: VolumeRailValues,
): VolumeSpec {
  if (!volume.importTemplateDimensions) return volume;
  return {
    ...volume,
    length: templateValues.length,
    width: templateValues.widePointWidth,
    centerThickness: railValues.centerThickness,
    importRailThickness: true,
  };
}

/**
 * The one place thickness flows from the foil (ROCKER screen) into the rail bands (RAILS screen)
 * — D-09. With the link on, each of the three rail sections' `boardThickness` is replaced by the
 * matching foil station: `foil.nose12` -> `rails.nose`, `foil.center` -> `rails.center`,
 * `foil.tail12` -> `rails.tail` (the planner note limiting RAILS to three of the foil's five
 * stations). The two tip stations never appear here — they exist only for the side profile and
 * the volume integration.
 *
 * Deliberately takes no rocker argument (D-11): adjusting the rocker line alone can never move a
 * rail band number, because this function has nothing rocker-shaped to read. There is no
 * rocker-to-rail formula to invent.
 *
 * With the link off, `rails` is returned untouched — same shape as `deriveEffectiveVolume` above:
 * a derived read, never a write back into state.
 */
export function deriveEffectiveRails(
  rails: RailBandSpec,
  foil: FoilSpec,
  importFoilThickness: boolean,
): RailBandSpec {
  if (!importFoilThickness) return rails;
  return {
    ...rails,
    nose: { ...rails.nose, boardThickness: foil.nose12 },
    center: { ...rails.center, boardThickness: foil.center },
    tail: { ...rails.tail, boardThickness: foil.tail12 },
  };
}

/**
 * The three stations RAILS bands (Phase 17, D-35): the tail 12", the centre and the nose 12" — the very anchors the
 * litres' cross-sections blend their rails between (`boardSectionsWith`, from `foilStationPoints`), so RAILS reads the
 * bottom at the stations the 3D board reads it.
 */
export function railAnchorStations(foil: FoilSpec, length: Mm): RailAnchorStations {
  const points = foilStationPoints(foil, length);
  const at = (key: string) => points.find((p) => p.key === key)!.station;
  return { tail: at("tail12"), center: at("center"), nose: at("nose12") };
}

/**
 * RAILS' rail lift at a station (Phase 17, D-22, D-35): the foam the vee or belly takes off right at the rail,
 * `sectionsFoamOff` read at the rail's own distance from the stringer (`railAt`). A vee or a belly lifts the rail; a
 * concave runs out before the rail and lifts nothing there. A channel never counts, even one that runs out through the
 * rail (D-43): channels are cut after the rail is shaped (G-17-6, the founder, 2026-11-10), so the rail RAILS bands is
 * the one the vee or belly leaves.
 */
export function bottomRailLift(resolved: ResolvedBottom, board: BottomBoard): (station: Mm) => Mm {
  return (station) => sectionsFoamOff(resolved, board, station, board.railAt(station));
}

/**
 * RAILS bands the rail the bottom leaves (Phase 17, D-22, D-35, D-40, D-41 — the founder: "contour before rail
 * shaping"). Each of the three anchors' `boardThickness` is lowered by the rail lift at its station (`liftAt`, built
 * by `bottomRailLift`), so RAILS' plots, DATA and its readout card show the thinner rail a vee or a belly leaves.
 * When the lift is 0 at all three — a flat bottom, a concave alone — `rails` itself comes back, the same object, so a
 * flat board's every RAILS figure is untouched.
 *
 * RAILS-ONLY (research Pitfalls 5 and 6). This never runs inside `deriveEffectiveRails`: the rack card's headline
 * thickness (`summarizeDesign`'s `centerThickness`) and VOLUME's estimator rows read the planed figures, and the
 * litres and the 3D board take the lift through their own sections. The two readings agree on a short rail to a
 * fraction of a millimetre; on the Longboard's rolled rail, which starts about 7" in, they part most (research §C).
 *
 * A lift deeper than the rail can stand is held at RAILS' own 1/4" floor (`BOTTOM_FLOOR`, the least thickness RAILS
 * and the foil ever take), because the band maths cannot band a rail of no thickness; such a rail is flagged as too
 * thin on BOTTOM, never cut shallower (D-40).
 */
export function railsOnTheBottom(
  rails: RailBandSpec,
  liftAt: (station: Mm) => Mm,
  anchors: RailAnchorStations,
): RailBandSpec {
  const lift = { tail: liftAt(anchors.tail), center: liftAt(anchors.center), nose: liftAt(anchors.nose) };
  if (lift.tail === 0 && lift.center === 0 && lift.nose === 0) return rails;
  const lowered = (key: "tail" | "center" | "nose") =>
    lift[key] === 0
      ? rails[key]
      : { ...rails[key], boardThickness: mm(Math.max(BOTTOM_FLOOR, rails[key].boardThickness - lift[key])) };
  return { ...rails, tail: lowered("tail"), center: lowered("center"), nose: lowered("nose") };
}

/**
 * RAILS' three sections standing on the bottom the cut leaves (Phase 17, D-41): each section whose rail a vee or a
 * belly lifts carries that bottom across (`railSectionBottom`, read off `sectionsFoamOff` at its anchor — the one
 * number without the channels, D-05), so its plot draws the planed bottom falling away under the rail at the vee's or
 * belly's own angle. `bands` are the bands of `railsOnTheBottom`'s rails, so the rail drawn on that bottom is the
 * thinner one. A section whose rail is not lifted is passed through as it is; when none is, `bands` itself comes back.
 *
 * The channels are cut last, after the rail is shaped (G-17-6, the founder, 2026-11-10: D-05, D-10): they never lift
 * the rail RAILS bands, and are handed over as their own cut (`channelFoamOff`) and walls (`channelWallsAt`, measured
 * in from the rail on both sides of the stringer), so the plot cuts them into its bottom and its finished rail
 * straight up at each wall.
 */
export function railBandsOnTheBottom(
  bands: RailBandsOutput,
  resolved: ResolvedBottom,
  board: BottomBoard,
  anchors: RailAnchorStations,
): RailBandsOutput {
  const onBottom = (key: "tail" | "center" | "nose") => {
    const station = anchors[key];
    const rail = board.railAt(station);
    const lift = sectionsFoamOff(resolved, board, station, rail);
    if (lift === 0) return bands[key];
    const liftIn = (inFromRail: Mm) => sectionsFoamOff(resolved, board, station, mm(Math.abs(rail - inFromRail)));
    const { channels, wingRule } = resolved;
    const cutIn = (inFromRail: Mm) => channelFoamOff(channels, board, wingRule, station, mm(Math.abs(rail - inFromRail)));
    const wallsIn = channelWallsAt(channels, board, wingRule, station).flatMap((w) => [mm(rail - w), mm(rail + w)]);
    return { ...bands[key], bottom: railSectionBottom(bands[key], lift, liftIn, { cutIn, wallsIn }) };
  };
  const tail = onBottom("tail");
  const center = onBottom("center");
  const nose = onBottom("nose");
  if (tail === bands.tail && center === bands.center && nose === bands.nose) return bands;
  return { tail, center, nose };
}

/** The subset of a stored design `summarizeDesign` needs to produce a rack card's four numbers. */
export interface DesignSummaryFields {
  outline: OutlineSpec;
  rails: RailBandSpec;
  foil: FoilSpec;
  railsImportFoilThickness: boolean;
  volume: VolumeSpec;
  /** The hand-set rocker (D-14). Absent reads as `DEFAULT_FALLBACK_ROCKER`; it only shapes the
   * bottom, never the thickness, so it never moves the litres. */
  rocker?: FiveStationRocker;
  /** The board's own copy of its blank (D-01), or null/absent for a hand-set board. */
  blank?: BoardBlank | null;
  /** The bottom contours (Phase 17, D-24). Absent reads flat — and a flat bottom never moves the litres (D-20). */
  bottom?: BoardBottom;
  /** FINS' own fins (D-03): where the front fins sit is what a tail cut's Deepest At is kept from. Absent reads the
   * store's default fins, as `designFinPlacement` does. Read only when the bottom cuts anything. */
  fins?: FinPlacementSpec;
  /** FINS' Import Template box. Absent reads ticked, the store's default. Read only when the bottom cuts anything. */
  finsImportTemplate?: boolean;
}

/**
 * The one rule deciding which of the two litres figures the app quotes (CONTEXT.md D-13's
 * transparency half): a board importing its drawn template dimensions is a board designed in the
 * app, so it gets the accurate cross-section figure; a board with the import toggle off is the
 * Volume screen being used as a standalone quick estimator, so it gets the estimator's own figure.
 * One rule, one place, read by every consumer (the Volume screen, rack cards, the Summary order
 * form, the printed template) — the thing that must never happen is two different litres for one
 * board shown on two different screens (threat T-04-11).
 */
export function deriveQuotedVolumeLitres(
  estimator: VolumeResult,
  crossSection: CrossSectionVolumeResult,
  importingTemplate: boolean,
): Litres {
  return importingTemplate ? crossSection.volumeLitres : estimator.volumeLitres;
}

/** The four numbers a rack card shows (D-12): length x width x thickness, plus volume in litres. */
export interface DesignSummary {
  length: Mm;
  widePointWidth: Mm;
  centerThickness: Mm;
  volumeLitres: Litres;
}

/**
 * Composes `buildOutline` -> `buildBoardProfile` -> `deriveEffectiveRails` -> `computeRailBands` ->
 * the three derivations above -> `computeVolume` and `computeCrossSectionVolume` ->
 * `deriveQuotedVolumeLitres`, so a rack card's summary numbers are produced by the exact same
 * pipeline the RAILS and Volume screens show, not a second parallel calculation that could drift
 * from either.
 *
 * The side profile is built exactly as the design store builds it (Pattern 5): for a board in a
 * blank, from the board's OWN copy of that blank's catalogue rows (D-01 — a rack card never reads
 * the catalogue, so a later catalogue correction can never move a saved board's numbers), with the
 * RAILS thicknesses read off the foil cut from the blank and the litres integrated along its dense
 * thickness curve; for a hand-set board, from the stored foil through the five-station curve,
 * which is exactly what it always was. So a rack card, a preset card and the VOLUME screen quote
 * one litres figure for the same board.
 *
 * Phase 12 (D-08): the board is cut from its blank with the board's OWN cut — its Deck Skin, Tip
 * Style and fine-tune surface, carried on its blank — passed through to the one side profile
 * exactly as the store passes it, so the litres follow the new foil everywhere. Phase 14 (D-24):
 * the board's own stored Thinning Starts go the same way, through `thinningStartsOf`.
 *
 * This is exactly `summarizeDesignWith(fields, LIVE_DESIGN_RULES)`: the live rules (Phase 14 D-13)
 * through the one pipeline below.
 */
export function summarizeDesign(fields: DesignSummaryFields): DesignSummary {
  return summarizeDesignWith(fields, LIVE_DESIGN_RULES);
}

/**
 * How a board's figures are worked out: how a blank's catalogue rows become the curves the board is
 * cut from. Every screen uses the live preparation (`LIVE_DESIGN_RULES`). A hand-set board is always
 * drawn with the square-root rule and every tip with the steady taper — the curve and the 12" blend
 * the site used before Phase 14 were retired after the Oct 10 showing (quick 261018-dvu).
 */
export interface DesignRules {
  /** Prepares a blank's own copy of its catalogue rows into the curves the board is cut from. */
  prepare: (record: BlankRecord) => PreparedBlank;
  /**
   * How the rail character reaches each station of the litres (Phase 16, D-20/D-27/D-32). Absent means the
   * live rule (`SMOOTH_SURFACE_FADE`) — the one every screen uses. The old rules are named only by the pins and
   * the reports: the pre-Phase-16 switch (`HARD_EDGE_SWITCH`) by the 40-board pin and the hard-edge report, go-live
   * 1's hard-edge fade (`HARD_EDGE_FADE`) by the 74-board pin and the rail-character and surface reports, and the
   * whole rail's fade alone (`RAIL_CHARACTER_FADE`) by the 102-board pin and those same two reports.
   */
  hardEdge?: SectionRule;
}

/**
 * The rules every screen uses (Phase 14 D-13): a blank's own catalogue rows prepared by
 * `prepareBlank`. `summarizeDesign` and the Board Rack (Phase 15) both read these, so the two never
 * drift.
 */
export const LIVE_DESIGN_RULES: DesignRules = { prepare: prepareBlank };

/**
 * The one recipe for a saved board's side profile — the rocker and the deck — moved here verbatim
 * from `summarizeDesignWith` (an extraction, not a rewrite). For a board in a blank it reads the
 * board's OWN copy of that blank through `rules.prepare`, bent by the rocker the board ordered
 * (`prepareBoardBlank`, quick 261016-mkb), the board's own cut (Deck Skin, Tip Style,
 * fine-tune surface) and its own stored Thinning Starts; for a hand-set board, its five typed
 * stations. Never the catalogue (Phase 15 SPEC constraint 3), so a later catalogue correction can
 * never move a saved board's picture on the rack, and the rack's side view and the card's litres
 * can never read two different profiles.
 */
export function designSideProfile(
  fields: Pick<DesignSummaryFields, "outline" | "rocker" | "foil" | "blank">,
  rules: DesignRules,
): BoardSideProfile {
  const { blank } = fields;
  return buildBoardProfile({
    length: fields.outline.length,
    rocker: fields.rocker ?? DEFAULT_FALLBACK_ROCKER,
    foil: fields.foil,
    blank: blank
      ? {
          // The board's own copy, bent by the rocker it ordered (quick 261016-mkb) — the one helper.
          prepared: prepareBoardBlank(blank, rules.prepare),
          placement: blank.placement,
          nose12Offset: blank.nose12Offset,
          tail12Offset: blank.tail12Offset,
          deckSkin: blank.deckSkin,
          tipStyle: blank.tipStyle,
          fineTuneSurface: blank.fineTuneSurface,
          // The board's own stored Thinning Starts (Phase 14 D-24), through the one helper.
          ...thinningStartsOf(blank),
        }
      : null,
  });
}

/**
 * `summarizeDesign`'s whole pipeline (see its comment) with the blank preparation passed in.
 */
export function summarizeDesignWith(fields: DesignSummaryFields, rules: DesignRules): DesignSummary {
  const outlineGeometry = buildOutline(fields.outline);
  const profile = designSideProfile(fields, rules);
  const effectiveRails = deriveEffectiveRails(fields.rails, profile.effectiveFoil, fields.railsImportFoilThickness);
  const railBands = computeRailBands(effectiveRails);
  const templateValues = deriveTemplateValues(fields.outline, outlineGeometry);
  const railValues = deriveRailValues(railBands);
  const effectiveVolume = deriveEffectiveVolume(fields.volume, templateValues, railValues);
  const volumeResult = computeVolume(effectiveVolume, templateValues, railValues);
  // The bottom's facts are built only when it cuts anything (D-20): a flat board reads exactly what it always did, and a
  // rack card counts a saved board's cut exactly as VOLUME does (threat T-04-11).
  const bottom =
    fields.bottom && bottomHasCut(fields.bottom)
      ? {
          bottom: fields.bottom,
          board: designBottomBoard(fields.outline, outlineGeometry, profile, designFinPlacement(fields)),
        }
      : undefined;
  const crossSectionInput = designCrossSectionInput(
    outlineGeometry,
    profile,
    effectiveRails,
    fields.outline.length,
    bottom,
  );
  // No rule named is the live rule — the very function every screen's litres call.
  const crossSectionVolume = rules.hardEdge
    ? computeCrossSectionVolumeWith(crossSectionInput, rules.hardEdge)
    : computeCrossSectionVolume(crossSectionInput);
  const quotedVolumeLitres = deriveQuotedVolumeLitres(volumeResult, crossSectionVolume, volumeResult.importingTemplate);

  return {
    length: templateValues.length,
    widePointWidth: templateValues.widePointWidth,
    centerThickness: railValues.centerThickness,
    volumeLitres: quotedVolumeLitres,
  };
}
