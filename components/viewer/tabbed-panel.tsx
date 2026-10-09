"use client";

/**
 * The folder-tab-and-panel treatment every design screen's working area uses.
 *
 * Said once rather than six times. Four screens need it and two of them (Template, Volume)
 * have only one region to show — copying the markup a fifth and sixth time is exactly how a
 * treatment drifts, which this codebase has already been bitten by (see the `.slider-accent`
 * note in app/globals.css, written after fourteen copies of a slider style).
 *
 * The shape: a strip of tabs sitting ON the canvas, and a bordered panel below that picks up
 * the line the active tab drops. The active tab sets `border-b-0` and the panel is pulled up
 * a pixel, so the two read as one continuous surface — that is the whole point of the
 * treatment, and it is why the panel has to exist. Before it did, the active tab was a
 * floating chip with an open bottom edge.
 *
 * The edge uses `--surf-line`, not `--surf-line-faint`. A panel boundary is structural: it
 * says where the working surface starts. `line-faint` is 1.22:1 against Daylight's canvas —
 * present in the DOM and invisible on screen. `line` is the token that carries the 3:1
 * non-text target, which is what a boundary like this needs to survive every theme rather
 * than only the high-contrast ones.
 *
 * The tab label deliberately carries the app's heading treatment — small, all-caps,
 * architecturally tracked — the same as the menu bar links and the sidebar section headings,
 * so a later editor should not "correct" it back toward body type.
 */

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface PanelTab<T extends string> {
  id: T;
  label: string;
}

export function TabbedPanel<T extends string>({
  tabs,
  active,
  onSelect,
  children,
  panelClassName = "",
  bare = false,
  growOnShortScreen = false,
  compactOnPhone,
  trailing,
}: {
  tabs: readonly PanelTab<T>[];
  active: T;
  /**
   * Omit on a single-tab screen. Without it the tab renders as a plain element rather than a
   * `<button>` — a control that controls nothing is worse than a label, both for a pointer
   * and for anyone arrowing through with a screen reader.
   */
  onSelect?: (id: T) => void;
  children: ReactNode;
  /**
   * Extra classes for the inner content card — layout only; surface and edges are fixed
   * here. The card carries a default 12px inset (`p-3`); classes here merge through `cn`
   * (tailwind-merge), so a caller's own padding deterministically overrides the default
   * rather than depending on Tailwind's stylesheet order.
   */
  panelClassName?: string;
  /**
   * Drops the tab strip and the outer card layer, leaving just the inner content card wrapping
   * `children` directly (WR-02). Exists for a caller that toggles between a tabbed and a
   * chrome-free presentation of the SAME content at the same tree position — Outline's Wide
   * View toggle used to swap between `<TabbedPanel>` and a plain `<div>` there, and because
   * those are different element types React's reconciler tore down and rebuilt the whole
   * subtree (the drawing, its drag state, the toolbar buttons) on every toggle. Rendering
   * `<TabbedPanel bare={wideView}>` instead keeps the SAME component at that position always;
   * the panel div below carries an explicit `key` so its identity survives the tab strip
   * appearing/disappearing beside it, and `children`'s own position relative to that div never
   * changes shape either way — only its surrounding classes do.
   */
  bare?: boolean;
  /**
   * On a short screen (`[@media(max-height:500px)]`, this codebase's own height-alone idiom —
   * CLAUDE.md's Layout section), both card layers grow to their content's own height instead of
   * being pinned to the column's height, so a drawing taller than the screen scrolls as one whole
   * card rather than spilling past two borders. Off by default. RAILS (quick 260914-v2v) is the
   * only screen that asks for it, because it is the only one whose drawing is a stack of plots
   * that can run taller than a sideways phone. A real desktop window is never under 500 dots
   * tall, so this can never reach a mouse; when unset the emitted classes are byte-identical to
   * before this prop existed.
   */
  growOnShortScreen?: boolean;
  /**
   * Phase 13 item 9e (13-SPEC.md, the founder, 2026-09-30: "phone real estate is expensive, we
   * need to save all of it"), quick 260930-s23. Opt-in, like `growOnShortScreen` above — the
   * same idiom, a prop that is undefined by default and, when unset, emits classes byte-identical
   * to before this prop existed. Only the five drawing screens (TEMPLATE, ROCKER, RAILS, VOLUME,
   * FINS) pass it; RAILS's View Full Sized dialog also renders through this component, for its
   * own full-size print, and deliberately does NOT pass it, so its markup and its print stay
   * byte-identical (P-11).
   *
   * Set, it slims the tab strip to 22 dots tall (P-2, `py-0.5` in place of `py-1.5`, the same
   * 12px capitals) and drops the folder card and inner card's own padding to a 2px rim on a phone,
   * recovering the frame a phone's drawing used to waste — see `design-screen-shell.tsx`'s own
   * comment for the sibling rule on the drawing COLUMN around this whole panel. The two values,
   * `"drawing"` and `"text"`, give the IDENTICAL tab strip and the IDENTICAL outer rim — only the
   * INNER card's own padding differs between them (`text` keeps an 8px reading margin, `drawing`
   * has none) — so switching between a screen's VIEWER tab and its DATASHEET/DATA/INSTRUCTIONS/
   * MODEL INFO/ESTIMATE tab never moves the frame itself, only what's drawn inside it (P-4).
   */
  compactOnPhone?: "drawing" | "text";
  /**
   * Quick 261008-raw (the founder, 2026-10-08: "we need to know what board we're on"). Something
   * that sits at the RIGHT end of the tab strip, on the same line as the tabs — the board's name,
   * passed by the five drawing screens (TEMPLATE, ROCKER, RAILS, VOLUME, FINS) and never by RAILS's
   * View Full Sized dialog. Opt-in like `compactOnPhone`: when unset the strip renders exactly the
   * markup it always has (`tabbed-panel.test.ts` holds that against a captured copy).
   *
   * Set, the tabs move into their own row (`flex-none`, so they never shrink or wrap — it is the
   * trailing item that gives way, `min-w-0` letting a long name shorten with "…") and the tab list
   * role moves onto that row, because a tab list may hold only tabs. The render prop is told
   * whether the tabs carry the phone's 44-dot touch box (`touchClearance`), so the trailing item
   * can take the same box where the strip has the 9 dots of clearance for it, and a smaller one
   * where it does not (TEMPLATE and VOLUME, a single read-only label).
   */
  trailing?: (strip: { touchClearance: boolean }) => ReactNode;
}) {
  const interactive = typeof onSelect === "function" && tabs.length > 1;
  // True exactly when the tabs carry the tab touch box and the strip its 9-dot clearance.
  const touchClearance = Boolean(compactOnPhone) && interactive;

  const tabButtons = (
    <>
      {tabs.map((tab) => {
        const on = tab.id === active;
        const className = cn(
          "rounded-t-lg border px-[18px] py-1.5 text-xs font-display font-bold tracking-architectural uppercase",
          on
            ? "border-surf-line border-b-0 bg-surf-tab-active text-surf-ink"
            : "border-transparent bg-transparent text-surf-ink-muted",
          // P-2: every tab on a phone draws 22px tall (py-0.5) instead of 30px (py-1.5), the
          // same slim strip on every one of the five drawing screens.
          !bare && compactOnPhone && "max-shell:py-0.5 [@media(max-height:500px)]:py-0.5",
        );

        if (!interactive) {
          return (
            <span key={tab.id} className={className}>
              {tab.label}
            </span>
          );
        }
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onSelect?.(tab.id)}
            className={cn(
              "cursor-pointer",
              className,
              // P-3: on a touch screen only, a 44px-tall invisible box centred on the tab —
              // the same idea as the slider thumb's own `::after` touch ring. Centred on a
              // 22px tab it reaches 11px above and 11px below, into the empty frame a phone
              // carries around the tab (the strip's own top padding above, the card's rim and
              // this card's own top padding below) — never the top bar, never the drawing,
              // never the viewer's own toolbar buttons. `z-10` keeps it above the folder card
              // below, which it reaches down into. This tab's own real touch area (30px on
              // every phone and orientation today) was never measured by
              // `e2e/touch-sizing.spec.ts`, which covers sliders, typed fields, buttons,
              // checkbox rows and a handful of hand-rolled grids — not this tab strip.
              !bare &&
                compactOnPhone &&
                "coarse:relative coarse:after:absolute coarse:after:inset-x-0 coarse:after:top-1/2 coarse:after:h-11 coarse:after:-translate-y-1/2 coarse:after:z-10 coarse:after:content-['']",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </>
  );

  return (
    <>
      {!bare && (
        <div
          className={cn(
            "flex flex-none gap-1.5",
            // P-3: the tab strip's own top padding — only while the strip is interactive, since a
            // single read-only label (TEMPLATE/VOLUME) carries no touch box to clear. 9px of
            // padding plus the column's own 2px rim is 11px, which is where the touch box below
            // (centred on a 22px tab, reaching 11px above it) stops.
            !bare && compactOnPhone && interactive && "max-shell:pt-[9px] [@media(max-height:500px)]:pt-[9px]",
          )}
          role={trailing ? undefined : interactive ? "tablist" : undefined}
        >
          {trailing ? (
            <>
              <div className="flex flex-none gap-1.5" role={interactive ? "tablist" : undefined}>
                {tabButtons}
              </div>
              <div className="ml-auto flex min-w-0">{trailing({ touchClearance })}</div>
            </>
          ) : (
            tabButtons
          )}
        </div>
      )}

      {/* `key="panel"` so this div (and everything inside it, including `children`) keeps its
          identity across a `bare` toggle even though the tab strip above it appears or
          disappears — without an explicit key, React reconciles fragment children positionally,
          and losing/gaining that first sibling would otherwise shift this div's index and read
          as a different node. In non-bare mode this div carries the outer card's border and is
          square top-left so it meets the first tab flush, with `-mt-px` closing the seam the
          tab's missing bottom border leaves. In `bare` mode there is no tab strip and no seam to
          close, so this layer is deliberately unstyled — a plain flex pass-through with no
          border, background, or padding of its own — so the SINGLE visible box a shaper sees in
          Wide View is the inner card below, not this one. */}
      <div
        key="panel"
        className={cn(
          bare
            ? "flex min-h-0 flex-1 flex-col"
            : "flex min-h-0 flex-1 flex-col rounded-tr-lg rounded-b-lg border border-surf-line bg-surf-tab-active p-3 -mt-px",
          growOnShortScreen && "[@media(max-height:500px)]:min-h-fit",
          // P-1/P-2: the folder card's own 12px pad (p-3) drops to a 2px rim on a phone.
          !bare && compactOnPhone && "max-shell:p-0.5 [@media(max-height:500px)]:p-0.5",
          // P-3: the tab above became `relative` for its own touch box (coarse:relative on the
          // tab itself); making this card positioned too keeps it painting its own 1px line under
          // the active tab exactly as today, because positioned boxes paint in page (DOM) order —
          // without this the card's own stacking context would default ahead of a positioned tab
          // instead of behind it, and the seam would shift. Measured: the seam's pixel row is
          // identical with and without this rule.
          !bare && compactOnPhone && interactive && "coarse:relative",
        )}
      >
        {/* The content's own card. In non-bare mode these are two nested boundaries doing
            different jobs: the panel's `--surf-line` edge above says where the working surface
            starts, and this fainter, fully-rounded one says where the content sits inside it.
            `line-faint` is right here precisely because it should recede — it is a grouping
            hint, not a structural edge, and it reads against `panel` rather than against the
            canvas. The 12px inset (`p-3`) lives here on purpose, so every screen and every tab
            gets one treatment from one place instead of each call site arriving at it (or not)
            on its own. In `bare` mode the outer layer above is invisible, so THIS card takes
            the full `--surf-line` border and the tighter 4px inset (`p-1`) Wide View asks for —
            matching, pixel for pixel, the single bordered box the plain `<div>` this replaced
            used to draw. */}
        <div
          // Quick 260930-fjm, Task 4 (the founder's revision): no stable hook named "the viewer
          // panel" existed before this — `scripts/capture-link-preview.ts` reads this element's
          // computed border colour and corner radius so the link-preview picture's frame always
          // matches the app's own chrome instead of a colour sampled once and left to drift.
          data-viewer-panel
          className={cn(
            "flex min-h-0 flex-1 flex-col rounded-lg border bg-surf-panel",
            bare ? "border-surf-line p-1" : "border-surf-line-faint p-3",
            growOnShortScreen && "[@media(max-height:500px)]:min-h-fit",
            // P-1/P-2/P-4: this card's own border and 12px pad (p-3) drop to nothing on a phone —
            // the folder card above now carries the whole 2px rim, so a second nested border and
            // pad here would double it. `text` then puts back an 8px reading margin (P-4) so
            // DATASHEET/DATA/INSTRUCTIONS/MODEL INFO/ESTIMATE text never touches the frame line;
            // `drawing` stays at zero so a drawing can reach the rim. Order matters here: `cn`
            // (tailwind-merge) keeps the LAST class written for a given CSS property, so `text`'s
            // `p-2` has to come after the `border-0 p-0` reset to survive, and the touch-box
            // clearance's `pt-[9px]` has to come after THAT to survive on top of `text`'s own `p-2`
            // — a later `pt` only overrides the padding-top component of an earlier `p`, never its
            // left/right/bottom, which is exactly what lets both rules compose into one pad.
            !bare &&
              compactOnPhone &&
              "max-shell:border-0 max-shell:p-0 [@media(max-height:500px)]:border-0 [@media(max-height:500px)]:p-0",
            !bare && compactOnPhone === "text" && "max-shell:p-2 [@media(max-height:500px)]:p-2",
            // P-3: the touch box reaches down into this card by 11px total — 1px of the tab's own
            // bottom border it overlaps, 2px of the folder card's rim, and 9px of this card's own
            // top padding — so a tappable tab strip never overlaps the drawing or the text below
            // it, on any of the five screens.
            !bare && compactOnPhone && interactive && "max-shell:pt-[9px] [@media(max-height:500px)]:pt-[9px]",
            panelClassName,
          )}
        >
          {children}
        </div>
      </div>
    </>
  );
}
