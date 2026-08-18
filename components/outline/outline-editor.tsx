"use client";

import { useMemo, useState } from "react";
import { DEFAULT_BOARD_SPEC, type BoardSpec, type OutlineSpec } from "@/lib/geometry/board";
import { buildOutline } from "@/lib/geometry/outline";
import { OutlineControls } from "./outline-controls";
import { OutlineViewer } from "./outline-viewer";

/**
 * Owns the design state: a single BoardSpec object (rather than a dozen
 * loose fields), so rocker, rails, fins and volume screens can plug in
 * later without reshaping state. Everything here is millimetres; inches
 * exist only inside the controls/viewer where a label or slider value is
 * rendered.
 */
export function OutlineEditor() {
  const [board, setBoard] = useState<BoardSpec>(DEFAULT_BOARD_SPEC);
  const [showConstruction, setShowConstruction] = useState(false);

  const geometry = useMemo(() => buildOutline(board.outline), [board.outline]);

  const updateOutline = (patch: Partial<OutlineSpec>) => {
    setBoard((prev) => ({ outline: { ...prev.outline, ...patch } }));
  };

  return (
    <div className="flex min-h-0 w-full flex-1 flex-wrap">
      <aside className="min-h-0 w-full max-w-[400px] flex-1 basis-[340px] overflow-y-auto bg-outline-sidebar-bg p-6 text-outline-sidebar-text">
        <OutlineControls
          outline={board.outline}
          geometry={geometry}
          onChange={updateOutline}
          showConstruction={showConstruction}
          onToggleConstruction={() => setShowConstruction((v) => !v)}
        />
      </aside>
      <main className="flex min-w-0 flex-1 basis-[480px] flex-col gap-5 bg-outline-page-bg p-2">
        <div className="flex flex-1 items-stretch justify-center gap-6">
          <div className="flex min-h-0 max-h-full min-w-[340px] flex-1 flex-col items-center rounded-xl border border-[#e4ddc9] bg-white p-5">
            <div className="mb-3 self-start text-xl font-extrabold text-outline-ink">
              Template Viewer
            </div>
            <div className="relative flex min-h-0 w-full flex-1 justify-center">
              <div className="relative aspect-[340/620] h-full min-h-0 min-w-0 max-w-full">
                <OutlineViewer
                  geometry={geometry}
                  outline={board.outline}
                  showConstruction={showConstruction}
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
