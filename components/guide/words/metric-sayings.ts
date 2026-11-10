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
  /** Which of the card's lines the phrase is in; `intro` for a page's intro. */
  field: "is" | "does" | "info" | "how" | "intro";
  imperial: string;
  metric: string;
};

export const GUIDE_METRIC_SAYINGS: Readonly<Record<string, readonly GuideMetricSaying[]>> = {
  // TEMPLATE
  [guideCardId("template", "Board Length", "Board Length")]: [
    // The 12" station said by its own label, `stationLabel("metric")`.
    { field: "does", imperial: 'The 12" stations', metric: "The 30.5 cm stations" },
  ],
  [guideCardId("template", "Nose Controls", "Nose Angle")]: [
    { field: "how", imperial: "the last foot", metric: "the last 30 cm" },
  ],
  [guideCardId("template", "Tail Controls", "Tail Angle")]: [
    { field: "how", imperial: "the last foot", metric: "the last 30 cm" },
  ],
  [guideCardId("template", "Wings", "Vertical run")]: [
    // The run slider's own end hint in Metric: its 2" top as a mark.
    { field: "is", imperial: "two inches", metric: "51 mm" },
  ],
  // ROCKER
  [guideCardId("rocker", "Inputs", "Nose Tip · Tail Tip")]: [
    { field: "how", imperial: "every few inches", metric: "every 10 cm or so" },
  ],
  [guideCardId("rocker", "Blank", "Blank")]: [{ field: "how", imperial: "by an eighth", metric: "by 3 mm" }],
  [guideCardId("rocker", "Blank", "Customize Rocker")]: [
    // Where a bend starts is a dim (CLAUDE.md Rule 2): the push's 18" said in centimetres.
    { field: "does", imperial: "18 inches in", metric: "45.7 cm in" },
  ],
  [guideCardId("rocker", "Rocker", "Nose Rocker")]: [
    { field: "is", imperial: "the 12-inch station", metric: "the 30.5 cm station" },
    { field: "how", imperial: "the 12-inch station", metric: "the 30.5 cm station" },
  ],
  [guideCardId("rocker", "Rocker", "Tail Rocker")]: [
    { field: "is", imperial: "the 12-inch station", metric: "the 30.5 cm station" },
    { field: "how", imperial: "the last 12 inches", metric: "the last 30.5 cm" },
  ],
  [guideCardId("rocker", "Foil", "Pin tips to · Bottom")]: [
    { field: "does", imperial: "to the inch", metric: "to the millimetre" },
  ],
  [guideCardId("rocker", "Foil", "Nose Thinning Starts")]: [
    // The automatic start is the 12" station, read by its own label.
    { field: "is", imperial: "12 inches from the tip", metric: "30.5 cm from the tip" },
    { field: "does", imperial: "within a foot of the nose", metric: "within 30 cm of the nose" },
  ],
  [guideCardId("rocker", "Foil", "Tail Thinning Starts")]: [
    { field: "is", imperial: "12 inches from the tip", metric: "30.5 cm from the tip" },
  ],
  [guideCardId("rocker", "Foil", 'Nose @ 12" · Tail @ 12"')]: [
    { field: "is", imperial: "the two 12-inch stations", metric: "the two 30.5 cm stations" },
    // The fine-tune slider's own Metric limit.
    { field: "is", imperial: "a quarter inch", metric: "6 mm" },
    { field: "does", imperial: "the tail 12", metric: "the tail 30.5 cm" },
    { field: "does", imperial: "the nose 12", metric: "the nose 30.5 cm" },
    { field: "how", imperial: "the 12-inch thicknesses", metric: "the 30.5 cm thicknesses" },
    { field: "how", imperial: "a couple of feet", metric: "a good 60 cm" },
  ],
  [guideCardId("rocker", "Foil", "Fine tune from")]: [
    { field: "is", imperial: "a 12-inch fine-tune", metric: "a 30.5 cm fine-tune" },
    { field: "does", imperial: "a lower 12-inch station", metric: "a lower 30.5 cm station" },
  ],
  // RAILS
  [guideCardId("rails", "Inputs", "Import Rocker & Foil Values")]: [
    { field: "is", imperial: 'the nose 12"', metric: "the nose 30.5 cm" },
    { field: "is", imperial: 'tail 12"', metric: "tail 30.5 cm" },
  ],
  [guideCardId("rails", "Inputs", 'Board Thickness · Thickness @12"')]: [
    { field: "how", imperial: 'the 12" stations', metric: "the 30.5 cm stations" },
  ],
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
  // FINS
  // The guide's own tail window in Metric, a round 60 cm (`guideFrame("metric")`).
  "fins.intro": [{ field: "intro", imperial: 'the last 24"', metric: "the last 60 cm" }],
  [guideCardId("fins", "Inputs", "Import Designed Board")]: [
    { field: "is", imperial: 'its tail width at 12"', metric: "its tail width at 30.5 cm" },
  ],
  [guideCardId("fins", "Convention", "Trailing-edge convention")]: [
    // `finRoundingGrain("metric")`.
    { field: "does", imperial: 'the nearest 1/16"', metric: "the nearest millimetre" },
  ],
  // Every fin figure below is a mark, whole millimetres, from the model's own numbers in `fins.ts`.
  [guideCardId("fins", "Single Fin", "Single Fin")]: [
    { field: "info", imperial: '(4 1/2" to 6")', metric: "(114 mm to 152 mm)" },
  ],
  [guideCardId("fins", "Twin", "Twin")]: [
    { field: "info", imperial: 'Modern = 7" to 8"', metric: "Modern = 178 mm to 203 mm" },
    { field: "info", imperial: 'Keel = 6" to 6 1/2"', metric: "Keel = 152 mm to 165 mm" },
    { field: "info", imperial: 'at ~10"', metric: "at ~254 mm" },
  ],
  [guideCardId("fins", "Twin", "Modern/Upright")]: [{ field: "info", imperial: '≤ 5 1/2"', metric: "≤ 140 mm" }],
  [guideCardId("fins", "Twin", "Keel")]: [{ field: "info", imperial: '> 5 1/2"', metric: "> 140 mm" }],
  [guideCardId("fins", "Twin", "Upright + Trailer")]: [
    { field: "how", imperial: "four inches off the tail", metric: "102 mm off the tail" },
  ],
  [guideCardId("fins", "Thruster", "Basic (Half Rate)")]: [{ field: "how", imperial: "a quarter inch", metric: "6 mm" }],
  [guideCardId("fins", "2+1", "2+1")]: [
    // The 9' anchor is a length: centimetres to one decimal.
    { field: "info", imperial: "a length anchor of 9'", metric: "a length anchor of 274.3 cm" },
    { field: "info", imperial: '(15" to 16 1/2")', metric: "(381 mm to 419 mm)" },
  ],
  [guideCardId("fins", "Quad", "Basic - Off-Rail")]: [
    { field: "is", imperial: "a quarter inch", metric: "6 mm" },
    { field: "info", imperial: '+1/4"', metric: "+6 mm" },
  ],
  [guideCardId("fins", "Quad", "McKee Longboard")]: [
    // `MIN_MCKEE_LONGBOARD_QUAD_LENGTH`, a length.
    { field: "is", imperial: "eight feet or longer", metric: "243.8 cm or longer" },
    { field: "info", imperial: `8'0"`, metric: "243.8 cm" },
    { field: "how", imperial: "eight feet or longer", metric: "243.8 cm or longer" },
  ],
  [guideCardId("fins", "Advanced", "Aft/Forward position")]: [
    // The Aft/Forward slider's own Metric limit.
    { field: "is", imperial: "an inch and a half", metric: "38 mm" },
  ],
};

/**
 * The one no-inch rule every Metric check in the phase uses (plan 18-07; 18-08 and the page specs import
 * it). It finds an Imperial figure: a number or fraction followed by an inch mark (`"`, two primes, `″`),
 * a foot mark (`'`), `in` or `ft`; the bare 12" station said as `the tail 12`; and the words *inch(es)*,
 * *foot*, *feet*, *eighth(s)* and *sixteenth(s)* as a length. It leaves a surfer's feet alone (*under
 * foot*, *back foot*), and RAILS' mark names (*Deck Mark 1 in from the rail*, *Bottom Tuck 1 in*), whose
 * `in` is a preposition, not an inch.
 */
export const GUIDE_IMPERIAL_FIGURE =
  /(?<![\w.])(?<!(?:Mark|Tuck) )(?:\d+(?:\.\d+)?(?:\s+\d+\/\d+)?|\d+\/\d+)\s*(?:"|''|″|'|(?:in|ft)\b)|\b(?:inch(?:es)?|feet|eighths?|sixteenths?)\b|(?<!\b(?:under|back) )\bfoot\b|\b(?:nose|tail) 12\b(?![.\d])/;

/**
 * The only two kinds of string a Metric shaper may read an inch figure in (CLAUDE.md Rule 2): the blank's
 * own name as its maker prints it (`US Blanks 6'3"RP`) and `formatRockerNote`'s maker's order code
 * (`+1/2"N18"`). Neither ever appears in a card's sentences; they are for 18-08's tag and caption sweep,
 * through `guideImperialFigures`.
 */
export const GUIDE_METRIC_EXEMPT = ["blank name", "rocker order code"] as const;

/** Every Imperial figure the no-inch rule finds in a line, once the exempt strings named (this board's
 * blank name, its rocker order code) are taken out of it. An empty list is a clean Metric line. */
export function guideImperialFigures(text: string, exempt: readonly string[] = []): string[] {
  let rest = text;
  for (const allowed of exempt) if (allowed !== "") rest = rest.split(allowed).join(" ");
  return [...rest.matchAll(new RegExp(GUIDE_IMPERIAL_FIGURE.source, "g"))].map((m) => m[0]);
}
