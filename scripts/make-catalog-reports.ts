/**
 * CATALOG NOTES FOR EACH BLANK MAKER — one report per maker, for the founder to send them, saying
 * where their catalog's own numbers disagree and where a figure looks off (the founder, 2026-10-14:
 * "downloads that I can send to each blank mfg for them to potentially update their catalogs …
 * show them where cm/inches don't match and where values appear to be off … flag all T0 and N0
 * that are < 1""; then "move the notes to the drawn boards so it's more visual … include cm as
 * decimals always, and give inches in decimals and rounded to nearest 1/16th inch"). It reads and
 * reports; it changes no number.
 *
 *   npx --no-install tsx --tsconfig ./tsconfig.json scripts/make-catalog-reports.ts [--out <dir>] [--no-pdf]
 *
 * run from the repository root. (Nothing in package.json — no npm script, no dependency beyond the
 * Playwright already installed for the browser tests, whose Chromium prints the PDFs; `--no-install`
 * means npx can only run the tsx already in node_modules, never download one. No database is
 * involved: the catalogue is read from the committed CSVs under db/seed/blanks/ through the tested
 * reader, `lib/blanks/seed-files.ts`.)
 *
 * The report is one block per blank that has anything to say about it, shortest first: the blank
 * drawn as the app builds it from the figures (nose left, 1:1, every printed station a dot with its
 * figure; a station in question in red; a hollow circle where the other stations imply a different
 * figure, a hollow diamond where the page's centimetre figure says something else), and under it
 * that blank's notes, grouped: inches and centimetres that disagree; figures off the curve of the
 * blank's other stations (the outlier check, `lib/blanks/outliers.ts`, with how much to trust the
 * reading); stations unusual for the maker; likely misprints; tip widths under an inch or not
 * printed; a headline line against its station; figures not printed or unreadable. Every figure is
 * given three ways — nearest 1/16", decimal inches, decimal centimetres — and a page's centimetre
 * figure is shown with its inch equivalent. A summary of counts opens the report.
 *
 * Output, in `--out` (default `public/__dev/reports/`, gitignored with the rest of `public/__dev/`):
 * `<maker>-catalog-notes.html` and, unless `--no-pdf`, `<maker>-catalog-notes.pdf` (Letter, landscape).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";
import { isPickable } from "@/lib/blanks/catalog";
import { findOutliers, makerNormDeviations, type BlankAttribute, type MakerNormDeviation, type OutlierStation } from "@/lib/blanks/outliers";
import { readSeedCatalog } from "@/lib/blanks/seed-files";
import { KNOWN_BLANK_VENDORS, type BlankVendor } from "@/lib/blanks/vendors";
import type { BlankRecord } from "@/lib/geometry/blank";
import { centimetresToMm, inchesToMm, mmToInches } from "@/lib/geometry/units";
import { PAGE_CSS, blankDrawings, blankId, escape, figureText, inchesText, marksOf, signedInchesText } from "./blank-report-shared";

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

/* -- reading the catalogue files' own notes ------------------------------------------------- */

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
    .split(/;\s(?=(?:rocker|thickness|width|length|volume|catalog's|only |moved |wake|rectangular|thick |sister|SUP |nose and tail swapped))/)
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
  if (m) return { kind: "units", attribute: "width", printedInch: "the inch figure and the summary box agree", printedCm: `${m[1]} cm`, used: `${m[2]} cm, which the inch figure and the summary box give` };
  if (/^catalog's Max (Width|Thickness) line prints/.test(part) || /thicker than its own stated max/.test(part) || /^length: catalog prints a tip-to-tip deck/.test(part)) {
    return { kind: "headline", text: part };
  }
  if (/may be a misprint|likely a catalog typo|missing digits|rocker set to .* to match|in both units/.test(part)) return { kind: "misprint", text: part };
  if (/^thickness illegible in catalog/.test(part) || /not printed in catalog$/.test(part) || /^width not printed at this station/.test(part) || /^the catalog draws only/.test(part)) {
    if (/rounded nose, not printed in catalog$/.test(part)) return { kind: "convention" }; // tips are their own kind
    return { kind: "unprinted", text: part };
  }
  if (/^width: catalog prints 1\/16" at the tail tip/.test(part) || /^width 0: rounded nose — catalog prints/.test(part)) return { kind: "tip", text: part };
  if (/^width 1": pointed nose/.test(part) || /^moved from drawn position/.test(part) || /^only thickness differs/.test(part) || /^thick version of/.test(part) || /^rectangular block blank/.test(part) || /^SUP blank is a constant-width block/.test(part) || /^width measured 3" back/.test(part) || /^wake-surf rocker as drawn/.test(part) || /^nose and tail swapped/.test(part) || /^width [\d.]+ (\(widest point.*\) )?assigned to center/.test(part) || /^catalog prints [\d.]+$/.test(part) || /^the \d.*page \d+ has/.test(part) || /^thickness: prints "/.test(part) || /^sister/.test(part)) {
    return { kind: "convention" };
  }
  return { kind: "misprint", text: part }; // anything unrecognised is shown rather than lost
}

/** `6'2 1/8"`, `9'8"`, `2 13/16"`, `17/32"`, `"3 1/6""` → inches, or null when it is not a length. */
function parseInchesText(text: string): number | null {
  const clean = text.replace(/[”“]/g, '"').replace(/^"+|"+$/g, "").trim();
  let m = /^(\d+)'\s*(\d+)?\s*(?:(\d+)\/(\d+))?"?/.exec(clean);
  if (m) return Number(m[1]) * 12 + (m[2] ? Number(m[2]) : 0) + (m[3] ? Number(m[3]) / Number(m[4]) : 0);
  m = /^(\d+)?\s*(?:(\d+)\/(\d+))?"?$/.exec(clean.replace(/"\s*\(.*$/, '"'));
  if (m && (m[1] !== undefined || m[2] !== undefined)) return (m[1] ? Number(m[1]) : 0) + (m[2] ? Number(m[2]) / Number(m[3]) : 0);
  return null;
}
/** `5.08 cm here`, `274.32 cm (9'0")`, `29.86 cm = 11.756 in`, `69.05` → centimetres, or null (litres, cubic feet). */
function parseCmText(text: string): number | null {
  if (/\bL\b|ft3/.test(text)) return null;
  const m = /([\d.]+)\s*(?:cm|$)/.exec(text);
  return m ? Number(m[1]) : null;
}
/** The three-way text for a printed figure, or the text itself when it is not a length. */
function inchFigure(text: string): string {
  const inches = parseInchesText(text);
  if (inches === null) return text;
  const three = figureText(inchesToMm(inches));
  const printed = text.replace(/[”“]/g, '"');
  // The printed fraction already is a sixteenth: no need to say it twice.
  return three.startsWith(`${printed} `) ? three : `${printed} = ${three}`;
}
function cmFigure(text: string): string {
  const cm = parseCmText(text);
  return cm === null ? text : `${cm.toFixed(2)} cm (= ${inchesText(centimetresToMm(cm))}, ${mmToInches(centimetresToMm(cm)).toFixed(2)} in)`;
}

const STATION_WORD = (label: string) => (label === "C" ? "centre" : label.startsWith("N") ? `${label.slice(1)}" from the nose` : `${label.slice(1)}" from the tail`).replace(/^0" from the (nose|tail)$/, "$1 tip");

/* -- one maker's report --------------------------------------------------------------------- */

type ItemKind = "units" | "off" | "unusual" | "misprint" | "tip" | "headline" | "unprinted";
const KIND_TITLE: Record<ItemKind, string> = {
  units: "Inches and centimetres that disagree",
  off: "Off the curve of the blank's other stations",
  unusual: "Unusual for this catalog at that station",
  misprint: "Likely misprints, and other notes from our read of the page",
  tip: "Tip widths under an inch",
  headline: "The page's headline against its station",
  unprinted: "Not printed, or not readable",
};
const KIND_ORDER: ItemKind[] = ["units", "off", "unusual", "misprint", "tip", "headline", "unprinted"];

interface Item {
  kind: ItemKind;
  label: string;
  html: string;
  attribute?: BlankAttribute;
  cmMm?: number;
}

function report(vendor: BlankVendor, catalogue: readonly BlankRecord[], outliers: readonly OutlierStation[], deviations: readonly MakerNormDeviation[]): string {
  const blanks = catalogue.filter((r) => r.vendor === vendor).sort((a, b) => a.lengthMm - b.lengthMm);
  const stationCount = blanks.reduce((n, r) => n + r.stations.length, 0);
  const items = new Map<BlankRecord, Item[]>();
  const add = (record: BlankRecord, item: Item) => {
    const list = items.get(record);
    if (list) list.push(item);
    else items.set(record, [item]);
  };
  const station = (label: string) => `<b>${escape(STATION_WORD(label))}</b>`;
  const isAttribute = (word: string): word is BlankAttribute => word === "rocker" || word === "thickness" || word === "width";

  for (const record of blanks) {
    for (const s of record.stations) {
      // The catalogue files' own notes.
      for (const part of s.flag ? noteParts(s.flag) : []) {
        const note = readNote(part);
        if (note.kind === "convention") continue;
        if (note.kind === "units") {
          const cm = parseCmText(note.printedCm);
          add(record, {
            kind: "units",
            label: s.label,
            attribute: isAttribute(note.attribute) ? note.attribute : undefined,
            cmMm: cm === null || !isAttribute(note.attribute) ? undefined : centimetresToMm(cm),
            html: `${station(s.label)}, ${escape(note.attribute)}: the page prints ${escape(inchFigure(note.printedInch))} against ${escape(cmFigure(note.printedCm))}; we used ${escape(note.used)}.`,
          });
        } else {
          add(record, { kind: note.kind, label: s.label, html: `${station(s.label)}: ${escape(note.text)}.` });
        }
      }
      // Tips under an inch.
      if ((s.label === "T0" || s.label === "N0") && s.widthMm !== null && s.widthMm < inchesToMm(1)) {
        const flag = s.flag ?? "";
        const text = /rounded nose/.test(flag)
          ? /catalog prints (1\/16")/.test(flag) ? 'the page prints 1/16" (we draw a round nose)' : "the page prints no width (we draw a round nose)"
          : /pointed nose/.test(flag) ? 'the page prints no width (we use 1" for the point)'
          : `the page prints ${figureText(s.widthMm)}`;
        add(record, { kind: "tip", label: s.label, html: `${station(s.label)} width: ${escape(text)}.` });
      }
    }
    // The outlier check.
    for (const o of outliers) {
      if (o.vendor !== vendor || o.name !== record.name) continue;
      const trust = o.confidence === "high" ? "stations 6\" apart either side, so most likely a slip in the figure" : "stations 12\" or more apart either side, so worth a look, though our curve may be the one at fault";
      add(record, {
        kind: "off",
        label: o.label,
        attribute: o.attribute,
        html: `${station(o.label)}, ${o.attribute}: the page prints ${escape(figureText(o.printedMm))}; the blank's other stations imply ${escape(figureText(o.impliedMm))}, ${escape(signedInchesText(o.residualMm))} off (${escape(trust)}).`,
      });
    }
    for (const d of deviations) {
      if (d.vendor !== vendor || d.name !== record.name) continue;
      add(record, {
        kind: "unusual",
        label: d.label,
        attribute: d.attribute,
        html: `${station(d.label)}, ${d.attribute}: the page prints ${escape(figureText(d.printedMm))}, ${(d.share * 100).toFixed(0)}% of the ${d.attribute === "rocker" ? "tip's" : "centre's"} where your other blanks run near ${(d.typicalShare * 100).toFixed(0)}% (about ${escape(figureText(d.typicalMm))}); some of these will be design — tell us which.`,
      });
    }
  }

  // Counts for the summary.
  const counts = Object.fromEntries(KIND_ORDER.map((kind) => [kind, 0])) as Record<ItemKind, number>;
  for (const list of items.values()) for (const item of list) counts[item.kind]++;
  const mentioned = [...items.keys()].sort((a, b) => a.lengthMm - b.lengthMm);

  const blocks = mentioned.map((record) => {
    const list = items.get(record)!;
    const marks = marksOf(record, outliers, deviations);
    for (const item of list) {
      for (const key of ["rocker", "thickness", "width"] as const) {
        if (item.attribute && item.attribute !== key) continue;
        const mark = marks[key].get(item.label);
        if (!mark) continue;
        mark.flagged = true;
        if (item.kind === "units" && item.cmMm !== undefined) mark.cmMm = item.cmMm;
      }
    }
    const grouped = KIND_ORDER.filter((kind) => list.some((item) => item.kind === kind))
      .map((kind) => `<h4>${escape(KIND_TITLE[kind])}</h4><ul>${list.filter((item) => item.kind === kind).map((item) => `<li>${item.html}</li>`).join("")}</ul>`)
      .join("");
    return `<section class="blank" id="${blankId(record.vendor, record.name)}">
<h3>${escape(record.name)} <span class="muted">· ${escape(figureText(record.lengthMm))} long · catalog page ${record.pdfPage}</span></h3>
${isPickable(record) ? blankDrawings(record, marks) : '<p class="muted">Not drawn: the page prints no thickness at the centre or at a tip, so we cannot build this blank.</p>'}
<div class="notes">${grouped}</div>
</section>`;
  });

  const today = new Date().toISOString().slice(0, 10);
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Notes on the ${escape(vendor)} catalog — Shaper Assistant</title>
<style>${PAGE_CSS}
  @page { size: letter landscape; margin: 0.5in 0.5in 0.6in; }
  @media print { body { margin: 0; } section.blank { break-inside: avoid; } h2, h3, h4 { break-after: avoid; } }
  .cover p { max-width: 900px; }
  h4 { font-size: 12px; margin: 8px 0 2px; text-transform: uppercase; letter-spacing: 0.04em; color: #6b7a78; }
  .notes ul { margin: 0 0 4px; padding-left: 18px; } .notes li { margin: 2px 0; }
  ul.summary li { margin: 2px 0; }
</style></head><body>
<div class="cover">
<h1>Notes on the ${escape(vendor)} catalog</h1>
<p class="muted">From Shaper Assistant (shaperassistant.com) · ${escape(today)}</p>
<p>We built every blank in ${escape(EDITIONS[vendor])} into our shaping app from the station figures printed on its pages — ${blanks.length} blanks, ${stationCount} printed stations. Shapers pick a blank in the app and read the rocker and foil of their board off the foam, so every figure matters to them. In reading the pages we noted a few places where a page's own numbers disagree with each other, where a figure sits off the curve the blank's other stations draw, and tip widths under an inch. We may have misread a page, so we'd be grateful for a correction either way.</p>
<p>What follows is one block per blank, shortest first: the blank drawn from the page's figures (nose to the left, 1:1 — the side view is the bottom rocker with the deck on top of it, the outline is from the widths), then the notes on it. Every printed station is a dot with its figure; a station we have a note on is red. A hollow circle with an arrow marks the figure the blank's other stations imply; a hollow diamond marks what the page's centimetre figure would make it. Figures are given three ways: nearest 1/16", decimal inches, decimal centimetres. Page numbers are the catalog PDF's; stations are named as the page prints them (12" from the nose, centre, 6" from the tail, …).</p>
<h2>In brief</h2>
<ul class="summary">
<li>${mentioned.length} of ${blanks.length} blanks have a note.</li>
${KIND_ORDER.map((kind) => `<li>${escape(KIND_TITLE[kind])}: ${counts[kind]}</li>`).join("\n")}
</ul>
<p class="muted">Blanks: ${mentioned.map((record) => `<a href="#${blankId(record.vendor, record.name)}">${escape(record.name)}</a>`).join(" · ")}</p>
</div>
${blocks.join("\n")}
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
  // Coverage: every note part must land in a section or be a known convention — list the ones shown under "likely misprints" by default.
  const unrecognised = new Set<string>();
  for (const record of catalogue) {
    for (const s of record.stations) {
      if (!s.flag) continue;
      for (const part of noteParts(s.flag)) {
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
