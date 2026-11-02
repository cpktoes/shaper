/*
 * REFERENCE COPY — never edited.
 *
 * The two script blocks of the Artifact page "Chris Rails v2" (https://claude.ai/artifact/N4p4DdmiCdma2UHQE1eXX1,
 * version 1793646445-8789), copied byte for byte on 2026-11-02 between the page's own markers:
 *
 *   calc:start … calc:end     the founder's "Chris Rails v2" sheets — "Chris Center Rail v2" and
 *                             "Chris Nose&Tail Rail v2" in Chris Rails v2.xlsx (Google Drive, "Surfboard
 *                             Shaping and Design/rails/", saved 2026-11-02 10:03 PST) — column C cell for
 *                             cell, plus the drawn lines following the sheets' chart series
 *   finish:start … finish:end the finished rail, "Blended halfway" (the founder's pick over "One even
 *                             round", 2026-11-02), ported from sketch 018
 *                             (.planning/sketches/018-finished-rail-curve/)
 *
 * The page's numbers were checked against the workbook cell for cell by the founder, who signed the page
 * off as the reference for quick 261102-gec (Rule 1: the expected numbers come from the reference's own
 * code, never a transcription). It works in INCHES: x is inches in from the rail (0 at the rail, negative
 * toward the stringer), y is inches up from the bottom.
 *
 * Only `sheetV2`, `thicknesses`, `segments` and the finish block are rules. `SHEET` holds the workbook's
 * two saved input sets (nose and tail both read the one Nose & Tail sheet). `META` and `todayApp` are the
 * page's own port of today's lib/geometry/rail-bands.ts, kept for the page's comparison overlay — not a
 * rule, and not what the app computes after this task.
 *
 * It is run only by the golden generator under scripts/ that writes
 * lib/geometry/__fixtures__/rails-v2-golden.json. The app never imports it.
 *
 * Do not edit anything below this comment. The golden is only as good as this copy is faithful, and the
 * copy is only faithful while the body is the page's two blocks unchanged.
 */
/* calc:start */
// The sheets' inputs exactly as the 10:03 save has them. Nose and Tail both read the one Nose & Tail sheet.
const SHEET = {
  nose:   { T: 1.625, deck: 100, F: 1, top: 62.5, sym: false, scale: 0.75 },
  center: { T: 2.5,   deck: 100, F: 3, top: 62.5, sym: false, scale: 1 },
  tail:   { T: 1.625, deck: 100, F: 1, top: 62.5, sym: false, scale: 0.75 },
};
const META = {
  nose:   { name: "Nose",   sheet: "Nose & Tail sheet", tMin: 1, tMax: 2.5, todayBase: 4.5, todayScale: 0.75 },
  center: { name: "Center", sheet: "Center sheet",      tMin: 1.75, tMax: 3.5, todayBase: 6, todayScale: 1 },
  tail:   { name: "Tail",   sheet: "Nose & Tail sheet", tMin: 1, tMax: 2.5, todayBase: 4.5, todayScale: 0.75 },
};
const r16 = (x) => Math.round(x * 16) / 16;

// Deck Profile: 100% is flat; below it the rail tapers to that share of the board thickness, to the 1/16" as the app does.
function thicknesses(s) {
  const domed = s.deck < 100, rail = domed ? r16(s.T * s.deck / 100) : s.T;
  return { domed, bt: s.T, rail, t: domed ? rail : s.T };   // C9: =IF(C6="flat",C7,C8)
}

// Your v2 sheets, column C, cell for cell (inches).
function sheetV2(s) {
  const { domed, bt, rail, t } = thicknesses(s);
  const bottom = 1 - s.top / 100;                               // C5  =100%-C4
  const apexLen = (-0.125 * s.F + 1.375) * t * 0.35 * s.scale;  // C11 (Nose & Tail: ×C3)
  const apexCenter = t * bottom;                                // C12 =C9*C5
  const rm1 = apexCenter + apexLen / 2;                         // C13 =C12+C11/2
  const rt1 = apexCenter - apexLen / 2;                         // C14 =C12-C11/2
  const domeBand = 2.4 * bt;                                    // C15 =2.4*C7, the board thickness
  const dm1 = 1 * bt * s.scale;                                 // C16 =(1*C7)*C3, the board thickness
  const dm2 = dm1 / 2;                                          // C17 =C16/2
  const dm3 = 1.8 * bt * s.scale;                               // C18 =(1.8*C7)*C3
  const bt1 = s.sym ? dm1 : rt1 * 0.577;                        // C19 =IF(C2,C16,C14*0.577), Fred's 30° tool
  const bt2 = bt1 / 2;                                          // C20 =C19/2
  const bt3 = s.sym ? dm3 : rt1;                                // C21 =IF(C2,C18,C14)
  return { domed, bt, rail, t, apexLen, apexCenter, rm1, rt1, domeBand, dm1, dm2, dm3, bt1, bt2, bt3, cc: null };
}

// Today's app (lib/geometry/rail-bands.ts) at the same thickness, family, ratio and Sym, with its default corner cut.
function todayApp(s, key) {
  const { domed, bt, rail, t } = thicknesses(s);
  const { todayBase, todayScale: k } = META[key], F = s.F;
  const apexLen = (-0.125 * F + 1.125) * k;
  const apexCenter = t * (1 - s.top / 100);
  const rm1 = apexCenter + apexLen / 2, rt1 = apexCenter - apexLen / 2;
  const off = { 1: 0.125, 2: 0.09375, 3: 0.0625, 4: 0.03125, 5: 0 }[F];
  const dm1 = (0.25 * F + 1.75) * k, dm2 = dm1 / 2, dm3 = (0.25 * F + 3.25) * k;
  const bt1 = s.sym ? dm1 : rt1 / 2, bt2 = bt1 / 2, bt3 = s.sym ? dm3 : rt1;
  return { domed, bt, rail, t, apexLen, apexCenter, rm1, rt1, domeBand: todayBase, dm1, dm2, dm3, bt1, bt2, bt3, cc: { rail: rm1 - off, deck: off } };
}

// The drawn lines, following the sheet's chart series (x = inches in from the rail, negative; y = up from the bottom).
function segments(r) {
  const deckY = (x) => (r.bt === r.t ? r.t : r.t + (r.bt - r.t) * Math.min(1, Math.max(0, -x / r.domeBand)));
  const b1End = [-r.dm1, deckY(-r.dm1)];
  const band1Y = (x) => r.rm1 + (b1End[1] - r.rm1) * (-x / r.dm1);
  const segs = [
    { key: "domed", p1: [0, r.t], p2: [-r.domeBand, r.bt] },
    { key: "band1", p1: [0, r.rm1], p2: b1End },
    { key: "band2", p1: [-r.dm2, band1Y(-r.dm2)], p2: [-r.dm3, deckY(-r.dm3)] },
  ];
  if (r.cc && r.cc.deck > 1e-9) segs.push({ key: "cut", p1: [0, r.cc.rail], p2: [-r.cc.deck, band1Y(-r.cc.deck)] });
  segs.push({ key: "tuck1", p1: [0, r.rt1], p2: [-r.bt1, 0] });
  segs.push({ key: "tuck2", p1: [-r.bt2, r.rt1 / 2], p2: [-r.bt3, 0] });
  return segs;
}
/* calc:end */

/* finish:start */
// The finished rail, ported from sketch 018: the shape the cuts leave, with every corner blended.
const near = (a, b) => Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6;
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const quad = (A, V, B, t) => [(1 - t) * (1 - t) * A[0] + 2 * (1 - t) * t * V[0] + t * t * B[0], (1 - t) * (1 - t) * A[1] + 2 * (1 - t) * t * V[1] + t * t * B[1]];
// Every line that takes foam off (the dome only when the deck is domed).
const cuts = (r) => segments(r).filter((s) => (s.key !== "domed" || r.domed) && dist(s.p1, s.p2) > 1e-6);

// The foam left once every line is cut: the dotted comparison outline, and what the finished rail rounds.
function foam(r, X0) {
  let poly = [[X0, 0], [0, 0], [0, r.bt], [X0, r.bt]];
  const ref = [X0 + 0.05, r.bt / 2];
  for (const s of cuts(r)) poly = clip(poly, s.p1, s.p2, ref);
  return poly;
}
function clip(poly, a, b, ref) {
  const side = (p) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
  const keep = Math.sign(side(ref)) || 1;
  const inside = (p) => side(p) * keep >= -1e-9;
  const cross = (p, q) => { const sp = side(p), sq = side(q), k = sp / (sp - sq); return [p[0] + k * (q[0] - p[0]), p[1] + k * (q[1] - p[1])]; };
  const out = [];
  poly.forEach((cur, i) => {
    const prv = poly[(i + poly.length - 1) % poly.length];
    const ci = inside(cur), pi = inside(prv);
    if (ci) { if (!pi) out.push(cross(prv, cur)); out.push(cur); }
    else if (pi) out.push(cross(prv, cur));
  });
  return out;
}

// The cut shape as one run: along the deck from the drawing's far end, over the rail, back along the bottom.
function cutChain(r, X0) {
  let poly = foam(r, X0);
  poly = poly.filter((p, i) => !near(p, poly[(i + 1) % poly.length]));
  const iTop = poly.findIndex((p) => Math.abs(p[0] - X0) < 1e-6 && Math.abs(p[1] - r.bt) < 1e-6);
  const rot = poly.slice(iTop).concat(poly.slice(0, iTop));
  const chain = [rot[0]].concat(rot.slice(1).reverse());
  return chain.filter((p, i) => {
    if (i === 0 || i === chain.length - 1) return true;
    const a = chain[i - 1], b = chain[i + 1];
    return Math.abs((p[0] - a[0]) * (b[1] - p[1]) - (p[1] - a[1]) * (b[0] - p[0])) > 1e-7;
  });
}

// Halfway blend: each corner rounded by a parabola that leaves each band at its middle. The deck and
// bottom flats take the neighbouring band's reach.
function blendRun(pts, fullLen, flat, f, P, out) {
  const n = pts.length - 1;
  for (let i = 1; i < n; i++) {
    const V = pts[i], lIn = dist(pts[i - 1], V), lOut = dist(V, pts[i + 1]);
    if (lIn < 1e-9 || lOut < 1e-9) { out.d += ` L${P(V)}`; out.pts.push(V); continue; }
    const dIn = Math.min(flat[i - 1] ? f * fullLen[i] : f * fullLen[i - 1], lIn);
    const dOut = Math.min(flat[i] ? f * fullLen[i - 1] : f * fullLen[i], lOut);
    const A = lerp(V, pts[i - 1], dIn / lIn), B = lerp(V, pts[i + 1], dOut / lOut);
    out.d += ` L${P(A)} Q${P(V)} ${P(B)}`;
    for (let s = 0; s <= 16; s++) out.pts.push(quad(A, V, B, s / 16));
  }
}

// The finished rail, blended halfway (the founder's pick, 2026-11-02), as an SVG path (P maps inches to
// "x,y" on the drawing) and a sampled copy of it. Halfway always meets the rail at the Apex Center.
function finishedCurve(r, X0, P = () => "") {
  const chain = cutChain(r, X0), n = chain.length - 1;
  const lens = chain.slice(0, -1).map((p, i) => dist(p, chain[i + 1]));
  const out = { d: `M${P(chain[0])}`, pts: [chain[0]], chain };
  blendRun(chain, lens, lens.map((_, i) => i === 0 || i === n - 1), 0.5, P, out);
  out.d += ` L${P(chain[n])}`; out.pts.push(chain[n]);
  return out;
}
/* finish:end */
