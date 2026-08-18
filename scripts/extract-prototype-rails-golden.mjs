#!/usr/bin/env node
// GENERATED FILE PRODUCER — this script extracts and EXECUTES the prototype's own
// `round16`, `toFrac`, `disp`, `familyLabel`, `apexLenRangeFor`, `cornerCutRailOffsetFor`,
// `deckMark1For`, `deckMark3For`, `computeSection`, `buildProfilePoints`, `buildSegmentDefs`,
// `cardFromResult` and `syncSnapshot` methods from reference/project/Rails.dc.html, then writes
// their output to lib/geometry/__fixtures__/prototype-rails-golden.json. Never hand-copy or
// retype the prototype's math here — that would silently validate a wrong port. The output
// JSON is generated and must never be hand-edited; re-run `npm run golden` (or
// `npm run golden:rails`) to regenerate it.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const htmlPath = path.join(repoRoot, "reference/project/Rails.dc.html");
const outputPath = path.join(
  repoRoot,
  "lib/geometry/__fixtures__/prototype-rails-golden.json",
);

const html = readFileSync(htmlPath, "utf8");

/**
 * Finds a method DEFINITION (never a call site) by its unique literal marker, paren-matches
 * its parameter list, then brace-matches its body. Returns the raw parameter-list source (used
 * verbatim as `new Function`'s arg-name string, so destructured params work unchanged) and the
 * raw body source.
 */
function extractMethod(marker) {
  const markerIdx = html.indexOf(marker);
  if (markerIdx === -1) {
    throw new Error(
      `Could not find "${marker}" in ${htmlPath} — has the prototype's method been renamed?`,
    );
  }
  const parenIdx = html.indexOf("(", markerIdx);
  let depth = 0;
  let closeParenIdx = -1;
  for (let i = parenIdx; i < html.length; i++) {
    const ch = html[i];
    if (ch === "(") depth++;
    else if (ch === ")") {
      depth--;
      if (depth === 0) {
        closeParenIdx = i;
        break;
      }
    }
  }
  if (closeParenIdx === -1) {
    throw new Error(`Failed to paren-match the parameter list for "${marker}".`);
  }
  const params = html.slice(parenIdx + 1, closeParenIdx);

  const braceStart = html.indexOf("{", closeParenIdx);
  let bdepth = 0;
  let bodyStart = -1;
  let bodyEnd = -1;
  for (let i = braceStart; i < html.length; i++) {
    const ch = html[i];
    if (ch === "{") {
      bdepth++;
      if (bdepth === 1) bodyStart = i + 1;
    } else if (ch === "}") {
      bdepth--;
      if (bdepth === 0) {
        bodyEnd = i;
        break;
      }
    }
  }
  if (bodyStart === -1 || bodyEnd === -1) {
    throw new Error(`Failed to brace-match the method body for "${marker}".`);
  }
  return { params, body: html.slice(bodyStart, bodyEnd) };
}

// Markers are each a literal substring that appears ONLY at the method's own definition line —
// never at a call site (call sites pass different argument expressions, e.g. `this.round16(x *
// 16)` never contains the literal text "round16(x) {"). `computeSection`'s marker deliberately
// includes the trailing comma after its first destructured field (`thickness,`) — every call
// site instead writes `thickness: someExpr`, so the comma form is unique to the definition.
const METHOD_MARKERS = {
  round16: "round16(x) {",
  toFrac: "toFrac(x) {",
  disp: "disp(inches) {",
  familyLabel: "familyLabel(x) {",
  apexLenRangeFor: "apexLenRangeFor(x) {",
  cornerCutRailOffsetFor: "cornerCutRailOffsetFor(x) {",
  deckMark1For: "deckMark1For(x) {",
  deckMark3For: "deckMark3For(x) {",
  computeSection: "computeSection({ thickness,",
  buildProfilePoints: "buildProfilePoints(r, thickness, domed, opts) {",
  buildSegmentDefs: "buildSegmentDefs(r, thickness, domed, opts) {",
  cardFromResult: "cardFromResult(title, subtitle, r, domed, boardThickness) {",
  syncSnapshot: "syncSnapshot() {",
};

const host = {};
for (const [name, marker] of Object.entries(METHOD_MARKERS)) {
  const { params, body } = extractMethod(marker);
  // eslint-disable-next-line no-new-func
  host[name] = new Function(params, body);
}

// ---- Fixture states ----------------------------------------------------------------------

// Transcribed from the prototype's own state defaults (Rails.dc.html lines 507-527).
const defaults = {
  units: "in",
  centerDeckPercent: 100,
  centerBoardThickness: 2.5,
  centerFamily: 3,
  centerRatioTop: 60,
  centerSymmetrical: false,
  noseDeckPercent: 100,
  noseFamily: 3,
  noseRatioTop: 60,
  noseSymmetrical: false,
  tailDeckPercent: 100,
  tailFamily: 3,
  tailRatioTop: 60,
  tailSymmetrical: false,
  noseThickness: 1.31,
  tailThickness: 1.56,
  noseCornerCutOffsetOverride: null,
  centerCornerCutOffsetOverride: null,
  tailCornerCutOffsetOverride: null,
  noseRemoveCornerCut: false,
  centerRemoveCornerCut: false,
  tailRemoveCornerCut: false,
  noseSingleTuck: false,
  centerSingleTuck: false,
  tailSingleTuck: false,
  noseBottomTuck3Override: null,
  centerBottomTuck3Override: null,
  tailBottomTuck3Override: null,
  tailHardEdge: true,
};

const fixtures = {
  default: { ...defaults },
  domedCenter: { ...defaults, centerDeckPercent: 80 },
  domedAll: { ...defaults, noseDeckPercent: 72, centerDeckPercent: 80, tailDeckPercent: 85 },
  familyBoxy: { ...defaults, noseFamily: 1, centerFamily: 1, tailFamily: 1 },
  familyKnifey: { ...defaults, noseFamily: 5, centerFamily: 5, tailFamily: 5 },
  symmetrical: {
    ...defaults,
    noseSymmetrical: true,
    centerSymmetrical: true,
    tailSymmetrical: true,
    tailHardEdge: false,
  },
  hardEdgeOff: { ...defaults, tailHardEdge: false },
  singleTuck: {
    ...defaults,
    noseSingleTuck: true,
    centerSingleTuck: true,
    tailSingleTuck: true,
    tailHardEdge: false,
  },
  removeCornerCut: {
    ...defaults,
    noseRemoveCornerCut: true,
    centerRemoveCornerCut: true,
    tailRemoveCornerCut: true,
  },
  overrides: {
    ...defaults,
    centerCornerCutOffsetOverride: 0.09375,
    noseBottomTuck3Override: 0.5,
    tailBottomTuck3Override: 0.75,
    tailHardEdge: false,
  },
  ratioExtremes: { ...defaults, noseRatioTop: 30, centerRatioTop: 70, tailRatioTop: 30 },
};

const SECTIONS = ["nose", "center", "tail"];
const SECTION_TITLE = { nose: "Nose", center: "Center", tail: "Tail" };
// scale / domedBandBase per section, copied verbatim from syncSnapshot's own computeSection
// call-site wiring (Rails.dc.html lines 552-554): center scale=1/domedBandBase=6in, nose and
// tail scale=0.75/domedBandBase=4.5in.
const SECTION_SCALE = { nose: 0.75, center: 1, tail: 0.75 };
const SECTION_DOMED_BAND_BASE = { nose: 4.5, center: 6, tail: 4.5 };

function boardThicknessKey(section) {
  return section === "center" ? "centerBoardThickness" : `${section}Thickness`;
}

function subtitleFor(section, domed, familyLabel, ratioTop, symmetrical, hardEdge) {
  const base = `${domed ? "Domed" : "Flat"} · Family ${familyLabel} · Ratio ${ratioTop}/${100 - ratioTop}`;
  if (section === "tail") {
    return base + (hardEdge ? " · Hard Edge" : symmetrical ? " · Symmetrical" : "");
  }
  return base + (symmetrical ? " · Symmetrical" : "");
}

const golden = {};
for (const [fixtureName, state] of Object.entries(fixtures)) {
  host.state = state;
  host.props = {};
  const snapshot = host.syncSnapshot();

  const sections = {};
  for (const section of SECTIONS) {
    const domed = state[`${section}DeckPercent`] < 100;
    const boardThicknessIn = state[boardThicknessKey(section)];
    const railThicknessClampedIn = snapshot[`${section}RailThickness`];
    const thicknessEffIn = domed ? railThicknessClampedIn : boardThicknessIn;
    const scale = SECTION_SCALE[section];
    const domedBandBase = SECTION_DOMED_BAND_BASE[section];

    const computeArgs = {
      thickness: thicknessEffIn,
      ratioTopPct: state[`${section}RatioTop`],
      family: state[`${section}Family`],
      domed,
      domedBandBase,
      scale,
      cornerCutOffsetOverride: state[`${section}CornerCutOffsetOverride`],
      removeCornerCut: state[`${section}RemoveCornerCut`],
      singleTuck: state[`${section}SingleTuck`],
      bottomTuck3Override: state[`${section}BottomTuck3Override`],
      symmetrical: state[`${section}Symmetrical`],
    };
    if (section === "tail") computeArgs.hardEdge = state.tailHardEdge;

    const result = host.computeSection(computeArgs);
    const profile = snapshot[`${section}Profile`];
    const segmentOpts = {
      boardThickness: boardThicknessIn,
      railThicknessVal: railThicknessClampedIn,
      domedBandBase,
    };
    const segmentsFull = host.buildSegmentDefs(result, thicknessEffIn, domed, segmentOpts);
    const segments = segmentsFull.map((sg) => ({ key: sg.key, label: sg.label, p1: sg.p1, p2: sg.p2 }));

    const familyLabel = host.familyLabel(state[`${section}Family`]);
    const subtitle = subtitleFor(
      section,
      domed,
      familyLabel,
      state[`${section}RatioTop`],
      state[`${section}Symmetrical`],
      section === "tail" ? state.tailHardEdge : false,
    );
    const card = host.cardFromResult(SECTION_TITLE[section], subtitle, result, domed, boardThicknessIn);

    sections[section] = {
      domed,
      boardThicknessIn,
      railThicknessClampedIn,
      thicknessEffIn,
      result,
      profile,
      segments,
      card,
    };
  }

  golden[fixtureName] = { state, sections };
}

mkdirSync(path.dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(golden, null, 2)}\n`, "utf8");
console.log(`Wrote ${Object.keys(golden).length} fixtures to ${path.relative(repoRoot, outputPath)}`);
