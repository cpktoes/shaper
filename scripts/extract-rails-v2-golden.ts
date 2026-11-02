/**
 * GENERATED FILE PRODUCER — writes lib/geometry/__fixtures__/rails-v2-golden.json: the founder's
 * "Chris Rails v2" sheets ("Chris Center Rail v2" and "Chris Nose&Tail Rail v2" in Chris Rails v2.xlsx,
 * the 10:03 save of 2026-11-02) as the reference page the founder signed off works them out, and the
 * finished rail, "Blended halfway", as that page draws it (quick 261102-gec, Rule 1). The output is
 * generated and must never be hand-edited; re-run this script.
 *
 *   npx --no-install tsx --tsconfig ./tsconfig.json scripts/extract-rails-v2-golden.ts
 *
 * run from the repository root. (Nothing in package.json — no npm script, no dependency;
 * `--no-install` means npx can only run the tsx already in node_modules, never download one. No
 * database is involved.)
 *
 * It EXECUTES the reference page's own code — `reference/sketches/018-chris-rails-v2.js`, the page's
 * calc and finish blocks copied byte for byte — so every number in the fixture is the page's output,
 * never a transcription of it. That file exports nothing (it is the page's script: plain `const` and
 * `function` declarations), so the script evaluates its text in a fresh `node:vm` context and reads
 * back `SHEET`, `sheetV2`, `segments` and `finishedCurve`. The page's `META` and `todayApp` are its
 * comparison overlay of the app as it was before this task — not rules, never read here.
 *
 * It computes nothing of its own beyond choosing the cases and the guard predicate below. What it
 * records (fixture keys, all in INCHES — x in from the rail, negative toward the stringer; y up from
 * the bottom):
 * - `provenance`, `units`: where the numbers came from, and what they are measured in.
 * - `workbook`: the workbook's own two saved input sets (`SHEET.nose`, `.center`, `.tail` — nose and
 *   tail both read the one Nose & Tail sheet), each with the page's `sheet` numbers and `segments`.
 * - `cases`: a grid across board thickness, Deck Profile, Family, both ends of the Ratio, Sym and the
 *   nose/tail scale, keeping ONLY the cases where none of the app's guard rails bites on the page's
 *   own numbers — the page has no apex trim, no 1/16" floors, no nudges, no Single Tuck and no Hard
 *   Edge (the BRIEF's F3), so a case where the app must step in is proven by a rule test instead,
 *   never recorded here as if the page agreed. Also skipped: a domed rail whose thickness lands exactly
 *   half-way between two sixteenths, where the page's own 1/16" rounding and the app's (through
 *   millimetres) can round opposite ways (M3; the app's rounding is unchanged by this task).
 * - `excluded` (how many grid cases each guard left out — a case can count twice) and
 *   `halfwaySkipped`, so the record says what it left out.
 * - `finished`: the page's `finishedCurve` samples for the workbook's centre and nose sets and every
 *   48th kept case, each drawn from x0 = -(2.4 x T + 2") — the section's own plot edge (rule 12).
 *
 * Running it twice writes the same bytes.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { runInNewContext } from "node:vm";

const OUT = path.resolve(process.cwd(), "lib/geometry/__fixtures__/rails-v2-golden.json");
const REFERENCE = "reference/sketches/018-chris-rails-v2.js";

type Pt = [number, number];

/** One set of the sheet's inputs, exactly as the page's `SHEET` holds them. */
interface SheetInput {
  T: number;
  deck: number;
  F: number;
  top: number;
  sym: boolean;
  scale: number;
}

/** What the page's `sheetV2` returns — column C, cell for cell (inches). */
interface SheetResult {
  domed: boolean;
  bt: number;
  rail: number;
  t: number;
  apexLen: number;
  apexCenter: number;
  rm1: number;
  rt1: number;
  domeBand: number;
  dm1: number;
  dm2: number;
  dm3: number;
  bt1: number;
  bt2: number;
  bt3: number;
  cc: null;
}

interface PageSegment {
  key: string;
  p1: Pt;
  p2: Pt;
}

interface Page {
  SHEET: Record<"nose" | "center" | "tail", SheetInput>;
  sheetV2(s: SheetInput): SheetResult;
  segments(r: SheetResult): PageSegment[];
  finishedCurve(r: SheetResult, X0: number): { pts: Pt[] };
}

const source = readFileSync(path.resolve(process.cwd(), REFERENCE), "utf8");
const versionMatch = /version ([0-9-]+)/.exec(source);
const page = runInNewContext(`${source}\n;({ SHEET, sheetV2, segments, finishedCurve });`, {
  Math,
}) as Page;

/** The fields the fixture keeps from `sheetV2` (its `cc` is always null on the v2 sheets). */
function sheetRecord(r: SheetResult) {
  return {
    domed: r.domed,
    bt: r.bt,
    rail: r.rail,
    t: r.t,
    apexLen: r.apexLen,
    apexCenter: r.apexCenter,
    rm1: r.rm1,
    rt1: r.rt1,
    domeBand: r.domeBand,
    dm1: r.dm1,
    dm2: r.dm2,
    dm3: r.dm3,
    bt1: r.bt1,
    bt2: r.bt2,
    bt3: r.bt3,
  };
}

function segmentRecords(r: SheetResult) {
  return page.segments(r).map((s) => ({ key: s.key, p1: s.p1, p2: s.p2 }));
}

/** The section's own plot edge: 2" beyond the Domed Deck Band (2.4 x the board thickness). */
const x0For = (input: SheetInput) => -(2.4 * input.T + 2);

// The app's guard rails, read on the page's own numbers (the plan's rules 3, 6 and 7). Each returns
// true when that guard would change the page's number, so the case is left to the rule tests.
const SIXTEENTH = 1 / 16;
const GUARDS: { name: string; bites: (r: SheetResult) => boolean }[] = [
  {
    name: "apexTrim",
    bites: (r) =>
      r.apexLen > Math.min(2 * (r.apexCenter - SIXTEENTH), 2 * (r.t - SIXTEENTH - r.apexCenter)) + 1e-12,
  },
  { name: "apexFloor", bites: (r) => r.apexLen < SIXTEENTH },
  { name: "deckMark1Floor", bites: (r) => r.dm1 < SIXTEENTH },
  { name: "deckMark2", bites: (r) => r.dm2 < SIXTEENTH || r.dm2 > r.dm1 - SIXTEENTH },
  { name: "deckMark3Separation", bites: (r) => r.dm3 < r.dm1 + SIXTEENTH },
  { name: "bottomTuck1Floor", bites: (r) => r.bt1 < SIXTEENTH },
  { name: "bottomTuck2", bites: (r) => r.bt2 < SIXTEENTH || r.bt2 > r.bt1 - SIXTEENTH },
  { name: "bottomTuck3Separation", bites: (r) => r.bt3 < r.bt1 + SIXTEENTH },
];

/** A domed rail whose thickness x 16 lands within 1e-6 of a half (M3). */
function halfway(input: SheetInput): boolean {
  if (input.deck >= 100) return false;
  const x16 = ((input.T * input.deck) / 100) * 16;
  return Math.abs(x16 - Math.floor(x16) - 0.5) < 1e-6;
}

const workbook = (["nose", "center", "tail"] as const).map((key) => {
  const input = page.SHEET[key];
  const r = page.sheetV2(input);
  return { key, input, sheet: sheetRecord(r), segments: segmentRecords(r) };
});

const excluded: Record<string, number> = Object.fromEntries(GUARDS.map((g) => [g.name, 0]));
let halfwaySkipped = 0;
const cases: { input: SheetInput; sheet: ReturnType<typeof sheetRecord>; segments: PageSegment[] }[] = [];
const kept: { input: SheetInput; r: SheetResult }[] = [];

for (const T of [1, 1.625, 2.5, 3.5]) {
  for (const deck of [100, 87.5, 75]) {
    for (const F of [1, 2, 3, 4, 5]) {
      for (const top of [20, 20.5, 50, 62.5, 79.5, 80]) {
        for (const sym of [false, true]) {
          for (const scale of [0.5, 0.75, 1]) {
            const input: SheetInput = { T, deck, F, top, sym, scale };
            if (halfway(input)) {
              halfwaySkipped++;
              continue;
            }
            const r = page.sheetV2(input);
            const biting = GUARDS.filter((g) => g.bites(r));
            for (const g of biting) excluded[g.name]++;
            if (biting.length > 0) continue;
            cases.push({ input, sheet: sheetRecord(r), segments: segmentRecords(r) });
            kept.push({ input, r });
          }
        }
      }
    }
  }
}

const finished: { label: string; source: { workbook: string } | { case: number }; input: SheetInput; x0: number; points: Pt[] }[] =
  [];
for (const key of ["center", "nose"] as const) {
  const input = page.SHEET[key];
  const x0 = x0For(input);
  finished.push({
    label: `workbook ${key}`,
    source: { workbook: key },
    input,
    x0,
    points: page.finishedCurve(page.sheetV2(input), x0).pts,
  });
}
for (let i = 0; i < kept.length; i += 48) {
  const { input, r } = kept[i];
  const x0 = x0For(input);
  finished.push({ label: `case ${i}`, source: { case: i }, input, x0, points: page.finishedCurve(r, x0).pts });
}

const fixture = {
  provenance: {
    reference: REFERENCE,
    page: `"Chris Rails v2" (https://claude.ai/artifact/N4p4DdmiCdma2UHQE1eXX1), version ${versionMatch ? versionMatch[1] : "unknown"}`,
    workbook: "Chris Rails v2.xlsx, sheets \"Chris Center Rail v2\" and \"Chris Nose&Tail Rail v2\", saved 2026-11-02 10:03 PST",
    generator: "scripts/extract-rails-v2-golden.ts",
    quick: "261102-gec",
    note: "Generated by executing the reference page's own sheetV2, segments and finishedCurve. Never hand-edit; re-run the script.",
  },
  units: "inches; x in from the rail (0 at the rail, negative toward the stringer); y up from the bottom",
  workbook,
  cases,
  excluded,
  halfwaySkipped,
  finished,
};

writeFileSync(OUT, `${JSON.stringify(fixture)}\n`);
console.log(
  `wrote ${path.relative(process.cwd(), OUT)}: ${cases.length} cases kept, ${halfwaySkipped} half-way skipped, ` +
    `${finished.length} finished curves (${finished.reduce((n, f) => n + f.points.length, 0)} samples); excluded ${JSON.stringify(excluded)}`,
);
