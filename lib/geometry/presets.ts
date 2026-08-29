/**
 * Board-type presets — the roster shown on the setup screen (D-01/D-02).
 *
 * Pure TypeScript, no UI/browser/database imports — same tier as `board.ts`.
 * Each preset is a complete spec — `outline`, `rocker`, `foil`, `rails`, `fins` — not a patch,
 * so `applyPreset` (components/design/design-store.tsx) can overwrite the
 * store's board wholesale without merging against whatever was there before.
 *
 * D-03 tuning status (2026-08-21): `midlength` and `longboard` outlines carry
 * the shaper's own values, captured from the live outline editor via the
 * development-only "Copy preset values" affordance
 * (components/outline/outline-editor.tsx) and pasted in wholesale.
 * `shortboard` and `fish` outlines were reviewed in the same live editor and
 * approved as accurate without change, so they keep their original
 * Claude-drafted curve (RESEARCH.md assumption A1) — still bounds-correct
 * against `OutlineControls`' slider ranges, and now shaper-approved rather
 * than merely bounds-correct.
 *
 * D-12 tuning status (2026-08-29): every preset's `rocker` and `foil` are
 * Claude-drafted starting values carrying each board type's recognised
 * side-profile character — the Fish flatter and proportionally thicker, the
 * Longboard with the most nose lift, the Shortboard with the most rocker
 * overall — awaiting the founder's review in the live ROCKER editor, exactly
 * the state the outline presets were in before Phase 1's capture session
 * tuned two of them. Any future change to `rocker`/`foil` should come back
 * through the same capture loop (the development-only "Copy preset values"
 * affordance on components/rocker/rocker-editor.tsx) rather than being
 * hand-edited.
 *
 * `rails` and `fins` are seeded-but-untuned for all four presets as of this
 * task: every preset's `rails` is `DEFAULT_RAIL_BAND_SPEC` and every preset's
 * `fins` is `DEFAULT_FIN_PLACEMENT_SPEC`, verbatim and un-differentiated by
 * board type. This keeps every preset structurally complete and working
 * immediately, but the shaper has not yet supplied per-board-type rail or
 * fin numbers — do not hand-guess them. That tuning happens through the same
 * capture loop as the outline, via the development-only capture affordances
 * on the Rails screen (components/rails/rail-band-editor.tsx) and Fins
 * screen (components/fins/fin-placement-editor.tsx), in a follow-up session.
 *
 * Any future change to any preset field should go through the matching
 * capture loop rather than being hand-edited. Every length/width/offset is
 * authored via `inchesToMm()` and every angle via `degrees()` — never a bare
 * number, never the raw millimetre brand constructor — because this file is
 * the one place preset data crosses the units boundary
 * (lib/geometry/units.ts).
 */

import type { OutlineSpec } from "./board";
import { DEFAULT_FIN_PLACEMENT_SPEC, type FinPlacementSpec } from "./fins";
import type { FoilSpec } from "./foil";
import { DEFAULT_RAIL_BAND_SPEC, type RailBandSpec } from "./rail-bands";
import type { RockerSpec } from "./rocker";
import { degrees, inchesToMm } from "./units";

export interface BoardPreset {
  id: "shortboard" | "fish" | "midlength" | "longboard";
  name: string;
  descriptor: string;
  outline: OutlineSpec;
  rocker: RockerSpec;
  foil: FoilSpec;
  rails: RailBandSpec;
  fins: FinPlacementSpec;
}

export const BOARD_PRESETS: readonly BoardPreset[] = [
  {
    id: "shortboard",
    name: "Shortboard",
    descriptor: "Fast and responsive, for performance surfing",
    outline: {
      length: inchesToMm(74),
      widePointWidth: inchesToMm(18.75),
      widePointOffset: inchesToMm(-1),
      tailRailLength: 50,
      noseRailLength: 50,
      noseAngle: degrees(50),
      noseFullness: 20,
      tailAngle: degrees(55),
      tailFullness: 45,
      tail: { kind: "squash", endWidth: inchesToMm(4) },
    },
    rocker: {
      noseTip: inchesToMm(4.75),
      nose12: inchesToMm(1.4),
      tail12: inchesToMm(0.45),
      tailTip: inchesToMm(2.1),
    },
    foil: {
      noseTip: inchesToMm(0.3125),
      nose12: inchesToMm(1.2),
      center: inchesToMm(2.4),
      tail12: inchesToMm(1.45),
      tailTip: inchesToMm(0.25),
    },
    rails: DEFAULT_RAIL_BAND_SPEC,
    fins: DEFAULT_FIN_PLACEMENT_SPEC,
  },
  {
    id: "fish",
    name: "Fish",
    descriptor: "Wide and flat, for small-to-mid days",
    outline: {
      length: inchesToMm(66),
      widePointWidth: inchesToMm(20.5),
      widePointOffset: inchesToMm(0),
      tailRailLength: 60,
      noseRailLength: 60,
      noseAngle: degrees(70),
      noseFullness: 55,
      tailAngle: degrees(35),
      tailFullness: 15,
      tail: { kind: "swallow", endWidth: inchesToMm(9), crotchDepth: inchesToMm(2.5) },
    },
    rocker: {
      noseTip: inchesToMm(3.5),
      nose12: inchesToMm(1.0),
      tail12: inchesToMm(0.3),
      tailTip: inchesToMm(1.4),
    },
    foil: {
      noseTip: inchesToMm(0.375),
      nose12: inchesToMm(1.5),
      center: inchesToMm(2.75),
      tail12: inchesToMm(1.75),
      tailTip: inchesToMm(0.3125),
    },
    rails: DEFAULT_RAIL_BAND_SPEC,
    fins: DEFAULT_FIN_PLACEMENT_SPEC,
  },
  {
    id: "midlength",
    name: "Mid-length",
    descriptor: "Easy paddling with room to maneuver",
    outline: {
      length: inchesToMm(84),
      widePointWidth: inchesToMm(21),
      widePointOffset: inchesToMm(3.5),
      tailRailLength: 55,
      noseRailLength: 55,
      noseAngle: degrees(65),
      noseFullness: 45,
      tailAngle: degrees(90),
      tailFullness: 64.5,
      tail: { kind: "round" },
    },
    rocker: {
      noseTip: inchesToMm(4.5),
      nose12: inchesToMm(1.25),
      tail12: inchesToMm(0.4),
      tailTip: inchesToMm(1.75),
    },
    foil: {
      noseTip: inchesToMm(0.375),
      nose12: inchesToMm(1.7),
      center: inchesToMm(2.9),
      tail12: inchesToMm(1.85),
      tailTip: inchesToMm(0.3125),
    },
    rails: DEFAULT_RAIL_BAND_SPEC,
    fins: DEFAULT_FIN_PLACEMENT_SPEC,
  },
  {
    id: "longboard",
    name: "Longboard",
    descriptor: "Smooth glide, nose-to-tail control",
    outline: {
      length: inchesToMm(108),
      widePointWidth: inchesToMm(22.5),
      widePointOffset: inchesToMm(8),
      tailRailLength: 50,
      noseRailLength: 50,
      noseAngle: degrees(90),
      noseFullness: 90,
      tailAngle: degrees(30),
      tailFullness: 53.5,
      tail: { kind: "squash", endWidth: inchesToMm(8) },
    },
    rocker: {
      noseTip: inchesToMm(5.5),
      nose12: inchesToMm(1.5),
      tail12: inchesToMm(0.35),
      tailTip: inchesToMm(1.6),
    },
    foil: {
      noseTip: inchesToMm(0.5),
      nose12: inchesToMm(2.1),
      center: inchesToMm(3.25),
      tail12: inchesToMm(2.0),
      tailTip: inchesToMm(0.4375),
    },
    rails: DEFAULT_RAIL_BAND_SPEC,
    fins: DEFAULT_FIN_PLACEMENT_SPEC,
  },
];
