#!/usr/bin/env node
/**
 * GENERATED FILE PRODUCER — writes lib/geometry/__fixtures__/custom-rocker-golden.json: a blank's
 * custom rocker as the founder's chosen sketch works it out (sketch 016 D, 2026-10-16: "This now
 * looks perfect. Let's build it."), on the two blanks the sketch was drawn on — the Longboard preset
 * in the US Blanks 9'4"B and the Shortboard preset in the 6'3"RP — and the reader run over every
 * line of US Blanks' own published rocker listings (quick 261016-mkb). The output is generated and
 * must never be hand-edited; re-run this script.
 *
 *   npx --no-install tsx --tsconfig ./tsconfig.json scripts/extract-sketch016-custom-rocker-golden.mjs
 *
 * run from the repository root. (Nothing in package.json — no npm script, no dependency;
 * `--no-install` means npx can only run the tsx already in node_modules, never download one. No
 * database is involved.)
 *
 * It EXECUTES the sketch's own code — `reference/sketches/016-custom-rocker-maths.js`, a byte-for-byte
 * copy of the sketch's maths — so every number in the fixture is the sketch's output, never a
 * transcription of it: `delta` (the even bend), `floorOf` (the lowest a change may go), `noteOf` (the
 * note written US Blanks' way) and `parseNote` (the note read back). It computes no bend of its own.
 *
 * The sketch's inputs are built from the app itself, exactly as the sketch's own `dump.mts` built its
 * `data.json`: each preset's blank copy (`presetDesignFields`), prepared by `prepareBlank`, sampled at
 * 201 even points along the blank; the only conversion is `mmToInches` from lib/geometry/units.ts at
 * full precision (CLAUDE.md Rule 2). The sketch bends from the blank's printed `C` station and the app
 * from half its length (P-6) — the two are the same on both blanks, and this script refuses to run if
 * that ever stops being true.
 *
 * What it records (fixture keys):
 * - `provenance`, `units`: where the numbers came from, and what they are measured in (inches).
 * - `boards`: each board's preset id, its blank's maker and name, the blank's length and centre.
 * - `cases`: twelve changes on each board — the spec in the sketch's own form (`{ nose: [{ a, f }],
 *   tail: [...] }`, inches, `f` null for the centre), its `note`, the bend `delta` at the blank's five
 *   catalogue stations and at 41 even points, and each change's `floor` in Imperial and Metric.
 * - `listing`: every listing line, the note body read off it, and what `parseNote` made of it.
 *
 * Running it twice writes the same bytes.
 */
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { presetDesignFields } from "../lib/blanks/preset-blanks.ts";
import { prepareBlank } from "../lib/geometry/blank-fit.ts";
import { CATALOG_STATION_LABELS } from "../lib/geometry/board-profile.ts";
import { BOARD_PRESETS } from "../lib/geometry/presets.ts";
import { mm, mmToInches } from "../lib/geometry/units.ts";

const ROOT = process.cwd();
const OUT = path.resolve(ROOT, "lib/geometry/__fixtures__/custom-rocker-golden.json");
const REFERENCE = "reference/sketches/016-custom-rocker-maths.js";
const LISTINGS = ".planning/spikes/001-maker-rocker-conventions/usb-public-rocker-listings.txt";

const require = createRequire(import.meta.url);
const sketch = require(path.resolve(ROOT, REFERENCE));

/** The two boards the sketch was drawn on. */
const BOARD_IDS = ["longboard", "shortboard"];

/** The twelve cases, in the sketch's own form: inches, `f` whole inches in from the tip or null. */
const CASES = [
  { label: "Natural", nose: [], tail: [] },
  { label: '+1/2"N +1/2"N18"', nose: [{ a: 0.5, f: null }, { a: 0.5, f: 18 }], tail: [] },
  { label: '-2"T', nose: [], tail: [{ a: -2, f: null }] },
  { label: '-2"N', nose: [{ a: -2, f: null }], tail: [] },
  { label: '-1/2"N24" +1/2"T24"', nose: [{ a: -0.5, f: 24 }], tail: [{ a: 0.5, f: 24 }] },
  {
    label: '-1/4"N18" +1/8"T36" +1/8"T18"',
    nose: [{ a: -0.25, f: 18 }],
    tail: [{ a: 0.125, f: 36 }, { a: 0.125, f: 18 }],
  },
  { label: '+1/2"T', nose: [], tail: [{ a: 0.5, f: null }] },
  { label: '-1 1/2"N', nose: [{ a: -1.5, f: null }], tail: [] },
  { label: '+1/2"T -1/2"T18"', nose: [], tail: [{ a: 0.5, f: null }, { a: -0.5, f: 18 }] },
  { label: '+1 1/2"N12" -3/8"T', nose: [{ a: 1.5, f: 12 }], tail: [{ a: -0.375, f: null }] },
  { label: '-1"N24" +1/4"N12"', nose: [{ a: -1, f: 24 }, { a: 0.25, f: 12 }], tail: [] },
  { label: '+3/8"N +3/8"T', nose: [{ a: 0.375, f: null }], tail: [{ a: 0.375, f: null }] },
];

/** The sketch's DATA entry for one board, and the board's record for the fixture. */
function boardData(id) {
  const preset = BOARD_PRESETS.find((p) => p.id === id);
  if (!preset) throw new Error(`no ${id} preset`);
  const copy = presetDesignFields(preset).blank.copy;
  const prepared = prepareBlank(copy);
  const lengthIn = mmToInches(copy.lengthMm);
  const centre = copy.stations.find((s) => s.label === "C");
  const centreIn = mmToInches(centre.fromTailMm);
  if (Math.abs(centreIn - lengthIn / 2) > 1e-9) {
    throw new Error(`${copy.vendor} ${copy.name}: its C station is not at half its length (P-6), so the sketch and the app would bend from different centres`);
  }
  const nat = [];
  for (let i = 0; i <= 200; i++) {
    const x = (copy.lengthMm * i) / 200;
    nat.push([mmToInches(mm(x)), mmToInches(mm(prepared.rocker.sample(x)))]);
  }
  const stations = Object.values(CATALOG_STATION_LABELS).map((label) => {
    const station = copy.stations.find((s) => s.label === label);
    if (!station) throw new Error(`${copy.vendor} ${copy.name} prints no ${label} station`);
    return { label, xIn: mmToInches(station.fromTailMm) };
  });
  return {
    record: { id, vendor: copy.vendor, name: copy.name, lengthIn, centreIn },
    data: { blank: { lengthIn, centreFromTailIn: centreIn }, nat },
    stations,
  };
}

const boards = BOARD_IDS.map(boardData);
sketch.setData(Object.fromEntries(boards.map((b) => [b.record.id, b.data])));

const cases = [];
for (const board of boards) {
  const L = board.record.lengthIn;
  for (const c of CASES) {
    const spec = { nose: c.nose.map((x) => ({ a: x.a, f: x.f })), tail: c.tail.map((x) => ({ a: x.a, f: x.f })) };
    sketch.use(board.record.id, "imperial");
    const note = sketch.noteOf(spec);
    const stations = board.stations.map((s) => ({ label: s.label, xIn: s.xIn, delta: sketch.delta(s.xIn, spec) }));
    const samples = [];
    for (let i = 0; i <= 40; i++) {
      const xIn = (L * i) / 40;
      samples.push({ xIn, delta: sketch.delta(xIn, spec) });
    }
    const floors = [];
    for (const end of ["nose", "tail"]) {
      spec[end].forEach((_, index) => {
        sketch.use(board.record.id, "imperial");
        const imperial = sketch.floorOf(end, index, spec);
        sketch.use(board.record.id, "metric");
        const metric = sketch.floorOf(end, index, spec);
        floors.push({ end, index, imperial, metric });
      });
    }
    sketch.use(board.record.id, "imperial");
    cases.push({ board: board.record.id, label: c.label, spec, note, stations, samples, floors });
  }
}

const listing = readFileSync(path.resolve(ROOT, LISTINGS), "utf8")
  .split("\n")
  .filter((line) => line.trim() !== "" && !line.startsWith("#"))
  .map((line) => {
    const body = line.replace(/^\d+'\d+"[A-Z]*\s*/, "").replace(/\s*Rocker\s*$/i, "");
    const parsed = sketch.parseNote(body);
    return { line, body, parsed: parsed ? { nose: parsed.nose, tail: parsed.tail } : null };
  });

const golden = {
  provenance: {
    sketch: ".planning/sketches/016-custom-rocker/sketch-source.tar.gz → template.html",
    sketchSha1: "ff1b6dc0aaf15b046ce645ec0faa17aece953df4",
    reference: REFERENCE,
    listings: LISTINGS,
    producer: "scripts/extract-sketch016-custom-rocker-golden.mjs — never hand-edit; re-run the script",
  },
  units: "inches",
  boards: boards.map((b) => b.record),
  cases,
  listing,
};

writeFileSync(OUT, `${JSON.stringify(golden, null, 2)}\n`);
console.log(
  `wrote ${path.relative(ROOT, OUT)}: ${cases.length} cases, ${listing.length} listing lines (${listing.filter((l) => l.parsed).length} read)`,
);
