/**
 * Shared by the two catalogue report scripts — `find-blank-outliers.ts` (the dev-window pages) and
 * `make-catalog-reports.ts` (the notes sent to each maker): the one stylesheet, the fraction text,
 * the station marks, and the drawings of a blank as the app builds it (nose left, 1:1, every
 * printed station a dot with its figure, a named station in red with the implied figure). Pure
 * string building over the app's own tested curves; no React, browser or database import. Not app
 * code: nothing under `app/` or `components/` imports it.
 */
import {
  BLANK_ATTRIBUTES,
  attributeValue,
  liveAttributeCurve,
  type BlankAttribute,
  type MakerNormDeviation,
  type OutlierStation,
} from "@/lib/blanks/outliers";
import type { BlankRecord, BlankStation } from "@/lib/geometry/blank";
import { prepareBlank } from "@/lib/geometry/blank-fit";
import { centimetresToMm, formatInchesFraction, formatSignedInchesFraction, inchesToMm, mm, mmToCentimetres, mmToInches } from "@/lib/geometry/units";

/** A figure to the nearest 1/16" — the founder's rule for every figure shown (2026-10-14). */
export const inchesText = (value: number) => formatInchesFraction(mm(value), 16);
export const signedInchesText = (value: number) => formatSignedInchesFraction(mm(value), 16);
/** A figure three ways: nearest 1/16", decimal inches, decimal centimetres — `2 3/16" (2.19 in, 5.56 cm)`. */
export const figureText = (valueMm: number) =>
  `${inchesText(valueMm)} (${mmToInches(mm(valueMm)).toFixed(2)} in, ${mmToCentimetres(mm(valueMm)).toFixed(2)} cm)`;
export const escape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export const blankId = (vendor: string, name: string) => `${vendor} ${name}`.replace(/[^A-Za-z0-9]+/g, "-");

/* -- one plot ------------------------------------------------------------------------------ */

export const W = 340;
export const H = 190;
export const PAD = { left: 44, right: 12, top: 26, bottom: 30 };

export interface Mark {
  label: string;
  printedMm: number;
  impliedMm: number | null;
  note: string;
}

/** One attribute's plot: the live curve through all printed stations, the stations as dots, the marked ones in red. */
export function plot(record: BlankRecord, attribute: BlankAttribute, marks: readonly Mark[]): string {
  const knots = record.stations
    .filter((station) => attributeValue(station, attribute) !== null)
    .map((station) => ({ label: station.label, x: mmToInches(station.fromTailMm), y: mmToInches(attributeValue(station, attribute)!) }));
  if (knots.length < 2) return `<svg width="${W}" height="${H}"><text x="${W / 2}" y="${H / 2}" text-anchor="middle" class="muted">no ${attribute} printed</text></svg>`;
  const curve = liveAttributeCurve(
    knots.map((knot) => ({ x: knot.x * 25.4, y: knot.y * 25.4 })),
    attribute,
  );
  const length = mmToInches(record.lengthMm);
  const ys = knots.map((knot) => knot.y).concat(marks.flatMap((mark) => (mark.impliedMm === null ? [] : [mmToInches(mm(mark.impliedMm))])));
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  const span = Math.max(yMax - yMin, 0.5);
  const lo = yMin - span * 0.12;
  const hi = yMax + span * 0.12;
  const sx = (x: number) => PAD.left + ((W - PAD.left - PAD.right) * (length - x)) / length; // nose left, like the drawings
  const sy = (y: number) => H - PAD.bottom - ((H - PAD.top - PAD.bottom) * (y - lo)) / (hi - lo);
  const samples: string[] = [];
  for (let x = knots[0].x; x <= knots[knots.length - 1].x + 1e-9; x += 0.5) {
    samples.push(`${sx(x).toFixed(1)},${sy(mmToInches(mm(curve.sample(x * 25.4)))).toFixed(1)}`);
  }
  const ticks: string[] = [];
  for (const value of [lo + span * 0.12, yMax]) {
    ticks.push(`<text x="${PAD.left - 4}" y="${sy(value).toFixed(1)}" text-anchor="end" dominant-baseline="middle" class="axis">${escape(inchesText(value * 25.4))}</text>`);
  }
  const dots = knots.map((knot) => {
    const mark = marks.find((m) => m.label === knot.label);
    const cx = sx(knot.x).toFixed(1);
    const cy = sy(knot.y).toFixed(1);
    const label = `<text x="${cx}" y="${H - PAD.bottom + 12}" text-anchor="middle" class="axis${mark ? " red" : ""}">${escape(knot.label)}</text>`;
    if (!mark) return `<circle cx="${cx}" cy="${cy}" r="3" class="dot"/>${label}`;
    const implied = mark.impliedMm === null ? "" : `<circle cx="${cx}" cy="${sy(mmToInches(mm(mark.impliedMm))).toFixed(1)}" r="4.5" class="implied"/><line x1="${cx}" y1="${cy}" x2="${cx}" y2="${sy(mmToInches(mm(mark.impliedMm))).toFixed(1)}" class="gap"/>`;
    return `${implied}<circle cx="${cx}" cy="${cy}" r="4" class="dot red"/>${label}<title>${escape(mark.note)}</title>`;
  });
  const title = attribute[0].toUpperCase() + attribute.slice(1);
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><text x="${PAD.left}" y="16" class="title">${title}</text>${ticks.join("")}<polyline points="${samples.join(" ")}" class="curve"/>${dots.join("")}</svg>`;
}

/* -- the pages' one stylesheet --------------------------------------------------------------- */

export const PAGE_CSS = `
  body { font: 14px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 24px; color: #1d2a2a; background: #fbfaf7; }
  h1 { font-size: 20px; margin: 0 0 4px; } h2 { font-size: 16px; margin: 28px 0 8px; } h3 { font-size: 15px; margin: 0 0 6px; }
  .muted { color: #6b7a78; } .red { color: #b3261e; } .amber { color: #8a5a00; }
  table { border-collapse: collapse; width: 100%; max-width: 1100px; } th, td { text-align: left; padding: 4px 8px; border-bottom: 1px solid #e4e1d8; vertical-align: top; }
  th { font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; color: #6b7a78; } td.num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  a { color: #1f5f5b; }
  section.blank { background: #fff; border: 1px solid #e4e1d8; border-radius: 8px; padding: 12px 14px; margin: 14px 0; max-width: 1100px; }
  .drawings { display: flex; flex-direction: column; gap: 4px; margin: 4px 0 10px; } svg.drawing { width: 100%; max-width: 1040px; height: auto; display: block; }
  svg .foam { fill: #e6efe9; stroke: #1d2a2a; stroke-width: 1.2; } svg .stringer { stroke: #1d2a2a; stroke-width: 0.6; } svg .tick { stroke: #6b7a78; stroke-width: 0.8; stroke-dasharray: 3 3; } svg .tick.red { stroke: #b3261e; stroke-width: 1.2; stroke-dasharray: none; }
  .plots { display: flex; flex-wrap: wrap; gap: 8px; }
  svg text { font: 11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; fill: #1d2a2a; } svg text.axis { font-size: 10px; fill: #6b7a78; } svg text.title { font-weight: 600; } svg text.red { fill: #b3261e; font-weight: 600; } svg text.figure { font-size: 9.5px; fill: #1d2a2a; paint-order: stroke; stroke: #fff; stroke-width: 3px; stroke-linejoin: round; }
  svg .curve { fill: none; stroke: #1f5f5b; stroke-width: 1.5; } svg .cm { fill: #fff; stroke: #8a5a00; stroke-width: 1.5; } svg text.amber { fill: #8a5a00; } svg .dot { fill: #1d2a2a; } svg .dot.red { fill: #b3261e; } svg .implied { fill: #fff; stroke: #b3261e; stroke-width: 1.5; } svg .gap { stroke: #b3261e; stroke-width: 1; stroke-dasharray: 2 2; }
  ul.findings { margin: 6px 0 0; padding-left: 18px; } p.notes { margin: 6px 0 0; font-size: 12px; }
  h4 { font-size: 12px; margin: 10px 0 2px; text-transform: uppercase; letter-spacing: 0.04em; color: #6b7a78; }
  .review ul { margin: 0; padding-left: 0; list-style: none; } .review li { margin: 3px 0; }
  .item { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; padding: 4px 6px; border-radius: 6px; } .item.ticked { background: #eaf3ef; } .item.missing { background: #fbe9e7; }
  .item label.apply { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; white-space: nowrap; }
  .item input.to { width: 7em; font: inherit; font-size: 12px; padding: 2px 4px; border: 1px solid #c9c4b6; border-radius: 4px; }
  .item input.comment { width: 16em; font: inherit; font-size: 12px; padding: 2px 4px; border: 1px solid #e4e1d8; border-radius: 4px; }
  .item select { font: inherit; font-size: 12px; padding: 2px; }
  .item span.text { flex: 1 1 24em; }
  .bar { position: sticky; top: 0; z-index: 2; background: #fff; border: 1px solid #e4e1d8; border-radius: 8px; padding: 8px 12px; margin: 8px 0; display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
  .bar button { font: inherit; font-size: 13px; padding: 4px 10px; border-radius: 6px; border: 1px solid #1f5f5b; background: #1f5f5b; color: #fff; cursor: pointer; } .bar button:disabled { opacity: 0.5; cursor: default; } .bar button#review-clear { background: #fff; color: #1f5f5b; }
  textarea.out { width: 100%; max-width: 1100px; height: 7em; font: 11px/1.4 ui-monospace, Menlo, monospace; margin: 4px 0 10px; }
  p.how { max-width: 900px; }
`;

/* -- the blank as the app builds it ---------------------------------------------------------- */

export const DRAW_W = 1040;
export const DRAW_PAD = { left: 24, right: 24, top: 48, bottom: 48 };
/** The side view's vertical scale against its length: 1 is true to life (the founder's ask, 2026-10-14). */
export const SIDE_STRETCH = 1;

/** What the drawings say about one station of one attribute. */
export interface StationMark {
  printedMm: number;
  /** The figure the rest of the blank implies, when the station is named on the outlier page. */
  impliedMm: number | null;
  /** The page's centimetre figure, when it disagrees with the inch figure (a hollow diamond). */
  cmMm?: number | null;
  /** True when the station is named (off its curve, unusual for the maker, or noted). */
  flagged: boolean;
}
export type StationMarks = Record<BlankAttribute, Map<string, StationMark>>;

/** Every printed station of `record`, marked with the findings that name it. */
export function marksOf(record: BlankRecord, outliers: readonly OutlierStation[], deviations: readonly MakerNormDeviation[]): StationMarks {
  const marks: StationMarks = { rocker: new Map(), thickness: new Map(), width: new Map() };
  for (const station of record.stations) {
    for (const attribute of BLANK_ATTRIBUTES) {
      const value = attributeValue(station, attribute);
      if (value !== null) marks[attribute].set(station.label, { printedMm: value, impliedMm: null, flagged: false });
    }
  }
  for (const o of outliers) {
    if (o.vendor !== record.vendor || o.name !== record.name) continue;
    const mark = marks[o.attribute].get(o.label);
    if (mark) Object.assign(mark, { impliedMm: o.impliedMm, flagged: true });
  }
  for (const d of deviations) {
    if (d.vendor !== record.vendor || d.name !== record.name) continue;
    const mark = marks[d.attribute].get(d.label);
    if (mark && mark.impliedMm === null) Object.assign(mark, { impliedMm: d.typicalMm, flagged: true });
  }
  return marks;
}

/**
 * The blank drawn from the same prepared curves every screen draws from, nose to the LEFT: the side
 * view (the levelled bottom rocker, and the deck as that bottom plus the thickness) and the outline
 * from above (half the width either side of the stringer), both 1:1, sampled every half inch. Every printed station is ticked and labelled, its printed
 * figures sit on the drawing as dots with their numbers (rocker under the bottom, thickness above the
 * deck, width on the upper rail), and a named station is red, with a hollow dot and the figure the
 * rest of the blank implies beside it.
 */
export function blankDrawings(record: BlankRecord, marks: StationMarks): string {
  const prepared = prepareBlank(record);
  const length = mmToInches(record.lengthMm);
  const scale = (DRAW_W - DRAW_PAD.left - DRAW_PAD.right) / length;
  const sx = (x: number) => DRAW_PAD.left + (length - x) * scale; // nose left, tail right
  const xs: number[] = [];
  for (let x = 0; x <= length + 1e-9; x += 0.5) xs.push(Math.min(x, length));
  const bottomAt = (x: number) => mmToInches(mm(prepared.rocker.sample(x * 25.4)));
  const thicknessAt = (x: number) => mmToInches(mm(prepared.thickness.sample(x * 25.4)));
  const halfAt = (x: number) => mmToInches(mm(prepared.width.sample(x * 25.4))) / 2;
  const bottom = xs.map(bottomAt);
  const deck = xs.map((x, i) => bottom[i] + thicknessAt(x));
  const half = xs.map(halfAt);
  const levelOffset = mmToInches(mm(prepared.rocker.minimum)); // printed rocker − this = levelled
  const stations = record.stations.map((s) => ({ label: s.label, x: mmToInches(s.fromTailMm) }));
  const flaggedLabels = new Set<string>();
  for (const attribute of BLANK_ATTRIBUTES) for (const [label, mark] of marks[attribute]) if (mark.flagged) flaggedLabels.add(label);
  const isRed = (label: string) => flaggedLabels.has(label);
  const ticks = (y0: number, y1: number, labelY: number) =>
    stations
      .map(
        (s) =>
          `<line x1="${sx(s.x).toFixed(1)}" y1="${y0.toFixed(1)}" x2="${sx(s.x).toFixed(1)}" y2="${y1.toFixed(1)}" class="tick${isRed(s.label) ? " red" : ""}"/><text x="${sx(s.x).toFixed(1)}" y="${labelY.toFixed(1)}" text-anchor="middle" class="axis${isRed(s.label) ? " red" : ""}">${escape(s.label)}</text>`,
      )
      .join("");
  /** A printed dot with its figure, and the hollow implied dot with its figure when there is one. */
  const dot = (cx: number, cy: number, text: string, textY: number, red: boolean, implied: { cy: number; text: string } | null, stagger: number, cmMark: { cy: number; text: string } | null = null) =>
    `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="3" class="dot${red ? " red" : ""}"/>` +
    `<text x="${cx.toFixed(1)}" y="${(textY + stagger).toFixed(1)}" text-anchor="middle" class="figure${red ? " red" : ""}">${escape(text)}</text>` +
    (implied
      ? `<circle cx="${cx.toFixed(1)}" cy="${implied.cy.toFixed(1)}" r="4.5" class="implied"/><line x1="${cx.toFixed(1)}" y1="${cy.toFixed(1)}" x2="${cx.toFixed(1)}" y2="${implied.cy.toFixed(1)}" class="gap"/>` +
        `<text x="${cx.toFixed(1)}" y="${(textY + stagger + (textY > cy ? 11 : -11)).toFixed(1)}" text-anchor="middle" class="figure red">→ ${escape(implied.text)}</text>`
      : "") +
    (cmMark
      ? `<rect x="${(cx - 4).toFixed(1)}" y="${(cmMark.cy - 4).toFixed(1)}" width="8" height="8" transform="rotate(45 ${cx.toFixed(1)} ${cmMark.cy.toFixed(1)})" class="cm"/>` +
        `<text x="${cx.toFixed(1)}" y="${(textY + stagger + (textY > cy ? 11 : -11) * (implied ? 2 : 1)).toFixed(1)}" text-anchor="middle" class="figure amber">cm says ${escape(cmMark.text)}</text>`
      : "");
  // Stagger neighbouring labels into two rows so 6" stations never overprint.
  const row = (i: number, step: number) => (i % 2 === 0 ? 0 : step);

  // Side view.
  const vs = scale * SIDE_STRETCH;
  const deckMax = Math.max(...deck);
  const sideH = DRAW_PAD.top + deckMax * vs + DRAW_PAD.bottom + 12;
  const syS = (y: number) => DRAW_PAD.top + (deckMax - y) * vs;
  const sidePath =
    `M ${xs.map((x, i) => `${sx(x).toFixed(1)} ${syS(bottom[i]).toFixed(1)}`).join(" L ")}` +
    ` L ${[...xs].reverse().map((x, j) => `${sx(x).toFixed(1)} ${syS(deck[xs.length - 1 - j]).toFixed(1)}`).join(" L ")} Z`;
  const sideDots = stations
    .map((s, i) => {
      const cx = sx(s.x);
      const rocker = marks.rocker.get(s.label);
      const thickness = marks.thickness.get(s.label);
      const bottomHere = bottomAt(s.x);
      let out = "";
      if (rocker) {
        const impliedIn = rocker.impliedMm === null ? null : mmToInches(mm(rocker.impliedMm));
        const cmIn = rocker.cmMm == null ? null : mmToInches(mm(rocker.cmMm));
        out += dot(cx, syS(bottomHere), inchesText(rocker.printedMm), syS(bottomHere) + 13, rocker.flagged, impliedIn === null ? null : { cy: syS(impliedIn - levelOffset), text: inchesText(rocker.impliedMm!) }, row(i, 11), cmIn === null ? null : { cy: syS(cmIn - levelOffset), text: inchesText(rocker.cmMm!) });
      }
      if (thickness) {
        const deckHere = bottomHere + thicknessAt(s.x);
        const impliedIn = thickness.impliedMm === null ? null : mmToInches(mm(thickness.impliedMm));
        const cmIn = thickness.cmMm == null ? null : mmToInches(mm(thickness.cmMm));
        out += dot(cx, syS(deckHere), inchesText(thickness.printedMm), syS(deckHere) - 7, thickness.flagged, impliedIn === null ? null : { cy: syS(bottomHere + impliedIn), text: inchesText(thickness.impliedMm!) }, -row(i, 11), cmIn === null ? null : { cy: syS(bottomHere + cmIn), text: inchesText(thickness.cmMm!) });
      }
      return out;
    })
    .join("");
  const side = `<svg class="drawing" viewBox="0 0 ${DRAW_W} ${sideH.toFixed(0)}"><text x="${DRAW_PAD.left}" y="14" class="title">Side view — nose left, bottom rocker and deck as the app builds them, 1:1; thickness above the deck, rocker under the bottom</text><path d="${sidePath}" class="foam"/>${ticks(DRAW_PAD.top - 6, sideH - DRAW_PAD.bottom + 4, sideH - 6)}${sideDots}</svg>`;

  // Top view.
  const halfMax = Math.max(...half);
  const topH = DRAW_PAD.top + 2 * halfMax * scale + DRAW_PAD.bottom;
  const mid = DRAW_PAD.top + halfMax * scale;
  const topPath =
    `M ${xs.map((x, i) => `${sx(x).toFixed(1)} ${(mid - half[i] * scale).toFixed(1)}`).join(" L ")}` +
    ` L ${[...xs].reverse().map((x, j) => `${sx(x).toFixed(1)} ${(mid + half[xs.length - 1 - j] * scale).toFixed(1)}`).join(" L ")} Z`;
  const topDots = stations
    .map((s, i) => {
      const width = marks.width.get(s.label);
      if (!width) return "";
      const cx = sx(s.x);
      const h = halfAt(s.x);
      const impliedHalf = width.impliedMm === null ? null : mmToInches(mm(width.impliedMm)) / 2;
      const cmHalf = width.cmMm == null ? null : mmToInches(mm(width.cmMm)) / 2;
      return (
        dot(cx, mid - h * scale, inchesText(width.printedMm), mid - h * scale - 7, width.flagged, impliedHalf === null ? null : { cy: mid - impliedHalf * scale, text: inchesText(width.impliedMm!) }, -row(i, 11), cmHalf === null ? null : { cy: mid - cmHalf * scale, text: inchesText(width.cmMm!) }) +
        `<circle cx="${cx.toFixed(1)}" cy="${(mid + h * scale).toFixed(1)}" r="3" class="dot${width.flagged ? " red" : ""}"/>` +
        (impliedHalf === null ? "" : `<circle cx="${cx.toFixed(1)}" cy="${(mid + impliedHalf * scale).toFixed(1)}" r="4.5" class="implied"/>`)
      );
    })
    .join("");
  const top = `<svg class="drawing" viewBox="0 0 ${DRAW_W} ${topH.toFixed(0)}"><text x="${DRAW_PAD.left}" y="14" class="title">From above — nose left, the outline from the printed widths, 1:1; full width at each station</text><path d="${topPath}" class="foam"/><line x1="${sx(0).toFixed(1)}" y1="${mid.toFixed(1)}" x2="${sx(length).toFixed(1)}" y2="${mid.toFixed(1)}" class="stringer"/>${ticks(DRAW_PAD.top - 6, topH - DRAW_PAD.bottom + 4, topH - 6)}${topDots}</svg>`;
  return `<div class="drawings">${side}${top}</div>`;
}


/* -- the catalogue files' own notes, and every note on a blank -------------------------------- */

/** One part of a catalogue row's note, read into the kind of thing it says. */
export type Note =
  | { kind: "units"; attribute: string; printedInch: string; printedCm: string; used: string; usedInch: boolean }
  | { kind: "headline"; text: string }
  | { kind: "misprint"; text: string }
  | { kind: "unprinted"; text: string }
  | { kind: "tip"; text: string }
  | { kind: "convention" };

/** Splits a row's note into its parts — one sentence per figure — without cutting inside a sentence. */
export function noteParts(flag: string): string[] {
  return flag
    .split(/;\s(?=(?:rocker|thickness|width|length|volume|catalog's|only |moved |wake|rectangular|thick |sister|SUP |nose and tail swapped|changed on ))/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

/** Reads one part of a note into the kind it belongs to. Anything unrecognised is kept as a misprint note rather than lost. */
export function readNote(part: string): Note {
  let m = /^(rocker|thickness|width|length|volume): catalog prints (.+?) but (.+?); used the (inch|cm|cubic-foot) value(?: \(([^)]+)\))?/.exec(part);
  if (m) {
    const used = m[4] === "inch" ? "the inch figure" : m[4] === "cm" ? `the centimetre figure${m[5] ? ` (${m[5]})` : ""}` : `the cubic-foot figure${m[5] ? ` (${m[5]})` : ""}`;
    return { kind: "units", attribute: m[1], printedInch: m[2], printedCm: m[3].replace(/ here$/, ""), used, usedInch: m[4] === "inch" };
  }
  m = /^(width|thickness|rocker): catalog cm \((.+?)\) disagrees with inch \((.+?)\); used inch/.exec(part);
  if (m) return { kind: "units", attribute: m[1], printedInch: m[3], printedCm: m[2], used: "the inch figure", usedInch: true };
  m = /^width: catalog cm \((.+?)\) is a typo for (.+?) \((.*)\)/.exec(part);
  if (m) return { kind: "units", attribute: "width", printedInch: "the inch figure and the summary box agree", printedCm: `${m[1]} cm`, used: `${m[2]} cm, which the inch figure and the summary box give`, usedInch: true };
  if (/^catalog's Max (Width|Thickness) line prints/.test(part) || /thicker than its own stated max/.test(part) || /^length: catalog prints a tip-to-tip deck/.test(part)) {
    return { kind: "headline", text: part };
  }
  if (/may be a misprint|likely a catalog typo|missing digits|rocker set to .* to match|in both units/.test(part)) return { kind: "misprint", text: part };
  if (/^thickness illegible in catalog/.test(part) || /not printed in catalog$/.test(part) || /^width not printed at this station/.test(part) || /^the catalog draws only/.test(part)) {
    if (/rounded nose, not printed in catalog$/.test(part)) return { kind: "convention" }; // tips are their own kind
    return { kind: "unprinted", text: part };
  }
  if (/^width: catalog prints 1\/16" at the tail tip/.test(part) || /^width 0: rounded nose — catalog prints/.test(part)) return { kind: "tip", text: part };
  if (/^width 1": pointed nose/.test(part) || /^moved from drawn position/.test(part) || /^only thickness differs/.test(part) || /^thick version of/.test(part) || /^rectangular block blank/.test(part) || /^SUP blank is a constant-width block/.test(part) || /^width measured 3" back/.test(part) || /^wake-surf rocker as drawn/.test(part) || /^nose and tail swapped/.test(part) || /^(rocker|thickness|width|length|deck length|volume): changed from/.test(part) || /^width [\d.]+ (\(widest point.*\) )?assigned to center/.test(part) || /^catalog prints [\d.]+$/.test(part) || /^the \d.*page \d+ has/.test(part) || /^thickness: prints "/.test(part) || /^sister/.test(part)) {
    return { kind: "convention" };
  }
  return { kind: "misprint", text: part };
}

/** `6'2 1/8"`, `9'8"`, `2 13/16"`, `17/32"`, `2.19`, `"3 1/6""` → inches, or null when it is not a length. */
export function parseInchesText(text: string): number | null {
  const clean = text.replace(/[”“]/g, '"').replace(/^"+|"+$/g, "").replace(/\s*(in|inch|inches)$/i, "").trim();
  let m = /^(\d+)'\s*(\d+)?\s*(?:(\d+)\/(\d+))?"?$/.exec(clean);
  if (m) return Number(m[1]) * 12 + (m[2] ? Number(m[2]) : 0) + (m[3] ? Number(m[3]) / Number(m[4]) : 0);
  // A whole number, a whole number then a space then a fraction, or a fraction on its own. The space
  // is required: an optional one let "15/16" read as 1 + 5/16, which the first review's apply wrote
  // into the 6'5"R tail 12" rocker (caught 2026-10-14 when the founder ticked the same figure again).
  m = /^(?:(\d+(?:\.\d+)?)(?:\s+(\d+)\/(\d+))?|(\d+)\/(\d+))"?$/.exec(clean.replace(/"\s*\(.*$/, '"'));
  if (!m) return null;
  const numerator = m[2] ?? m[4];
  const denominator = m[3] ?? m[5];
  if (m[1] !== undefined && m[1].includes(".") && numerator !== undefined) return null; // "2.5 3/16" is no figure
  return (m[1] !== undefined ? Number(m[1]) : 0) + (numerator !== undefined ? Number(numerator) / Number(denominator) : 0);
}
/** `5.08 cm here`, `274.32 cm (9'0")`, `29.86 cm = 11.756 in`, `69.05` → centimetres, or null (litres, cubic feet). */
export function parseCmText(text: string): number | null {
  if (/\bL\b|ft3/.test(text)) return null;
  const m = /([\d.]+)\s*(?:cm|$)/.exec(text);
  return m ? Number(m[1]) : null;
}
/** The three-way text for a printed figure, or the text itself when it is not a length. */
export function inchFigure(text: string): string {
  const inches = parseInchesText(text);
  if (inches === null) return text;
  const three = figureText(inchesToMm(inches));
  const printed = text.replace(/[”“]/g, '"');
  return three.startsWith(`${printed} `) ? three : `${printed} = ${three}`;
}
export function cmFigure(text: string): string {
  const cm = parseCmText(text);
  return cm === null ? text : `${cm.toFixed(2)} cm (= ${inchesText(centimetresToMm(cm))}, ${mmToInches(centimetresToMm(cm)).toFixed(2)} in)`;
}

/** A station label the way a page would say it: `12" from the nose`, `centre`, `tail tip`. */
export const STATION_WORD = (label: string) =>
  (label === "C" ? "centre" : label.startsWith("N") ? `${label.slice(1)}" from the nose` : `${label.slice(1)}" from the tail`).replace(/^0" from the (nose|tail)$/, "$1 tip");

export type ItemKind = "units" | "off" | "unusual" | "misprint" | "tip" | "headline" | "unprinted";
export const KIND_TITLE: Record<ItemKind, string> = {
  units: "Inches and centimetres that disagree",
  off: "Off the curve of the blank's other stations",
  unusual: "Unusual for this catalog at that station",
  misprint: "Likely misprints, and other notes from our read of the page",
  tip: "Tip widths under an inch",
  headline: "The page's headline against its station",
  unprinted: "Not printed, or not readable",
};
export const KIND_ORDER: ItemKind[] = ["units", "off", "unusual", "misprint", "tip", "headline", "unprinted"];

/** A figure a review can change: a station's rocker, thickness or width, or the blank's length, deck length or volume. */
export type ReviewAttribute = BlankAttribute | "length" | "deck_length" | "volume";

/** One note on one blank, with the figure as it stands and the figure the note suggests (both as text, nearest 1/16"). */
export interface ReviewItem {
  kind: ItemKind;
  /** The station label, or `""` for a figure of the whole blank. */
  label: string;
  attribute: ReviewAttribute | null;
  /** The sentence, as HTML. */
  html: string;
  current: string;
  suggested: string;
  /** The page's centimetre figure in mm, for the drawing's hollow diamond (units notes only). */
  cmMm?: number;
}

const isStationAttribute = (word: string): word is BlankAttribute => word === "rocker" || word === "thickness" || word === "width";

/** Every note on `record`, in the report's order: the catalogue file's own notes, then the outlier check's. */
export function blankItems(record: BlankRecord, outliers: readonly OutlierStation[], deviations: readonly MakerNormDeviation[]): ReviewItem[] {
  const items: ReviewItem[] = [];
  const station = (label: string) => `<b>${escape(STATION_WORD(label))}</b>`;
  const currentOf = (s: BlankStation, attribute: ReviewAttribute | null): string => {
    if (attribute === null) return "";
    if (attribute === "length") return inchesText(record.lengthMm);
    if (attribute === "deck_length") return record.deckLengthMm === null ? "" : inchesText(record.deckLengthMm);
    if (attribute === "volume") return record.volumeLitres === null ? "" : `${record.volumeLitres} L`;
    const value = attributeValue(s, attribute);
    return value === null ? "" : inchesText(value);
  };
  for (const s of record.stations) {
    for (const part of s.flag ? noteParts(s.flag) : []) {
      const note = readNote(part);
      if (note.kind === "convention") continue;
      if (note.kind === "units") {
        const cm = parseCmText(note.printedCm);
        const attribute: ReviewAttribute | null = isStationAttribute(note.attribute) ? note.attribute : note.attribute === "length" ? "length" : note.attribute === "volume" ? "volume" : null;
        const inch = parseInchesText(note.printedInch);
        // The alternative to what we used: the centimetre figure's inches when we took the inch, else the inch figure.
        const suggested = note.usedInch ? (cm === null ? "" : inchesText(centimetresToMm(cm))) : inch === null ? "" : inchesText(inchesToMm(inch));
        items.push({
          kind: "units",
          label: s.label,
          attribute,
          cmMm: cm === null || !isStationAttribute(note.attribute) ? undefined : centimetresToMm(cm),
          html: `${station(s.label)}, ${escape(note.attribute)}: the page prints ${escape(inchFigure(note.printedInch))} against ${escape(cmFigure(note.printedCm))}; we used ${escape(note.used)}.`,
          current: currentOf(s, attribute),
          suggested,
        });
      } else {
        const m = /^(rocker|thickness|width)\b/.exec(note.text);
        const attribute: ReviewAttribute | null =
          m && isStationAttribute(m[1]) ? m[1]
          : /Max Width/.test(note.text) ? "width"
          : /Max Thickness/.test(note.text) ? "thickness"
          : /tip-to-tip deck/.test(note.text) ? "deck_length"
          : /^thickness/.test(note.text) ? "thickness"
          : /^rocker/.test(note.text) ? "rocker"
          : /^width/.test(note.text) ? "width"
          : null;
        items.push({ kind: note.kind, label: s.label, attribute, html: `${station(s.label)}: ${escape(note.text)}.`, current: currentOf(s, attribute), suggested: "" });
      }
    }
    if ((s.label === "T0" || s.label === "N0") && s.widthMm !== null && s.widthMm < inchesToMm(1)) {
      const flag = s.flag ?? "";
      const text = /rounded nose/.test(flag)
        ? /catalog prints (1\/16")/.test(flag) ? 'the page prints 1/16" (we draw a round nose)' : "the page prints no width (we draw a round nose)"
        : /pointed nose/.test(flag) ? 'the page prints no width (we use 1" for the point)'
        : `the page prints ${figureText(s.widthMm)}`;
      items.push({ kind: "tip", label: s.label, attribute: "width", html: `${station(s.label)} width: ${escape(text)}.`, current: inchesText(s.widthMm), suggested: "" });
    }
  }
  for (const o of outliers) {
    if (o.vendor !== record.vendor || o.name !== record.name) continue;
    const trust = o.confidence === "high" ? 'stations 6" apart either side, so most likely a slip in the figure' : 'stations 12" or more apart either side, so worth a look, though our curve may be the one at fault';
    items.push({
      kind: "off",
      label: o.label,
      attribute: o.attribute,
      html: `${station(o.label)}, ${o.attribute}: the page prints ${escape(figureText(o.printedMm))}; the blank's other stations imply ${escape(figureText(o.impliedMm))}, ${escape(signedInchesText(o.residualMm))} off (${escape(trust)}).`,
      current: inchesText(o.printedMm),
      suggested: inchesText(o.impliedMm),
    });
  }
  for (const d of deviations) {
    if (d.vendor !== record.vendor || d.name !== record.name) continue;
    items.push({
      kind: "unusual",
      label: d.label,
      attribute: d.attribute,
      html: `${station(d.label)}, ${d.attribute}: the page prints ${escape(figureText(d.printedMm))}, ${(d.share * 100).toFixed(0)}% of the ${d.attribute === "rocker" ? "tip's" : "centre's"} where the maker's other blanks run near ${(d.typicalShare * 100).toFixed(0)}% (about ${escape(figureText(d.typicalMm))}).`,
      current: inchesText(d.printedMm),
      suggested: inchesText(d.typicalMm),
    });
  }
  return items;
}

/** The items grouped by kind, as the report and the review page list them. */
export function groupedItems(items: readonly ReviewItem[], render: (item: ReviewItem, index: number) => string): string {
  return KIND_ORDER.filter((kind) => items.some((item) => item.kind === kind))
    .map((kind) => `<h4>${escape(KIND_TITLE[kind])}</h4><ul>${items.map((item, index) => (item.kind === kind ? `<li>${render(item, index)}</li>` : "")).join("")}</ul>`)
    .join("");
}
