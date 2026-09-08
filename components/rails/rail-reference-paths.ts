/**
 * The prototype's own hand-traced "Turning Marks Into Rail Bands" reference paths (RAIL-05, D-01)
 * — real vector line art traced out of the source PPT (Freeform shapes, colours and dash styles
 * resolved from their theme/line fills), moved across character-for-character from
 * `reference/project/Rails.dc.html`'s `planRefPaths()`/`sideRefPaths()` and the colour/width/dash
 * maps its `planRefSvgPaths`/`sideRefSvgPaths` build inline. Plan-view marks overlay the PPT's own
 * background artwork (`public/rail-bands-plan-bg.png`, a byte-identical copy of
 * `reference/project/assets/rail-bands-plan-bg.png`); side-view marks are pure vector.
 *
 * Grouping by mark is what lets the INSTRUCTIONS tab's nine legend tick-boxes truly show/hide each
 * one — no pixel-colour guessing. `black` is the side view's own board outline: the prototype's
 * `show` map hardcodes it `true` (Rails.dc.html line 1386), so it is never gated by a legend box
 * and is excluded from the nine gateable groups.
 *
 * Pure data — no React, no browser API, no import from `lib/geometry/` (this is diagram-layout
 * data, not shaping geometry, CLAUDE.md Rule 1). Pinned against the prototype's own source by
 * `rail-reference-paths.test.ts` so a re-export or a hand-edit can never silently drift.
 */

export type RailReferenceGroup =
  | "deckMark1"
  | "deckBand1"
  | "deckMark3"
  | "deckBand2"
  | "deckMark3Full"
  | "black"
  | "railMark1"
  | "railBand1"
  | "railTuck1"
  | "tuckBlend";

export interface RailReferencePath {
  group: RailReferenceGroup;
  dash: string;
  d: string;
}

/** The nine legend-gateable groups (five plan + four side) — `black` (the side view's own board
 * outline) is deliberately excluded: the prototype always draws it, regardless of any tick-box. */
export const GATEABLE_RAIL_REFERENCE_GROUPS: RailReferenceGroup[] = [
  "deckMark1",
  "deckBand1",
  "deckMark3",
  "deckBand2",
  "deckMark3Full",
  "railMark1",
  "railBand1",
  "railTuck1",
  "tuckBlend",
];

// Verbatim from reference/project/Rails.dc.html's planRefPaths() (lines 671-673).
export const PLAN_REF_PATHS: RailReferencePath[] = [
  { group: "deckMark3Full", dash: "none", d: "M 1.3917 0.3908 C 1.7216 0.8017 2.0514 1.2126 2.2674 2.0287 C 2.4834 2.8448 2.6731 4.1983 2.6877 5.2874 C 2.7023 6.3764 2.5214 7.7529 2.3550 8.5632 C 2.1886 9.3736 1.9390 9.7615 1.6895 10.1494" },
  { group: "deckMark3Full", dash: "none", d: "M 2.1865 0.3908 C 1.8566 0.8017 1.5268 1.2126 1.3108 2.0287 C 1.0948 2.8448 0.9051 4.1983 0.8905 5.2874 C 0.8759 6.3764 1.0568 7.7529 1.2232 8.5632 C 1.3896 9.3736 1.6392 9.7615 1.8887 10.1494" },
  { group: "deckBand2", dash: "6 4", d: "M 1.8050 0.3908 C 2.0200 0.8017 2.2350 1.2126 2.3757 2.0287 C 2.5165 2.8448 2.6402 4.1983 2.6497 5.2874 C 2.6592 6.3764 2.5413 7.7529 2.4328 8.5632 C 2.3244 9.3736 2.1617 9.7615 1.9990 10.1494" },
  { group: "deckBand2", dash: "6 4", d: "M 1.7732 0.3908 C 1.5582 0.8017 1.3432 1.2126 1.2025 2.0287 C 1.0617 2.8448 0.9380 4.1983 0.9285 5.2874 C 0.9190 6.3764 1.0369 7.7529 1.1454 8.5632 C 1.2538 9.3736 1.4165 9.7615 1.5792 10.1494" },
  { group: "deckMark3", dash: "none", d: "M 2.4561 8.4119 L 2.4163 8.6459" },
  { group: "deckMark3", dash: "none", d: "M 1.1221 8.4119 L 1.1619 8.6459" },
  { group: "deckMark3", dash: "none", d: "M 2.4021 2.1121 L 2.3501 1.8805" },
  { group: "deckMark3", dash: "none", d: "M 1.1761 2.1121 L 1.2281 1.8805" },
  { group: "deckMark3", dash: "none", d: "M 2.5897 3.7280 C 2.6272 4.2681 2.6646 4.8083 2.6646 5.3603 C 2.6646 5.9123 2.6272 6.4761 2.5897 7.0400" },
  { group: "deckMark3", dash: "none", d: "M 0.9885 3.7280 C 0.9510 4.2681 0.9136 4.8083 0.9136 5.3603 C 0.9136 5.9123 0.9510 6.4761 0.9885 7.0400" },
  { group: "deckBand1", dash: "6 4", d: "M 1.8050 0.3793 C 2.0681 0.7902 2.3312 1.2012 2.5035 2.0172 C 2.6758 2.8333 2.8272 4.1868 2.8388 5.2759 C 2.8504 6.3649 2.7061 7.7414 2.5734 8.5517 C 2.4406 9.3621 2.2416 9.7500 2.0425 10.1379" },
  { group: "deckBand1", dash: "6 4", d: "M 1.7732 0.3793 C 1.5101 0.7902 1.2470 1.2012 1.0747 2.0172 C 0.9024 2.8333 0.7510 4.1868 0.7394 5.2759 C 0.7278 6.3649 0.8721 7.7414 1.0048 8.5517 C 1.1376 9.3621 1.3366 9.7500 1.5357 10.1379" },
  { group: "deckMark1", dash: "none", d: "M 2.6068 8.4119 L 2.5671 8.6459" },
  { group: "deckMark1", dash: "none", d: "M 0.9714 8.4119 L 1.0111 8.6459" },
  { group: "deckMark1", dash: "none", d: "M 2.5295 2.1121 L 2.4775 1.8805" },
  { group: "deckMark1", dash: "none", d: "M 1.0487 2.1121 L 1.1007 1.8805" },
  { group: "deckMark1", dash: "none", d: "M 2.7600 3.7280 C 2.8084 4.2681 2.8567 4.8083 2.8567 5.3603 C 2.8567 5.9123 2.8084 6.4761 2.7600 7.0400" },
  { group: "deckMark1", dash: "none", d: "M 0.8182 3.7280 C 0.7698 4.2681 0.7215 4.8083 0.7215 5.3603 C 0.7215 5.9123 0.7698 6.4761 0.8182 7.0400" },
];

// Verbatim from reference/project/Rails.dc.html's sideRefPaths() (line 675).
export const SIDE_REF_PATHS: RailReferencePath[] = [
  { group: "black", dash: "none", d: "M 4.1920 0.3750 C 4.4190 0.7800 4.6459 1.1850 4.7788 2.0000 C 4.9117 2.8150 4.9594 4.1792 4.9895 5.2650 C 5.0196 6.3509 5.0020 7.7051 4.9594 8.5150 C 4.9168 9.3250 4.8252 9.7250 4.7337 10.1250" },
  { group: "black", dash: "none", d: "M 4.1060 0.3844 C 4.2292 0.8131 4.3524 1.2418 4.4394 2.0655 C 4.5263 2.8892 4.5939 4.2467 4.6278 5.3264 C 4.6616 6.4061 4.6422 7.7418 4.6422 8.5438 C 4.6422 9.3457 4.6350 9.7418 4.6278 10.1380" },
  { group: "black", dash: "none", d: "M 4.0937 0.3947 L 4.2037 0.3681" },
  { group: "black", dash: "none", d: "M 4.6202 10.1266 L 4.7406 10.1218" },
  { group: "railTuck1", dash: "none", d: "M 4.1292 0.3810 C 4.3515 0.8353 4.5737 1.2897 4.7007 2.0000 C 4.8276 2.7103 4.8534 3.8075 4.8911 4.6429 C 4.9288 5.4782 4.9278 6.2450 4.9268 7.0119" },
  { group: "tuckBlend", dash: "2 3", d: "M 4.9217 5.4048 L 4.9581 7.9854" },
  { group: "railBand1", dash: "2 3", d: "M 4.1204 0.4017 C 4.2770 0.8318 4.4336 1.2620 4.5351 2.0849 C 4.6365 2.9078 4.7030 4.2623 4.7293 5.3391 C 4.7555 6.4160 4.7065 7.7468 4.6926 8.5460 C 4.6786 9.3452 4.6621 9.7399 4.6456 10.1345" },
  { group: "railMark1", dash: "none", d: "M 4.5064 1.8868 L 4.5350 2.1059" },
  { group: "railMark1", dash: "none", d: "M 4.7086 8.4185 L 4.6987 8.6393" },
  { group: "railMark1", dash: "none", d: "M 4.6633 3.5054 C 4.6893 4.0905 4.7153 4.6756 4.7278 5.2581 C 4.7403 5.8405 4.7395 6.4203 4.7386 7.0000" },
];

/** The plan-view's own SVG `viewBox` (Rails.dc.html line 420) — calibrated pixel-for-pixel against
 * `rail-bands-plan-bg.png`'s crop; load-bearing (RESEARCH.md Pitfall 5). */
export const PLAN_REF_VIEWBOX = "0 0 3.7135 10.4996";

/** The side-view's own SVG `viewBox` (Rails.dc.html line 432). */
export const SIDE_REF_VIEWBOX = "3.98 0.32 1.09 9.87";

/** Every group's stroke colour — the union of `planRefSvgPaths`' and `sideRefSvgPaths`' inline
 * colour maps (Rails.dc.html lines 1376, 1383). */
export const REF_GROUP_COLORS: Record<RailReferenceGroup, string> = {
  deckMark1: "#ED7D31",
  deckBand1: "#ED7D31",
  deckMark3: "#4472C4",
  deckBand2: "#4472C4",
  deckMark3Full: "#70AD47",
  black: "#1c1b19",
  railMark1: "#C00000",
  railBand1: "#C00000",
  railTuck1: "#7030A0",
  tuckBlend: "#7030A0",
};

/** Stroke-width overrides for the groups the prototype widens (Rails.dc.html lines 1377, 1384) —
 * every other group falls back to `REF_GROUP_DEFAULT_WIDTH`. */
export const REF_GROUP_WIDTHS: Partial<Record<RailReferenceGroup, string>> = {
  deckMark1: "0.055",
  deckMark3: "0.055",
  railMark1: "0.055",
};

/** The stroke width every group not named in `REF_GROUP_WIDTHS` draws at (Rails.dc.html lines
 * 1377, 1384's own fallback, `widths[p.group] || '0.035'`). */
export const REF_GROUP_DEFAULT_WIDTH = "0.035";

/** The dash-token to user-units map both `planRefSvgPaths` and `sideRefSvgPaths` share (Rails.dc.html
 * lines 1378, 1385). */
export const REF_DASH_PX: Record<string, string> = {
  none: "none",
  "6 4": "0.14 0.09",
  "2 3": "0.035 0.07",
};
