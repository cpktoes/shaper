/**
 * Tail-shape button icon glyphs.
 *
 * This is decorative glyph math in an arbitrary icon coordinate space (a
 * 64x64 SVG viewBox), not board geometry — it deliberately stays in the
 * component layer rather than under `lib/geometry`, so its placement here
 * is not a violation of the project's geometry constraint (all real board
 * math lives in lib/geometry, pure TypeScript, unit-tested).
 *
 * Ported from the prototype's icon generator (the Catmull-Rom path builder,
 * the per-shape base-width curve, and the outline path assembler) —
 * reference/project/Template.dc.html lines 330-373. Same generator as the
 * Fin Placement Calculator's tail-shape buttons, so the icons read
 * identically across tools.
 */

export type IconTailShape = "pin" | "round" | "diamond" | "squash" | "swallow";

function catmullIconPath(pts: [number, number][]): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2[0]} ${p2[1]}`;
  }
  return d;
}

function iconXBaseAt(shape: IconTailShape, y: number): number {
  const yy = Math.max(0, y);
  switch (shape) {
    case "pin":
      return 1.125 * yy - 0.0586 * yy * yy + 0.001214 * yy * yy * yy;
    case "squash":
      return 2.25 + 0.6708 * yy - 0.0285 * yy * yy + 0.000539 * yy * yy * yy;
    case "round":
      return 2.5119 * Math.sqrt(yy) - 0.134 * yy;
    case "swallow":
      return 4.1078 + 0.3237 * yy - 0.00573 * yy * yy;
    default:
      return 1.125 * yy - 0.0586 * yy * yy + 0.001214 * yy * yy * yy;
  }
}

/** Exported so other icon-scale glyphs (e.g. the Fin Setup buttons, which always draw the
 * squash outline behind their ticks) can reuse this generator rather than duplicating it. */
export function iconOutlinePath(
  shape: IconTailShape,
  w12: number,
  diamondDepthMult: number,
  yMax: number,
): string {
  const scale = 4.1667;
  const originX = 32;
  const tailY = 58;
  const mapPt = ([x, y]: [number, number]): [number, number] => [
    originX + x * scale,
    tailY - y * scale,
  ];
  const baseShape: IconTailShape = shape === "diamond" ? "round" : shape;
  const S = w12 / 2 / iconXBaseAt(baseShape, 12);
  const yLow = shape === "diamond" ? 2 * diamondDepthMult : 0;
  const N = 48;
  const posSide: [number, number][] = [];
  for (let i = 0; i <= N; i++) {
    const y = yLow + (Math.min(yMax, 20) - yLow) * (i / N);
    posSide.push([S * iconXBaseAt(baseShape, y), y]);
  }
  const negSide = posSide
    .slice()
    .reverse()
    .map(([x, y]) => [-x, y] as [number, number]);
  const negMapped = negSide.map(mapPt);
  const posMapped = posSide.map(mapPt);
  let d = catmullIconPath(negMapped);
  const connectorPt: [number, number] | null =
    shape === "diamond" ? [0, 0] : shape === "swallow" ? [0, 2.5] : null;
  if (connectorPt) {
    const cm = mapPt(connectorPt);
    d += ` L ${cm[0].toFixed(2)} ${cm[1].toFixed(2)}`;
  }
  d += ` L ${posMapped[0][0].toFixed(2)} ${posMapped[0][1].toFixed(2)}`;
  const posPath = catmullIconPath(posMapped);
  d += posPath.substring(posPath.indexOf(" C"));
  return d;
}

export function TailShapeIcon({
  shape,
  active,
}: {
  shape: IconTailShape;
  active: boolean;
}) {
  const diamondDepthMult = shape === "diamond" ? 2 : 1;
  const path = iconOutlinePath(shape, 15, diamondDepthMult, 12);
  // Active icons sit ON the accent fill, so they take its paired `on-` colour rather than
  // the ink token. Those were the same value before theming; in dark, ink is near-white
  // and this drew a pale glyph on bright cyan at 1.4:1.
  const stroke = active ? "var(--color-surf-on-accent)" : "var(--color-surf-ink-muted)";
  return (
    <svg width={30} height={30} viewBox="0 0 64 64" aria-hidden="true">
      <path
        d={path}
        fill="none"
        stroke={stroke}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line x1={32} y1={6} x2={32} y2={52} stroke={stroke} strokeWidth={1.5} opacity={0.5} />
    </svg>
  );
}
