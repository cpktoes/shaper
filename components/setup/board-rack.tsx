"use client";

/**
 * D-06's saved-boards section — rendered ABOVE the preset grid on `/` for a signed-in shaper
 * with saved boards. Renders nothing at all when it has no cards to show (UI-SPEC board-rack
 * "empty": there is no empty-rack state to design, because the rack simply doesn't render).
 */

import { BoardRackCard, type SavedModel } from "@/components/setup/board-rack-card";

interface BoardRackProps {
  models: SavedModel[];
  onSelect: (model: SavedModel) => void;
}

export function BoardRack({ models, onSelect }: BoardRackProps) {
  if (models.length === 0) return null;

  return (
    <div className="mb-12">
      <h2 className="text-xl leading-[1.2] font-display text-surf-ink uppercase tracking-architectural font-bold">
        Your Boards
      </h2>
      {/* Same wrap as the preset grid (UI-SPEC board-rack "overflow") — many boards wrap to more
          rows, never scroll or clip. */}
      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {models.map((model) => (
          <BoardRackCard key={model.id} model={model} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}
