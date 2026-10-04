import { SignInBanner } from "@/components/auth/sign-in-banner";
import { PhoneUndoBar } from "@/components/design/phone-undo-bar";
import { ToolbarTip } from "@/components/design/toolbar-tip";
import { RailLegendProvider } from "@/components/rails/rail-legend-provider";

/**
 * Nested layout for every /design/* screen. Shared chrome now lives one level up, in the root
 * layout, so this file's jobs are the height-passthrough wrapper div below — it carries the
 * full-height flex sizing set up by the root layout's body down to the outline/rails/fins/volume
 * editors' own flex-1 panels; dropping this div collapses those panels to content height —
 * mounting `SignInBanner` (D-02) above `props.children` so the one-time sign-in offer appears on
 * every design screen and nowhere else, mounting `ToolbarTip` immediately below it for the same
 * reason — once, so it appears on every design screen and nowhere else — sitting BELOW the
 * sign-in banner so the standing strip the app already ships keeps the position it has held for
 * two phases while the newer, one-time, device-specific note sits closest to the drawing it is
 * about to make room for (the two are deliberately independent: suppressing the tip while the
 * sign-in offer is up would mean a shaper who never dismisses that offer never sees the tip at
 * all), mounting `PhoneUndoBar` (quick task 260913-k5k; since quick 260930-lo8 it paints at every
 * width once there is something to undo, not only below the phone breakpoint) as the last child —
 * it is fixed-positioned and therefore sits OUTSIDE the flex sizing chain the rest of this comment
 * is about, so its place in this JSX tree is about mount-once-per-route bookkeeping, not layout
 * order (the old bottom tab bar that used to follow it was removed in quick 261003-q2f) — and wrapping everything in
 * `RailLegendProvider` (quick task 260910-0b1, D-01/D-02) so the RAILS tab's nine legend ticks and
 * the Summary's own mirrored ticks read and write one shared, session-only set — this is the
 * narrowest mount that covers both screens, and it is what lets that shared set survive a
 * client-side walk from RAILS to SUMMARY. The provider paints no DOM of its own — it renders only
 * its context element — so it cannot disturb the flex sizing chain the rest of this comment is
 * about. The banner and the tip are both `flex-none`; each editor already declares
 * `flex-1`/`min-h-0` on its own root, so adding any bar here does not disturb that sizing chain —
 * and `PhoneUndoBar` is fixed to the window at every width, so it never changes the layout.
 */
export default function DesignLayout(props: LayoutProps<"/design">) {
  return (
    <RailLegendProvider>
      <div className="flex min-h-0 flex-1 flex-col">
        <SignInBanner />
        <ToolbarTip />
        {props.children}
        <PhoneUndoBar />
      </div>
    </RailLegendProvider>
  );
}
