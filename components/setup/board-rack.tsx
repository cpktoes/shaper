"use client";

/**
 * D-06's saved-boards section — rendered ABOVE the preset grid on `/` for a signed-in shaper with
 * an in-progress board and/or saved boards. Takes an already-ordered list of entries (the caller
 * — `setup-screen.tsx` — runs `sortRackEntries` before handing them here; this component is a
 * pure renderer, not a second place that decides order) and renders one card per entry in the
 * same wrap the preset grid uses (UI-SPEC board-rack "overflow"): many boards wrap to more rows,
 * never scroll or clip.
 *
 * Renders nothing at all when it has no entries to show (UI-SPEC board-rack "empty": there is no
 * empty-rack state to design, because the rack simply doesn't render). That same `null` return is
 * also what a slow-loading query degrades into: `app/page.tsx` streams this whole section behind
 * a Suspense boundary whose fallback is an empty entry list, so a slow board-list read shows the
 * plain preset screen for a moment rather than a spinner (UI-SPEC board-rack "loading").
 */

import { BoardRackCard, type SavedModel } from "@/components/setup/board-rack-card";

export type BoardRackEntry = { kind: "in-progress" } | { kind: "saved"; model: SavedModel };

interface BoardRackProps {
  entries: BoardRackEntry[];
  onSelectModel: (model: SavedModel) => void;
  onContinue: () => void;
}

export function BoardRack({ entries, onSelectModel, onContinue }: BoardRackProps) {
  if (entries.length === 0) return null;

  return (
    <div className="mb-12">
      <h2 className="text-xl leading-[1.2] font-display text-surf-ink uppercase tracking-architectural font-bold">
        Your Boards
      </h2>
      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {entries.map((entry) =>
          entry.kind === "in-progress" ? (
            <BoardRackCard key="in-progress" variant="in-progress" onSelect={onContinue} />
          ) : (
            <BoardRackCard key={entry.model.id} model={entry.model} onSelect={onSelectModel} />
          ),
        )}
      </div>
    </div>
  );
}
