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
import type { BlankRecord } from "@/lib/geometry/blank";
import { prepareBlank } from "@/lib/geometry/blank-fit";
import { formatInchesFraction, formatSignedInchesFraction, mm, mmToCentimetres, mmToInches } from "@/lib/geometry/units";

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

