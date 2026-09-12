"use client";

/**
 * The founder's own fallback for a request the web has no API for: "Can we 'hide toolbar' in the
 * phone browser by default. It really needs to be hidden to take advantage of the screens real
 * estate effectively. Maybe a popup reminder on first entry if we can't force a hide from our
 * side." There is no way for a website to hide Safari's or Chrome's own toolbar, and the one
 * trick that would (a web app manifest with `display: standalone`, opening the site as a
 * Home-Screen app) silently breaks `window.print()` on iOS — the confirmed diagnosis of the
 * founder's own "print buttons dont do anything" report
 * (.planning/debug/phone-print-button-does-nothing.md). No manifest is added here, ever. So this
 * component tells a shaper, once, quietly, how to do it themselves.
 *
 * Mounted once in `app/design/layout.tsx`, immediately after `<SignInBanner />` and before
 * `props.children`, so it appears on every design screen and nowhere else.
 *
 * Three gates, and which technology owns each:
 * - A touch pointer (not the phone LAYOUT) — CSS, `hidden coarse:…:flex`. Whether a browser has a
 *   toolbar worth hiding is a question about the device in your hand, not about which layout the
 *   screen selected — and mis-filing it on the layout axis is exactly why this tip went dark at
 *   the moment a shaper most wanted it, twice, for two different reasons: before 10-05 a sideways
 *   iPhone was over the phone/desktop width switch, so the tip was hidden; 10-05 moved the switch
 *   to reach it (a real iPhone held sideways is about 844 dots wide, over the old 820px cutoff),
 *   and the shaper still reported not seeing it; and D-10 (10-SWEEP-2.md, 2026-09-11) has now put
 *   that switch back to width alone, so the only way this tip is reliably reachable is to stop it
 *   depending on the switch at all. The consequence is intended: on a touch device in the desktop
 *   layout — a phone held sideways, or a tablet — the tip now appears, and that is when the extra
 *   height is most wanted.
 * - iOS/iPadOS only — CSS, `supports-[-webkit-touch-callout:none]:`, the same iOS-only
 *   feature-detection guard `components/rails/view-full-sized-dialog.tsx` already ships, kept in
 *   the same variant order (coarse: first, then supports-[...]:) already proven to compile in
 *   this Tailwind v4 setup.
 * - Not yet dismissed — React, `useSyncExternalStore` over `lib/models/toolbar-tip.ts`'s
 *   permanent localStorage key.
 *
 * Width and platform are deliberately CSS, not a JavaScript check, so this element is always in
 * the server-rendered tree — no width/platform check in JS, no flash between layouts, and
 * something left in the DOM for a browser test to assert on, even though Playwright's WebKit
 * cannot itself prove the iOS gate (see e2e/phone-toolbar-tip.spec.ts's header comment for why).
 * Only dismissal is a React decision, exactly as with `SignInBanner`.
 *
 * Dismissal plumbing is copied structurally from `components/auth/sign-in-banner.tsx`: a
 * module-level listener set (the `storage` event fires only in OTHER tabs; this tip only ever
 * changes from a tap in THIS one), a `getServerDismissed` returning `false` because the server
 * cannot see localStorage — React hydrates against "not dismissed" and re-renders with the real
 * value, so there is no hydration warning and no extra frame of a wrongly-shown tip. There is no
 * Clerk `isLoaded` gate here; this tip has nothing to do with being signed in.
 *
 * The two banners — this one and `SignInBanner` — are deliberately INDEPENDENT. Coupling them
 * (suppressing this tip while the sign-in offer is up) is tempting on a small phone screen, but a
 * shaper who never dismisses the standing sign-in offer would then never see this tip at all,
 * which is the founder's actual feature silently never shipping.
 */

import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { readToolbarTipDismissal, shouldShowToolbarTip, writeToolbarTipDismissal } from "@/lib/models/toolbar-tip";

/** Subscribers for same-tab dismissal, mirroring sign-in-banner.tsx's own dismissalListeners set. */
const dismissalListeners = new Set<() => void>();

function emitDismissalChange() {
  for (const listener of dismissalListeners) listener();
}

function subscribeToDismissal(onStoreChange: () => void) {
  dismissalListeners.add(onStoreChange);
  return () => dismissalListeners.delete(onStoreChange);
}

/** Must match what the server rendered — the server cannot see localStorage, so: not dismissed. */
function getServerDismissed(): boolean {
  return false;
}

export function ToolbarTip() {
  const dismissed = useSyncExternalStore(subscribeToDismissal, readToolbarTipDismissal, getServerDismissed);

  if (!shouldShowToolbarTip({ dismissed })) return null;

  const handleDismiss = () => {
    writeToolbarTipDismissal();
    emitDismissalChange();
  };

  return (
    <div
      data-print-hide
      data-toolbar-tip
      className="hidden coarse:supports-[-webkit-touch-callout:none]:flex flex-none items-center gap-2 bg-surf-canvas px-4 py-2 text-surf-ink"
    >
      <p className="text-balance text-sm text-surf-ink">
        {/* Never name the page-menu button's own glyph: it is labelled "aA" on iOS 17-25 and "…"
            on iOS 26, and naming either makes this sentence wrong for half the shapers reading
            it. "Hide Toolbar" is Safari's own menu wording, capitals included, because a shaper
            is going to scan a menu for those exact two words. */}
        {"For more drawing room, tap the page menu in Safari's address bar and choose Hide Toolbar."}
      </p>
      {/* Deliberately does not mention adding the site to the Home Screen — that would remove the
          toolbar but silently break every Print button on iOS
          (.planning/debug/phone-print-button-does-nothing.md). */}
      <Button
        type="button"
        variant="outline"
        // Default size inherits coarse:h-11 — the 44px touch height — from the shared Button,
        // rather than a height hand-typed here.
        onClick={handleDismiss}
        className="shrink-0"
      >
        Got it
      </Button>
    </div>
  );
}
