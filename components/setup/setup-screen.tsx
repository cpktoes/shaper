"use client";

import { useRouter } from "next/navigation";
import { useDesign } from "@/components/design/design-store";
import { BOARD_PRESETS, type BoardPreset } from "@/lib/geometry/presets";

/**
 * The setup screen — `/`'s entire content (D-05). Reads `applyPreset` from the shared
 * `DesignProvider` (now mounted in app/layout.tsx) exactly like a `/design/*` screen reads its own
 * slice, following the `outline-editor.tsx` client-screen pattern. Deliberately unstyled: this is
 * the tracer's proof-of-path surface, not the UI-SPEC card layout — plan 02 replaces this body.
 */
export function SetupScreen() {
  const { applyPreset } = useDesign();
  const router = useRouter();

  const handleSelect = (preset: BoardPreset) => {
    applyPreset(preset);
    router.push("/design/outline");
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-6">
      <h1 className="text-xl font-bold">Start a new board</h1>
      <div className="flex flex-col gap-2">
        {BOARD_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => handleSelect(preset)}
            className="flex flex-col items-start gap-1 rounded-lg border border-outline-sidebar-divider p-4 text-left"
          >
            <span className="font-bold">{preset.name}</span>
            <span className="text-sm text-outline-sidebar-text-muted">{preset.descriptor}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
