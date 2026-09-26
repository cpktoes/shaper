/**
 * Preset capture: reads a live design spec back out as pasteable `lib/geometry/presets.ts` source.
 *
 * Each design screen carries a development-only "Copy preset values" button (every editor gates
 * it on `process.env.NODE_ENV === "development"`, so the bundler strips it from production). It
 * is how a `BoardPreset` gets shaper-tuned in the real editor rather than hand-guessed (D-03):
 * the founder sets a board up on screen, presses the button, and pastes the block straight into
 * `presets.ts`. The four block builders below lived as private copies inside their own editors
 * (`components/{outline,rocker,rails,fins}/*-editor.tsx`) until 2026-09-14, each with its own
 * copy of a three-decimal inch printer. They moved here together because that printer was wrong
 * in all four places at once, in a way only a test can hold still: a slider stepping in
 * sixteenths (`ROCKER_LIFT_RANGE_IN`, `FOIL_THICKNESS_RANGE_IN`) set to 2 1/16" pasted as
 * `inchesToMm(2.063)` — five ten-thousandths of an inch off the grid the slider itself can reach —
 * and that day's Shortboard capture had to be hand-corrected back to `2.0625` after pasting (see
 * the `shortboard` block's own comment in `presets.ts`). `formatPresetInches` is the one printer
 * every block now shares, and this file is pure (no React, no browser API — the same tier as
 * `presets.ts`) so the round trip — build a block, evaluate it the way `presets.ts` would, get the
 * same spec back to the last bit — is asserted in `preset-source.test.ts` rather than trusted.
 *
 * The text each builder emits is byte-for-byte what its editor emitted before the move, apart
 * from the digits themselves: `presets.ts` is authored in `inchesToMm()`/`degrees()` calls (its
 * own header says why), and a paste has to read the way that file reads.
 */

import type { OutlineSpec } from "./board";
import type { FinAdvancedSpec, FinPlacementSpec } from "./fins";
import type { FoilSpec } from "./foil";
import type { RailBandSpec, RailSectionSpec } from "./rail-bands";
import { inchesToMm, mmToInches, type Mm } from "./units";

/** The most decimal places `formatPresetInches` will print — its comment says why six. */
export const PRESET_INCH_PLACES = 6;

/**
 * Prints a stored millimetre value as the inch figure a preset author writes inside
 * `inchesToMm(…)`: the FEWEST decimal places whose `inchesToMm()` gives back the stored number
 * exactly, printed by `String()` rather than to a fixed width — so a whole 74 prints `74`, a
 * quarter prints `18.75`, and 2 1/16" prints `2.0625` rather than the `2.063` the three-decimal
 * rounding this replaced produced.
 *
 * Exactness is decided by the round trip, not by counting places: each candidate is pushed
 * through `inchesToMm()` and compared with `===` to the stored number. Anything that ENTERED as a
 * short decimal in inches reproduces exactly within the six-place cap, because the same
 * expression on the same literal yields the same double — every position on a sixteenth slider,
 * every thirty-second on the RAILS corner-cut slider, every drag (`rocker-drag.ts` and
 * `outline-drag.ts` snap to the slider step), and any typed fraction down to a sixty-fourth.
 *
 * A value that did NOT enter as a short inch decimal — a whole millimetre from a Metric slider, a
 * centimetre typed into a Metric field — has no short inch figure at all (nothing divides by 25.4
 * cleanly), so no candidate matches and the fallback prints six places: within 0.0000127 mm of
 * the stored number, a thousand times tighter than the three-place rounding this replaced and far
 * below anything foam can hold. Printing such a value as `mm(52)` would be exact, but `presets.ts`
 * is authored in inches on purpose and no Metric capture has been asked for — a deliberate
 * non-goal, not an oversight.
 */
export function formatPresetInches(value: Mm): string {
  const inches = mmToInches(value);
  for (let places = 0; places <= PRESET_INCH_PLACES; places++) {
    const candidate = Number(inches.toFixed(places));
    if (inchesToMm(candidate) === value) return String(candidate);
  }
  return String(Number(inches.toFixed(PRESET_INCH_PLACES)));
}

/** Builds a pasteable `BoardPreset["outline"]` source block from the live outline spec — the
 * TEMPLATE screen's capture (`components/outline/outline-editor.tsx`). */
export function buildOutlinePresetSource(spec: OutlineSpec): string {
  const tailFields: string[] = [`kind: "${spec.tail.kind}"`];
  if (spec.tail.kind === "squash" || spec.tail.kind === "diamond" || spec.tail.kind === "swallow") {
    tailFields.push(`endWidth: inchesToMm(${formatPresetInches(spec.tail.endWidth)})`);
  }
  if (spec.tail.kind === "diamond") {
    tailFields.push(`depth: inchesToMm(${formatPresetInches(spec.tail.depth)})`);
  }
  if (spec.tail.kind === "swallow") {
    tailFields.push(`crotchDepth: inchesToMm(${formatPresetInches(spec.tail.crotchDepth)})`);
  }

  return [
    "outline: {",
    `  length: inchesToMm(${formatPresetInches(spec.length)}),`,
    `  widePointWidth: inchesToMm(${formatPresetInches(spec.widePointWidth)}),`,
    `  widePointOffset: inchesToMm(${formatPresetInches(spec.widePointOffset)}),`,
    `  tailRailLength: ${spec.tailRailLength},`,
    `  noseRailLength: ${spec.noseRailLength},`,
    `  noseAngle: degrees(${spec.noseAngle}),`,
    `  noseFullness: ${spec.noseFullness},`,
    `  tailAngle: degrees(${spec.tailAngle}),`,
    `  tailFullness: ${spec.tailFullness},`,
    `  tail: { ${tailFields.join(", ")} },`,
    "},",
  ].join("\n");
}

/** What the ROCKER screen's capture reads: the foil's centre and two tips (the board's own stored
 * values — the 12" stations are the blank's, D-10/D-11), and the picked blank's identity and
 * placement, or `null` when the board is still hand-set. */
export interface RockerPresetSourceInput {
  foil: Pick<FoilSpec, "noseTip" | "center" | "tailTip">;
  blank: { vendor: string; name: string; placement: Mm } | null;
}

/**
 * Builds the ROCKER screen's capture (`components/rocker/rocker-editor.tsx`) — the D-03 line the
 * founder pastes into `presets.ts` once a preset has been set up on screen in its real blank: a
 * `foil` block of the three thicknesses a preset still owns (centre and tips, exact sixteenths
 * through `formatPresetInches`), then either the `blank` line naming the vendor and blank (each a
 * JSON string, so a name such as `6'0" M-Regular` pastes back intact) with its placement through
 * `inchesToMm()`, or — with no blank picked — a comment saying so, since a preset keeps its
 * provisional pick until one is captured. The rocker itself is no longer captured: with a blank it
 * is the blank's own.
 */
export function buildRockerPresetSource(input: RockerPresetSourceInput): string {
  const { foil, blank } = input;
  return [
    "foil: {",
    `  noseTip: inchesToMm(${formatPresetInches(foil.noseTip)}),`,
    `  center: inchesToMm(${formatPresetInches(foil.center)}),`,
    `  tailTip: inchesToMm(${formatPresetInches(foil.tailTip)}),`,
    "},",
    blank
      ? `blank: { vendor: ${JSON.stringify(blank.vendor)}, name: ${JSON.stringify(blank.name)}, placement: inchesToMm(${formatPresetInches(blank.placement)}) },`
      : "// blank: none picked — this preset would keep its provisional pick",
  ].join("\n");
}

/** Builds a pasteable `RailSectionSpec` source block, nested `indent` spaces inside its caller. */
function buildRailSectionSource(spec: RailSectionSpec, indent: string): string {
  const pad = `${indent}  `;
  const cornerCutOffsetOverride =
    spec.cornerCutOffsetOverride === null
      ? "null"
      : `inchesToMm(${formatPresetInches(spec.cornerCutOffsetOverride)})`;
  const bottomTuck3Override =
    spec.bottomTuck3Override === null ? "null" : `inchesToMm(${formatPresetInches(spec.bottomTuck3Override)})`;

  return [
    "{",
    `${pad}boardThickness: inchesToMm(${formatPresetInches(spec.boardThickness)}),`,
    `${pad}deckPercent: ${spec.deckPercent},`,
    `${pad}family: ${spec.family},`,
    `${pad}ratioTopPercent: ${spec.ratioTopPercent},`,
    `${pad}symmetrical: ${spec.symmetrical},`,
    `${pad}cornerCutOffsetOverride: ${cornerCutOffsetOverride},`,
    `${pad}removeCornerCut: ${spec.removeCornerCut},`,
    `${pad}singleTuck: ${spec.singleTuck},`,
    `${pad}bottomTuck3Override: ${bottomTuck3Override},`,
    `${indent}}`,
  ].join("\n");
}

/** Builds a pasteable `BoardPreset["rails"]` source block from the live rail-band spec — the
 * RAILS screen's capture (`components/rails/rail-band-editor.tsx`). */
export function buildRailsPresetSource(spec: RailBandSpec): string {
  return [
    "rails: {",
    `  nose: ${buildRailSectionSource(spec.nose, "  ")},`,
    `  center: ${buildRailSectionSource(spec.center, "  ")},`,
    `  tail: ${buildRailSectionSource(spec.tail, "  ")},`,
    `  tailHardEdge: ${spec.tailHardEdge},`,
    "},",
  ].join("\n");
}

/** Builds a pasteable `FinAdvancedSpec` source block, nested `indent` spaces inside its caller. */
function buildFinAdvancedSource(spec: FinAdvancedSpec, indent: string): string {
  const pad = `${indent}  `;
  const forwardToeOverride =
    spec.forwardToeOverride === null ? "null" : `inchesToMm(${formatPresetInches(spec.forwardToeOverride)})`;
  const rearToeOverride =
    spec.rearToeOverride === null ? "null" : `inchesToMm(${formatPresetInches(spec.rearToeOverride)})`;
  const quadRearOffRailOverride =
    spec.quadRearOffRailOverride === null
      ? "null"
      : `inchesToMm(${formatPresetInches(spec.quadRearOffRailOverride)})`;
  const quadRearOffTailOverride =
    spec.quadRearOffTailOverride === null
      ? "null"
      : `inchesToMm(${formatPresetInches(spec.quadRearOffTailOverride)})`;

  return [
    "{",
    `${pad}baseLenForward: inchesToMm(${formatPresetInches(spec.baseLenForward)}),`,
    `${pad}baseLenForwardOverridden: ${spec.baseLenForwardOverridden},`,
    `${pad}baseLenRear: inchesToMm(${formatPresetInches(spec.baseLenRear)}),`,
    `${pad}baseLenRearOverridden: ${spec.baseLenRearOverridden},`,
    `${pad}baseLenCenter: inchesToMm(${formatPresetInches(spec.baseLenCenter)}),`,
    `${pad}baseLenCenterOverridden: ${spec.baseLenCenterOverridden},`,
    `${pad}centerPositionOffset: inchesToMm(${formatPresetInches(spec.centerPositionOffset)}),`,
    `${pad}forwardPositionOffset: inchesToMm(${formatPresetInches(spec.forwardPositionOffset)}),`,
    `${pad}forwardToeOverride: ${forwardToeOverride},`,
    `${pad}rearPositionOffset: inchesToMm(${formatPresetInches(spec.rearPositionOffset)}),`,
    `${pad}rearToeOverride: ${rearToeOverride},`,
    `${pad}quadRearOffRailOverride: ${quadRearOffRailOverride},`,
    `${pad}quadRearOffTailOverride: ${quadRearOffTailOverride},`,
    `${pad}quadRearOffTailOverridden: ${spec.quadRearOffTailOverridden},`,
    `${indent}}`,
  ].join("\n");
}

/** Builds a pasteable `BoardPreset["fins"]` source block from the live (raw, non-imported) fin
 * spec — the FINS screen's capture (`components/fins/fin-placement-editor.tsx`). */
export function buildFinsPresetSource(spec: FinPlacementSpec): string {
  return [
    "fins: {",
    `  boardLength: inchesToMm(${formatPresetInches(spec.boardLength)}),`,
    `  tailWidth12: inchesToMm(${formatPresetInches(spec.tailWidth12)}),`,
    `  tailShape: "${spec.tailShape}",`,
    `  finSetup: "${spec.finSetup}",`,
    `  frontModel: "${spec.frontModel}",`,
    `  quadRearModel: "${spec.quadRearModel}",`,
    `  twinTemplate: "${spec.twinTemplate}",`,
    `  quadCenterFinOn: ${spec.quadCenterFinOn},`,
    `  advanced: ${buildFinAdvancedSource(spec.advanced, "  ")},`,
    "},",
  ].join("\n");
}
