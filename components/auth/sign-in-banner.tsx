"use client";

/**
 * D-02's design-screen sign-in nudge: a quiet one-time banner offering the actual payoff —
 * "Sign in and your boards are saved." — rather than an account for its own sake. Mounted once
 * in `app/design/layout.tsx` so it appears on every design screen and nowhere else; the home
 * screen already makes the same offer through the nav's "Sign in" button and the board rack.
 *
 * Visibility is decided entirely by the pure, tested `shouldShowSignInBanner`
 * (lib/models/banner-dismissal.ts): hidden once signed in, hidden for the rest of the visit
 * once dismissed. The storage key itself lives in that module's exported `BANNER_DISMISSAL_KEY`
 * — nothing here retypes it.
 *
 * Dismissal is read via `useSyncExternalStore`, the same route `components/theme-provider.tsx`
 * takes for its own stored preference, rather than an effect that calls `setState` on mount
 * (React's `set-state-in-effect` lint rule flags that pattern as a cascading-render risk, and
 * `sign-in-dialog.tsx`'s render-phase state adjustment doesn't fit here — there is no prop to
 * compare against, only a browser value to read once). `getServerSnapshot` returns `false`
 * ("not dismissed") to match what the server rendered, React hydrates against that, then
 * re-renders with the real client value — no hydration-mismatch warning, and no extra frame of
 * a wrongly-shown-or-hidden banner. That re-render is also gated behind Clerk's own `isLoaded`
 * below, so nothing paints at all until both the sign-in state and the dismissal are known,
 * which is what actually prevents the banner from flashing in and back out on a navigation.
 *
 * Always in document flow, never an overlay: this sits above the design screen's own content
 * inside `app/design/layout.tsx`'s existing flex column, and dismissing it is always one click
 * away. A nudge a shaper cannot get past would be a gate (D-01) — this is not that.
 */

import { useState, useSyncExternalStore } from "react";
import { useUser } from "@clerk/nextjs";
import { XIcon } from "lucide-react";
import { SignInDialog } from "@/components/auth/sign-in-dialog";
import { readBannerDismissal, shouldShowSignInBanner, writeBannerDismissal } from "@/lib/models/banner-dismissal";

/** Subscribers for same-tab dismissal, mirroring theme-provider.tsx's storeListeners set — the
 * `storage` event only fires in *other* tabs, and this banner only ever changes from a click in
 * this one. */
const dismissalListeners = new Set<() => void>();

function emitDismissalChange() {
  for (const listener of dismissalListeners) listener();
}

function subscribeToDismissal(onStoreChange: () => void) {
  dismissalListeners.add(onStoreChange);
  return () => dismissalListeners.delete(onStoreChange);
}

/** Must match what the server rendered — the server cannot see sessionStorage, so: not dismissed. */
function getServerDismissed(): boolean {
  return false;
}

export function SignInBanner() {
  const { isLoaded, isSignedIn } = useUser();
  const dismissed = useSyncExternalStore(subscribeToDismissal, readBannerDismissal, getServerDismissed);
  const [dialogOpen, setDialogOpen] = useState(false);

  if (!isLoaded) return null;
  if (!shouldShowSignInBanner({ signedIn: isSignedIn === true, dismissed })) return null;

  const handleDismiss = () => {
    writeBannerDismissal();
    emitDismissalChange();
  };

  return (
    <>
      <div className="flex flex-none items-center justify-center gap-4 bg-surf-canvas px-6 py-2 text-center">
        <p className="text-balance text-sm text-surf-ink">
          Sign in and your boards are saved.{" "}
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="font-bold text-surf-accent-ink underline-offset-4 outline-none hover:underline focus-visible:underline"
          >
            Sign In
          </button>
        </p>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={handleDismiss}
          className="shrink-0 text-surf-ink-muted transition-colors outline-none hover:text-surf-ink focus-visible:text-surf-ink"
        >
          <XIcon className="size-4" />
        </button>
      </div>
      <SignInDialog open={dialogOpen} onOpenChange={setDialogOpen} mode="sign-in" />
    </>
  );
}
