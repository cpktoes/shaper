"use client";

import { useState } from "react";
import { useDesign } from "@/components/design/design-store";
import { OutlineControls } from "./outline-controls";
import { OutlineViewer } from "./outline-viewer";

/**
 * Reads the design state from the shared `DesignProvider` (components/design/design-store.tsx)
 * instead of owning it locally — this screen is one of four views onto a single board design.
 * `showConstruction` stays local: it's a view preference, not design data. Everything from the
 * store is millimetres; inches exist only inside the controls/viewer where a label or slider
 * value is rendered.
 */
export function OutlineEditor() {
  const { outline, updateOutline, outlineGeometry, finPlacement } = useDesign();
  const [showConstruction, setShowConstruction] = useState(false);

  return (
    <div className="flex min-h-0 w-full flex-1 flex-nowrap">
      <aside className="h-full min-h-0 w-full max-w-[400px] flex-1 basis-[340px] overflow-y-auto bg-outline-sidebar-bg p-6 text-outline-sidebar-text">
        <OutlineControls
          outline={outline}
          geometry={outlineGeometry}
          onChange={updateOutline}
          showConstruction={showConstruction}
          onToggleConstruction={() => setShowConstruction((v) => !v)}
        />
      </aside>
      <main className="flex h-full min-h-0 min-w-0 flex-1 basis-[480px] flex-col gap-5 bg-outline-page-bg p-2">
        <div className="flex min-h-0 flex-1 items-stretch justify-center gap-6">
          <div className="flex min-h-0 max-h-full min-w-[340px] flex-1 flex-col items-center rounded-xl border border-[#e4ddc9] bg-white p-5">
            <div className="mb-3 self-start text-xl font-extrabold text-outline-ink">
              Template Viewer
            </div>
            <div className="relative flex min-h-0 w-full flex-1 justify-center">
              <div className="relative aspect-[340/620] h-full min-h-0 min-w-0 max-w-full">
                <OutlineViewer
                  geometry={outlineGeometry}
                  outline={outline}
                  showConstruction={showConstruction}
                  finMarks={finPlacement.marks}
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
