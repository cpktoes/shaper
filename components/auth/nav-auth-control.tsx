"use client";

/**
 * D-02's nav-level sign-in nudge: a quiet "Sign in" text button, or, once signed in, Clerk's
 * own avatar — never a gate. Nothing in the design tool needs an account, so every state this
 * control can be in (loading, signed out, signed in, or Clerk failing to load at all) falls
 * back to something a shaper can ignore and keep shaping through.
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
  if (!isLoaded) {
    return <span aria-hidden className="block size-7" />;
  }

  if (isSignedIn) {
    return <UserButton />;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setDialogOpen(true)}
        className="text-sm text-surf-ink-muted transition-colors outline-none hover:text-surf-ink focus-visible:text-surf-accent-ink"
      >
        Sign in
      </button>
      <SignInDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
