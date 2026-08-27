"use client";

/**
 * D-13's Delete confirmation — the only safety a deleted board gets in this phase, since there is
 * no trash and no undo. Structurally `replace-board-dialog.tsx`'s exact sibling: same `alert-
 * dialog` primitives, same destructive-action styling, cancel stays neutral. The one addition
 * this dialog needs beyond that shell is its own in-flight/error state, since a delete is a real
 * network round trip a rename-style form doesn't otherwise have to fail visibly here.
 */

import { useState } from "react";
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

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Named in the confirm's own title, per the Copywriting Contract — a shaper about to lose a
   * board forever should see, in the dialog itself, exactly which one. */
  boardName: string;
  /** Runs the actual delete; throws on failure. */
  onConfirm: () => Promise<void>;
}

export function DeleteConfirmDialog({ open, onOpenChange, boardName, onConfirm }: DeleteConfirmDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  // Same render-phase reset pattern as rename-dialog.tsx / sign-in-dialog.tsx: clears any error
  // or in-flight state a previous board's delete attempt left behind before this one opens.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setError(null);
      setDeleting(false);
    }
  }

  const handleConfirm = async () => {
    setError(null);
    setDeleting(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch {
      setError("Couldn't delete — try again.");
      setDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          {/* No truncate/nowrap here on purpose — a long board name wraps within the dialog's
              fixed width instead of widening or overflowing it. */}
          <AlertDialogTitle>Delete &quot;{boardName}&quot;?</AlertDialogTitle>
          <AlertDialogDescription>This can&apos;t be undone.</AlertDialogDescription>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => void handleConfirm()}
            disabled={deleting}
          >
            Delete Board
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
