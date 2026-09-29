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
//
// quick 260928-p45 (Phase 13 item 6): the script now ALSO writes
// lib/geometry/__fixtures__/prototype-fins-imported-golden.json, by executing the same
// `renderVals` plus two more prototype methods this second pass needs — `effectiveHalfWidthAt`,
// `outlineOffTailAtHalfWidth`, `syncFromTemplate` and `importedOutlinePath` — with
// `host.props.templateValues.tailGeom` built from the app's own `buildOutline`, exactly the way
// Template.dc.html's `syncSnapshot` builds it for the real Template screen. Because this second
// pass imports the app's own TypeScript geometry (`BOARD_PRESETS`, `DEFAULT_BOARD_SPEC`,
// `TAIL_PRESETS`, `buildOutline`, `mmToInches`), the whole file now runs under `tsx`
// (`npm run golden` / `npm run golden:fins`) rather than plain `node` — the same posture as
// `scripts/extract-phase11-foil-golden.ts`. tsx is already in `node_modules` through drizzle-kit
// and vite; nothing new is installed for this. The FALLBACK fixture's production above (the
// `fixtures`/`golden` loop, ending at its own `writeFileSync`) is completely unchanged — the
// fallback `renderVals` never reaches `syncFromTemplate` or `importedOutlinePath`, so that first
// fixture cannot move.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { BOARD_PRESETS } from "../lib/geometry/presets.ts";
import { DEFAULT_BOARD_SPEC, TAIL_PRESETS } from "../lib/geometry/board.ts";
import { buildOutline } from "../lib/geometry/outline.ts";
import { mmToInches } from "../lib/geometry/units.ts";

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
const constFn = new Function(`${constStatement} return { SCALE, ORIGIN_X, TAIL_Y, VIEW_IN, VIEW_TOP_MARGIN };`);
const { SCALE, ORIGIN_X, TAIL_Y, VIEW_IN, VIEW_TOP_MARGIN } = constFn();

const CONST_PARAMS = "SCALE, ORIGIN_X, TAIL_Y, VIEW_IN, VIEW_TOP_MARGIN";
const CONST_ARGS = [SCALE, ORIGIN_X, TAIL_Y, VIEW_IN, VIEW_TOP_MARGIN];

// Markers are each a literal substring that appears ONLY at the method's own definition line.
const HELPER_METHOD_MARKERS = {
  _themeVars: "_themeVars() {",
  effectiveHalfWidthAt: "effectiveHalfWidthAt(w12, y) {",
  syncFromTemplate: "syncFromTemplate() {",
  importedOutlinePath: "importedOutlinePath(geom) {",
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
  const fn = new Function(`${CONST_PARAMS}, ${params}`, body);
  host[name] = function (...args) {
    return fn.call(this, ...CONST_ARGS, ...args);
  };
}

const { body: renderValsBody } = extractMethod("renderVals() {");
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

// Hoisted so both the fallback pass below and the imported pass (quick 260928-p45, further down)
// build a fixture's `vals`/`marksInches` the identical way — character-for-character the same
// logic as before this task, just no longer copy-pasted between the two passes.
function snapshotFromVals(vals) {
  const snapshot = {};
  for (const field of SNAPSHOT_FIELDS) {
    snapshot[field] = vals[field] ?? null;
  }
  snapshot.frontModelOptions = pickOptionValueLabel(vals.frontModelOptions);
  snapshot.quadRearModelOptions = pickOptionValueLabel(vals.quadRearModelOptions);
  snapshot.twinTypeOptions = pickOptionValueLabel(vals.twinTypeOptions);
  snapshot.finSetupOptions = pickOptionValueLabel(vals.finSetupOptions);
  return snapshot;
}

// Convert the returned pixel-space finMarks back into transform-agnostic inches with the
// prototype's own inverse (this is exactly what the prototype's own `_lastFinMarksInches`
// does at Fins.dc.html lines 1190-1193).
function marksInchesFromVals(vals) {
  return (vals.finMarks || []).map((m) => ({
    teOffTail: (TAIL_Y - m.baselineY1) / SCALE,
    teLateral: (m.baselineX1 - ORIGIN_X) / SCALE,
    leOffTail: (TAIL_Y - m.baselineY2) / SCALE,
    leLateral: (m.baselineX2 - ORIGIN_X) / SCALE,
    baseStrokeDasharray: m.baseStrokeDasharray,
  }));
}

const golden = {};
for (const [name, state] of Object.entries(fixtures)) {
  host.state = state;
  const vals = host.renderVals();
  golden[name] = { state, vals: snapshotFromVals(vals), marksInches: marksInchesFromVals(vals) };
}

mkdirSync(path.dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(golden, null, 2)}\n`, "utf8");
console.log(`Wrote ${Object.keys(golden).length} fixtures to ${path.relative(repoRoot, outputPath)}`);

// ============================================================================================
// quick 260928-p45 (Phase 13 item 6) — the imported-template branch, on the app's real outlines
// ============================================================================================
//
// Everything above this line is exactly as it was before this task: the fallback fixture is
// written and logged, using `host.props = { templateValues: null }` and the no-op
// `host.setState` set up near the top of this file. Nothing below can change what is already on
// disk at `outputPath` — it only builds a second, independent fixture at `importedOutputPath` by
// driving the SAME extracted prototype methods (`host.renderVals`, `host.effectiveHalfWidthAt`,
// `host.outlineOffTailAtHalfWidth`, `host.syncFromTemplate`) with a REAL `templateValues.tailGeom`
// built from the app's own `buildOutline`, exactly the shape Template.dc.html's `syncSnapshot`
// builds for the real Template screen (see the header comment) and the shape
// Sandbox.dc.html's `templateValuesForFin` hands to the real Fins screen.

const importedOutputPath = path.join(
  repoRoot,
  "lib/geometry/__fixtures__/prototype-fins-imported-golden.json",
);

/**
 * The prototype's own `templateValuesForFin` shape (Sandbox.dc.html lines 203-208), built from
 * the app's real geometry instead of the live Template screen's state.
 */
function templateValuesFor(outlineSpec) {
  const g = buildOutline(outlineSpec);
  // Template.dc.html line 284: `points: g.rightPts.filter(([y]) => y <= 24)` — map to the
  // prototype's own [y, x] (off-tail, half-width) order FIRST, then filter on the inch value,
  // in that order.
  const points = g.points
    .map((p) => [mmToInches(p.station), mmToInches(p.halfWidth)])
    .filter(([y]) => y <= 24);
  // AXIS SWAP: the app's `knots[0].point` is `{x: station, y: halfWidth}` (outline.ts deviation
  // 1), while the prototype's own P0 is `{y: station, x: halfWidth}` (Template.dc.html lines
  // 521-523) — so the prototype's `podY` (a STATION) is the app's knot's `x`, and the
  // prototype's `podX` (a half-width) is the app's knot's `y`.
  const podX = mmToInches(g.knots[0].point.y);
  const podY = mmToInches(g.knots[0].point.x);
  const tailKind = outlineSpec.tail.kind;
  // Template.dc.html line 276's connector rule.
  const connector =
    tailKind === "diamond"
      ? { x: 0, y: 0 }
      : tailKind === "swallow"
        ? { x: 0, y: mmToInches(g.centreCloseStation) }
        : null;
  return {
    available: true,
    lengthIn: mmToInches(outlineSpec.length),
    tailShape: tailKind,
    w12: mmToInches(g.tailWidthAt12in),
    tailGeom: { points, podX, podY, connector },
  };
}

function findPreset(name) {
  const preset = BOARD_PRESETS.find((p) => p.name === name);
  if (!preset) {
    throw new Error(`Could not find a BOARD_PRESETS entry named "${name}" — has a preset been renamed?`);
  }
  return preset;
}

/** The one place [defaults] INPUTS are mapped from an app FinPlacementSpec into the prototype's
 * own state shape — the inverse of this test file's own toSpec (lib/geometry/fins.test.ts). Maps
 * INPUTS only: the resulting state is still run back through `host.syncFromTemplate()` before
 * `host.renderVals()`, exactly as the real Fins screen would. */
function finsSpecToPrototypeState(fins) {
  const adv = fins.advanced;
  return {
    ...defaults,
    lengthIn: mmToInches(fins.boardLength),
    w12: mmToInches(fins.tailWidth12),
    tailShape: fins.tailShape,
    finSetup: fins.finSetup,
    frontModel: fins.frontModel,
    quadRearModel: fins.quadRearModel,
    quadCenterFinOn: fins.quadCenterFinOn,
    twinType: fins.twinTemplate,
    baseLenForward: mmToInches(adv.baseLenForward),
    baseLenForwardOverridden: adv.baseLenForwardOverridden,
    baseLenRear: mmToInches(adv.baseLenRear),
    baseLenRearOverridden: adv.baseLenRearOverridden,
    baseLenCenter: mmToInches(adv.baseLenCenter),
    baseLenCenterOverridden: adv.baseLenCenterOverridden,
    centerPositionOffset: mmToInches(adv.centerPositionOffset),
    forwardPositionOffset: mmToInches(adv.forwardPositionOffset),
    forwardToeOverride: adv.forwardToeOverride !== null ? mmToInches(adv.forwardToeOverride) : null,
    rearPositionOffset: mmToInches(adv.rearPositionOffset),
    rearToeOverride: adv.rearToeOverride !== null ? mmToInches(adv.rearToeOverride) : null,
    quadRearOffRailOverride:
      adv.quadRearOffRailOverride !== null ? mmToInches(adv.quadRearOffRailOverride) : null,
    quadRearOffTailOverride:
      adv.quadRearOffTailOverride !== null ? mmToInches(adv.quadRearOffTailOverride) : null,
    quadRearOffTailOverridden: adv.quadRearOffTailOverridden,
  };
}

// Nine outlines: the four presets' own outlines, plus DEFAULT_BOARD_SPEC.outline with each of the
// five tail-shape button presets applied — exactly what a TEMPLATE tail button applies
// (lib/geometry/board.ts's TAIL_PRESETS; see components/outline/outline-controls.tsx ~line 304).
const TAIL_KINDS = ["pin", "round", "diamond", "squash", "swallow"];

const IMPORTED_OUTLINES = {
  "preset-shortboard": { source: 'BOARD_PRESETS "Shortboard"', outlineSpec: findPreset("Shortboard").outline },
  "preset-fish": { source: 'BOARD_PRESETS "Fish"', outlineSpec: findPreset("Fish").outline },
  "preset-mid-length": { source: 'BOARD_PRESETS "Mid-length"', outlineSpec: findPreset("Mid-length").outline },
  "preset-longboard": { source: 'BOARD_PRESETS "Longboard"', outlineSpec: findPreset("Longboard").outline },
};
for (const kind of TAIL_KINDS) {
  const preset = TAIL_PRESETS[kind];
  IMPORTED_OUTLINES[`tail-${kind}`] = {
    source: `DEFAULT_BOARD_SPEC.outline + TAIL_PRESETS.${kind}`,
    outlineSpec: {
      ...DEFAULT_BOARD_SPEC.outline,
      tail: preset.tail,
      tailAngle: preset.tailAngle,
      tailFullness: preset.tailFullness,
    },
  };
}

// 32 cases: the four presets' own fin setups on their own outlines; five fin setups (thruster,
// twin, 2+1, quad-Basic-Off-Rail, quad-McKee-SB/Gun five-fin) on each of the five tail-shape
// outlines; the Longboard preset's outline forced onto the McKee Longboard quad rear model; and
// two of the presets' outlines with an advanced override applied. Never a quad "basic" case on
// the Fish outline (measurement 8: quadRearBasic's Math.ceil((L - 68) / 5) sits exactly on a step
// there).
const IMPORTED_CASES = {
  "preset-shortboard": { outline: "preset-shortboard", state: finsSpecToPrototypeState(findPreset("Shortboard").fins) },
  "preset-fish": { outline: "preset-fish", state: finsSpecToPrototypeState(findPreset("Fish").fins) },
  "preset-mid-length": { outline: "preset-mid-length", state: finsSpecToPrototypeState(findPreset("Mid-length").fins) },
  "preset-longboard": { outline: "preset-longboard", state: finsSpecToPrototypeState(findPreset("Longboard").fins) },
};
for (const kind of TAIL_KINDS) {
  const outlineKey = `tail-${kind}`;
  IMPORTED_CASES[`${outlineKey}-thruster`] = { outline: outlineKey, state: { ...defaults } };
  IMPORTED_CASES[`${outlineKey}-twin`] = { outline: outlineKey, state: { ...defaults, finSetup: "twin" } };
  IMPORTED_CASES[`${outlineKey}-2plus1`] = {
    outline: outlineKey,
    state: { ...defaults, finSetup: "2plus1", baseLenCenter: 10.5 },
  };
  IMPORTED_CASES[`${outlineKey}-quad-offrail`] = {
    outline: outlineKey,
    state: { ...defaults, finSetup: "quad", quadRearModel: "basicOffRail" },
  };
  IMPORTED_CASES[`${outlineKey}-quad-mckeesb-five`] = {
    outline: outlineKey,
    state: { ...defaults, finSetup: "quad", quadRearModel: "mckeeSB", quadCenterFinOn: true },
  };
}
{
  const longboardOutlineSpec = findPreset("Longboard").outline;
  if (mmToInches(longboardOutlineSpec.length) < 96) {
    throw new Error(
      "preset-longboard-quad-mckeelb needs the Longboard preset's own outline to be at least 96in long (MIN_MCKEE_LONGBOARD_QUAD_LENGTH) — has the preset changed?",
    );
  }
}
IMPORTED_CASES["preset-longboard-quad-mckeelb"] = {
  outline: "preset-longboard",
  state: { ...defaults, finSetup: "quad", quadRearModel: "mckeeLB" },
};
IMPORTED_CASES["preset-fish-advanced"] = {
  outline: "preset-fish",
  state: {
    ...finsSpecToPrototypeState(findPreset("Fish").fins),
    forwardPositionOffset: -0.5,
    forwardToeOverride: 0.25,
  },
};
IMPORTED_CASES["preset-mid-length-advanced"] = {
  outline: "preset-mid-length",
  state: {
    ...finsSpecToPrototypeState(findPreset("Mid-length").fins),
    rearPositionOffset: 0.25,
    quadRearOffRailOverride: 1.75,
    quadRearOffTailOverride: 6.5,
    quadRearOffTailOverridden: true,
  },
};

// The targets deliberately avoid every tail's exact half-block width (2, 2.5, 4, 4.25, 5in),
// where an inch/mm round trip could flip the prototype's early `>=` return.
const HW_PROBE_Y = [-1, 0, 0.5, 1, 2, 2.5, 3, 3.5, 4.5, 6, 6.25, 7.5, 9, 11, 12, 13.5, 15, 18, 21, 23.95, 24, 26];
const OFFTAIL_PROBE_HW = [0.3, 1.7, 2.9, 3.6, 4.4, 5.3, 5.8, 6.2, 6.7, 7.1, 7.6, 8.3, 9.4, 12.5];

// The imported pass needs `syncFromTemplate` to actually be able to write its patch — the
// fallback pass above never calls it, so the no-op `host.setState` set up near the top of this
// file was never a problem for it.
host.setState = (patch) => {
  host.state = { ...host.state, ...patch };
};

const outlines = {};
for (const [key, { source, outlineSpec }] of Object.entries(IMPORTED_OUTLINES)) {
  const templateValues = templateValuesFor(outlineSpec);
  host.props = { templateValues };
  host.state = { ...defaults };
  host.syncFromTemplate();
  const halfWidthProbes = HW_PROBE_Y.map((y) => ({
    y,
    halfWidth: host.effectiveHalfWidthAt(host.state.w12, y),
  }));
  const offTailProbes = OFFTAIL_PROBE_HW.map((targetHw) => ({
    targetHw,
    offTail: host.outlineOffTailAtHalfWidth(host.state.w12, targetHw),
  }));
  outlines[key] = { source, outlineSpec, templateValues, halfWidthProbes, offTailProbes };
}

const cases = {};
for (const [name, { outline: outlineKey, state }] of Object.entries(IMPORTED_CASES)) {
  const outlineEntry = outlines[outlineKey];
  if (!outlineEntry) {
    throw new Error(`Imported case "${name}" references unknown outline key "${outlineKey}"`);
  }
  host.props = { templateValues: outlineEntry.templateValues };
  host.state = { ...state };
  host.syncFromTemplate();
  const vals = host.renderVals();
  cases[name] = {
    outline: outlineKey,
    state: host.state,
    vals: snapshotFromVals(vals),
    marksInches: marksInchesFromVals(vals),
  };
}

mkdirSync(path.dirname(importedOutputPath), { recursive: true });
writeFileSync(importedOutputPath, `${JSON.stringify({ outlines, cases }, null, 2)}\n`, "utf8");
console.log(
  `Wrote ${Object.keys(outlines).length} outlines and ${Object.keys(cases).length} imported cases to ${path.relative(repoRoot, importedOutputPath)}`,
);
