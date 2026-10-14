/**
 * CATALOG NOTES FOR EACH BLANK MAKER — one report per maker, for the founder to send them, saying
 * where their catalog's own numbers disagree and where a figure looks off (the founder, 2026-10-14:
 * "downloads that I can send to each blank mfg for them to potentially update their catalogs …
 * show them where cm/inches don't match and where values appear to be off … flag all T0 and N0
 * that are < 1""). It reads and reports; it changes no number.
 *
 *   npx --no-install tsx --tsconfig ./tsconfig.json scripts/make-catalog-reports.ts [--out <dir>] [--no-pdf]
 *
 * run from the repository root. (Nothing in package.json — no npm script, no dependency beyond the
 * Playwright already installed for the browser tests, whose Chromium prints the PDFs; `--no-install`
 * means npx can only run the tsx already in node_modules, never download one. No database is
 * involved: the catalogue is read from the committed CSVs under db/seed/blanks/ through the tested
 * reader, `lib/blanks/seed-files.ts`.)
 *
 * What each report holds, in the maker's own terms (their blank names and page numbers):
 * - A. Inches and centimetres that disagree — read from the catalogue files' own notes, which record
 *   every place a page's inch figure and centimetre figure said different things and which we used.
 * - B. Figures that sit off the curve of the blank's other stations — the outlier check
 *   (`lib/blanks/outliers.ts`): each station read against the curve through the rest of its blank,
 *   with how far off and how much to trust the reading; the stations unusual for the maker; and the
 *   notes that call a figure a likely misprint.
 * - C. Tip widths under an inch — every nose or tail tip printed narrower than 1", or not printed.
 * - D. A page's headline against its stations — where a Max Width or Max Thickness line disagrees
 *   with the station it describes.
 * - E. Figures not printed or not readable.
 * - F. Every blank mentioned, drawn as the app builds it from the figures (nose left, 1:1, every
 *   printed station a dot with its figure, a named station in red).
 *
 * Output, in `--out` (default `public/__dev/reports/`, gitignored with the rest of `public/__dev/`):
 * `<maker>-catalog-notes.html` and, unless `--no-pdf`, `<maker>-catalog-notes.pdf` (Letter, landscape).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";
import { isPickable } from "@/lib/blanks/catalog";
import { findOutliers, makerNormDeviations, type MakerNormDeviation, type OutlierStation } from "@/lib/blanks/outliers";
import { readSeedCatalog } from "@/lib/blanks/seed-files";
import { KNOWN_BLANK_VENDORS, type BlankVendor } from "@/lib/blanks/vendors";
import type { BlankRecord, BlankStation } from "@/lib/geometry/blank";
import { formatInchesFraction, inchesToMm, mmToInches } from "@/lib/geometry/units";
import { PAGE_CSS, blankDrawings, blankId, escape, inchesText, marksOf, signedInchesText } from "./blank-report-shared";

function readArg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}
const OUT_DIR = path.resolve(process.cwd(), readArg("--out") ?? "public/__dev/reports");
const WRITE_PDF = !process.argv.includes("--no-pdf");

/** Which edition of each maker's catalog the figures were read from, named the way the maker would. */
const EDITIONS: Record<BlankVendor, string> = {
  "US Blanks": "the US Blanks catalog, letter size, June 2025 (v2)",
  "Arctic Foam": "the Arctic Foam 2024 catalog",
  "Marko Foam": "the Marko Foam 2026 catalog",
  "Millennium Foam": "the Millennium Foam Poly & EPS Blank Catalog 2024 (VR 9.27)",
};
const FILE_STEM: Record<BlankVendor, string> = {
  "US Blanks": "us-blanks",
  "Arctic Foam": "arctic-foam",
  "Marko Foam": "marko-foam",
  "Millennium Foam": "millennium-foam",
};

/* -- the catalogue files' own notes, sorted into the report's sections ---------------------- */

type Note =
  | { kind: "units"; attribute: string; printedInch: string; printedCm: string; used: string }
  | { kind: "headline"; text: string }
  | { kind: "misprint"; text: string }
  | { kind: "unprinted"; text: string }
  | { kind: "tip"; text: string }
  | { kind: "convention" };

/** Splits a row's note into its parts — one sentence per figure — without cutting inside a sentence. */
function noteParts(flag: string): string[] {
  return flag
    .split(/;\s(?=(?:rocker|thickness|width|length|volume|catalog|the catalog|only |moved |wake|rectangular|thick |sister|SUP ))/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

/** Reads one part of a note into the section it belongs to. */
function readNote(part: string): Note {
  let m = /^(rocker|thickness|width|length|volume): catalog prints (.+?) but (.+?); used the (inch|cm|cubic-foot) value(?: \(([^)]+)\))?/.exec(part);
  if (m) {
    const used = m[4] === "inch" ? "the inch figure" : m[4] === "cm" ? `the centimetre figure${m[5] ? ` (${m[5]})` : ""}` : `the cubic-foot figure${m[5] ? ` (${m[5]})` : ""}`;
    return { kind: "units", attribute: m[1], printedInch: m[2], printedCm: m[3].replace(/ here$/, ""), used };
  }
  m = /^(width|thickness|rocker): catalog cm \((.+?)\) disagrees with inch \((.+?)\); used inch/.exec(part);
  if (m) return { kind: "units", attribute: m[1], printedInch: m[3], printedCm: m[2], used: "the inch figure" };
  m = /^width: catalog cm \((.+?)\) is a typo for (.+?) \((.*)\)/.exec(part);
  if (m) return { kind: "units", attribute: "width", printedInch: `the inch figure and the summary box agree`, printedCm: `${m[1]} cm`, used: `${m[2]} cm, which the inch figure and the summary box give` };
  if (/^catalog's Max (Width|Thickness) line prints/.test(part) || /thicker than its own stated max/.test(part) || /^length: catalog prints a tip-to-tip deck/.test(part)) {
    return { kind: "headline", text: part };
  }
  if (/may be a misprint|likely a catalog typo|missing digits|rocker set to .* to match|in both units/.test(part)) return { kind: "misprint", text: part };
  if (/^thickness illegible in catalog/.test(part) || /not printed in catalog$/.test(part) || /^width not printed at this station/.test(part) || /^the catalog draws only/.test(part)) {
    if (/rounded nose, not printed in catalog$/.test(part)) return { kind: "convention" }; // tips are their own section
    return { kind: "unprinted", text: part };
  }
  if (/^width: catalog prints 1\/16" at the tail tip/.test(part) || /^width 0: rounded nose — catalog prints/.test(part)) return { kind: "tip", text: part };
  if (/^width 1": pointed nose/.test(part) || /^moved from drawn position/.test(part) || /^only thickness differs/.test(part) || /^thick version of/.test(part) || /^rectangular block blank/.test(part) || /^SUP blank is a constant-width block/.test(part) || /^width measured 3" back/.test(part) || /^wake-surf rocker as drawn/.test(part) || /^width [\d.]+ (\(widest point.*\) )?assigned to center/.test(part) || /^catalog prints [\d.]+$/.test(part) || /^the \d.*page \d+ has/.test(part) || /^thickness: prints "/.test(part) || /^sister/.test(part)) {
    return { kind: "convention" };
  }
  return { kind: "misprint", text: part }; // anything unrecognised is shown rather than lost
}

const ATTRIBUTE_WORD: Record<string, string> = { rocker: "rocker", thickness: "thickness", width: "width", length: "length", volume: "volume" };
const STATION_WORD = (label: string) => (label === "C" ? "centre" : label.startsWith("N") ? `${label.slice(1)}" from the nose` : `${label.slice(1)}" from the tail`).replace(/^0" from the (nose|tail)$/, "$1 tip");

/* -- one maker's report --------------------------------------------------------------------- */

interface Row {
  record: BlankRecord;
  station: BlankStation;
}

function report(vendor: BlankVendor, catalogue: readonly BlankRecord[], outliers: readonly OutlierStation[], deviations: readonly MakerNormDeviation[]): string {
  const blanks = catalogue.filter((r) => r.vendor === vendor).sort((a, b) => a.lengthMm - b.lengthMm);
  const rows: Row[] = blanks.flatMap((record) => record.stations.map((station) => ({ record, station })));
  const notes = rows.flatMap((row) => (row.station.flag ? noteParts(row.station.flag).map((part) => ({ row, note: readNote(part) })) : []));
  const units = notes.filter((n): n is { row: Row; note: Extract<Note, { kind: "units" }> } => n.note.kind === "units");
  const headline = notes.filter((n): n is { row: Row; note: Extract<Note, { kind: "headline" }> } => n.note.kind === "headline");
  const misprints = notes.filter((n): n is { row: Row; note: Extract<Note, { kind: "misprint" }> } => n.note.kind === "misprint");
  const unprinted = notes.filter((n): n is { row: Row; note: Extract<Note, { kind: "unprinted" }> } => n.note.kind === "unprinted");
  const tipNotes = notes.filter((n): n is { row: Row; note: Extract<Note, { kind: "tip" }> } => n.note.kind === "tip");
  const off = outliers.filter((o) => o.vendor === vendor);
  const unusual = deviations.filter((d) => d.vendor === vendor);
  const narrowTips = rows.filter(
    (row) => (row.station.label === "T0" || row.station.label === "N0") && row.station.widthMm !== null && row.station.widthMm < inchesToMm(1),
  );

  const blankCell = (record: BlankRecord) => `<a href="#${blankId(record.vendor, record.name)}">${escape(record.name)}</a> <span class="muted">p.${record.pdfPage}</span>`;
  const mentioned = new Map<string, BlankRecord>();
  const mention = (record: BlankRecord) => mentioned.set(`${record.vendor}\u0000${record.name}`, record);
  for (const n of [...units, ...headline, ...misprints, ...unprinted, ...tipNotes]) mention(n.row.record);
  for (const row of narrowTips) mention(row.record);
  for (const o of off) mention(blanks.find((r) => r.name === o.name)!);
  for (const d of unusual) mention(blanks.find((r) => r.name === d.name)!);

  const sectionA = units.length
    ? `<table><thead><tr><th>Blank</th><th>Station</th><th>Figure</th><th>Inches printed</th><th>Centimetres printed</th><th>We used</th></tr></thead><tbody>
${units.map(({ row, note }) => `<tr><td>${blankCell(row.record)}</td><td>${escape(STATION_WORD(row.station.label))}</td><td>${escape(ATTRIBUTE_WORD[note.attribute] ?? note.attribute)}</td><td class="num">${escape(note.printedInch)}</td><td class="num">${escape(note.printedCm)}</td><td>${escape(note.used)}</td></tr>`).join("\n")}
</tbody></table>`
    : `<p class="muted">None found${vendor === "Marko Foam" ? " — the catalog prints inches only" : ""}.</p>`;

  const offRows = (list: readonly OutlierStation[]) =>
    list
      .map((o) => `<tr><td>${blankCell(blanks.find((r) => r.name === o.name)!)}</td><td>${escape(STATION_WORD(o.label))}</td><td>${o.attribute}</td><td class="num">${escape(inchesText(o.printedMm))}</td><td class="num">${escape(inchesText(o.impliedMm))}</td><td class="num">${escape(signedInchesText(o.residualMm))}</td></tr>`)
      .join("\n");
  const high = off.filter((o) => o.confidence === "high");
  const low = off.filter((o) => o.confidence === "low");
  const sectionB = `
${high.length ? `<h3>Between stations 6" apart — most likely a slip in the figure</h3>
<table><thead><tr><th>Blank</th><th>Station</th><th>Figure</th><th>Printed</th><th>The other stations imply</th><th>Difference</th></tr></thead><tbody>
${offRows(high)}
</tbody></table>` : ""}
${low.length ? `<h3>Between stations 12" or more apart — worth a look, though the curve may be the one at fault</h3>
<table><thead><tr><th>Blank</th><th>Station</th><th>Figure</th><th>Printed</th><th>The other stations imply</th><th>Difference</th></tr></thead><tbody>
${offRows(low)}
</tbody></table>` : ""}
${unusual.length ? `<h3>Unusual for this catalog at that station</h3>
<p class="muted">The station as a share of the blank's centre (or of its tip, for rocker) compared with the same station on your other blanks. Some of these will be design; they are listed so you can tell us which.</p>
<table><thead><tr><th>Blank</th><th>Station</th><th>Figure</th><th>Printed</th><th>Your other blanks would put it near</th></tr></thead><tbody>
${unusual.map((d) => `<tr><td>${blankCell(blanks.find((r) => r.name === d.name)!)}</td><td>${escape(STATION_WORD(d.label))}</td><td>${d.attribute}</td><td class="num">${escape(inchesText(d.printedMm))}</td><td class="num">${escape(inchesText(d.typicalMm))}</td></tr>`).join("\n")}
</tbody></table>` : ""}
${misprints.length ? `<h3>Figures we read as likely misprints, and other notes from our read of the pages</h3>
<ul>${misprints.map(({ row, note }) => `<li>${blankCell(row.record)}, ${escape(STATION_WORD(row.station.label))}: ${escape(note.text)}</li>`).join("")}</ul>` : ""}
${!high.length && !low.length && !unusual.length && !misprints.length ? '<p class="muted">None found.</p>' : ""}`;

  const tipText = (row: Row) => {
    const flag = row.station.flag ?? "";
    if (/rounded nose, not printed in catalog$/.test(flag) || /rounded nose — catalog prints/.test(flag)) return /catalog prints (1\/16")/.test(flag) ? '1/16" printed (we draw a round nose)' : "not printed (we draw a round nose)";
    if (/pointed nose, not printed/.test(flag)) return 'not printed (we use 1" for the point)';
    return `${inchesText(row.station.widthMm!)} printed`;
  };
  const sectionC = narrowTips.length || tipNotes.length
    ? `<table><thead><tr><th>Blank</th><th>Tip</th><th>Width</th></tr></thead><tbody>
${narrowTips.map((row) => `<tr><td>${blankCell(row.record)}</td><td>${row.station.label === "N0" ? "nose" : "tail"}</td><td>${escape(tipText(row))}</td></tr>`).join("\n")}
${tipNotes.map(({ row, note }) => `<tr><td>${blankCell(row.record)}</td><td>${row.station.label === "N0" ? "nose" : "tail"}</td><td>${escape(note.text)}</td></tr>`).join("\n")}
</tbody></table>`
    : '<p class="muted">None.</p>';

  const sectionD = headline.length
    ? `<ul>${headline.map(({ row, note }) => `<li>${blankCell(row.record)}, ${escape(STATION_WORD(row.station.label))}: ${escape(note.text)}</li>`).join("")}</ul>`
    : '<p class="muted">None found.</p>';
  const sectionE = unprinted.length
    ? `<table><thead><tr><th>Blank</th><th>Station</th><th>Note</th></tr></thead><tbody>
${unprinted.map(({ row, note }) => `<tr><td>${blankCell(row.record)}</td><td>${escape(STATION_WORD(row.station.label))}</td><td>${escape(note.text)}</td></tr>`).join("\n")}
</tbody></table>`
    : '<p class="muted">None.</p>';

  const drawn = [...mentioned.values()]
    .sort((a, b) => a.lengthMm - b.lengthMm)
    .map((record) => {
      const marks = marksOf(record, outliers, deviations);
      for (const { row, note } of [...units, ...misprints]) {
        if (row.record !== record) continue;
        const attribute = "attribute" in note ? note.attribute : null;
        for (const key of ["rocker", "thickness", "width"] as const) {
          if (attribute && attribute !== key) continue;
          const mark = marks[key].get(row.station.label);
          if (mark) mark.flagged = true;
        }
      }
      return `<section class="blank" id="${blankId(record.vendor, record.name)}">
<h3>${escape(record.name)} <span class="muted">· ${escape(formatInchesFraction(record.lengthMm))} long · catalog page ${record.pdfPage}</span></h3>
${isPickable(record) ? blankDrawings(record, marks) : '<p class="muted">Not drawn: the page prints no thickness at the centre or at a tip, so we cannot build this blank.</p>'}
</section>`;
    });

  const today = new Date().toISOString().slice(0, 10);
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Notes on the ${escape(vendor)} catalog — Shaper Assistant</title>
<style>${PAGE_CSS}
  @page { size: letter landscape; margin: 0.5in 0.5in 0.6in; }
  @media print { body { margin: 0; } section.blank { break-inside: avoid; } tr { break-inside: avoid; } h2, h3 { break-after: avoid; } }
  .cover p { max-width: 900px; }
</style></head><body>
<div class="cover">
<h1>Notes on the ${escape(vendor)} catalog</h1>
<p class="muted">From Shaper Assistant (shaperassistant.com) · ${escape(today)}</p>
<p>We built every blank in ${escape(EDITIONS[vendor])} into our shaping app from the station figures printed on its pages — ${blanks.length} blanks, ${rows.length} printed stations. Shapers pick a blank in the app and read the rocker and foil of their board off the foam, so every figure matters to them. In reading the pages we noted a few places where a page's own numbers disagree with each other, where a figure sits off the curve the blank's other stations draw, and tip widths under an inch. We may have misread a page, so we'd be grateful for a correction either way. Page numbers are the catalog PDF's; stations are named as the page prints them (12" from the nose, centre, 6" from the tail, …).</p>
</div>
<h2>A. Inches and centimetres that disagree (${units.length})</h2>
<p class="muted">Each station prints an inch figure with a centimetre figure under it. These are the stations where the two say different things; the last column says which one we took.</p>
${sectionA}
<h2>B. Figures that sit off the curve of the blank's other stations (${off.length + unusual.length + misprints.length})</h2>
<p class="muted">We drew each blank's rocker, thickness and width through its printed stations with the curve our app uses, then took each station out in turn and read what the rest of the blank implied there. These are the stations furthest off that curve.</p>
${sectionB}
<h2>C. Tip widths under an inch (${narrowTips.length + tipNotes.length})</h2>
<p class="muted">A nose or tail tip printed narrower than 1", or not printed at all. We draw a tip printed 0 as a round nose; a tip printed 1/16" draws as a point.</p>
${sectionC}
<h2>D. A page's headline against its stations (${headline.length})</h2>
${sectionD}
<h2>E. Figures not printed or not readable (${unprinted.length})</h2>
${sectionE}
<h2>F. The blanks mentioned, drawn from the printed figures (${mentioned.size})</h2>
<p class="muted">Nose to the left, 1:1. The side view is the bottom rocker with the deck on top of it; the outline is from the widths. Every printed station is a dot with its figure; a station mentioned above is red, and where the other stations imply a different figure it is shown beside a hollow dot with an arrow.</p>
${drawn.join("\n")}
</body></html>
`;
}

async function main(): Promise<void> {
  const catalogue = readSeedCatalog();
  const outliers = findOutliers(catalogue);
  const deviations = makerNormDeviations(catalogue);
  mkdirSync(OUT_DIR, { recursive: true });
  const browser = WRITE_PDF ? await chromium.launch() : null;
  try {
    for (const vendor of KNOWN_BLANK_VENDORS) {
      const html = report(vendor, catalogue, outliers, deviations);
      const stem = path.join(OUT_DIR, `${FILE_STEM[vendor]}-catalog-notes`);
      writeFileSync(`${stem}.html`, html);
      let pdfNote = "";
      if (browser) {
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: "load" });
        await page.pdf({
          path: `${stem}.pdf`,
          format: "Letter",
          landscape: true,
          printBackground: true,
          margin: { top: "0.5in", right: "0.5in", bottom: "0.6in", left: "0.5in" },
          displayHeaderFooter: true,
          headerTemplate: "<span></span>",
          footerTemplate: `<div style="font-size:8px;width:100%;text-align:center;color:#6b7a78;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">Notes on the ${escape(vendor)} catalog — Shaper Assistant · page <span class="pageNumber"></span> of <span class="totalPages"></span></div>`,
        });
        await page.close();
        pdfNote = ` and ${path.relative(process.cwd(), `${stem}.pdf`)}`;
      }
      console.log(`${vendor}: wrote ${path.relative(process.cwd(), `${stem}.html`)}${pdfNote}`);
    }
  } finally {
    await browser?.close();
  }
  // Coverage: every note part must land in a section or be a known convention — list the ones read as "misprint" by default.
  const unrecognised = new Set<string>();
  for (const record of catalogue) {
    for (const station of record.stations) {
      if (!station.flag) continue;
      for (const part of noteParts(station.flag)) {
        const note = readNote(part);
        if (note.kind === "misprint" && !/may be a misprint|likely a catalog typo|missing digits|rocker set to .* to match|in both units/.test(part)) unrecognised.add(part);
      }
    }
  }
  if (unrecognised.size) {
    console.log(`note parts shown under "likely misprints" because nothing else matched them (${unrecognised.size}):`);
    for (const part of unrecognised) console.log(`  ${part}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
