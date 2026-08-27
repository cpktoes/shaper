"use client";

/**
 * D-07's replace-board confirmation, generalized in this phase to also gate D-10 (opening a
 * saved board while one is already in progress) — one consistent rule everywhere a board gets
 * swapped out. Wraps the generated `alert-dialog` primitives with the fixed Copywriting
 * Contract copy verbatim — no user-entered text ever appears here. Confirm is styled destructive
 * (the only place that color appears in this plan); cancel mutates nothing.
 *
 * The description used to promise saving was a future feature, which is now false — a shaper
 * reading this dialog could have saved already. RESEARCH.md Pitfall 4 flags this exact
 * staleness; the generalized wording below replaces it for both modes.
 */

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ReplaceBoardDialogMode = "preset" | "open-saved";

const COPY: Record<ReplaceBoardDialogMode, { title: string; action: string; verb: string }> = {
  preset: { title: "Start a new design?", action: "Discard & Start New", verb: "starting new" },
  "open-saved": { title: "Open this board?", action: "Discard & Open", verb: "opening this board" },
};

interface ReplaceBoardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  mode?: ReplaceBoardDialogMode;
}

export function ReplaceBoardDialog({
  open,
  onOpenChange,
  onConfirm,
  mode = "preset",
}: ReplaceBoardDialogProps) {
  const copy = COPY[mode];
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{copy.title}</AlertDialogTitle>
          <AlertDialogDescription>
            This replaces your board in progress. It hasn&apos;t been saved — {copy.verb} will
            lose it.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep Editing</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            {copy.action}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
