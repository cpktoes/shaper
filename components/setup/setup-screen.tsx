"use client";

import { useRouter } from "next/navigation";
import { PresetCard } from "@/components/setup/preset-card";
import { useDesign } from "@/components/design/design-store";
import { BOARD_PRESETS, type BoardPreset } from "@/lib/geometry/presets";

/**
 * The setup screen — `/`'s entire content (D-05). Reads `applyPreset` from the shared
 * `DesignProvider` (mounted in app/layout.tsx) exactly like a `/design/*` screen reads its own
 * slice, following the `outline-editor.tsx` client-screen pattern. Layout follows the approved
 * UI-SPEC: shadcn neutral-theme canvas + cards, `outline-accent` amber as the one borrowed
 * accent color, so the setup screen reads as part of the same product as the dark-nav design
 * screens rather than a second visual language.
 */
export function SetupScreen() {
  const { applyPreset } = useDesign();
  const router = useRouter();

  const handleSelect = (preset: BoardPreset) => {
    applyPreset(preset);
    router.push("/design/outline");
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-background">
      <div className="mx-auto max-w-5xl px-6 pt-16 pb-16 md:px-8">
        <h1 className="text-[32px] leading-[1.15] font-semibold text-foreground">Shape a New Board</h1>
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {BOARD_PRESETS.map((preset) => (
            <PresetCard key={preset.id} preset={preset} onSelect={handleSelect} />
          ))}
        </div>
        {/* Phase 2 saved-boards section slots in here, below the preset grid, without a redesign. */}
      </div>
    </div>
  );
}
