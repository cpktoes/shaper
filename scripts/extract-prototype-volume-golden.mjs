#!/usr/bin/env node
// GENERATED FILE PRODUCER — this script extracts and EXECUTES the prototype's own `renderVals`
// method (whole, statement-for-statement) plus its helpers `round16`, `toFrac`, `disp`, `toU`,
// `fromU` and `_themeVars` — from reference/project/Volume.dc.html — then writes their output to
// lib/geometry/__fixtures__/prototype-volume-golden.json. Never hand-copy or retype the
// prototype's math here — that would silently validate a wrong port against a second
// hand-transcription instead of against the prototype itself. The output JSON is generated and
// must never be hand-edited; re-run `npm run golden` (or `npm run golden:volume`) to regenerate
// it.
//
// Volume's `renderVals` reads no module-scope constants (unlike Fins', which needs SCALE/
// ORIGIN_X/etc recovered separately), so each helper below is a plain `new Function` — no
// constant-recovery wrapper is needed.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const htmlPath = path.join(repoRoot, "reference/project/Volume.dc.html");
const outlineGoldenPath = path.join(repoRoot, "lib/geometry/__fixtures__/prototype-outline-golden.json");
const railsGoldenPath = path.join(repoRoot, "lib/geometry/__fixtures__/prototype-rails-golden.json");
const outputPath = path.join(repoRoot, "lib/geometry/__fixtures__/prototype-volume-golden.json");

const html = readFileSync(htmlPath, "utf8");

/**
 * Finds a method DEFINITION (never a call site) by its unique literal marker, paren-matches its
 * parameter list, then brace-matches its body. Returns the raw parameter-list source (used
 * verbatim as `new Function`'s arg-name string, so destructured params work unchanged) and the
 * raw body source. Same helper as scripts/extract-prototype-fins-golden.mjs and
 * scripts/extract-prototype-rails-golden.mjs.
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

// Markers are each a literal substring that appears ONLY at the method's own definition line.
const HELPER_METHOD_MARKERS = {
  _themeVars: "_themeVars() {",
  round16: "round16(x) {",
  toFrac: "toFrac(x) {",
  disp: "disp(inches) {",
  toU: "toU(inches) {",
  fromU: "fromU(v) {",
};

const host = {};
for (const [name, marker] of Object.entries(HELPER_METHOD_MARKERS)) {
  const { params, body } = extractMethod(marker);
  // eslint-disable-next-line no-new-func
  const fn = new Function(params, body);
  host[name] = function (...args) {
    return fn.call(this, ...args);
  };
}

const { params: renderValsParams, body: renderValsBody } = extractMethod("renderVals() {");
// eslint-disable-next-line no-new-func
const renderValsFn = new Function(renderValsParams, renderValsBody);
host.renderVals = function () {
  return renderValsFn.call(this);
};

// Stub the environment the prototype expects, and nothing more.
host.setState = () => {}; // only ever invoked from event closures, never during evaluation
host.rootRef = null;

// ---- Compose templateValues / railValues stubs from the already-generated outline/rails golden
// fixtures — never hand-write profile data. Those files are the recorded output of the
// prototype's own buildGeometry and syncSnapshot, so composing from them is the same thing as
// executing them, without re-running two harnesses. ----------------------------------------------

let outlineGolden;
let railsGolden;
try {
  outlineGolden = JSON.parse(readFileSync(outlineGoldenPath, "utf8"));
} catch {
  throw new Error(
    `Could not read ${outlineGoldenPath} — run \`npm run golden\` first to generate the outline golden fixture.`,
  );
}
try {
  railsGolden = JSON.parse(readFileSync(railsGoldenPath, "utf8"));
} catch {
  throw new Error(
    `Could not read ${railsGoldenPath} — run \`npm run golden\` first to generate the rails golden fixture.`,
  );
}

// Composes exactly the field set the Sandbox shell passes to Volume (Sandbox.dc.html lines
// 209-212): available, area, lengthIn, widepointWidth, noseWidthAt12, tailWidthAt12.
function templateValuesFrom(fixtureName) {
  const fx = outlineGolden[fixtureName];
  if (!fx) {
    throw new Error(`No outline golden fixture named "${fixtureName}" in ${outlineGoldenPath}.`);
  }
  return {
    available: true,
    area: fx.area,
    lengthIn: fx.state.lengthIn,
    widepointWidth: fx.state.centerWidth,
    noseWidthAt12: fx.noseWidthAt12,
    tailWidthAt12: fx.tailWidthAt12,
  };
}

// Composes exactly the field set the Sandbox shell passes to Volume for rail data (Sandbox.dc.html
// lines 213-224), restricted to the fields Volume's own renderVals actually reads: available,
// nose/center/tailThickness, nose/center/tailProfile.
function railValuesFrom(fixtureName, opts = {}) {
  const fx = railsGolden[fixtureName];
  if (!fx) {
    throw new Error(`No rails golden fixture named "${fixtureName}" in ${railsGoldenPath}.`);
  }
  const base = {
    available: true,
    noseThickness: fx.sections.nose.boardThicknessIn,
    centerThickness: fx.sections.center.boardThicknessIn,
    tailThickness: fx.sections.tail.boardThicknessIn,
    noseProfile: fx.sections.nose.profile,
    centerProfile: fx.sections.center.profile,
    tailProfile: fx.sections.tail.profile,
  };
  if (opts.withoutProfiles) {
    const { noseProfile, centerProfile, tailProfile, ...rest } = base;
    return rest;
  }
  return base;
}

// ---- Fixture states ----------------------------------------------------------------------

// Transcribed from the prototype's own state defaults (Volume.dc.html lines 188-198).
const defaults = {
  units: "in",
  globalSettingsOpen: false,
  lengthIn: 72,
  width: 20,
  centerThickness: 2.5,
  boardTypeIndex: 3,
  copyToast: false,
  importTemplateDimensions: true,
  importRailThickness: true,
  rootAvailH: 0,
};

const manualDefault = { ...defaults, importTemplateDimensions: false, importRailThickness: false };

const states = {
  manualDefault,
  manualPerformance: { ...manualDefault, boardTypeIndex: 0 },
  manualBeefy: { ...manualDefault, boardTypeIndex: 6 },
  manualLongboard: { ...manualDefault, lengthIn: 108, width: 23, centerThickness: 3.25, boardTypeIndex: 4 },
};
// calibration0..calibration6 — the 6'0" x 19" x 2.25" calibration board across all seven
// Board Type steps, tuned to land exactly on 26-32L in 1L increments.
for (let i = 0; i <= 6; i++) {
  states[`calibration${i}`] = { ...manualDefault, lengthIn: 72, width: 19, centerThickness: 2.25, boardTypeIndex: i };
}
Object.assign(states, {
  templateOnly: { ...defaults, importRailThickness: false },
  templateOnlyLongboard: { ...defaults, importRailThickness: false, lengthIn: 108, width: 23 },
  templateOnlyBeefy: { ...defaults, importRailThickness: false, boardTypeIndex: 6 },
  railFallback: { ...defaults, centerThickness: 2.5 },
  geomDefault: { ...defaults },
  geomDomed: { ...defaults },
  geomHardEdgeOff: { ...defaults },
  geomSingleTuck: { ...defaults },
  geomFamilyBoxy: { ...defaults },
  geomFamilyKnifey: { ...defaults },
  geomLongboard: { ...defaults, lengthIn: 108, width: 23 },
  geomPin: { ...defaults },
  geomSwallow: { ...defaults },
  geomDiamond: { ...defaults },
  railUnavailable: { ...defaults },
  templateUnavailable: { ...defaults },
});

// template/rail fixture names per state fixture — null means the prop is not available.
const templateNameFor = {
  templateOnly: "default",
  templateOnlyLongboard: "longboard",
  templateOnlyBeefy: "default",
  railFallback: "default",
  geomDefault: "default",
  geomDomed: "default",
  geomHardEdgeOff: "default",
  geomSingleTuck: "default",
  geomFamilyBoxy: "default",
  geomFamilyKnifey: "default",
  geomLongboard: "longboard",
  geomPin: "pin",
  geomSwallow: "swallow",
  geomDiamond: "diamond",
  railUnavailable: "default",
  templateUnavailable: null,
};
const railNameFor = {
  railFallback: "default",
  geomDefault: "default",
  geomDomed: "domedAll",
  geomHardEdgeOff: "hardEdgeOff",
  geomSingleTuck: "singleTuck",
  geomFamilyBoxy: "familyBoxy",
  geomFamilyKnifey: "familyKnifey",
  geomLongboard: "default",
  geomPin: "domedCenter",
  geomSwallow: "familyBoxy",
  geomDiamond: "ratioExtremes",
  railUnavailable: null,
  templateUnavailable: "default",
};
// railFallback's rail data omits the three profiles, so geomReady is false even though rail
// thickness data is present — this is the importingRailThickness && !geomReady fallback fixture.
const railWithoutProfiles = new Set(["railFallback"]);

const golden = {};
for (const [name, state] of Object.entries(states)) {
  const templateName = templateNameFor[name] ?? null;
  const railName = railNameFor[name] ?? null;
  const template = templateName ? templateValuesFrom(templateName) : null;
  const rail = railName ? railValuesFrom(railName, { withoutProfiles: railWithoutProfiles.has(name) }) : null;

  // For fixtures importing the template, lengthIn/width are what syncFromTemplate (Volume.dc.html
  // lines 235-242) would already have made them by the time the user sees the screen.
  const effectiveState = { ...state };
  if (template && effectiveState.importTemplateDimensions) {
    effectiveState.lengthIn = template.lengthIn;
    effectiveState.width = template.widepointWidth;
  }

  host.props = { templateValues: template, railValues: rail, compact: false };
  host.state = effectiveState;
  const vals = host.renderVals();

  host.state = { ...effectiveState, units: "cm" };
  const valsCm = host.renderVals();

  const SNAPSHOT_FIELDS = [
    "templateAvailable",
    "railAvailable",
    "importingRailThickness",
    "dimensionsDisabled",
    "dimensionsOpacity",
    "thicknessDisabled",
    "thicknessOpacity",
    "showDimensionRows",
    "showGeomBreakdown",
    "areaRowLabel",
    "areaSqInDisplay",
    "tailEffDisplay",
    "centerEffDisplay",
    "noseEffDisplay",
    "weightedThicknessLabel",
    "weightedThicknessDisplay",
    "volumeLitersDisplay",
    "volumeCuInDisplay",
    "areaFactorDisplay",
    "thicknessFactorDisplay",
    "boardTypeIndex",
    "lengthFeet",
    "lengthInches",
    "lengthDisplay",
    "widthDisplay",
    "centerThicknessDisplay",
  ];
  const snapshot = (v) => {
    const s = {};
    for (const field of SNAPSHOT_FIELDS) s[field] = v[field] ?? null;
    return s;
  };

  golden[name] = {
    state: effectiveState,
    template,
    rail,
    // Snapshotted a second time with units:'cm', storing as valsCm. This is a precision probe,
    // not a feature: the prototype's `disp` prints two-decimal centimetres in cm mode versus
    // sixteenths of an inch in inch mode, so the cm snapshot pins each cross-section thickness to
    // about 0.004" instead of 0.0625" — through the prototype's own code path, with no extra
    // machinery. This module never ships cm support; the snapshot is a tighter probe only.
    vals: snapshot(vals),
    valsCm: snapshot(valsCm),
  };
}

mkdirSync(path.dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(golden, null, 2)}\n`, "utf8");
console.log(`Wrote ${Object.keys(golden).length} fixtures to ${path.relative(repoRoot, outputPath)}`);
