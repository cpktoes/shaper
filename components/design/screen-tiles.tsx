"use client";

/**
 * The eight screen tiles at the top of the phone menu (quick 261003-q2f, sketch 007's C1): TEMPLATE,
 * ROCKER, BOTTOM (Phase 17), RAILS, VOLUME, FINS, SUMMARY and — since Phase 16 — 3D, each a small picture of the board the shaper is working on
 * right now, its name, and one line. The founder picked tiles (round 1: "ooh, I kinda like the screen
 * tiles") and asked for real pictures (round 2: "the icons need to look realistic (rocker cannot look
 * like a U). Can we use current board as the art?"), so every picture is that screen's own drawing of
 * the current board with the labels left out, and VOLUME shows the board's real litres — never a
 * made-up number.
 *
 * Every picture comes from `lib/geometry/screen-tiles.ts`, fed with the design store's own values —
 * the outline, the side profile, the centre rail section, the fin tail and placement, and the one
 * litres figure every screen quotes. 3D's comes from `lib/geometry/three-d-tile-art.ts`: the board
 * turned three-quarters (the Board Rack's own turn at 50 degrees, the 3D screen's first view), lying
 * nose left with its stringer, or TEMPLATE's lying outline for a board whose turn can't be worked out. Nothing is captured, cached or stored: this component renders
 * only inside the open menu (Base UI unmounts a closed menu's content), so dragging a slider with the
 * menu shut never rebuilds a picture.
 *
 * Four over four on an upright phone (TEMPLATE ROCKER BOTTOM RAILS over VOLUME FINS SUMMARY 3D);
 * one row of eight at the desktop-shell width — width alone, CLAUDE.md's layout switch. At that width
 * the menu button only ever shows on a short screen (a tall window has the desktop row), so eight
 * across is only ever a phone held sideways, where each tile is about 96 dots wide (Phase 17 UI-SPEC
 * § Already done: 95.5 at 844, 97.9 at 863) — room still for TEMPLATE's name.
 *
 * BOTTOM's picture (Phase 17, UI-SPEC §9) is TEMPLATE's board lying nose left with this board's own
 * bottom on it — its shade on a coarse grid, its pencil lines — and the section's cutting line at the
 * wide point, which is what tells a flat board's tile from TEMPLATE's; its line is `All flat`, `1 cut`
 * or `2 cuts · 6 channels` (`bottomTileArt`, `bottomTileLine`). Never a made-up cut.
 *
 * Each tile is a real `Menu.Item` (arrow keys, Enter, tap) whose accessible name is its screen and its
 * line ("TEMPLATE — 6'2" × 18 3/4"", "VOLUME — 29.6 L Estimated"); the pictures themselves are hidden
 * from screen readers. The current screen's tile is ticked and carries `aria-current="page"`, with the
 * same active test the desktop row uses. Tapping another tile moves with `router.push` — a client-side
 * move that keeps an unsaved board and its undo history — and tapping the current one just closes the
 * menu.
 *
 * ROCKER's tile gains a second line when the board sits in a blank (quick 261016-mkb, D-11, P-4,
 * 2026-10-16): the blank's rocker, `Natural` or the note as ordered, under `On a 9'4"B`, and its name
 * says it (`ROCKER — On a 9'4"B Natural`). It shows on every layout, an upright phone included,
 * because the picture is a fixed 46-dot box and the sheet scrolls inside itself, so a second line can
 * only make the top row of tiles taller, never the drawing smaller — a browser test measures it.
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
  screenTileRocker,
  summaryTileArt,
  type ScreenTileKind,
} from "@/lib/geometry/screen-tiles";
import { threeDTilePicture } from "@/lib/geometry/three-d-tile-art";
import { bottomTileArt } from "@/lib/geometry/bottom-tile-art";

/** Which picture each screen gets, keyed by its address — typed on the one screen list, so a new
 * screen fails to compile until it has a picture. */
const TILE_KIND: Record<NavLink["href"], ScreenTileKind> = {
  "/design/outline": "template",
  "/design/rocker": "rocker",
  "/design/bottom": "bottom",
  "/design/rails": "rails",
  "/design/volume": "volume",
  "/design/fins": "fins",
  "/design/summary": "summary",
  "/design/3d": "threeD",
};

const PICTURE_CLASS = "block h-[46px] w-full";

function useTilePictures() {
  const {
    outline,
    blank,
    outlineGeometry,
    sideProfile,
    railBandsOnBottom,
    effectiveFins,
    finTailOutline,
    finPlacement,
    quotedVolumeLitres,
    resolvedBottom,
    bottomBoard,
  } = useDesign();
  const { system } = useUnits();

  const template = useMemo(() => outlineTileArt(outlineGeometry, "lying"), [outlineGeometry]);
  const rocker = useMemo(() => rockerTileArt(sideProfile), [sideProfile]);
  // This board's own bottom on TEMPLATE's lying board, with the cutting line at the wide point (Phase 17, UI-SPEC §9).
  const bottom = useMemo(
    () => bottomTileArt(outlineGeometry, resolvedBottom, bottomBoard),
    [outlineGeometry, resolvedBottom, bottomBoard],
  );
  // The rail RAILS bands, the bottom's lift taken off (Phase 17, D-22) — `railBands` itself on a flat bottom.
  const rails = useMemo(() => railsTileArt(railBandsOnBottom.center), [railBandsOnBottom.center]);
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
  // The rack's own turn at 50 degrees, or TEMPLATE's lying outline for a board it can't turn.
  const threeD = useMemo(() => threeDTilePicture(sideProfile, outlineGeometry), [sideProfile, outlineGeometry]);
  const lines = useMemo(
    () => screenTileLines({ outline, blank, bottom: resolvedBottom, finSetup: effectiveFins.finSetup, system }),
    [outline, blank, resolvedBottom, effectiveFins.finSetup, system],
  );
  // ROCKER's second line: the blank's rocker — `Natural` or the note (quick 261016-mkb, D-11).
  const rockerLine = useMemo(() => screenTileRocker(blank), [blank]);
  const litres = formatTileLitres(quotedVolumeLitres);
  return { template, rocker, bottom, rails, fins, summary, threeD, lines, rockerLine, litres };
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
    case "bottom":
      return (
        <svg aria-hidden data-tile-picture className={PICTURE_CLASS} viewBox={pictures.bottom.viewBox} preserveAspectRatio="xMidYMid meet">
          <path d={pictures.bottom.board} fill="var(--outline-board-fill)" />
          {pictures.bottom.shade.map((d, i) => (
            <path key={i} d={d} fill="var(--outline-bottom-shade)" fillOpacity={0.04} />
          ))}
          {pictures.bottom.pencil !== "" && (
            <path
              d={pictures.bottom.pencil}
              fill="none"
              stroke="var(--outline-pencil-line)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          )}
          <path
            d={pictures.bottom.board}
            fill="none"
            stroke="var(--outline-ink)"
            strokeWidth={1.4}
            vectorEffect="non-scaling-stroke"
          />
          <line
            {...pictures.bottom.cutLine}
            stroke="var(--outline-ink)"
            strokeWidth={1}
            strokeDasharray="4 2 1.5 2"
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
    case "threeD":
      return (
        <svg aria-hidden data-tile-picture className={PICTURE_CLASS} viewBox={pictures.threeD.viewBox} preserveAspectRatio="xMidYMid meet">
          <path
            d={pictures.threeD.board}
            fill="var(--outline-board-fill)"
            stroke="var(--outline-ink)"
            strokeWidth={1.4}
            vectorEffect="non-scaling-stroke"
          />
          {pictures.threeD.kind === "turned" && (
            <path
              d={pictures.threeD.stringer}
              fill="none"
              stroke="var(--outline-blank-line)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>
      );
  }
}

export function ScreenTiles({ screens }: { screens: readonly NavLink[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const pictures = useTilePictures();

  return (
    <Menu.Group aria-label="Screens" className="grid grid-cols-4 gap-2 shell:grid-cols-8">
      {screens.map((link) => {
        const kind = TILE_KIND[link.href];
        const active = pathname === link.href || pathname?.startsWith(`${link.href}/`);
        const line = pictures.lines[kind];
        // ROCKER's tile carries the blank's rocker as a second line, and says it (D-11).
        const second = kind === "rocker" ? pictures.rockerLine : null;
        const name =
          kind === "volume"
            ? `${link.label} — ${pictures.litres} L ${line}`
            : `${link.label} — ${line}${second !== null ? ` ${second}` : ""}`;
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
            {second !== null && (
              <span data-tile-rocker className="line-clamp-2 text-center text-[11px] leading-tight text-surf-ink-muted">
                {second}
              </span>
            )}
          </Menu.Item>
        );
      })}
    </Menu.Group>
  );
}
