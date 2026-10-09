"use client";

/**
 * D-05's name prompt — opened by `SaveButton` when a signed-in shaper saves an unnamed board.
 * Built on the new shadcn `Dialog`/`Input` primitives, styled to match
 * `replace-board-dialog.tsx`'s surfaces. Copy is verbatim from the UI-SPEC Copywriting Contract.
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

interface BoardNamePromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Runs the actual save; throws on failure. */
  onSave: (name: string) => Promise<void>;
  /**
   * What the field holds each time the prompt opens (quick 261008-raw): the tab band's "Untitled"
   * opens it with whatever name was already typed into SUMMARY's Board Name box, so nothing the
   * shaper wrote is lost. Omitted (the top bar's Save), the field starts empty as it always has.
   */
  initialName?: string;
}

export function BoardNamePrompt({ open, onOpenChange, onSave, initialName = "" }: BoardNamePromptProps) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // Re-filled on every open, adjusted during render (the same pattern as rename-dialog.tsx's
  // `wasOpen`): the existing reset on close below still clears a stale name for the no-initial case.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setName(initialName);
      setError(null);
      setSaving(false);
    }
  }

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
    if (!next) {
      // Reset for the next time this prompt opens — a stale name or error from a previous,
      // possibly different, board must never carry over.
      setName("");
      setError(null);
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Board needs a name.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await onSave(trimmed);
      handleOpenChange(false);
    } catch {
      setError("Couldn't save — check your connection and try again.");
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="border-surf-line-faint bg-surf-panel text-surf-ink sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-surf-ink">Name this board</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="board-name-input" className="text-xs font-semibold text-surf-ink-muted">
            Board name
          </label>
          <Input
            id="board-name-input"
            autoFocus
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. 6'2 Fish"
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
