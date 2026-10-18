"use client";

/**
 * The CUSTOMIZE ROCKER popup (quick 261016-mkb, sketch 016 D — the founder's pick, 2026-10-16: "This
 * now looks perfect. Let's build it."). A shaper sets the blank's rocker the way they order it from
 * the maker, sees in real time what each change does to the foam, and keeps it as a blank of their own.
 *
 * Styled like PICK A BLANK (D-04): the same dialog surface and the same size rule —
 * `LARGE_DIALOG_CLASS` and `FULL_SCREEN_CLASS`, exported by `blank-picker-dialog.tsx` and shared, never
 * copied: 32 px in from each edge of a computer's window, never wider than 1180; the whole screen on an
 * upright phone (width, `max-shell:`) and on a phone held sideways (height, the inline short-screen
 * rule). Laid out like the ROCKER page (P-12): the rows on the left, scrolling; the drawing beside them
 * in a card like a picker card; on an upright phone the drawing pinned on top, at most 45% of the
 * screen's height, with the rows scrolling beneath — "exactly as the page does". On a phone held
 * sideways the rows column narrows to 300 and the drawing column may scroll, as the page's does. The
 * phone chrome is tightened under both phone rules with the same values; the pointer only sizes the
 * controls (44-dot boxes), never the layout.
 *
 * The header: CUSTOMIZE ROCKER (or EDIT CUSTOM ROCKER once the board's blank carries one), the blank's
 * maker and name, and the draft's note coloured the US Blanks way — first changes red, second blue
 * (D-07). The note is always in inches, the maker's order code (D-01).
 *
 * The footer (D-09): Cancel · Use and edit current blank (only when the board's blank already carries
 * a custom rocker) · Use and save as a new blank, the primary; a draft put back to natural offers
 * only Use the natural rocker. Saving puts the blank in the shaper's own list (their account signed
 * in, this browser signed out) and stars it, and ONLY THEN sets the board's rocker — one undo step —
 * so the board never changes when a save fails (T-mkb-09); a refusal is said in the footer and the
 * popup stays open. An identical saved blank is reused, never saved twice (P-15). Cancel, Esc, ✕ and a
 * click outside change nothing: the draft is dropped with the popup.
 *
 * One spec in, one drawing out (the founder's round-ten catch): the draft becomes ONE spec here,
 * once per change, and that spec bends the blank, draws the overlay, writes the note and is what a
 * save keeps.
 *
 * Each opening re-seeds the draft from the board (`draftFromSpec`) and starts with Show my board off:
 * the body is keyed on the opening's `session`, so it mounts fresh every time.
 */

import { useMemo, useState, type RefObject } from "react";
import { XIcon } from "lucide-react";
import { useDesign } from "@/components/design/design-store";
import { useControlsLocked } from "@/components/design/use-controls-locked";
import { useSavedBlanks } from "@/components/saved-blanks-provider";
import { useStarredBlanks } from "@/components/starred-blanks-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useUnits } from "@/components/units-provider";
import {
  blankStarIdentity,
  draftFromSpec,
  isNaturalSpec,
  NATURAL_DRAFT,
  rockerNoteParts,
  specFromDraft,
  withCustomRocker,
  type BlankRockerSpec,
  type RockerDraft,
} from "@/lib/geometry/custom-rocker";
import { customizeTitle, FOOTER_WORDS } from "@/lib/geometry/custom-rocker-text";
import { starKey } from "@/lib/starred-blanks-preference";
import { cn } from "@/lib/utils";
import { FULL_SCREEN_CLASS, LARGE_DIALOG_CLASS } from "./blank-picker-dialog";
import { CustomRockerDrawing } from "./custom-rocker-drawing";
import { CustomRockerRows } from "./custom-rocker-rows";

/** The primary button: `wing-dial-in-dialog.tsx`'s accent fill. */
const PRIMARY_CLASS = "border-surf-on-accent bg-surf-accent text-surf-on-accent hover:bg-surf-accent/85";
/** Every footer button: explicit flex for older Safari, a 44-dot box on a finger. */
const FOOTER_BUTTON_CLASS = "inline-flex items-center coarse:min-h-11";
const NOTE_TONE = { 1: "text-rocker-adjust-1", 2: "text-rocker-adjust-2" } as const;
const NATURAL_SPEC: BlankRockerSpec = { changes: [] };

export interface CustomizeRockerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Bumped on every opening, so the draft re-seeds from the board each time. */
  session: number;
  buttonRef: RefObject<HTMLButtonElement | null>;
}

export function CustomizeRockerDialog({ open, onOpenChange, session, buttonRef }: CustomizeRockerDialogProps) {
  const { blank } = useDesign();
  if (!blank) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-customize-rocker-dialog
        showCloseButton={false}
        finalFocus={buttonRef}
        className={cn(LARGE_DIALOG_CLASS, FULL_SCREEN_CLASS)}
      >
        <CustomizeRockerBody key={session} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function CustomizeRockerBody({ onClose }: { onClose: () => void }) {
  const { system } = useUnits();
  const { blank, preparedBlank, setBlankRocker } = useDesign();
  const { saveBlank, updateBlank, findSaved } = useSavedBlanks();
  const { setStarred } = useStarredBlanks();
  const locked = useControlsLocked();
  const [draft, setDraft] = useState<RockerDraft>(() => (blank ? draftFromSpec(blank.rocker, blank.copy.lengthMm) : NATURAL_DRAFT));
  const [showBoard, setShowBoard] = useState(false);
  // The phone's Dimensions switch (quick 261017-ojc, D-07, P-10): On every time the popup opens, like
  // Show my board is Off — this body is keyed on each opening, so neither is remembered.
  const [dimensions, setDimensions] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // THE one spec (one spec in, one drawing out): the draft's, normalised once per change.
  const lengthMm = blank?.copy.lengthMm;
  const draftSpec = useMemo(
    () => (lengthMm === undefined ? NATURAL_SPEC : specFromDraft(draft, lengthMm)),
    [draft, lengthMm],
  );
  const bent = useMemo(() => (preparedBlank ? withCustomRocker(preparedBlank, draftSpec) : null), [preparedBlank, draftSpec]);

  if (!blank || !preparedBlank || !bent) return null;
  const copy = blank.copy;
  const natural = isNaturalSpec(draftSpec);
  const custom = !isNaturalSpec(blank.rocker);
  const parts = rockerNoteParts(draftSpec);

  /** Runs a save, then — only once it succeeded — the stars and the board. */
  async function run(write: () => Promise<{ ok: true } | { ok: false; message: string }>, after: () => void) {
    setBusy(true);
    setMessage(null);
    const result = await write();
    setBusy(false);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    after();
    setBlankRocker(draftSpec);
    onClose();
  }

  const saveAsNew = () =>
    run(
      () => saveBlank(copy, draftSpec),
      () => setStarred(...blankStarIdentity(copy, draftSpec), true),
    );

  const editCurrent = () => {
    const current = findSaved(copy, blank.rocker);
    return run(
      () => (current ? updateBlank(current.id, copy, draftSpec) : saveBlank(copy, draftSpec)),
      () => {
        const before = blankStarIdentity(copy, blank.rocker);
        const after = blankStarIdentity(copy, draftSpec);
        if (starKey(...before) !== starKey(...after)) setStarred(...before, false);
        setStarred(...after, true);
      },
    );
  };

  const useNatural = () => {
    setBlankRocker(undefined);
    onClose();
  };

  return (
    <>
      <div className="flex items-start gap-3 border-b border-surf-line-faint px-4 py-3 max-shell:px-3 max-shell:py-2 [@media(max-height:500px)]:px-3 [@media(max-height:500px)]:py-2">
        {/* DOM-first, so it is what takes focus on open. */}
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
            {customizeTitle(custom)}
          </DialogTitle>
          <DialogDescription data-customize-rocker-note className="text-xs text-surf-ink-muted max-shell:basis-full">
            {`${copy.vendor} ${copy.name} · `}
            {natural ? (
              "Natural"
            ) : (
              parts.map((part, i) => (
                <span key={i} data-rocker-note-part={part.order} className={NOTE_TONE[part.order]}>
                  {i > 0 ? " " : ""}
                  {part.text}
                </span>
              ))
            )}
          </DialogDescription>
        </div>
      </div>

      <div
        data-customize-rocker-body
        className="flex min-h-0 flex-1 flex-row gap-3 p-3 max-shell:flex-col max-shell:gap-2 max-shell:p-2 [@media(max-height:500px)]:gap-2 [@media(max-height:500px)]:p-2"
      >
        <div
          data-customize-rocker-rows
          className="w-[340px] shrink-0 overflow-y-auto pr-1 max-shell:min-h-0 max-shell:w-auto max-shell:flex-1 max-shell:overflow-y-auto [@media(max-height:500px)]:w-[300px]"
        >
          <CustomRockerRows prepared={preparedBlank} draft={draft} onDraftChange={setDraft} system={system} />
        </div>
        <div
          data-customize-rocker-drawing-column
          className="flex min-h-0 min-w-0 flex-1 flex-col max-shell:order-first max-shell:h-[45dvh] max-shell:flex-none [@media(max-height:500px)]:overflow-y-auto"
        >
          <CustomRockerDrawing
            bent={bent}
            draftSpec={draftSpec}
            showBoard={showBoard}
            onShowBoardChange={setShowBoard}
            dimensions={dimensions}
            onDimensionsChange={setDimensions}
          />
        </div>
      </div>

      <div
        data-customize-rocker-footer
        className="flex flex-wrap items-center justify-end gap-2 border-t border-surf-line-faint px-4 py-3 max-shell:px-3 max-shell:py-2 [@media(max-height:500px)]:px-3 [@media(max-height:500px)]:py-2">
        {message !== null && (
          <p role="status" className="mr-auto basis-full text-xs text-surf-ink sm:basis-auto">
            {message}
          </p>
        )}
        <DialogClose render={<Button type="button" variant="ghost" data-lock-exempt className={cn(FOOTER_BUTTON_CLASS, "mr-auto")} />}>
          {FOOTER_WORDS.cancel}
        </DialogClose>
        {natural ? (
          <Button type="button" disabled={locked || busy} onClick={useNatural} className={cn(PRIMARY_CLASS, FOOTER_BUTTON_CLASS)}>
            {FOOTER_WORDS.useNatural}
          </Button>
        ) : (
          <>
            {custom && (
              <Button type="button" variant="outline" disabled={locked || busy} onClick={editCurrent} className={FOOTER_BUTTON_CLASS}>
                {FOOTER_WORDS.editCurrent}
              </Button>
            )}
            <Button type="button" disabled={locked || busy} onClick={saveAsNew} className={cn(PRIMARY_CLASS, FOOTER_BUTTON_CLASS)}>
              {FOOTER_WORDS.saveNew}
            </Button>
          </>
        )}
      </div>
    </>
  );
}
