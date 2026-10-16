"use client";

/**
 * The PICK A BLANK popup's filter bar (quick 261015-ve9, sketch 015 B — the founder's decisions of
 * 2026-10-15). Nothing here changes the board, so every control is `data-lock-exempt`: on a locked
 * board a shaper can still search, filter, sort, switch the view and star — only picking is off (D-08).
 *
 * What it holds:
 * - The search, as before.
 * - Flat / Upright (D-02), how every card draws its blank, and Show my board (D-04), the shaper's
 *   board dashed on every blank. Both are remembered in this browser (D-13).
 * - The four makers as chips with counts (D-12). These ARE Settings → Blank Makers: a chip calls the
 *   very `setMakerShown` Settings' tick boxes call, so unticking one here unticks it there and the
 *   reverse, and the last maker ticked can't be unticked. A chip's count is that maker's blanks long
 *   enough for this board, whatever else is set (P-8).
 * - Length and Nose rocker (D-07): each chip opens a drawer of two sliders, from and to, stepping 1"
 *   or 1 cm and 1/8" or 1 mm, with Any length / Any nose rocker to clear. ★ Starred only. The sort.
 *
 * Its three shapes (D-01) are CSS only, chosen by width and height and never by the pointer
 * (CLAUDE.md "Layout"):
 * - A computer: two lines. The search, Flat / Upright in words and Show my board; then the makers,
 *   Length, Nose rocker, Starred only and Sort, wrapping.
 * - An upright phone (below the 820 width line, `max-shell:`): the search beside Flat / Upright as two
 *   icons, over ONE sideways-scrolling chip row that also carries Show my board.
 * - A phone held sideways (`[@media(max-height:500px)]`): everything in one sideways-scrolling row.
 * A finger gets 44-dot touch boxes on every chip and switch (`coarse:`), a mouse the usual size.
 * The range drawer sits under the bar, outside any sideways scroller.
 *
 * Every number and its words come from `lib/geometry/blank-browse.ts` (CLAUDE.md Rule 2); no
 * conversion here. Older Safari: every button that lays out children says `flex` / `inline-flex`
 * and `items-*` itself.
 */

import { useId } from "react";
import { ChevronDownIcon, RectangleHorizontalIcon, RectangleVerticalIcon, SearchIcon, StarIcon } from "lucide-react";
import { useBlankMakers } from "@/components/blank-makers-provider";
import { sliderValue } from "@/components/design/slider-row";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import type { BlankPickerView } from "@/lib/blank-picker-view-preference";
import { isLastShownMaker } from "@/lib/blank-makers-preference";
import { KNOWN_BLANK_VENDORS } from "@/lib/blanks/vendors";
import {
  BLANK_SORTS,
  formatRangeValue,
  rangeChipText,
  rangeSlider,
  withRangeEnd,
  type BlankBrowseFilters,
  type BlankSort,
  type MmRange,
  type RangeKind,
} from "@/lib/geometry/blank-browse";
import type { UnitsSystem } from "@/lib/geometry/units";
import { cn } from "@/lib/utils";

/** A filter chip: a pill, grown to a 44-dot touch box on a finger. */
const CHIP_CLASS =
  "focus-ring-accent inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-bold whitespace-nowrap coarse:min-h-11";
/** Pressed: TwoOptionToggle's own active look. */
const CHIP_ON = "border-surf-on-accent bg-surf-accent text-surf-on-accent";
/** Not pressed. */
const CHIP_OFF = "border-surf-line bg-surf-sidebar text-surf-ink";

export interface BlankFilterBarProps {
  filters: BlankBrowseFilters;
  onFiltersChange: (filters: BlankBrowseFilters) => void;
  sort: BlankSort;
  onSortChange: (sort: BlankSort) => void;
  openRange: RangeKind | null;
  onOpenRangeChange: (range: RangeKind | null) => void;
  view: BlankPickerView;
  onDrawnChange: (drawn: BlankPickerView["drawn"]) => void;
  onShowBoardChange: (showBoard: boolean) => void;
  /** Each maker's blanks long enough for this board (P-8). */
  makerCounts: ReadonlyMap<string, number>;
  /** Each range slider's two ends, from every listed blank (P-11); null when nothing is listed. */
  bounds: Record<RangeKind, MmRange | null>;
  system: UnitsSystem;
}

/** Flat / Upright: two pressed-or-not buttons, words on a computer, icons on a phone (D-01, D-02). */
function DrawnSwitch({ drawn, onChange }: { drawn: BlankPickerView["drawn"]; onChange: (d: BlankPickerView["drawn"]) => void }) {
  const options = [
    { id: "flat" as const, label: "Flat", Icon: RectangleHorizontalIcon },
    { id: "upright" as const, label: "Upright", Icon: RectangleVerticalIcon },
  ];
  return (
    <div role="group" aria-label="How blanks are drawn" className="flex shrink-0 items-center gap-1">
      {options.map(({ id, label, Icon }) => {
        const on = drawn === id;
        return (
          <button
            key={id}
            type="button"
            data-lock-exempt
            aria-pressed={on}
            aria-label={label}
            onClick={() => onChange(id)}
            className={cn(CHIP_CLASS, "justify-center px-2.5 coarse:min-w-11", on ? CHIP_ON : CHIP_OFF)}
          >
            <Icon aria-hidden className="size-4" />
            <span aria-hidden className={`max-shell:sr-only [@media(max-height:500px)]:sr-only`}>
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Show my board: On | Off (D-04). Two copies are drawn and CSS shows the right one for the layout. */
function ShowBoardChip({ on, onChange, className }: { on: boolean; onChange: (on: boolean) => void; className: string }) {
  return (
    <button
      type="button"
      data-lock-exempt
      data-show-board
      aria-pressed={on}
      aria-label="Show my board"
      onClick={() => onChange(!on)}
      className={cn(CHIP_CLASS, on ? CHIP_ON : CHIP_OFF, className)}
    >
      Show my board: {on ? "On" : "Off"}
    </button>
  );
}

/** One end of a range: its words, its slider and the slider's two ends under it. */
function RangeEnd({
  kind,
  end,
  range,
  bounds,
  system,
  onChange,
}: {
  kind: RangeKind;
  end: "from" | "to";
  range: MmRange | null;
  bounds: MmRange;
  system: UnitsSystem;
  onChange: (range: MmRange) => void;
}) {
  const name = kind === "length" ? "Length" : "Nose rocker";
  const current = range ?? bounds;
  const value = current[end];
  const slider = rangeSlider(value, bounds, kind, system);
  const words = end === "from" ? `${name} from` : "to";
  return (
    <div className="flex flex-col gap-1">
      <div className="text-xs text-surf-ink-muted">
        <span className="font-bold text-surf-ink">{words}</span>{" "}
        <span data-range-value={end} className="tabular-nums text-surf-ink">
          {formatRangeValue(value, kind, system)}
        </span>
      </div>
      {/* The app's own slider look (`slider-accent` in globals.css): an outlined track, the accent
          fill and dot — without it the track vanished into the drawer's well colour, and a slider
          set to its lowest end read as a lone button (the founder, 2026-10-16). */}
      <Slider
        data-lock-exempt
        className="slider-accent"
        value={slider.value}
        min={slider.min}
        max={slider.max}
        step={slider.step}
        thumbAriaLabel={`${name} ${end}`}
        thumbAriaValueText={formatRangeValue(value, kind, system)}
        onValueChange={(v) => onChange(withRangeEnd(range, bounds, end, slider.toMm(sliderValue(v))))}
      />
      <div className="flex justify-between text-[11px] text-surf-ink-muted tabular-nums">
        <span>{formatRangeValue(bounds.from, kind, system)}</span>
        <span>{formatRangeValue(bounds.to, kind, system)}</span>
      </div>
    </div>
  );
}

export function BlankFilterBar({
  filters,
  onFiltersChange,
  sort,
  onSortChange,
  openRange,
  onOpenRangeChange,
  view,
  onDrawnChange,
  onShowBoardChange,
  makerCounts,
  bounds,
  system,
}: BlankFilterBarProps) {
  const { hidden, setMakerShown } = useBlankMakers();
  const drawerId = useId();
  const makersHintId = useId();
  const set = (patch: Partial<BlankBrowseFilters>) => onFiltersChange({ ...filters, ...patch });
  const openBounds = openRange !== null ? bounds[openRange] : null;

  const rangeChip = (kind: RangeKind) => {
    const range = filters[kind];
    const open = openRange === kind;
    return (
      <button
        type="button"
        data-lock-exempt
        data-range-chip={kind}
        aria-expanded={open}
        aria-controls={open ? drawerId : undefined}
        disabled={bounds[kind] === null}
        onClick={() => onOpenRangeChange(open ? null : kind)}
        className={cn(
          CHIP_CLASS,
          CHIP_OFF,
          range !== null && "border-surf-accent-ink",
          "disabled:cursor-default disabled:opacity-40",
        )}
      >
        {rangeChipText(kind, range, system)}
        <ChevronDownIcon aria-hidden className={cn("size-3.5", open && "rotate-180")} />
      </button>
    );
  };

  return (
    <div className="flex flex-col gap-2" data-blank-filter-bar>
      <div
        className={cn(
          "flex flex-col gap-2",
          `[@media(max-height:500px)]:flex-row [@media(max-height:500px)]:flex-nowrap [@media(max-height:500px)]:items-center [@media(max-height:500px)]:overflow-x-auto`,
        )}
        data-blank-filter-row
      >
        {/* Line 1: the search, Flat / Upright, and on a computer Show my board. */}
        <div className={`flex items-center gap-2 [@media(max-height:500px)]:shrink-0`}>
          <div className={`relative min-w-0 flex-1 [@media(max-height:500px)]:w-52 [@media(max-height:500px)]:flex-none`}>
            <SearchIcon
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-surf-ink-muted"
            />
            <Input
              type="search"
              data-lock-exempt
              aria-label="Search blanks"
              placeholder="Search — e.g. Marko, 6'2, EPS"
              value={filters.query}
              onChange={(event) => set({ query: event.target.value })}
              className="pl-8"
            />
          </div>
          <DrawnSwitch drawn={view.drawn} onChange={onDrawnChange} />
          <ShowBoardChip on={view.showBoard} onChange={onShowBoardChange} className={`max-shell:hidden [@media(max-height:500px)]:hidden`} />
        </div>

        {/* Line 2: the chips. One sideways-scrolling row on an upright phone; on a phone held
            sideways the whole bar is that row. */}
        <div
          data-blank-chip-row
          className={cn(
            "flex flex-wrap items-center gap-2",
            "max-shell:flex-nowrap max-shell:overflow-x-auto max-shell:pb-0.5",
            `[@media(max-height:500px)]:shrink-0 [@media(max-height:500px)]:flex-nowrap`,
          )}
        >
          <div role="group" aria-label="Blank makers" className="flex shrink-0 items-center gap-2">
            {KNOWN_BLANK_VENDORS.map((vendor) => {
              const shown = !hidden.includes(vendor);
              const last = isLastShownMaker(hidden, vendor);
              return (
                <button
                  key={vendor}
                  type="button"
                  data-lock-exempt
                  data-maker-chip={vendor}
                  aria-pressed={shown}
                  aria-disabled={last || undefined}
                  aria-describedby={last ? makersHintId : undefined}
                  onClick={() => {
                    if (!last) setMakerShown(vendor, !shown);
                  }}
                  className={cn(CHIP_CLASS, shown ? CHIP_ON : CHIP_OFF, "aria-disabled:cursor-default")}
                >
                  {vendor}
                  <span className="font-semibold tabular-nums opacity-80">{makerCounts.get(vendor) ?? 0}</span>
                </button>
              );
            })}
            <span id={makersHintId} className="sr-only">
              Keep at least one maker ticked
            </span>
          </div>
          <i aria-hidden className="h-5 w-px shrink-0 bg-surf-line" />
          <ShowBoardChip
            on={view.showBoard}
            onChange={onShowBoardChange}
            className={`hidden max-shell:inline-flex [@media(max-height:500px)]:inline-flex`}
          />
          {rangeChip("length")}
          {rangeChip("noseRocker")}
          <button
            type="button"
            data-lock-exempt
            aria-pressed={filters.starredOnly}
            onClick={() => set({ starredOnly: !filters.starredOnly })}
            className={cn(CHIP_CLASS, filters.starredOnly ? CHIP_ON : CHIP_OFF)}
          >
            <StarIcon aria-hidden className="size-3.5 fill-current" />
            Starred only
          </button>
          {/* The select draws without the browser's own look (`appearance-none`), so WebKit honours its
              44-dot touch height; the chevron is drawn here instead. */}
          <label data-sort-chip className={cn(CHIP_CLASS, CHIP_OFF, "relative cursor-default gap-1.5 py-0 pr-2")}>
            Sort
            <select
              data-lock-exempt
              aria-label="Sort"
              value={sort}
              onChange={(event) => onSortChange(event.target.value as BlankSort)}
              className="focus-ring-accent cursor-pointer appearance-none rounded-full bg-transparent py-1.5 pr-5 text-xs font-bold text-surf-ink coarse:min-h-11"
            >
              {BLANK_SORTS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDownIcon aria-hidden className="pointer-events-none absolute right-2.5 size-3.5" />
          </label>
        </div>
      </div>

      {openRange !== null && openBounds !== null && (
        <div
          id={drawerId}
          data-range-drawer={openRange}
          className="flex flex-col gap-2 rounded-md border border-surf-line-faint bg-surf-well p-3"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <RangeEnd
              kind={openRange}
              end="from"
              range={filters[openRange]}
              bounds={openBounds}
              system={system}
              onChange={(range) => set({ [openRange]: range })}
            />
            <RangeEnd
              kind={openRange}
              end="to"
              range={filters[openRange]}
              bounds={openBounds}
              system={system}
              onChange={(range) => set({ [openRange]: range })}
            />
          </div>
          <button
            type="button"
            data-lock-exempt
            onClick={() => set({ [openRange]: null })}
            className="focus-ring-accent flex cursor-pointer items-center self-start text-[11px] font-bold text-surf-accent-ink coarse:min-h-11"
          >
            {openRange === "length" ? "Any length" : "Any nose rocker"}
          </button>
        </div>
      )}
    </div>
  );
}
