"use client";

import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useControlsLocked } from "@/components/design/use-controls-locked";
import { cn } from "@/lib/utils";

/**
 * The popup Remove This Blank opens on ROCKER (quick 261018-ejc, 2026-10-18). The founder: "Removing it
 * keeps the rocker and foil at the five stations and re-draws the curve through them, for you to set by
 * hand can turn into a popup after clicking remove blank rather than taking up room on the controls."
 * So the sentence that used to sit under the link now lives here, and the blank goes only when the shaper
 * confirms: a stray tap on the link changes nothing.
 *
 * A controlled Base UI dialog with no trigger, in the shape of `WingDialInDialog`: a title, the
 * sentence, and two buttons — Cancel (outline) and Remove Blank (the accent fill, as on the wing popup;
 * not the red "destructive" look, because one undo brings a removed blank back with its placement and
 * fine-tune). There is no ✕: two buttons only. Cancel is first in the page order, so it is the one that
 * takes the focus when the popup opens and an Enter never removes by accident. Cancel, Esc and a click
 * outside all do the same thing — nothing — and focus goes back to `finalFocus`: the Remove This Blank
 * link, or, after a removal, the Pick a Blank button (the link has gone).
 *
 * Remove Blank is tied to the board lock (the link that opens this is disabled on a locked board, so
 * the popup cannot normally open; the button is tied to the lock as well). Cancel is view-only
 * (`data-lock-exempt`). No number appears here, so Rule 2 (units) is untouched. The shared dialog
 * already sizes itself for phones, stacks its footer below 640 dots, and grows its Buttons to 44 dots on
 * a finger.
 */
export function RemoveBlankDialog({
  open,
  onOpenChange,
  onConfirm,
  finalFocus,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  finalFocus?: ComponentProps<typeof DialogContent>["finalFocus"];
}) {
  const locked = useControlsLocked();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-remove-blank-dialog
        showCloseButton={false}
        finalFocus={finalFocus}
        className="border-surf-line-faint bg-surf-panel text-surf-ink sm:max-w-sm"
      >
        <DialogHeader>
          <DialogTitle className="text-surf-ink">Remove this blank?</DialogTitle>
          <DialogDescription>
            Removing it keeps the rocker and foil at the five stations and re-draws the curve through them, for you to set by hand.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" data-lock-exempt />}>Cancel</DialogClose>
          <Button
            type="button"
            disabled={locked}
            onClick={onConfirm}
            className={cn("border-surf-on-accent bg-surf-accent text-surf-on-accent hover:bg-surf-accent/85")}
          >
            Remove Blank
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
