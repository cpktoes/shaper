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
 * What it shows (D-07): the list's intro; the old empty-list message when no blank is long enough
 * (E1, in place of the list); when blanks are listed but not one is thick enough, the old E2 / E3
 * message ABOVE the greyed cards (P-3); then FITS THIS BOARD and WON'T FIT THIS BOARD, each shortest
 * first. A greyed card's reason is the fit flag's own sentence (`blankReason`). The search filters the
 * cards already judged and never re-judges (11-UI-SPEC §2 state B). The list itself is judged ONCE,
 * by `blank-picker.tsx`, and handed in, so opening the popup costs no judging.
 *
 * Picking a card (D-08) puts that blank on the board exactly as a row of the old list did —
 * `pickBlank(record, verdict.placement)` — and closes the popup. On a locked board the popup still
 * opens and searches, but no card can be picked. Theme and units follow the app (D-05): the popup
 * has no control of its own for either.
 */

import { useMemo, useRef, useState, type RefObject } from "react";
import { SearchIcon, XIcon } from "lucide-react";
import { useDesign } from "@/components/design/design-store";
import { useControlsLocked } from "@/components/design/use-controls-locked";
import { useBlankMakers } from "@/components/blank-makers-provider";
import { useFitDefaults } from "@/components/fit-defaults-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useUnits } from "@/components/units-provider";
import { catalogsPhrase } from "@/lib/blanks/vendors";
import type { BlankRecord } from "@/lib/geometry/blank";
import { catalogueExtremes, longEnoughByMaker, type BlankVerdict } from "@/lib/geometry/blank-fit";
import {
  blankReason,
  emptyListMessage,
  listIntro,
  matchesBlankSearch,
  pickerBoardLine,
  pickerCounts,
} from "@/lib/geometry/blank-reasons";
import { silhouette } from "@/lib/geometry/screen-tiles";
import { cn } from "@/lib/utils";
import { BlankCard, type CardBoard } from "./blank-card";
import { useCenterFloorRules, type BlankListState } from "./use-blank-list";

/** The 10px/800 uppercase group label the datasheet's station headers use (as the old list's). */
const GROUP_LABEL_CLASS = "pb-1.5 text-[10px] font-extrabold uppercase tracking-architectural text-surf-ink-muted";

/** The 11px/700 text-link idiom, grown to 44px on a touch pointer. */
const TEXT_LINK_CLASS =
  "focus-ring-accent cursor-pointer text-left text-[11px] font-bold coarse:flex coarse:min-h-11 coarse:items-center";

/** Both phone layouts — an upright phone (width) and a phone held sideways (height) — fill the screen
 * and pad clear of the notch and the home bar. Two switches, written out once each, never a pointer. */
const FULL_SCREEN_CLASS = cn(
  "max-shell:inset-0 max-shell:max-w-none max-shell:rounded-none max-shell:ring-0",
  "max-shell:pt-[env(safe-area-inset-top)] max-shell:pr-[env(safe-area-inset-right)] max-shell:pb-[env(safe-area-inset-bottom)] max-shell:pl-[env(safe-area-inset-left)]",
  "[@media(max-height:500px)]:inset-0 [@media(max-height:500px)]:max-w-none [@media(max-height:500px)]:rounded-none [@media(max-height:500px)]:ring-0",
  "[@media(max-height:500px)]:pt-[env(safe-area-inset-top)] [@media(max-height:500px)]:pr-[env(safe-area-inset-right)] [@media(max-height:500px)]:pb-[env(safe-area-inset-bottom)] [@media(max-height:500px)]:pl-[env(safe-area-inset-left)]",
);

/** Is this card the board's own blank? Matched by vendor and name — the board carries a copy. */
function isSameBlank(a: Pick<BlankRecord, "vendor" | "name">, b: Pick<BlankRecord, "vendor" | "name"> | null) {
  return b !== null && a.vendor === b.vendor && a.name === b.name;
}

interface ListedCard {
  verdict: BlankVerdict;
  record: BlankRecord;
  group: "fits" | "wontFit";
}

export interface BlankPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The BLANK button — focus goes back to it when the popup closes. */
  buttonRef: RefObject<HTMLButtonElement | null>;
  /** The one judged list (`useBlankList`, called once by `blank-picker.tsx`). */
  state: BlankListState;
  query: string;
  onQueryChange: (query: string) => void;
  /** Opens the fit part of App Default Settings. Called only once the popup has finished closing,
   * so two modal dialogs are never open at once. */
  onChangeFitRules: () => void;
}

export function BlankPickerDialog({
  open,
  onOpenChange,
  buttonRef,
  state,
  query,
  onQueryChange,
  onChangeFitRules,
}: BlankPickerDialogProps) {
  const { system } = useUnits();
  const { blank, pickBlank, outline, outlineGeometry, foil } = useDesign();
  const { settings } = useFitDefaults();
  const { hidden } = useBlankMakers();
  const rules = useCenterFloorRules();
  const locked = useControlsLocked();
  const { list, board, prepared, allPrepared, recordOf } = state;
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

  // m in "{n} of {m} blanks" (P-4): every maker's blanks long enough for this board.
  const longEnough = useMemo(() => {
    let total = 0;
    for (const count of longEnoughByMaker(allPrepared, outline.length, settings.extraLength).values()) total += count;
    return total;
  }, [allPrepared, outline.length, settings.extraLength]);

  const all = useMemo<ListedCard[]>(
    () =>
      [
        ...list.fits.map((verdict) => ({ verdict, group: "fits" as const })),
        ...list.wontFit.map((verdict) => ({ verdict, group: "wontFit" as const })),
      ].map((card) => ({ ...card, record: recordOf.get(card.verdict.prepared) ?? card.verdict.prepared.record })),
    [list, recordOf],
  );
  const searching = query.trim() !== "";
  // The search filters the cards already judged — it never re-runs a verdict.
  const shown = searching ? all.filter((card) => matchesBlankSearch(card.record, query)) : all;
  const fits = shown.filter((card) => card.group === "fits");
  const wontFit = shown.filter((card) => card.group === "wontFit");

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

  const pick = (card: ListedCard) => {
    pickBlank(card.record, card.verdict.placement);
    onOpenChange(false);
  };

  const groups: { key: "fits" | "wontFit"; label: string; cards: ListedCard[] }[] = [
    { key: "fits", label: `FITS THIS BOARD · ${fits.length}`, cards: fits },
    { key: "wontFit", label: `WON'T FIT THIS BOARD · ${wontFit.length}`, cards: wontFit },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange} onOpenChangeComplete={openChangeComplete}>
      <DialogContent
        data-blank-picker
        showCloseButton={false}
        finalFocus={returnFocus ? buttonRef : false}
        className={cn(
          "inset-8 mx-auto flex w-auto max-w-[1180px] translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden border-surf-line-faint bg-surf-panel p-0 text-surf-ink sm:max-w-[1180px]",
          FULL_SCREEN_CLASS,
        )}
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
              {pickerCounts(shown.length, longEnough, fits.length)}
            </DialogDescription>
          </div>
        </div>

        <div className="border-b border-surf-line-faint px-4 py-2.5 max-shell:px-3 max-shell:py-2 [@media(max-height:500px)]:px-3 [@media(max-height:500px)]:py-1.5">
          <div className="relative">
            <SearchIcon
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-surf-ink-muted"
            />
            <Input
              type="search"
              data-lock-exempt
              aria-label="Search blanks"
              placeholder="Search — e.g. Marko, 6'2, EPS"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              className="pl-8"
            />
          </div>
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

          {searching && shown.length === 0 && all.length > 0 && (
            <div className="flex flex-col items-start gap-1">
              <div className="text-xs break-words text-surf-ink-muted">No blanks match &quot;{query}&quot;.</div>
              <button
                type="button"
                data-lock-exempt
                onClick={() => onQueryChange("")}
                className={cn(TEXT_LINK_CLASS, "text-surf-accent-ink")}
              >
                Clear Search
              </button>
            </div>
          )}

          {groups
            .filter((group) => group.cards.length > 0)
            .map((group) => (
              <section key={group.key}>
                <h3 className={GROUP_LABEL_CLASS}>{group.label}</h3>
                <ul
                  data-blank-group={group.key}
                  aria-label={group.label}
                  className="grid gap-2.5 [grid-template-columns:repeat(auto-fill,minmax(290px,1fr))]"
                >
                  {group.cards.map((card) => (
                    <BlankCard
                      key={`${card.record.vendor}|${card.record.name}`}
                      verdict={card.verdict}
                      record={card.record}
                      group={card.group}
                      reason={blankReason(card.verdict, board, rules, system)}
                      onBoard={isSameBlank(card.record, blank?.copy ?? null)}
                      board={cardBoard}
                      locked={locked}
                      system={system}
                      onPick={() => pick(card)}
                    />
                  ))}
                </ul>
              </section>
            ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
