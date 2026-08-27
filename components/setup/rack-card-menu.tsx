"use client";

/**
 * A saved rack card's Rename / Duplicate / Delete menu (D-13). Built directly on Base UI's
 * `Menu` primitives, the same way `components/settings-menu.tsx` builds the nav's gear menu —
 * same shell, same positioning, same row-hover treatment — rather than adding a second,
 * shadcn-generated `dropdown-menu` pattern to the app (UI-SPEC).
 *
 * The trigger is icon-only, so it carries an accessible name naming the board it belongs to —
 * a screen-reader user opening a menu on a rack full of boards needs to know which one they just
 * opened. `Menu.Item` (not `Menu.RadioItem`) is used throughout: these are three one-shot
 * commands, not a toggle group.
 */

import { Menu } from "@base-ui/react/menu";
import { MoreVerticalIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const ROW_CLASS =
  "flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm outline-none select-none data-highlighted:bg-surf-well";

interface RackCardMenuProps {
  /** Named in the trigger's accessible name and used nowhere else — the menu's own callbacks
   * already close over which board they act on. */
  boardName: string;
  onRename: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  className?: string;
}

export function RackCardMenu({ boardName, onRename, onDuplicate, onDelete, className }: RackCardMenuProps) {
  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label={`Board actions for ${boardName}`}
        className={cn(
          "flex cursor-pointer items-center rounded-md border border-surf-line-faint bg-surf-canvas p-1.5 text-surf-ink-muted transition-colors outline-none hover:border-surf-accent-ink hover:text-surf-ink focus-visible:ring-2 focus-visible:ring-surf-accent-ink data-popup-open:text-surf-ink",
          className,
        )}
      >
        <MoreVerticalIcon aria-hidden className="size-4" />
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner side="bottom" align="end" sideOffset={10} className="isolate z-50">
          <Menu.Popup className="min-w-64 origin-(--transform-origin) rounded-lg border border-surf-line-faint bg-surf-panel p-1.5 shadow-lg outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
            <Menu.Item onClick={onRename} className={cn(ROW_CLASS, "text-surf-ink")}>
              Rename
            </Menu.Item>
            <Menu.Item onClick={onDuplicate} className={cn(ROW_CLASS, "text-surf-ink")}>
              Duplicate
            </Menu.Item>
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
