/*
 * REFERENCE COPY — never edited.
 *
 * This is the maths behind sketch 016 D (.planning/sketches/016-custom-rocker/), the founder's pick
 * for a blank's custom rocker on 2026-10-16 ("This now looks perfect. Let's build it."), copied byte
 * for byte from the sketch's archive (.planning/sketches/016-custom-rocker/sketch-source.tar.gz →
 * template.html, SHA-1 ff1b6dc0aaf15b046ce645ec0faa17aece953df4) on 2026-10-16: its lines 312,
 * 314–315, 321–326, 332–341, 344 and 346–367, in that order — `M`, `fracIn`, `signedIn`, `noteOf`,
 * `isNatural`, `parseNote`, `B`, `delta` and `floorOf`. It is the source of truth for the custom
 * rocker (quick 261016-mkb, CLAUDE.md Rule 1: the expected numbers come from the founder's chosen
 * sketch's own code, never a transcription).
 *
 * It works in INCHES: positions are inches from the blank's tail tip, and a change is `{ a, f }` —
 * `a` the amount in inches, `f` the bend point in whole inches in from its tip, or null for the
 * centre.
 *
 * It is run only by scripts/extract-sketch016-custom-rocker-golden.mjs, which writes
 * lib/geometry/__fixtures__/custom-rocker-golden.json. The app never imports it.
 *
 * Do not edit anything between the two marked lines below. The golden is only as good as this copy
 * is faithful, and the copy is only faithful while that block is template.html's lines unchanged.
 */

// ---- NOT from the sketch: the two globals the copied lines read (the sketch's DATA and state). ----
let DATA = {};
let state = { board: null, units: "imperial", rocker: { nose: [], tail: [] } };

// ---- BEGIN template.html lines 312, 314–315, 321–326, 332–341, 344, 346–367 (byte for byte) ----
const M = () => state.units === "metric";
function fracIn(x, den = 16) { const t = Math.round(Math.abs(x) * den); const w = Math.floor(t / den); let n = t % den, d = den; while (n && n % 2 === 0) { n /= 2; d /= 2; } const s = x < 0 && t ? "-" : ""; if (!n) return `${s}${w}"`; return `${s}${w ? w + " " : ""}${n}/${d}"`; }
function signedIn(x) { const t = Math.round(x * 16) / 16; if (!t) return '0"'; return (t > 0 ? "+" : "") + fracIn(t); }
/** The note, US Blanks' way: nose first, then tail; a figure after N or T only when the bend starts away from the centre. Inches always. */
function noteOf(r) {
  const part = (c, E) => (c.a ? `${signedIn(c.a)}${E}${c.f !== null ? `${c.f}"` : ""}` : "");
  return [...r.nose.map((c) => part(c, "N")), ...r.tail.map((c) => part(c, "T"))].filter(Boolean).join(" ");
}
const isNatural = (r) => !noteOf(r);
/** Reads the notation back (variant C). Returns null on anything it can't read. */
function parseNote(text) {
  const t = text.trim(); if (!t) return { nose: [], tail: [] };
  const re = /([+-])\s*(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)\s*"?\s*([NT])(?:\s*(\d+)\s*"?)?/gi;
  const r = { nose: [], tail: [] }; let m, consumed = 0;
  while ((m = re.exec(t))) { consumed += m[0].length; const amt = m[2].includes("/") ? m[2].split(/\s+/).reduce((s, p) => s + (p.includes("/") ? p.split("/")[0] / p.split("/")[1] : +p), 0) : +m[2]; const c = { a: (m[1] === "-" ? -1 : 1) * amt, f: m[4] === undefined ? null : +m[4] }; (m[3].toUpperCase() === "N" ? r.nose : r.tail).push(c); }
  if (consumed < t.replace(/\s+/g, "").length * 0.8 || (!r.nose.length && !r.tail.length)) return null;
  if (r.nose.length > 2 || r.tail.length > 2) return null;
  return r;
}
const B = () => DATA[state.board];
function delta(x, r = state.rocker) {
  const b = B().blank, L = b.lengthIn, C = b.centreFromTailIn; let s = 0;
  for (const c of r.nose) { const p = c.f === null ? C : L - c.f; if (x > p) s += c.a * ((x - p) / (L - p)) ** 2; }
  for (const c of r.tail) { const p = c.f === null ? C : c.f; if (x < p) s += c.a * ((p - x) / p) ** 2; }
  return s;
}
/** The lowest a change may go so the bent curve never dips below the centre's height — "a negative rocker … is not a realistic board" (the founder, 2026-10-16). Rounded down to the slider's step. */
function floorOf(end, i, r) {
  const d = B(), bl = d.blank, L = bl.lengthIn, C = bl.centreFromTailIn;
  const others = { nose: r.nose.filter((_, j) => !(end === "nose" && j === i)), tail: r.tail.filter((_, j) => !(end === "tail" && j === i)) };
  const c = r[end][i] || { a: 0, f: null };
  const pv = c.f === null ? C : end === "nose" ? L - c.f : c.f;
  let worst = Infinity;
  for (const [x, y] of d.nat) {
    const u = end === "nose" ? (x > pv ? (x - pv) / (L - pv) : 0) : (x < pv ? (pv - x) / pv : 0);
    if (u < 0.02) continue;
    const have = y + delta(x, others);
    worst = Math.min(worst, have / (u * u));
  }
  const step = M() ? 1 / 25.4 : 1 / 16;
  return Math.max(-2, -Math.floor(worst / step) * step);
}
// ---- END template.html lines ----

// ---- NOT from the sketch: how the golden script reaches the copied functions. ----
module.exports = {
  setData(d) {
    DATA = d;
  },
  use(board, units) {
    state.board = board;
    state.units = units;
  },
  fracIn,
  signedIn,
  noteOf,
  parseNote,
  delta,
  floorOf,
};
