"use client";

/**
 * A saved rack card's Rename / Duplicate / Delete menu (D-13). Built directly on Base UI's
 * `Menu` primitives, the same way `components/settings-menu.tsx` builds the nav's gear menu —
 * same shell, same positioning, same row-hover treatment — rather than adding a second,
 * shadcn-generated `dropdown-menu` pattern to the app (UI-SPEC).
 *
 * The trigger is icon-only, so it carries an accessible name naming the board it belongs to —
 * a screen-reader user opening a menu on a rack full of boards needs to know which one they just
 * opened. `Menu.Item` (not `Menu.RadioItem`) is used for the rows that are one-shot commands. The one
 * exception is the lock row (quick 261008-lsy): a `Menu.CheckboxItem` between Duplicate and Delete,
 * reading "Lock board" and, ticked, "Board Locked" — a toggle, because a board is either locked or not.
 *
 * Phase 15 (the Move rows, D-12): given `moves`, the menu opens with `Move left` and `Move right`
 * above a divider, then today's three rows exactly as they were. A move that can't happen (the first
 * saved board's Move left, the last board's Move right) is dimmed and inert but keeps its place, so
 * the menu never reshuffles. Which racks pass `moves` is `movesOffered`'s decision, in the caption:
 * the computer's rack always, a phone's only with D-11's switch on. `onOpenChange` tells the rack
 * the menu is open, so it holds still underneath.
 */

import { Menu } from "@base-ui/react/menu";
import { LockIcon, MoreVerticalIcon } from "lucide-react";
import { BOARD_LOCK_COPY } from "@/components/design/board-lock-copy";
import { RACK_COPY } from "@/components/setup/rack-config";
import { cn } from "@/lib/utils";

// The minimum-row-height override below is the same idiom volume-controls.tsx, fin-controls.tsx
// and rail-controls.tsx use for a hand-rolled interactive row, so Rename / Duplicate / Delete are
// thumb-sized on a touch pointer without changing their resting appearance to a mouse.
const ROW_CLASS =
  "flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm outline-none select-none coarse:min-h-11 data-highlighted:bg-surf-well";

/** A Move row that can't move: dimmed, no hover wash, the arrow cursor — and inert (Base UI). */
const DISABLED_CLASS = "data-disabled:cursor-default data-disabled:opacity-50";

/** The Move rows (D-12): one place left or right, each disabled when the board is already at that end. */
export interface RackCardMoves {
  canMoveLeft: boolean;
  canMoveRight: boolean;
  onMoveLeft: () => void;
  onMoveRight: () => void;
}

interface RackCardMenuProps {
  /** Named in the trigger's accessible name and used nowhere else — the menu's own callbacks
   * already close over which board they act on. */
  boardName: string;
  onRename: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  /** Whether this board is locked (quick 261008-lsy): the lock row is ticked, and — from the
   * guards task on — Delete is greyed. */
  locked: boolean;
  /** The lock row was chosen: lock the board if it is open to change, unlock it if it is locked. */
  onToggleLock: () => void;
  /** Move left / Move right above a divider (the hover rack; the swipe rack only with D-11 on). */
  moves?: RackCardMoves;
  /** The menu opened or closed. */
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

export function RackCardMenu({
  boardName,
  onRename,
  onDuplicate,
  onDelete,
  locked,
  onToggleLock,
  moves,
  onOpenChange,
  className,
}: RackCardMenuProps) {
  return (
    <Menu.Root onOpenChange={onOpenChange ? (open) => onOpenChange(open) : undefined}>
      {/* Same fixed-square idiom phone-menu.tsx uses for its own icon-only trigger — 28px drawn
          at rest (a 16px icon plus 6px of padding each side) grows to a 44px square on a touch
          pointer, with the icon centred inside it. The trigger is positioned over the card's
          corner by its caller (board-rack-card.tsx), so at 44px it covers more of the card's
          corner on a touch device by design. */}
      <Menu.Trigger
        aria-label={`Board actions for ${boardName}`}
        className={cn(
          "flex cursor-pointer items-center justify-center rounded-md border border-surf-line-faint bg-surf-canvas p-1.5 text-surf-ink-muted transition-colors outline-none coarse:size-11 hover:border-surf-accent-ink hover:text-surf-ink focus-visible:ring-2 focus-visible:ring-surf-accent-ink data-popup-open:text-surf-ink",
          className,
        )}
      >
        <MoreVerticalIcon aria-hidden className="size-4" />
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner side="bottom" align="end" sideOffset={10} className="isolate z-50">
          <Menu.Popup className="min-w-64 origin-(--transform-origin) rounded-lg border border-surf-line-faint bg-surf-panel p-1.5 shadow-lg outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
            {moves && (
              <>
                <Menu.Item
                  disabled={!moves.canMoveLeft}
                  onClick={moves.onMoveLeft}
                  className={cn(ROW_CLASS, DISABLED_CLASS, "text-surf-ink")}
                >
                  {RACK_COPY.moveLeft}
                </Menu.Item>
                <Menu.Item
                  disabled={!moves.canMoveRight}
                  onClick={moves.onMoveRight}
                  className={cn(ROW_CLASS, DISABLED_CLASS, "text-surf-ink")}
                >
                  {RACK_COPY.moveRight}
                </Menu.Item>
                <Menu.Separator className="my-1 h-px bg-surf-line-faint" />
              </>
            )}
            <Menu.Item onClick={onRename} className={cn(ROW_CLASS, "text-surf-ink")}>
              Rename
            </Menu.Item>
            <Menu.Item onClick={onDuplicate} className={cn(ROW_CLASS, "text-surf-ink")}>
              Duplicate
            </Menu.Item>
            <Menu.CheckboxItem
              checked={locked}
              closeOnClick
              onCheckedChange={() => onToggleLock()}
              className={cn(ROW_CLASS, "text-surf-ink")}
            >
              {locked ? BOARD_LOCK_COPY.boardLocked : BOARD_LOCK_COPY.lockBoard}
              {locked && <LockIcon aria-hidden className="ml-auto size-4 text-surf-ink-muted" />}
            </Menu.CheckboxItem>
            {/* The one item that should draw the eye differently (UI-SPEC Visual Focal Points) —
                the only place this color appears on the rack. */}
            <Menu.Item onClick={onDelete} className={cn(ROW_CLASS, "text-surf-warning-ink")}>
              Delete
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
