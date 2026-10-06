"use client";

/**
 * The caption under the Board Rack's turned board (Phase 15, UI-SPEC §4): the board's name, its
 * card line, when it was last touched, Open This Board and the ⋯ menu (Rename, Duplicate, Delete —
 * and, on the computer's rack, Move left / Move right above them, 15-11).
 * The unsaved board's caption is the tag `In progress — not saved`, its name, its card line and
 * Continue This Board, with no date and no ⋯ — as today's in-progress card. That tag is information,
 * never the warning colour: it tells a shaper where their board is, not that something is wrong.
 *
 * The caption reuses the old card's text styles exactly, and its Open This Board is a real button,
 * a sibling of the rack's board buttons and of the ⋯ trigger — never nested in another control, so
 * a click on one can never fire another. The name truncates in CSS, never by a code-level slice, so
 * a long or emoji name is never split mid-letter; screen readers get the whole name from the
 * caption's group name and the ⋯ trigger's own name.
 *
 * Two shapes: `hover` (a computer, 272 wide under the turned board) and `swipe` (a phone, the full
 * width under the floor, used from 15-07).
 */

import { CardMetadataLine } from "@/components/setup/card-metadata-line";
import { RackCardMenu, type RackCardMoves } from "@/components/setup/rack-card-menu";
import { RACK_COPY, movesOffered } from "@/components/setup/rack-config";
import type { RackBoard } from "@/components/setup/use-rack-boards";
import { cn } from "@/lib/utils";

interface RackCaptionProps {
  board: RackBoard;
  variant: "hover" | "swipe";
  /** Opens the board: `SetupScreen.handleSelectModel` for a saved board, `goToEditor` for the
   * unsaved one — exactly as the old cards did. */
  onOpen: () => void;
  onRename?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  /** Set after a Duplicate fails: shown under Open This Board until it is tried again (choosing
   * Duplicate again is the retry) or the page reloads. */
  duplicateError?: string | null;
  /** While a finger carries a board on the swipe rack (15-09): that board's name. The caption block,
   * at its same height, then reads `Moving {name}. Let go where you want it.` and returns to the
   * caption on the drop. */
  carrying?: string | null;
  /** Move left / Move right for the ⋯ menu (15-11) — shown only where `movesOffered` says so: always
   * on the computer's rack, on a phone's only with D-11's switch on (D-12). */
  moves?: RackCardMoves;
  /** The ⋯ menu opened or closed (the rack holds still while it is open). */
  onMenuOpenChange?: (open: boolean) => void;
}

export function RackCaption({
  board,
  variant,
  onOpen,
  onRename = () => {},
  onDuplicate = () => {},
  onDelete = () => {},
  duplicateError = null,
  carrying = null,
  moves,
  onMenuOpenChange,
}: RackCaptionProps) {
  const saved = board.kind === "saved" && board.model !== null;
  const menuMoves = movesOffered(variant === "hover" ? "hover" : "swipe") ? moves : undefined;

  if (variant === "swipe" && carrying !== null) {
    return (
      <p data-rack-carrying className="w-full px-4 pt-2 text-xs leading-[1.4] font-normal text-surf-ink-muted">
        {RACK_COPY.carryingPrefix}
        <span className="font-semibold text-surf-ink">{carrying}</span>
        {RACK_COPY.carryingSuffix}
      </p>
    );
  }

  return (
    <div
      role="group"
      aria-label={RACK_COPY.captionGroup(board.name)}
      data-rack-caption={board.key}
      className={cn("flex flex-col text-left", variant === "hover" ? "w-68" : "w-full px-4 pt-2")}
    >
      {!saved && (
        <span className="mb-1 text-xs leading-[1.4] font-bold tracking-architectural text-surf-ink-muted uppercase">
          {RACK_COPY.unsavedTag}
        </span>
      )}
      <div className="flex min-w-0 items-center gap-2">
        <span className="block min-w-0 flex-1 truncate text-[20px] leading-[1.2] font-semibold text-foreground">
          {board.name}
        </span>
        {saved && (
          <RackCardMenu
            boardName={board.name}
            onRename={onRename}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
            moves={menuMoves}
            onOpenChange={onMenuOpenChange}
          />
        )}
      </div>
      <span className="mt-1 block">
        <CardMetadataLine summary={board.summary} />
      </span>
      {saved && board.model && (
        <span className="mt-1 text-xs leading-[1.4] text-surf-ink-muted">
          {RACK_COPY.lastTouched(board.model.updatedAt)}
        </span>
      )}
      <button
        type="button"
        onClick={onOpen}
        className="focus-ring-accent mt-2 cursor-pointer self-start rounded-sm text-left text-xs leading-[1.4] font-semibold tracking-architectural text-surf-accent-ink uppercase coarse:min-h-11"
      >
        {saved ? RACK_COPY.open : RACK_COPY.continueBoard}
      </button>
      {duplicateError && <p className="mt-1 text-xs leading-[1.4] text-surf-warning-ink">{duplicateError}</p>}
    </div>
  );
}
