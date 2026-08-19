"use client";

/**
 * D-07's replace-board confirmation. Wraps the generated `alert-dialog` primitives with the
 * fixed Copywriting Contract copy verbatim — no user-entered text ever appears here. Confirm is
 * styled destructive (the only place that color appears in this plan); cancel mutates nothing.
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

interface ReplaceBoardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function ReplaceBoardDialog({ open, onOpenChange, onConfirm }: ReplaceBoardDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Start a new design?</AlertDialogTitle>
          <AlertDialogDescription>
            This replaces your current board in progress. It hasn&apos;t been saved yet —
            saving arrives in Phase 2.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep Editing</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            Discard & Start New
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
