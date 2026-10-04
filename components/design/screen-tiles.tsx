"use client";

/**
 * The six screen tiles at the top of the phone menu (quick 261003-q2f, sketch 007's C1): TEMPLATE,
 * ROCKER, RAILS, VOLUME, FINS and SUMMARY, each a small picture of the board the shaper is working on
 * right now, its name, and one line. The founder picked tiles (round 1: "ooh, I kinda like the screen
 * tiles") and asked for real pictures (round 2: "the icons need to look realistic (rocker cannot look
 * like a U). Can we use current board as the art?"), so every picture is that screen's own drawing of
 * the current board with the labels left out, and VOLUME shows the board's real litres — never a
 * made-up number.
 *
 * Every picture comes from `lib/geometry/screen-tiles.ts`, fed with the design store's own values —
 * the outline, the side profile, the centre rail section, the fin tail and placement, and the one
 * litres figure every screen quotes. Nothing is captured, cached or stored: this component renders
 * only inside the open menu (Base UI unmounts a closed menu's content), so dragging a slider with the
 * menu shut never rebuilds a picture.
 *
 * Three across and two down on an upright phone; one row of six at the desktop-shell width — width
 * alone, CLAUDE.md's layout switch. At that width the menu button only ever shows on a short screen
 * (a tall window has the desktop row), so six across is only ever a phone held sideways, where the
 * pictures come out a little larger and leave room for the rows below.
 *
 * Each tile is a real `Menu.Item` (arrow keys, Enter, tap) whose accessible name is its screen and its
 * line ("TEMPLATE — 6'2" × 18 3/4"", "VOLUME — 29.6 L Estimated"); the pictures themselves are hidden
 * from screen readers. The current screen's tile is ticked and carries `aria-current="page"`, with the
 * same active test the desktop row uses. Tapping another tile moves with `router.push` — a client-side
 * move that keeps an unsaved board and its undo history — and tapping the current one just closes the
 * menu.
 */

import { useMemo } from "react";
import { Menu } from "@base-ui/react/menu";
import { CheckIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useDesign } from "@/components/design/design-store";
import { RAIL_APEX_CENTER_COLOR, RAIL_SEGMENT_COLORS } from "@/components/rails/rail-section-plot";
import type { NavLink } from "@/components/site-nav";
import { useUnits } from "@/components/units-provider";
import { tailOutlineHalfPoints } from "@/lib/geometry/fins";
import {
  finsTileArt,
  formatTileLitres,
  outlineTileArt,
  railsTileArt,
  rockerTileArt,
  screenTileLines,
  summaryTileArt,
  type ScreenTileKind,
} from "@/lib/geometry/screen-tiles";

/** Which picture each screen gets, keyed by its address — typed on the one screen list, so a new
 * screen fails to compile until it has a picture. */
const TILE_KIND: Record<NavLink["href"], ScreenTileKind> = {
  "/design/outline": "template",
  "/design/rocker": "rocker",
  "/design/rails": "rails",
  "/design/volume": "volume",
  "/design/fins": "fins",
  "/design/summary": "summary",
};

const PICTURE_CLASS = "block h-[46px] w-full";

function useTilePictures() {
  const { outline, blank, outlineGeometry, sideProfile, railBands, effectiveFins, finTailOutline, finPlacement, quotedVolumeLitres } =
    useDesign();
  const { system } = useUnits();

  const template = useMemo(() => outlineTileArt(outlineGeometry, "lying"), [outlineGeometry]);
  const rocker = useMemo(() => rockerTileArt(sideProfile), [sideProfile]);
  const rails = useMemo(() => railsTileArt(railBands.center), [railBands.center]);
  const fins = useMemo(
    () =>
      finsTileArt(
        // FINS' own fallback: the drawn template's tail when importing, else the generic tail curve.
        finTailOutline ?? tailOutlineHalfPoints(effectiveFins.tailShape, effectiveFins.tailWidth12),
        finPlacement.marks,
      ),
    [finTailOutline, effectiveFins.tailShape, effectiveFins.tailWidth12, finPlacement.marks],
  );
  const summary = useMemo(() => summaryTileArt(outlineGeometry), [outlineGeometry]);
  const lines = useMemo(
    () => screenTileLines({ outline, blank, finSetup: effectiveFins.finSetup, system }),
    [outline, blank, effectiveFins.finSetup, system],
  );
  const litres = formatTileLitres(quotedVolumeLitres);
  return { template, rocker, rails, fins, summary, lines, litres };
}

type TilePictures = ReturnType<typeof useTilePictures>;

function TilePicture({ kind, pictures }: { kind: ScreenTileKind; pictures: TilePictures }) {
  switch (kind) {
    case "template":
      return (
        <svg aria-hidden data-tile-picture className={PICTURE_CLASS} viewBox={pictures.template.viewBox} preserveAspectRatio="xMidYMid meet">
          <path
            d={pictures.template.board}
            fill="var(--outline-board-fill)"
            stroke="var(--outline-ink)"
            strokeWidth={1.4}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      );
    case "rocker":
      return (
        <svg aria-hidden data-tile-picture className={PICTURE_CLASS} viewBox={pictures.rocker.viewBox} preserveAspectRatio="xMidYMid meet">
          {pictures.rocker.blank && (
            <path
              d={pictures.rocker.blank}
              fill="var(--outline-foam-shade)"
              stroke="var(--outline-blank-line)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          )}
          <path
            d={pictures.rocker.board}
            fill="var(--outline-board-fill)"
            stroke="var(--outline-ink)"
            strokeWidth={1.4}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      );
    case "rails":
      return (
        <svg aria-hidden data-tile-picture className={PICTURE_CLASS} viewBox={pictures.rails.viewBox} preserveAspectRatio="xMidYMid meet">
          {pictures.rails.lines.map((line) => (
            <line
              key={line.key}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke={RAIL_SEGMENT_COLORS[line.key]}
              strokeWidth={1.6}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {pictures.rails.dots.map((dot, i) => (
            <circle
              key={i}
              cx={dot.cx}
              cy={dot.cy}
              r={pictures.rails.dotRadius}
              fill={dot.key === "apexCenter" ? RAIL_APEX_CENTER_COLOR : RAIL_SEGMENT_COLORS[dot.key]}
            />
          ))}
        </svg>
      );
    case "volume":
      return (
        <span aria-hidden data-tile-picture className="flex h-[46px] items-center text-[22px] leading-none font-extrabold tabular-nums">
          {pictures.litres}
          <span className="ml-0.5 self-end pb-2.5 text-[13px] font-bold text-surf-ink-muted">L</span>
        </span>
      );
    case "fins":
      return (
        <svg aria-hidden data-tile-picture className={PICTURE_CLASS} viewBox={pictures.fins.viewBox} preserveAspectRatio="xMidYMid meet">
          <path d={pictures.fins.fill} fill="var(--outline-board-fill)" />
          <path
            d={pictures.fins.outline}
            fill="none"
            stroke="var(--outline-ink)"
            strokeWidth={1.3}
            vectorEffect="non-scaling-stroke"
          />
          {pictures.fins.fins.map((fin, i) => (
            <line
              key={i}
              x1={fin.x1}
              y1={fin.y1}
              x2={fin.x2}
              y2={fin.y2}
              stroke="var(--color-surf-accent-ink)"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeDasharray={fin.dashed ? "3 2" : undefined}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
      );
    case "summary":
      return (
        <svg aria-hidden data-tile-picture className={PICTURE_CLASS} viewBox={pictures.summary.viewBox} preserveAspectRatio="xMidYMid meet">
          <rect
            {...pictures.summary.page}
            fill="var(--color-surf-tab-active)"
            stroke="var(--color-surf-line)"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={pictures.summary.board}
            fill="var(--outline-board-fill)"
            stroke="var(--outline-ink)"
            strokeWidth={1.4}
            vectorEffect="non-scaling-stroke"
          />
          {pictures.summary.rules.map((rule, i) => (
            <line
              key={i}
              {...rule}
              stroke="var(--color-surf-ink-muted)"
              strokeWidth={1.2}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
      );
  }
}

export function ScreenTiles({ screens }: { screens: readonly NavLink[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const pictures = useTilePictures();

  return (
    <Menu.Group aria-label="Screens" className="grid grid-cols-3 gap-2 shell:grid-cols-6">
      {screens.map((link) => {
        const kind = TILE_KIND[link.href];
        const active = pathname === link.href || pathname?.startsWith(`${link.href}/`);
        const line = pictures.lines[kind];
        const name = kind === "volume" ? `${link.label} — ${pictures.litres} L ${line}` : `${link.label} — ${line}`;
        return (
          <Menu.Item
            key={link.href}
            data-screen-tile={link.href}
            aria-current={active ? "page" : undefined}
            aria-label={name}
            onClick={() => {
              if (!active) router.push(link.href);
            }}
            className={
              "relative flex min-w-0 cursor-pointer flex-col items-center gap-1 rounded-lg border bg-surf-ground px-1 pt-2 pb-1.5 text-surf-ink outline-none select-none data-highlighted:bg-surf-well " +
              (active ? "border-surf-accent-ink ring-1 ring-surf-accent-ink ring-inset" : "border-surf-line-faint")
            }
          >
            {active && (
              <CheckIcon aria-hidden className="absolute top-1 right-1.5 size-3.5 text-surf-accent-ink" />
            )}
            <TilePicture kind={kind} pictures={pictures} />
            <span className="text-[11px] font-extrabold tracking-architectural">{link.label}</span>
            <span data-tile-line className="line-clamp-2 text-center text-[11px] leading-tight text-surf-ink-muted">{line}</span>
          </Menu.Item>
        );
      })}
    </Menu.Group>
  );
}
