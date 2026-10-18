"use client";

/**
 * The BLANK section of the ROCKER sidebar (Phase 11, D-04–D-08; 11-UI-SPEC §2, §6, §7) — since quick
 * 261015-ve9 (sketch 015 B, the founder's pick, 2026-10-15) ONE button that opens the PICK A BLANK
 * popup, where every blank long enough for the board is a drawn catalogue card
 * (`blank-picker-dialog.tsx`).
 *
 * The page hands this a promise of the pickable catalogue, NOT awaited on the server (11-RESEARCH
 * Pattern 8). Only the button's own line waits for it, inside its own Suspense boundary, so the
 * title, the centre control, the placement slider and the drawing never wait on the catalogue. The
 * loader never rejects: a catalogue that didn't load resolves to `unavailable`, the button says so
 * and the popup says why (E4) — a board that already has a blank keeps working from its own copy
 * (D-01).
 *
 * The button (D-01):
 * - With a blank: a small drawing of the board's own blank (outline over rocker), its name and
 *   litres, its maker · length · center line, and CHANGE BLANK ›. Drawn from the board's own copy,
 *   so it is there the moment the board loads, even when the catalogue is not. Beneath it, exactly as
 *   before: the fit flag (`blank-flag.tsx`) and Remove This Blank, which opens a confirm popup
 *   (`remove-blank-dialog.tsx`, quick 261018-ejc) carrying the sentence that used to sit under it.
 * - With none: PICK A BLANK, a line like "196 blanks long enough for this board, 194 fit" (the makers
 *   ticked in Settings), and BROWSE BLANKS ›.
 * Under it, only when a maker is unticked in Settings, the "Showing … only" note (P-5). The founder's
 * catalog note no longer sits here: it is at the foot of the DATASHEET and of the PICK A BLANK popup
 * (quick 261018-ejc).
 *
 * The list is judged ONCE here (`useBlankList`) and handed to both the button's counts and the popup,
 * so opening the popup never re-judges the catalogue. The popup's open state and its search are held
 * here, so the search, the ranges, Starred only and the sort survive closing and reopening during the
 * visit (D-13). Nothing here ever clears the pick
 * on its own — only the shaper's own tap on Remove Blank in that popup, or on another blank, does (D-08).
 *
 * Every number goes through `lib/geometry/measure-display.ts` by way of the sentences in
 * `lib/geometry/blank-reasons.ts` (CLAUDE.md Rule 2). Catalogue text is rendered as React text only
 * (T-11-32).
 *
 * Touch (§15): the button is at least 44 dots tall on a touch pointer, and every text link grows its
 * row, not its glyph, with `coarse:min-h-11 coarse:flex coarse:items-center`. Nothing here reads
 * width or height; the popup's size does (`blank-picker-dialog.tsx`).
 */

import { Suspense, use, useRef, useState, type ReactNode, type RefObject } from "react";
import { useDesign } from "@/components/design/design-store";
import { useControlsLocked } from "@/components/design/use-controls-locked";
import { useBlankMakers } from "@/components/blank-makers-provider";
import { useAppSettings } from "@/components/app-settings-provider";
import { SavedBlanksProvider, useSavedBlanks } from "@/components/saved-blanks-provider";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useUnits } from "@/components/units-provider";
import { blankMakersNote, catalogsPhrase } from "@/lib/blanks/vendors";
import type { BlankCatalogResult } from "@/lib/db/blanks";
import type { BlankRecord } from "@/lib/geometry/blank";
import { catalogueExtremes } from "@/lib/geometry/blank-fit";
import { blankDisplayLines, isNaturalSpec } from "@/lib/geometry/custom-rocker";
import type { SavedBlanksAccount } from "@/lib/saved-blanks-preference";
import { EMPTY_BROWSE_FILTERS, type BlankBrowseFilters, type BlankSort, type RangeKind } from "@/lib/geometry/blank-browse";
import { blankRowMeta, blankRowVolume, emptyListMessage, pickBlankSummary } from "@/lib/geometry/blank-reasons";
import { cn } from "@/lib/utils";
import { BlankThumbnail } from "./blank-card";
import { BlankFlag } from "./blank-flag";
import { RemoveBlankDialog } from "./remove-blank-dialog";
import { BlankPickerDialog, type BlankBrowseState } from "./blank-picker-dialog";
import { CustomizeRockerButton, CustomizeRockerSection } from "./customize-rocker";
import { useBlankList, useCenterFloorRules } from "./use-blank-list";

/** The 11px/700 "↺ Reset" text-link idiom (`rail-controls.tsx`), grown to 44px on a touch pointer. */
const TEXT_LINK_CLASS =
  "focus-ring-accent cursor-pointer text-left text-[11px] font-bold coarse:flex coarse:min-h-11 coarse:items-center";

/** The button's call to action, the sketch's `.go`: 11px bold uppercase tracked accent ink. */
const GO_CLASS = "mt-0.5 text-[11px] font-bold tracking-architectural text-surf-accent-ink uppercase";

interface BlankButtonProps {
  buttonRef: RefObject<HTMLButtonElement | null>;
  /** The line under "Pick a Blank" with no blank picked. */
  line: ReactNode;
  /** True once the streamed catalogue has arrived and the list is judged — what the browser tests wait on. */
  ready: boolean;
  /** False only while the catalogue is still on its way: there is nothing to browse yet. */
  canOpen: boolean;
  onOpen: () => void;
}

/** The BLANK section's one button (D-01) — the board's own blank, or Pick a Blank. */
function BlankButton({ buttonRef, line, ready, canOpen, onOpen }: BlankButtonProps) {
  const { system } = useUnits();
  const { blank, preparedBlank } = useDesign();
  const picked = blank !== null;
  const volume = picked ? blankRowVolume(blank.copy) : null;
  return (
    <button
      ref={buttonRef}
      type="button"
      data-lock-exempt
      data-blank-button
      data-catalog-ready={ready ? "" : undefined}
      data-picked-blank={picked ? "" : undefined}
      aria-haspopup="dialog"
      disabled={!canOpen}
      onClick={onOpen}
      className={cn(
        "focus-ring-accent flex w-full cursor-pointer items-center gap-2.5 rounded-md border border-surf-line px-2.5 py-2 text-left text-surf-ink coarse:min-h-11",
        "enabled:hover:border-surf-ink-muted disabled:cursor-default",
        // The 2px accent bar of the old picked card.
        picked && "border-l-2 border-l-surf-accent-ink bg-surf-well",
      )}
    >
      {picked && preparedBlank && <BlankThumbnail prepared={preparedBlank} />}
      <span className="flex min-w-0 flex-1 flex-col items-stretch gap-0.5">
        {picked ? (
          <>
            <span className="flex w-full items-baseline gap-2">
              <span data-blank-name className="min-w-0 flex-1 text-sm leading-tight font-semibold text-surf-ink">
                {blank.copy.name}
              </span>
              {volume !== null && <span className="shrink-0 text-xs text-surf-ink-muted">{volume}</span>}
            </span>
            {/* The blank's rocker on its own line (quick 261016-mkb, D-02): `Natural` written out, or
                the note as ordered from the maker — in inches in both systems (D-01). The name line
                above keeps the name alone, as every browser test reads it. */}
            <span data-blank-rocker className="text-xs leading-tight text-surf-ink tabular-nums">
              {blankDisplayLines(blank.copy, blank.rocker)[1]}
            </span>
            <span className="text-xs text-surf-ink-muted">{blankRowMeta(blank.copy, system)}</span>
            <span className={GO_CLASS}>
              Change Blank <span aria-hidden>›</span>
            </span>
          </>
        ) : (
          <>
            <span className="text-sm leading-tight font-semibold text-surf-ink">Pick a Blank</span>
            <span data-blank-button-line className="text-xs text-surf-ink-muted">
              {line}
            </span>
            <span className={GO_CLASS}>
              Browse Blanks <span aria-hidden>›</span>
            </span>
          </>
        )}
      </span>
    </button>
  );
}

interface HostProps {
  catalog: Promise<BlankCatalogResult>;
  /** The shaper's own saved blanks (quick 261016-mkb), streamed beside the catalogue. */
  savedBlanks: Promise<SavedBlanksAccount>;
  open: boolean;
  setOpen: (open: boolean) => void;
  buttonRef: RefObject<HTMLButtonElement | null>;
  /** The popup's filters, sort and open range drawer — view state for the visit (D-13). */
  browse: BlankBrowseState;
  onChangeFitRules: () => void;
}

/** The popup body when the catalogue didn't load (E4), with the popup's own title. */
function UnavailableDialog({ open, setOpen, buttonRef }: Pick<HostProps, "open" | "setOpen" | "buttonRef">) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent data-blank-picker finalFocus={buttonRef} className="border-surf-line-faint bg-surf-panel text-surf-ink">
        <DialogTitle className="text-sm font-extrabold tracking-architectural text-surf-ink uppercase">Pick a Blank</DialogTitle>
        <DialogDescription render={<div />} className="flex flex-col gap-1" data-blank-catalog-unavailable>
          <span className="text-sm font-semibold text-surf-ink">The blank catalog didn&apos;t load.</span>
          <span className="text-xs text-surf-ink-muted">
            Your board is fine — the blank you picked travels with it. Reload the page to see the list again.
          </span>
        </DialogDescription>
      </DialogContent>
    </Dialog>
  );
}

/** Reads the streamed catalogue and the shaper's saved blanks (suspends until both arrive) and judges
 * the list ONCE, for the button and the popup together. Since quick 261016-mkb the Customize Rocker
 * button sits right under the BLANK button (D-04), inside the saved blanks' provider with it. */
function BlankPickerHost({ catalog, savedBlanks, open, setOpen, buttonRef, browse, onChangeFitRules }: HostProps) {
  const result = use(catalog);
  const saved = use(savedBlanks);
  return (
    <SavedBlanksProvider account={saved}>
      {result.status === "unavailable" ? (
        <>
          <BlankButton
            buttonRef={buttonRef}
            line="The blank catalog didn't load."
            ready
            canOpen
            onOpen={() => setOpen(true)}
          />
          <UnavailableDialog open={open} setOpen={setOpen} buttonRef={buttonRef} />
        </>
      ) : (
        <JudgedPicker
          records={result.blanks}
          open={open}
          setOpen={setOpen}
          buttonRef={buttonRef}
          browse={browse}
          onChangeFitRules={onChangeFitRules}
        />
      )}
      <CustomizeRockerSection />
    </SavedBlanksProvider>
  );
}

function JudgedPicker({
  records,
  open,
  setOpen,
  buttonRef,
  browse,
  onChangeFitRules,
}: Omit<HostProps, "catalog" | "savedBlanks"> & { records: readonly BlankRecord[] }) {
  const { system } = useUnits();
  const { outline, foil } = useDesign();
  const { hidden } = useBlankMakers();
  const rules = useCenterFloorRules();
  // The shaper's saved blanks are judged beside the catalogue for the popup's cards (quick 261016-mkb,
  // D-09); the button's count line below still reads the catalogue's list alone (P-19).
  const { blanks: savedBlanks } = useSavedBlanks();
  const state = useBlankList(records, savedBlanks);
  const { list, prepared } = state;
  // With no blank picked the button's line counts the makers ticked in Settings (P-4); with every
  // blank too short it reads E1's heading, the popup's own empty message.
  let line: string;
  if (list.emptyReason !== null) {
    const { longest, thickestCenter } = catalogueExtremes(prepared);
    line = emptyListMessage(
      list.emptyReason,
      { boardLength: outline.length, longest, centre: foil.center, thickestCenter, rules },
      system,
      catalogsPhrase(hidden),
    ).heading;
  } else {
    line = pickBlankSummary(list.fits.length + list.wontFit.length, list.fits.length);
  }
  return (
    <>
      <BlankButton buttonRef={buttonRef} line={line} ready canOpen onOpen={() => setOpen(true)} />
      <BlankPickerDialog
        open={open}
        onOpenChange={setOpen}
        buttonRef={buttonRef}
        state={state}
        browse={browse}
        onChangeFitRules={onChangeFitRules}
      />
    </>
  );
}

export function BlankPicker({
  catalog,
  savedBlanks,
}: {
  catalog: Promise<BlankCatalogResult>;
  savedBlanks: Promise<SavedBlanksAccount>;
}) {
  const { blank, removeBlank } = useDesign();
  const { hidden } = useBlankMakers();
  const { openAppSettings } = useAppSettings();
  const locked = useControlsLocked();
  /** The popup — view state, never saved. Held here so it, the search, the ranges, Starred only and
   * the sort survive the catalogue's Suspense boundary and closing and reopening the popup while
   * ROCKER is open (D-13: only Flat / Upright and Show my board outlast the visit). */
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState<BlankBrowseFilters>(EMPTY_BROWSE_FILTERS);
  const [sort, setSort] = useState<BlankSort>("length");
  const [openRange, setOpenRange] = useState<RangeKind | null>(null);
  const browse: BlankBrowseState = { filters, setFilters, sort, setSort, openRange, setOpenRange };
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  // Remove This Blank asks first (quick 261018-ejc): the confirm popup's open state, the link that
  // opens it, and whether it closed because the blank was removed.
  const [removeOpen, setRemoveOpen] = useState(false);
  const removeLinkRef = useRef<HTMLButtonElement | null>(null);
  const removedRef = useRef(false);
  const makersNote = blankMakersNote(hidden);

  // Where focus goes when the confirm popup closes: back on the Remove This Blank link, or — once the
  // blank is gone and the link with it — on the BLANK button, which now reads Pick a Blank.
  function removeFinalFocus() {
    return removedRef.current ? buttonRef.current : removeLinkRef.current;
  }

  // Change Fit Rules (E1, P-3): the popup closes itself first and calls this once it has gone —
  // two modal dialogs must never be open at once.
  const changeFitRules = () => openAppSettings("fit");

  return (
    <div className="flex flex-col gap-2">
      <Suspense
        fallback={
          <>
            <BlankButton buttonRef={buttonRef} line="Loading blanks…" ready={false} canOpen={false} onOpen={() => {}} />
            {/* The same Customize Rocker button, not yet live, so the sidebar never jumps. */}
            {blank && <CustomizeRockerButton custom={!isNaturalSpec(blank.rocker)} waiting />}
          </>
        }
      >
        <BlankPickerHost
          catalog={catalog}
          savedBlanks={savedBlanks}
          open={open}
          setOpen={setOpen}
          buttonRef={buttonRef}
          browse={browse}
          onChangeFitRules={changeFitRules}
        />
      </Suspense>

      {blank && (
        <>
          <BlankFlag catalog={catalog} />
          <div className="flex flex-wrap gap-2">
            <button
              ref={removeLinkRef}
              type="button"
              disabled={locked}
              onClick={() => {
                removedRef.current = false;
                setRemoveOpen(true);
              }}
              className={cn(TEXT_LINK_CLASS, "text-surf-ink-muted disabled:cursor-default disabled:opacity-40")}
            >
              Remove This Blank
            </button>
          </div>
        </>
      )}

      {/* Outside the blank-only block, so the removal can never unmount it mid-close. */}
      <RemoveBlankDialog
        open={removeOpen}
        onOpenChange={setRemoveOpen}
        onConfirm={() => {
          removedRef.current = true;
          removeBlank();
          setRemoveOpen(false);
        }}
        finalFocus={removeFinalFocus}
      />

      {/* Only when a maker is unticked in the settings menu (P-5) — with all ticked nothing is drawn. */}
      {makersNote !== null && (
        <div data-blank-makers-note className="text-xs text-surf-ink-muted font-normal">
          {makersNote}
        </div>
      )}
    </div>
  );
}
