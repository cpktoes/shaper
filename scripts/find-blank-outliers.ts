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
  findOutliers,
  makerNormDeviations,
  type BlankAttribute,
  type MakerNormDeviation,
  type OutlierStation,
} from "@/lib/blanks/outliers";
import { readSeedCatalog } from "@/lib/blanks/seed-files";
import { KNOWN_BLANK_VENDORS } from "@/lib/blanks/vendors";
import type { BlankRecord } from "@/lib/geometry/blank";
import { formatInchesFraction, mm, mmToInches } from "@/lib/geometry/units";
import { PAGE_CSS, blankDrawings, blankId, blankItems, escape, groupedItems, inchesText, marksOf, plot, signedInchesText, type Mark, type ReviewItem } from "./blank-report-shared";

function readArg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const OUT_DIR = path.resolve(process.cwd(), readArg("--out") ?? "public/__dev");
const Z = Number(readArg("--z") ?? DEFAULT_OUTLIER_THRESHOLDS.z);
if (!Number.isFinite(Z) || Z <= 0) throw new Error(`--z must be a positive number, not ${readArg("--z")}`);
const THRESHOLDS = { ...DEFAULT_OUTLIER_THRESHOLDS, z: Z };

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
  // Every blank with any note at all — the outlier check's and the catalogue files' own — so the
  // founder can review the whole catalogue from this one page.
  const itemsOf = new Map<BlankRecord, ReviewItem[]>();
  for (const record of catalogue) {
    const items = blankItems(record, outliers, deviations);
    if (items.length) itemsOf.set(record, items);
  }
  const named = new Map<string, BlankRecord>();
  for (const record of itemsOf.keys()) named.set(`${record.vendor}\u0000${record.name}`, record);
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
      const items = itemsOf.get(record) ?? [];
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
      const data = (item: ReviewItem, index: number) =>
        `data-key="${escape(`${record.vendor}|${record.name}|${item.label}|${item.attribute ?? ""}|${item.kind}|${index}`)}" data-vendor="${escape(record.vendor)}" data-name="${escape(record.name)}" data-station="${escape(item.label)}" data-attribute="${escape(item.attribute ?? "")}" data-kind="${item.kind}" data-current="${escape(item.current)}" data-suggested="${escape(item.suggested)}"`;
      const control = (item: ReviewItem, index: number) =>
        `<div class="item" ${data(item, index)}>` +
        `<label class="apply"><input type="checkbox" class="apply"> apply</label>` +
        `<input type="text" class="to" value="${escape(item.suggested.replace(/"$/, ""))}" placeholder="${item.attribute ? "new figure" : "figure"}" title="The figure to use, in inches: 2 3/16, 2.19 or 6'2 1/8">` +
        `<span class="text">${item.html}</span>` +
        `<input type="text" class="comment" placeholder="why (optional)">` +
        `</div>`;
      const stationOptions = record.stations.map((s) => `<option>${escape(s.label)}</option>`).join("");
      const other = `<div class="item other" data-vendor="${escape(record.vendor)}" data-name="${escape(record.name)}">` +
        `<label class="apply"><input type="checkbox" class="apply"> apply</label>` +
        `<select class="station"><option value="">station…</option>${stationOptions}<option value="">— whole blank —</option></select>` +
        `<select class="attribute"><option value="rocker">rocker</option><option value="thickness">thickness</option><option value="width">width</option><option value="length">length</option><option value="deck_length">deck length</option><option value="volume">volume (L)</option></select>` +
        `<input type="text" class="to" placeholder="new figure">` +
        `<span class="text muted">Another change on this blank, for a station nothing above names.</span>` +
        `<input type="text" class="comment" placeholder="why (optional)">` +
        `</div>`;
      return `<section class="blank" id="${blankId(record.vendor, record.name)}">
<h3>${escape(record.vendor)} ${escape(record.name)} <span class="muted">· ${escape(formatInchesFraction(record.lengthMm))} long · catalog page ${record.pdfPage}${isPickable(record) ? "" : " · not pickable"}</span></h3>
${isPickable(record) ? blankDrawings(record, marks) : '<p class="muted">Not drawn: the app cannot fit this blank (a centre or tip thickness is missing).</p>'}
<div class="plots">${BLANK_ATTRIBUTES.map((attribute) => plot(record, attribute, marksFor(attribute))).join("")}</div>
<div class="review">${groupedItems(items, control)}<h4>Anything else on this blank</h4><ul><li>${other}</li></ul></div>
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
<h2>Review — tick what to change, type a different figure where you want one, then Submit</h2>
<div class="bar" id="review-bar"><span id="review-count">0 changes ticked</span> <button type="button" id="review-submit">Submit</button> <button type="button" id="review-download" disabled>Download decisions file</button> <button type="button" id="review-clear">Clear all</button> <span class="muted">Your ticks and figures are remembered in this browser until you clear them.</span></div>
<textarea id="review-out" class="out" readonly placeholder="Submit writes the decisions here, and the download button saves them as blank-review-decisions.json — send that file back."></textarea>
<h2>The blanks named, drawn</h2>
<p class="muted">Each blank first as the app builds it from the dims, nose to the left — side view (bottom rocker and deck) and outline from above, both 1:1 — every printed station a dot with its figure, the named ones in red with the figure the rest of the blank implies beside a hollow dot. Under it, each attribute's curve: the line is the live curve through every printed station; the dots are the printed stations, red where a station is named above, with the hollow point where the rest of the blank implies it. Hover a red dot for the numbers.</p>
${blocks.join("\n")}
<script>${REVIEW_SCRIPT}</script>
</body></html>
`;
}

/** The review controls' behaviour: remember every tick and figure in the browser; Submit gathers the ticked ones. */
const REVIEW_SCRIPT = `
(function () {
  var KEY = "shaper-blank-review";
  var state = {};
  try { state = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { state = {}; }
  var items = Array.prototype.slice.call(document.querySelectorAll(".item"));
  function keyOf(item) {
    if (item.dataset.key) return item.dataset.key;
    return item.dataset.vendor + "|" + item.dataset.name + "|other";
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
    var n = Object.keys(state).filter(function (k) { return state[k].checked; }).length;
    document.getElementById("review-count").textContent = n + (n === 1 ? " change ticked" : " changes ticked");
  }
  function read(item) {
    var k = keyOf(item);
    var sel = { checked: item.querySelector("input.apply").checked, to: item.querySelector("input.to").value, comment: item.querySelector("input.comment").value };
    var st = item.querySelector("select.station"); if (st) sel.station = st.value;
    var at = item.querySelector("select.attribute"); if (at) sel.attribute = at.value;
    if (sel.checked || sel.to !== (item.dataset.suggested || "").replace(/"$/, "") || sel.comment) state[k] = sel; else delete state[k];
    item.classList.toggle("ticked", sel.checked);
    item.classList.toggle("missing", sel.checked && !sel.to);
  }
  items.forEach(function (item) {
    var saved = state[keyOf(item)];
    if (saved) {
      item.querySelector("input.apply").checked = !!saved.checked;
      if (saved.to !== undefined) item.querySelector("input.to").value = saved.to;
      if (saved.comment) item.querySelector("input.comment").value = saved.comment;
      var st = item.querySelector("select.station"); if (st && saved.station !== undefined) st.value = saved.station;
      var at = item.querySelector("select.attribute"); if (at && saved.attribute) at.value = saved.attribute;
      item.classList.toggle("ticked", !!saved.checked);
    }
    item.addEventListener("change", function () { read(item); save(); });
    item.addEventListener("input", function () { read(item); save(); });
  });
  save();
  function decisions() {
    var out = [];
    items.forEach(function (item) {
      var sel = state[keyOf(item)];
      if (!sel || !sel.checked) return;
      var station = item.dataset.station !== undefined ? item.dataset.station : (sel.station || "");
      var attribute = item.dataset.attribute !== undefined && item.dataset.attribute !== "" ? item.dataset.attribute : (sel.attribute || "");
      out.push({ vendor: item.dataset.vendor, name: item.dataset.name, station: station, attribute: attribute, kind: item.dataset.kind || "other", current: item.dataset.current || "", suggested: item.dataset.suggested || "", to: sel.to || "", comment: sel.comment || "" });
    });
    return out;
  }
  var blobUrl = null;
  document.getElementById("review-submit").addEventListener("click", function () {
    var list = decisions();
    var missing = list.filter(function (d) { return !d.to || !d.attribute; });
    var text = JSON.stringify({ generated: new Date().toISOString(), page: location.pathname, decisions: list }, null, 2);
    var out = document.getElementById("review-out");
    out.value = (missing.length ? "NOTE: " + missing.length + " ticked item(s) have no figure or no attribute — fill them in before sending.\n\n" : "") + text;
    out.scrollIntoView({ block: "start" });
    var blob = new Blob([text], { type: "application/json" });
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    blobUrl = URL.createObjectURL(blob);
    document.getElementById("review-download").disabled = false;
  });
  document.getElementById("review-download").addEventListener("click", function () {
    if (!blobUrl) return;
    var a = document.createElement("a"); a.href = blobUrl; a.download = "blank-review-decisions.json"; document.body.appendChild(a); a.click(); a.remove();
  });
  document.getElementById("review-clear").addEventListener("click", function () {
    if (!confirm("Clear every tick and figure on this page?")) return;
    state = {}; save();
    items.forEach(function (item) {
      item.querySelector("input.apply").checked = false;
      item.querySelector("input.to").value = (item.dataset.suggested || "").replace(/"$/, "");
      item.querySelector("input.comment").value = "";
      item.classList.remove("ticked", "missing");
    });
    document.getElementById("review-out").value = "";
  });
})();
`;

/** Every blank drawn, maker by maker, shortest first. */
function gallery(catalogue: readonly BlankRecord[], outliers: readonly OutlierStation[], deviations: readonly MakerNormDeviation[]): string {
  const named = new Set([...outliers, ...deviations].map((f) => `${f.vendor}\u0000${f.name}`));
  const makers = KNOWN_BLANK_VENDORS.map((vendor) => {
    const blanks = catalogue.filter((r) => r.vendor === vendor).sort((a, b) => a.lengthMm - b.lengthMm);
    const blocks = blanks.map((record) => {
      const key = `${record.vendor}\u0000${record.name}`;
      const link = named.has(key) ? ` · <a href="blank-outliers.html#${blankId(record.vendor, record.name)}">on the outlier page</a>` : "";
      const noted = record.stations.filter((s) => s.flag);
      return `<section class="blank" id="${blankId(record.vendor, record.name)}">
<h3>${escape(record.name)} <span class="muted">· ${escape(formatInchesFraction(record.lengthMm))} long · catalog page ${record.pdfPage}${isPickable(record) ? "" : " · not pickable"}${link}</span></h3>
${isPickable(record) ? blankDrawings(record, marksOf(record, outliers, deviations)) : '<p class="muted">Not drawn: the app cannot fit this blank (a centre or tip thickness is missing).</p>'}
${noted.length ? `<p class="muted notes">Catalogue notes: ${noted.map((s) => escape(`${s.label}: ${s.flag}`)).join(" · ")}</p>` : ""}
</section>`;
    });
    return `<h2 id="${blankId(vendor, "")}">${escape(vendor)} <span class="muted">(${blanks.length})</span></h2>\n${blocks.join("\n")}`;
  });
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Blank gallery</title>
<style>${PAGE_CSS}</style></head><body>
<h1>Blank gallery</h1>
<p class="muted">${escape(new Date().toISOString().slice(0, 10))} · every blank the app holds, drawn from its own curves as ROCKER draws it, nose to the left: the side view (bottom rocker and deck) and the outline from above, both 1:1; every printed station a dot with its figure, the stations named on the outlier page in red with the implied figure beside a hollow dot. Makers: ${KNOWN_BLANK_VENDORS.map((vendor) => `<a href="#${blankId(vendor, "")}">${escape(vendor)}</a>`).join(" · ")}. The <a href="blank-outliers.html">outlier page</a> has the numbers.</p>
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
  writeFileSync(galleryHtml, gallery(catalogue, outliers, deviations));
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
