/**
 * CATALOG NOTES FOR EACH BLANK MAKER — one report per maker, for the founder to send them, saying
 * where their catalog's own numbers disagree and where a figure looks off (the founder, 2026-10-14:
 * "downloads that I can send to each blank mfg for them to potentially update their catalogs …
 * show them where cm/inches don't match and where values appear to be off … flag all T0 and N0
 * that are < 1""; then "move the notes to the drawn boards so it's more visual … include cm as
 * decimals always, and give inches in decimals and rounded to nearest 1/16th inch"). It reads and
 * reports; it changes no number.
 *
 *   npx --no-install tsx --tsconfig ./tsconfig.json scripts/make-catalog-reports.ts [--from <dir>] [--out <dir>] [--no-pdf]
 *
 * run from the repository root. (Nothing in package.json — no npm script, no dependency beyond the
 * Playwright already installed for the browser tests, whose Chromium prints the PDFs; `--no-install`
 * means npx can only run the tsx already in node_modules, never download one. No database is
 * involved.)
 *
 * WHICH CATALOGUE IT READS: the catalogue AS THE PAGES PRINT IT — the dated copy under
 * db/seed/blanks/snapshots/ taken before the founder's station-by-station review (`AS_PRINTED_DIR`),
 * read through the tested reader `lib/blanks/seed-files.ts` — never the live files under
 * db/seed/blanks/. The live files carry the founder's review changes, which are for the site; a maker
 * is told what its own pages say and where that looks wrong, and a figure the founder has since
 * corrected would otherwise vanish from the report along with the note that it looked off (the
 * founder, 2026-10-14: "I only wanted the adjustments to be on our site. The facts about the errors
 * should remain on the maker pages"). `--from <dir>` reads another copy — a fresh snapshot after a
 * maker sends a new edition, say.
 *
 * The report is one block per blank that has anything to say about it, shortest first: the blank
 * drawn as the app builds it from the figures (nose left, 1:1, every printed station a dot with its
 * figure; a station in question in red; a hollow circle where the other stations imply a different
 * figure, a hollow diamond where the page's centimetre figure says something else), and under it
 * that blank's notes, grouped — the same notes `blankItems` (blank-report-shared.ts) builds for the
 * dev page's review controls: inches and centimetres that disagree; figures off the curve of the
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
import { findOutliers, makerNormDeviations, type MakerNormDeviation, type OutlierStation } from "@/lib/blanks/outliers";
import { readSeedCatalog } from "@/lib/blanks/seed-files";
import { KNOWN_BLANK_VENDORS, type BlankVendor } from "@/lib/blanks/vendors";
import type { BlankRecord } from "@/lib/geometry/blank";
import {
  KIND_ORDER,
  KIND_TITLE,
  PAGE_CSS,
  blankDrawings,
  blankId,
  blankItems,
  escape,
  figureText,
  groupedItems,
  marksOf,
  noteParts,
  readNote,
  type ItemKind,
} from "./blank-report-shared";

function readArg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}
const OUT_DIR = path.resolve(process.cwd(), readArg("--out") ?? "public/__dev/reports");
/** The catalogue as the pages print it: the before-review copy (see its README), not the live files. */
const AS_PRINTED_DIR = "db/seed/blanks/snapshots/2026-10-14-before-review";
const FROM_DIR = path.resolve(process.cwd(), readArg("--from") ?? AS_PRINTED_DIR);
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

/* -- one maker's report --------------------------------------------------------------------- */

function report(vendor: BlankVendor, catalogue: readonly BlankRecord[], outliers: readonly OutlierStation[], deviations: readonly MakerNormDeviation[]): string {
  const blanks = catalogue.filter((r) => r.vendor === vendor).sort((a, b) => a.lengthMm - b.lengthMm);
  const stationCount = blanks.reduce((n, r) => n + r.stations.length, 0);
  const withItems = blanks.map((record) => ({ record, items: blankItems(record, outliers, deviations) })).filter(({ items }) => items.length > 0);

  const counts = Object.fromEntries(KIND_ORDER.map((kind) => [kind, 0])) as Record<ItemKind, number>;
  for (const { items } of withItems) for (const item of items) counts[item.kind]++;

  const blocks = withItems.map(({ record, items }) => {
    const marks = marksOf(record, outliers, deviations);
    for (const item of items) {
      for (const key of ["rocker", "thickness", "width"] as const) {
        if (item.attribute && item.attribute !== key) continue;
        const mark = marks[key].get(item.label);
        if (!mark) continue;
        mark.flagged = true;
        if (item.cmMm !== undefined) mark.cmMm = item.cmMm;
      }
    }
    return `<section class="blank" id="${blankId(record.vendor, record.name)}">
<h3>${escape(record.name)} <span class="muted">· ${escape(figureText(record.lengthMm))} long · catalog page ${record.pdfPage}</span></h3>
${isPickable(record) ? blankDrawings(record, marks) : '<p class="muted">Not drawn: the page prints no thickness at the centre or at a tip, so we cannot build this blank.</p>'}
<div class="notes">${groupedItems(items, (item) => item.html.replace(/the maker's other blanks/g, "your other blanks"))}</div>
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
<li>${withItems.length} of ${blanks.length} blanks have a note.</li>
${KIND_ORDER.map((kind) => `<li>${escape(KIND_TITLE[kind])}: ${counts[kind]}</li>`).join("\n")}
</ul>
<p class="muted">Blanks: ${withItems.map(({ record }) => `<a href="#${blankId(record.vendor, record.name)}">${escape(record.name)}</a>`).join(" · ")}</p>
</div>
${blocks.join("\n")}
</body></html>
`;
}

async function main(): Promise<void> {
  const catalogue = readSeedCatalog(FROM_DIR);
  console.log(`catalogue as printed, read from ${path.relative(process.cwd(), FROM_DIR)}/ (${catalogue.length} blanks)`);
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
  // Coverage: every note part must land in a kind or be a known convention — list the ones shown under "likely misprints" by default.
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
