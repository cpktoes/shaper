import { SignInBanner } from "@/components/auth/sign-in-banner";
import { PhoneTabBar } from "@/components/design/phone-tab-bar";

/**
 * Nested layout for every /design/* screen. Shared chrome now lives one level up, in the root
 * layout, so this file's three jobs are the height-passthrough wrapper div below — it carries the
 * full-height flex sizing set up by the root layout's body down to the outline/rails/fins/volume
 * editors' own flex-1 panels; dropping this div collapses those panels to content height —
 * mounting `SignInBanner` (D-02) above `props.children` so the one-time sign-in offer appears on
 * every design screen and nowhere else, and mounting `PhoneTabBar` (D-06/D-07) as the LAST child,
 * below `props.children`, so it appears on the same six design routes and nowhere else. The
 * banner is `flex-none`; each editor already declares `flex-1`/`min-h-0` on its own root, so
 * adding either bar here does not disturb that sizing chain — `PhoneTabBar` paints or not purely
 * from its own `max-shell:` CSS variant, with no layout impact on a desktop width.
 */
export default function DesignLayout(props: LayoutProps<"/design">) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <SignInBanner />
      {props.children}
      <PhoneTabBar />
    </div>
  );
}
