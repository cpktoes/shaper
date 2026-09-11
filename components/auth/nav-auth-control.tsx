"use client";

/**
 * D-02's nav-level sign-in nudge: a quiet "Sign in" text button, or, once signed in, Clerk's
 * own avatar — never a gate. Nothing in the design tool needs an account, so every state this
 * control can be in (loading, signed out, signed in, or Clerk failing to load at all) falls
 * back to something a shaper can ignore and keep shaping through.
 *
 * D-06 (Phase 10): the signed-out "Sign in" button is sized with "enlarge the row, not the
 * glyph" — the same idiom `components/setup/rack-card-menu.tsx`'s `ROW_CLASS` and
 * `components/design/phone-menu.tsx`'s fixed-square trigger already use for a hand-rolled
 * interactive control. The word keeps its 14px `text-sm` size; only the tappable row around it
 * grows to 44px under a touch pointer (`coarse:`), on both the phone menu's slot and the
 * desktop nav — the rule is pointer-gated, not route- or width-gated.
 */

import { useState } from "react";
import { UserButton, useUser } from "@clerk/nextjs";
import { SignInDialog } from "@/components/auth/sign-in-dialog";

export function NavAuthControl() {
  const { isLoaded, isSignedIn } = useUser();
  const [dialogOpen, setDialogOpen] = useState(false);

  // While Clerk resolves auth state (and, per UI-SPEC nav-auth-control/error, if it never
  // resolves at all — e.g. its script is blocked) this renders a fixed-size empty placeholder
  // matching the two settled states below, so a signed-in shaper never sees a "Sign in" flash.
  // `isLoaded` eventually settles false→true even when Clerk's network calls fail, landing on
  // the safe signed-out branch rather than hanging on this placeholder forever.
  //
  // D-06 (Phase 10): `coarse:size-11` sits beside the resting `size-7`, so this placeholder
  // claims the exact same footprint the "Sign in" row and Clerk's grown avatar claim under a
  // touch pointer — all three states of this control are 44px tall on touch, so nothing shifts
  // the instant Clerk settles.
  if (!isLoaded) {
    return <span aria-hidden className="block size-7 coarse:size-11" />;
  }

  if (isSignedIn) {
    // D-05 (Phase 10): Clerk's own `.cl-userButtonTrigger` measured 28x28 with zero padding in
    // the founder's signed-in session on 2026-09-10 — under 44px, so the hit area has to grow.
    // The lever is Clerk's `appearance.elements` prop, targeting the real button Clerk renders,
    // never a wrapping element around it (a wrapper only adds inert padding beside a still-28px
    // target — a box that looks 44px around a 28px button is a lie told to a finger). The
    // arithmetic: 28px trigger + 8px padding a side = 44px, applied only under a touch pointer.
    // Clerk injects its own stylesheet at runtime, so if a real signed-in measurement comes up
    // short the fallback is the same class with Tailwind's `!` important variant
    // (`coarse:p-2!`) — not a wrapper. Playwright cannot render this signed-in on this suite's
    // fake Clerk keys (see nav-auth-control.test.ts's own header), so the pixel proof is the
    // founder's own re-measurement, deferred to the end-of-phase sweep.
    return <UserButton appearance={{ elements: { userButtonTrigger: "coarse:p-2" } }} />;
  }

  return (
    <>
      {/* D-06 / "enlarge the row, not the glyph": the same idiom rack-card-menu.tsx's ROW_CLASS
          and phone-menu.tsx's fixed-square trigger already use for a hand-rolled interactive
          control. The word "Sign in" keeps its 14px text-sm size everywhere; only the tappable
          row around it grows to 44px, and only under a touch pointer. */}
      <button
        type="button"
        onClick={() => setDialogOpen(true)}
        className="text-sm text-surf-ink-muted transition-colors outline-none coarse:flex coarse:min-h-11 coarse:items-center hover:text-surf-ink focus-visible:text-surf-accent-ink"
      >
        Sign in
      </button>
      <SignInDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
