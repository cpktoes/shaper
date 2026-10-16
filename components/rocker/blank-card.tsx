"use client";

/**
 * One blank as a catalogue card in ROCKER's PICK A BLANK popup, and the small drawing on the BLANK
 * button (quick 261015-ve9, sketch 015 B — the founder's pick, 2026-10-15).
 *
 * The FLAT card (D-09, the founder's ruling of 2026-10-15: "The line under the side view seems
 * unnecessary. Just move the actual length up to the top to the left of the volume. All the dims are
 * below it already."): the name on the left of the header and the blank's length · litres on the
 * right; the maker; the drawing; and directly under it the printed station table. A greyed card (the
 * blank won't fit) mutes its name and gives the reason in warning ink — never faded with opacity. The
 * board's own blank carries an accent border and "On your board now".
 *
 * The drawing (D-03, D-04, D-14) is `blankCardArt`'s points turned into paths, nothing else: the
 * blank from above over its rocker from the side, true to proportion and filling its box, and the
 * shaper's own board dashed on it where the app would place it. Every stroke stays at screen width
 * as the card scales (`vector-effect: non-scaling-stroke`); one art unit is about one CSS pixel on a
 * 320-px card, so the dashes are written in pixels. No text inside the SVG — catalogue text renders
 * as React text only (T-11-32).
 *
 * The whole card is picked by one transparent button laid over it (its last child), so the table
 * stays a real table and plan 02's star can sit above it. A locked board can browse but not pick
 * (D-08): the button is disabled and the card takes the lock's 60% look.
 */

import { useMemo } from "react";
import type { BlankRecord } from "@/lib/geometry/blank";
import {
  blankCardArt,
  boardOnBlankArt,
  FLAT_CARD_BOX,
  THUMB_BOX,
  type ArtPoint,
  type BlankCardArt,
  type CardBox,
  type CardPose,
} from "@/lib/geometry/blank-card-art";
import { cardFigures, stationTable } from "@/lib/geometry/blank-card-text";
import { blankTipRockers, type BlankVerdict, type PreparedBlank } from "@/lib/geometry/blank-fit";
import { polylinePath } from "@/lib/geometry/screen-tiles";
import type { Mm, UnitsSystem } from "@/lib/geometry/units";
import { cn } from "@/lib/utils";

/** A card's drawing is worked out once per prepared blank, pose and box per visit — the prepared
 * catalogue itself is held once per visit (`use-blank-list.ts`), so this cache lives as long. */
const artCache = new WeakMap<PreparedBlank, Map<string, BlankCardArt>>();

/** `blankCardArt`, cached per prepared blank and pose (T-ve9-03). */
export function cachedCardArt(prepared: PreparedBlank, pose: CardPose, box: CardBox): BlankCardArt {
  let byKey = artCache.get(prepared);
  if (!byKey) {
    byKey = new Map();
    artCache.set(prepared, byKey);
  }
  const key = `${pose}:${box.width}x${box.height}`;
  let art = byKey.get(key);
  if (!art) {
    art = blankCardArt(prepared, pose, box);
    byKey.set(key, art);
  }
  return art;
}

/** The shaper's board as every card draws it: its length and TEMPLATE's own silhouette. */
export interface CardBoard {
  length: Mm;
  silhouette: readonly { station: number; w: number }[];
}

const STROKE = { vectorEffect: "non-scaling-stroke" as const, strokeWidth: 1, strokeLinejoin: "round" as const };

function line([a, b]: [ArtPoint, ArtPoint]) {
  return { x1: a.x, y1: a.y, x2: b.x, y2: b.y };
}

/**
 * A blank's drawing (D-03, D-14), `aria-hidden`: the outline (foam shade, ink edge), the stringer
 * (`16 4 4 4`), the centre mark (`5 4`), the printed width dots, the board dashed on it when given
 * (`[data-board-ghost]`, board fill, `4 3`), the side view (foam shade, ink edge) and the flat
 * surface under it. The thumbnail (`thumb`) draws only the outline and the side view.
 */
export function BlankArt({ art, ghost, thumb = false }: { art: BlankCardArt; ghost?: readonly ArtPoint[] | null; thumb?: boolean }) {
  const { box } = art;
  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${box.width} ${box.height}`}
      className="block h-auto w-full"
      data-blank-art
    >
      <path d={polylinePath(art.outline, true)} fill="var(--outline-foam-shade)" stroke="var(--outline-ink)" {...STROKE} />
      {!thumb && (
        <>
          <line {...line(art.stringer)} stroke="var(--outline-station-line)" strokeDasharray="16 4 4 4" {...STROKE} />
          <line {...line(art.centreMark)} stroke="var(--outline-station-line)" strokeDasharray="5 4" {...STROKE} />
          {art.widthDots.map((dot, i) => (
            <circle key={i} cx={dot.x} cy={dot.y} r={1.5} fill="var(--outline-blank-line)" />
          ))}
          {ghost && ghost.length > 0 && (
            <path
              data-board-ghost
              d={polylinePath(ghost, true)}
              fill="var(--outline-board-fill)"
              stroke="var(--outline-ink)"
              strokeDasharray="4 3"
              {...STROKE}
            />
          )}
        </>
      )}
      <path d={polylinePath(art.side, true)} fill="var(--outline-foam-shade)" stroke="var(--outline-ink)" {...STROKE} />
      {!thumb && <line {...line(art.baseline)} stroke="var(--surf-line-faint)" {...STROKE} />}
    </svg>
  );
}

/** The BLANK button's small flat drawing of the board's own blank (D-01): outline over rocker. */
export function BlankThumbnail({ prepared }: { prepared: PreparedBlank }) {
  const art = cachedCardArt(prepared, "flat", THUMB_BOX);
  return (
    <span aria-hidden className="block w-[92px] shrink-0">
      <BlankArt art={art} thumb />
    </span>
  );
}

/** The printed station table under a flat card's drawing (D-09), the sketch's `.st` rules. */
function StationTable({ record, system }: { record: BlankRecord; system: UnitsSystem }) {
  const table = stationTable(record, system);
  return (
    <table data-station-table className="w-full border-collapse text-[10.5px] text-surf-ink-muted tabular-nums">
      <thead>
        <tr>
          <td className="border-b border-surf-line-faint" />
          {table.headers.map((header) => (
            <th
              key={header}
              scope="col"
              className="border-b border-surf-line-faint px-0.5 py-px text-center text-[9px] font-extrabold tracking-[0.08em] whitespace-nowrap uppercase"
            >
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {table.rows.map((row) => (
          <tr key={row.label}>
            <th
              scope="row"
              className="py-px pr-0.5 text-left text-[9px] font-extrabold tracking-[0.08em] whitespace-nowrap uppercase"
            >
              {row.label}
            </th>
            {row.cells.map((cell, i) => (
              <td key={i} className="px-0.5 py-px text-center whitespace-nowrap">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export interface BlankCardProps {
  verdict: BlankVerdict;
  /** The catalogue's own record — what `pickBlank` stores, and what the card's words read. */
  record: BlankRecord;
  group: "fits" | "wontFit";
  /** Why the blank won't fit (`blankReason`), null for a blank that fits. */
  reason: string | null;
  /** Is this the board's own blank? */
  onBoard: boolean;
  /** The shaper's board, dashed on the blank (D-04) — null draws the blank alone. */
  board: CardBoard | null;
  locked: boolean;
  system: UnitsSystem;
  onPick: () => void;
}

/** One blank's flat card (D-09). */
export function BlankCard({ verdict, record, group, reason, onBoard, board, locked, system, onPick }: BlankCardProps) {
  const { prepared, placement } = verdict;
  const greyed = reason !== null;
  const art = cachedCardArt(prepared, "flat", FLAT_CARD_BOX);
  const ghost = useMemo(() => (board ? boardOnBlankArt(art, board, placement) : null), [art, board, placement]);
  const accessibleName = `Use ${record.vendor} ${record.name}${greyed ? `, doesn't fit: ${reason}` : ""}`;
  return (
    <li
      data-blank-card
      data-group={group}
      data-vendor={record.vendor}
      data-name={record.name}
      data-length-mm={prepared.lengthMm}
      data-nose-rocker-mm={blankTipRockers(prepared).nose}
      className={cn(
        "relative flex flex-col gap-1.5 rounded-[10px] border border-surf-line bg-surf-panel p-2.5",
        "has-[>button:enabled:hover]:border-surf-ink-muted",
        onBoard && "border-surf-accent-ink bg-surf-well",
      )}
    >
      <div className={cn("flex min-w-0 flex-col gap-1.5", locked && "opacity-60")}>
        <div className="flex items-baseline gap-2">
          <span
            data-blank-name
            className={cn(
              "min-w-0 flex-1 text-[15px] leading-tight",
              greyed ? "font-semibold text-surf-ink-muted" : "font-bold text-surf-ink",
            )}
          >
            {record.name}
          </span>
          <span data-blank-figures className="shrink-0 text-xs whitespace-nowrap text-surf-ink-muted tabular-nums">
            {cardFigures(record, system)}
          </span>
        </div>
        <div className="-mt-1 text-[11px] font-bold tracking-[0.08em] text-surf-ink-muted uppercase">{record.vendor}</div>
        {onBoard && (
          <div
            data-on-board
            className="text-[10px] font-extrabold tracking-architectural text-surf-accent-ink uppercase"
          >
            On your board now
          </div>
        )}
        <div className="flex aspect-[320/103] items-center">
          <BlankArt art={art} ghost={ghost} />
        </div>
        <StationTable record={record} system={system} />
        {greyed && (
          <div data-blank-reason className="text-xs leading-snug text-surf-warning-ink">
            {reason}
          </div>
        )}
      </div>
      <button
        type="button"
        aria-label={accessibleName}
        disabled={locked}
        onClick={onPick}
        className="focus-ring-accent absolute inset-0 cursor-pointer rounded-[10px] disabled:cursor-default"
      />
    </li>
  );
}
