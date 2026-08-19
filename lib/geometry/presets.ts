/**
 * Board-type presets — the roster shown on the setup screen (D-01/D-02).
 *
 * Pure TypeScript, no UI/browser/database imports — same tier as `board.ts`.
 * Each preset is a complete `OutlineSpec`, not a patch, so `applyPreset`
 * (components/design/design-store.tsx) can overwrite the store's outline
 * wholesale without merging against whatever was there before.
 *
 * All numeric values below are Claude-drafted starting points (CONTEXT.md
 * D-03, RESEARCH.md assumption A1) — bounds-correct against
 * `OutlineControls`' slider ranges, but not yet shaper-tuned. The user tunes
 * each preset live in the outline editor; the tuned values then replace
 * these drafts wholesale in a later plan. Every length/width/offset is
 * authored via `inchesToMm()` and every angle via `degrees()` — never a bare
 * number, never the raw millimetre brand constructor — because this file is
 * the one place preset data crosses the units boundary (lib/geometry/units.ts).
 */

import type { OutlineSpec } from "./board";
import { degrees, inchesToMm } from "./units";

export interface BoardPreset {
  id: "shortboard" | "fish" | "midlength" | "longboard";
  name: string;
  descriptor: string;
  outline: OutlineSpec;
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
  },
  {
    id: "midlength",
    name: "Mid-length",
    descriptor: "Easy paddling with room to maneuver",
    outline: {
      length: inchesToMm(84),
      widePointWidth: inchesToMm(21),
      widePointOffset: inchesToMm(0.5),
      railLength: 55,
      noseAngle: degrees(65),
      noseFullness: 45,
      tailAngle: degrees(60),
      tailFullness: 55,
      tail: { kind: "round" },
    },
  },
  {
    id: "longboard",
    name: "Longboard",
    descriptor: "Smooth glide, nose-to-tail control",
    outline: {
      length: inchesToMm(108),
      widePointWidth: inchesToMm(23),
      widePointOffset: inchesToMm(1),
      railLength: 45,
      noseAngle: degrees(80),
      noseFullness: 75,
      tailAngle: degrees(75),
      tailFullness: 70,
      tail: { kind: "squash", endWidth: inchesToMm(10) },
    },
  },
];
