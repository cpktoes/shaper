"use client";

import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * The pop-up the first wing opens (quick 261014-wii, 2026-10-14, D4, D7): a wing is dialled in
 * against the fins, so it points the shaper at FINS. Opens every time the board goes from no wings to
 * one, as sketched (D7 — the founder rules on "once per board" at the look). A controlled Base UI
 * dialog with no trigger, in `ExportPreviewDialog`'s own classes.
 */
export function WingDialInDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-surf-line-faint bg-surf-panel text-surf-ink sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-surf-ink">Dial in your wing placement</DialogTitle>
          <DialogDescription>
            Edit fin placement on the FINS page, then return to the TEMPLATE to fine tune the wing.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Link href="/design/fins" className={buttonVariants({ variant: "outline" })}>
            Open FINS
          </Link>
          <DialogClose
            render={
              <Button
                type="button"
                className={cn("border-surf-on-accent bg-surf-accent text-surf-on-accent hover:bg-surf-accent/85")}
              />
            }
          >
            Got it
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
