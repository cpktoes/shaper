"use client";

/**
 * The PICK A BLANK popup (quick 261015-ve9, sketch 015 B — the founder's pick, 2026-10-15): every
 * blank long enough for the board as a catalogue card, so a shaper chooses foam by looking at it.
 *
 * Size (D-01) — width and height switches only, never the pointer (CLAUDE.md "Layout"): on a
 * computer it fills the window 32 px in from each edge, never wider than 1180 px, centred; below the
 * 820 width line (`max-shell:`, an upright phone) AND on a short screen (`[@media(max-height:500px)]`,
 * a phone held sideways) it fills the screen, padded clear of a notch and the home bar. The ✕, Esc
 * and a click outside close it with the board exactly as it was.
 *
 * What it shows (D-07): the filter bar (`blank-filter-bar.tsx`); the list's intro; the old empty-list
 * message when no blank is long enough (E1, in place of the list); when blanks are listed but not one
 * is thick enough, the old E2 / E3 message ABOVE the greyed cards (P-3); then ★ STARRED (when any
 * starred blank shows, whatever the sort — D-06), FITS THIS BOARD and WON'T FIT THIS BOARD. A starred
 * blank shows only under ★ STARRED, greyed with its reason when it doesn't fit (P-10). A greyed card's
 * reason is the fit flag's own sentence (`blankReason`).
 *
 * The rows are built, filtered, sorted and grouped by the pure functions in
 * `lib/geometry/blank-browse.ts`, never here, and never re-judged: the list itself is judged ONCE, by
 * `blank-picker.tsx`, and handed in, so opening the popup or moving a filter costs no judging. The
 * filters, sort and open range drawer are held by `blank-picker.tsx` for the visit (D-13); Flat /
 * Upright and Show my board are remembered in this browser (`use-blank-picker-view.ts`); the stars
 * live in `StarredBlanksProvider` (D-06). Starring never picks a blank and never changes the board.
 *
 * Picking a card (D-08) puts that blank on the board exactly as a row of the old list did —
 * `pickBlank(record, verdict.placement)` — and closes the popup. On a locked board the popup still
 * opens, searches, filters, sorts and stars, but no card can be picked. Theme and units follow the app
 * (D-05): the popup has no control of its own for either.
 *
 * The shaper's saved blanks (quick 261016-mkb plan 03, D-09, D-10, 2026-10-16) are cards here too,
 * beside the maker's natural blank, which stays listed: judged once with the catalogue
 * (`use-blank-list.ts`), turned into rows by `savedBrowseRows`, then filtered, sorted and grouped with
 * every other card. Picking a saved card puts its copy AND its rocker on the board —
 * `pickBlank(copy, placement, rocker)`; picking a maker's card is the plain pick it always was, which
 * clears a custom rocker (D-10). "Currently selected" matches maker, name and rocker, so only one card
 * is ever marked as the board's. A saved card's star is its note-bearing identity
 * (`blankStarIdentity`); the header's "of {m} blanks" counts the saved blanks long enough for the board.
 */

import { useMemo, useRef, useState, type RefObject } from "react";
import { XIcon } from "lucide-react";
import { useDesign } from "@/components/design/design-store";
import { useControlsLocked } from "@/components/design/use-controls-locked";
import { useBlankMakers } from "@/components/blank-makers-provider";
import { useFitDefaults } from "@/components/fit-defaults-provider";
import { useStarredBlanks } from "@/components/starred-blanks-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useUnits } from "@/components/units-provider";
import { catalogsPhrase } from "@/lib/blanks/vendors";
import type { BlankRecord } from "@/lib/geometry/blank";
import {
  browseFiltersActive,
  browseRows,
  EMPTY_BROWSE_FILTERS,
  filterBrowseRows,
  groupBrowseRows,
  rangeBounds,
  savedBrowseRows,
  type BlankBrowseFilters,
  type BlankSort,
  type BrowseGroupKey,
  type BrowseRow,
  type MmRange,
  type RangeKind,
} from "@/lib/geometry/blank-browse";
import { catalogueExtremes, longEnoughByMaker } from "@/lib/geometry/blank-fit";
import { blankReason, emptyListMessage, listIntro, pickerBoardLine, pickerCounts } from "@/lib/geometry/blank-reasons";
import { blankStarIdentity, sameRockerSpec, type BlankRockerSpec } from "@/lib/geometry/custom-rocker";
import { silhouette } from "@/lib/geometry/screen-tiles";
import { cn } from "@/lib/utils";
import { BlankCard, type CardBoard } from "./blank-card";
import { BlankFilterBar } from "./blank-filter-bar";
import { useBlankPickerView } from "./use-blank-picker-view";
import { useCenterFloorRules, type BlankListState } from "./use-blank-list";

/** The 10px/800 uppercase group label the datasheet's station headers use (as the old list's). */
const GROUP_LABEL_CLASS = "pb-1.5 text-[10px] font-extrabold uppercase tracking-architectural text-surf-ink-muted";

/** The 11px/700 text-link idiom, grown to 44px on a touch pointer. */
const TEXT_LINK_CLASS =
  "focus-ring-accent cursor-pointer text-left text-[11px] font-bold coarse:flex coarse:min-h-11 coarse:items-center";

/** Both phone layouts — an upright phone (width) and a phone held sideways (height) — fill the screen
 * and pad clear of the notch and the home bar. Two switches, written out once each, never a pointer.
 * Exported for the Customize Rocker popup (quick 261016-mkb, D-04: "styled like PICK A BLANK"), so the
 * two popups share one size rule rather than two copies of it. */
export const FULL_SCREEN_CLASS = cn(
  "max-shell:inset-0 max-shell:max-w-none max-shell:rounded-none max-shell:ring-0",
  "max-shell:pt-[env(safe-area-inset-top)] max-shell:pr-[env(safe-area-inset-right)] max-shell:pb-[env(safe-area-inset-bottom)] max-shell:pl-[env(safe-area-inset-left)]",
  "[@media(max-height:500px)]:inset-0 [@media(max-height:500px)]:max-w-none [@media(max-height:500px)]:rounded-none [@media(max-height:500px)]:ring-0",
  "[@media(max-height:500px)]:pt-[env(safe-area-inset-top)] [@media(max-height:500px)]:pr-[env(safe-area-inset-right)] [@media(max-height:500px)]:pb-[env(safe-area-inset-bottom)] [@media(max-height:500px)]:pl-[env(safe-area-inset-left)]",
);

/** The popup's own size and surface on a computer — 32 px in from every edge of the window, never
 * wider than 1180, centred — shared with the Customize Rocker popup (quick 261016-mkb, D-04). */
export const LARGE_DIALOG_CLASS =
  "inset-8 mx-auto flex w-auto max-w-[1180px] translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden border-surf-line-faint bg-surf-panel p-0 text-surf-ink sm:max-w-[1180px]";

/** The card grid's columns: a flat card wants about 290 px (190 px for the one-line card on a phone
 * held sideways), an upright card about 300 px (260 px on a short screen). */
const GRID_CLASS = {
  flat: "[grid-template-columns:repeat(auto-fill,minmax(290px,1fr))] [@media(max-height:500px)]:[grid-template-columns:repeat(auto-fill,minmax(190px,1fr))]",
  upright:
    "[grid-template-columns:repeat(auto-fill,minmax(300px,1fr))] [@media(max-height:500px)]:[grid-template-columns:repeat(auto-fill,minmax(260px,1fr))]",
} as const;

/** Each group's heading words. */
function groupLabel(key: BrowseGroupKey, count: number): string {
  if (key === "starred") return `★ STARRED · ${count}`;
  if (key === "fits") return `FITS THIS BOARD · ${count}`;
  return `WON'T FIT THIS BOARD · ${count}`;
}

/** Is this card the board's own blank? Matched by vendor, name AND rocker — the board carries a copy,
 * and a saved blank shares its maker and name with its natural twin (quick 261016-mkb), so only one
 * card is ever marked. */
function isSameBlank(row: BrowseRow, board: { copy: Pick<BlankRecord, "vendor" | "name">; rocker?: BlankRockerSpec } | null) {
  return (
    board !== null &&
    row.record.vendor === board.copy.vendor &&
    row.record.name === board.copy.name &&
    sameRockerSpec(row.saved?.rocker, board.rocker)
  );
}

/** A card's React key: a maker's blank by maker and name, a saved blank by its own id. */
function rowKey(row: BrowseRow): string {
  return row.saved ? `saved|${row.saved.id}` : `${row.record.vendor}|${row.record.name}`;
}

/** The popup's view state for the visit (D-13), held by `blank-picker.tsx`. */
export interface BlankBrowseState {
  filters: BlankBrowseFilters;
  setFilters: (filters: BlankBrowseFilters) => void;
  sort: BlankSort;
  setSort: (sort: BlankSort) => void;
  openRange: RangeKind | null;
  setOpenRange: (range: RangeKind | null) => void;
}

export interface BlankPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The BLANK button — focus goes back to it when the popup closes. */
  buttonRef: RefObject<HTMLButtonElement | null>;
  /** The one judged list (`useBlankList`, called once by `blank-picker.tsx`). */
  state: BlankListState;
  browse: BlankBrowseState;
  /** Opens the fit part of App Default Settings. Called only once the popup has finished closing,
   * so two modal dialogs are never open at once. */
  onChangeFitRules: () => void;
}

export function BlankPickerDialog({ open, onOpenChange, buttonRef, state, browse, onChangeFitRules }: BlankPickerDialogProps) {
  const { system } = useUnits();
  const { blank, pickBlank, outline, outlineGeometry, foil } = useDesign();
  const { settings } = useFitDefaults();
  const { hidden } = useBlankMakers();
  const { isStarred, setStarred } = useStarredBlanks();
  const { view, setDrawn, setShowBoard } = useBlankPickerView();
  const rules = useCenterFloorRules();
  const locked = useControlsLocked();
  const { list, board, prepared, allPrepared, recordOf, saved } = state;
  const { filters, setFilters, sort, setSort, openRange, setOpenRange } = browse;
  // Change Fit Rules closes the popup FIRST and opens App Default Settings only once it has gone —
  // two modal dialogs are never open at once — and that close hands focus to Settings, not back to
  // the BLANK button.
  const afterClose = useRef<(() => void) | null>(null);
  const [returnFocus, setReturnFocus] = useState(true);
  const changeFitRules = () => {
    afterClose.current = onChangeFitRules;
    setReturnFocus(false);
    onOpenChange(false);
  };
  const openChangeComplete = (isOpen: boolean) => {
    if (isOpen) return;
    const then = afterClose.current;
    afterClose.current = null;
    setReturnFocus(true);
    then?.();
  };

  // The shaper's board as every card draws it (D-04) — TEMPLATE's own silhouette, worked out once.
  const cardBoard = useMemo<CardBoard>(
    () => ({ length: outline.length, silhouette: silhouette(outlineGeometry) }),
    [outline.length, outlineGeometry],
  );

  // Each maker's blanks long enough for this board: the maker chips' counts (P-8), and summed, m in
  // "{n} of {m} blanks" (P-4).
  const makerCounts = useMemo(
    () => longEnoughByMaker(allPrepared, outline.length, settings.extraLength),
    [allPrepared, outline.length, settings.extraLength],
  );
  // The shaper's saved blanks long enough for the board join m (quick 261016-mkb), every maker
  // counted, as the catalogue's are; the maker chips keep counting the makers' own blanks.
  const savedLongEnough = useMemo(
    () =>
      [...longEnoughByMaker([...saved.entryOf.keys()], outline.length, settings.extraLength).values()].reduce(
        (a, b) => a + b,
        0,
      ),
    [saved.entryOf, outline.length, settings.extraLength],
  );
  const longEnough = useMemo(
    () => [...makerCounts.values()].reduce((a, b) => a + b, 0) + savedLongEnough,
    [makerCounts, savedLongEnough],
  );

  // The makers' blanks, then the shaper's saved ones (quick 261016-mkb) — one list of cards.
  const rows = useMemo(
    () => [...browseRows(list, recordOf, isStarred), ...savedBrowseRows(saved.list, saved.entryOf, isStarred)],
    [list, recordOf, isStarred, saved],
  );
  // The filters narrow the cards already judged — they never re-run a verdict.
  const shown = useMemo(() => filterBrowseRows(rows, filters), [rows, filters]);
  const groups = useMemo(() => groupBrowseRows(shown, sort), [shown, sort]);
  const fitCount = shown.filter((row) => row.fits).length;
  // Each range slider's ends, from every listed blank, in the system in use (P-11).
  const bounds = useMemo<Record<RangeKind, MmRange | null>>(
    () => ({
      length: rangeBounds(
        rows.map((row) => row.lengthMm),
        "length",
        system,
      ),
      noseRocker: rangeBounds(
        rows.map((row) => row.noseRocker),
        "noseRocker",
        system,
      ),
    }),
    [rows, system],
  );

  const messageNumbers = () => {
    const { longest, thickestCenter } = catalogueExtremes(prepared);
    return { boardLength: outline.length, longest, centre: foil.center, thickestCenter, rules };
  };
  const emptyMessage =
    list.emptyReason !== null ? emptyListMessage(list.emptyReason, messageNumbers(), system, catalogsPhrase(hidden)) : null;
  const thinMessage =
    list.tooThinReason !== null
      ? emptyListMessage(list.tooThinReason, messageNumbers(), system, catalogsPhrase(hidden))
      : null;

  // Nothing matches: a search alone keeps today's words and Clear Search; any other filter set says
  // "these filters" and Clear Filters resets the search, both ranges and Starred only (P-9).
  const noMatch = rows.length > 0 && shown.length === 0;
  const searchOnly =
    filters.query.trim() !== "" && !browseFiltersActive({ ...filters, query: "" });

  // A saved card puts its copy and its rocker on the board; a maker's card is a plain pick, which
  // clears any custom rocker (quick 261016-mkb, D-09, D-10).
  const pick = (row: BrowseRow) => {
    if (row.saved) pickBlank(row.record, row.verdict.placement, row.saved.rocker);
    else pickBlank(row.record, row.verdict.placement);
    onOpenChange(false);
  };

  // A maker's blank is starred by maker and name, a saved one by its name with its note (D-09).
  const starIdentity = (row: BrowseRow): [string, string] =>
    row.saved ? blankStarIdentity(row.record, row.saved.rocker) : [row.record.vendor, row.record.name];

  return (
    <Dialog open={open} onOpenChange={onOpenChange} onOpenChangeComplete={openChangeComplete}>
      <DialogContent
        data-blank-picker
        showCloseButton={false}
        finalFocus={returnFocus ? buttonRef : false}
        className={cn(LARGE_DIALOG_CLASS, FULL_SCREEN_CLASS)}
      >
        <div className="flex items-start gap-3 border-b border-surf-line-faint px-4 py-3 max-shell:px-3 max-shell:py-2 [@media(max-height:500px)]:px-3 [@media(max-height:500px)]:py-2">
          {/* DOM-first, so it is what takes focus on open — no phone keyboard pops up for the search. */}
          <DialogClose
            render={
              <Button
                variant="outline"
                size="icon"
                aria-label="Close"
                data-lock-exempt
                className="order-last shrink-0 coarse:size-11"
              />
            }
          >
            <XIcon aria-hidden />
          </DialogClose>
          <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-3 gap-y-0.5 pt-1.5">
            <DialogTitle className="text-sm font-extrabold tracking-architectural text-surf-ink uppercase">
              Pick a Blank
            </DialogTitle>
            <DialogDescription className="text-xs text-surf-ink-muted max-shell:basis-full">
              {pickerBoardLine(outline.length, outline.widePointWidth, foil.center, system)} ·{" "}
              {pickerCounts(shown.length, longEnough, fitCount)}
            </DialogDescription>
          </div>
        </div>

        <div className="border-b border-surf-line-faint px-4 py-2.5 max-shell:px-3 max-shell:py-2 [@media(max-height:500px)]:px-3 [@media(max-height:500px)]:py-1.5">
          <BlankFilterBar
            filters={filters}
            onFiltersChange={setFilters}
            sort={sort}
            onSortChange={setSort}
            openRange={openRange}
            onOpenRangeChange={setOpenRange}
            view={view}
            onDrawnChange={setDrawn}
            onShowBoardChange={setShowBoard}
            makerCounts={makerCounts}
            bounds={bounds}
            system={system}
          />
        </div>

        <div
          data-blank-picker-scroll
          className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-3 max-shell:px-3 [@media(max-height:500px)]:px-3"
        >
          <p className="text-xs text-surf-ink-muted">{listIntro(rules, system)}</p>

          {emptyMessage !== null && (
            <div className="flex flex-col gap-1" data-blank-list-empty>
              <div className="text-sm font-semibold text-surf-ink">{emptyMessage.heading}</div>
              <div className="text-xs text-surf-ink-muted">{emptyMessage.body}</div>
              <Button
                variant="outline"
                data-lock-exempt
                className="mt-1 self-start max-shell:w-full max-shell:self-stretch"
                onClick={changeFitRules}
              >
                Change Fit Rules
              </Button>
            </div>
          )}

          {thinMessage !== null && (
            <div className="flex flex-col gap-1" data-blank-list-thin>
              <div className="text-sm font-semibold text-surf-ink">{thinMessage.heading}</div>
              <div className="text-xs text-surf-ink-muted">{thinMessage.body}</div>
              <Button
                variant="outline"
                data-lock-exempt
                className="mt-1 self-start max-shell:w-full max-shell:self-stretch"
                onClick={changeFitRules}
              >
                Change Fit Rules
              </Button>
            </div>
          )}

          {noMatch && (
            <div className="flex flex-col items-start gap-1" data-blank-no-match>
              <div className="text-xs break-words text-surf-ink-muted">
                {searchOnly ? <>No blanks match &quot;{filters.query}&quot;.</> : "No blanks match these filters."}
              </div>
              <button
                type="button"
                data-lock-exempt
                onClick={() => setFilters(searchOnly ? { ...filters, query: "" } : EMPTY_BROWSE_FILTERS)}
                className={cn(TEXT_LINK_CLASS, "text-surf-accent-ink")}
              >
                {searchOnly ? "Clear Search" : "Clear Filters"}
              </button>
            </div>
          )}

          {groups.map((group) => {
            const label = groupLabel(group.key, group.rows.length);
            return (
              <section key={group.key}>
                <h3 className={GROUP_LABEL_CLASS}>{label}</h3>
                <ul data-blank-group={group.key} aria-label={label} className={cn("grid gap-2.5", GRID_CLASS[view.drawn])}>
                  {group.rows.map((row) => (
                    <BlankCard
                      key={rowKey(row)}
                      verdict={row.verdict}
                      record={row.record}
                      saved={row.saved ?? null}
                      group={group.key}
                      reason={blankReason(row.verdict, board, rules, system)}
                      onBoard={isSameBlank(row, blank)}
                      board={cardBoard}
                      locked={locked}
                      system={system}
                      view={view}
                      starred={row.starred}
                      onStarChange={(on) => setStarred(...starIdentity(row), on)}
                      onPick={() => pick(row)}
                    />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
