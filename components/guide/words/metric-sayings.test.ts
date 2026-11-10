import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  computeFinPlacement,
  DEFAULT_FIN_PLACEMENT_SPEC,
  finRoundingGrain,
  MIN_MCKEE_LONGBOARD_QUAD_LENGTH,
  TWIN_FORWARD_BASE_IN,
  type FinPlacementSpec,
} from "@/lib/geometry/fins";
import { guideCardId, type GuidePage } from "@/lib/geometry/guide-card";
import { GUIDE_PUSH_TABLE, guideFrame } from "@/lib/geometry/guide-push";
import { formatDim, formatLength, formatMark, measureSlider, stationLabel } from "@/lib/geometry/measure-display";
import { MEASURE_STATION_MM } from "@/lib/geometry/outline";
import { inchesToMm, INCHES_PER_FOOT, mm, mmToCentimetres, type Mm } from "@/lib/geometry/units";
import { WING_RUN_RANGE_IN } from "@/lib/geometry/wings";
import { guideIntro, guideLines, type GuideWordsCard } from "../guide-copy";
import { readGuideWordsPage, type GuideWordsPageCard } from "./read-words-page";
import { GUIDE_IMPERIAL_FIGURE, GUIDE_METRIC_EXEMPT, GUIDE_METRIC_SAYINGS, guideImperialFigures } from "./metric-sayings";

/**
 * The Metric sayings are the founder's, pair for pair (Phase 18, D-22, R11): the module equals the words
 * page's `## Metric sayings` section, every Metric line on all 84 cards and the five intros reads without
 * an inch or a foot, and every number of the app in a saying is the app's own Metric figure, worked out
 * here from the constant it comes from — never typed.
 */

const page = readGuideWordsPage();
const FIELDS = ["is", "does", "info", "how"] as const;

const keyOf = (s: { page: GuidePage; group: string | null; name: string | null }): string =>
  s.group === null || s.name === null ? `${s.page}.intro` : guideCardId(s.page, s.group, s.name);

const asWords = (card: GuideWordsPageCard): GuideWordsCard => ({
  id: guideCardId(card.page, card.group, card.name),
  page: card.page,
  group: card.group,
  name: card.name,
  is: card.is,
  does: card.does,
  info: card.info,
  how: card.how,
});

const lineOf = (key: string, field: string): string => {
  if (key.endsWith(".intro")) return page.pages.find((p) => `${p.page}.intro` === key)!.intro;
  const card = page.cards.find((c) => guideCardId(c.page, c.group, c.name) === key);
  if (!card) throw new Error(`${key} is not a card on the words page`);
  const line = card[field as (typeof FIELDS)[number]];
  if (line === null) throw new Error(`${key} has no ${field} line`);
  return line;
};

const moduleSayings = Object.entries(GUIDE_METRIC_SAYINGS).flatMap(([key, list]) =>
  list.map((s) => ({ key, field: s.field, imperial: s.imperial, metric: s.metric })),
);

/** The Shortboard's blank, as the words page names it on the Blank card. */
const BLANK = page.cards.find((c) => c.page === "rocker" && c.name === "Blank")!.tag!;

describe("the Metric sayings in code equal the founder's page", () => {
  it("pair for pair, in the page's order, keyed by card id or the page's intro", () => {
    expect(page.metricSayings.length).toBeGreaterThan(0);
    expect(moduleSayings).toEqual(
      page.metricSayings.map((s) => ({ key: keyOf(s), field: s.field, imperial: s.imperial, metric: s.metric })),
    );
  });

  it("lists the five pages under their own headings, in the app's order", () => {
    const pages = [...new Set(page.metricSayings.map((s) => s.page))];
    expect(pages).toEqual(["template", "rocker", "rails", "volume", "fins"]);
    const section = page.raw.slice(page.raw.indexOf("## Metric sayings"));
    expect(page.raw.indexOf("## FINS")).toBeLessThan(page.raw.indexOf("## Metric sayings"));
    expect(page.raw.indexOf("## Metric sayings")).toBeLessThan(page.raw.indexOf("## The pushes the cartoons draw"));
    for (const heading of ["### TEMPLATE", "### ROCKER", "### RAILS", "### VOLUME", "### FINS"]) {
      expect(section, heading).toContain(heading);
    }
  });

  it("every line under the section is a saying the reader understood — none is skipped as a typo", () => {
    const section = page.raw.slice(page.raw.indexOf("## Metric sayings"), page.raw.indexOf("## The pushes the cartoons draw"));
    const listed = section.split("\n").filter((line) => line.startsWith("- "));
    expect(listed).toHaveLength(page.metricSayings.length);
  });

  it("no Metric phrase is empty, and none is its Imperial phrase again", () => {
    for (const s of moduleSayings) {
      expect(s.metric.trim(), s.key).not.toBe("");
      expect(s.metric, s.key).not.toBe(s.imperial);
    }
  });
});

describe("each saying meets its card's line exactly", () => {
  it("each Imperial phrase occurs exactly once in its card's line on the page", () => {
    for (const s of moduleSayings) {
      expect(lineOf(s.key, s.field).split(s.imperial), `${s.key} ${s.imperial}`).toHaveLength(2);
    }
  });

  it("the pairs of one line never overlap", () => {
    const byLine = new Map<string, { at: number; end: number }[]>();
    for (const s of moduleSayings) {
      const line = lineOf(s.key, s.field);
      const at = line.indexOf(s.imperial);
      const id = `${s.key} ${s.field}`;
      byLine.set(id, [...(byLine.get(id) ?? []), { at, end: at + s.imperial.length }]);
    }
    for (const [id, spans] of byLine) {
      const sorted = [...spans].sort((a, b) => a.at - b.at);
      for (let i = 1; i < sorted.length; i++) expect(sorted[i].at, id).toBeGreaterThanOrEqual(sorted[i - 1].end);
    }
  });

  it("a Metric saying changes only the figure, never the length class of a line (E7 long-text)", () => {
    // A Metric line may grow by a short figure's worth (a dozen characters, or a tenth of a long line) and
    // may shrink by a phrase's worth (`an inch and a half` is `38 mm`); it never grows into a longer card.
    for (const card of page.cards) {
      const metric = guideLines(asWords(card), "metric");
      for (const field of FIELDS) {
        const before = card[field];
        const after = metric[field];
        if (before === null || after === null) continue;
        const where = `${card.page} ${card.name} ${field}`;
        expect(after.length - before.length, where).toBeLessThanOrEqual(Math.max(12, before.length * 0.1));
        expect(before.length - after.length, where).toBeLessThanOrEqual(20);
      }
    }
  });
});

describe("GUIDE_IMPERIAL_FIGURE, the one no-inch rule", () => {
  it("finds an inch or a foot written any of the ways the words write one", () => {
    for (const text of [
      `a 6'2" board`,
      'to the nearest 1/16"',
      "the 12-inch station",
      "to the inch",
      "a quarter inch either way",
      "the last foot",
      "eight feet or longer",
      "by an eighth",
      "a sixteenth more",
      'the last 24"',
      "a length anchor of 9'",
      "12in",
      "2 ft",
      "4 1/2'' base",
      "5″",
      "at the tail 12 adds float",
    ]) {
      expect(text, text).toMatch(GUIDE_IMPERIAL_FIGURE);
    }
  });

  it("leaves a surfer's feet, fin names and RAILS' mark names alone", () => {
    for (const text of [
      "steadier under foot",
      "float under your back foot",
      "a fin's base",
      "Thruster",
      "2+1",
      "Pencil Deck Mark 1 in from the rail",
      "Pencil Bottom Tuck 1 in from the rail on the bottom",
      "the tail 30.5 cm station",
      "60/40 puts the apex low",
      "1.00 is the full rule",
      "the fin's footprint",
      "51 real cross-sections",
    ]) {
      expect(text, text).not.toMatch(GUIDE_IMPERIAL_FIGURE);
    }
  });

  it("names the only two exempt kinds, and takes this board's own strings out before it looks", () => {
    expect(GUIDE_METRIC_EXEMPT).toEqual(["blank name", "rocker order code"]);
    expect(guideImperialFigures(`your board in its ${BLANK} blank`)).not.toEqual([]);
    expect(guideImperialFigures(`your board in its ${BLANK} blank`, [BLANK])).toEqual([]);
    expect(guideImperialFigures('order it +1/2"N18"', ['+1/2"N18"'])).toEqual([]);
  });
});

describe("no Metric line on any card or intro carries an inch or a foot", () => {
  it("all 84 cards, every line, with their sayings applied", () => {
    expect(page.cards).toHaveLength(84);
    for (const card of page.cards) {
      const metric = guideLines(asWords(card), "metric");
      for (const field of FIELDS) {
        const line = metric[field];
        if (line === null) continue;
        expect(guideImperialFigures(line), `${card.page} ${card.name} ${field}: ${line}`).toEqual([]);
      }
    }
  });

  it("all five intros — ROCKER's blank keeping its maker's name, the only exemption", () => {
    expect(page.pages).toHaveLength(5);
    for (const section of page.pages) {
      const template = section.intro.replaceAll(BLANK, "{blank}");
      const text = guideIntro(template, "metric", { board: "Shortboard", blank: BLANK }, section.page);
      expect(guideImperialFigures(text, [BLANK]), `${section.page} intro: ${text}`).toEqual([]);
    }
  });

  it("an Imperial shaper still reads every line exactly as the page writes it", () => {
    for (const card of page.cards) {
      expect(guideLines(asWords(card), "imperial")).toEqual({ is: card.is, does: card.does, info: card.info, how: card.how });
    }
  });

  it("a card with no figure in its words has no saying, and every saying belongs to a card or an intro on the page", () => {
    const keys = new Set(Object.keys(GUIDE_METRIC_SAYINGS));
    for (const card of page.cards) {
      const hasFigure = FIELDS.some((f) => card[f] !== null && GUIDE_IMPERIAL_FIGURE.test(card[f]!));
      expect(keys.has(guideCardId(card.page, card.group, card.name)), `${card.page} ${card.name}`).toBe(hasFigure);
    }
    const known = new Set([
      ...page.cards.map((c) => guideCardId(c.page, c.group, c.name)),
      ...page.pages.map((p) => `${p.page}.intro`),
    ]);
    for (const key of keys) expect(known.has(key), key).toBe(true);
  });
});

/** A fin setup's own placement on the default board, with the setup's fields changed. */
const placed = (change: Partial<FinPlacementSpec>) => computeFinPlacement({ ...DEFAULT_FIN_PLACEMENT_SPEC, ...change });
const markM = (value: Mm) => formatMark(value, "metric");
const inchMark = (inches: number) => markM(inchesToMm(inches));
/** A range a MODEL INFO note gives in inches, read off the note `fins.ts` itself writes. */
const noteRange = (note: string, pattern: RegExp): [number, number] => {
  const m = pattern.exec(note);
  if (!m) throw new Error(`${pattern} is not in "${note}"`);
  return [Number(m[1]), Number(m[2])];
};
/** A component's own slider bounds, read from its source so a changed limit fails here. */
const sourceBounds = (file: string, name: string): { min: number; max: number } => {
  const source = readFileSync(new URL(file, import.meta.url), "utf8");
  const m = new RegExp(`const ${name} = \\{ min: (-?[\\d.]+), max: (-?[\\d.]+)`).exec(source);
  if (!m) throw new Error(`${name} is not in ${file}`);
  return { min: Number(m[1]), max: Number(m[2]) };
};
const sliderTopM = (bounds: { min: number; max: number }) => markM(mm(measureSlider(mm(0), bounds, 1 / 16, 1, "metric").max));

const single = placed({ finSetup: "single" });
const upright = placed({ finSetup: "twin", twinTemplate: "upright" });
const keel = placed({ finSetup: "twin", twinTemplate: "keel" });
const trailer = placed({ finSetup: "twin", twinTemplate: "trailer" });
const twoPlusOne = placed({ finSetup: "2plus1" });
const basic = placed({ finSetup: "thruster", frontModel: "basic" });
const offRail = placed({ finSetup: "quad", quadRearModel: "basicOffRail" });
const STATION = stationLabel("metric");
const singleRange = noteRange(single.notes[0], /Off-tail \(box trailing edge\) ([\d.]+)–([\d.]+)"/);
const uprightRange = noteRange(upright.notes[0], /off-tail ([\d.]+)–([\d.]+)"/);
const keelRange = noteRange(keel.notes[0], /off-tail ([\d.]+)–([\d.]+)"/);
const sideRange = noteRange(twoPlusOne.notes[0], /([\d.]+)–([\d.]+)" typical/);
const anchorFeet = Number(/scaled off a (\d+)' anchor/.exec(twoPlusOne.notes[0])![1]);
const trailerMain = trailer.marks.find((k) => k.role === "front")!.offTail;
const trailerFin = trailer.marks.find((k) => k.role === "center")!.offTail;
const basicToe = basic.marks.find((k) => k.role === "front")!.toe;
const offRailFront = offRail.marks.find((k) => k.role === "front")!.offTail;
const offRailRear = offRail.marks.find((k) => k.role === "rear")!.offTail;
const bendFrom = GUIDE_PUSH_TABLE.find((e) => e.key === "bendFrom")!.inches!;
const FINE_TUNE = sourceBounds("../../rocker/rocker-controls.tsx", "FINE_TUNE_RANGE_IN");
const AFT_FORWARD = sourceBounds("../../fins/fin-controls.tsx", "POS_BOUNDS");

/**
 * Every number of the app a saying quotes: the saying, where the number comes from, and the Metric phrase
 * that number gives through the app's own formatter. A saying not listed here is a rule of thumb.
 */
const APP_NUMBERS: { key: string; imperial: string; source: string; metric: string }[] = [
  { key: guideCardId("template", "Board Length", "Board Length"), imperial: 'The 12" stations', source: "MEASURE_STATION_MM · stationLabel", metric: `The ${STATION} stations` },
  { key: guideCardId("template", "Wings", "Vertical run"), imperial: "two inches", source: "WING_RUN_RANGE_IN.max · formatMark (the slider's own end hint)", metric: formatMark(inchesToMm(WING_RUN_RANGE_IN.max), "metric") },
  { key: guideCardId("rocker", "Blank", "Customize Rocker"), imperial: "18 inches in", source: "GUIDE_PUSH_TABLE bendFrom · formatDim (a bend's start is a dim)", metric: `${formatDim(inchesToMm(bendFrom), "metric")} in` },
  { key: guideCardId("rocker", "Rocker", "Nose Rocker"), imperial: "the 12-inch station", source: "MEASURE_STATION_MM · stationLabel", metric: `the ${STATION} station` },
  { key: guideCardId("rocker", "Rocker", "Tail Rocker"), imperial: "the 12-inch station", source: "MEASURE_STATION_MM · stationLabel", metric: `the ${STATION} station` },
  { key: guideCardId("rocker", "Rocker", "Tail Rocker"), imperial: "the last 12 inches", source: "MEASURE_STATION_MM · stationLabel", metric: `the last ${STATION}` },
  { key: guideCardId("rocker", "Foil", "Nose Thinning Starts"), imperial: "12 inches from the tip", source: "MEASURE_STATION_MM (the automatic start) · stationLabel", metric: `${STATION} from the tip` },
  { key: guideCardId("rocker", "Foil", "Tail Thinning Starts"), imperial: "12 inches from the tip", source: "MEASURE_STATION_MM (the automatic start) · stationLabel", metric: `${STATION} from the tip` },
  { key: guideCardId("rocker", "Foil", 'Nose @ 12" · Tail @ 12"'), imperial: "the two 12-inch stations", source: "MEASURE_STATION_MM · stationLabel", metric: `the two ${STATION} stations` },
  { key: guideCardId("rocker", "Foil", 'Nose @ 12" · Tail @ 12"'), imperial: "a quarter inch", source: "rocker-controls FINE_TUNE_RANGE_IN · measureSlider metric top · formatMark", metric: sliderTopM(FINE_TUNE) },
  { key: guideCardId("rocker", "Foil", 'Nose @ 12" · Tail @ 12"'), imperial: "the tail 12", source: "MEASURE_STATION_MM · stationLabel", metric: `the tail ${STATION}` },
  { key: guideCardId("rocker", "Foil", 'Nose @ 12" · Tail @ 12"'), imperial: "the nose 12", source: "MEASURE_STATION_MM · stationLabel", metric: `the nose ${STATION}` },
  { key: guideCardId("rocker", "Foil", 'Nose @ 12" · Tail @ 12"'), imperial: "the 12-inch thicknesses", source: "MEASURE_STATION_MM · stationLabel", metric: `the ${STATION} thicknesses` },
  { key: guideCardId("rocker", "Foil", "Fine tune from"), imperial: "a 12-inch fine-tune", source: "MEASURE_STATION_MM · stationLabel", metric: `a ${STATION} fine-tune` },
  { key: guideCardId("rocker", "Foil", "Fine tune from"), imperial: "a lower 12-inch station", source: "MEASURE_STATION_MM · stationLabel", metric: `a lower ${STATION} station` },
  { key: guideCardId("rails", "Inputs", "Import Rocker & Foil Values"), imperial: 'the nose 12"', source: "MEASURE_STATION_MM · stationLabel", metric: `the nose ${STATION}` },
  { key: guideCardId("rails", "Inputs", "Import Rocker & Foil Values"), imperial: 'tail 12"', source: "MEASURE_STATION_MM · stationLabel", metric: `tail ${STATION}` },
  { key: guideCardId("rails", "Inputs", 'Board Thickness · Thickness @12"'), imperial: 'the 12" stations', source: "MEASURE_STATION_MM · stationLabel", metric: `the ${STATION} stations` },
  { key: guideCardId("volume", "What the ESTIMATE card reads", "Length-Weighted Effective Thickness"), imperial: 'tail 12"', source: "MEASURE_STATION_MM · stationLabel", metric: `tail at ${STATION}` },
  { key: "fins.intro", imperial: 'the last 24"', source: 'guideFrame("metric").finsTailWindow, the window\'s own round 60 cm', metric: `the last ${mmToCentimetres(guideFrame("metric").finsTailWindow)} cm` },
  { key: guideCardId("fins", "Inputs", "Import Designed Board"), imperial: 'its tail width at 12"', source: "MEASURE_STATION_MM · stationLabel", metric: `its tail width at ${STATION}` },
  { key: guideCardId("fins", "Convention", "Trailing-edge convention"), imperial: 'the nearest 1/16"', source: "finRoundingGrain", metric: `the nearest ${finRoundingGrain("metric")}` },
  { key: guideCardId("fins", "Single Fin", "Single Fin"), imperial: '(4 1/2" to 6")', source: "the single fin's off-tail range in its fins.ts note · formatMark", metric: `(${inchMark(singleRange[0])} to ${inchMark(singleRange[1])})` },
  { key: guideCardId("fins", "Twin", "Twin"), imperial: 'Modern = 7" to 8"', source: "the upright twin's off-tail range in its fins.ts note · formatMark", metric: `Modern = ${inchMark(uprightRange[0])} to ${inchMark(uprightRange[1])}` },
  { key: guideCardId("fins", "Twin", "Twin"), imperial: 'Keel = 6" to 6 1/2"', source: "the keel's off-tail range in its fins.ts note · formatMark", metric: `Keel = ${inchMark(keelRange[0])} to ${inchMark(keelRange[1])}` },
  { key: guideCardId("fins", "Twin", "Twin"), imperial: 'at ~10"', source: "computeFinPlacement, Upright + Trailer's mains · formatMark", metric: `at ~${markM(trailerMain)}` },
  { key: guideCardId("fins", "Twin", "Modern/Upright"), imperial: '≤ 5 1/2"', source: "TWIN_FORWARD_BASE_IN.upright · formatMark", metric: `≤ ${inchMark(TWIN_FORWARD_BASE_IN.upright)}` },
  { key: guideCardId("fins", "Twin", "Keel"), imperial: '> 5 1/2"', source: "TWIN_FORWARD_BASE_IN.upright · formatMark", metric: `> ${inchMark(TWIN_FORWARD_BASE_IN.upright)}` },
  { key: guideCardId("fins", "Twin", "Upright + Trailer"), imperial: "four inches off the tail", source: "computeFinPlacement, the trailer fin's off-tail · formatMark", metric: `${markM(trailerFin)} off the tail` },
  { key: guideCardId("fins", "Thruster", "Basic (Half Rate)"), imperial: "a quarter inch", source: "computeFinPlacement, the Basic front toe · formatMark", metric: markM(basicToe) },
  { key: guideCardId("fins", "2+1", "2+1"), imperial: "a length anchor of 9'", source: "the side bites' anchor in the fins.ts note · formatLength", metric: `a length anchor of ${formatLength(inchesToMm(anchorFeet * INCHES_PER_FOOT), "metric")}` },
  { key: guideCardId("fins", "2+1", "2+1"), imperial: '(15" to 16 1/2")', source: "the side bites' range in the fins.ts note · formatMark", metric: `(${inchMark(sideRange[0])} to ${inchMark(sideRange[1])})` },
  { key: guideCardId("fins", "Quad", "Basic - Off-Rail"), imperial: "a quarter inch", source: "computeFinPlacement, rear off-tail less half the front's · formatMark", metric: markM(mm(offRailRear - offRailFront / 2)) },
  { key: guideCardId("fins", "Quad", "Basic - Off-Rail"), imperial: '+1/4"', source: "computeFinPlacement, rear off-tail less half the front's · formatMark", metric: `+${markM(mm(offRailRear - offRailFront / 2))}` },
  { key: guideCardId("fins", "Quad", "McKee Longboard"), imperial: "eight feet or longer", source: "MIN_MCKEE_LONGBOARD_QUAD_LENGTH · formatLength", metric: `${formatLength(MIN_MCKEE_LONGBOARD_QUAD_LENGTH, "metric")} or longer` },
  { key: guideCardId("fins", "Quad", "McKee Longboard"), imperial: `8'0"`, source: "MIN_MCKEE_LONGBOARD_QUAD_LENGTH · formatLength", metric: formatLength(MIN_MCKEE_LONGBOARD_QUAD_LENGTH, "metric") },
  { key: guideCardId("fins", "Advanced", "Aft/Forward position"), imperial: "an inch and a half", source: "fin-controls POS_BOUNDS · measureSlider metric top · formatMark", metric: sliderTopM(AFT_FORWARD) },
];

describe("every number of the app in a saying is the app's own Metric figure", () => {
  it("the 12-inch station reads its own label, which is the station's own dim", () => {
    expect(STATION).toBe(formatDim(MEASURE_STATION_MM, "metric"));
  });

  it("each listed saying holds exactly the Metric phrase its constant and formatter give", () => {
    for (const n of APP_NUMBERS) {
      const sayings = (GUIDE_METRIC_SAYINGS[n.key] ?? []).filter((s) => s.imperial === n.imperial);
      expect(sayings.length, `${n.key} ${n.imperial}`).toBeGreaterThan(0);
      for (const s of sayings) expect(s.metric, `${n.key} ${n.imperial} (${n.source})`).toBe(n.metric);
    }
  });

  it("the Imperial words agree with the constants they quote", () => {
    // What the words say in inches is what the app's own numbers are, so the Metric phrase is of the same thing.
    expect(singleRange).toEqual([4.5, 6]);
    expect(uprightRange).toEqual([7, 8]);
    expect(keelRange).toEqual([6, 6.5]);
    expect(sideRange).toEqual([15, 16.5]);
    expect(anchorFeet).toBe(9);
    expect(trailerMain).toBeCloseTo(inchesToMm(10), 9);
    expect(trailerFin).toBeCloseTo(inchesToMm(4), 9);
    expect(basicToe).toBeCloseTo(inchesToMm(1 / 4), 9);
    expect(offRailRear - offRailFront / 2).toBeCloseTo(inchesToMm(1 / 4), 9);
    expect(MIN_MCKEE_LONGBOARD_QUAD_LENGTH).toBeCloseTo(inchesToMm(8 * INCHES_PER_FOOT), 9);
    expect(TWIN_FORWARD_BASE_IN.upright).toBe(5.5);
    expect(WING_RUN_RANGE_IN.max).toBe(2);
    expect(FINE_TUNE).toEqual({ min: -0.25, max: 0.25 });
    expect(AFT_FORWARD).toEqual({ min: -1.5, max: 1.5 });
    expect(bendFrom).toBe(18);
  });

  it("every other saying is a rule of thumb said as a round figure of its own — never a converted fraction", () => {
    const listed = new Set(APP_NUMBERS.map((n) => `${n.key}|${n.imperial}`));
    const thumbs = moduleSayings.filter((s) => !listed.has(`${s.key}|${s.imperial}`));
    expect(thumbs.map((s) => s.metric)).toEqual([
      "the last 30 cm",
      "the last 30 cm",
      "every 10 cm or so",
      "by 3 mm",
      "to the millimetre",
      "within 30 cm of the nose",
      "a good 60 cm",
      "a centimetre of length is worth less than a centimetre of width",
      // VOLUME's litres are worked out from computeVolume in guide-copy.test.ts.
      "half a centimetre at the centre is about three litres on a shortboard",
    ]);
    for (const s of thumbs) expect(s.metric, s.key).not.toMatch(/\d[.,]\d/);
  });
});
