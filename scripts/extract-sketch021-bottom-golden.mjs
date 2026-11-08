#!/usr/bin/env node
/**
 * GENERATED FILE PRODUCER — writes lib/geometry/__fixtures__/bottom-golden.json: the bottom contours as the founder's
 * approved sketch works them out (sketch 021, 2026-11-08: "Love everything about it"), on the app's own five boards —
 * the four presets as they open and the Fish with one wing (Phase 17, Rule 1). The output is generated and must never
 * be hand-edited; re-run this script.
 *
 *   npx --no-install tsx --tsconfig ./tsconfig.json scripts/extract-sketch021-bottom-golden.mjs
 *
 * run from the repository root. (Nothing in package.json — no npm script, no dependency; `--no-install` means npx can
 * only run the tsx already in node_modules, never download one. No database is involved.)
 *
 * It EXECUTES the sketch's own code — `reference/sketches/021-bottom-maths.js`, a byte-for-byte copy of the sketch's
 * maths — so every number in the fixture is the sketch's output, never a transcription of it. It computes no cut of
 * its own.
 *
 * The sketch's inputs are built from the APP, never typed and never read from the sketch's board-data.ts: each
 * board's length, wide point, wide-point width and litres (`summarizeDesign`), its front fins' station and raw toe
 * from the store's own fin chain (`designFinPlacement`, Import Template ticked as the store opens a board, then
 * `frontFinStation` / `frontFinToeDegrees`), and five curves sampled at 4,801 evenly spaced stations at full precision
 * (no rounding): `curve` = `sampleOutline` (the rail as drawn), `foam` = `foamHalfWidth`, `natural` =
 * `curveHalfWidthAt` (the curve before any wing), `narrow` = `narrowestOutlineAt` (D-19) and `thick` = the side
 * profile's `thicknessAt`. Every inch figure goes through `inchesToMm` from lib/geometry/units.ts (Rule 2). The
 * winged Fish carries the wing of the research and sketch 020: 1/4" deep, a 1" run, sharp, placed by hand 4" ahead of
 * its front fins.
 *
 * Every station a record is taken at is a multiple of L/4800 — exactly one of the 4,801 samples — so the sketch's
 * linear reading between samples adds nothing there.
 *
 * What it records (fixture keys), all in millimetres (litres for `litres` / `litresOff`):
 * - `provenance`: { sketch, sketchSha1, reference, producer, stations: 4801 }; `units`: "mm".
 * - `boards`: [{ id, facts }] — `facts` holds `L`, `wide`, `widePointWidth`, `fin`, `toeDeg` (raw), `litres`;
 *   `grid` — the 25 × 13 grid every grid record is read on: `k` (the sample index, 0…4800 in 200s), `s` (k·L/4800)
 *   and `y` (j/12 of `curveAt(s)`, j = 0…12, one row per station); and `probes` — `curveAt`, `natural` and `narrow`
 *   (`refAt` under each wing rule), `foamAt`, `thickAt` and `innerAt` at the grid's 25 stations.
 * - `cases`: one record per line, each with a `kind`:
 *   - `cut` — { board, section, name, cut (its `makeCut` numbers), cutOff (the cut alone, 25 × 13, `cutOff(c, s, y,
 *     curveAt(s))`), foamOff (only that cut on the board, the other sections Flat and no channels), litresOff }.
 *   - `opening` — { board, channels (0, then 6), cuts (the board's `STARTS` cuts, and the channels when added),
 *     foamOff (25 × 13), litresOff, columns (`markColumns` per cut), marks ([{ s, marks: { <cut>: `marksOf` } }] every
 *     6" from the tail) }.
 *   - `normalize` — { board, section, name, changed ("start" | "deep" | "end"), to (L/8, L/2 or 7L/8), after (the
 *     cut's start, deep, end, offS and trough once `normalize` has run) } for every non-flat name.
 *   - `channels` — { board, count (4/6/8), run (parallel/rail/toe), longer (inner/outer/same), ch (the channel set),
 *     fit (`channelFit`), starts (`chStart` per channel), stations ([{ s, edges: `channelEdges`, marks:
 *     `channelMarks` }] every 6") } on the Shortboard and the Fish.
 *   - `refAt` — { board: "fishwing", wingRule ("narrow" | "natural"), s, ref } every 1/2" from the tail.
 *
 * Guards: the template's SHA-1 named in the reference copy's header is this script's; every sampled array is
 * finite; every record station is one of the samples. Running it twice writes the same bytes.
 */
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { phase16Boards } from "../lib/geometry/__fixtures__/phase16-boards.ts";
import { designFinPlacement, designSideProfile, LIVE_DESIGN_RULES, summarizeDesign } from "../lib/geometry/design.ts";
import { frontFinStation, frontFinToeDegrees } from "../lib/geometry/fins.ts";
import { buildOutline, foamHalfWidth, sampleOutline } from "../lib/geometry/outline.ts";
import { BOARD_PRESETS } from "../lib/geometry/presets.ts";
import { inchesToMm, mm } from "../lib/geometry/units.ts";
import { curveHalfWidthAt, narrowestOutlineAt } from "../lib/geometry/wings.ts";

const ROOT = process.cwd();
const OUT = path.resolve(ROOT, "lib/geometry/__fixtures__/bottom-golden.json");
const REFERENCE = "reference/sketches/021-bottom-maths.js";
const SKETCH_SHA1 = "53cbf011a3144c40185da1e10e651751133375bf";
const STATIONS = 4801;
const STEPS = STATIONS - 1;

if (!readFileSync(path.resolve(ROOT, REFERENCE), "utf8").slice(0, 2000).includes(SKETCH_SHA1)) {
  throw new Error(`${REFERENCE} does not name template SHA-1 ${SKETCH_SHA1} in its header — the copy is not the one this script was written for`);
}
const require = createRequire(import.meta.url);
const sketch = require(path.resolve(ROOT, REFERENCE));

/* ---------------- the five boards, from the app ---------------- */

/** The four presets as they open (their own tail Hard Edge), from the Phase 16 board set. */
function presetFields() {
  const all = phase16Boards();
  return BOARD_PRESETS.map((preset) => {
    const label = `${preset.id}|asis|${preset.rails.tailHardEdge ? "hard" : "soft"}`;
    const board = all.find((b) => b.label === label);
    if (!board) throw new Error(`no ${label} board in phase16Boards()`);
    return { id: preset.id, fields: board.fields };
  });
}

function boardInput(id, fields) {
  const g = buildOutline(fields.outline);
  const profile = designSideProfile(fields, LIVE_DESIGN_RULES);
  const placement = designFinPlacement(fields);
  const L = fields.outline.length;
  const sample = (f) => {
    const out = new Array(STATIONS);
    for (let i = 0; i < STATIONS; i++) {
      const v = f(mm((i / STEPS) * L));
      if (!Number.isFinite(v)) throw new Error(`${id}: a sampled value at station ${i} is not finite`);
      out[i] = v;
    }
    return out;
  };
  return {
    id,
    L,
    wide: g.widePointStation,
    widePointWidth: fields.outline.widePointWidth,
    fin: frontFinStation(placement),
    toeDeg: frontFinToeDegrees(placement),
    litres: summarizeDesign(fields).volumeLitres,
    curve: sample((s) => sampleOutline(g, s)),
    foam: sample((s) => foamHalfWidth(g, s)),
    natural: sample((s) => curveHalfWidthAt(g, s)),
    narrow: sample((s) => narrowestOutlineAt(g, s)),
    thick: sample((s) => profile.thicknessAt(s)),
    outline: [],
    sections: [],
    wings: [],
  };
}

const presets = presetFields();
const fish = presets.find((p) => p.id === "fish");
const fishWing = {
  station: mm(frontFinStation(designFinPlacement(fish.fields)) + inchesToMm(4)),
  depth: inchesToMm(1 / 4),
  run: inchesToMm(1),
  radius: mm(0),
  lock: null,
  finOffset: mm(0),
};
const jobs = [
  ...presets,
  { id: "fishwing", fields: { ...fish.fields, outline: { ...fish.fields.outline, wings: [fishWing] } } },
];
const DATA = { U: [], boards: jobs.map((j) => boardInput(j.id, j.fields)) };
for (const b of DATA.boards) {
  for (const key of ["L", "wide", "widePointWidth", "fin", "toeDeg", "litres"]) {
    if (!Number.isFinite(b[key])) throw new Error(`${b.id}: ${key} is not finite`);
  }
  if (!sketch.STARTS[b.id]) throw new Error(`the sketch has no opening cuts for ${b.id}`);
}
sketch.setData(DATA);

/* ---------------- where the records are taken ---------------- */

const GRID_K = Array.from({ length: 25 }, (_, a) => a * 200);
const ACROSS = Array.from({ length: 13 }, (_, j) => j / 12);
const SIX = inchesToMm(6);
const HALF = inchesToMm(1 / 2);

/** A station that is exactly sample k of the board — guarded, so the sketch's interpolation adds nothing. */
function onSample(L, k) {
  const s = (k * L) / STEPS;
  const x = (s / L) * STEPS;
  if (Math.abs(x - k) > 1e-9) throw new Error(`station ${k} of ${L} mm does not land on its sample`);
  return s;
}
/** Stations every `step` mm from the tail, each moved onto its nearest sample. */
function every(L, step) {
  const out = [];
  for (let n = 0; n * step <= L + 1e-9; n++) out.push(onSample(L, Math.min(STEPS, Math.round(((n * step) / L) * STEPS))));
  return out;
}
const gridOf = (b) => GRID_K.map((k) => onSample(b.L, k));

const FLAT = { nose: "Flat Entry", center: "Flat Center", tail: "Flat Exit" };
const plain = (c) => ({ ...c });

function setAllFlat(board) {
  for (const sec of ["nose", "center", "tail"]) sketch.state.cuts[sec] = sketch.makeCut(sec, FLAT[sec], board);
  sketch.state.ch = sketch.makeChannels(board, 0);
}

function foamGrid(board, stations) {
  return stations.map((s) => {
    const W = sketch.curveAt(s);
    return ACROSS.map((share) => sketch.foamOff(s, share * W));
  });
}

/* ---------------- the records ---------------- */

const boards = [];
const cases = [];

for (const b of DATA.boards) {
  sketch.use(b.id, "imperial", "narrow");
  const B = sketch.B;
  const stations = gridOf(B);
  const probe = (f) => stations.map(f);
  const refUnder = (rule) => {
    sketch.state.wingRule = rule;
    const out = probe((s) => sketch.refAt(s));
    sketch.state.wingRule = "narrow";
    return out;
  };
  boards.push({
    id: b.id,
    facts: {
      L: B.L,
      wide: B.wide,
      widePointWidth: B.widePointWidth,
      fin: B.fin,
      toeDeg: B.toeDeg,
      litres: B.litres,
      grid: { k: GRID_K, s: stations, y: stations.map((s) => ACROSS.map((share) => share * sketch.curveAt(s))) },
      probes: {
        curveAt: probe((s) => sketch.curveAt(s)),
        natural: refUnder("natural"),
        narrow: refUnder("narrow"),
        foamAt: probe((s) => sketch.foamAt(s)),
        thickAt: probe((s) => sketch.thickAt(s)),
        innerAt: probe((s) => sketch.innerAt(s)),
      },
    },
  });

  // every name, alone, at its starting numbers
  for (const section of ["nose", "center", "tail"]) {
    for (const def of sketch.NAMES[section]) {
      sketch.use(b.id, "imperial", "narrow");
      setAllFlat(sketch.B);
      const cut = sketch.makeCut(section, def.name, sketch.B);
      sketch.state.cuts[section] = cut;
      cases.push({
        kind: "cut",
        board: b.id,
        section,
        name: def.name,
        cut: plain(cut),
        cutOff: stations.map((s) => {
          const W = sketch.curveAt(s);
          return ACROSS.map((share) => sketch.cutOff(cut, s, share * W, W));
        }),
        foamOff: foamGrid(sketch.B, stations),
        litresOff: sketch.litresOff(),
      });
    }
  }

  // the board's opening cuts, then with six channels added
  for (const count of [0, 6]) {
    sketch.use(b.id, "imperial", "narrow");
    if (count > 0) sketch.state.ch = sketch.makeChannels(sketch.B, count);
    const cutsNow = () => {
      const out = [["nose", sketch.state.cuts.nose], ["center", sketch.state.cuts.center], ["tail", sketch.state.cuts.tail]];
      if (sketch.state.ch.count > 0) out.push(["channels", sketch.state.ch]);
      return out;
    };
    cases.push({
      kind: "opening",
      board: b.id,
      channels: count,
      cuts: Object.fromEntries(cutsNow().map(([key, c]) => [key, plain(c)])),
      foamOff: foamGrid(sketch.B, stations),
      litresOff: sketch.litresOff(),
      columns: Object.fromEntries(cutsNow().map(([key, c]) => [key, sketch.markColumns(key, c)])),
      marks: every(sketch.B.L, SIX).map((s) => ({
        s,
        marks: Object.fromEntries(cutsNow().map(([key, c]) => [key, sketch.marksOf(key, c, s)])),
      })),
    });
  }

  // a dragged Start, Deepest or End keeps the other two in order
  for (const section of ["nose", "center", "tail"]) {
    for (const def of sketch.NAMES[section]) {
      if (def.kind === "flat") continue;
      for (const changed of ["start", "deep", "end"]) {
        for (const k of [600, 2400, 4200]) {
          sketch.use(b.id, "imperial", "narrow");
          const c = sketch.makeCut(section, def.name, sketch.B);
          const to = onSample(sketch.B.L, k);
          c[changed] = to;
          sketch.normalize(c, changed);
          cases.push({
            kind: "normalize",
            board: b.id,
            section,
            name: def.name,
            changed,
            to,
            after: { start: c.start, deep: c.deep, end: c.end, offS: c.offS, trough: c.trough },
          });
        }
      }
    }
  }
}

// the channels, every count, run and longest pair, on the Shortboard and the Fish
for (const id of ["shortboard", "fish"]) {
  for (const count of [4, 6, 8]) {
    for (const run of ["parallel", "rail", "toe"]) {
      for (const longer of ["inner", "outer", "same"]) {
        sketch.use(id, "imperial", "narrow");
        const ch = sketch.makeChannels(sketch.B, count);
        ch.run = run;
        ch.longer = longer;
        sketch.state.ch = ch;
        cases.push({
          kind: "channels",
          board: id,
          count,
          run,
          longer,
          ch: plain(ch),
          fit: sketch.channelFit(ch),
          starts: Array.from({ length: count / 2 }, (_, j) => sketch.chStart(ch, j)),
          stations: every(sketch.B.L, SIX).map((s) => ({ s, edges: sketch.channelEdges(ch, s), marks: sketch.channelMarks(ch, s) })),
        });
      }
    }
  }
}

// what Off Rail is measured from on the winged Fish, under both wing rules
for (const wingRule of ["narrow", "natural"]) {
  sketch.use("fishwing", "imperial", wingRule);
  for (const s of every(sketch.B.L, HALF)) cases.push({ kind: "refAt", board: "fishwing", wingRule, s, ref: sketch.refAt(s) });
}

/* ---------------- write ---------------- */

const provenance = {
  sketch: "021-bottom-guide",
  sketchSha1: SKETCH_SHA1,
  reference: REFERENCE,
  producer: "scripts/extract-sketch021-bottom-golden.mjs — never hand-edit; re-run the script",
  stations: STATIONS,
};
const text =
  "{\n" +
  `"provenance": ${JSON.stringify(provenance)},\n` +
  `"units": "mm",\n` +
  `"boards": [\n${boards.map((b) => JSON.stringify(b)).join(",\n")}\n],\n` +
  `"cases": [\n${cases.map((c) => JSON.stringify(c)).join(",\n")}\n]\n` +
  "}\n";
JSON.parse(text);
writeFileSync(OUT, text);
const counts = {};
for (const c of cases) counts[c.kind] = (counts[c.kind] ?? 0) + 1;
console.log(
  `wrote ${path.relative(ROOT, OUT)}: ${boards.length} boards, ${cases.length} cases (${Object.entries(counts).map(([k, n]) => `${n} ${k}`).join(", ")}), ${(text.length / 1e6).toFixed(2)} MB`,
);
