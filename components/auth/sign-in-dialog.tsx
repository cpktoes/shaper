"use client";

/**
 * D-03's sign-up/sign-in surface: a dialog over the design screen, not a dedicated route.
 * Wraps Clerk's own `<SignIn>` in the app's shadcn `Dialog` rather than Clerk's
 * `mode="modal"` chrome — CONTEXT.md leaves dialog styling to our discretion, and the app
 * already has one dialog language (see replace-board-dialog.tsx).
 *
 * `routing="hash"` tells Clerk's component it is not mounted on a dedicated catch-all route
 * (e.g. `/sign-in/[[...sign-in]]`) — every sub-step (password reset, email verification)
 * renders in place inside this same popup via a URL hash fragment instead of pushing a real
 * path that doesn't exist.
 *
 * `withSignUp` makes this one component the whole account surface: its own footer link swaps
 * the card to sign-up IN PLACE. This replaced an earlier design that rendered separate
 * `<SignIn>`/`<SignUp>` components behind an app-owned toggle — that version left Clerk's
 * internal footer link pointing at the hosted Account Portal (`accounts.<domain>`), which can
 * never exist for a *.vercel.app domain (no DNS control), so on production the link died with
 * "site can't be reached" and the dialog carried two competing sign-up affordances. Do not
 * reintroduce a separate `<SignUp>` here without giving its footer somewhere real to go.
 *
 * `sm:max-w-md` is load-bearing, not styling taste: Clerk's card renders 400px wide, and
 * max-w-md (448px) is exactly that card plus this dialog's 24px padding per side. The app's
 * other dialogs use max-w-sm (384px), which was measured cropping Clerk's card by ~48px on
 * the right. max-h + overflow-y-auto lets the dialog scroll inside the overlay on short
 * viewports rather than clipping Clerk's stack (UI-SPEC sign-in-dialog/overflow).
 *
 * Clerk owns the form fields, their in-flight states, their inline errors, and the
 * sign-in/sign-up switching end to end — this file supplies only the surrounding chrome and
 * the fixed title from the UI-SPEC Copywriting Contract.
 *
 * Quick 261006-fom (D-04, P-3) adds the founder's consent line, "By creating an account you agree
 * to our Terms of Service and Privacy Policy.", directly under Clerk's card (`SignUpConsent`). It
 * is the app's own frame around the card, like the title above it, and never inside Clerk's form:
 * in the installed Clerk 7.8.2 the appearance options (`termsPageUrl` / `privacyPageUrl`, set in
 * `app/layout.tsx`) only put small "Terms" and "Privacy" links in the card's own footer, and the
 * one consent wording Clerk has (`signUp.legalConsent.checkbox.*`) labels a must-tick checkbox
 * that only appears when "require express consent" is switched on in the Clerk Dashboard — one
 * Dashboard switch away if the founder ever wants a recorded tick, and not built here. The line
 * shows on every step of the combined sign-in / sign-up card, because the sentence is conditional
 * ("By creating an account …") and reads true on a sign-in step too.
 */

import { SignIn, useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import { SignUpConsent } from "@/components/auth/sign-up-consent";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SignInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SignInDialog({ open, onOpenChange }: SignInDialogProps) {
  const { isSignedIn } = useUser();

  // Closes itself the moment Clerk reports a session — the shaper just watched the account get
  // created/authenticated inside this same popup, so there is nothing left for it to show.
  useEffect(() => {
    if (open && isSignedIn) onOpenChange(false);
  }, [open, isSignedIn, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100vh-4rem)] overflow-y-auto border-surf-line-faint bg-surf-panel text-surf-ink sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-surf-ink">Sign in to save your boards</DialogTitle>
        </DialogHeader>
        <SignIn routing="hash" withSignUp />
        <SignUpConsent />
      </DialogContent>
    </Dialog>
  );
}
