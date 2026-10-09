"use client";

/**
 * The board's name at the right end of the tab band above the drawing (quick 261008-raw — the
 * founder, 2026-10-08: "we need to know what board we're on"). TEMPLATE, ROCKER, RAILS, VOLUME and
 * FINS each pass this to their tab strip; SUMMARY does not, because its order form already shows and
 * edits the name.
 *
 * What a shaper sees: the name in small semibold muted type, right-aligned on the same line as the
 * VIEWER / DATA tabs, on a computer, an upright phone and a phone held sideways. A name that does not
 * fit ends in "…" (the full name is the tooltip on a computer); it never wraps and never pushes a tab
 * off screen. A locked board shows the Board Rack's small muted padlock after its name. Pressing the
 * name opens a small popup with the name and a Save button: on a saved board that renames it, exactly
 * as the Board Rack's Rename does (locked boards too — the lock protects the design, never the name).
 *
 * Why it looks the way it does (planner's choices P-1 to P-8, recorded in the quick task's plan):
 * - P-1 muted 12px semibold sentence case, full ink and an underline on a computer's hover, no pencil
 *   icon (it would cost 16 dots of a phone's tightest strip).
 * - P-2 the button's box is a tab's box without its bottom border — the tabs' own vertical padding and
 *   text line — so it can never be taller than the active tab and the band's height cannot change.
 * - P-4 on a touch screen the tap area is the tabs' exact 44-dot box where the strip has clearance for
 *   it (ROCKER, RAILS, FINS), and a smaller one reaching 2 dots past the band where it has none
 *   (TEMPLATE and VOLUME: the menu button sits right above and the drawing's own buttons right below).
 * - P-8 `data-lock-exempt`: renaming never changes the design, so the board lock's browser sweeps
 *   treat this as view-side.
 */

import { useState } from "react";
import { LockIcon } from "lucide-react";
import { renameModel } from "@/app/design/actions";
import { BOARD_LOCK_COPY } from "@/components/design/board-lock-copy";
import { bandBoardName, boardNameButtonLabel } from "@/components/design/board-name-copy";
import { useDesign } from "@/components/design/design-store";
import { RenameDialog } from "@/components/setup/rename-dialog";
import { cn } from "@/lib/utils";

/** The tabs' own touch box (same string as `tabbed-panel.tsx`): 44 dots tall, centred on the band. */
const TAB_TOUCH_BOX =
  "coarse:relative coarse:after:absolute coarse:after:inset-x-0 coarse:after:top-1/2 coarse:after:h-11 coarse:after:-translate-y-1/2 coarse:after:z-10 coarse:after:content-['']";

/** The smaller box where the strip has no clearance: 2 dots past the band's top and bottom edges. */
const SHORT_TOUCH_BOX =
  "coarse:relative coarse:after:absolute coarse:after:inset-x-0 coarse:after:-inset-y-0.5 coarse:after:z-10 coarse:after:content-['']";

export function BoardNameTab({ touchClearance }: { touchClearance: boolean }) {
  const { boardName, modelId, locked, noteRenamed, setBoardName } = useDesign();
  const [renameOpen, setRenameOpen] = useState(false);

  const saved = modelId !== null;
  const shown = bandBoardName(modelId, boardName);

  // The Board Rack's own rename branch (components/setup/board-rack.tsx, handleRenameConfirm): the
  // board is open in the editor right now, so the store still holds its old name and the next
  // autosave would write that stale name straight back over the rename just confirmed. A locked
  // board refuses design changes in the store, so its name is kept in step without one.
  const handleRename = async (name: string) => {
    if (modelId === null) return;
    await renameModel(modelId, name);
    if (locked) noteRenamed(name);
    else setBoardName(name);
  };

  return (
    <>
      <button
        type="button"
        data-lock-exempt
        data-board-name-band
        aria-label={boardNameButtonLabel(shown, { saved, locked })}
        title={shown}
        onClick={() => setRenameOpen(true)}
        className={cn(
          "flex min-w-0 cursor-pointer items-center gap-1 rounded-t-lg border border-b-0 border-transparent px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-surf-ink-muted",
          "hover:text-surf-ink hover:underline focus-ring-accent",
          // P-2: a computer's name text ends 12 dots in; under both phone rules (width, then height) the
          // same slim 22-dot band the tabs draw and a 6-dot side pad.
          "max-shell:px-1.5 max-shell:py-0.5 [@media(max-height:500px)]:px-1.5 [@media(max-height:500px)]:py-0.5",
          touchClearance ? TAB_TOUCH_BOX : SHORT_TOUCH_BOX,
        )}
      >
        <span className="min-w-0 truncate">{shown}</span>
        {locked && (
          <span
            data-board-name-padlock
            role="img"
            aria-label={BOARD_LOCK_COPY.padlock}
            title={BOARD_LOCK_COPY.padlock}
            className="shrink-0 text-surf-ink-muted"
          >
            <LockIcon aria-hidden className="size-3" />
          </span>
        )}
      </button>
      <RenameDialog open={renameOpen} onOpenChange={setRenameOpen} currentName={boardName} onRename={handleRename} />
    </>
  );
}
