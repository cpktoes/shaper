#!/usr/bin/env node
// GENERATED FILE PRODUCER — this script extracts and EXECUTES the prototype's own `renderVals`
// method (whole, statement-for-statement) plus every helper it reaches — `round16`, `toFrac`,
// `disp`, `toU`, `fromU`, `centerDefaultFor`, `resetAdvancedPatch`, `catmullPath`, `xBaseAt`,
// `scaleFactor`, `outlinePath`, `halfWidthAt`, `outlineOffTailAtHalfWidth`, `buildFinMark`,
// `effectiveHalfWidthAt`, the quad/McKee reference-guide equation methods, `toeTableData`,
// `finGlyph`, `straightFinGlyph` and `_themeVars` — from reference/project/Fins.dc.html, plus
// the toe-in aim tables from reference/project/toe-aim-tables.js, then writes their output to
// lib/geometry/__fixtures__/prototype-fins-golden.json. Never hand-copy or retype the
// prototype's math here — that would silently validate a wrong port against a second
// hand-transcription instead of against the prototype itself. The output JSON is generated and
// must never be hand-edited; re-run `npm run golden` (or `npm run golden:fins`) to regenerate it.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const htmlPath = path.join(repoRoot, "reference/project/Fins.dc.html");
const toeTablesPath = path.join(repoRoot, "reference/project/toe-aim-tables.js");
const outputPath = path.join(repoRoot, "lib/geometry/__fixtures__/prototype-fins-golden.json");

const html = readFileSync(htmlPath, "utf8");

/**
 * Finds a method DEFINITION (never a call site) by its unique literal marker, paren-matches its
 * parameter list, then brace-matches its body. Returns the raw parameter-list source (used
 * verbatim as `new Function`'s arg-name string, so destructured params work unchanged) and the
 * raw body source. Same helper as scripts/extract-prototype-rails-golden.mjs.
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

// `renderVals` and several of its helpers read five module-scope constants (SCALE, ORIGIN_X,
// TAIL_Y, VIEW_IN, VIEW_TOP_MARGIN) that are not on `this`, so they cannot resolve inside a `new
// Function` body on their own. Recover their values by slicing the source's own declaration
// line to its terminating semicolon and evaluating that one statement — never retype the values.
const CONST_MARKER = "const SCALE = 14,";
const constIdx = html.indexOf(CONST_MARKER);
if (constIdx === -1) {
  throw new Error(
    `Could not find "${CONST_MARKER}" in ${htmlPath} — has the prototype's diagram-constants line changed?`,
  );
}
const constSemiIdx = html.indexOf(";", constIdx);
if (constSemiIdx === -1) {
  throw new Error("Failed to find the terminating semicolon for the SCALE/ORIGIN_X/... const line.");
}
const constStatement = html.slice(constIdx, constSemiIdx + 1);
// eslint-disable-next-line no-new-func
const constFn = new Function(`${constStatement} return { SCALE, ORIGIN_X, TAIL_Y, VIEW_IN, VIEW_TOP_MARGIN };`);
const { SCALE, ORIGIN_X, TAIL_Y, VIEW_IN, VIEW_TOP_MARGIN } = constFn();

const CONST_PARAMS = "SCALE, ORIGIN_X, TAIL_Y, VIEW_IN, VIEW_TOP_MARGIN";
const CONST_ARGS = [SCALE, ORIGIN_X, TAIL_Y, VIEW_IN, VIEW_TOP_MARGIN];

// Markers are each a literal substring that appears ONLY at the method's own definition line.
const HELPER_METHOD_MARKERS = {
  _themeVars: "_themeVars() {",
  effectiveHalfWidthAt: "effectiveHalfWidthAt(w12, y) {",
  round16: "round16(x) {",
  toFrac: "toFrac(x) {",
  disp: "disp(inches) {",
  toU: "toU(inches) {",
  fromU: "fromU(v) {",
  centerDefaultFor: "centerDefaultFor(setup) {",
  resetAdvancedPatch: "resetAdvancedPatch(setupOverride) {",
  catmullPath: "catmullPath(pts) {",
  xBaseAt: "xBaseAt(shape, y) {",
  scaleFactor: "scaleFactor(shape, w12) {",
  outlinePath: "outlinePath(shape, w12,",
  halfWidthAt: "halfWidthAt(shape, w12, y) {",
  outlineOffTailAtHalfWidth: "outlineOffTailAtHalfWidth(w12, targetHw) {",
  buildFinMark: "buildFinMark({ offTailIn,",
  quadFrontLongboard: "quadFrontLongboard(L) {",
  quadRearLongboard: "quadRearLongboard(L) {",
  quadSpreadLongboard: "quadSpreadLongboard(L, W) {",
  quadFrontMcKeeShortboard: "quadFrontMcKeeShortboard(L) {",
  quadFrontMcKeeGun: "quadFrontMcKeeGun(L) {",
  quadRearShortboard: "quadRearShortboard(L) {",
  quadSpreadSBGun: "quadSpreadSBGun(W) {",
  quadRearBasic: "quadRearBasic(L) {",
  quadSpreadBasic: "quadSpreadBasic(W) {",
  mckeeFrontToe: "mckeeFrontToe(L) {",
  aimToe: "aimToe(baseLen, halfSpread, xMinus) {",
  toeTableData: "toeTableData(L, W) {",
  finGlyph: "finGlyph(x, yTip, yBase, hb = 3.4) {",
  straightFinGlyph: "straightFinGlyph(x, yTip, yBase, hw = 1.4) {",
};

const host = {};
for (const [name, marker] of Object.entries(HELPER_METHOD_MARKERS)) {
  const { params, body } = extractMethod(marker);
  // eslint-disable-next-line no-new-func
  const fn = new Function(`${CONST_PARAMS}, ${params}`, body);
  host[name] = function (...args) {
    return fn.call(this, ...CONST_ARGS, ...args);
  };
}

const { body: renderValsBody } = extractMethod("renderVals() {");
// eslint-disable-next-line no-new-func
const renderValsFn = new Function(CONST_PARAMS, renderValsBody);
host.renderVals = function () {
  return renderValsFn.call(this, ...CONST_ARGS);
};

// Stub the environment the prototype expects, and nothing more.
host.props = { templateValues: null }; // makes importActive falsy — every width read routes through the polynomial fallback
host.setState = () => {}; // only ever invoked from event closures, never during evaluation
host.rootRef = null;

// Load the toe-in aim tables by evaluating the prototype's own data file against a `window`
// stub, so the harness never retypes a single table cell.
const toeTablesSrc = readFileSync(toeTablesPath, "utf8");
const windowStub = {};
// eslint-disable-next-line no-new-func
new Function("window", toeTablesSrc)(windowStub);
globalThis.window = windowStub;

// ---- Fixture states ----------------------------------------------------------------------

// Transcribed from the prototype's own state defaults (Fins.dc.html lines 583-600).
const defaults = {
  lengthIn: 72,
  w12: 13,
  tailShape: "squash",
  finSetup: "thruster",
  units: "in",
  globalSettingsOpen: false,
  frontModel: "mckeeSB",
  quadRearModel: "mckeeSB",
  twinType: "upright",
  baseLenTwin: 4.5,
  quadCenterFinOn: false,
  advancedOpen: false,
  baseLenForward: 4.5,
  baseLenForwardOverridden: false,
  baseLenForwardEditing: false,
  baseLenRear: 4.5,
  baseLenRearOverridden: false,
  baseLenRearEditing: false,
  baseLenCenter: 4.5,
  baseLenCenterOverridden: false,
  baseLenCenterEditing: false,
  centerPositionOffset: 0,
  forwardPositionOffset: 0,
  forwardToeOverride: null,
  rearPositionOffset: 0,
  rearToeOverride: null,
  quadRearOffRailOverride: null,
  quadRearOffTailOverride: null,
  quadRearOffTailOverridden: false,
  quadRearOffTailEditing: false,
  copyToast: false,
  toeTableOpen: false,
  importTemplate: true,
  viewTab: "viewer",
  showCallouts: true,
  rootAvailH: 0,
};

const fixtures = {
  default: { ...defaults },
  thrusterProportional: { ...defaults, frontModel: "proportional" },
  thrusterBasic: { ...defaults, frontModel: "basic" },
  thrusterMcKeeGun: { ...defaults, lengthIn: 90, w12: 12, tailShape: "pin", frontModel: "mckeeGun" },
  thrusterNarrowBoundary: { ...defaults, w12: 12.5 },
  thrusterJustAboveNarrow: { ...defaults, w12: 12.625 },
  single: { ...defaults, finSetup: "single", baseLenCenter: 10.5 },
  twinUpright: { ...defaults, finSetup: "twin" },
  twinKeel: { ...defaults, finSetup: "twin", twinType: "keel" },
  twinTrailer: { ...defaults, finSetup: "twin", twinType: "trailer" },
  twoPlusOne: { ...defaults, finSetup: "2plus1", lengthIn: 108, w12: 15, tailShape: "round", baseLenCenter: 10.5 },
  quadBasic: { ...defaults, finSetup: "quad", quadRearModel: "basic" },
  quadBasicWideTail: { ...defaults, finSetup: "quad", quadRearModel: "basic", w12: 14 },
  quadBasicOffRail: { ...defaults, finSetup: "quad", quadRearModel: "basicOffRail" },
  quadMcKeeSB: { ...defaults, finSetup: "quad", quadRearModel: "mckeeSB" },
  quadMcKeeSBLong: { ...defaults, finSetup: "quad", quadRearModel: "mckeeSB", lengthIn: 90, w12: 14 },
  quadMcKeeSBPintail: { ...defaults, finSetup: "quad", quadRearModel: "mckeeSB", tailShape: "pin", w12: 12 },
  quadFiveFin: { ...defaults, finSetup: "quad", quadRearModel: "mckeeSB", quadCenterFinOn: true },
  quadMcKeeLB: { ...defaults, finSetup: "quad", quadRearModel: "mckeeLB", lengthIn: 108, w12: 16, tailShape: "round" },
  quadMcKeeLBLong: {
    ...defaults,
    finSetup: "quad",
    quadRearModel: "mckeeLB",
    lengthIn: 114,
    w12: 16.5,
    tailShape: "round",
  },
};

fixtures.advancedThruster = {
  ...fixtures.default,
  baseLenForward: 5.25,
  baseLenForwardOverridden: true,
  baseLenCenter: 5,
  baseLenCenterOverridden: true,
  forwardPositionOffset: -0.5,
  centerPositionOffset: 0.375,
  forwardToeOverride: 0.1875,
};
fixtures.advancedQuad = {
  ...fixtures.quadBasicOffRail,
  baseLenRear: 4,
  baseLenRearOverridden: true,
  rearPositionOffset: 0.25,
  rearToeOverride: 0.3125,
  quadRearOffRailOverride: 1.75,
  quadRearOffTailOverride: 6.5,
  quadRearOffTailOverridden: true,
};
fixtures.toeTableShort = {
  ...fixtures.default,
  lengthIn: 66,
  w12: 12.4,
  toeTableOpen: true,
};

const SNAPSHOT_FIELDS = [
  "summarySections",
  "legendBaseLens",
  "modelHeader",
  "isModified",
  "summaryLengthDisplay",
  "summaryTailWidthDisplay",
  "summaryFinSetupDisplay",
  "summaryTailShapeDisplay",
  "toeTable",
  "toeBoardCaption",
  "centerSectionLabel",
  "forwardSectionLabel",
  "rearSectionLabel",
  "centerBaseLenFieldLabel",
  "hasCenterSection",
  "hasForwardSection",
  "hasRearSection",
  "quadCenterFinAvailable",
  "isLongboardQuad",
  "showFrontToeTableLink",
  "showRearToeTableLink",
  "showRearOffRailSlider",
  "showRearOffTailOverride",
  "centerFinalDisplay",
  "frontFinalDisplay",
  "pairFinalDisplay",
  "forwardToeDisplay",
  "rearToeDisplay",
  "quadRearOffRailDisplayValue",
  "quadRearOffTailInputValue",
];

function pickOptionValueLabel(list) {
  return (list || []).map((o) => ({ value: o.value, label: o.label }));
}

const golden = {};
for (const [name, state] of Object.entries(fixtures)) {
  host.state = state;
  const vals = host.renderVals();

  const snapshot = {};
  for (const field of SNAPSHOT_FIELDS) {
    snapshot[field] = vals[field] ?? null;
  }
  snapshot.frontModelOptions = pickOptionValueLabel(vals.frontModelOptions);
  snapshot.quadRearModelOptions = pickOptionValueLabel(vals.quadRearModelOptions);
  snapshot.twinTypeOptions = pickOptionValueLabel(vals.twinTypeOptions);
  snapshot.finSetupOptions = pickOptionValueLabel(vals.finSetupOptions);

  // Convert the returned pixel-space finMarks back into transform-agnostic inches with the
  // prototype's own inverse (this is exactly what the prototype's own `_lastFinMarksInches`
  // does at Fins.dc.html lines 1190-1193).
  const marksInches = (vals.finMarks || []).map((m) => ({
    teOffTail: (TAIL_Y - m.baselineY1) / SCALE,
    teLateral: (m.baselineX1 - ORIGIN_X) / SCALE,
    leOffTail: (TAIL_Y - m.baselineY2) / SCALE,
    leLateral: (m.baselineX2 - ORIGIN_X) / SCALE,
    baseStrokeDasharray: m.baseStrokeDasharray,
  }));

  golden[name] = { state, vals: snapshot, marksInches };
}

mkdirSync(path.dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(golden, null, 2)}\n`, "utf8");
console.log(`Wrote ${Object.keys(golden).length} fixtures to ${path.relative(repoRoot, outputPath)}`);
