/**
 * How a Metric shaper reads the few Imperial phrases in the GUIDE's words (Phase 18, D-22): each card's
 * Imperial phrase beside its Metric phrase, two pieces of copy and nothing converted. A number of the app
 * (a 12" station, the 8'0" minimum) is said as the app formats it (`30.5 cm`); a rule of thumb (*an inch
 * of length*) is said the Metric way (*a centimetre of length*). The words page stays written the Imperial
 * way and gains its own Metric sayings section (plan 18-07), which these are held to.
 *
 * Keyed by card id, or `${page}.intro` for a page's intro. First drafts for the founder's pen.
 */
import { guideCardId } from "@/lib/geometry/guide-card";

export type GuideMetricSaying = {
  /** Which of the card's lines the phrase is in. */
  field: "is" | "does" | "info" | "how";
  imperial: string;
  metric: string;
};

export const GUIDE_METRIC_SAYINGS: Readonly<Record<string, readonly GuideMetricSaying[]>> = {
  // VOLUME
  [guideCardId("volume", "Inputs", "Board Length")]: [
    {
      field: "does",
      imperial: "an inch of length is worth less than an inch of width",
      metric: "a centimetre of length is worth less than a centimetre of width",
    },
  ],
  [guideCardId("volume", "Inputs", "Center Thickness")]: [
    {
      field: "does",
      imperial: "a quarter inch at the centre is about three litres on a shortboard",
      // computeVolume on the Shortboard's quick estimate at its own thickness and half a centimetre more:
      // 2.57 L, said as a round figure (the test works it out again).
      metric: "half a centimetre at the centre is about three litres on a shortboard",
    },
  ],
  [guideCardId("volume", "What the ESTIMATE card reads", "Length-Weighted Effective Thickness")]: [
    // The 12" station said by its own label, `stationLabel("metric")`.
    { field: "how", imperial: 'tail 12"', metric: "tail at 30.5 cm" },
  ],
};
