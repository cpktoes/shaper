"use client";

/**
 * D-03's sign-up/sign-in surface: a dialog over the design screen, not a dedicated route.
 * Wraps Clerk's own `<SignIn>` / `<SignUp>` in the app's shadcn `Dialog` rather than Clerk's
 * `mode="modal"` chrome — CONTEXT.md leaves dialog styling to our discretion, and the app
 * already has one dialog language (see replace-board-dialog.tsx).
 *
 * `routing="hash"` tells Clerk's component it is not mounted on a dedicated catch-all route
 * (e.g. `/sign-in/[[...sign-in]]`) — every sub-step (password reset, email verification)
 * renders in place inside this same popup via a URL hash fragment instead of pushing a real
 * path that doesn't exist. `"virtual"` looked like the fitting name from Clerk's general
 * `RoutingStrategy` type, but the installed `@clerk/nextjs` 7.8.2's own `SignInProps`/
 * `SignUpProps` types narrow the public prop to `'path' | 'hash'` only — `"virtual"` isn't
 * accepted here, confirmed against the SDK's own `.d.ts` rather than assumed from training
 * data (AGENTS.md: this Next/Clerk pairing has real breaking changes vs. what training data
 * expects). The other candidate, Clerk's `mode="modal"` on `<SignInButton>`, was deliberately
 * not used either: it brings its own overlay chrome, which would fight this dialog's.
 *
 * A shaper who opens this from "Sign in" but has never had an account still needs a way to
 * sign up without leaving the dialog (the phase objective's whole point). Hash routing has no
 * real page for Clerk's own "Don't have an account?" footer link to land on cleanly here, so
 * the toggle below is app-owned dialog chrome — not form copy, not a field, not an error
 * state, all of which stay entirely Clerk's.
 *
 * Clerk owns the form fields, their in-flight states and their inline errors end to end — this
 * file supplies only the surrounding chrome, the fixed titles from the UI-SPEC Copywriting
 * Contract, and the sign-in/sign-up toggle.
 */

import { SignIn, SignUp, useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type SignInDialogMode = "sign-in" | "sign-up";

const DIALOG_TITLE: Record<SignInDialogMode, string> = {
  "sign-in": "Sign in to save your boards",
  "sign-up": "Create your account",
};

interface SignInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: SignInDialogMode;
}

export function SignInDialog({ open, onOpenChange, mode }: SignInDialogProps) {
  const { isSignedIn } = useUser();
  const [currentMode, setCurrentMode] = useState<SignInDialogMode>(mode);
  // Tracks the `open` value this render is adjusting state for — React's documented pattern
  // for "reset state when a prop changes" (adjust during render, not in an effect), so
  // re-arming to the caller's requested mode on every fresh open doesn't cost an extra render.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setCurrentMode(mode);
  }

  // Closes itself the moment Clerk reports a session — the shaper just watched the account get
  // created/authenticated inside this same popup, so there is nothing left for it to show.
  useEffect(() => {
    if (open && isSignedIn) onOpenChange(false);
  }, [open, isSignedIn, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        // max-w-sm matches replace-board-dialog.tsx's sizing; max-h + overflow-y-auto lets the
        // dialog scroll inside the overlay on short viewports rather than clipping Clerk's
        // stack (UI-SPEC sign-in-dialog/overflow).
        className="max-h-[calc(100vh-4rem)] overflow-y-auto border-surf-line-faint bg-surf-panel text-surf-ink sm:max-w-sm"
      >
        <DialogHeader>
          <DialogTitle className="text-surf-ink">{DIALOG_TITLE[currentMode]}</DialogTitle>
        </DialogHeader>
        {currentMode === "sign-in" ? (
          <SignIn routing="hash" />
        ) : (
          <SignUp routing="hash" />
        )}
        <button
          type="button"
          onClick={() => setCurrentMode(currentMode === "sign-in" ? "sign-up" : "sign-in")}
          className="text-center text-sm text-surf-ink-muted underline-offset-4 hover:text-surf-ink hover:underline"
        >
          {currentMode === "sign-in"
            ? "Don't have an account? Sign up"
            : "Already have an account? Sign in"}
        </button>
      </DialogContent>
    </Dialog>
  );
}
