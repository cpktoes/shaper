/**
 * Fin-setup button icon glyphs.
 *
 * Decorative glyph math in an arbitrary 64x64 icon space, not board geometry — same posture as
 * components/outline/tail-shape-icon.tsx's header note, so this deliberately stays in the
 * component layer rather than under lib/geometry.
 *
 * Ported from the prototype's `finGlyph` (the two-quadratic curved fin) and `straightFinGlyph`
 * (the four-point box), reference/project/Fins.dc.html lines 836-843, plus the five tick-set
 * layouts from `finSetupOptions` (lines 1346-1351). The outline behind the ticks is always the
 * squash outline at icon scale (Fins.dc.html line 1354) — reused from tail-shape-icon.tsx's own
 * generator rather than duplicated.
 */

import { iconOutlinePath, type IconTailShape } from "@/components/outline/tail-shape-icon";

export type FinSetupKind = "single" | "twin" | "thruster" | "2plus1" | "quad";

const ICON_BASE_SHAPE: IconTailShape = "squash";

function finGlyph(x: number, yTip: number, yBase: number, hb = 3.4): string {
  const midY = (yTip + yBase) / 2;
  return `M ${x - hb} ${yBase} Q ${x - hb - 1.2} ${midY + 2} ${x} ${yTip} Q ${x + hb + 2.5} ${midY + 3} ${x + hb} ${yBase} Z`;
}

function straightFinGlyph(x: number, yTip: number, yBase: number, hw = 1.4): string {
  return `M ${x - hw} ${yBase} L ${x - hw} ${yTip} L ${x + hw} ${yTip} L ${x + hw} ${yBase} Z`;
}

function ticksFor(setup: FinSetupKind): string[] {
  switch (setup) {
    case "single":
      return [straightFinGlyph(32, 14, 45, 2.2)];
    case "twin":
      return [finGlyph(18, 13, 34, 4.6), finGlyph(46, 13, 34, 4.6)];
    case "thruster":
      return [finGlyph(17, 13, 29, 4.0), finGlyph(47, 13, 29, 4.0), straightFinGlyph(32, 26, 46)];
    case "2plus1":
      return [finGlyph(15, 13, 27, 4.0), finGlyph(49, 13, 27, 4.0), straightFinGlyph(32, 19, 50, 2.0)];
    case "quad":
      return [finGlyph(13, 13, 31, 4.0), finGlyph(26, 24, 44), finGlyph(38, 24, 44), finGlyph(51, 13, 31, 4.0)];
  }
}

export function FinSetupIcon({ setup, active }: { setup: FinSetupKind; active: boolean }) {
  const outlinePath = iconOutlinePath(ICON_BASE_SHAPE, 15, 1, 12);
  // Active icons sit ON the accent fill, so they take its paired `on-` colour rather than
  // the ink token. Those were the same value before theming; in dark, ink is near-white
  // and this drew a pale glyph on bright cyan at 1.4:1.
  const stroke = active ? "var(--color-surf-on-accent)" : "var(--color-surf-muted)";
  return (
    <svg width={34} height={34} viewBox="0 0 64 64" aria-hidden="true">
      <path d={outlinePath} fill="none" stroke={stroke} strokeWidth={2.5} strokeLinecap="round" />
      {ticksFor(setup).map((d, i) => (
        <path key={i} d={d} fill={stroke} />
      ))}
    </svg>
  );
}
