/**
 * APPLY THE FOUNDER'S BLANK REVIEW DECISIONS — reads the decisions file the dev page's review
 * controls produce (`blank-review-decisions.json`, from "Submit" then "Download" on
 * public/__dev/blank-outliers.html) and makes exactly those changes to the catalogue files under
 * db/seed/blanks/, each with a note on the row saying what changed, from what, when and why
 * (quick 261013-uoj; the founder, 2026-10-14: "add check boxes and a text box on the dev page that I
 * can check what I want to update … after I go through the blanks, I can then submit my changes for
 * you to make").
 *
 *   npx --no-install tsx --tsconfig ./tsconfig.json scripts/apply-blank-decisions.ts <decisions.json> [--write]
 *
 * Without `--write` it is a rehearsal: every decision is checked and the change it would make is
 * printed, nothing is written. With `--write` the files change — then run the unit suite, regenerate
 * the round-nose golden and the preset blanks, and seed the databases, as for any catalogue change.
 *
 * A decision names a vendor, a blank, a station (or none, for the blank's own figures), an attribute
 * (rocker, thickness, width, length, deck_length, volume), the figure to use (`to`, as typed:
 * `2 3/16`, `2.19`, `6'2 1/8`, or litres for volume) and an optional comment; it also carries the
 * figure the page showed as current, which is checked against the file so a stale decision — made
 * before a later change — is refused rather than silently applied over it. Figures are written at
 * four decimals, the catalogue files' precision. The revert point is the dated copy under
 * db/seed/blanks/snapshots/ and the git tags named in its README.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { BLANK_CSV_COLUMNS } from "@/lib/blanks/catalog";
import { parseCsv } from "@/lib/blanks/csv";
import { SEED_CSV_DIR, SEED_CSV_FILES } from "@/lib/blanks/seed-files";
import { KNOWN_BLANK_VENDORS } from "@/lib/blanks/vendors";
import { formatInchesFraction, inchesToMm } from "@/lib/geometry/units";
import { parseInchesText } from "./blank-report-shared";

interface Decision {
  vendor: string;
  name: string;
  station: string;
  attribute: string;
  kind?: string;
  current?: string;
  suggested?: string;
  to: string;
  comment?: string;
}

const COLUMN: Record<string, (typeof BLANK_CSV_COLUMNS)[number]> = {
  rocker: "rocker_in",
  thickness: "thickness_in",
  width: "width_in",
  length: "length_in",
  deck_length: "deck_length_in",
  volume: "volume_l",
};
const WORD: Record<string, string> = { rocker: "rocker", thickness: "thickness", width: "width", length: "length", deck_length: "deck length", volume: "volume" };
const BLANK_LEVEL = new Set(["length", "deck_length", "volume"]);

/** The CSV figure for a decision's `to`: inches at four decimals, or litres as typed. */
function figureCell(attribute: string, to: string): string | null {
  if (attribute === "volume") {
    const litres = Number(to.replace(/\s*L$/i, ""));
    return Number.isFinite(litres) && litres > 0 ? String(litres) : null;
  }
  const inches = parseInchesText(to);
  if (inches === null || !Number.isFinite(inches) || inches < 0) return null;
  const rounded = Math.round(inches * 10000) / 10000;
  const text = rounded.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
  return text.includes(".") ? text : `${text}.0`;
}

/** The figure as the page shows it, for the stale-decision check and the note. */
function shownFigure(attribute: string, cell: string): string {
  if (cell === "") return "";
  if (attribute === "volume") return `${cell} L`;
  return formatInchesFraction(inchesToMm(Number(cell)), 16);
}

function main(): void {
  const file = process.argv[2];
  const write = process.argv.includes("--write");
  if (!file || file.startsWith("--")) throw new Error("usage: apply-blank-decisions.ts <decisions.json> [--write]");
  const parsed = JSON.parse(readFileSync(path.resolve(process.cwd(), file), "utf8")) as { decisions?: Decision[] };
  const decisions = parsed.decisions ?? [];
  if (decisions.length === 0) throw new Error("the decisions file holds no decisions");

  // Read every catalogue file once, as rows of cells, keeping its text for the write.
  const files = new Map<string, { path: string; rows: string[][]; changed: boolean }>();
  for (const name of SEED_CSV_FILES) {
    const full = path.join(SEED_CSV_DIR, name);
    files.set(name, { path: full, rows: parseCsv(readFileSync(full, "utf8")), changed: false });
  }
  const col = (column: (typeof BLANK_CSV_COLUMNS)[number]) => BLANK_CSV_COLUMNS.indexOf(column);
  const today = new Date().toISOString().slice(0, 10);
  const problems: string[] = [];
  const report: string[] = [];

  decisions.forEach((d, i) => {
    const where = `decision ${i + 1} (${d.vendor} ${d.name}${d.station ? ` ${d.station}` : ""} ${d.attribute})`;
    if (!(KNOWN_BLANK_VENDORS as readonly string[]).includes(d.vendor)) return problems.push(`${where}: unknown maker`);
    const column = COLUMN[d.attribute];
    if (!column) return problems.push(`${where}: unknown attribute "${d.attribute}"`);
    const blankLevel = BLANK_LEVEL.has(d.attribute);
    if (!blankLevel && !d.station) return problems.push(`${where}: a ${d.attribute} needs a station`);
    const cell = figureCell(d.attribute, d.to);
    if (cell === null) return problems.push(`${where}: cannot read the figure "${d.to}"`);
    // The rows of this blank, in whichever file holds the maker.
    let hit: { file: string; indexes: number[] } | null = null;
    for (const [name, data] of files) {
      const indexes = data.rows.map((row, index) => ({ row, index })).filter(({ row, index }) => index > 0 && row[col("vendor")] === d.vendor && row[col("blank_name")] === d.name).map(({ index }) => index);
      if (indexes.length) hit = { file: name, indexes };
    }
    if (!hit) return problems.push(`${where}: no such blank in the catalogue files`);
    const data = files.get(hit.file)!;
    const targets = blankLevel ? hit.indexes : hit.indexes.filter((index) => data.rows[index][col("station")] === d.station);
    if (targets.length === 0) return problems.push(`${where}: no station ${d.station} on that blank`);
    const before = data.rows[targets[0]][col(column)];
    const shown = shownFigure(d.attribute, before);
    if (d.current && shown && d.current !== shown) {
      return problems.push(`${where}: the page showed ${d.current} but the file now holds ${shown} — the file changed since the review; look again before applying`);
    }
    if (before === cell) {
      // Ticked with the figure it already has: nothing to change, and no reason to refuse the rest.
      report.push(`${d.vendor} ${d.name}${d.station ? ` ${d.station}` : ""} ${WORD[d.attribute]}: already ${shown} — left as is${d.comment ? ` (the founder's note: ${d.comment})` : ""}`);
      return;
    }
    const note = `${WORD[d.attribute]}: changed from ${shown || "nothing"} to ${shownFigure(d.attribute, cell)} on ${today} by the founder${d.comment ? ` (${d.comment.replace(/[\r\n]+/g, " ").trim()})` : ""}`;
    for (const index of targets) {
      data.rows[index][col(column)] = cell;
      // The note goes on the station's row, or on the first row for a figure of the whole blank.
      if (!blankLevel || index === targets[0]) {
        const flag = data.rows[index][col("flag")];
        data.rows[index][col("flag")] = flag ? `${flag}; ${note}` : note;
      }
    }
    data.changed = true;
    report.push(`${d.vendor} ${d.name}${d.station ? ` ${d.station}` : ""} ${WORD[d.attribute]}: ${shown || "nothing"} → ${shownFigure(d.attribute, cell)} (${cell})${d.comment ? ` — ${d.comment}` : ""}`);
  });

  if (problems.length) {
    console.error(`refused — ${problems.length} decision(s) cannot be applied as given:`);
    for (const problem of problems) console.error(`  ${problem}`);
    process.exitCode = 1;
    return;
  }
  for (const line of report) console.log(line);
  if (!write) {
    console.log(`\nrehearsal only: ${report.length} change(s) checked, nothing written — run again with --write to make them`);
    return;
  }
  const quote = (cell: string) => (/[",\r\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell);
  for (const [name, data] of files) {
    if (!data.changed) continue;
    writeFileSync(data.path, `${data.rows.map((row) => row.map(quote).join(",")).join("\r\n")}\r\n`);
    console.log(`wrote db/seed/blanks/${name}`);
  }
  console.log(`\n${report.length} change(s) written. Next: npx vitest run; regenerate the round-nose golden and the preset blanks; seed the databases.`);
}

main();
