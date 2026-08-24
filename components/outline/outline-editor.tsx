"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useDesign } from "@/components/design/design-store";
import type { OutlineSpec } from "@/lib/geometry/board";
import { mmToInches } from "@/lib/geometry/units";
import { OutlineControls } from "./outline-controls";
import { OutlineViewer } from "./outline-viewer";

/**
 * Reads the design state from the shared `DesignProvider` (components/design/design-store.tsx)
 * instead of owning it locally — this screen is one of four views onto a single board design.
 * `showConstruction` stays local: it's a view preference, not design data. Everything from the
 * store is millimetres; inches exist only inside the controls/viewer where a label or slider
 * value is rendered.
 *
 * Development-only: below `OutlineControls` this file also renders a "Copy preset values" button,
 * gated on `process.env.NODE_ENV === "development"` so the bundler dead-code-eliminates it from
 * production. It reads the live `outline` back out as pasteable `lib/geometry/presets.ts` source —
 * this is how a `BoardPreset` gets shaper-tuned in the real editor (CONTEXT.md D-03) rather than
 * hand-guessed.
 */

/** Rounds a millimetre value to inches, 3 decimal places, matching the precision the capture affordance emits. */
function roundedInches(value: OutlineSpec["length"]): number {
  return Number(mmToInches(value).toFixed(3));
}

/** Builds a pasteable `BoardPreset["outline"]` source block from the live outline spec. */
function buildPresetSource(spec: OutlineSpec): string {
  const tailFields: string[] = [`kind: "${spec.tail.kind}"`];
  if (spec.tail.kind === "squash" || spec.tail.kind === "diamond" || spec.tail.kind === "swallow") {
    tailFields.push(`endWidth: inchesToMm(${roundedInches(spec.tail.endWidth)})`);
  }
  if (spec.tail.kind === "diamond") {
    tailFields.push(`depth: inchesToMm(${roundedInches(spec.tail.depth)})`);
  }
  if (spec.tail.kind === "swallow") {
    tailFields.push(`crotchDepth: inchesToMm(${roundedInches(spec.tail.crotchDepth)})`);
  }

  return [
    "outline: {",
    `  length: inchesToMm(${roundedInches(spec.length)}),`,
    `  widePointWidth: inchesToMm(${roundedInches(spec.widePointWidth)}),`,
    `  widePointOffset: inchesToMm(${roundedInches(spec.widePointOffset)}),`,
    `  tailRailLength: ${spec.tailRailLength},`,
    `  noseRailLength: ${spec.noseRailLength},`,
    `  noseAngle: degrees(${spec.noseAngle}),`,
    `  noseFullness: ${spec.noseFullness},`,
    `  tailAngle: degrees(${spec.tailAngle}),`,
    `  tailFullness: ${spec.tailFullness},`,
    `  tail: { ${tailFields.join(", ")} },`,
    "},",
  ].join("\n");
}

export function OutlineEditor() {
  const { outline, updateOutline, outlineGeometry, finPlacement } = useDesign();
  const [showConstruction, setShowConstruction] = useState(false);
  const [justCopiedPreset, setJustCopiedPreset] = useState(false);

  function handleCopyPreset() {
    const text = buildPresetSource(outline);
    console.log(text);
    setJustCopiedPreset(true);
    navigator.clipboard.writeText(text).catch(() => {
      // Clipboard write rejected (unavailable or permission denied) — the console.log above already
      // carries the same text, so this is a silent no-op rather than a thrown error.
    });
    window.setTimeout(() => setJustCopiedPreset(false), 1500);
  }

  return (
    <div className="flex min-h-0 w-full flex-1 flex-nowrap">
      {/* A flex column, not one scrolling box: the controls scroll in the region below and the dev
          preset button sits in a footer that does not. As a plain last child of a scrolling aside it
          was only ever pinned by luck — outline and rails happened to fit, so it looked right there,
          while the longer fins controls pushed it past the bottom edge where it could only be met
          mid-scroll. */}
      <aside className="flex h-full min-h-0 w-full max-w-[400px] flex-1 basis-[340px] flex-col border-r border-surf-muted/20 bg-surf-base text-surf-black">
        <div className="min-h-0 flex-1 overflow-y-auto p-10">
          <OutlineControls
            outline={outline}
            geometry={outlineGeometry}
            onChange={updateOutline}
            showConstruction={showConstruction}
            onToggleConstruction={() => setShowConstruction((v) => !v)}
          />
        </div>
        {process.env.NODE_ENV === "development" && (
          <div className="flex-none border-t border-surf-muted/20 p-4">
            <Button
              variant="ghost"
              size="sm"
              className="w-full border border-outline-sidebar-divider bg-outline-sidebar-input-bg text-outline-sidebar-text hover:border-surf-accent-cyan hover:bg-surf-accent-cyan hover:text-surf-on-accent"
              onClick={handleCopyPreset}
            >
              {justCopiedPreset ? "Copied!" : "Copy preset values"}
            </Button>
          </div>
        )}
      </aside>
      <main className="flex h-full min-h-0 min-w-0 flex-1 basis-[480px] flex-col gap-3 bg-surf-base px-10 py-5">
        <div className="flex min-h-0 flex-1 items-stretch justify-center gap-6">
          <div className="flex min-h-0 max-h-full min-w-[340px] flex-1 flex-col items-center bg-surf-base">
            <div className="relative flex min-h-0 w-full flex-1 justify-center">
              {/* A plain filled box — the drawing sizes itself inside it via preserveAspectRatio.
                  No aspect-ratio wrapper: the viewBox widens for wide boards, so any ratio pinned
                  here would fight it, and a card that demands a height from its own contents is
                  what broke the print sheet (see OutlineViewer's svg). Tried deriving the ratio
                  from `outlineViewMetrics` to kill the side letterboxing; as a flex item it
                  resolved its width from the wrong basis and collapsed the drawing to 0.41 scale.
                  The centred letterbox is the better trade. */}
              <div className="relative h-full min-h-0 w-full min-w-0">
                <OutlineViewer
                  geometry={outlineGeometry}
                  outline={outline}
                  showConstruction={showConstruction}
                  onOutlineDrag={updateOutline}
                  finMarks={finPlacement.marks}
                  hideFinMarks
                  pinCalloutText
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
