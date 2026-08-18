#!/usr/bin/env node
// GENERATED FILE PRODUCER — this script extracts and EXECUTES the prototype's own
// `buildGeometry` method from reference/project/Template.dc.html, then writes its output
// to lib/geometry/__fixtures__/prototype-outline-golden.json. Never hand-copy or retype the
// prototype's math here — that would silently validate a wrong port. The output JSON is
// generated and must never be hand-edited; re-run `npm run golden` to regenerate it.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const htmlPath = path.join(repoRoot, "reference/project/Template.dc.html");
const outputPath = path.join(
  repoRoot,
  "lib/geometry/__fixtures__/prototype-outline-golden.json",
);

const html = readFileSync(htmlPath, "utf8");

const marker = "buildGeometry(s) {";
const markerIdx = html.indexOf(marker);
if (markerIdx === -1) {
  throw new Error(
    `Could not find "${marker}" in ${htmlPath} — has the prototype's buildGeometry method been renamed?`,
  );
}

// Brace-match forward from the method's opening brace to its closing brace.
let depth = 0;
let bodyStart = -1;
let bodyEnd = -1;
for (let i = markerIdx + marker.length - 1; i < html.length; i++) {
  const ch = html[i];
  if (ch === "{") {
    depth++;
    if (depth === 1) bodyStart = i + 1;
  } else if (ch === "}") {
    depth--;
    if (depth === 0) {
      bodyEnd = i;
      break;
    }
  }
}
if (bodyStart === -1 || bodyEnd === -1) {
  throw new Error("Failed to brace-match the buildGeometry method body.");
}

const body = html.slice(bodyStart, bodyEnd);

// buildGeometry(s) references no component state and no outer scope — it's a pure function
// of its single `s` parameter — so it can be extracted and evaluated standalone.
// eslint-disable-next-line no-new-func
const buildGeometry = new Function("s", body);

function xAtY(pts, yTarget) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [y0, x0] = pts[i];
    const [y1, x1] = pts[i + 1];
    if (yTarget >= y0 && yTarget <= y1) {
      const t = y1 > y0 ? (yTarget - y0) / (y1 - y0) : 0;
      return x0 + (x1 - x0) * t;
    }
  }
  return pts[pts.length - 1][1];
}

const defaults = {
  lengthIn: 72,
  centerWidth: 19,
  wpOffset: -0.5,
  tailBlockWidth: 4,
  tailType: "squash",
  swallowDepth: 3,
  diamondDepth: 3,
  widepointVector: 50,
  tailAngle: 60,
  tailVector: 50.5,
  noseAngle: 55,
  noseVector: 25,
};

const fixtures = {
  default: { ...defaults },
  pin: { ...defaults, tailType: "pin", tailAngle: 65, tailVector: 50 },
  round: { ...defaults, tailType: "round", tailAngle: 90, tailVector: 90 },
  diamond: {
    ...defaults,
    tailType: "diamond",
    tailBlockWidth: 10,
    tailAngle: 30,
    tailVector: 30,
    diamondDepth: 3,
  },
  squash: {
    ...defaults,
    tailType: "squash",
    tailBlockWidth: 5,
    tailAngle: 45,
    tailVector: 50,
  },
  swallow: {
    ...defaults,
    tailType: "swallow",
    tailBlockWidth: 8,
    tailAngle: 30,
    tailVector: 0,
    swallowDepth: 3,
  },
  longboard: {
    lengthIn: 108,
    centerWidth: 23,
    wpOffset: 3,
    tailBlockWidth: 12,
    tailType: "squash",
    tailAngle: 50,
    tailVector: 60,
    noseAngle: 70,
    noseVector: 60,
    widepointVector: 70,
    swallowDepth: 3,
    diamondDepth: 3,
  },
  diamondClamped: {
    ...defaults,
    tailType: "diamond",
    tailBlockWidth: 4,
    diamondDepth: 5,
    tailAngle: 30,
    tailVector: 30,
  },
};

const golden = {};
for (const [name, state] of Object.entries(fixtures)) {
  const g = buildGeometry(state);
  const halfWidthAtStations = [];
  for (let y = 0; y <= state.lengthIn; y += 3) {
    halfWidthAtStations.push({ station: y, halfWidth: xAtY(g.rightPts, y) });
  }
  golden[name] = {
    state,
    tailWidthAt12: g.tailWidthAt12,
    noseWidthAt12: g.noseWidthAt12,
    area: g.area,
    wpY: g.wpY,
    cw: g.cw,
    bw: g.bw,
    centerCloseY: g.centerCloseY,
    diamondDepthEff: g.diamondDepthEff,
    halfWidthAtStations,
  };
}

mkdirSync(path.dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(golden, null, 2)}\n`, "utf8");
console.log(`Wrote ${Object.keys(golden).length} fixtures to ${path.relative(repoRoot, outputPath)}`);
