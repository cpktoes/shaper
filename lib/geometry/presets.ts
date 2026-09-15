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
 * Re-expressed on the new curve (quick task 260829-rda, 2026-08-29): `rocker.ts`'s five-station
 * model was replaced with a three-knot, two-Bezier curve, so every preset's `rocker` block below
 * was rebuilt on the new eight-field `RockerSpec`. Each preset's own nose-tip and tail-tip lift
 * are held EXACTLY as they were (the numbers that distinguish the four boards and a shaper reads
 * directly); the six shape controls were solved — not hand-guessed — so each preset's derived 12"
 * figures land within a hundredth of an inch of its old stored 12" numbers (recorded in a comment
 * beside each block). Still awaiting the founder's review in the live ROCKER editor, same as
 * before this task.
 *
 * Shortboard rocker/foil captured (2026-09-14): the `shortboard` block's `rocker` and `foil` now
 * carry the founder's own values, captured in the live ROCKER editor via the development-only
 * "Copy preset values" affordance and pasted in wholesale — the first of the four to come back
 * through the capture loop the two paragraphs above describe. `fish`, `midlength` and
 * `longboard` still carry Claude-drafted rocker/foil awaiting the same review. Two consequences:
 * the Shortboard's nose lift (5.5") now ties the Longboard's drafted 5.5", so the "Longboard with
 * the most nose lift" note above no longer holds (presets.test.ts's test of it was retired for
 * the same reason), and the Shortboard's derived 12" figures were re-recorded beside its block.
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
 * Shortboard rails/fins captured (2026-09-14): the `shortboard` block's `rails` and `fins` now
 * carry the founder's own values from exactly those two capture affordances, so the "all four
 * presets" in the paragraph above now means the other three — `fish`, `midlength` and
 * `longboard` still carry the two defaults verbatim.
 *
 * Fish captured (2026-09-14): the `fish` block is now shaper-captured in full — outline, rocker,
 * foil, rails and fins, all five from their screens' capture affordances — so the D-03 note above
 * (fish outline "approved without change") and the two "other three" lists in the paragraphs
 * above now leave only `midlength` and `longboard` on drafted rocker/foil and default rails/fins.
 *
 * Mid-length captured (2026-09-14): the `midlength` block is now shaper-captured in full as well —
 * its D-03 outline re-tuned in the live editor (86" now, was 84") and its rocker, foil, rails and
 * fins from their screens' capture affordances — leaving only `longboard` on drafted rocker/foil
 * and default rails/fins (its D-03 outline stands).
 *
 * Longboard captured (2026-09-14): the `longboard` block is now shaper-captured in full too — its
 * D-03 outline re-tuned in the live editor and its rocker, foil, rails and fins from their screens'
 * capture affordances. With this, every block of every preset is the founder's own: the
 * "Claude-drafted" and "seeded-but-untuned" states the D-12 and rails/fins paragraphs above
 * describe are history, kept for the record, and `DEFAULT_RAIL_BAND_SPEC` /
 * `DEFAULT_FIN_PLACEMENT_SPEC` are no longer imported here — they remain the design store's own
 * starting values for a board that begins without a preset, but no preset carries them.
 *
 * Any future change to any preset field should go through the matching
 * capture loop rather than being hand-edited. Every length/width/offset is
 * authored via `inchesToMm()` and every angle via `degrees()` — never a bare
 * number, never the raw millimetre brand constructor — because this file is
 * the one place preset data crosses the units boundary
 * (lib/geometry/units.ts).
 */

import type { OutlineSpec } from "./board";
import type { FinPlacementSpec } from "./fins";
import type { FoilSpec } from "./foil";
import type { RailBandSpec } from "./rail-bands";
import type { RockerSpec } from "./rocker";
import { degrees, inchesToMm } from "./units";

// Each preset's rocker block keeps its own noseLift/tailLift exactly as before this task, and
// carries six shape controls solved (not hand-guessed) so the derived 12" figures land within a
// hundredth of an inch of the preset's own prior stored 12" numbers — see each block's own
// comment for the figures it was solved against. Since 2026-09-14 every block is shaper-captured
// rather than solved — see each block's own comment; the sentence above describes the 260829-rda
// state, kept for the record.

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
    // Shaper-captured 2026-09-14: the founder's own rocker and foil for this board, read back out
    // of the live ROCKER editor by its development-only "Copy preset values" affordance and pasted
    // in wholesale — the same loop that tuned the midlength/longboard outlines. At the time that
    // affordance printed inches rounded to three decimals (2.063, 0.438, 1.563, 0.938), so those
    // four were written here by hand as the exact sixteenths the sliders hold (2.0625, 0.4375,
    // 1.5625, 0.9375); later that day it learned to print the exact sixteenth itself
    // (`lib/geometry/preset-source.ts`), so a recapture pastes in as-is. Derived
    // nose12 ≈ 1.80", tail12 ≈ 0.94" — the figures presets.test.ts checks this block against.
    rocker: {
      noseLift: inchesToMm(5.5),
      tailLift: inchesToMm(2.0625),
      noseAngle: degrees(30),
      tailAngle: degrees(26),
      noseSmoothness: 49,
      tailSmoothness: 100,
      noseFlatness: 50,
      tailFlatness: 44.5,
    },
    foil: {
      noseTip: inchesToMm(0.4375),
      nose12: inchesToMm(1.375),
      center: inchesToMm(2.25),
      tail12: inchesToMm(1.5625),
      tailTip: inchesToMm(0.9375),
    },
    // Shaper-captured 2026-09-14 from the Rails and Fins screens' development-only "Copy preset
    // values" buttons, pasted in wholesale: centre and tail rails on family 4 (nose stays 3), the
    // front fins on the basic model, everything else the prototype's own defaults. Both buttons
    // read back the RAW stored spec, so the rail thicknesses (1.31/2.5/1.56) and the fins' 72"
    // board / 13" tail here are the fallbacks a shaper only sees after switching off the Rails
    // screen's foil-thickness link or the Fins screen's template link (both on by default, and
    // `applyPreset` resets them on) — while linked, thickness comes from this foil and board
    // length / tail width from this outline.
    rails: {
      nose: {
        boardThickness: inchesToMm(1.31),
        deckPercent: 100,
        family: 3,
        ratioTopPercent: 60,
        symmetrical: false,
        cornerCutOffsetOverride: null,
        removeCornerCut: false,
        singleTuck: false,
        bottomTuck3Override: null,
      },
      center: {
        boardThickness: inchesToMm(2.5),
        deckPercent: 100,
        family: 4,
        ratioTopPercent: 60,
        symmetrical: false,
        cornerCutOffsetOverride: null,
        removeCornerCut: false,
        singleTuck: false,
        bottomTuck3Override: null,
      },
      tail: {
        boardThickness: inchesToMm(1.56),
        deckPercent: 100,
        family: 4,
        ratioTopPercent: 60,
        symmetrical: false,
        cornerCutOffsetOverride: null,
        removeCornerCut: false,
        singleTuck: false,
        bottomTuck3Override: null,
      },
      tailHardEdge: true,
    },
    fins: {
      boardLength: inchesToMm(72),
      tailWidth12: inchesToMm(13),
      tailShape: "squash",
      finSetup: "thruster",
      frontModel: "basic",
      quadRearModel: "mckeeSB",
      twinTemplate: "upright",
      quadCenterFinOn: false,
      advanced: {
        baseLenForward: inchesToMm(4.5),
        baseLenForwardOverridden: false,
        baseLenRear: inchesToMm(4.5),
        baseLenRearOverridden: false,
        baseLenCenter: inchesToMm(4.5),
        baseLenCenterOverridden: false,
        centerPositionOffset: inchesToMm(0),
        forwardPositionOffset: inchesToMm(0),
        forwardToeOverride: null,
        rearPositionOffset: inchesToMm(0),
        rearToeOverride: null,
        quadRearOffRailOverride: null,
        quadRearOffTailOverride: null,
        quadRearOffTailOverridden: false,
      },
    },
  },
  {
    id: "fish",
    name: "Fish",
    descriptor: "Wide and flat, for small-to-mid days",
    // Shaper-captured 2026-09-14: every block below — outline, rocker, foil, rails and fins — is
    // the founder's own, read back out of the five design screens' development-only "Copy preset
    // values" buttons and pasted in wholesale (the outline replaces the Claude-drafted curve D-03
    // had approved unchanged). Copy-button roundings written back as the exact sixteenths the
    // sliders hold: tail lift 1.938 → 1.9375, nose tip 0.688 → 0.6875, nose 12" 1.688 → 1.6875.
    outline: {
      length: inchesToMm(68),
      widePointWidth: inchesToMm(20.25),
      widePointOffset: inchesToMm(2),
      tailRailLength: 40,
      noseRailLength: 59.25,
      noseAngle: degrees(70),
      noseFullness: 48,
      tailAngle: degrees(30),
      tailFullness: 15,
      tail: { kind: "swallow", endWidth: inchesToMm(10), crotchDepth: inchesToMm(2.75) },
    },
    // Derived nose12 ≈ 1.40", tail12 ≈ 0.66" — the figures presets.test.ts checks this block against.
    rocker: {
      noseLift: inchesToMm(4.625),
      tailLift: inchesToMm(1.9375),
      noseAngle: degrees(30),
      tailAngle: degrees(9),
      noseSmoothness: 54.5,
      tailSmoothness: 34,
      noseFlatness: 51,
      tailFlatness: 16,
    },
    foil: {
      noseTip: inchesToMm(0.6875),
      nose12: inchesToMm(1.6875),
      center: inchesToMm(2.5),
      tail12: inchesToMm(1.75),
      tailTip: inchesToMm(0.75),
    },
    // Rails: nose ratio 55/45, centre and tail rails on family 2 (the boxy side), nose stays 3; fins:
    // a twin (upright template) with the front base length overridden to 5 1/2". As on the Shortboard,
    // the thicknesses (1.31/2.5/1.56), the fins' 72" board / 13" tail and the "squash" tail shape are
    // the raw fallbacks the Copy buttons read back — the screens' foil and template links (on by
    // default, reset on by `applyPreset`) read this board's own foil and swallow-tail outline instead.
    rails: {
      nose: {
        boardThickness: inchesToMm(1.31),
        deckPercent: 100,
        family: 3,
        ratioTopPercent: 55,
        symmetrical: false,
        cornerCutOffsetOverride: null,
        removeCornerCut: false,
        singleTuck: false,
        bottomTuck3Override: null,
      },
      center: {
        boardThickness: inchesToMm(2.5),
        deckPercent: 100,
        family: 2,
        ratioTopPercent: 60,
        symmetrical: false,
        cornerCutOffsetOverride: null,
        removeCornerCut: false,
        singleTuck: false,
        bottomTuck3Override: null,
      },
      tail: {
        boardThickness: inchesToMm(1.56),
        deckPercent: 100,
        family: 2,
        ratioTopPercent: 60,
        symmetrical: false,
        cornerCutOffsetOverride: null,
        removeCornerCut: false,
        singleTuck: false,
        bottomTuck3Override: null,
      },
      tailHardEdge: true,
    },
    fins: {
      boardLength: inchesToMm(72),
      tailWidth12: inchesToMm(13),
      tailShape: "squash",
      finSetup: "twin",
      frontModel: "mckeeSB",
      quadRearModel: "mckeeSB",
      twinTemplate: "upright",
      quadCenterFinOn: false,
      advanced: {
        baseLenForward: inchesToMm(5.5),
        baseLenForwardOverridden: true,
        baseLenRear: inchesToMm(4.5),
        baseLenRearOverridden: false,
        baseLenCenter: inchesToMm(4.5),
        baseLenCenterOverridden: false,
        centerPositionOffset: inchesToMm(0),
        forwardPositionOffset: inchesToMm(0),
        forwardToeOverride: null,
        rearPositionOffset: inchesToMm(0),
        rearToeOverride: null,
        quadRearOffRailOverride: null,
        quadRearOffTailOverride: null,
        quadRearOffTailOverridden: false,
      },
    },
  },
  {
    id: "midlength",
    name: "Mid-length",
    descriptor: "Easy paddling with room to maneuver",
    // Shaper-captured 2026-09-14: every block below — outline, rocker, foil, rails and fins — is
    // the founder's own, read back out of the five design screens' development-only "Copy preset
    // values" buttons and pasted in wholesale (the D-03 outline re-tuned in the same live editor:
    // 86" now, was 84"). The one Copy-button rounding is written back as the exact sixteenth the
    // slider holds: tail lift 2.313 → 2.3125. The three `deckPercent` floats are verbatim — the
    // Deck Profile slider steps on a grid derived from each section's thickness, so its values
    // are exact JS numbers that only look like rounding noise.
    outline: {
      length: inchesToMm(86),
      widePointWidth: inchesToMm(21.25),
      widePointOffset: inchesToMm(2.5),
      tailRailLength: 72.75,
      noseRailLength: 60,
      noseAngle: degrees(65),
      noseFullness: 76,
      tailAngle: degrees(90),
      tailFullness: 46.75,
      tail: { kind: "round" },
    },
    // Derived nose12 ≈ 2.05", tail12 ≈ 1.23" — the figures presets.test.ts checks this block against.
    rocker: {
      noseLift: inchesToMm(5.375),
      tailLift: inchesToMm(2.3125),
      noseAngle: degrees(28),
      tailAngle: degrees(30),
      noseSmoothness: 27,
      tailSmoothness: 80,
      noseFlatness: 10,
      tailFlatness: 0,
    },
    foil: {
      noseTip: inchesToMm(0.625),
      nose12: inchesToMm(1.625),
      center: inchesToMm(2.75),
      tail12: inchesToMm(1.75),
      tailTip: inchesToMm(0.75),
    },
    // Rails: nose and centre on family 2 (nose ratio 50/50), tail on 3, deck profile eased off 100
    // on all three; fins: a quad on the basic off-rail rear model with the centre fin on and all
    // three base lengths overridden (4 1/2" front, 4" rear, 4 1/2" centre). As on the Shortboard,
    // the thicknesses (1.31/2.5/1.56), the fins' 72" board / 13" tail and the "squash" tail shape
    // are the raw fallbacks the Copy buttons read back — the screens' foil and template links (on
    // by default, reset on by `applyPreset`) read this board's own foil and round-tail outline.
    rails: {
      nose: {
        boardThickness: inchesToMm(1.31),
        deckPercent: 96.22222222222223,
        family: 2,
        ratioTopPercent: 50,
        symmetrical: false,
        cornerCutOffsetOverride: null,
        removeCornerCut: false,
        singleTuck: false,
        bottomTuck3Override: null,
      },
      center: {
        boardThickness: inchesToMm(2.5),
        deckPercent: 90.93333333333334,
        family: 2,
        ratioTopPercent: 60,
        symmetrical: false,
        cornerCutOffsetOverride: null,
        removeCornerCut: false,
        singleTuck: false,
        bottomTuck3Override: null,
      },
      tail: {
        boardThickness: inchesToMm(1.56),
        deckPercent: 93.2,
        family: 3,
        ratioTopPercent: 60,
        symmetrical: false,
        cornerCutOffsetOverride: null,
        removeCornerCut: false,
        singleTuck: false,
        bottomTuck3Override: null,
      },
      tailHardEdge: true,
    },
    fins: {
      boardLength: inchesToMm(72),
      tailWidth12: inchesToMm(13),
      tailShape: "squash",
      finSetup: "quad",
      frontModel: "mckeeSB",
      quadRearModel: "basicOffRail",
      twinTemplate: "upright",
      quadCenterFinOn: true,
      advanced: {
        baseLenForward: inchesToMm(4.5),
        baseLenForwardOverridden: true,
        baseLenRear: inchesToMm(4),
        baseLenRearOverridden: true,
        baseLenCenter: inchesToMm(4.5),
        baseLenCenterOverridden: true,
        centerPositionOffset: inchesToMm(0),
        forwardPositionOffset: inchesToMm(0),
        forwardToeOverride: null,
        rearPositionOffset: inchesToMm(0),
        rearToeOverride: null,
        quadRearOffRailOverride: null,
        quadRearOffTailOverride: null,
        quadRearOffTailOverridden: false,
      },
    },
  },
  {
    id: "longboard",
    name: "Longboard",
    descriptor: "Smooth glide, nose-to-tail control",
    // Shaper-captured 2026-09-14: every block below — outline, rocker, foil, rails and fins — is
    // the founder's own, read back out of the five design screens' development-only "Copy preset
    // values" buttons and pasted in wholesale (the D-03 outline re-tuned in the same live editor).
    // The one Copy-button rounding is written back as the exact sixteenth the slider holds: nose
    // lift 4.313 → 4.3125.
    outline: {
      length: inchesToMm(108),
      widePointWidth: inchesToMm(22.5),
      widePointOffset: inchesToMm(3.5),
      tailRailLength: 40,
      noseRailLength: 87,
      noseAngle: degrees(90),
      noseFullness: 90,
      tailAngle: degrees(30),
      tailFullness: 46.75,
      tail: { kind: "squash", endWidth: inchesToMm(8.5) },
    },
    // Derived nose12 ≈ 2.29", tail12 ≈ 1.80" — the figures presets.test.ts checks this block against.
    rocker: {
      noseLift: inchesToMm(4.3125),
      tailLift: inchesToMm(3.25),
      noseAngle: degrees(12),
      tailAngle: degrees(11),
      noseSmoothness: 23,
      tailSmoothness: 65,
      noseFlatness: 0,
      tailFlatness: 28,
    },
    foil: {
      noseTip: inchesToMm(0.875),
      nose12: inchesToMm(1.625),
      center: inchesToMm(3),
      tail12: inchesToMm(1.75),
      tailTip: inchesToMm(0.875),
    },
    // Rails: symmetrical 50/50 rails on family 3 at the nose and centre, a symmetrical 45/55 tail
    // on family 4, and no hard edge — a log's soft rails; fins: a single fin, its base length left
    // to the calculator. As on the other three, the thicknesses (1.31/2.5/1.56) and the fins' 72"
    // board / 13" tail are the raw fallbacks the Copy buttons read back — the screens' foil and
    // template links (on by default, reset on by `applyPreset`) read this board's own foil and
    // outline instead.
    rails: {
      nose: {
        boardThickness: inchesToMm(1.31),
        deckPercent: 100,
        family: 3,
        ratioTopPercent: 50,
        symmetrical: true,
        cornerCutOffsetOverride: null,
        removeCornerCut: false,
        singleTuck: false,
        bottomTuck3Override: null,
      },
      center: {
        boardThickness: inchesToMm(2.5),
        deckPercent: 100,
        family: 3,
        ratioTopPercent: 50,
        symmetrical: true,
        cornerCutOffsetOverride: null,
        removeCornerCut: false,
        singleTuck: false,
        bottomTuck3Override: null,
      },
      tail: {
        boardThickness: inchesToMm(1.56),
        deckPercent: 100,
        family: 4,
        ratioTopPercent: 45,
        symmetrical: true,
        cornerCutOffsetOverride: null,
        removeCornerCut: false,
        singleTuck: false,
        bottomTuck3Override: null,
      },
      tailHardEdge: false,
    },
    fins: {
      boardLength: inchesToMm(72),
      tailWidth12: inchesToMm(13),
      tailShape: "squash",
      finSetup: "single",
      frontModel: "mckeeSB",
      quadRearModel: "mckeeSB",
      twinTemplate: "upright",
      quadCenterFinOn: false,
      advanced: {
        baseLenForward: inchesToMm(4.5),
        baseLenForwardOverridden: false,
        baseLenRear: inchesToMm(4.5),
        baseLenRearOverridden: false,
        baseLenCenter: inchesToMm(10.5),
        baseLenCenterOverridden: false,
        centerPositionOffset: inchesToMm(0),
        forwardPositionOffset: inchesToMm(0),
        forwardToeOverride: null,
        rearPositionOffset: inchesToMm(0),
        rearToeOverride: null,
        quadRearOffRailOverride: null,
        quadRearOffTailOverride: null,
        quadRearOffTailOverridden: false,
      },
    },
  },
];
