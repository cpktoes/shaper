/*
 * REFERENCE COPY — never edited.
 *
 * This is the maths behind sketch 021 (.planning/sketches/021-bottom-guide/), the founder's approved bottom
 * contours on 2026-11-08 ("Love everything about it"), copied byte for byte from the sketch's archive
 * (.planning/sketches/021-bottom-guide/sketch-source.tar.gz → template.html, SHA-1
 * 53cbf011a3144c40185da1e10e651751133375bf) on 2026-11-08: its lines 326–553 (the units, the eighteen cut names
 * and their starting numbers, the channels, the state, the board's numbers along its length, the foam taken off,
 * the litres off and the layout marks) and 1013–1018 (`normalize`, how a dragged Start, Deepest or End keeps the
 * other two in order), in that order. It is the source of truth for the bottom contours (Phase 17, CLAUDE.md
 * Rule 1: the expected numbers come from the founder's chosen sketch's own code, never a transcription).
 *
 * It works in MILLIMETRES: stations from the tail, distances from the stringer, depths. Its `IN = 25.4` is the
 * sketch's own and stays here — the app takes inches through lib/geometry/units.ts and never imports this file.
 *
 * It is run only by scripts/extract-sketch021-bottom-golden.mjs, which writes
 * lib/geometry/__fixtures__/bottom-golden.json. The app never imports it.
 *
 * Do not edit anything between the marked lines below. The golden is only as good as this copy is faithful, and
 * the copy is only faithful while each block is template.html's lines unchanged.
 */

// ---- NOT from the sketch: the one global the copied lines read (the sketch's DATA, line 323). ----
let DATA = { U: [], boards: [] };

// ---- BEGIN template.html lines 326–553 (byte for byte) ----
const IN = 25.4;
function fmtInFrac(mmv, den = 16) {
  const inches = mmv / IN; const sign = inches < 0 ? "-" : ""; const nudge = inches < 0 ? -1e-9 : 1e-9;
  const rounded = Math.abs(Math.round(inches * den + nudge) / den);
  let whole = Math.floor(rounded + 1e-9); let f = Math.round((rounded - whole) * den);
  if (f === den) { whole += 1; f = 0; }
  if (f === 0) return `${sign}${whole}"`;
  let n = f, d = den; while (n % 2 === 0) { n /= 2; d /= 2; }
  return `${sign}${whole > 0 ? whole + " " : ""}${n}/${d}"`;
}
function fmtCm(mmv) { const cm = mmv / 10; const nudge = cm < 0 ? -1e-9 : 1e-9; return (Math.round((cm + nudge) * 10) / 10).toFixed(1); }
function fmtMm(mmv) { const nudge = mmv < 0 ? -1e-9 : 1e-9; return String(Math.round(mmv + nudge)); }
function fmtFeetIn(mmv) {
  const inches = mmv / IN; const r = Math.round(inches * 16) / 16; const feet = Math.floor((r + 1e-9) / 12); const rem = r - feet * 12;
  const zero = rem > 0 && rem < 1 ? "0 " : ""; return `${feet}'${zero}${fmtInFrac(rem * IN)}`;
}
const metric = () => state.units === "metric";
const dim = (v) => metric() ? `${fmtCm(v)} cm` : fmtInFrac(v);          // dims: stations, widths, lengths
const dimBare = (v) => metric() ? fmtCm(v) : fmtInFrac(v);
const mark = (v) => metric() ? `${fmtMm(v)} mm` : fmtInFrac(v);         // marks: depths, lifts, thicknesses, distances off the stringer
const markBare = (v) => metric() ? fmtMm(v) : fmtInFrac(v);
const len = (v) => metric() ? `${fmtCm(v)} cm` : fmtFeetIn(v);
const L1 = (v) => `${v.toFixed(2)} L`;

/* ============ the cuts ============ */
// the across-section curves (the planning memory): u 0..1, r smoothness 0..1
const sec = (u, r) => (1 - r) * (1 - u) + r * (1 + Math.cos(Math.PI * u)) / 2;     // concave: deepest at u=0, nothing at u=1
const rise = (u, r) => (1 - r) * u + r * (1 - Math.cos(Math.PI * u / 2));         // lift: nothing at the stringer, full at the rail
// a channel (the founder's pictures, 2026-11-06): "a quick V that goes into a vertical wall" — a ramp from its top edge (u=0)
// down to the wall (u=1), straight at r=0, scooped at r=1
const chan = (u, r) => (1 - r) * u + r * (1 - Math.cos(Math.PI * u / 2));
const sm = (t) => (1 - Math.cos(Math.PI * Math.max(0, Math.min(1, t)))) / 2;
const PINCH = 3 * IN; // a concave narrower than this shallows out in proportion, so a tip never gets a slot

// the founder's 18 names (2026-11-06): six per section. Starting numbers in inches, from the tail, as functions of the board.
// Set 2026-11-08 from what shapers publish (the research in the todo 2026-11-06-set-the-bottom-contours-starting-numbers-
// from-the-shop.md, applied at the founder's word): a teardrop 36" long and 1/4" deep, 2 1/4" in from the rails; a belly
// 3/8" deep, deepest at the wide point; a single 1/4" deepest between the wide point and the front fins, flattened in the
// last 4"; a tail double 1/8" a side, deepest at the front fins; a panel vee 3/16" from a third of the length up, peaking
// at the front fins; the tri-plane's flat panel to 4" from the rail. Still his to correct.
const i = (v) => v * IN;
const NAMES = {
  nose: [
    { name: "Flat Entry", kind: "flat" },
    { name: "Rolled Belly Entry", kind: "belly", d: (b) => ({ start: b.L, deep: b.L * 2 / 3, end: b.L * 0.55, depth: i(3 / 8), smooth: 100 }) },
    { name: "Teardrop Nose Concave", kind: "single", d: (b) => ({ off: i(2.25), start: b.L - i(3), deep: b.L - i(20), end: b.L - i(38), depth: i(1 / 4), smooth: 70, pointed: true }) },
    { name: "Blended Nose Concave", kind: "single", d: (b) => ({ off: i(1.625), start: b.L - i(2), deep: b.L - i(12), end: b.L - i(36), depth: i(3 / 16), smooth: 70 }) },
    { name: "Slight Single Concave Entry", kind: "single", d: (b) => ({ off: i(2), start: b.L - i(12), deep: b.wide, end: b.wide - i(6), depth: i(1 / 16), smooth: 50 }) },
    { name: "Reverse Vee Nose", kind: "vee", d: (b) => ({ start: b.L - i(3), deep: b.L * 2 / 3, end: b.fin + i(4), depth: i(3 / 16), smooth: 0 }) },
  ],
  center: [
    { name: "Flat Center", kind: "flat" },
    { name: "Deep Single Concave", kind: "single", d: (b) => ({ off: i(2), start: b.L - i(16), deep: (b.wide + b.fin) / 2, end: i(4), depth: i(1 / 4), smooth: 50 }) },
    { name: "Shallow Single Concave", kind: "single", d: (b) => ({ off: i(2), start: b.L * 2 / 3, deep: b.fin, end: i(4), depth: i(1 / 8), smooth: 50 }) },
    { name: "Early Double Concave", kind: "double", d: (b) => ({ off: i(2), offS: i(1), trough: i(4), start: b.wide, deep: b.fin + i(6), end: b.fin + i(2), depth: i(1 / 8), smooth: 60 }) },
    { name: "Continuous Belly / Rolled Mid", kind: "belly", d: (b) => ({ start: b.L - i(8), deep: b.wide, end: b.fin, depth: i(3 / 8), smooth: 100 }) },
    { name: "Tri-Plane Hull Center", kind: "vee", d: (b) => ({ offS: b.widePointWidth / 2 - i(4), start: b.L - i(14), deep: b.L / 2, end: b.fin, depth: i(1 / 8), smooth: 0 }) },
  ],
  tail: [
    { name: "Flat Exit", kind: "flat" },
    { name: "Double Concave Exit", kind: "double", d: (b) => ({ off: i(1), offS: i(3 / 4), trough: i(3), start: b.fin + i(12), deep: b.fin, end: i(4), depth: i(1 / 8), smooth: 50 }) },
    { name: "Panel Vee", kind: "vee", d: (b) => ({ start: b.L / 3, deep: b.fin, end: 0, depth: i(3 / 16), smooth: 0 }) },
    { name: "Spiral Vee", kind: "double", d: (b) => ({ off: i(1), offS: i(3 / 4), trough: i(3), start: b.fin + i(12), deep: b.fin, end: 0, depth: i(1 / 8), smooth: 50, vee: i(3 / 16) }) },
    { name: "Rolled Vee", kind: "vee", d: (b) => ({ start: b.L / 3, deep: b.fin, end: 0, depth: i(1 / 4), smooth: 60 }) },
    { name: "Extending Single Concave", kind: "single", d: (b) => ({ off: i(2), start: b.fin + i(12), deep: b.fin, end: i(4), depth: i(3 / 16), smooth: 50 }) },
  ],
};
// channels: cut last, in shop order, into whatever the three sections leave. Count 4, 6 or 8 (two, three or four a side).
// The founder's pictures (2026-11-06): the stringer is a peak, each channel's floor deepens outward from its inner peak
// to a vertical wall at the rail side, and the top of that wall is the next channel's peak — one sawtooth, no flat
// ridge between channels. Off Stringer 0 means the stringer itself is the first peak; Off Rail is whatever the last
// wall leaves, not a control. The wall is always at the rail side (the founder, 2026-11-07: no Wall control).
// The channels need not all be the same length (the founder, 2026-11-07): Longest says which pair runs furthest
// forward — the inner pair, the outer pair, or all together — and Stagger is how much shorter each channel out from
// it starts. Start is the longest pair's; every channel is deepest at the same station and ends together.
// Every board opens with no channels and a set runs Parallel to the stringer until the shaper says otherwise (the founder,
// 2026-11-07: "Channel Default = none", "Run default is parallel to stringer").
const channelWidth = (count) => i(count === 4 ? 2.5 : count === 8 ? 1.25 : 1.75);
// 5/16" deep (shapers publish 1/4"–3/8"), from a foot ahead of the front fins, the outer pair longest (Col Smith, Myers,
// Littlewood; Byrne ran the inner longest) — the research of 2026-11-08
const makeChannels = (b, count) => ({ name: "Channels", kind: "channels", count, depth: i(5 / 16), width: channelWidth(count), offS: 0, off: 0, start: b.fin + i(12), deep: b.fin, end: 0, smooth: 0, run: "parallel", longer: "outer", stagger: i(2), trough: 0, vee: 0, pointed: false, spiral: false });
// the Run menu shares its row with Longest, half the sidebar each, so its names are short enough to read whole
const RUNS = (b) => [["parallel", "Parallel"], ["rail", "With the rail"], ["toe", b.toeDeg > 0 ? `Toe-in · ${b.toeDeg.toFixed(1)}°` : "Toe-in (no toe)"]];
// what Off Rail is measured from on a winged board — a selector, Narrowest outline by default (the founder, 2026-11-07)
const WING_RULES = [["narrow", "Narrowest outline"], ["natural", "Natural outline, before the wing"]];
const WING_NOTE = { narrow: "The real rail behind the wing, and that narrower line carried forward past it — so no cut ever crosses the rail.",
  natural: "The curve you drew before the wing. Behind the wing it sits outside the real rail, so a cut can run out through the step." };
const LONGER = [["inner", "Inner pair"], ["outer", "Outer pair"], ["same", "All the same"]];
const OFF_RAIL_MIN = IN / 2; // the last wall never lands closer than this to the rail at the deepest station
const TITLE = { nose: "Nose", center: "Center", tail: "Tail", channels: "Channels" };
// each board's opening cuts, and how many channels it opens with (0 = none)
const STARTS = { shortboard: ["Flat Entry", "Deep Single Concave", "Flat Exit", 0], fish: ["Flat Entry", "Flat Center", "Panel Vee", 0], fishwing: ["Flat Entry", "Flat Center", "Extending Single Concave", 0],
  midlength: ["Blended Nose Concave", "Shallow Single Concave", "Spiral Vee", 0], longboard: ["Teardrop Nose Concave", "Continuous Belly / Rolled Mid", "Rolled Vee", 0] };

function makeCut(sectionKey, name, b) {
  const def = NAMES[sectionKey].find((n) => n.name === name);
  const c = { name: def.name, kind: def.kind, off: 0, offS: 0, trough: 0, start: 0, deep: 0, end: 0, depth: 0, smooth: 0, vee: 0, pointed: false, spiral: def.name === "Spiral Vee" };
  if (def.d) Object.assign(c, def.d(b));
  return c;
}
const namesFor = (key) => NAMES[key];

/* ============ state ============ */
let state = { board: "shortboard", theme: "daylight", units: "imperial", frame: false, exag: 4, page: "viewer", active: "center", live: "center", showRail: false, station: 0, cuts: null, ch: null, wingRule: "narrow" };
// showRail opens off (the founder, 2026-11-08: "Maybe don't show the finished rails from rails by default")
let B = null;
function setBoard(id) {
  state.board = id; B = DATA.boards.find((b) => b.id === id);
  const st = STARTS[id];
  state.ch = makeChannels(B, st[3]);
  state.cuts = { nose: makeCut("nose", st[0], B), center: makeCut("center", st[1], B), tail: makeCut("tail", st[2], B) };
  state.station = B.wide; state.active = "center"; state.live = "center";
}
const chOn = () => state.ch.count > 0;
const cutByKey = (k) => k === "channels" ? state.ch : state.cuts[k];
// the cuts in shop order: the three sections, then the channels cut into what they leave
function allCuts() { const out = [["nose", state.cuts.nose], ["center", state.cuts.center], ["tail", state.cuts.tail]]; if (state.ch.count > 0) out.push(["channels", state.ch]); return out; }

/* ============ the board's own numbers along its length ============ */
function sampleArr(arr, s) { const n = arr.length - 1; let x = Math.max(0, Math.min(n, (s / B.L) * n)); const k = Math.min(n - 1, Math.floor(x)); const t = x - k; return arr[k] + (arr[k + 1] - arr[k]) * t; }
const curveAt = (s) => sampleArr(B.curve, s);          // the rail as drawn, wings and all (a swallow's notch read straight across)
const foamAt = (s) => sampleArr(B.foam, s);            // the foam actually there on one side
const thickAt = (s) => sampleArr(B.thick, s);          // the planed thickness
const innerAt = (s) => { const d = curveAt(s) - foamAt(s); return d > 0.3 ? d : 0; };   // a notch's inside wall, 0 elsewhere
// what Off Rail is measured from: the narrowest outline carried forward through any wing (never steps), or the
// curve the shaper drew before the wings (the founder's two candidates, 2026-11-06). The same line on a wingless board.
const refAt = (s) => sampleArr(state.wingRule === "natural" ? B.natural : B.narrow, s);

/* foam taken off at (station from the tail, distance from the stringer) — the one number everything reads */
function fadeAt(a, p, b, s) {
  if (s > a + 1e-9 || s < b - 1e-9) return 0;
  if (s >= p) { if (a - p < 1e-6) return 1; if (a >= B.L - 0.5) return 1; return sm((a - s) / (a - p)); }
  if (p - b < 1e-6) return 1; if (b <= 0.5) return 1; return sm((s - b) / (p - b));
}
const fade = (c, s) => fadeAt(c.start, c.deep, c.end, s);
// channel j (0 = the one beside the stringer) starts Stagger behind its neighbour toward the longest pair, never
// closer than an inch to the deepest station — so the shortest channel still has a lead-in
const chSteps = (c, j) => c.longer === "inner" ? j : c.longer === "outer" ? (c.count / 2 - 1 - j) : 0;
const chStart = (c, j) => Math.max(Math.min(c.start, c.deep + IN), c.start - chSteps(c, j) * c.stagger);
const chFade = (c, j, s) => fadeAt(chStart(c, j), c.deep, c.end, s);
function cutHalfWidth(c, s) {
  let C = refAt(s) - c.off;
  if (c.pointed && s < c.deep && c.deep - c.end > 1e-6) C *= Math.sqrt(Math.max(0, (s - c.end) / (c.deep - c.end)));
  return C;
}
// a double's two across marks, kept in order: the flat at the stringer, then the trough, inside the edge
const doubleMarks = (c, C) => { const a = Math.min(c.offS, Math.max(0, C * 0.5)); const t = Math.max(a + IN / 4, Math.min(c.trough, C * 0.85)); return { a, t }; };
// the channels at the deepest station: the width they get (the asked width, squeezed only if the set would not fit
// inside the rail) and what the last wall leaves to the rail
function channelFit(c) {
  const n = c.count / 2; const W = refAt(c.deep);
  const w = Math.max(0, Math.min(c.width, (W - c.offS - OFF_RAIL_MIN) / n));
  return { n, w, offRail: W - c.offS - n * w, squeezed: w < c.width - 0.01 };
}
// one side's channels at a station, each as [in, out] from the stringer, abutting: the out of one is the in of the next.
// With the rail, the set keeps its last wall the same distance off the rail, so the channels narrow toward the tail
// together. Parallel rules them straight from the deepest station, and the outer ones run out through the rail where
// the outline narrows. Toe-in angles the whole set like the front fins (the founder's table: Biolos, "aligned to fin
// toe-in"): inward toward the nose, splayed out toward the tail, where they run out through the rail.
function channelEdges(c, s) {
  const { n, w, offRail } = channelFit(c); if (n < 1 || w <= 0.5) return [];
  let w2 = w, shift = 0;
  if (c.run === "rail") w2 = Math.max(0, refAt(s) - offRail - c.offS) / n;
  else if (c.run === "toe" && B.toeDeg > 0) shift = (s - c.deep) * Math.tan(B.toeDeg * Math.PI / 180);
  const out = []; for (let j = 0; j < n; j++) { const a = c.offS + j * w2 - shift, b = a + w2; if (b > 0.5) out.push([Math.max(0, a), b, j]); }
  return out;
}
// the walls, as a shaper rules them: Wall 1, Wall 2 … out from the stringer (and the flat's edge when Off Stringer > 0).
// "on" says whether that channel has started by this station — a staggered set's shorter channels have not, ahead
// of their own starts
function channelMarks(c, s) {
  const edges = channelEdges(c, s); const out = [];
  if (c.offS > 0.5 && edges.length) out.push({ y: edges[0][0], col: "Flat edge", on: chFade(c, edges[0][2], s) > 0.004 });
  for (const [, b, j] of edges) out.push({ y: b, col: `Wall ${j + 1}`, on: chFade(c, j, s) > 0.004 });
  return out;
}
function cutOff(c, s, y, W) {
  if (c.kind === "flat" || c.depth <= 0) return 0;
  const f = fade(c, s); if (f <= 0) return 0;
  const r = c.smooth / 100; let out = 0;
  if (c.kind === "channels") {
    if (c.count < 4) return 0;
    // the ramp runs from the channel's peak down to its wall: u = 0 at the peak, 1 at the wall at the rail side, as the
    // founder's pictures have it; each channel fades in from its own start
    for (const [a, b, j] of channelEdges(c, s)) { if (y >= a && y <= b) { const fj = chFade(c, j, s); if (fj <= 0) return 0; return c.depth * fj * Math.min(1, (b - a) / IN) * chan((y - a) / (b - a), r); } }
    return 0;
  }
  if (c.kind === "single" || c.kind === "double") {
    const C = cutHalfWidth(c, s);
    if (C > 0 && y < C) {
      if (c.kind === "single") out += c.depth * f * Math.min(1, C / PINCH) * sec(y / C, r);
      else { const { a, t } = doubleMarks(c, C); if (y > a) { const D = c.depth * f * Math.min(1, (C - a) / PINCH); const u = y < t ? (t - y) / (t - a) : (y - t) / (C - t); out += D * sec(Math.min(1, u), r); } }
    }
    if (c.spiral && c.vee > 0 && W > 0) out += c.vee * f * rise(Math.min(1, y / W), 0);
  } else { // vee or belly: a lift from the stringer (or the flat panel's edge, Off Stringer) out to the rail
    const F = c.offS; if (y > F && W > F) out += c.depth * f * rise((y - F) / (W - F), r);
  }
  return out;
}
function foamOff(s, y) { const W = curveAt(s); if (W <= 0) return 0; let v = 0; for (const [, c] of allCuts()) v += cutOff(c, s, y, W); return Math.max(0, v); }
function deepestAt(s) { const W = curveAt(s); let m = 0; for (let j = 0; j <= 60; j++) m = Math.max(m, foamOff(s, W * j / 60)); return m; }
function litresOff() {
  const n = 160, m = 32; let v = 0;
  for (let a = 0; a < n; a++) { const s = (a + 0.5) / n * B.L; const W = curveAt(s), inner = innerAt(s); if (W - inner <= 0) continue; const dy = (W - inner) / m;
    let col = 0; for (let j = 0; j < m; j++) col += foamOff(s, inner + (j + 0.5) * dy); v += col * dy; }
  return 2 * v * (B.L / n) / 1e6;
}
// the layout marks of one cut at a station, off the stringer — what a shaper rules onto the blank there
function marksOf(key, c, s) {
  if (c.kind === "flat" || c.depth <= 0 || fade(c, s) <= 0.004) return [];
  const W = curveAt(s); const t = TITLE[key];
  if (c.kind === "channels") return channelMarks(c, s).filter((m) => m.on && m.y > 0.5 && m.y < W);
  if (c.kind === "single") { const C = cutHalfWidth(c, s); return C > 0.5 && C < W ? [{ y: C, col: `${t} edge` }] : []; }
  if (c.kind === "double") { const C = cutHalfWidth(c, s); if (C <= 0.5) return []; const { a, t: tr } = doubleMarks(c, C); const out = [{ y: a, col: `${t} flat` }, { y: tr, col: `${t} trough` }]; if (C < W) out.push({ y: C, col: `${t} edge` }); return out.filter((m) => m.y > 0.5); }
  if (c.kind === "vee" && c.offS > 0.5 && c.offS < W) return [{ y: c.offS, col: `${t} flat` }];
  return [];
}
const markColumns = (key, c) => { // the columns a cut can put in the layout table
  if (c.kind === "flat" || c.depth <= 0) return [];
  const t = TITLE[key];
  if (c.kind === "channels") return channelMarks(c, c.deep).map((m) => m.col);
  if (c.kind === "single") return [`${t} edge`];
  if (c.kind === "double") return [`${t} flat`, `${t} trough`, `${t} edge`];
  if (c.kind === "vee" && c.offS > 0.5) return [`${t} flat`];
  return [];
};

/* ============ drawing: the top view ============ */
// ---- END template.html lines 326–553 ----

// ---- BEGIN template.html lines 1013–1018 (byte for byte) ----
function normalize(c, changed) {
  if (changed === "start") { if (c.deep > c.start) c.deep = c.start; if (c.end > c.deep) c.end = c.deep; }
  else if (changed === "end") { if (c.deep < c.end) c.deep = c.end; if (c.start < c.deep) c.start = c.deep; }
  else if (changed === "deep") { if (c.start < c.deep) c.start = c.deep; if (c.end > c.deep) c.end = c.deep; }
  if (c.kind === "double") { const C = Math.max(IN, refAt(c.deep) - c.off); c.offS = Math.min(c.offS, C * 0.5); c.trough = Math.max(c.offS + IN / 4, Math.min(c.trough, C * 0.85)); }
}
// ---- END template.html lines 1013–1018 ----

// ---- NOT from the sketch: how the golden script reaches the copied functions. ----
module.exports = {
  setData(d) {
    DATA = d;
  },
  use(id, units, wingRule) {
    setBoard(id);
    state.units = units || "imperial";
    state.wingRule = wingRule || "narrow";
  },
  get state() {
    return state;
  },
  get B() {
    return B;
  },
  makeCut,
  makeChannels,
  NAMES,
  STARTS,
  foamOff,
  cutOff,
  litresOff,
  fadeAt,
  cutHalfWidth,
  doubleMarks,
  channelFit,
  channelEdges,
  channelMarks,
  chStart,
  marksOf,
  markColumns,
  normalize,
  refAt,
  curveAt,
  foamAt,
  thickAt,
  innerAt,
};
