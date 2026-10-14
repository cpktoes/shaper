/**
 * BLANK OUTLIER CHECK — runs every blank in the catalogue the app holds through its own curve and
 * writes a page of the stations that sit off it (quick 261013-uoj; the founder, 2026-10-13: "run
 * through our database of all blanks and check if any points appear to be outliers … don't fix yet,
 * but let's find them and plot them in a dev window"). It reads and reports; it changes no number.
 *
 *   npx --no-install tsx --tsconfig ./tsconfig.json scripts/find-blank-outliers.ts [--out <dir>] [--z <n>]
 *
 * run from the repository root. (Nothing in package.json — no npm script, no dependency;
 * `--no-install` means npx can only run the tsx already in node_modules, never download one. No
 * database is involved: the catalogue is read from the committed CSVs under db/seed/blanks/ through
 * the tested reader, `lib/blanks/seed-files.ts` — the seed's own `--check` proves those are the rows
 * the database holds.)
 *
 * The maths is `lib/blanks/outliers.ts` (tested): leave-one-out on the live curve rule for every
 * interior station, scored per maker and attribute; and, as a weaker second signal, each station's
 * share of its anchor against the maker's norm, which also reaches the tips and centres.
 *
 * Output, in `--out` (default `public/__dev/`, which is gitignored, so a running dev server shows
 * the page at http://localhost:<port>/__dev/blank-outliers.html and nothing ships):
 * - `blank-outliers.html` — a self-contained page: both tables, then, for every blank named, the
 *   blank itself as the app builds it from the dims — its side view (bottom rocker and deck) and
 *   its outline from above, drawn 1:1 with `prepareBlank`'s own curves, the printed stations
 *   ticked and the flagged ones in red — above one row of three plots (rocker, thickness, width)
 *   with the live curve through all its stations, the printed stations as dots, and the flagged
 *   ones in red beside the hollow point the rest of the blank implies.
 * - `blank-outliers.json` — the same findings as data.
 * - `blank-gallery.html` — every blank in the catalogue drawn the same way (side view and outline,
 *   1:1), maker by maker, shortest first, with a link to its outlier block when it has one: for
 *   looking over the whole catalogue by eye, which is how the founder spots a curve that is not
 *   smooth in the first place.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { isPickable } from "@/lib/blanks/catalog";
import {
  BLANK_ATTRIBUTES,
  DEFAULT_OUTLIER_THRESHOLDS,
  attributeValue,
  findOutliers,
  liveAttributeCurve,
  makerNormDeviations,
  type BlankAttribute,
  type MakerNormDeviation,
  type OutlierStation,
} from "@/lib/blanks/outliers";
import { readSeedCatalog } from "@/lib/blanks/seed-files";
import { KNOWN_BLANK_VENDORS } from "@/lib/blanks/vendors";
import type { BlankRecord } from "@/lib/geometry/blank";
import { prepareBlank } from "@/lib/geometry/blank-fit";
import { formatInchesFraction, formatSignedInchesFraction, mm, mmToInches } from "@/lib/geometry/units";

function readArg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const OUT_DIR = path.resolve(process.cwd(), readArg("--out") ?? "public/__dev");
const Z = Number(readArg("--z") ?? DEFAULT_OUTLIER_THRESHOLDS.z);
if (!Number.isFinite(Z) || Z <= 0) throw new Error(`--z must be a positive number, not ${readArg("--z")}`);
const THRESHOLDS = { ...DEFAULT_OUTLIER_THRESHOLDS, z: Z };

const inchesText = (value: number) => formatInchesFraction(mm(value), 32);
const signedInchesText = (value: number) => formatSignedInchesFraction(mm(value), 32);
const escape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const blankId = (vendor: string, name: string) => `${vendor} ${name}`.replace(/[^A-Za-z0-9]+/g, "-");

/* -- one plot ------------------------------------------------------------------------------ */

const W = 340;
const H = 190;
const PAD = { left: 44, right: 12, top: 26, bottom: 30 };

interface Mark {
  label: string;
  printedMm: number;
  impliedMm: number | null;
  note: string;
}

/** One attribute's plot: the live curve through all printed stations, the stations as dots, the marked ones in red. */
function plot(record: BlankRecord, attribute: BlankAttribute, marks: readonly Mark[]): string {
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
  const sx = (x: number) => PAD.left + ((W - PAD.left - PAD.right) * x) / length;
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

const PAGE_CSS = `
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
  svg text { font: 11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; fill: #1d2a2a; } svg text.axis { font-size: 10px; fill: #6b7a78; } svg text.title { font-weight: 600; } svg text.red { fill: #b3261e; font-weight: 600; }
  svg .curve { fill: none; stroke: #1f5f5b; stroke-width: 1.5; } svg .dot { fill: #1d2a2a; } svg .dot.red { fill: #b3261e; } svg .implied { fill: #fff; stroke: #b3261e; stroke-width: 1.5; } svg .gap { stroke: #b3261e; stroke-width: 1; stroke-dasharray: 2 2; }
  ul.findings { margin: 6px 0 0; padding-left: 18px; } p.notes { margin: 6px 0 0; font-size: 12px; }
  p.how { max-width: 900px; }
`;

/* -- the blank as the app builds it ---------------------------------------------------------- */

const DRAW_W = 1040;
const DRAW_PAD = { left: 20, right: 20, top: 22, bottom: 26 };

/**
 * The blank drawn 1:1 from the same prepared curves every screen draws from: the side view (the
 * levelled bottom rocker, and the deck as that bottom plus the thickness) and the outline from above
 * (half the width either side of the stringer), sampled every half inch; every printed station
 * ticked and labelled, the flagged ones in red.
 */
function blankDrawings(record: BlankRecord, flagged: ReadonlySet<string>): string {
  const prepared = prepareBlank(record);
  const length = mmToInches(record.lengthMm);
  const scale = (DRAW_W - DRAW_PAD.left - DRAW_PAD.right) / length;
  const sx = (x: number) => DRAW_PAD.left + x * scale;
  const xs: number[] = [];
  for (let x = 0; x <= length + 1e-9; x += 0.5) xs.push(Math.min(x, length));
  const bottom = xs.map((x) => mmToInches(mm(prepared.rocker.sample(x * 25.4))));
  const deck = xs.map((x, i) => bottom[i] + mmToInches(mm(prepared.thickness.sample(x * 25.4))));
  const half = xs.map((x) => mmToInches(mm(prepared.width.sample(x * 25.4))) / 2);
  const stations = record.stations.map((s) => ({ label: s.label, x: mmToInches(s.fromTailMm) }));
  const ticks = (y0: number, y1: number, labelY: number) =>
    stations
      .map(
        (s) =>
          `<line x1="${sx(s.x).toFixed(1)}" y1="${y0.toFixed(1)}" x2="${sx(s.x).toFixed(1)}" y2="${y1.toFixed(1)}" class="tick${flagged.has(s.label) ? " red" : ""}"/><text x="${sx(s.x).toFixed(1)}" y="${labelY.toFixed(1)}" text-anchor="middle" class="axis${flagged.has(s.label) ? " red" : ""}">${escape(s.label)}</text>`,
      )
      .join("");

  // Side view: tail at the left, deck up; the levelled bottom's lowest point sits on the base line.
  const deckMax = Math.max(...deck);
  const sideH = DRAW_PAD.top + deckMax * scale + DRAW_PAD.bottom;
  const syS = (y: number) => DRAW_PAD.top + (deckMax - y) * scale;
  const sidePath =
    `M ${xs.map((x, i) => `${sx(x).toFixed(1)} ${syS(bottom[i]).toFixed(1)}`).join(" L ")}` +
    ` L ${[...xs].reverse().map((x, j) => `${sx(x).toFixed(1)} ${syS(deck[xs.length - 1 - j]).toFixed(1)}`).join(" L ")} Z`;
  const side = `<svg class="drawing" viewBox="0 0 ${DRAW_W} ${sideH.toFixed(0)}"><text x="${DRAW_PAD.left}" y="14" class="title">Side view, 1:1 — bottom rocker and deck as the app builds them</text><path d="${sidePath}" class="foam"/>${ticks(DRAW_PAD.top, sideH - DRAW_PAD.bottom, sideH - DRAW_PAD.bottom + 12)}</svg>`;

  // Top view: the outline either side of the stringer.
  const halfMax = Math.max(...half);
  const topH = DRAW_PAD.top + 2 * halfMax * scale + DRAW_PAD.bottom;
  const mid = DRAW_PAD.top + halfMax * scale;
  const topPath =
    `M ${xs.map((x, i) => `${sx(x).toFixed(1)} ${(mid - half[i] * scale).toFixed(1)}`).join(" L ")}` +
    ` L ${[...xs].reverse().map((x, j) => `${sx(x).toFixed(1)} ${(mid + half[xs.length - 1 - j] * scale).toFixed(1)}`).join(" L ")} Z`;
  const top = `<svg class="drawing" viewBox="0 0 ${DRAW_W} ${topH.toFixed(0)}"><text x="${DRAW_PAD.left}" y="14" class="title">From above, 1:1 — the outline from the printed widths</text><path d="${topPath}" class="foam"/><line x1="${sx(0).toFixed(1)}" y1="${mid.toFixed(1)}" x2="${sx(length).toFixed(1)}" y2="${mid.toFixed(1)}" class="stringer"/>${ticks(DRAW_PAD.top, topH - DRAW_PAD.bottom, topH - DRAW_PAD.bottom + 12)}</svg>`;
  return `<div class="drawings">${side}${top}</div>`;
}

/* -- the page ------------------------------------------------------------------------------ */

function offCurveRows(outliers: readonly OutlierStation[]): string {
  return outliers
    .map(
      (o) =>
        `<tr><td>${escape(o.vendor)}</td><td><a href="#${blankId(o.vendor, o.name)}">${escape(o.name)}</a></td><td>${escape(o.label)}</td><td>${o.attribute}</td><td class="num">${escape(inchesText(o.printedMm))}</td><td class="num">${escape(inchesText(o.impliedMm))}</td><td class="num">${escape(signedInchesText(o.residualMm))}</td><td class="num">${o.z.toFixed(1)}</td><td class="num muted">${o.others}</td></tr>`,
    )
    .join("\n");
}

function makerNormRows(deviations: readonly MakerNormDeviation[]): string {
  return deviations
    .map(
      (d) =>
        `<tr><td>${escape(d.vendor)}</td><td><a href="#${blankId(d.vendor, d.name)}">${escape(d.name)}</a></td><td>${escape(d.label)}</td><td>${d.attribute}</td><td class="num">${escape(inchesText(d.printedMm))}</td><td class="num">${escape(inchesText(d.typicalMm))}</td><td class="num">${(d.share * 100).toFixed(0)}% vs ${(d.typicalShare * 100).toFixed(0)}%</td><td class="num">${d.z.toFixed(1)}</td><td class="num muted">${d.groupSize}</td></tr>`,
    )
    .join("\n");
}

function page(
  catalogue: readonly BlankRecord[],
  outliers: readonly OutlierStation[],
  deviations: readonly MakerNormDeviation[],
  asked: number,
): string {
  const named = new Map<string, BlankRecord>();
  for (const o of outliers) named.set(`${o.vendor}\u0000${o.name}`, catalogue.find((r) => r.vendor === o.vendor && r.name === o.name)!);
  for (const d of deviations) named.set(`${d.vendor}\u0000${d.name}`, catalogue.find((r) => r.vendor === d.vendor && r.name === d.name)!);
  const perMaker = KNOWN_BLANK_VENDORS.map(
    (vendor) =>
      `<li><b>${escape(vendor)}</b>: ${catalogue.filter((r) => r.vendor === vendor).length} blanks, ${outliers.filter((o) => o.vendor === vendor).length} stations off their curve, ${deviations.filter((d) => d.vendor === vendor).length} unusual for the maker</li>`,
  );
  const blocks = [...named.values()]
    .sort((a, b) => a.vendor.localeCompare(b.vendor) || a.lengthMm - b.lengthMm)
    .map((record) => {
      const marksFor = (attribute: BlankAttribute): Mark[] => {
        const marks: Mark[] = [];
        for (const o of outliers) {
          if (o.vendor === record.vendor && o.name === record.name && o.attribute === attribute) {
            marks.push({ label: o.label, printedMm: o.printedMm, impliedMm: o.impliedMm, note: `${o.label} ${attribute}: printed ${inchesText(o.printedMm)}, the rest of the blank implies ${inchesText(o.impliedMm)} (${signedInchesText(o.residualMm)}, z ${o.z.toFixed(1)})` });
          }
        }
        for (const d of deviations) {
          if (d.vendor === record.vendor && d.name === record.name && d.attribute === attribute && !marks.some((m) => m.label === d.label)) {
            marks.push({ label: d.label, printedMm: d.printedMm, impliedMm: null, note: `${d.label} ${attribute}: printed ${inchesText(d.printedMm)}, ${(d.share * 100).toFixed(0)}% of its anchor where the maker's norm is ${(d.typicalShare * 100).toFixed(0)}% (z ${d.z.toFixed(1)})` });
          }
        }
        return marks;
      };
      const notes = [...new Set(
        record.stations
          .filter((s) => s.flag && [...outliers, ...deviations].some((f) => f.vendor === record.vendor && f.name === record.name && f.label === s.label))
          .map((s) => `${s.label}: ${s.flag}`),
      )];
      const findings = [...outliers.filter((o) => o.vendor === record.vendor && o.name === record.name).map((o) => `<li class="red">${escape(o.label)} ${o.attribute}: printed ${escape(inchesText(o.printedMm))}, the rest of the blank implies ${escape(inchesText(o.impliedMm))} (${escape(signedInchesText(o.residualMm))}, z ${o.z.toFixed(1)})</li>`),
        ...deviations.filter((d) => d.vendor === record.vendor && d.name === record.name).map((d) => `<li class="amber">${escape(d.label)} ${d.attribute}: printed ${escape(inchesText(d.printedMm))}, ${(d.share * 100).toFixed(0)}% of its anchor where this maker's norm is ${(d.typicalShare * 100).toFixed(0)}% (about ${escape(inchesText(d.typicalMm))}; z ${d.z.toFixed(1)})</li>`)];
      const flaggedLabels = new Set([...outliers, ...deviations].filter((f) => f.vendor === record.vendor && f.name === record.name).map((f) => f.label));
      return `<section class="blank" id="${blankId(record.vendor, record.name)}">
<h3>${escape(record.vendor)} ${escape(record.name)} <span class="muted">· ${escape(formatInchesFraction(record.lengthMm))} long · catalog page ${record.pdfPage}${isPickable(record) ? "" : " · not pickable"}</span></h3>
${isPickable(record) ? blankDrawings(record, flaggedLabels) : '<p class="muted">Not drawn: the app cannot fit this blank (a centre or tip thickness is missing).</p>'}
<div class="plots">${BLANK_ATTRIBUTES.map((attribute) => plot(record, attribute, marksFor(attribute))).join("")}</div>
<ul class="findings">${findings.join("")}</ul>
${notes.length ? `<p class="muted notes">Catalogue notes on these stations: ${notes.map(escape).join(" · ")}</p>` : ""}
</section>`;
    });
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Blank outlier check</title>
<style>${PAGE_CSS}</style></head><body>
<h1>Blank outlier check</h1>
<p class="muted">${escape(new Date().toISOString().slice(0, 10))} · ${catalogue.length} blanks read from the app's catalogue (the rows the database holds) · ${asked} interior stations asked · nothing changed</p>
<p class="how"><b>Off its own curve</b>: each interior station taken out in turn and the blank's curve drawn through the rest with the rule ROCKER draws with; the gap between the printed figure and that curve, scored against the maker's other stations (|z| ≥ ${Z}, and at least 1/16" for rocker and thickness, 1/8" for width). Tips and the thickest, widest or lowest station cannot be asked this way. <b>Unusual for the maker</b> is the weaker signal: a station's share of its centre (or of its tip, for rocker) against the same station on the maker's other blanks — it reaches tips and centres, but it also flags honest design, like a gun's narrow nose.</p>
<ul>${perMaker.join("")}</ul>
<h2>Off the blank's own curve — neighbours within 6" (${outliers.filter((o) => o.confidence === "high").length})</h2>
<p class="muted">Stations every 6" pin the curve between them well, so a station off it is most likely a slip in the figure. These are the ones to look at first.</p>
<table><thead><tr><th>Maker</th><th>Blank</th><th>Station</th><th>Attribute</th><th>Printed</th><th>Curve says</th><th>Off by</th><th>z</th><th>Others</th></tr></thead><tbody>
${offCurveRows(outliers.filter((o) => o.confidence === "high"))}
</tbody></table>
<h2>Off the blank's own curve — neighbours 12" or more apart (${outliers.filter((o) => o.confidence === "low").length})</h2>
<p class="muted">With stations this far apart the rule drawn without a station can miss a real nose kick or a blunt tip by as much as a misprint would, so each of these is a question to check against the page, not an answer.</p>
<table><thead><tr><th>Maker</th><th>Blank</th><th>Station</th><th>Attribute</th><th>Printed</th><th>Curve says</th><th>Off by</th><th>z</th><th>Others</th></tr></thead><tbody>
${offCurveRows(outliers.filter((o) => o.confidence === "low"))}
</tbody></table>
<h2>Unusual for the maker (${deviations.length})</h2>
<table><thead><tr><th>Maker</th><th>Blank</th><th>Station</th><th>Attribute</th><th>Printed</th><th>Maker's norm</th><th>Share</th><th>z</th><th>Blanks</th></tr></thead><tbody>
${makerNormRows(deviations)}
</tbody></table>
<h2>The blanks named, drawn</h2>
<p class="muted">Each blank first as the app builds it from the dims, 1:1 — side view (bottom rocker and deck) and outline from above — with every printed station ticked and the named ones in red. Under it, each attribute's curve: the line is the live curve through every printed station; the dots are the printed stations, red where a station is named above, with the hollow point where the rest of the blank implies it. Hover a red dot for the numbers.</p>
${blocks.join("\n")}
</body></html>
`;
}

/** Every blank drawn, maker by maker, shortest first. */
function gallery(catalogue: readonly BlankRecord[], named: ReadonlySet<string>): string {
  const makers = KNOWN_BLANK_VENDORS.map((vendor) => {
    const blanks = catalogue.filter((r) => r.vendor === vendor).sort((a, b) => a.lengthMm - b.lengthMm);
    const blocks = blanks.map((record) => {
      const key = `${record.vendor}\u0000${record.name}`;
      const link = named.has(key) ? ` · <a href="blank-outliers.html#${blankId(record.vendor, record.name)}">on the outlier page</a>` : "";
      const flagged = new Set(record.stations.filter((s) => s.flag).map((s) => s.label));
      return `<section class="blank" id="${blankId(record.vendor, record.name)}">
<h3>${escape(record.name)} <span class="muted">· ${escape(formatInchesFraction(record.lengthMm))} long · catalog page ${record.pdfPage}${isPickable(record) ? "" : " · not pickable"}${link}</span></h3>
${isPickable(record) ? blankDrawings(record, flagged) : '<p class="muted">Not drawn: the app cannot fit this blank (a centre or tip thickness is missing).</p>'}
${flagged.size ? `<p class="muted notes">Catalogue notes: ${record.stations.filter((s) => s.flag).map((s) => escape(`${s.label}: ${s.flag}`)).join(" · ")}</p>` : ""}
</section>`;
    });
    return `<h2 id="${blankId(vendor, "")}">${escape(vendor)} <span class="muted">(${blanks.length})</span></h2>\n${blocks.join("\n")}`;
  });
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Blank gallery</title>
<style>${PAGE_CSS}</style></head><body>
<h1>Blank gallery</h1>
<p class="muted">${escape(new Date().toISOString().slice(0, 10))} · every blank the app holds, drawn 1:1 from its own curves as ROCKER draws it: the side view (bottom rocker and deck) and the outline from above; printed stations ticked, stations with a catalogue note in red. Makers: ${KNOWN_BLANK_VENDORS.map((vendor) => `<a href="#${blankId(vendor, "")}">${escape(vendor)}</a>`).join(" · ")}. The <a href="blank-outliers.html">outlier page</a> has the numbers.</p>
${makers.join("\n")}
</body></html>
`;
}

function main(): void {
  const catalogue = readSeedCatalog();
  const outliers = findOutliers(catalogue, THRESHOLDS);
  const deviations = makerNormDeviations(catalogue, Z);
  const asked = catalogue.reduce((n, record) => n + record.stations.length, 0);
  mkdirSync(OUT_DIR, { recursive: true });
  const html = path.join(OUT_DIR, "blank-outliers.html");
  const json = path.join(OUT_DIR, "blank-outliers.json");
  const galleryHtml = path.join(OUT_DIR, "blank-gallery.html");
  writeFileSync(html, page(catalogue, outliers, deviations, asked));
  writeFileSync(galleryHtml, gallery(catalogue, new Set([...outliers, ...deviations].map((f) => `${f.vendor}\u0000${f.name}`))));
  writeFileSync(
    json,
    `${JSON.stringify(
      {
        generated: new Date().toISOString(),
        thresholds: THRESHOLDS,
        blanks: catalogue.length,
        offCurve: outliers.map((o) => ({ ...o, printedIn: mmToInches(o.printedMm), impliedIn: mmToInches(mm(o.impliedMm)), residualIn: mmToInches(mm(o.residualMm)) })),
        unusualForMaker: deviations.map((d) => ({ ...d, printedIn: mmToInches(d.printedMm), typicalIn: mmToInches(mm(d.typicalMm)) })),
      },
      null,
      2,
    )}\n`,
  );
  const high = outliers.filter((o) => o.confidence === "high");
  console.log(`blanks: ${catalogue.length}; off their own curve: ${outliers.length} (${high.length} between 6" stations); unusual for the maker: ${deviations.length}`);
  for (const vendor of KNOWN_BLANK_VENDORS) {
    console.log(`  ${vendor}: ${outliers.filter((o) => o.vendor === vendor).length} off curve (${outliers.filter((o) => o.vendor === vendor && o.confidence === "high").length} between 6" stations), ${deviations.filter((d) => d.vendor === vendor).length} unusual`);
  }
  for (const o of outliers.slice(0, 40)) {
    console.log(`  [${o.confidence}] ${o.vendor} ${o.name} ${o.label} ${o.attribute}: printed ${inchesText(o.printedMm)}, curve says ${inchesText(o.impliedMm)} (${signedInchesText(o.residualMm)}, z ${o.z.toFixed(1)})`);
  }
  console.log(`wrote ${path.relative(process.cwd(), html)}, ${path.relative(process.cwd(), json)} and ${path.relative(process.cwd(), galleryHtml)}`);
}

main();
