"use client";

/**
 * The CUSTOMIZE ROCKER popup (quick 261016-mkb, sketch 016 D — the founder's pick, 2026-10-16).
 * Tracer version: one nose slider, Cancel and Use and save as a new blank.
 */

import { useState, type RefObject } from "react";
import { XIcon } from "lucide-react";
import { useDesign } from "@/components/design/design-store";
import { SliderRow } from "@/components/design/slider-row";
import { useControlsLocked } from "@/components/design/use-controls-locked";
import { useSavedBlanks } from "@/components/saved-blanks-provider";
import { useStarredBlanks } from "@/components/starred-blanks-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useUnits } from "@/components/units-provider";
import {
  blankStarIdentity,
  draftFloor,
  draftFromSpec,
  formatRockerNote,
  isNaturalSpec,
  specFromDraft,
  withDraftAmount,
  type RockerDraft,
} from "@/lib/geometry/custom-rocker";
import { customizeTitle, FOOTER_WORDS, rockerSliderName } from "@/lib/geometry/custom-rocker-text";
import { formatSignedMark, measureSlider } from "@/lib/geometry/measure-display";
import { inchesToMm, mm, mmToInches } from "@/lib/geometry/units";
import { cn } from "@/lib/utils";
import { FULL_SCREEN_CLASS, LARGE_DIALOG_CLASS } from "./blank-picker-dialog";

const PRIMARY_CLASS = "border-surf-on-accent bg-surf-accent text-surf-on-accent hover:bg-surf-accent/85";

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
  const { saveBlank } = useSavedBlanks();
  const { setStarred } = useStarredBlanks();
  const locked = useControlsLocked();
  const lengthMm = blank?.copy.lengthMm ?? mm(0);
  const [draft, setDraft] = useState<RockerDraft>(() => draftFromSpec(blank?.rocker, lengthMm));
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!blank || !preparedBlank) return null;

  const stepMm = system === "metric" ? mm(1) : inchesToMm(1 / 16);
  const spec = specFromDraft(draft, lengthMm);
  const natural = isNaturalSpec(spec);
  const custom = !isNaturalSpec(blank.rocker);
  const floor = draftFloor(preparedBlank, draft, "nose", 0, stepMm);
  const amount = draft.nose[0].amount;
  const slider = measureSlider(amount, { min: mmToInches(floor), max: 2 }, 1 / 16, 1, system);

  async function saveAsNew() {
    if (!blank) return;
    setBusy(true);
    const result = await saveBlank(blank.copy, spec);
    setBusy(false);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    setStarred(...blankStarIdentity(blank.copy, spec), true);
    setBlankRocker(spec);
    onClose();
  }

  return (
    <>
      <div className="flex items-start gap-3 border-b border-surf-line-faint px-4 py-3">
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
          <DialogDescription data-customize-rocker-note className="text-xs text-surf-ink-muted">
            {`${blank.copy.vendor} ${blank.copy.name} · ${natural ? "Natural" : formatRockerNote(spec)}`}
          </DialogDescription>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-3">
        <div className="text-[11px] font-extrabold tracking-architectural text-surf-ink-muted uppercase">Nose</div>
        <SliderRow
          label="Rocker"
          displayValue={formatSignedMark(amount, system)}
          value={slider.value}
          min={slider.min}
          max={slider.max}
          step={slider.step}
          disabled={locked}
          sliderLabel={rockerSliderName("nose", 0)}
          onValueChange={(v) => setDraft(withDraftAmount(preparedBlank, draft, "nose", 0, slider.toMm(v), stepMm))}
        />
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-surf-line-faint px-4 py-3">
        {message !== null && (
          <p role="status" className="mr-auto text-xs text-surf-ink-muted">
            {message}
          </p>
        )}
        <DialogClose render={<Button type="button" variant="ghost" data-lock-exempt className="coarse:min-h-11" />}>
          {FOOTER_WORDS.cancel}
        </DialogClose>
        {!natural && (
          <Button
            type="button"
            disabled={locked || busy}
            onClick={saveAsNew}
            className={cn(PRIMARY_CLASS, "coarse:min-h-11")}
          >
            {FOOTER_WORDS.saveNew}
          </Button>
        )}
      </div>
    </>
  );
}
