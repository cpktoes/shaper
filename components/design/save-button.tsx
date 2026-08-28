"use client";

/**
 * D-05/D-08's Save control — one control in the top nav, visible on every design screen. It
 * carries four visual states driven entirely by the store's `saveStatus`/`isDirty` rather than
 * by local state, so it can never disagree with what the autosave effect (design-store.tsx) is
 * actually doing:
 *
 * - Before the first save (`modelId` still null): the filled primary "Save" button. This is the
 *   shaper's one deliberate action (D-08) — nothing autosaves until it lands a row to write over.
 * - In flight: "Saving…", muted, no spinner.
 * - Settled: "Saved" with a small accent check glyph — the one accent moment in this control.
 * - Failed: "Not saved" in warning-ink, itself clickable to retry immediately via `requestSave`.
 *
 * All four are short, fixed strings in a fixed-width slot so the nav layout never shifts as they
 * swap (UI-SPEC save-control).
 *
 * Signed out, pressing Save opens `SignInDialog` and, once the shaper signs in, continues
 * straight into the name prompt and the save they were reaching for — it never drops them back
 * on the screen to press Save again (UI-SPEC "Flow note").
 */

import { useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { CheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SignInDialog } from "@/components/auth/sign-in-dialog";
import { BoardNamePrompt } from "@/components/setup/board-name-prompt";
import { useDesign } from "@/components/design/design-store";
import { saveModel } from "@/app/design/actions";

export function SaveButton() {
  const { isSignedIn } = useUser();
  const { boardName, modelId, saveStatus, designSnapshotFields, markSaved, requestSave } = useDesign();
  const [signInOpen, setSignInOpen] = useState(false);
  const [namePromptOpen, setNamePromptOpen] = useState(false);
  // Only the button's own first-save request is "saving" here — once modelId exists, the
  // store's saveStatus is the single source of truth and this stays false.
  const [firstSaveInFlight, setFirstSaveInFlight] = useState(false);
  // Set when a signed-out shaper presses Save — consumed the moment isSignedIn flips to true so
  // the interrupted save resumes automatically instead of requiring a second click.
  const resumeSaveAfterSignIn = useRef(false);

  // The shaper's own first, deliberate save (D-08) — there is no modelId yet for the store's
  // autosave effect to target, so this calls saveModel directly and then hands the result to
  // markSaved, which sets modelId/boardName/dirty/saveStatus together so the nav shows "Saved"
  // on the very next render.
  const runFirstSave = async (name: string) => {
    setFirstSaveInFlight(true);
    try {
      // The snapshot must carry the name being saved, not the store's current (possibly still
      // empty) boardName — designSnapshotFields was assembled before the prompt closed.
      const { id } = await saveModel(modelId, name, { ...designSnapshotFields, boardName: name });
      markSaved(id, name);
    } finally {
      setFirstSaveInFlight(false);
    }
  };

  const startSave = () => {
    if (!isSignedIn) {
      resumeSaveAfterSignIn.current = true;
      setSignInOpen(true);
      return;
    }
    if (modelId !== null) {
      // Already has a home — this is a retry of a failed autosave/save, not the first save.
      requestSave();
      return;
    }
    const trimmed = boardName.trim();
    if (!trimmed) {
      setNamePromptOpen(true);
      return;
    }
    void runFirstSave(trimmed);
  };

  useEffect(() => {
    if (isSignedIn && resumeSaveAfterSignIn.current) {
      resumeSaveAfterSignIn.current = false;
      startSave();
    }
    // startSave reads current boardName/modelId/designSnapshotFields via closure; re-running
    // this effect on every render (not just on isSignedIn) would fire on unrelated state
    // changes, so the dependency list is deliberately narrow.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);

  // Before the first save, nothing in the store's saveStatus/isDirty machinery has ever run for
  // this board — the plain filled button is the only state a never-saved board can be in.
  if (modelId === null) {
    return (
      <>
        <Button onClick={startSave} disabled={firstSaveInFlight} aria-label="Save Board">
          {firstSaveInFlight ? "Saving…" : "Save"}
        </Button>
        <SignInDialog open={signInOpen} onOpenChange={setSignInOpen} />
        <BoardNamePrompt open={namePromptOpen} onOpenChange={setNamePromptOpen} onSave={runFirstSave} />
      </>
    );
  }

  if (saveStatus === "saving") {
    return (
      <span className="min-w-20 text-sm text-surf-ink-muted" aria-live="polite">
        Saving…
      </span>
    );
  }

  if (saveStatus === "error") {
    return (
      <button
        type="button"
        onClick={requestSave}
        className="min-w-20 text-left text-sm text-surf-warning-ink underline-offset-4 hover:underline"
        aria-live="polite"
      >
        Not saved
      </button>
    );
  }

  // saveStatus is "saved" (or, briefly before the very next edit, "idle") — either way the board
  // has a home and nothing failed, so this reads as the settled, reassuring state.
  return (
    <span className="flex min-w-20 items-center gap-1 text-sm text-surf-ink" aria-live="polite">
      <CheckIcon aria-hidden className="size-3.5 text-surf-accent-ink" />
      Saved
    </span>
  );
}
