"use client";

/**
 * One card in `BoardRack` (D-12), in either of two variants sharing the identical card shell,
 * window frame and thumbnail treatment `preset-card.tsx` established — a shaper should recognise
 * a card as one of their boards on sight, not as a different kind of object depending on which
 * variant it is:
 *
 * - `"saved"` (the default): a stored row. Its thumbnail is a live `OutlineViewer` fed by the
 *   snapshot's own outline, never a cached or pre-rendered image, so the picture and the board it
 *   opens can never disagree (this plan's prohibition).
 * - `"in-progress"`: the one unsaved board a shaper is part-way through (D-07). Its thumbnail
 *   reads the live design store instead of a stored snapshot — there is no row to read yet — and
 *   it carries the "In progress — not saved" tag. That tag is informational, never the warning
 *   color: it is telling a shaper where their board is, not that something has gone wrong.
 *
 * Every dimension and the litres figure on either variant is formatted through
 * `lib/geometry/units.ts` — never converted inline — and the board name always truncates via CSS
 * (`block truncate`), never a code-level slice, so a long multi-byte or emoji name can never be
 * split mid-grapheme.
 *
 * The saved variant also carries the D-13 Rename/Duplicate/Delete menu (`RackCardMenu`). Because
 * the card itself is a whole-card `<button>`, the menu's trigger cannot be nested inside it —
 * nested interactive elements are invalid, and a click on the trigger would bubble up and fire
 * the card's own navigation. Instead the button and the menu are DOM siblings inside a relatively
 * positioned wrapper, with the trigger absolutely positioned over the card's corner — visually on
 * top, but never a descendant the button's click handler could catch.
 */

import { useDesign } from "@/components/design/design-store";
import { OutlineViewer } from "@/components/outline/outline-viewer";
import { RackCardMenu } from "@/components/setup/rack-card-menu";
import { buildOutline } from "@/lib/geometry/outline";
import { summarizeDesign, type DesignSummary } from "@/lib/geometry/design";
import { formatFeetInches, formatInchesFraction } from "@/lib/geometry/units";
import type { OutlineGeometry } from "@/lib/geometry/outline";
import type { OutlineSpec } from "@/lib/geometry/board";
import type { DesignSnapshotFields } from "@/lib/models/design-snapshot";
import { cn } from "@/lib/utils";

export interface SavedModel {
  id: string;
  name: string;
  snapshot: DesignSnapshotFields;
  updatedAt: Date;
}

interface SavedBoardRackCardProps {
  variant?: "saved";
  model: SavedModel;
  onSelect: (model: SavedModel) => void;
  className?: string;
  /** Wired to real Rename/Duplicate/Delete behavior by `board-rack.tsx` (which owns the dialog
   * state, following the same lifted-state convention `setup-screen.tsx` uses for the
   * replace-board confirm). Optional and no-op by default so a caller not yet passing them
   * (e.g. during incremental development of this menu) still renders a working, if inert, menu. */
  onRename?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
}

interface InProgressBoardRackCardProps {
  variant: "in-progress";
  /** Navigates to `/design/outline` without touching board state — the board is already in the
   * shaper's hands, so there is nothing to apply. */
  onSelect: () => void;
  className?: string;
}

type BoardRackCardProps = SavedBoardRackCardProps | InProgressBoardRackCardProps;

const CARD_SHELL_CLASS =
  "flex w-full flex-col gap-2 rounded-xl border border-transparent bg-surf-canvas p-3 text-left outline-none transition-colors hover:border-surf-accent-ink hover:ring-2 hover:ring-surf-accent-ink focus-visible:border-surf-accent-ink focus-visible:ring-2 focus-visible:ring-surf-accent-ink";

function formatLastTouched(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function CardThumbnail({ geometry, outline }: { geometry: OutlineGeometry; outline: OutlineSpec }) {
  return (
    <div className="rounded-lg border border-surf-line bg-surf-tab-active p-3">
      <div className="relative aspect-[340/620] w-full overflow-hidden rounded-lg border border-surf-line-faint bg-surf-panel">
        <OutlineViewer geometry={geometry} outline={outline} showConstruction={false} hideCallouts />
      </div>
    </div>
  );
}

function CardMetadataLine({ summary }: { summary: DesignSummary }) {
  return (
    <span className="text-xs leading-[1.4] font-semibold text-surf-ink-muted">
      {formatFeetInches(summary.length)} · {formatInchesFraction(summary.widePointWidth)} ·{" "}
      {formatInchesFraction(summary.centerThickness)} · {summary.volumeLitres.toFixed(1)} L
    </span>
  );
}

export function BoardRackCard(props: BoardRackCardProps) {
  // Called unconditionally regardless of variant (React's rules of hooks) — only the
  // "in-progress" branch below reads from it, since a "saved" card's numbers come from its own
  // stored snapshot instead.
  const design = useDesign();

  if (props.variant === "in-progress") {
    const { onSelect, className } = props;
    const { outline, rails, volume, boardName } = design;
    const geometry = buildOutline(outline);
    const summary = summarizeDesign({ outline, rails, volume });
    const displayName = boardName.trim().length > 0 ? boardName : "Untitled Board";

    return (
      <button type="button" onClick={onSelect} className={cn(CARD_SHELL_CLASS, className)}>
        <CardThumbnail geometry={geometry} outline={outline} />
        <span className="text-xs leading-[1.4] font-bold tracking-architectural text-surf-ink-muted uppercase">
          In progress — not saved
        </span>
        <span className="block truncate text-[20px] leading-[1.2] font-semibold text-foreground">
          {displayName}
        </span>
        <CardMetadataLine summary={summary} />
        <span className="text-xs leading-[1.4] font-semibold tracking-architectural text-surf-accent-ink uppercase">
          Continue This Board
        </span>
      </button>
    );
  }

  const {
    model,
    onSelect,
    className,
    onRename = () => {},
    onDuplicate = () => {},
    onDelete = () => {},
  } = props;
  const geometry = buildOutline(model.snapshot.outline);
  const summary = summarizeDesign(model.snapshot);
  const lastTouched = formatLastTouched(model.updatedAt);

  return (
    <div className={cn("relative", className)}>
      <button type="button" onClick={() => onSelect(model)} className={CARD_SHELL_CLASS}>
        <CardThumbnail geometry={geometry} outline={model.snapshot.outline} />
        <span className="block truncate text-[20px] leading-[1.2] font-semibold text-foreground">
          {model.name}
        </span>
        <CardMetadataLine summary={summary} />
        <span className="text-xs leading-[1.4] text-surf-ink-muted">Last touched {lastTouched}</span>
        <span className="text-xs leading-[1.4] font-semibold tracking-architectural text-surf-accent-ink uppercase">
          Open This Board
        </span>
      </button>
      <RackCardMenu
        boardName={model.name}
        onRename={onRename}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
        className="absolute top-2 right-2 z-10"
      />
    </div>
  );
}
