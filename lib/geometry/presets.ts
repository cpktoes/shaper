/**
 * Board-type presets — the roster shown on the setup screen (D-01/D-02).
 *
 * Pure TypeScript, no UI/browser/database imports — same tier as `board.ts`.
 * Each preset is a complete spec — `outline`, `rails`, `fins` — not a patch,
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
import { DEFAULT_RAIL_BAND_SPEC, type RailBandSpec } from "./rail-bands";
import { degrees, inchesToMm } from "./units";

export interface BoardPreset {
  id: "shortboard" | "fish" | "midlength" | "longboard";
  name: string;
  descriptor: string;
  outline: OutlineSpec;
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
      railLength: 50,
      noseAngle: degrees(50),
      noseFullness: 20,
      tailAngle: degrees(55),
      tailFullness: 45,
      tail: { kind: "squash", endWidth: inchesToMm(4) },
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
      railLength: 60,
      noseAngle: degrees(70),
      noseFullness: 55,
      tailAngle: degrees(35),
      tailFullness: 15,
      tail: { kind: "swallow", endWidth: inchesToMm(9), crotchDepth: inchesToMm(2.5) },
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
      railLength: 55,
      noseAngle: degrees(65),
      noseFullness: 45,
      tailAngle: degrees(90),
      tailFullness: 64.5,
      tail: { kind: "round" },
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
      railLength: 50,
      noseAngle: degrees(90),
      noseFullness: 90,
      tailAngle: degrees(30),
      tailFullness: 53.5,
      tail: { kind: "squash", endWidth: inchesToMm(8) },
    },
    rails: DEFAULT_RAIL_BAND_SPEC,
    fins: DEFAULT_FIN_PLACEMENT_SPEC,
  },
];
