import { SignInBanner } from "@/components/auth/sign-in-banner";
import { PhoneTabBar } from "@/components/design/phone-tab-bar";
import { ToolbarTip } from "@/components/design/toolbar-tip";
import { RailLegendProvider } from "@/components/rails/rail-legend-provider";

/**
 * Nested layout for every /design/* screen. Shared chrome now lives one level up, in the root
 * layout, so this file's five jobs are the height-passthrough wrapper div below — it carries the
 * full-height flex sizing set up by the root layout's body down to the outline/rails/fins/volume
 * editors' own flex-1 panels; dropping this div collapses those panels to content height —
 * mounting `SignInBanner` (D-02) above `props.children` so the one-time sign-in offer appears on
 * every design screen and nowhere else, mounting `ToolbarTip` immediately below it for the same
 * reason — once, so it appears on every design screen and nowhere else — sitting BELOW the
 * sign-in banner so the standing strip the app already ships keeps the position it has held for
 * two phases while the newer, one-time, device-specific note sits closest to the drawing it is
 * about to make room for (the two are deliberately independent: suppressing the tip while the
 * sign-in offer is up would mean a shaper who never dismisses that offer never sees the tip at
 * all), mounting `PhoneTabBar` (D-06/D-07) as the LAST child, below `props.children`, so it
 * appears on the same six design routes and nowhere else, and wrapping everything in
 * `RailLegendProvider` (quick task 260910-0b1, D-01/D-02) so the RAILS tab's nine legend ticks and
 * the Summary's own mirrored ticks read and write one shared, session-only set — this is the
 * narrowest mount that covers both screens, and it is what lets that shared set survive a
 * client-side walk from RAILS to SUMMARY. The provider paints no DOM of its own — it renders only
 * its context element — so it cannot disturb the flex sizing chain the rest of this comment is
 * about. The banner and the tip are both `flex-none`; each editor already declares
 * `flex-1`/`min-h-0` on its own root, so adding any bar here does not disturb that sizing chain —
 * `PhoneTabBar` paints or not purely from its own `max-shell:` CSS variant, with no layout impact
 * on a desktop width.
 */
export default function DesignLayout(props: LayoutProps<"/design">) {
  return (
    <RailLegendProvider>
      <div className="flex min-h-0 flex-1 flex-col">
        <SignInBanner />
        <ToolbarTip />
        {props.children}
        <PhoneTabBar />
      </div>
    </RailLegendProvider>
  );
}
