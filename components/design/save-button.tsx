"use client";

/**
 * D-05's Save control — one button in the top nav, visible on every design screen. This tracer
 * gives it exactly two visual states (resting filled, disabled in-flight); the full
 * Saving/Saved/Not-saved state machine and autosave are plan 02-02's job.
 *
 * Signed out, it opens the sign-in dialog and, once the shaper signs in, continues straight into
 * the save they were reaching for — it does not drop them back on the screen to press Save
 * again (UI-SPEC "Flow note").
 */

import { useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { SignInDialog } from "@/components/auth/sign-in-dialog";
import { BoardNamePrompt } from "@/components/setup/board-name-prompt";
import { useDesign } from "@/components/design/design-store";
import { saveModel } from "@/app/design/actions";

export function SaveButton() {
  const { isSignedIn } = useUser();
  const { boardName, modelId, designSnapshotFields, setModelId, setBoardName } = useDesign();
  const [signInOpen, setSignInOpen] = useState(false);
  const [namePromptOpen, setNamePromptOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  // Set when a signed-out shaper presses Save — consumed the moment isSignedIn flips to true so
  // the interrupted save resumes automatically instead of requiring a second click.
  const resumeSaveAfterSignIn = useRef(false);

  const runSave = async (name: string) => {
    setSaving(true);
    try {
      // The snapshot must carry the name being saved, not the store's current (possibly still
      // empty) boardName — designSnapshotFields was assembled before the prompt closed, and the
      // setBoardName below lands too late for this payload.
      const { id } = await saveModel(modelId, name, { ...designSnapshotFields, boardName: name });
      setModelId(id);
      // Without this, the store never learns the name typed into the prompt, so the very next
      // Save re-opens the name dialog as if the board were new (and a reopened board would come
      // back nameless, since the snapshot's boardName is what applyModel restores).
      setBoardName(name);
    } finally {
      setSaving(false);
    }
  };

  const startSave = () => {
    if (!isSignedIn) {
      resumeSaveAfterSignIn.current = true;
      setSignInOpen(true);
      return;
    }
    const trimmed = boardName.trim();
    if (!trimmed) {
      setNamePromptOpen(true);
      return;
    }
    void runSave(trimmed);
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

  return (
    <>
      <Button onClick={startSave} disabled={saving}>
        {saving ? "Saving…" : "Save"}
      </Button>
      <SignInDialog open={signInOpen} onOpenChange={setSignInOpen} mode="sign-in" />
      <BoardNamePrompt open={namePromptOpen} onOpenChange={setNamePromptOpen} onSave={runSave} />
    </>
  );
}
