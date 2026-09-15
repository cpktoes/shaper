import type { OutlineSpec } from "../board";
import { degrees, inchesToMm } from "../units";

/**
 * The four presets' outlines exactly as they were when the template suites' frozen characterisation
 * pins and recorded "planning facts" were measured (quick tasks 260902-cj5, 260902-kon, 260903-18d and
 * 260903-fqv). `BOARD_PRESETS` is live shaper-tuned data — the Fish and Mid-length outlines were
 * recaptured from the live editor on 2026-09-14 — and a preset capture is a data change, not a code
 * change, so it must never feed a frozen pin or a recorded planning fact: those tests exist to prove
 * the CODE's output for a fixed input has not moved. Frozen, never edit. Test-only: nothing outside
 * the test suites imports this file.
 */
export const PINNED_PRESET_OUTLINES: readonly { id: "shortboard" | "fish" | "midlength" | "longboard"; outline: OutlineSpec }[] = [
  {
    id: "shortboard",
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
  },
  {
    id: "fish",
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
  },
  {
    id: "midlength",
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
  },
  {
    id: "longboard",
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
  },
];

/** One preset's pinned outline — for a test that uses a preset as the worked example of a geometric
 * situation (the pinned Mid-length's name block colliding with a page numeral, say), which the live
 * preset may no longer reproduce once a shaper recaptures it. */
export function pinnedOutline(id: (typeof PINNED_PRESET_OUTLINES)[number]["id"]): OutlineSpec {
  return PINNED_PRESET_OUTLINES.find((entry) => entry.id === id)!.outline;
}
