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

// Quick 261103-k8o (2026-11-03, PC10): a third mode, `open-file`, for a board file picked with Open a
// board file… on the home page while a board is in progress. The file is read before this asks, so a
// file that can't open never gets here.
type ReplaceBoardDialogMode = "preset" | "open-saved" | "open-file";

const COPY: Record<ReplaceBoardDialogMode, { title: string; action: string; verb: string }> = {
  preset: { title: "Start a new design?", action: "Discard & Start New", verb: "starting new" },
  "open-saved": { title: "Open this board?", action: "Discard & Open", verb: "opening this board" },
  "open-file": { title: "Open this board file?", action: "Discard & Open", verb: "opening this file" },
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
