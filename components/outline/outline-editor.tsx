"use client";

import { useId, useState } from "react";
import { DownloadIcon, PanelLeftCloseIcon, PanelLeftOpenIcon, RulerIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDesign } from "@/components/design/design-store";
import type { ViewerOrientation } from "@/components/viewer/callout-primitives";
import { ExportPreviewDialog } from "@/components/template/export-preview-dialog";
import type { OutlineSpec } from "@/lib/geometry/board";
import { mmToInches } from "@/lib/geometry/units";
import { OutlineControls } from "./outline-controls";
import { TabbedPanel } from "@/components/viewer/tabbed-panel";
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

/**
 * The Template screen's rotate-board glyph, lifted verbatim from
 * `.planning/sketches/006-orientation-switch/index.html`'s `#rotateBtn`.
 *
 * Both orientations shown at once, the way a phone's "rotate screen" icon does it: an upright
 * board, the same board on its side nose-left, and one arrow between them — clearer than a
 * single tilted shape, and per D-05 it is the ONE glyph for both button states (only the
 * `aria-label` changes). One planshape reused twice through `<use>`, at the SAME 0.62 scale, so
 * it reads as one board being turned rather than two boards of different sizes; `strokeWidth` is
 * 2.42 so the drawn weight lands at 1.5 after that shared scale. The gap between the two copies
 * is what keeps it readable small — the sketch's proof sheet found the glyph gets tight below
 * about 16px, which is why the button uses `size-6` (24px): the founder asked for a larger icon,
 * and sketch 006's README already carried this as its one open caveat, recommending a 20-22px
 * icon in a slightly larger button if the sketch ever got built.
 */
function RotateBoardIcon({ className }: { className?: string }) {
  // SVG ids are document-global — a literal id would collide with another element's <use href>
  // if this ever rendered twice on one page. useId gives a per-instance id; React's own id
  // punctuation (colons) is stripped so it stays a valid URL fragment for the href below.
  const glyphId = `shaper-board-glyph-${useId().replace(/[^a-zA-Z0-9-]/g, "")}`;
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <defs>
        <path
          id={glyphId}
          d="M12 3.3C11.0 6.2 9.88 9.5 9.85 12.6 9.82 15.6 10.4 18.2 11.1 20.3a0.95 0.95 0 0 0 1.8 0C13.6 18.2 14.18 15.6 14.15 12.6 14.12 9.5 13.0 6.2 12 3.3Z"
        />
      </defs>
      <g stroke="currentColor" strokeLinejoin="round" fill="none" strokeWidth={2.42}>
        <use href={`#${glyphId}`} transform="translate(17.2,12.5) scale(0.62) translate(-12,-12.3)" />
        <use href={`#${glyphId}`} transform="translate(8.5,17) rotate(-90) scale(0.62) translate(-12,-12.3)" />
      </g>
      <path d="M14.5 6.5A8 8 0 0 0 4.5 11.8" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
      <path d="M4.29 13.89 3.06 11.66 5.94 11.94Z" fill="currentColor" />
    </svg>
  );
}

export function OutlineEditor() {
  const { outline, updateOutline, outlineGeometry, finPlacement } = useDesign();
  const [showConstruction, setShowConstruction] = useState(false);
  const [justCopiedPreset, setJustCopiedPreset] = useState(false);
  /** View state, like `showConstruction` — not design data, and deliberately not a stored
   * preference (D-03), so a reload always comes back vertical. */
  const [orientation, setOrientation] = useState<ViewerOrientation>("vertical");
  /** Wide view hides the `aside` below so `main` gets the full window width. Also local view
   * state, not design data, deliberately not persisted — a reload always comes back with the
   * sidebar showing. `preWideViewConstruction` remembers whatever `showConstruction` was set to
   * before wide view forced it on, so leaving wide view restores it rather than leaving the
   * shaper on a setting they never chose. Both are set together inside the click handler below,
   * not from a render-time effect — this codebase's lint config rejects setting state during
   * render, and doing so caused a real bug in plan 02-05. */
  const [wideView, setWideView] = useState(false);
  const [preWideViewConstruction, setPreWideViewConstruction] = useState(false);

  function handleToggleWideView() {
    if (wideView) {
      setShowConstruction(preWideViewConstruction);
      setWideView(false);
    } else {
      setPreWideViewConstruction(showConstruction);
      setShowConstruction(true);
      setWideView(true);
    }
  }

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
      {/* Hidden entirely, not resized, while wide view is on — the internal structure (scrolling
          controls region + flex-none dev preset footer) stays untouched; a quick task already had
          to fix that footer once because it was only pinned by luck. */}
      {!wideView && (
        <aside className="flex h-full min-h-0 w-full max-w-[400px] flex-1 basis-[340px] flex-col border-r border-surf-line-faint bg-surf-sidebar text-surf-ink">
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
            <div className="flex-none border-t border-surf-line-faint p-4">
              <Button
                variant="ghost"
                size="sm"
                className="w-full border border-outline-sidebar-divider bg-outline-sidebar-input-bg text-outline-sidebar-text hover:border-surf-accent hover:bg-surf-accent hover:text-surf-on-accent"
                onClick={handleCopyPreset}
              >
                {justCopiedPreset ? "Copied!" : "Copy preset values"}
              </Button>
            </div>
          )}
        </aside>
      )}
      <main className="flex h-full min-h-0 min-w-0 flex-1 basis-[480px] flex-col gap-0 bg-surf-canvas p-3">
        {/* One region, so the tab is a label rather than a control — but the screen still gets
            the same panel and edge as Rails and Fins, which is what makes the four read as one
            application instead of four layouts. */}
        <TabbedPanel tabs={[{ id: "viewer" as const, label: "VIEWER" }]} active="viewer">
        {/* `relative` makes this div — the viewer panel's own content area — the positioning
            context for the rotate button below, per D-06: the button sits INSIDE the panel's
            content, absolutely positioned over the drawing, not in a header row beside the
            panel title (the mockup had it there and the founder explicitly corrected this) and
            not inline with the VIEWER tab. `TabbedPanel` itself is untouched. */}
        <div className="relative flex min-h-0 flex-1 items-stretch justify-center gap-6">
          <ExportPreviewDialog
            trigger={
              <button
                type="button"
                aria-label="Export Template"
                title="Export Template"
                // Same treatment as the rotate button beside it (copied verbatim, see its own long
                // comment below for why): bordered `surf-ground` fill, never the accent — this
                // button is also absolutely positioned over the drawing. right-10 sits it
                // immediately left of the rotate button's right-0, so the two read as one
                // icon-button pair. `DialogTrigger` (inside ExportPreviewDialog) sets
                // `aria-expanded`/`aria-haspopup` on this element automatically — the
                // `aria-expanded:` classes below give the open state its own background, the
                // same "dialog-open" treatment an `aria-expanded`-driven toggle already gets
                // elsewhere in this app, never the accent fill (UI spec's accent reservation).
                className="absolute top-0 right-10 z-10 flex cursor-pointer items-center rounded-md border border-surf-line bg-surf-ground p-1 text-surf-ink-muted transition-colors outline-none hover:bg-surf-well hover:text-surf-ink aria-expanded:bg-surf-well aria-expanded:text-surf-ink focus-visible:ring-2 focus-visible:ring-surf-accent-ink"
              >
                <DownloadIcon className="size-6" />
              </button>
            }
          />
          <button
            type="button"
            onClick={() => setOrientation((o) => (o === "vertical" ? "horizontal" : "vertical"))}
            aria-label={
              orientation === "vertical"
                ? "Rotate the board to horizontal"
                : "Rotate the board to vertical"
            }
            title="Rotate the board"
            // SettingsMenu's icon-button treatment (components/settings-menu.tsx) — the app's
            // existing precedent for an icon-only control. Bordered and filled, per the
            // founder's request for a visible boundary. The border is `surf-line`, not
            // `surf-line-faint` — `line` is the token carrying the 3:1 non-text target a control
            // boundary needs in every theme, per the rule written down at
            // components/viewer/tabbed-panel.tsx. The fill is `surf-ground`, the same value as
            // the `surf-panel` surface behind it in all four themes, so it adds no visible plate;
            // it exists to be opaque, because this button is absolutely positioned over the
            // drawing and board lines must not run under the glyph. That fill is deliberately
            // not the accent: anything drawn ON the accent fill must take that fill's paired
            // on- colour, a rule this codebase has been bitten by three times (see
            // .planning/quick/260825-rmb-*/SUMMARY.md) — if the accent is ever used here instead,
            // the icon must take text-surf-on-accent. The button is icon-only, so aria-label is
            // its accessible name, and per D-05 the label is the only thing that ever changes
            // between states.
            // top-0/right-0, not top-3/right-3: the card now supplies the 12px inset via
            // TabbedPanel's default padding, so this div's corner already sits where the old
            // offsets used to land. An absolute child offsets from its containing block's
            // padding box, so re-adding an offset here would double the inset and shift the
            // button — leave these at zero.
            className="absolute top-0 right-0 z-10 flex cursor-pointer items-center rounded-md border border-surf-line bg-surf-ground p-1 text-surf-ink-muted transition-colors outline-none hover:bg-surf-well hover:text-surf-ink focus-visible:ring-2 focus-visible:ring-surf-accent-ink"
          >
            <RotateBoardIcon className="size-6" />
          </button>
          <button
            type="button"
            onClick={() => setShowConstruction((v) => !v)}
            aria-pressed={showConstruction}
            aria-label={showConstruction ? "Hide construction lines" : "Show construction lines"}
            title={showConstruction ? "Hide construction lines" : "Show construction lines"}
            // Same box as the rotate/Export Template buttons beside it — border, radius, padding,
            // focus ring all copied verbatim, per D-05's one-menu/one-button visual language. This
            // is the ONE control in this toolbar the UI spec allows to take the accent fill: when
            // showConstruction is true the button switches to bg-surf-accent border-surf-accent,
            // and per the warning above (the accent-on-accent bug this codebase has been bitten by
            // three times, see .planning/quick/260825-rmb-*/SUMMARY.md) the icon must switch to
            // text-surf-on-accent in that state rather than staying on the muted ink token — hence
            // the icon colour is folded into the same aria-pressed className expression as the fill,
            // not left on a separate always-on class.
            className="absolute top-0 right-20 z-10 flex cursor-pointer items-center rounded-md border border-surf-line bg-surf-ground p-1 text-surf-ink-muted transition-colors outline-none hover:bg-surf-well hover:text-surf-ink aria-pressed:border-surf-accent aria-pressed:bg-surf-accent aria-pressed:text-surf-on-accent aria-pressed:hover:bg-surf-accent focus-visible:ring-2 focus-visible:ring-surf-accent-ink"
          >
            <RulerIcon className="size-6" />
          </button>
          <button
            type="button"
            onClick={handleToggleWideView}
            aria-pressed={wideView}
            aria-label={wideView ? "Show the sidebar" : "Hide the sidebar for a wider view"}
            title={wideView ? "Show the sidebar" : "Wide view"}
            // Same box as the three buttons beside it. This is both the way in and the way out of
            // wide view — it lives inside the viewer panel, which stays on screen in both states,
            // so there is always a visible route back. Never accent-filled: the UI spec reserves
            // that fill for the Construction Lines button alone.
            className="absolute top-0 right-30 z-10 flex cursor-pointer items-center rounded-md border border-surf-line bg-surf-ground p-1 text-surf-ink-muted transition-colors outline-none hover:bg-surf-well hover:text-surf-ink focus-visible:ring-2 focus-visible:ring-surf-accent-ink"
          >
            {wideView ? <PanelLeftOpenIcon className="size-6" /> : <PanelLeftCloseIcon className="size-6" />}
          </button>
          <div className="flex min-h-0 max-h-full min-w-[340px] flex-1 flex-col items-center">
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
                  orientation={orientation}
                />
              </div>
            </div>
          </div>
        </div>
        </TabbedPanel>
      </main>
    </div>
  );
}
