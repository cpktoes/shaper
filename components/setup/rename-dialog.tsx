"use client";

/**
 * D-13's Rename dialog — opened from a rack card's menu. Built on the same shadcn `Dialog`/
 * `Input` primitives as `board-name-prompt.tsx`, which this is a sibling of: same validation
 * (empty/whitespace refused inline before any Server Action runs), same in-flight/error
 * handling. Unlike the name prompt, this one pre-fills the field with the board's current name
 * and re-arms itself every time it opens for a (possibly different) board — see the `wasOpen`
 * comment below, the same render-phase reset pattern `sign-in-dialog.tsx` uses.
 *
 * No character cap or truncation on what a shaper types here — the name column is unbounded
 * text; long names are handled by the rack card's own truncation, not by shortening the input.
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface RenameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The board's current name — the field is pre-filled with this every time the dialog opens. */
  currentName: string;
  /** Runs the actual rename; throws on failure. */
  onRename: (name: string) => Promise<void>;
}

export function RenameDialog({ open, onOpenChange, currentName, onRename }: RenameDialogProps) {
  const [name, setName] = useState(currentName);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // Adjusted during render rather than in an effect (React's documented pattern for "reset
  // state when a prop changes" — see sign-in-dialog.tsx's identical `wasOpen` comparison): a
  // fresh open re-fills the field with whichever board this dialog now applies to and clears any
  // error/in-flight state a previous board's rename left behind.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setName(currentName);
      setError(null);
      setSaving(false);
    }
  }

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Board needs a name.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await onRename(trimmed);
      onOpenChange(false);
    } catch {
      setError("Couldn't save — check your connection and try again.");
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-surf-line-faint bg-surf-panel text-surf-ink sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-surf-ink">Rename board</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="rename-board-input" className="text-xs font-semibold text-surf-ink-muted">
            Board name
          </label>
          <Input
            id="rename-board-input"
            autoFocus
            onFocus={(e) => e.currentTarget.select()}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handleSubmit();
              }
            }}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button onClick={() => void handleSubmit()} disabled={saving}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
