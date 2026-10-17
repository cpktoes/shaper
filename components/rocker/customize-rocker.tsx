"use client";

/**
 * The Customize Rocker button (quick 261016-mkb, sketch 016 D — the founder's pick, 2026-10-16, D-04):
 * ONE button right under the BLANK button, above the fit flag and Remove This Blank — "Move the
 * customize rocker button underneath the choose blank card" — reading `Customize Rocker ›`, or
 * `Edit Custom Rocker ›` once the board's blank carries a custom rocker. It opens the CUSTOMIZE ROCKER
 * popup (`customize-rocker-dialog.tsx`), whose open state is held here.
 *
 * Only drawn when the board has a blank (a hand-set board has no blank to bend). Disabled on a locked
 * board, like every control that changes the board (`useControlsLocked`). While the catalogue and the
 * saved blanks are still on their way, `BlankPicker`'s Suspense fallback draws the same button,
 * disabled (`CustomizeRockerButton` with `waiting`), so the sidebar never jumps when they arrive.
 */

import { useRef, useState, type Ref } from "react";
import { useDesign } from "@/components/design/design-store";
import { useControlsLocked } from "@/components/design/use-controls-locked";
import { Button } from "@/components/ui/button";
import { isNaturalSpec } from "@/lib/geometry/custom-rocker";
import { customizeButtonLabel } from "@/lib/geometry/custom-rocker-text";
import { CustomizeRockerDialog } from "./customize-rocker-dialog";

interface CustomizeRockerButtonProps {
  ref?: Ref<HTMLButtonElement>;
  /** Whether the board's blank already carries a custom rocker — the button's words. */
  custom: boolean;
  /** True while the lists are still on their way (the Suspense fallback): drawn, not yet live. */
  waiting?: boolean;
  onOpen?: () => void;
}

/** The button itself: full width, a 44-dot box on a finger, its `›` hidden from a screen reader. */
export function CustomizeRockerButton({ ref, custom, waiting = false, onOpen }: CustomizeRockerButtonProps) {
  const locked = useControlsLocked();
  return (
    <Button
      ref={ref}
      type="button"
      variant="outline"
      data-customize-rocker
      aria-haspopup="dialog"
      disabled={locked || waiting}
      onClick={onOpen}
      className="focus-ring-accent flex w-full items-center justify-between border-surf-line bg-transparent text-surf-ink hover:border-surf-ink-muted coarse:min-h-11"
    >
      <span>{customizeButtonLabel(custom)}</span>
      <span aria-hidden>›</span>
    </Button>
  );
}

/** The button and its popup — rendered by `BlankPickerHost` right after the BLANK button. */
export function CustomizeRockerSection() {
  const { blank } = useDesign();
  const [open, setOpen] = useState(false);
  // Each opening is its own session: the popup's draft re-seeds from the board every time.
  const [session, setSession] = useState(0);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  if (!blank) return null;
  return (
    <>
      <CustomizeRockerButton
        ref={buttonRef}
        custom={!isNaturalSpec(blank.rocker)}
        onOpen={() => {
          setSession((n) => n + 1);
          setOpen(true);
        }}
      />
      <CustomizeRockerDialog open={open} onOpenChange={setOpen} session={session} buttonRef={buttonRef} />
    </>
  );
}
